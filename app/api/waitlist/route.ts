/**
 * POST /api/waitlist — tour waitlist signup.
 *
 * Security: honeypot (business_name) + Turnstile/reCAPTCHA + per-IP rate-limit
 *           (2 req / 5 min) + per-email rate-limit (3 req / 24 h, SHA-256 hashed).
 * Anti-enumeration: always returns 200 on invalid input (logs warn only).
 * Owner gets: "[Waitlist] {tourSlug} — {preferredDate}" email to CONTACT_EMAIL.
 * Subscriber gets: "we'll email if a spot opens" confirmation.
 * Does NOT add new email templates — uses inline HTML+text per contact route pattern.
 */

import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { escapeHtml, sanitizeHeader } from '@/lib/html'
import { isValidEmail } from '@/lib/validate-email'
import { getContactEmail } from '@/lib/validate-env'
import { checkPublicFormGuard } from '@/lib/public-form-guard'

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('waitlist', reqId)

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const { email, preferredDate, tourSlug, locale } = body

  // ── Input validation — log warn, return 200 (anti-enumeration) ───────────
  if (!isValidEmail(email)) {
    log.warn('Invalid or missing email', { route: '/api/waitlist' })
    return attachRequestId(NextResponse.json({ ok: true }), reqId)
  }

  // ── Guard: honeypot → IP rate-limit → per-email rate-limit → Turnstile ───
  // Waitlist returns 200 on ALL guard failures (anti-enumeration).
  const guard = await checkPublicFormGuard(request, body, {
    routeName: 'waitlist',
    honeypotField: 'business_name',
    rateLimitPerIp: { limit: 2, windowMs: 5 * 60_000 },
    rateLimitPerEmail: {
      email: String(email),
      limit: 3,
      windowMs: 24 * 60 * 60_000,
    },
  })

  if (!guard.allowed) {
    if (guard.reason === 'honeypot') {
      log.warn('Bot submission blocked (honeypot)', { route: '/api/waitlist' })
    } else if (guard.reason === 'rate-limit-ip') {
      log.warn('Rate limit hit (IP)', { route: '/api/waitlist' })
    } else if (guard.reason === 'rate-limit-email') {
      log.warn('Rate limit hit (email)', { route: '/api/waitlist' })
    } else {
      log.warn('Captcha failed', { reason: guard.captchaReason, route: '/api/waitlist' })
    }
    // Anti-enumeration: always 200, same shape as success
    return attachRequestId(NextResponse.json({ ok: true }), reqId)
  }

  // ── Sanitise fields ───────────────────────────────────────────────────────
  const safeEmail      = escapeHtml(String(email))
  const safeDate       = preferredDate ? escapeHtml(String(preferredDate)).slice(0, 30) : 'unspecified'
  const safeSlug       = tourSlug      ? escapeHtml(sanitizeHeader(String(tourSlug))).slice(0, 80) : 'general'
  const safeLocale     = locale        ? escapeHtml(String(locale)).slice(0, 5) : 'en'
  const subjectSlug    = sanitizeHeader(String(tourSlug ?? 'general')).slice(0, 60)
  const subjectDate    = sanitizeHeader(String(preferredDate ?? 'unspecified')).slice(0, 30)

  // ── Send owner notification ───────────────────────────────────────────────
  try {
    await sendEmail({
      to: getContactEmail(),
      subject: `[Waitlist] ${subjectSlug} — ${subjectDate}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">New Waitlist Signup</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;width:140px">Email:</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold">Tour:</td><td style="padding:8px">${safeSlug}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Preferred date:</td><td style="padding:8px">${safeDate}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold">Locale:</td><td style="padding:8px">${safeLocale}</td></tr>
          </table>
          <p style="color:#888;font-size:12px;margin-top:24px">Sent via alpacasibiza.com waitlist form</p>
        </div>
      `,
    })
  } catch (err) {
    log.warn('Owner notification failed (non-fatal)', { err: String(err) })
  }

  // ── Send subscriber confirmation ──────────────────────────────────────────
  try {
    await sendEmail({
      to: String(email),
      subject: `You're on the waitlist — ${safeSlug}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">You&#39;re on the waitlist!</h2>
          <p>Thanks for your interest in <strong>${safeSlug}</strong> on <strong>${safeDate}</strong>.</p>
          <p>We&#39;ll email you at <strong>${safeEmail}</strong> if a spot opens up.</p>
          <p>In the meantime, <a href="https://alpacasibiza.com">visit our site</a> to explore other available dates.</p>
          <p style="color:#888;font-size:12px;margin-top:24px">Es Currals Alpacas Ibiza &middot; San Carlos, Ibiza</p>
        </div>
      `,
    })
  } catch (err) {
    log.warn('Subscriber confirmation failed (non-fatal)', { err: String(err) })
  }

  return attachRequestId(NextResponse.json({ ok: true }), reqId)
}
