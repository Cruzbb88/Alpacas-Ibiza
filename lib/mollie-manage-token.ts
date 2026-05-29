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

/**
 * Three scopes carry distinct capabilities — scope guard prevents cross-use:
 *   'cancel'         → POST /api/mollie-manage/cancel  (terminate the sub)
 *   'status'         → GET  /api/mollie-manage/status  (read-only summary)
 *   'update-payment' → POST /api/mollie-manage/update-payment (start a re-mandate)
 *
 * The same signing key + nonce scheme is used for all three; the `scope` field
 * in the payload is mandatory and verifyMollieToken takes the expected scope.
 */
export type MollieManageTokenScope = 'cancel' | 'status' | 'update-payment'

export interface MollieManageTokenPayload {
  customerId: string
  subscriptionId: string
  scope: MollieManageTokenScope
  expiresAt: string
  nonce: string
}

function signToken(payload: MollieManageTokenPayload): string {
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  return `${payloadB64}.${toBase64Url(sig)}`
}

export function signMollieCancelToken(
  customerId: string,
  subscriptionId: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string {
  return signToken({
    customerId,
    subscriptionId,
    scope: 'cancel',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

/** Read-only status link. 7-day TTL — donor can refresh whenever. */
export function signMollieStatusToken(
  customerId: string,
  subscriptionId: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string {
  return signToken({
    customerId,
    subscriptionId,
    scope: 'status',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

/** Update-payment link (re-mandate). 7-day TTL — matches dunning window. */
export function signMollieUpdatePaymentToken(
  customerId: string,
  subscriptionId: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
): string {
  return signToken({
    customerId,
    subscriptionId,
    scope: 'update-payment',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

// CPU-DoS guard: an oversized token forces a multi-megabyte HMAC computation
// (the HMAC scales with input length). 2048 bytes is generous for our payloads
// (typically ~250 bytes) and well below memory-pressure territory.
const MAX_TOKEN_BYTES = 2048

function verifyTokenWithScope(
  token: string,
  expectedScope: MollieManageTokenScope,
): MollieManageTokenPayload | null {
  if (!token || token.length > MAX_TOKEN_BYTES) return null
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

    if (payload.scope !== expectedScope) return null
    if (!payload.customerId || !payload.subscriptionId) return null
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

export function verifyMollieCancelToken(token: string): MollieManageTokenPayload | null {
  return verifyTokenWithScope(token, 'cancel')
}
export function verifyMollieStatusToken(token: string): MollieManageTokenPayload | null {
  return verifyTokenWithScope(token, 'status')
}
export function verifyMollieUpdatePaymentToken(token: string): MollieManageTokenPayload | null {
  return verifyTokenWithScope(token, 'update-payment')
}
