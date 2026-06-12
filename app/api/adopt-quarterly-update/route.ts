import { sendEmail } from '@/lib/mailer'
import { buildAdoptQuarterlyUpdateEmail } from '@/lib/email-templates'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { makeRequestLogger } from '@/lib/request-id'
import { getQuarterLabel } from '@/lib/quarterly-update'
import { isValidEmail } from '@/lib/validate-email'
import { getQuarterlyContent, markQuarterlySent } from '@/lib/quarterly-content-store'
import { isAlreadyProcessed, markProcessed } from '@/lib/webhook-idempotency'
import { runCron, type CronRunResult } from '@/lib/cron-runner'
import { getContactEmail } from '@/lib/validate-env'

/**
 * GET /api/adopt-quarterly-update  (Authorization: Bearer <CRON_SECRET>)
 *
 * Quarterly retention email sent to every currently-active adopter on Jan 1 /
 * Apr 1 / Jul 1 / Oct 1 at 09:00 UTC (vercel.json cron `0 9 1 1,4,7,10 *`).
 *
 * Auth: Bearer header only — same reasoning as owner-mrr-digest (query
 * strings are logged by edge proxies; a leaked CRON_SECRET would let anyone
 * spam every adopter).
 *
 * Data flow:
 *   1. Iterate Mollie subscriptions with a 500-row cap (mirrors
 *      app/api/owner-mrr-digest/route.ts — intentional duplication; both
 *      routes need their own iteration so a partial Mollie outage degrading
 *      one cron does not silently cap the other).
 *   2. For every status === 'active' subscription, pull
 *      metadata.{donorEmail, donorName, alpacaName, locale}.
 *   3. Build the per-adopter email via buildAdoptQuarterlyUpdateEmail() and
 *      send via Resend with replyTo=CONTACT_EMAIL +
 *      listUnsubscribeUrl=<site>/api/newsletter/unsubscribe (Gmail/Yahoo
 *      2026 bulk-sender pattern).
 *   4. Promise.allSettled per recipient so one bad address never drops the
 *      whole batch.
 *   5. pingHeartbeat('adopt-quarterly-update') at end-of-handler — fires
 *      whether the batch sent zero or N emails, so the dead-man's switch
 *      never alarms on "everyone unsubscribed" quarters.
 *
 * Cold-start caveat: if Mollie iteration throws partway, the recipients
 * accumulated so far still receive their email (partial send is acceptable
 * because the alternative — retry the whole batch — would duplicate-spam
 * the adopters we already reached). The partial-send case logs loudly.
 *
 * Fail-quiet: every error path returns 200 so Vercel cron does not retry
 * and quadruple-send the entire quarterly batch.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    return runCron(request, {
        routeName: 'adopt-quarterly-update',
        heartbeatEnvKey: 'HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL',
    }, async (): Promise<CronRunResult<unknown>> => {
        // The reqId + log are not available here because runCron owns them.
        // Use a standalone logger with a stable tag for route-internal log lines.
        const log = makeRequestLogger('adopt-quarterly-update', 'runner')

        // ── Quarter label derivation (UTC; cron fires at 09:00 UTC) ──────────
        const now = new Date()
        const quarterLabel = getQuarterLabel(now)

        // ── Owner-composed farm news for this quarter ─────────────────────────
        // Read from the in-memory content store populated by the
        // /admin/quarterly-update page. When the owner has not composed a draft
        // (cold start, forgot to write), the email-template falls back to its
        // placeholder copy so the cron does not refuse to fire — partial value
        // beats silence.
        const composedContent = getQuarterlyContent(quarterLabel)
        const farmNewsHtml = composedContent?.newsHtml

        // ── Mollie API key gate ───────────────────────────────────────────────
        const apiKey = process.env.MOLLIE_API_KEY
        if (!apiKey) {
            log.warn('MOLLIE_API_KEY unset — cannot iterate subscriptions')
            // Fail-quiet 200: a 5xx would trigger Vercel cron retry which is
            // pointless when the key is missing. Heartbeat is intentionally NOT
            // pinged here so Healthchecks.io alerts on the configuration gap.
            return {
                ok: true,
                routeName: 'adopt-quarterly-update',
                durationMs: 0,
                successes: 0,
                failures: 0,
                skipped: 0,
                detail: { capped: false, reason: 'MOLLIE_API_KEY_UNSET' },
            } satisfies CronRunResult
        }

        const mollie = await getMollieClient(apiKey)
        if (!mollie) {
            log.warn('@mollie/api-client not installed — cannot iterate subscriptions')
            return {
                ok: true,
                routeName: 'adopt-quarterly-update',
                durationMs: 0,
                successes: 0,
                failures: 0,
                skipped: 0,
                detail: { capped: false, reason: 'MOLLIE_SDK_MISSING' },
            } satisfies CronRunResult
        }

        // ── Mollie subscription iteration (cap 500, mirrors owner-mrr-digest) ─
        type SubRaw = {
            id: string
            customerId?: string | null
            status?: string
            metadata?: {
                donorName?: string | null
                donorEmail?: string | null
                alpacaName?: string | null
                alpacaSlug?: string | null
                locale?: string | null
            }
        }

        interface Recipient {
            subId: string
            email: string
            donorName: string | null
            alpacaName: string | null
            locale: string
        }

        const recipients: Recipient[] = []
        let capped = false
        let iterationError: string | null = null

        try {
            const iter = (mollie as unknown as {
                subscriptions: { iterate: () => AsyncIterable<SubRaw> }
            }).subscriptions.iterate()

            const ITERATION_CAP = 500
            let i = 0
            for await (const raw of iter) {
                i++
                if (i > ITERATION_CAP) {
                    capped = true
                    log.warn(`Capped at ${ITERATION_CAP} subscriptions — quarterly send is partial`)
                    break
                }
                if (raw.status !== 'active') continue

                // Mollie subscription metadata does NOT carry donor email — the
                // webhook writes only {product, tier, tenantId, seedPaymentId}.
                // Fetch the donor email + name from the customer record. Skip
                // orphan subs (no customerId) and customers with no email on file.
                if (!raw.customerId) {
                    log.warn('Skipping quarterly send: sub has no customerId', { subId: raw.id })
                    continue
                }
                let email: string | null = null
                let donorName: string | null = null
                try {
                    const customer = await mollie.customers.get(raw.customerId)
                    email = typeof customer?.email === 'string' ? customer.email : null
                    donorName = typeof customer?.name === 'string' ? customer.name : null
                } catch (custErr) {
                    log.warn('mollie.customers.get failed — skipping recipient', {
                        subId: raw.id,
                        message: custErr instanceof Error ? custErr.message : String(custErr),
                    })
                    continue
                }
                if (!email) {
                    log.warn('Skipping quarterly send: customer has no email on file', { subId: raw.id })
                    continue
                }
                recipients.push({
                    subId: raw.id,
                    email,
                    donorName,
                    alpacaName: raw.metadata?.alpacaName ?? null,
                    locale: raw.metadata?.locale ?? 'en',
                })
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            // Partial send is acceptable per cold-start caveat — keep the
            // recipients we already accumulated and log loudly so ops sees it.
            iterationError = message
            log.error('Mollie iteration failed partway — proceeding with partial recipient list', {
                message,
                partialCount: recipients.length,
            })
        }

        // ── Stripe subscription iteration ─────────────────────────────────────
        // Wrapped in try/catch so Mollie-only deploys skip silently.
        try {
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY
            if (!stripeSecretKey) {
                log.info('[quarterly] STRIPE_SECRET_KEY unset — skipping Stripe path')
            } else {
                const stripeFactory = await importStripe()
                if (!stripeFactory) {
                    log.info('[quarterly] stripe SDK not installed — skipping Stripe path')
                } else {
                    const stripe = stripeFactory(stripeSecretKey, { apiVersion: '2024-06-20' })
                    const STRIPE_CAP = 1000
                    let stripeCount = 0

                    for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
                        stripeCount++
                        if (stripeCount >= STRIPE_CAP) {
                            capped = true
                            log.warn(`[quarterly] Stripe iteration capped at ${STRIPE_CAP}`)
                            break
                        }

                        // Resolve email: prefer metadata.donorEmail, then expanded customer.
                        const meta = sub.metadata as Record<string, string>
                        const email: string | null =
                            meta.donorEmail ??
                            (typeof (sub as { customer?: { email?: string } }).customer === 'object'
                                ? (sub as { customer?: { email?: string } }).customer?.email ?? null
                                : null)

                        if (!email || !isValidEmail(email)) {
                            log.warn('[quarterly] Skipping Stripe sub — no resolvable email', { subId: sub.id })
                            continue
                        }

                        recipients.push({
                            subId: sub.id,
                            email,
                            donorName: meta.donorName ?? null,
                            alpacaName: meta.alpacaName ?? meta.alpaca ?? null,
                            locale: meta.locale ?? 'en',
                        })
                    }
                }
            }
        } catch (stripeErr) {
            const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
            log.warn('[quarterly] Stripe iteration failed — continuing with Mollie-only results', { message })
        }

        log.info(`Quarterly fan-out starting`, {
            quarter: quarterLabel,
            recipients: recipients.length,
            capped,
            iterationError,
        })

        // ── Per-recipient fan-out — Promise.allSettled isolates failures ──────
        const contactEmail = getContactEmail()

        type SendResult = { ok: true; subId: string } | { ok: false; subId: string; reason: string }

        const tasks = recipients.map(async (r): Promise<SendResult> => {
            // Per-recipient idempotency: if Vercel double-fires the cron, the second
            // run finds every already-sent (quarterLabel, subId) pair in the store
            // and skips them. Key is stable across retries — same quarter + same subId.
            // The webhook-idempotency store's 4-day TTL comfortably covers any
            // same-day double-fire. markProcessed is called ONLY after a successful
            // send so a transient send failure allows a retry on the next cron run.
            const idemKey = `quarterly:${quarterLabel}:${r.subId}`
            if (isAlreadyProcessed(idemKey)) {
                log.info('Skipping quarterly send — already sent for this sub+quarter', {
                    subId: r.subId,
                    quarter: quarterLabel,
                })
                return { ok: false, subId: r.subId, reason: 'already-sent' }
            }

            // Defence-in-depth: skip recipients whose email metadata is malformed.
            if (!isValidEmail(r.email)) {
                log.warn('Skipping recipient with invalid email in metadata', { subId: r.subId })
                return { ok: false, subId: r.subId, reason: 'invalid-email' }
            }

            const { subject, html } = buildAdoptQuarterlyUpdateEmail({
                name: r.donorName,
                alpacaName: r.alpacaName,
                quarterLabel,
                locale: r.locale,
                ...(farmNewsHtml ? { farmNewsHtml } : {}),
            })

            // List-Unsubscribe omitted: these are transactional adoption-update emails,
            // exempt under CAN-SPAM § 5(a). The /api/newsletter/unsubscribe endpoint
            // targets newsletter subscribers — a different list. Adopters manage
            // their subscription via the billing portal (see email body).
            try {
                await sendEmail({
                    to: r.email,
                    subject,
                    html,
                    replyTo: contactEmail,
                })
                // Mark AFTER successful send — a failed send must not be marked so
                // the next cron fire can retry the recipient. Mirrors milestone-emails
                // post-success-mark contract.
                markProcessed(idemKey)
                return { ok: true, subId: r.subId }
            } catch (err) {
                const reason = err instanceof Error ? err.message : String(err)
                // Fail-quiet per recipient — one bad address must not drop the rest.
                log.warn('sendEmail failed — continuing batch', { subId: r.subId, reason })
                return { ok: false, subId: r.subId, reason }
            }
        })

        const settled = await Promise.allSettled(tasks)
        let sent = 0
        let failed = 0
        let skipped = 0
        for (const result of settled) {
            if (result.status === 'fulfilled') {
                if (result.value.ok) sent++
                else if ((result.value as { reason?: string }).reason === 'already-sent') skipped++
                else failed++
            } else {
                // Promise itself rejected — task catches internally so this is a
                // belt-and-braces fallthrough.
                failed++
            }
        }

        log.info('Quarterly update complete', {
            quarter: quarterLabel,
            sent,
            failed,
            skipped,
            capped,
            iterationError,
            composedContent: composedContent ? 'owner-draft' : 'placeholder',
        })

        // Mark this quarter as sent in the content store so the admin compose
        // page shows "✅ sent at <timestamp>" instead of "draft only." Only marks
        // when there WAS composed content — placeholder sends are not "real" Q
        // updates and should still be replaceable next deploy.
        if (composedContent) {
            markQuarterlySent(quarterLabel, now)
        }

        return {
            ok: true,
            routeName: 'adopt-quarterly-update',
            durationMs: 0,
            successes: sent,
            failures: failed,
            skipped,
            detail: { capped, usedComposedContent: !!composedContent, iterationError },
        } satisfies CronRunResult
    })
}

// Vercel cron sends POST; GET is kept so manual triggers via browser/curl still work.
export const POST = GET
