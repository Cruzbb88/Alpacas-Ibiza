/**
 * Per-email-type preference token — HMAC-signed, stateless.
 *
 * Allows donors to unsubscribe from a specific email TYPE without losing all
 * communications. Mirrors the newsletter-token.ts pattern but scoped to
 * adopt email types.
 *
 * Token format: <base64url-payload>.<base64url-hmac>
 * Signing key:  NEWSLETTER_SIGNING_KEY → NEXTAUTH_SECRET fallback (Tier 1 guarantee).
 *
 * URL pattern: /api/email-preferences?token=<...>&action=unsubscribe&type=birthday
 *
 * Supported types:
 *   'birthday'   — annual alpaca birthday card (daily cron)
 *   'quarterly'  — quarterly herd update (quarterly cron)
 *   'renewal'    — renewal reminder (adopt-renewal-reminders cron)
 *
 * Token TTL: 365 days (long-lived — these land in archived emails that donors
 * open months after receipt).
 */

import { createHmac, randomBytes } from 'crypto'
import { safeEqual } from './secrets.ts'

export type EmailPreferenceType = 'birthday' | 'quarterly' | 'renewal'

export interface EmailPreferenceTokenPayload {
  email: string
  type: EmailPreferenceType
  /** ISO 8601 expiry timestamp */
  expiresAt: string
  nonce: string
}

/** Derive signing key — mirrors newsletter-token.ts getSigningKey(). */
function getSigningKey(): string {
  const key = process.env.NEWSLETTER_SIGNING_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error('[email-preferences-token] No signing key available (NEWSLETTER_SIGNING_KEY or NEXTAUTH_SECRET required)')
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

/**
 * Sign a per-email-type preference token.
 * @param email  donor email address
 * @param type   email type to gate ('birthday' | 'quarterly' | 'renewal')
 * @param ttlMs  time-to-live in milliseconds (default 365 days)
 */
export function signEmailPreferenceToken(
  email: string,
  type: EmailPreferenceType,
  ttlMs = 365 * 24 * 60 * 60 * 1000,
): string {
  const payload: EmailPreferenceTokenPayload = {
    email,
    type,
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  return `${payloadB64}.${toBase64Url(sig)}`
}

/**
 * Verify a per-email-type preference token.
 * Returns the payload on success, or null on any failure (invalid / expired / tampered).
 * Never throws — callers receive null and respond with 400.
 */
export function verifyEmailPreferenceToken(token: string): EmailPreferenceTokenPayload | null {
  // 2048-byte CPU-DoS guard — reject oversized tokens before HMAC computation.
  if (token.length > 2048) return null

  try {
    const dot = token.lastIndexOf('.')
    if (dot < 1) return null

    const payloadB64 = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)

    const expected = toBase64Url(
      createHmac('sha256', getSigningKey()).update(payloadB64).digest()
    )
    if (!safeEqual(sigB64, expected)) return null

    const rawBuf = fromBase64Url(payloadB64)
    if (!rawBuf) return null
    const payload: EmailPreferenceTokenPayload = JSON.parse(rawBuf.toString('utf8'))

    // Type guard
    const VALID_TYPES: EmailPreferenceType[] = ['birthday', 'quarterly', 'renewal']
    if (!VALID_TYPES.includes(payload.type)) return null

    // Expiry check
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    // Shape check
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
export function isExpiredEmailPreferenceToken(token: string): boolean {
  if (token.length > 2048) return false
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 1) return false
    const payloadB64 = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)
    const expected = toBase64Url(
      createHmac('sha256', getSigningKey()).update(payloadB64).digest()
    )
    if (!safeEqual(sigB64, expected)) return false
    const rawBuf = fromBase64Url(payloadB64)
    if (!rawBuf) return false
    const payload: EmailPreferenceTokenPayload = JSON.parse(rawBuf.toString('utf8'))
    return Boolean(payload.expiresAt && new Date(payload.expiresAt).getTime() < Date.now())
  } catch {
    return false
  }
}
