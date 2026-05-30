import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { buildAdopterMilestoneEmail } from '@/lib/email-templates'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyCronSecret } from '@/lib/cron-auth'
import { pingHeartbeat } from '@/lib/heartbeat'
import { isValidEmail } from '@/lib/validate-email'
import { escapeHtml } from '@/lib/html'
import { getDonorMilestone, type MilestoneDays } from '@/lib/milestones'
import { isAlreadyProcessed, markProcessed } from '@/lib/webhook-idempotency'

/**
 * GET /api/adopt-milestone-emails  (Authorization: Bearer <CRON_SECRET>)
 *
 * Daily anniversary email — Memberful / Substack / Patreon pattern.
 * Fires per-donor milestone touchpoints when a Mollie subscription's
 * `createdAt` lands TODAY at 30 / 180 / 365 / 730 days.
 *
 * vercel.json schedule: `0 10 * * *` (10:00 UTC daily — after the weekly
 * digests; intentionally co-fires with adopt-renewal-reminders at 10:00
 * UTC — both routes scan Mollie independently so a partial failure in
 * one does not silently cap the other, same reasoning as
 * adopt-quarterly-update vs owner-mrr-digest).
 *
 * Auth: Bearer header ONLY (same reasoning as adopt-quarterly-update — a
 * leaked CRON_SECRET in a query string would let anyone spam every active
 * donor with milestone emails).
 *
 * Idempotency: Vercel cron can double-fire (rare, but documented). Each
 * (subId, milestoneDays) pair is recorded in the in-memory
 * webhook-idempotency store with key `milestone:${subId}:${days}` AFTER
 * a successful send. A re-run on the same day is a no-op for that pair —
 * the helper short-circuits before building the email and before calling
 * Resend, so the donor never sees the same milestone twice in a day.
 *
 * Cold-start caveat: the in-memory idempotency store evaporates on
 * Vercel cold start. In the (extremely narrow) window where Vercel cron
 * fires twice on the same UTC day AND the second fire lands on a fresh
 * process AND the donor's milestone is today AND the second fire's email
 * also succeeds, the donor receives the milestone twice. This is the
 * same ADR 001 tradeoff as booking-schedule-store. Daily cron firing on
 * a daily schedule does not have a realistic 2-fire-per-day exposure
 * outside of manual cron-tab "Run now" clicks; the operator's behaviour
 * is in scope of acceptable risk.
 *
 * Fail-quiet: every error path returns 200 so Vercel cron does not retry
 * and duplicate-send the entire batch.
 */
