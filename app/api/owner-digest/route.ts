import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { fetchWithTimeout } from '@/lib/fetch'
import { safeEqual } from '@/lib/secrets'
import { escapeHtml } from '@/lib/html'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { pingHeartbeat } from '@/lib/heartbeat'
import { isAlreadyProcessed, markProcessed } from '@/lib/webhook-idempotency'

/**
 * GET /api/owner-digest?secret=<CRON_SECRET>
 *
 * Weekly digest email to the owner summarizing:
 * - Upcoming bookings (next 7 days) from FareHarbor API if configured
 * - Graceful fallback email with a reminder to log in to FareHarbor directly
 *
 * Trigger: Vercel Cron, GitHub Actions scheduled job, or UptimeRobot.
 * Example Vercel cron:  * * * * Mon -> GET /api/owner-digest?secret=...
 */
export async function GET(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('owner-digest', reqId)

    const expected = process.env.CRON_SECRET
    // Accept either Vercel Cron's "Authorization: Bearer <CRON_SECRET>" header
    // (auto-added by Vercel when CRON_SECRET env is set) OR ?secret= for external
    // cron services like UptimeRobot.
    const authHeader = request.headers.get('authorization') || ''
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    const got = bearer ?? new URL(request.url).searchParams.get('secret')
    if (!expected || !safeEqual(got, expected)) {
        return attachRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), reqId)
    }

    // Run-level idempotency: key on the ISO calendar week (YYYY-Www) so a
    // Vercel double-fire within the same Monday window is a no-op. Uses the
    // same in-memory store as webhook-idempotency (4-day TTL easily covers a
    // same-minute double-fire and any same-day retry). markProcessed is called
    // AFTER a successful send so a transient Resend failure allows a retry.
    const now = new Date()
    const isoWeek = (() => {
        // ISO week: Jan 4 is always in week 1 (ISO 8601).
        const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        // Thursday in current week determines the year (ISO rule).
        tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
        const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
        return `${tmp.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
    })()
    const runKey = `owner-digest:${isoWeek}`
    if (isAlreadyProcessed(runKey)) {
        log.info('Digest already sent this week — skipping duplicate run', { isoWeek })
        pingHeartbeat('owner-digest')
        return attachRequestId(NextResponse.json({ sent: false, idempotent: true, isoWeek }), reqId)
    }

    const ownerEmail = process.env.CONTACT_EMAIL || 'info@alpacasibiza.com'
    const appKey = process.env.FAREHARBOR_APP_KEY
    const userKey = process.env.FAREHARBOR_USER_KEY
    const shortname = process.env.FAREHARBOR_SHORTNAME || 'alpacasibiza'

    // No API creds? Send a lightweight digest reminder.
    if (!appKey || !userKey) {
        try {
            await sendEmail({
                to: ownerEmail,
                subject: `[Alpacas Ibiza] Weekly digest — ${now.toLocaleDateString()}`,
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                      <h2 style="color:#556B2F">🦙 Weekly summary</h2>
                      <p>Live booking summary requires FareHarbor API access. To enable, contact support@fareharbor.com and request API keys, then set FAREHARBOR_APP_KEY and FAREHARBOR_USER_KEY.</p>
                      <p>In the meantime, log in to your FareHarbor dashboard to see this week's bookings.</p>
                      <p>Have a great week!</p>
                    </div>
                `,
                listUnsubscribeUrl: `mailto:${process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'}?subject=unsubscribe`,
            })
            markProcessed(runKey)
            pingHeartbeat('owner-digest')
            return attachRequestId(NextResponse.json({ sent: true, mode: 'fallback' }), reqId)
        } catch (err) {
            log.error('fallback send failed', { err: String(err) })
            return attachRequestId(NextResponse.json({ error: 'Send failed' }, { status: 500 }), reqId)
        }
    }

    // Fetch upcoming bookings from FareHarbor
    // (now already declared above for the idempotency key computation)
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    try {
        const bookingsRes = await fetchWithTimeout(
            `https://fareharbor.com/api/external/v1/companies/${shortname}/bookings/?range_type=start&start_date=${fmt(now)}&end_date=${fmt(weekFromNow)}`,
            {
                headers: {
                    'X-FareHarbor-API-App': appKey,
                    'X-FareHarbor-API-User': userKey,
                },
            },
            8000
        )

        if (!bookingsRes.ok) {
            throw new Error(`FareHarbor bookings returned ${bookingsRes.status}`)
        }

        const data = await bookingsRes.json()
        const bookings = (data.bookings || []) as Array<{
            contact?: { name?: string; email?: string }
            customer_count?: number
            availability?: { start_at?: string; item?: { name?: string } }
            amount_paid?: string
        }>

        const totalGuests = bookings.reduce(
            (sum, b) => sum + (b.customer_count || 0),
            0
        )
        const totalRevenue = bookings.reduce(
            (sum, b) => sum + parseFloat(b.amount_paid || '0'),
            0
        )

        const rows = bookings
            .slice(0, 50)
            .map((b) => {
                const when = b.availability?.start_at
                    ? new Date(b.availability.start_at).toLocaleString('en-GB', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                      })
                    : '?'
                const name = escapeHtml(b.contact?.name || '(no name)')
                const guests = escapeHtml(b.customer_count ?? '?')
                const item = escapeHtml(b.availability?.item?.name || '—')
                return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${when}</td><td style="padding:8px;border-bottom:1px solid #eee">${item}</td><td style="padding:8px;border-bottom:1px solid #eee">${name}</td><td style="padding:8px;border-bottom:1px solid #eee">${guests}</td></tr>`
            })
            .join('')

        const html = `
<div style="font-family:sans-serif;max-width:700px;margin:0 auto;color:#2d2d2d">
  <h2 style="color:#556B2F">🦙 Alpacas Ibiza — Weekly digest</h2>
  <p style="color:#888">Week of ${now.toLocaleDateString()}</p>
  <div style="display:flex;gap:16px;margin:16px 0">
    <div style="flex:1;background:#f5f5dc;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:bold;color:#556B2F">${bookings.length}</div>
      <div style="font-size:12px;color:#666">Bookings</div>
    </div>
    <div style="flex:1;background:#f5f5dc;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:bold;color:#556B2F">${totalGuests}</div>
      <div style="font-size:12px;color:#666">Guests</div>
    </div>
    <div style="flex:1;background:#f5f5dc;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:28px;font-weight:bold;color:#556B2F">€${totalRevenue.toFixed(0)}</div>
      <div style="font-size:12px;color:#666">Revenue</div>
    </div>
  </div>
  <h3 style="margin-top:24px">Upcoming bookings</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f9f9f9"><th style="padding:8px;text-align:left">When</th><th style="padding:8px;text-align:left">Tour</th><th style="padding:8px;text-align:left">Guest</th><th style="padding:8px;text-align:left">#</th></tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#888">No bookings this week</td></tr>'}</tbody>
  </table>
  <p style="margin-top:32px;color:#888;font-size:12px">Powered by FareHarbor API. Full details at <a href="https://fareharbor.com/dashboard/${shortname}">fareharbor.com</a>.</p>
</div>
`

        await sendEmail({
            to: ownerEmail,
            subject: `[Alpacas Ibiza] Weekly digest — ${bookings.length} bookings, ${totalGuests} guests, €${totalRevenue.toFixed(0)}`,
            html,
            listUnsubscribeUrl: `mailto:${process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'}?subject=unsubscribe`,
        })

        markProcessed(runKey)
        pingHeartbeat('owner-digest')
        return attachRequestId(
            NextResponse.json({
                sent: true,
                mode: 'live',
                bookings: bookings.length,
                guests: totalGuests,
                revenue: totalRevenue,
            }),
            reqId
        )
    } catch (err) {
        log.error('digest failed', { err: String(err) })
        return attachRequestId(NextResponse.json({ error: 'Digest failed' }, { status: 500 }), reqId)
    }
}

// ADR-024: Vercel Cron dispatches POST. Alias POST→GET so the scheduled
// tick does not 405. GET stays for manual/CRON_SECRET Bearer testing.
export const POST = GET
