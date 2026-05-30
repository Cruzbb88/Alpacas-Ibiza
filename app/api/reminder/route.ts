import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { safeEqual } from '@/lib/secrets'
import { escapeHtml } from '@/lib/html'
import { reminderEmailHtml, reminderSubject } from '@/lib/email-templates'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { buildIcs, googleCalendarUrl } from '@/lib/ics'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

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
    const reqId = getRequestId(request)
    const log = makeRequestLogger('reminder', reqId)

    // IP rate-limit — 2 req / 5 min. Manual fallback — not a public form;
    // 5-in-5-min would send 5 emails to one tour-attendee.
    const ip = getClientIp(request)
    const rl = rateLimit({ key: `reminder:${ip}`, limit: 2, windowMs: 5 * 60 * 1000 })
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
    const MAX_NAME = 200, MAX_EMAIL = 320, MAX_TOUR = 200, MAX_PK = 64, MAX_LOCALE = 10

    const rawName = String((body.customer_name as string) || (body.name as string) || 'there').slice(0, MAX_NAME)
    const email = String((body.customer_email as string) || (body.email as string) || '').slice(0, MAX_EMAIL)
    const rawTourName = String((body.tour_name as string) || (body.item_name as string) || 'your visit').slice(0, MAX_TOUR)
    const startAt = body.start_at ? new Date(body.start_at as string) : null
    const endAt = body.end_at ? new Date(body.end_at as string) : null
    const bookingPk = body.pk ? String(body.pk).slice(0, MAX_PK) : null
    const locale = String((body.locale as string) || 'en').slice(0, MAX_LOCALE)

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return attachRequestId(NextResponse.json({ error: 'Invalid email' }, { status: 400 }), reqId)
    }

    const dateStrOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }
    const dateStr = startAt
        ? (() => {
              try {
                  return startAt.toLocaleString(locale, dateStrOptions)
              } catch {
                  return startAt.toLocaleString('en-GB', dateStrOptions)
              }
          })()
        : 'your scheduled time'

    // Build ICS attachment + Google Calendar link when start time is available.
    // Falls back to no-ICS send if startAt is missing or date is invalid.
    let icsAttachment: { filename: string; content: string; contentType: string } | undefined
    let calendarUrl: string | undefined
    if (startAt && !isNaN(startAt.getTime())) {
        try {
            const organizerEmail = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'
            const uid = bookingPk ? `${bookingPk}@alpacasibiza.com` : `reminder-${Date.now()}@alpacasibiza.com`
            const icsInput = {
                uid,
                summary: `Alpaca farm visit at Es Currals`,
                description: `See you at Es Currals! Your visit: ${rawTourName} on ${dateStr}. Wear closed shoes, bring sun hat and water.`,
                startIso: startAt.toISOString(),
                endIso: endAt && !isNaN(endAt.getTime()) ? endAt.toISOString() : undefined,
                location: 'Es Currals, San Carlos, Santa Eulària des Riu, Ibiza',
                organizerName: 'Alpacas Ibiza',
                organizerEmail,
            }
            const icsContent = buildIcs(icsInput)
            icsAttachment = {
                filename: 'alpaca-visit.ics',
                content: Buffer.from(icsContent).toString('base64'),
                contentType: 'text/calendar',
            }
            calendarUrl = googleCalendarUrl(icsInput)
        } catch (icsErr) {
            log.error('ICS build failed — sending reminder without attachment', { err: String(icsErr) })
        }
    }

    try {
        await sendEmail({
            to: email,
            subject: reminderSubject(locale),
            html: reminderEmailHtml({
                escapedName: escapeHtml(rawName),
                escapedTourName: escapeHtml(rawTourName),
                dateStr,
                locale,
                addToCalendarUrl: calendarUrl,
            }),
            replyTo: process.env.CONTACT_EMAIL || 'info@alpacasibiza.com',
            listUnsubscribeUrl: `mailto:${process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'}?subject=unsubscribe`,
            ...(icsAttachment ? { attachments: [icsAttachment] } : {}),
        })
        return attachRequestId(NextResponse.json({ success: true }), reqId)
    } catch (err) {
        log.error('sendEmail failed', { err: String(err) })
        return attachRequestId(NextResponse.json({ error: 'Send failed' }, { status: 500 }), reqId)
    }
}
