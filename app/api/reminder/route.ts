import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { safeEqual } from '@/lib/secrets'
import { escapeHtml } from '@/lib/html'
import { reminderEmailHtml, reminderSubject } from '@/lib/email-templates'

/**
 * POST /api/reminder
 *
 * Manual / fallback path for the 48h pre-tour reminder email. The primary flow
 * is /api/fareharbor-webhook which schedules the send via Resend scheduledAt.
 * This route is kept for:
 *  - owner-initiated tests
 *  - ad-hoc re-sends when a guest misses the original
 *  - integrations that can't speak to the webhook endpoint
 */
export async function POST(request: Request) {
    const expected = process.env.FAREHARBOR_WEBHOOK_SECRET
    if (expected) {
        const got = request.headers.get('x-webhook-secret')
        if (!safeEqual(got, expected)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    let body: Record<string, unknown>
    try {
        body = (await request.json()) as Record<string, unknown>
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const rawName = (body.customer_name as string) || (body.name as string) || 'there'
    const email = (body.customer_email as string) || (body.email as string)
    const rawTourName = (body.tour_name as string) || (body.item_name as string) || 'your visit'
    const startAt = body.start_at ? new Date(body.start_at as string) : null
    const locale = ((body.locale as string) || 'en')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
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

    try {
        await sendEmail({
            to: email,
            subject: reminderSubject(locale),
            html: reminderEmailHtml({
                escapedName: escapeHtml(rawName),
                escapedTourName: escapeHtml(rawTourName),
                dateStr,
                locale,
            }),
            replyTo: process.env.CONTACT_EMAIL || 'info@alpacasibiza.com',
        })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[reminder] sendEmail failed:', err)
        return NextResponse.json({ error: 'Send failed' }, { status: 500 })
    }
}
