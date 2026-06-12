import { sendEmail } from '@/lib/mailer'
import { buildAlpacaBirthdayEmail } from '@/lib/email-templates-retention'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { makeRequestLogger } from '@/lib/request-id'
import { ALPACAS } from '@/lib/data/alpacas'
import { isValidEmail } from '@/lib/validate-email'
import { SITE_BASE_URL } from '@/lib/config'
import { signMollieStatusToken } from '@/lib/mollie-manage-token'
import { runCron, type CronRunResult } from '@/lib/cron-runner'
import { getContactEmail } from '@/lib/validate-env'

/**
 * POST /api/alpaca-birthday-cards  (Vercel cron sends POST)
 * GET  /api/alpaca-birthday-cards  (manual admin trigger)
 *
 * Daily cron (09:00 UTC via vercel.json). On each run:
 *   1. Compute today's MM-DD.
 *   2. Filter ALPACAS whose birthDate matches today.
 *   3. For each matching alpaca, iterate active Stripe + Mollie subscriptions
 *      whose metadata.alpaca === alpaca.id (slug).
 *   4. Send buildAlpacaBirthdayEmail() per donor via Resend.
 *   5. Stamp metadata.last_bday_email_year on the subscription to prevent
 *      double-sending if the cron cold-starts and fires twice in one day.
 *
 * Auth: Bearer <CRON_SECRET> (same as all other cron routes).
 * Fail-quiet per recipient: Promise.allSettled isolates individual failures.
 * Returns 200 on all paths so Vercel cron does not retry and duplicate-send.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    return runCron(request, {
        routeName: 'alpaca-birthday-cards',
    }, async () => {
        const log = makeRequestLogger('alpaca-birthday-cards', 'runner')

        // ── Today's MM-DD ─────────────────────────────────────────────────────
        const now = new Date()
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(now.getUTCDate()).padStart(2, '0')
        const todayMmDd = `${mm}-${dd}`
        const todayYear = now.getUTCFullYear()

        // ── Filter alpacas with a birthday today ──────────────────────────────
        const birthdayAlpacas = ALPACAS.filter((a) => {
            if (!a.birthDate) return false
            // birthDate is YYYY-MM-DD; extract MM-DD suffix
            const mmdd = a.birthDate.slice(5) // "2019-08-10" → "08-10"
            return mmdd === todayMmDd
        })

        log.info('Birthday scan', {
            todayMmDd,
            scanned: ALPACAS.length,
            birthdayCount: birthdayAlpacas.length,
        })

        if (birthdayAlpacas.length === 0) {
            return {
                ok: true,
                routeName: 'alpaca-birthday-cards',
                durationMs: 0,
                successes: 0,
                failures: 0,
                skipped: 0,
                detail: { scanned: ALPACAS.length, alpacasWithBirthdays: 0 },
            } satisfies CronRunResult
        }

        // ── Subscription iteration helpers ────────────────────────────────────

        interface BirthdayRecipient {
            email: string
            donorName: string | null
            alpacaName: string
            alpacaBirthYear: number | null
            locale: string
            /** Used to stamp idempotency metadata after sending. */
            vendor: 'stripe' | 'mollie'
            subId: string
            stripeClient?: import('stripe').default
            mollieClient?: Awaited<ReturnType<typeof getMollieClient>>
            mollieCustomerId?: string
            /** Mollie subscription ID — used to build a short-lived status token for the birthday portal link. */
            mollieSubscriptionId?: string
        }

        const recipients: BirthdayRecipient[] = []

        // ── Mollie path ───────────────────────────────────────────────────────
        const mollieApiKey = process.env.MOLLIE_API_KEY
        let mollie: Awaited<ReturnType<typeof getMollieClient>> = null
        if (mollieApiKey) {
            mollie = await getMollieClient(mollieApiKey)
            if (!mollie) {
                log.warn('MOLLIE_API_KEY set but @mollie/api-client not installed — skipping Mollie path')
            }
        } else {
            log.info('MOLLIE_API_KEY unset — skipping Mollie subscription path')
        }

        if (mollie) {
            type SubRaw = {
                id: string
                customerId?: string | null
                status?: string
                metadata?: {
                    alpaca?: string | null
                    alpacaSlug?: string | null
                    locale?: string | null
                    donorName?: string | null
                    last_bday_email_year?: string | null
                }
            }

            try {
                const iter = (mollie as unknown as {
                    subscriptions: { iterate: () => AsyncIterable<SubRaw> }
                }).subscriptions.iterate()

                const MOLLIE_CAP = 500
                let i = 0
                for await (const raw of iter) {
                    i++
                    if (i > MOLLIE_CAP) {
                        log.warn(`Mollie iteration capped at ${MOLLIE_CAP}`)
                        break
                    }
                    if (raw.status !== 'active') continue

                    const alpacaSlug = raw.metadata?.alpaca ?? raw.metadata?.alpacaSlug ?? null
                    if (!alpacaSlug) continue

                    const matchingAlpaca = birthdayAlpacas.find((a) => a.id === alpacaSlug)
                    if (!matchingAlpaca) continue

                    // Idempotency: skip if already sent for this year.
                    const lastYear = raw.metadata?.last_bday_email_year
                    if (lastYear && String(lastYear) === String(todayYear)) {
                        log.info('Birthday email already sent this year for Mollie sub — skipping', { subId: raw.id })
                        continue
                    }

                    if (!raw.customerId) continue
                    let email: string | null = null
                    let donorName: string | null = raw.metadata?.donorName ?? null
                    try {
                        const customer = await mollie.customers.get(raw.customerId)
                        email = typeof customer?.email === 'string' ? customer.email : null
                        if (!donorName) {
                            donorName = typeof customer?.name === 'string' ? customer.name : null
                        }
                    } catch (custErr) {
                        log.warn('mollie.customers.get failed — skipping recipient', {
                            subId: raw.id,
                            message: custErr instanceof Error ? custErr.message : String(custErr),
                        })
                        continue
                    }
                    if (!email || !isValidEmail(email)) continue

                    const birthYear = matchingAlpaca.birthDate
                        ? parseInt(matchingAlpaca.birthDate.slice(0, 4), 10)
                        : null

                    recipients.push({
                        email,
                        donorName,
                        alpacaName: matchingAlpaca.name,
                        alpacaBirthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
                        locale: raw.metadata?.locale ?? 'en',
                        vendor: 'mollie',
                        subId: raw.id,
                        mollieClient: mollie,
                        mollieCustomerId: raw.customerId,
                        mollieSubscriptionId: raw.id,
                    })
                }
            } catch (err) {
                log.warn('Mollie subscription iteration failed', {
                    message: err instanceof Error ? err.message : String(err),
                })
            }
        }

        // ── Stripe path ───────────────────────────────────────────────────────
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY
        if (stripeSecretKey) {
            try {
                const stripeFactory = await importStripe()
                if (!stripeFactory) {
                    log.info('stripe SDK not installed — skipping Stripe path')
                } else {
                    const stripe = stripeFactory(stripeSecretKey, { apiVersion: '2024-06-20' })
                    const STRIPE_CAP = 1000
                    let stripeCount = 0

                    for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
                        stripeCount++
                        if (stripeCount >= STRIPE_CAP) {
                            log.warn(`Stripe iteration capped at ${STRIPE_CAP}`)
                            break
                        }

                        const meta = sub.metadata as Record<string, string>
                        const alpacaSlug = meta.alpaca ?? meta.alpacaSlug ?? null
                        if (!alpacaSlug) continue

                        const matchingAlpaca = birthdayAlpacas.find((a) => a.id === alpacaSlug)
                        if (!matchingAlpaca) continue

                        // Idempotency: skip if already sent this year.
                        if (meta.last_bday_email_year && meta.last_bday_email_year === String(todayYear)) {
                            log.info('Birthday email already sent this year for Stripe sub — skipping', { subId: sub.id })
                            continue
                        }

                        const email: string | null =
                            meta.donorEmail ??
                            (typeof (sub as { customer?: { email?: string } }).customer === 'object'
                                ? (sub as { customer?: { email?: string } }).customer?.email ?? null
                                : null)

                        if (!email || !isValidEmail(email)) continue

                        const birthYear = matchingAlpaca.birthDate
                            ? parseInt(matchingAlpaca.birthDate.slice(0, 4), 10)
                            : null

                        recipients.push({
                            email,
                            donorName: meta.donorName ?? null,
                            alpacaName: matchingAlpaca.name,
                            alpacaBirthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
                            locale: meta.locale ?? 'en',
                            vendor: 'stripe',
                            subId: sub.id,
                            stripeClient: stripe,
                        })
                    }
                }
            } catch (stripeErr) {
                log.warn('Stripe iteration failed — continuing with Mollie-only results', {
                    message: stripeErr instanceof Error ? stripeErr.message : String(stripeErr),
                })
            }
        } else {
            log.info('STRIPE_SECRET_KEY unset — skipping Stripe subscription path')
        }

        log.info('Birthday fan-out starting', {
            alpacasWithBirthdays: birthdayAlpacas.map((a) => a.id),
            recipients: recipients.length,
        })

        // ── Per-recipient fan-out ─────────────────────────────────────────────
        const contactEmail = getContactEmail()

        type SendResult =
            | { ok: true; subId: string }
            | { ok: false; subId: string; reason: string }

        const tasks = recipients.map(async (r): Promise<SendResult> => {
            // Build a portal URL that lands the donor directly on /my-adoption,
            // skipping the "enter your email" gate.
            //   - Mollie donors: sign a 24h status token so the link auto-authenticates.
            //   - Stripe donors (no Mollie IDs): fall back to /my-adoption without a
            //     token — the page shows its own "enter email" form, still better than
            //     the old /adopt#manage scroll anchor.
            let portalUrl: string
            if (r.vendor === 'mollie' && r.mollieCustomerId && r.mollieSubscriptionId) {
                try {
                    const token = signMollieStatusToken(
                        r.mollieCustomerId,
                        r.mollieSubscriptionId,
                        24 * 60 * 60 * 1000, // 24h TTL
                    )
                    portalUrl = `${SITE_BASE_URL}/${r.locale}/my-adoption?token=${encodeURIComponent(token)}`
                } catch {
                    // Signing key unavailable — degrade gracefully.
                    portalUrl = `${SITE_BASE_URL}/${r.locale}/my-adoption`
                }
            } else {
                portalUrl = `${SITE_BASE_URL}/${r.locale}/my-adoption`
            }

            const { subject, html } = buildAlpacaBirthdayEmail({
                donorName: r.donorName,
                alpacaName: r.alpacaName,
                alpacaBirthYear: r.alpacaBirthYear,
                locale: r.locale,
                portalUrl,
            })

            try {
                await sendEmail({
                    to: r.email,
                    subject,
                    html,
                    replyTo: contactEmail,
                })
            } catch (err) {
                const reason = err instanceof Error ? err.message : String(err)
                log.warn('sendEmail failed for birthday card', { subId: r.subId, reason })
                return { ok: false, subId: r.subId, reason }
            }

            // Stamp idempotency metadata after successful send to prevent
            // double-sending if cron fires twice the same day.
            try {
                if (r.vendor === 'stripe' && r.stripeClient) {
                    await r.stripeClient.subscriptions.update(r.subId, {
                        metadata: { last_bday_email_year: String(todayYear) },
                    })
                } else if (r.vendor === 'mollie' && r.mollieClient && r.mollieCustomerId) {
                    // Mollie subscription metadata update via customers_subscriptions.
                    // Cast through unknown at the SDK boundary — only way to call the
                    // Mollie update endpoint without an any-escape at the type level.
                    const mollieAny = r.mollieClient as unknown as {
                        customers_subscriptions: {
                            update: (opts: {
                                customerId: string
                                id: string
                                metadata: Record<string, string>
                            }) => Promise<unknown>
                        }
                    }
                    await mollieAny.customers_subscriptions.update({
                        customerId: r.mollieCustomerId,
                        id: r.subId,
                        metadata: { last_bday_email_year: String(todayYear) },
                    })
                }
            } catch (stampErr) {
                // Non-fatal — the email already sent. Log for visibility; don't fail the result.
                log.warn('Failed to stamp last_bday_email_year metadata — possible duplicate next cold-start', {
                    subId: r.subId,
                    message: stampErr instanceof Error ? stampErr.message : String(stampErr),
                })
            }

            return { ok: true, subId: r.subId }
        })

        const settled = await Promise.allSettled(tasks)
        let emailsSent = 0
        let errors = 0
        for (const result of settled) {
            if (result.status === 'fulfilled') {
                if (result.value.ok) emailsSent++
                else errors++
            } else {
                errors++
            }
        }

        log.info('Birthday card cron complete', {
            todayMmDd,
            scanned: ALPACAS.length,
            alpacasWithBirthdays: birthdayAlpacas.length,
            emailsSent,
            errors,
        })

        return {
            ok: true,
            routeName: 'alpaca-birthday-cards',
            durationMs: 0,
            successes: emailsSent,
            failures: errors,
            skipped: 0,
            detail: { scanned: ALPACAS.length, alpacasWithBirthdays: birthdayAlpacas.length },
        } satisfies CronRunResult
    })
}

export const POST = GET
