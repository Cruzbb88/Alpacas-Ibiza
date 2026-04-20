import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'

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
async function fetchWithTimeout(url: string, init: RequestInit, ms = 5000) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    try {
        return await fetch(url, { ...init, signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}

export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET
    const got = new URL(request.url).searchParams.get('secret')
    if (!expected || got !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
                subject: `[Alpacas Ibiza] Weekly digest — ${new Date().toLocaleDateString()}`,
                html: `
                    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                      <h2 style="color:#556B2F">🦙 Weekly summary</h2>
                      <p>Live booking summary requires FareHarbor API access. To enable, contact support@fareharbor.com and request API keys, then set FAREHARBOR_APP_KEY and FAREHARBOR_USER_KEY.</p>
                      <p>In the meantime, log in to your FareHarbor dashboard to see this week's bookings.</p>
                      <p>Have a great week!</p>
                    </div>
                `,
            })
            return NextResponse.json({ sent: true, mode: 'fallback' })
        } catch (err) {
            console.error('[owner-digest] fallback send failed:', err)
            return NextResponse.json({ error: 'Send failed' }, { status: 500 })
        }
    }

    // Fetch upcoming bookings from FareHarbor
    const now = new Date()
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
                const name = b.contact?.name || '(no name)'
                const guests = b.customer_count || '?'
                const item = b.availability?.item?.name || '—'
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
        })

        return NextResponse.json({
            sent: true,
            mode: 'live',
            bookings: bookings.length,
            guests: totalGuests,
            revenue: totalRevenue,
        })
    } catch (err) {
        console.error('[owner-digest] error:', err)
        return NextResponse.json({ error: 'Digest failed' }, { status: 500 })
    }
}
