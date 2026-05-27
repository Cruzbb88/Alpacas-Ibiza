import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { escapeHtml } from '@/lib/html'
import { safeEqual } from '@/lib/secrets'
import { reviewRequestEmailHtml, reviewRequestSubject } from '@/lib/email-templates'
import { isValidEmail } from '@/lib/validate-email'
import { requireOptionalWebhookSecret } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * POST /api/review-request
 *
 * Manual / fallback path for the 24h post-tour review-request email. Primary
 * flow is /api/fareharbor-webhook which schedules via Resend scheduledAt.
 */
export async function POST(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('review-request', reqId)

    const expected = process.env.FAREHARBOR_WEBHOOK_SECRET
    if (expected) {
        const got = request.headers.get('x-webhook-secret')
        if (!safeEqual(got, expected)) {
            return attachRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), reqId)
        }
    }

    let body: Record<string, unknown>
    try {
        body = (await request.json()) as Record<string, unknown>
    } catch {
        return attachRequestId(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }), reqId)
    }

    const rawName =
        (body.customer_name as string) || (body.name as string) || (body.guest_name as string) || 'there'
    const email =
        (body.customer_email as string) || (body.email as string) || (body.guest_email as string)
    const rawTourName = (body.tour_name as string) || (body.item_name as string) || 'your recent visit'
    const locale = ((body.locale as string) || 'en')

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return attachRequestId(NextResponse.json({ error: 'Invalid email' }, { status: 400 }), reqId)
    }

    try {
        await sendEmail({
            to: email,
            subject: reviewRequestSubject(locale),
            html: reviewRequestEmailHtml({
                escapedName: escapeHtml(rawName),
                escapedTourName: escapeHtml(rawTourName),
            }),
            replyTo: process.env.CONTACT_EMAIL || 'info@alpacasibiza.com',
            listUnsubscribeUrl: `mailto:${process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'}?subject=unsubscribe`,
        })
        return attachRequestId(NextResponse.json({ success: true }), reqId)
    } catch (err) {
        log.error('sendEmail failed', { err: String(err) })
        return attachRequestId(NextResponse.json({ error: 'Send failed' }, { status: 500 }), reqId)
    }
}
