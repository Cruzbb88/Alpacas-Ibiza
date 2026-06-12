/**
 * Newsletter double opt-in token — HMAC-signed, stateless.
 *
 * Payload: { email, scope, expiresAt, nonce } encoded as base64url JSON.
 * Signature: HMAC-SHA256 of the payload using NEWSLETTER_SIGNING_KEY
 *            (falls back to NEXTAUTH_SECRET if unset — Tier 1 guarantee).
 *
 * Token format: <base64url-payload>.<base64url-hmac>
 *
 * Two scopes share the same signing key but verify guards prevent cross-use:
 *   'confirm'     — double opt-in confirmation (7-day TTL)
 *   'unsubscribe' — one-click unsubscribe per CAN-SPAM / EU PECR (90-day TTL)
 *
 * No JWT — overkill for this use case (CLAUDE.md constraint).
 * Server-stateless — all state lives in the signed token.
 */

import { createHmac, randomBytes } from 'crypto'
import { safeEqual } from './secrets.ts'

/** Fallback: derive a signing key from NEXTAUTH_SECRET if NEWSLETTER_SIGNING_KEY is unset. */
function getSigningKey(): string {
  const key = process.env.NEWSLETTER_SIGNING_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    // Should never happen in prod — validateEnv warns at boot. Fail loudly at runtime.
    throw new Error('[newsletter-token] No signing key available (NEWSLETTER_SIGNING_KEY or NEXTAUTH_SECRET required)')
  }
  return key
}

function toBase64Url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64Url(s: string): Buffer | null {
  try {
    const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice((s.length % 4 || 4) - 2)
    return Buffer.from(padded, 'base64')
  } catch {
    return null
  }
}

export type NewsletterTokenScope = 'confirm' | 'unsubscribe'

export interface NewsletterTokenPayload {
  email: string
  scope: NewsletterTokenScope
  expiresAt: string  // ISO 8601
  nonce: string
}

// ── Internal signing helper ───────────────────────────────────────────────────

function signToken(payload: NewsletterTokenPayload): string {
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  return `${payloadB64}.${toBase64Url(sig)}`
}

// CPU-DoS guard: an oversized token forces a multi-megabyte HMAC computation.
// Backported from lib/mollie-manage-token.ts 2026-06-05. 2048 bytes is generous
// for our payloads (typically ~150 bytes) and well below memory-pressure territory.
const MAX_TOKEN_BYTES = 2048

function verifyToken(token: string, expectedScope: NewsletterTokenScope): NewsletterTokenPayload | null {
  if (!token || token.length > MAX_TOKEN_BYTES) return null
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 1) return null

    const payloadB64 = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)

    // Recompute expected signature
    const expected = toBase64Url(
      createHmac('sha256', getSigningKey()).update(payloadB64).digest()
    )

    // Timing-safe compare
    if (!safeEqual(sigB64, expected)) return null

    // Decode payload
    const rawBuf = fromBase64Url(payloadB64)
    if (!rawBuf) return null
    const payload: NewsletterTokenPayload = JSON.parse(rawBuf.toString('utf8'))

    // Scope check — prevents cross-use between confirm and unsubscribe tokens
    if (payload.scope !== expectedScope) return null

    // Check expiry
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    // Basic shape check
    if (!payload.email || typeof payload.email !== 'string') return null

    return payload
  } catch {
    return null
  }
}

function isExpiredToken(token: string): boolean {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 1) return false
    const payloadB64 = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)
    const expected = toBase64Url(
      createHmac('sha256', getSigningKey()).update(payloadB64).digest()
    )
    if (!safeEqual(sigB64, expected)) return false  // invalid sig — not expired, just bad
    const rawBuf = fromBase64Url(payloadB64)
    if (!rawBuf) return false
    const payload: NewsletterTokenPayload = JSON.parse(rawBuf.toString('utf8'))
    return Boolean(payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now())
  } catch {
    return false
  }
}

// ── Confirm token (scope: 'confirm', 7-day TTL) ───────────────────────────────

/**
 * Sign a newsletter confirmation token.
 * @param email  subscriber email
 * @param ttlMs  time-to-live in milliseconds (default 7 days)
 */
export function signNewsletterToken(email: string, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  return signToken({
    email,
    scope: 'confirm',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

/**
 * Verify a newsletter confirmation token.
 * Returns the payload on success, or null on any failure (invalid / expired / tampered / wrong scope).
 * Never throws — callers receive null and respond with 400/410.
 */
export function verifyNewsletterToken(token: string): NewsletterTokenPayload | null {
  return verifyToken(token, 'confirm')
}

/**
 * Check whether a token is structurally valid but expired.
 * Used to return 410 Gone instead of 400 Bad Request.
 */
export function isExpiredNewsletterToken(token: string): boolean {
  return isExpiredToken(token)
}

// ── Unsubscribe token (scope: 'unsubscribe', 90-day TTL) ─────────────────────

/**
 * Sign a one-click unsubscribe token per CAN-SPAM / EU PECR.
 * Longer TTL (90 days) so the link in an older email still works.
 * Scope is 'unsubscribe' — a confirm token cannot be replayed here.
 *
 * @param email  subscriber email
 * @param ttlMs  time-to-live in milliseconds (default 90 days)
 */
export function signUnsubscribeToken(email: string, ttlMs = 90 * 24 * 60 * 60 * 1000): string {
  return signToken({
    email,
    scope: 'unsubscribe',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

/**
 * Verify a one-click unsubscribe token.
 * Returns the payload on success, or null on any failure.
 * A confirm-scope token presented here returns null (scope mismatch).
 * Never throws.
 */
export function verifyUnsubscribeToken(token: string): NewsletterTokenPayload | null {
  return verifyToken(token, 'unsubscribe')
}

/**
 * Check whether an unsubscribe token is structurally valid but expired.
 * Used to render the 'link expired' state on the unsubscribe page.
 */
export function isExpiredUnsubscribeToken(token: string): boolean {
  return isExpiredToken(token)
}
