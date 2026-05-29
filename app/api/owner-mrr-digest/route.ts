import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { buildOwnerMrrDigestEmail } from '@/lib/email-templates'
import { _internalGetStoreSnapshot } from '@/lib/payment-failure-tracker'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyCronSecret } from '@/lib/cron-auth'

/**
 * GET /api/owner-mrr-digest   (Authorization: Bearer <CRON_SECRET>)
 *
 * Weekly MRR digest sent to the owner every Monday 06:00 UTC.
 * Vercel Cron auto-injects `Authorization: Bearer ${CRON_SECRET}` when
 * CRON_SECRET is set in env, so we accept ONLY the Bearer header. The
 * ?secret= query fallback was removed because query strings are routinely
 * logged by edge proxies and analytics — a leaked CRON_SECRET would let
 * anyone trigger the digest, spamming the owner.
 *
 * Data sources:
 *   - Mollie top-level subscriptions.iterate() — same pattern + cap as
 *     app/admin/analytics/subscriptions/page.tsx (intentional duplication;
 *     see build instructions comment).
 *   - lib/payment-failure-tracker — in-memory dunning counters. The email
 *     surfaces a cold-start caveat because the counters reset on Vercel
 *     instance restart (ADR 001 in-memory persistence).
 *
 * Fail-quiet on send errors: returns 200 to prevent Vercel cron retries
 * (which would re-send the digest). All send failures are logged to stderr.
 */
