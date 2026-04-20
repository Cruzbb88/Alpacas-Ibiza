import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'

/**
 * POST /api/review-request
 *
 * Triggered by a FareHarbor booking webhook (or a scheduled job) ~24h AFTER a tour
 * completes. Sends the guest a friendly email asking them to leave a review on
 * Google / TripAdvisor. Compounds reviews over time = compounds trust = compounds bookings.
 *
 * Expected payload (loose — accommodates multiple sender formats):
 *   {
 *     customer_name: string,
 *     customer_email: string,
 *     tour_name?: string,
 *     locale?: 'en' | 'de' | 'es' | 'it' | 'nl' | 'fr',
 *   }
 *
 * Auth: shared secret via header `x-webhook-secret` matches FAREHARBOR_WEBHOOK_SECRET
 * (or any shared cron secret). Fails closed if secret is set server-side but missing
 * from the request.
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

    const name =
        body.customer_name || body.name || body.guest_name || 'there'
    const email =
        body.customer_email || body.email || body.guest_email
    const tourName = body.tour_name || body.item_name || 'your recent visit'
    const locale = (body.locale || 'en') as string

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    // Localized copy — keep English as default, extend here as needed
    const subject =
        locale === 'es'
            ? `¿Cómo fue tu visita a los alpacas? 🦙`
            : locale === 'de'
              ? `Wie war dein Besuch bei den Alpakas? 🦙`
              : `How were the alpacas? 🦙`

    const reviewLinks = {
        google: 'https://g.page/r/alpacasibiza/review',
        tripadvisor: 'https://www.tripadvisor.com/UserReviewEdit-g3410459-d27056780',
    }

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d">
  <h2 style="color:#556B2F">Hi ${name} 👋</h2>
  <p>Thank you for visiting Alpacas Ibiza for <strong>${tourName}</strong>. We hope you had a wonderful time with the herd.</p>
  <p>If you have 30 seconds, a short review makes a huge difference for our small farm. Could you share your experience?</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${reviewLinks.google}" style="display:inline-block;margin:4px;padding:12px 24px;background:#556B2F;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Review on Google</a>
    <a href="${reviewLinks.tripadvisor}" style="display:inline-block;margin:4px;padding:12px 24px;background:#00AA6C;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Review on TripAdvisor</a>
  </div>
  <p>Want to come back? Save 10% with code <strong>RETURN10</strong> on your next visit.</p>
  <p>With gratitude,<br/>The Alpacas Ibiza team 🦙</p>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0" />
  <p style="color:#999;font-size:12px">If you'd rather not receive these emails, just reply "unsubscribe".</p>
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
        console.error('[review-request] sendEmail failed:', err)
        return NextResponse.json({ error: 'Send failed' }, { status: 500 })
    }
}
