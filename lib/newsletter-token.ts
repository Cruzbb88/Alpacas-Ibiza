/**
 * Newsletter double opt-in token — HMAC-signed, stateless.
 *
 * Payload: { email, expiresAt, nonce } encoded as base64url JSON.
 * Signature: HMAC-SHA256 of the payload using NEWSLETTER_SIGNING_KEY
 *            (falls back to NEXTAUTH_SECRET if unset — Tier 1 guarantee).
 *
 * Token format: <base64url-payload>.<base64url-hmac>
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

export interface NewsletterTokenPayload {
  email: string
  expiresAt: string  // ISO 8601
  nonce: string
}

/**
 * Sign a newsletter confirmation token.
 * @param email  subscriber email
 * @param ttlMs  time-to-live in milliseconds (default 7 days)
 */
export function signNewsletterToken(email: string, ttlMs = 7 * 24 * 60 * 60 * 1000): string {
  const payload: NewsletterTokenPayload = {
    email,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  const sigB64 = toBase64Url(sig)
  return `${payloadB64}.${sigB64}`
}

/**
 * Verify a newsletter confirmation token.
 * Returns the payload on success, or null on any failure (invalid / expired / tampered).
 * Never throws — callers receive null and respond with 400/410.
 */
export function verifyNewsletterToken(token: string): NewsletterTokenPayload | null {
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

    // Check expiry
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    // Basic shape check
    if (!payload.email || typeof payload.email !== 'string') return null

    return payload
  } catch {
    return null
  }
}

/**
 * Check whether a token is structurally valid but expired.
 * Used to return 410 Gone instead of 400 Bad Request.
 */
export function isExpiredNewsletterToken(token: string): boolean {
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