export async function GET(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('owner-mrr-digest', reqId)

    // ── Auth gate — Bearer header ONLY. See header comment for rationale. ──
    if (!verifyCronSecret(request)) {
        return attachRequestId(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            reqId,
        )
    }

    // ── Mollie API key gate ──────────────────────────────────────────────────
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) {
        log.warn('MOLLIE_API_KEY unset — cannot compute MRR')
        return attachRequestId(
            NextResponse.json({ error: 'MOLLIE_API_KEY_UNSET' }, { status: 503 }),
            reqId,
        )
    }

    const ownerEmail =
        process.env.OWNER_EMAIL ??
        process.env.CONTACT_EMAIL ??
        'info@alpacasibiza.com'

    // ── ISO-week window (UTC, Mon→Mon) ───────────────────────────────────────
    // Cron fires Monday 06:00 UTC. The digest covers the JUST-COMPLETED
    // calendar week: previous Monday 00:00 UTC (inclusive) → this Monday
    // 00:00 UTC (exclusive). Previously this was a rolling 7-day window
    // (now - 7d → now), which drifted by 6 hours per week and produced
    // ragged week labels like "Mon 26 May 06:00 → Mon 2 Jun 06:00".
    const now = new Date()
    const dayOfWeekMonZero = (now.getUTCDay() + 6) % 7 // Mon=0..Sun=6
    const thisWeekMondayMs = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - dayOfWeekMonZero,
    )
    const weekStartMs = thisWeekMondayMs - 7 * 24 * 60 * 60 * 1000
    const weekEndMs = thisWeekMondayMs
    const fmtDate = (d: Date) =>
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    const weekStart = fmtDate(new Date(weekStartMs))
    // weekEnd label = Sunday (last day of window), one ms before Mon 00:00.
    const weekEnd = fmtDate(new Date(weekEndMs - 1))

    // ── Mollie subscription iteration (cap 500, same as subscriptions page) ──
    type SubRaw = {
        id: string
        customerId?: string | null
        status?: string
        amount?: { value: string; currency: string }
        interval?: string
        description?: string
        createdAt?: string
        canceledAt?: string | Date
        nextPaymentDate?: string
        metadata?: { tier?: string }
    }

    interface SubscriptionRow {
        id: string
        customerId: string | null
        status: string
        amountValue: number
        interval: string
        createdAt: string | null
        canceledAt: string | null
    }

    const rows: SubscriptionRow[] = []
    let fetchError: string | null = null

    try {
        const mollie = await getMollieClient(apiKey)
        if (!mollie) {
            log.warn('@mollie/api-client not installed')
            return attachRequestId(
                NextResponse.json({ error: 'MOLLIE_SDK_MISSING' }, { status: 503 }),
                reqId,
            )
        }

        const iter = (mollie as unknown as {
            subscriptions: { iterate: () => AsyncIterable<SubRaw> }
        }).subscriptions.iterate()

        const ITERATION_CAP = 500
        let i = 0
        for await (const raw of iter) {
            i++
            if (i > ITERATION_CAP) {
                fetchError = `Capped at ${ITERATION_CAP} — KPIs are partial.`
                break
            }
            rows.push({
                id: raw.id,
                customerId: raw.customerId ?? null,
                status: raw.status ?? 'unknown',
                amountValue: raw.amount ? Number.parseFloat(raw.amount.value) : 0,
                interval: raw.interval ?? '',
                createdAt: raw.createdAt ?? null,
                canceledAt:
                    raw.canceledAt instanceof Date
                        ? raw.canceledAt.toISOString()
                        : typeof raw.canceledAt === 'string'
                        ? raw.canceledAt
                        : null,
            })
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error('Mollie iteration failed', { message })
        // Fail-quiet: still send an email with zeros so the owner knows
        // the cron ran (and gets a subject line that's clearly wrong if
        // the MRR is 0 when it shouldn't be).
        fetchError = message
    }

    // ── Compute KPIs ─────────────────────────────────────────────────────────
    function isActive(status: string): boolean {
        return status === 'active' || status === 'pending'
    }

    function monthlyContribution(row: SubscriptionRow): number {
        const v = Number.parseFloat(row.amountValue.toString())
        if (!Number.isFinite(v)) return 0
        const intervalLower = (row.interval ?? '').toLowerCase()
        if (
            intervalLower.includes('year') ||
            intervalLower === '12 months' ||
            intervalLower === '1 year'
        ) {
            return v / 12
        }
        return v
    }

    let activeCount = 0
    let mrr = 0
    let newCount7d = 0
    let canceledCount7d = 0

    for (const r of rows) {
        if (isActive(r.status)) {
            activeCount++
            mrr += monthlyContribution(r)
        }
        // newCount7d: subs whose createdAt falls inside [weekStart, weekEnd).
        // Exclude rows where status === 'canceled' AND canceledAt < weekStart —
        // those are "created during a prior week, canceled before this week
        // even began" stragglers that would inflate 'new' without ever
        // contributing to canceled (canceledCount7d's own filter excludes them).
        if (r.createdAt) {
            const createdMs = new Date(r.createdAt).getTime()
            if (createdMs >= weekStartMs && createdMs < weekEndMs) {
                const canceledBeforeWindow =
                    r.status === 'canceled' &&
                    r.canceledAt &&
                    new Date(r.canceledAt).getTime() < weekStartMs
                if (!canceledBeforeWindow) newCount7d++
            }
        }
        if (r.canceledAt) {
            const canceledMs = new Date(r.canceledAt).getTime()
            if (canceledMs >= weekStartMs && canceledMs < weekEndMs) {
                canceledCount7d++
            }
        }
    }

    const arr = mrr * 12

    // Churn rate: canceledLast7d / (active + canceledLast7d) * 100
    const churnPct =
        activeCount + canceledCount7d === 0
            ? 0
            : (canceledCount7d / (activeCount + canceledCount7d)) * 100

    // ── Dunning snapshot ─────────────────────────────────────────────────────
    const dunning = _internalGetStoreSnapshot()
    const atRiskCount = dunning.filter((d) => d.severity === 'at-risk').length
    const actionRequiredCount = dunning.filter(
        (d) => d.severity === 'action-required',
    ).length

    // ── Build + send email ───────────────────────────────────────────────────
    // Always surface the dunning cold-start advisory. Owner sees the digest
    // weekly; they need a recurring reminder that the figure reflects only
    // failures seen since the most recent Vercel restart.
    const { subject, html } = buildOwnerMrrDigestEmail({
        mrr,
        arr,
        activeCount,
        newCount7d,
        canceledCount7d,
        churnPct,
        atRiskCount,
        actionRequiredCount,
        weekStart,
        weekEnd,
        dunningColdStartCaveat: true,
    })

    try {
        await sendEmail({ to: ownerEmail, subject, html })
        log.info('digest sent', {
            to: ownerEmail,
            mrr: mrr.toFixed(2),
            activeCount,
            newCount7d,
            canceledCount7d,
            atRiskCount,
            actionRequiredCount,
            fetchError,
        })
    } catch (err) {
        // Fail-quiet: log but return 200 so Vercel cron doesn't retry.
        // A retry would re-send the same digest — worse than a missed send.
        log.error('sendEmail failed', { err: String(err) })
        return attachRequestId(
            NextResponse.json({
                ok: true,
                sent: false,
                reason: 'send-failed',
                mrr,
                activeCount,
            }),
            reqId,
        )
    }

    return attachRequestId(
        NextResponse.json({
            ok: true,
            sent: true,
            mrr,
            activeCount,
        }),
        reqId,
    )
}
