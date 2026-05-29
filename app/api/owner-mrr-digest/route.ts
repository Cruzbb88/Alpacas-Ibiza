import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { safeEqual } from '@/lib/secrets'
import { buildOwnerMrrDigestEmail } from '@/lib/email-templates'
import { _internalGetStoreSnapshot } from '@/lib/payment-failure-tracker'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * GET /api/owner-mrr-digest?secret=<CRON_SECRET>
 *
 * Weekly MRR digest sent to the owner every Monday 09:00 CET.
 * Vercel Cron makes GET requests; the secret is carried via the ?secret= query
 * param (Vercel also auto-injects an Authorization: Bearer header when
 * CRON_SECRET is set — both patterns accepted, mirroring owner-digest).
 *
 * Data sources:
 *   - Mollie top-level subscriptions.iterate() — same pattern + cap as
 *     app/admin/analytics/subscriptions/page.tsx (intentional duplication;
 *     see build instructions comment).
 *   - lib/payment-failure-tracker — in-memory dunning counters.
 *
 * Fail-quiet on send errors: returns 200 to prevent Vercel cron retries
 * (which would re-send the digest). All send failures are logged to stderr.
 */
export async function GET(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('owner-mrr-digest', reqId)

    // ── Auth gate (mirrors owner-digest) ────────────────────────────────────
    const expected = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const got = bearer ?? new URL(request.url).searchParams.get('secret')
    if (!expected || !safeEqual(got, expected)) {
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

    // ── Week window (UTC) ────────────────────────────────────────────────────
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fmtDate = (d: Date) =>
        d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const weekStart = fmtDate(weekAgo)
    const weekEnd = fmtDate(now)

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

    const ms7d = 7 * 24 * 60 * 60 * 1000
    const nowMs = now.getTime()

    let activeCount = 0
    let mrr = 0
    let newCount7d = 0
    let canceledCount7d = 0

    for (const r of rows) {
        if (isActive(r.status)) {
            activeCount++
            mrr += monthlyContribution(r)
        }
        if (r.createdAt && nowMs - new Date(r.createdAt).getTime() <= ms7d) {
            newCount7d++
        }
        if (r.canceledAt && nowMs - new Date(r.canceledAt).getTime() <= ms7d) {
            canceledCount7d++
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
