import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { escapeHtml } from '@/lib/html'
import { safeEqual } from '@/lib/secrets'
import { reviewRequestEmailHtml, reviewRequestSubject } from '@/lib/email-templates'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/review-request
 *
 * Manual / fallback path for the 24h post-tour review-request email. Primary
 * flow is /api/fareharbor-webhook which schedules via Resend scheduledAt.
 */
export async function POST(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('review-request', reqId)

    // IP rate-limit — 5 req / 5 min. Mirrors /api/reminder.
    const ip = getClientIp(request)
    const rl = rateLimit({ key: `review-request:${ip}`, limit: 5, windowMs: 5 * 60 * 1000 })
    if (!rl.allowed) {
        log.warn('IP rate limit hit', { ip, retryAfterSec: Math.ceil(rl.resetMs / 1000) })
        return attachRequestId(
            NextResponse.json({ error: 'Too many requests' }, {
                status: 429,
                headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) },
            }),
            reqId,
        )
    }

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

    // Length caps — prevents oversized strings from reaching escapeHtml / email send.
    const MAX_NAME = 200, MAX_EMAIL = 320, MAX_TOUR = 200, MAX_LOCALE = 10

    const rawName = String(
        (body.customer_name as string) || (body.name as string) || (body.guest_name as string) || 'there'
    ).slice(0, MAX_NAME)
    const email = String(
        (body.customer_email as string) || (body.email as string) || (body.guest_email as string) || ''
    ).slice(0, MAX_EMAIL)
    const rawTourName = String(
        (body.tour_name as string) || (body.item_name as string) || 'your recent visit'
    ).slice(0, MAX_TOUR)
    const locale = String((body.locale as string) || 'en').slice(0, MAX_LOCALE)

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
