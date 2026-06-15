/**
 * Booking-manage access token — HMAC-signed, stateless, scope='booking-manage'.
 *
 * Gates the guest manage-link (/[locale]/tours/manage?id=&token=). Without a
 * valid token the page reveals nothing — closes the "anyone who knows a bk_ id
 * can read guest PII / cancel a booking" IDOR class. A guest with no account can
 * view + (later) cancel/reschedule their own booking via the link in their
 * confirmation/reminder email — competitor-standard (Xola/FareHarbor "Manage
 * this Purchase").
 *
 * Mirrors lib/donor-receipt-token.ts EXACTLY (same crypto, no reinvention):
 *  - signing-key fallback: NEWSLETTER_SIGNING_KEY → NEXTAUTH_SECRET
 *  - base64url + HMAC-SHA256, constant-time compare (safeEqual)
 *  - scope-guard (a donor-receipt / mollie-manage token won't verify here)
 *  - 2048-byte CPU-DoS guard before HMAC compute
 *
 * Payload: { bookingId, scope: 'booking-manage', expiresAt, nonce }.
 * Default TTL 90 days — covers booking → tour date → a post-tour window.
 */
import { createHmac, randomBytes } from 'crypto'
import { safeEqual } from './secrets.ts'

function getSigningKey(): string {
  const key = process.env.NEWSLETTER_SIGNING_KEY || process.env.NEXTAUTH_SECRET
  if (!key) {
    throw new Error('[booking-manage-token] No signing key (NEWSLETTER_SIGNING_KEY or NEXTAUTH_SECRET required)')
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

export type BookingManageTokenScope = 'booking-manage'

export interface BookingManageTokenPayload {
  bookingId: string
  scope: BookingManageTokenScope
  expiresAt: string
  nonce: string
}

function signToken(payload: BookingManageTokenPayload): string {
  const payloadB64 = toBase64Url(JSON.stringify(payload))
  const sig = createHmac('sha256', getSigningKey()).update(payloadB64).digest()
  return `${payloadB64}.${toBase64Url(sig)}`
}

/** Issue a manage-link token for a booking. Default TTL 90 days. */
export function signBookingManageToken(
  bookingId: string,
  ttlMs = 90 * 24 * 60 * 60 * 1000,
): string {
  return signToken({
    bookingId,
    scope: 'booking-manage',
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    nonce: randomBytes(12).toString('hex'),
  })
}

const MAX_TOKEN_BYTES = 2048

export function verifyBookingManageToken(
  token: string,
  expectedBookingId: string,
): BookingManageTokenPayload | null {
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
    const payload: BookingManageTokenPayload = JSON.parse(rawBuf.toString('utf8'))

    if (payload.scope !== 'booking-manage') return null
    if (!payload.bookingId || payload.bookingId !== expectedBookingId) return null
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() < Date.now()) return null

    return payload
  } catch {
    return null
  }
}
