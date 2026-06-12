/**
 * /api/newsletter/unsubscribe
 *
 * One-click unsubscribe endpoint — CAN-SPAM § 5(a)(6) + EU PECR + RFC 8058.
 *
 * GET  — email-client link follow → verify token → unsubscribe → 303 to landing page.
 * POST — RFC 8058 one-click (List-Unsubscribe-Post) → verify token → unsubscribe → 200 JSON.
 *
 * Security:
 *   - Token must be scope='unsubscribe' (distinct from scope='confirm'; cross-use rejected)
 *   - HMAC-SHA256 verified with safeEqual before any action
 *   - Both GET and POST return 200/303 on invalid/expired tokens — never reveal subscription state
 *   - Rate-limited: 5 req / 5 min per IP + 3 req / 24 h per email
 *
 * Fail-quiet on SendGrid provider error — log only, user sees success. Unsubscribe intent
 * is recorded in the audit log regardless (OWNER_INPUT_NEEDED: wire to persistent store if needed).
 */
import { NextResponse } from 'next/server'
import { unsubscribe } from '@/lib/newsletter'
import { verifyUnsubscribeToken, isExpiredUnsubscribeToken } from '@/lib/newsletter-token'
import { rateLimit, rateLimitByEmail, getClientIp } from '@/lib/rate-limit'
import { SITE_BASE_URL } from '@/lib/config'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * The supported locale slugs — mirrors i18n.config.ts locales array.
 * Kept inline to avoid importing the full i18n config into this edge-safe route.
 */
const SUPPORTED_LOCALES = new Set(['en', 'de', 'es', 'fr', 'it', 'nl'])

/**
 * Build the unsubscribed landing-page URL using the locale carried in the
 * `?locale=` query param (added by /api/newsletter when the sign-up occurred).
 * Falls back to 'en' for unknown / missing values.
 */
function unsubscribedPageUrl(locale: string | null): string {
  const safe = locale && SUPPORTED_LOCALES.has(locale) ? locale : 'en'
  return `${SITE_BASE_URL}/${safe}/newsletter/unsubscribed`
}

// ── Shared handler logic ──────────────────────────────────────────────────────

async function handleUnsubscribe(
  request: Request,
  method: 'GET' | 'POST',
): Promise<Response> {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('newsletter/unsubscribe', reqId)

  // Rate-limit by IP
  const ip = getClientIp(request)
  const ipResult = rateLimit({ key: `unsub:${ip}`, limit: 5, windowMs: 5 * 60 * 1000 })

  // Extract locale + token from query string. Both GET and POST may use query params per RFC 8058.
  // `?locale=` is appended by /api/newsletter at sign-up time so the redirect lands in the
  // subscriber's language. Falls back to 'en' if absent or unrecognised.
  const url = new URL(request.url)
  const locale = url.searchParams.get('locale')
  const token = url.searchParams.get('token') ?? ''

  if (!ipResult.allowed) {
    log.warn('IP rate limit hit', { ip })
    // Return 200 for GET (no info leak) / 429 for POST (RFC 8058 caller handles it)
    if (method === 'POST') {
      return attachRequestId(
        NextResponse.json({ error: 'Too many requests' }, {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(ipResult.resetMs / 1000)) },
        }),
        reqId,
      )
    }
    // GET: silently redirect to unsubscribed page (no-op)
    return attachRequestId(NextResponse.redirect(unsubscribedPageUrl(locale), { status: 303 }), reqId)
  }

  // Verify HMAC + scope + expiry
  const payload = verifyUnsubscribeToken(token)

  if (!payload) {
    // Log whether the token was expired vs tampered — helps with ops diagnosis
    const expired = token.length > 0 && isExpiredUnsubscribeToken(token)
    log.warn('invalid unsubscribe token', { expired, method })
    // Always return 200/303 — never leak subscription state
    if (method === 'POST') {
      return attachRequestId(NextResponse.json({ ok: true, noop: true }), reqId)
    }
    return attachRequestId(NextResponse.redirect(unsubscribedPageUrl(locale), { status: 303 }), reqId)
  }

  // Rate-limit by email (hashed) to prevent abuse of valid tokens
  const emailResult = rateLimitByEmail({ email: payload.email, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
  if (!emailResult.allowed) {
    log.warn('email rate limit hit on unsubscribe', { email_first4: payload.email.slice(0, 4) + '…' })
    // Still treat as success — the unsubscribe intent was already processed on first call
    if (method === 'POST') return attachRequestId(NextResponse.json({ ok: true }), reqId)
    return attachRequestId(NextResponse.redirect(unsubscribedPageUrl(locale), { status: 303 }), reqId)
  }

  // Valid token — process unsubscribe (fail-quiet on provider error)
  const result = await unsubscribe(payload.email)
  if (!result.success) {
    log.warn('SendGrid unsubscribe failed', { message: result.message, email_first4: payload.email.slice(0, 4) + '…' })
    // Non-fatal — show success to user; operator reviews logs
  } else {
    log.info('unsubscribed', { email_first4: payload.email.slice(0, 4) + '…' })
  }

  if (method === 'POST') {
    return attachRequestId(NextResponse.json({ ok: true }), reqId)
  }

  // GET: redirect to locale-aware confirmation landing page
  return attachRequestId(NextResponse.redirect(unsubscribedPageUrl(locale), { status: 303 }), reqId)
}

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET — followed by email clients clicking the List-Unsubscribe link. */
export async function GET(request: Request): Promise<Response> {
  return handleUnsubscribe(request, 'GET')
}

/**
 * POST — RFC 8058 one-click unsubscribe.
 * Email clients send: Content-Type: application/x-www-form-urlencoded
 * Body: List-Unsubscribe=One-Click
 *
 * We accept any POST to the token URL (body is informational for RFC 8058 compliance).
 */
export async function POST(request: Request): Promise<Response> {
  return handleUnsubscribe(request, 'POST')
}
