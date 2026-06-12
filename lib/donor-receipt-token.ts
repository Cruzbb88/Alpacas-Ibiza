/**
 * Donor-receipt access token — HMAC-signed, stateless, scope='receipt'.
 *
 * Gates GET /api/donor-receipt/[sessionId]. Without a valid token the route
 * 404s — closes the "anyone who knows the cs_/tr_/sub_ID can fetch donor PII"
 * IDOR class flagged by /security-review 2026-06-10.
 *
 * Mirrors lib/mollie-manage-token.ts in shape:
 *  - Same signing-key fallback: NEWSLETTER_SIGNING_KEY → NEXTAUTH_SECRET
 *  - Same base64url+HMAC-SHA256 format
 *  - Same scope-guard pattern (prevents cross-use with mollie-manage tokens)
 *  - Same 2048-byte CPU-DoS guard before HMAC compute
 *
 * Token payload: { sessionId, scope: 'receipt', expiresAt, nonce }.
 *
 * Default TTL: 60 days. Receipts are tax-relevant; donors download them well
 * after the original checkout. SOX/tax retention windows generally exceed this
 * so the link still beats "no receipt at all", and short-enough that a leaked
 * URL expires before reuse becomes a problem.
 *
 * Server-stateless — no DB. Whoever holds a signed link gets the receipt; the
 * issuer (e.g. /api/checkout-session/[id], donor portal, welcome-email template)
 * authorises the issuance via Stripe/Mollie session-retrieve + paid-status check.
 */

import { createHmac, randomBytes } from 'crypto'
import { safeEqual } from './secrets.ts'

function getSigningKey(): string {
  const key = process.env.NEWSLETTER_SIGNING_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error('[donor-receipt-token] No signing key available (NEWSLETTER_SIGNING_KEY or NEXTAUTH_SECRET required)')
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

export type DonorReceiptTokenScope = 'receipt'

export interface DonorReceiptTokenPayload {
  sessionId: string
  scope: DonorReceiptTokenScope
  expiresAt: string
  nonce: string
}

function signToken(payload: DonorReceiptTokenPayload): string {
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  return `${payloadB64}.${toBase64Url(sig)}`
}

/**
 * Issue a receipt-access token. Default TTL: 60 days.
 *
 * sessionId is the Stripe checkout session ID (`cs_*`) or Mollie payment/
 * subscription ID (`tr_*` / `sub_*`). The route validates the format
 * separately; this helper does not enforce it so callers can pre-validate.
 */
export function signDonorReceiptToken(
  sessionId: string,
  ttlMs = 60 * 24 * 60 * 60 * 1000,
): string {
  return signToken({
    sessionId,
    scope: 'receipt',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

const MAX_TOKEN_BYTES = 2048

export function verifyDonorReceiptToken(
  token: string,
  expectedSessionId: string,
): DonorReceiptTokenPayload | null {
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
    const payload: DonorReceiptTokenPayload = JSON.parse(rawBuf.toString('utf8'))

    if (payload.scope !== 'receipt') return null
    if (!payload.sessionId) return null
    if (payload.sessionId !== expectedSessionId) return null
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    return payload
  } catch {
    return null
  }
}
