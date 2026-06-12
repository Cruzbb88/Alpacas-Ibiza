/**
 * Shared handler for manual tour-email fallback routes.
 *
 * Used by:
 *   - app/api/reminder/route.ts   (type='reminder')
 *   - app/api/review-request/route.ts  (type='review-request')
 *
 * Security contracts preserved:
 *   - makeWebhookSecretProvider fail-OPEN guard wired per route via env-specific
 *     secret names (REMINDER_WEBHOOK_SECRET / REVIEW_REQUEST_WEBHOOK_SECRET).
 *     Each route creates its own guard and verifies BEFORE calling this handler.
 *   - IP rate-limit: 2 req / 5 min. Each route applies its own limit key so
 *     reminder and review-request have independent buckets.
 *   - escapeHtml on all user-supplied fields before email body.
 */

import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { escapeHtml } from '@/lib/html'
import {
  reminderEmailHtml,
  reminderSubject,
  reviewRequestEmailHtml,
  reviewRequestSubject,
} from '@/lib/email-templates'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { buildIcs, googleCalendarUrl } from '@/lib/ics'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { makeWebhookSecretProvider } from '@/lib/integrations/webhook-secret'
import { isValidEmail } from '@/lib/validate-email'
import { getContactEmail } from '@/lib/validate-env'

export type TourEmailType = 'reminder' | 'review-request'

const SECRET_ENV: Record<TourEmailType, string> = {
  reminder: 'REMINDER_WEBHOOK_SECRET',
  'review-request': 'REVIEW_REQUEST_WEBHOOK_SECRET',
}

const RATE_LIMIT_KEY: Record<TourEmailType, string> = {
  reminder: 'reminder',
  'review-request': 'review-request',
}

export async function handleTourEmail(request: Request, type: TourEmailType): Promise<Response> {
  const reqId = getRequestId(request)
  const log = makeRequestLogger(type, reqId)

  // IP rate-limit — 2 req / 5 min. Manual fallback, not a public form.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `${RATE_LIMIT_KEY[type]}:${ip}`, limit: 2, windowMs: 5 * 60 * 1000 })
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

  // Fail-OPEN shared-secret gate (per-route env var).
  const secretGuard = makeWebhookSecretProvider(SECRET_ENV[type], 'fail-open')
  const authErr = secretGuard.verify(request)
  if (authErr) return attachRequestId(authErr, reqId)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }), reqId)
  }

  // Length caps — prevents oversized strings reaching escapeHtml / email send.
  const MAX_NAME = 200, MAX_EMAIL = 320, MAX_TOUR = 200, MAX_PK = 64, MAX_LOCALE = 10

  const locale = String((body.locale as string) || 'en').slice(0, MAX_LOCALE)
  const email = String(
    (body.customer_email as string) ||
    (body.email as string) ||
    (type === 'review-request' ? (body.guest_email as string) : '') ||
    ''
  ).slice(0, MAX_EMAIL)

  if (!isValidEmail(email)) {
    return attachRequestId(NextResponse.json({ error: 'Invalid email' }, { status: 400 }), reqId)
  }

  const rawName = String(
    (body.customer_name as string) ||
    (body.name as string) ||
    (type === 'review-request' ? (body.guest_name as string) : '') ||
    'there'
  ).slice(0, MAX_NAME)

  const rawTourName = String(
    (body.tour_name as string) || (body.item_name as string) ||
    (type === 'reminder' ? 'your visit' : 'your recent visit')
  ).slice(0, MAX_TOUR)

  const contactEmail = getContactEmail()

  // ── Reminder-specific: ICS attachment + calendar link ─────────────────────
  if (type === 'reminder') {
    const startAt = body.start_at ? new Date(body.start_at as string) : null
    const endAt = body.end_at ? new Date(body.end_at as string) : null
    const bookingPk = body.pk ? String(body.pk).slice(0, MAX_PK) : null

    const dateStrOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }
    const dateStr = startAt
      ? (() => {
          try { return startAt.toLocaleString(locale, dateStrOptions) }
          catch { return startAt.toLocaleString('en-GB', dateStrOptions) }
        })()
      : 'your scheduled time'

    let icsAttachment: { filename: string; content: string; contentType: string } | undefined
    let calendarUrl: string | undefined
    if (startAt && !isNaN(startAt.getTime())) {
      try {
        const uid = bookingPk
          ? `${bookingPk}@alpacasibiza.com`
          : `reminder-${Date.now()}@alpacasibiza.com`
        const icsInput = {
          uid,
          summary: 'Alpaca farm visit at Es Currals',
          description: `See you at Es Currals! Your visit: ${rawTourName} on ${dateStr}. Wear closed shoes, bring sun hat and water.`,
          startIso: startAt.toISOString(),
          endIso: endAt && !isNaN(endAt.getTime()) ? endAt.toISOString() : undefined,
          location: 'Es Currals, San Carlos, Santa Eulària des Riu, Ibiza',
          organizerName: 'Alpacas Ibiza',
          organizerEmail: contactEmail,
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
        replyTo: contactEmail,
        listUnsubscribeUrl: `mailto:${contactEmail}?subject=unsubscribe`,
        ...(icsAttachment ? { attachments: [icsAttachment] } : {}),
      })
      return attachRequestId(NextResponse.json({ success: true }), reqId)
    } catch (err) {
      log.error('sendEmail failed', { err: String(err) })
      return attachRequestId(NextResponse.json({ error: 'Send failed' }, { status: 500 }), reqId)
    }
  }

  // ── review-request ────────────────────────────────────────────────────────
  try {
    await sendEmail({
      to: email,
      subject: reviewRequestSubject(locale),
      html: reviewRequestEmailHtml({
        escapedName: escapeHtml(rawName),
        escapedTourName: escapeHtml(rawTourName),
      }),
      replyTo: contactEmail,
      listUnsubscribeUrl: `mailto:${contactEmail}?subject=unsubscribe`,
    })
    return attachRequestId(NextResponse.json({ success: true }), reqId)
  } catch (err) {
    log.error('sendEmail failed', { err: String(err) })
    return attachRequestId(NextResponse.json({ error: 'Send failed' }, { status: 500 }), reqId)
  }
}
