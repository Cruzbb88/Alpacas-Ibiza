import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'

/**
 * POST /api/reminder
 *
 * Triggered 48h BEFORE a tour starts. Sends the guest a friendly reminder
 * email with: directions, what to wear/bring, weather link, WhatsApp contact.
 * Reduces no-shows (industry baseline 15-20%).
 *
 * Expected payload:
 *   {
 *     customer_name: string,
 *     customer_email: string,
 *     tour_name?: string,
 *     start_at?: ISO 8601 string,
 *     locale?: string,
 *   }
 */
export async function POST(request: Request) {
    const expected = process.env.FAREHARBOR_WEBHOOK_SECRET
    if (expected) {
        const got = request.headers.get('x-webhook-secret')
        if (got !== expected) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const name = body.customer_name || body.name || 'there'
    const email = body.customer_email || body.email
    const tourName = body.tour_name || body.item_name || 'your visit'
    const startAt = body.start_at ? new Date(body.start_at) : null
    const locale = (body.locale || 'en') as string

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const dateStr = startAt
        ? startAt.toLocaleString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'your scheduled time'

    const subject =
        locale === 'es'
            ? `¡Nos vemos pronto! Tu visita a los alpacas 🦙`
            : locale === 'de'
              ? `Wir freuen uns auf dich! Dein Alpaka-Besuch 🦙`
              : `See you soon! Your alpaca visit 🦙`

    const whatsapp = 'https://wa.me/32475586544'
    const mapsLink =
        'https://maps.google.com/?q=Alpacas+Ibiza,+San+Carlos,+Ibiza,+Spain'
    const weatherLink = 'https://www.google.com/search?q=weather+san+carlos+ibiza'

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d">
  <h2 style="color:#556B2F">Hi ${name} 👋</h2>
  <p>We're getting excited for <strong>${tourName}</strong> on <strong>${dateStr}</strong>!</p>

  <h3 style="margin-top:24px">Before you arrive</h3>
  <ul style="line-height:1.6">
    <li>👕 <strong>Wear:</strong> comfortable closed shoes (the paddocks can be dusty/muddy)</li>
    <li>🧢 <strong>Bring:</strong> sun hat, sunscreen, water bottle — it gets warm</li>
    <li>📸 <strong>Cameras:</strong> welcome and encouraged! Tag us @alpacasibiza on Instagram</li>
    <li>🌦️ <strong>Weather:</strong> <a href="${weatherLink}" style="color:#556B2F">check the forecast for San Carlos</a></li>
  </ul>

  <h3 style="margin-top:24px">How to find us</h3>
  <p>We're in the rural north of Ibiza, near San Carlos. <a href="${mapsLink}" style="color:#556B2F">Open in Google Maps</a>.</p>
  <p>Parking is free on-site.</p>

  <h3 style="margin-top:24px">Need to change anything?</h3>
  <p>Free cancellation up to 24 hours before. Message us on WhatsApp: <a href="${whatsapp}">+32 475 58 65 44</a></p>

  <p style="margin-top:32px">See you and the alpacas soon 🦙<br/>— The Alpacas Ibiza team</p>
</div>
`

    try {
        await sendEmail({
            to: email,
            subject,
            html,
            replyTo: process.env.CONTACT_EMAIL || 'info@alpacasibiza.com',
        })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[reminder] sendEmail failed:', err)
        return NextResponse.json({ error: 'Send failed' }, { status: 500 })
    }
}