export async function GET(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('adopt-milestone-emails', reqId)

    // ── Auth gate — Bearer header ONLY ───────────────────────────────────────
    if (!verifyCronSecret(request)) {
        return attachRequestId(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            reqId,
        )
    }

    const now = new Date()

    // ── Mollie API key gate ──────────────────────────────────────────────────
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
        log.warn('MOLLIE_API_KEY unset — cannot iterate subscriptions')
        // Fail-quiet 200; heartbeat intentionally NOT pinged here so the
        // dead-man's switch alerts on a configuration gap (mirrors
        // adopt-quarterly-update behaviour).
        return attachRequestId(
            NextResponse.json({
                ok: true,
                sent: 0,
                failed: 0,
                capped: false,
                milestonesProcessed: 0,
                reason: 'MOLLIE_API_KEY_UNSET',
            }),
            reqId,
        )
    }

    const mollie = await getMollieClient(apiKey)
    if (!mollie) {
        log.warn('@mollie/api-client not installed — cannot iterate subscriptions')
        return attachRequestId(
            NextResponse.json({
                ok: true,
                sent: 0,
                failed: 0,
                capped: false,
                milestonesProcessed: 0,
                reason: 'MOLLIE_SDK_MISSING',
            }),
            reqId,
        )
    }

    // ── Mollie subscription iteration (cap 500, mirrors adopt-quarterly-update) ─
    type SubRaw = {
        id: string
        customerId?: string | null
        status?: string
        createdAt?: string | null
        metadata?: {
            donorName?: string | null
            donorEmail?: string | null
            alpacaName?: string | null
            alpacaSlug?: string | null
            locale?: string | null
        } | null
    }

    interface MilestoneRecipient {
        subId: string
        email: string
        donorName: string | null
        alpacaName: string | null
        locale: string
        milestoneDays: MilestoneDays
    }

    const recipients: MilestoneRecipient[] = []
    let capped = false
    let iterationError: string | null = null
    let scanned = 0

    try {
        const iter = (mollie as unknown as {
            subscriptions: { iterate: () => AsyncIterable<SubRaw> }
        }).subscriptions.iterate()

        const ITERATION_CAP = 500
        let i = 0
        for await (const raw of iter) {
            i++
            scanned++
            if (i > ITERATION_CAP) {
                capped = true
                log.warn(`Capped at ${ITERATION_CAP} subscriptions — milestone scan is partial`)
                break
            }
            if (raw.status !== 'active') continue
            if (!raw.createdAt) continue

            const createdMs = Date.parse(raw.createdAt)
            if (!Number.isFinite(createdMs)) continue
            const createdDate = new Date(createdMs)

            const milestone = getDonorMilestone(createdDate, now)
            if (milestone === null) continue

            // Mollie subscription metadata does NOT carry the donor email
            // (webhook writes only product/tier/tenantId/seedPaymentId). The
            // donor email lives on the customer record — fetch it on demand.
            // Skip if customerId missing (degenerate orphan sub).
            if (!raw.customerId) {
                log.warn('Skipping milestone for sub with no customerId', { subId: raw.id, milestone })
                continue
            }
            let email: string | null = null
            try {
                const customer = await mollie.customers.get(raw.customerId)
                email = typeof customer?.email === 'string' ? customer.email : null
            } catch (custErr) {
                log.warn('mollie.customers.get failed — skipping recipient', {
                    subId: raw.id,
                    message: custErr instanceof Error ? custErr.message : String(custErr),
                })
                continue
            }
            if (!email) {
                log.warn('Skipping milestone — customer has no email on file', {
                    subId: raw.id,
                    milestone,
                })
                continue
            }

            recipients.push({
                subId: raw.id,
                email,
                donorName: raw.metadata?.donorName ?? null,
                alpacaName: raw.metadata?.alpacaName ?? null,
                locale: raw.metadata?.locale ?? 'en',
                milestoneDays: milestone,
            })
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        // Partial scan is acceptable — the milestones we found so far still
        // get sent. Log loudly so ops sees it. Mirrors quarterly-update
        // partial-send tradeoff.
        iterationError = message
        log.error('Mollie iteration failed partway — proceeding with partial recipient list', {
            message,
            partialCount: recipients.length,
        })
    }

    const milestonesProcessed = recipients.length

    log.info('Milestone fan-out starting', {
        scanned,
        milestonesProcessed,
        capped,
        iterationError,
    })

    // ── Per-recipient fan-out ────────────────────────────────────────────────
    const contactEmail = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

    type SendResult =
        | { ok: true; subId: string }
        | { ok: false; subId: string; reason: string }

    const tasks = recipients.map(async (r): Promise<SendResult> => {
        // Idempotency gate: skip if we've already sent THIS milestone for
        // THIS subscription within the TTL window. The webhook-idempotency
        // store's 4-day TTL comfortably covers a same-day double-fire and
        // any plausible same-week cold-start re-run.
        const idemKey = `milestone:${r.subId}:${r.milestoneDays}`
        if (isAlreadyProcessed(idemKey)) {
            log.info('Skipping milestone — already sent for this sub+milestone', {
                subId: r.subId,
                milestone: r.milestoneDays,
            })
            return { ok: false, subId: r.subId, reason: 'already-sent' }
        }

        if (!isValidEmail(r.email)) {
            log.warn('Skipping recipient with invalid email in metadata', { subId: r.subId })
            return { ok: false, subId: r.subId, reason: 'invalid-email' }
        }

        // Pre-escape donor name here so the email-templates module does not
        // also escape (it accepts the escaped form via `escapedName`).
        const escapedName = r.donorName ? escapeHtml(r.donorName) : null
        const { subject, html } = buildAdopterMilestoneEmail({
            escapedName,
            alpacaName: r.alpacaName,
            milestoneDays: r.milestoneDays,
            locale: r.locale,
        })

        try {
            await sendEmail({
                to: r.email,
                subject,
                html,
                replyTo: contactEmail,
            })
            // ONLY mark on successful send. A failed send must be allowed
            // to retry on the next cron fire — matches webhook-idempotency's
            // post-success-mark contract.
            markProcessed(idemKey)
            return { ok: true, subId: r.subId }
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err)
            log.warn('sendEmail failed — continuing batch', {
                subId: r.subId,
                milestone: r.milestoneDays,
                reason,
            })
            return { ok: false, subId: r.subId, reason }
        }
    })

    const settled = await Promise.allSettled(tasks)
    let sent = 0
    let failed = 0
    for (const result of settled) {
        if (result.status === 'fulfilled') {
            if (result.value.ok) sent++
            // already-sent and invalid-email are not "failures" — they're
            // expected no-ops — but counting them as failed keeps the
            // return shape simple. Ops can distinguish via logs.
            else failed++
        } else {
            failed++
        }
    }

    log.info('Milestone cron complete', {
        scanned,
        milestonesProcessed,
        sent,
        failed,
        capped,
        iterationError,
    })

    // Heartbeat fires whether the batch sent zero or N. The "zero
    // milestones today" case is the steady state — most days no donor
    // crosses a 30/180/365/730 boundary — so we MUST ping or the
    // dead-man's switch alerts every quiet day.
    pingHeartbeat('adopt-milestone-emails')

    return attachRequestId(
        NextResponse.json({
            ok: true,
            sent,
            failed,
            capped,
            milestonesProcessed,
        }),
        reqId,
    )
}

// Vercel cron sends POST; GET is kept so manual triggers via browser/curl still work.
export const POST = GET
