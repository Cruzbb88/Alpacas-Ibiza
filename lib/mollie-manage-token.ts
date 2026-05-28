/**
 * Mollie subscription-management token — HMAC-signed, stateless.
 *
 * Used by /api/mollie-manage (request portal email) → /api/mollie-manage/cancel
 * (token-gated subscription cancel). Mirrors lib/newsletter-token.ts in
 * design — same signing-key fallback, same base64url+HMAC-SHA256 format —
 * but carries Mollie customer + subscription IDs instead of an email.
 *
 * Payload: { customerId, subscriptionId, scope: 'cancel', expiresAt, nonce }.
 * Default TTL: 7 days — long enough that the donor can act on the email at
 * their leisure, short enough that a leaked link expires quickly.
 *
 * Server-stateless — no DB. The link in the donor's inbox IS the bearer.
 * That's deliberate: donor can only cancel a sub whose IDs the server
 * already knows + emails to them, so the link is a single-use capability
 * scoped to that exact subscription.
 */

import { createHmac, randomBytes } from 'crypto'
import { safeEqual } from './secrets.ts'

function getSigningKey(): string {
  const key = process.env.NEWSLETTER_SIGNING_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error('[mollie-manage-token] No signing key available (NEWSLETTER_SIGNING_KEY or NEXTAUTH_SECRET required)')
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

export type MollieManageTokenScope = 'cancel'

export interface MollieManageTokenPayload {
  customerId: string
  subscriptionId: string
  scope: MollieManageTokenScope
  expiresAt: string
  nonce: string
}

export function signMollieCancelToken(
  customerId: string,
  subscriptionId: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string {
  const payload: MollieManageTokenPayload = {
    customerId,
    subscriptionId,
    scope: 'cancel',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  }
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  return `${payloadB64}.${toBase64Url(sig)}`
}

/**
 * Verify a cancel token. Returns the payload on success, or null on any
 * failure (invalid / expired / tampered / wrong scope). Never throws.
 */
export function verifyMollieCancelToken(token: string): MollieManageTokenPayload | null {
  try {
    const dot = token.lastIndexOf('.')
    if (dot < 1) return null
    const payloadB64 = token.slice(0, dot)
    const sigB64 = token.slice(dot + 1)
    const expected = toBase64Url(createHmac('sha256', getSigningKey()).update(payloadB64).digest())
    if (!safeEqual(sigB64, expected)) return null

    const rawBuf = fromBase64Url(payloadB64)
    if (!rawBuf) return null
    const payload: MollieManageTokenPayload = JSON.parse(rawBuf.toString('utf8'))

    if (payload.scope !== 'cancel') return null
    if (!payload.customerId || !payload.subscriptionId) return null
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    return payload
  } catch {
    return null
  }
}
