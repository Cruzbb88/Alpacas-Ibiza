/**
 * POST /api/newsletter
 *
 * Double opt-in step 1: validate input → send confirmation email with HMAC-signed token.
 * Does NOT subscribe the address yet — subscription happens in /api/newsletter/confirm.
 *
 * Failsafes:
 *   - Honeypot field blocks silent bot submissions (returns 200)
 *   - IP rate-limit: 5 req / 5 min
 *   - Per-email rate-limit: 3 attempts / 24 h (returns 200 — silent block)
 *   - Turnstile CAPTCHA verification
 *   - Confirmation email failure is non-fatal (logs warn, still returns success)
 *   - Confirm URL uses SITE_BASE_URL — never Origin header (open-redirect prevention)
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { verifyTurnstile } from '@/lib/turnstile'
import { detectHoneypot } from '@/lib/honeypot'
import { rateLimit, rateLimitByEmail } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/rate-limit'
import { isValidEmail } from '@/lib/validate-email'
import { escapeHtml, sanitizeHeader } from '@/lib/html'
import { signNewsletterToken, signUnsubscribeToken } from '@/lib/newsletter-token'
import { buildNewsletterConfirmEmail } from '@/lib/email-templates'
import { SITE_BASE_URL } from '@/lib/config'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { extractLocaleFromReferer } from '@/lib/route-helpers'

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('newsletter', reqId)
  try {
    const body = await request.json()
    const { email, 'cf-turnstile-response': captchaToken } = body

    if (detectHoneypot(body, 'business_name')) {
      log.warn('Bot submission blocked', { route: '/api/newsletter' })
      return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
    }

    if (!email) {
      return attachRequestId(NextResponse.json({ error: 'Email address is required' }, { status: 400 }), reqId)
    }

    // Length cap — RFC 5321 email max 320 chars. A longer value is never valid;
    // reject before any regex or hashing work.
    if (String(email).length > 320) {
      return attachRequestId(NextResponse.json({ error: 'Input too long' }, { status: 400 }), reqId)
    }

    // IP rate-limit — 5 req / 5 min (blocks burst from a single IP)
    const ip = getClientIp(request)
    const ipResult = rateLimit({ key: ip, limit: 5, windowMs: 5 * 60 * 1000 })
    if (!ipResult.allowed) {
      return attachRequestId(
        NextResponse.json({ error: 'Too many requests' }, {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(ipResult.resetMs / 1000)) },
        }),
        reqId
      )
    }

    // Per-email rate-limit — 3 attempts / 24 h (blocks IP-rotating bots)
    // Returns 200 (silent block) so bots can't distinguish success from reject.
    if (isValidEmail(email)) {
      const emailResult = rateLimitByEmail({ email })
      if (!emailResult.allowed) {
        log.warn('email rate limit hit', {
          email_first4: email.slice(0, 4) + '…',
          retryAfterSec: Math.ceil(emailResult.resetMs / 1000),
        })
        return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
      }
    }

    const captcha = await verifyTurnstile(captchaToken, ip)
    if (!captcha.ok) {
      return attachRequestId(
        NextResponse.json(
          { error: 'Captcha verification failed', reason: captcha.reason },
          { status: 400 }
        ),
        reqId
      )
    }

    // Build double opt-in confirmation link (SITE_BASE_URL — never Origin)
    const normalizedEmail = email.toLowerCase().trim()
    const token = signNewsletterToken(normalizedEmail)
    const confirmUrl = `${SITE_BASE_URL}/api/newsletter/confirm?token=${encodeURIComponent(token)}`

    // Build per-recipient unsubscribe URL (CAN-SPAM / EU PECR — included in email footer).
    // Locale is extracted from the Referer header so the unsubscribe redirect lands on
    // the subscriber's language version (e.g. /de/newsletter/unsubscribed for a German
    // subscriber). Falls back to 'en' when the Referer is absent or unparseable.
    const subscriberLocale = extractLocaleFromReferer(request.headers.get('referer'))
    const unsubToken = signUnsubscribeToken(normalizedEmail)
    const unsubscribeUrl = `${SITE_BASE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubToken)}&locale=${encodeURIComponent(subscriberLocale)}`

    // Send confirmation email to the subscriber
    try {
      const { subject, html } = buildNewsletterConfirmEmail(confirmUrl, unsubscribeUrl)
      await sendEmail({ to: email, subject, html, listUnsubscribeUrl: unsubscribeUrl })
    } catch (mailErr) {
      log.warn('confirmation email send failed', { err: String(mailErr) })
      // Non-fatal — return success so we don't leak whether the address is in our list
    }

    // Notify owner of new sign-up (informational — not yet subscribed)
    try {
      await sendEmail({
        subject: `[Newsletter] Sign-up pending confirmation: ${sanitizeHeader(email)}`,
        html: `<p>New newsletter sign-up (awaiting double opt-in confirmation): <strong>${escapeHtml(email)}</strong></p>`,
      })
    } catch (ownerErr) {
      log.warn('owner notification failed', { err: String(ownerErr) })
    }

    return attachRequestId(NextResponse.json({ success: true }), reqId)
  } catch (err) {
    log.error('handler error', { err: String(err) })
    return attachRequestId(NextResponse.json({ error: 'Internal server error' }, { status: 500 }), reqId)
  }
}
