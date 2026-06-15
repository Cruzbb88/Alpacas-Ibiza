import { NextResponse } from 'next/server'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { getBooking } from '@/lib/booking/store'
import { isHoldExpired } from '@/lib/booking/store-logic'
import { createBookingCheckout } from '@/lib/booking/booking-payment'

/**
 * POST /api/booking/checkout   body: { bookingId, locale? }
 *
 * The "pay" step of the in-house booking money-path. Takes a booking held by
 * /api/booking/reserve and creates a one-off checkout via the configured
 * PAYMENT_VENDOR (Mollie default / Stripe opt-in — same swap-by-env contract as
 * Adopt; see lib/booking/booking-payment.ts). On payment, the matching webhook
 * (stripe / mollie) confirms the seat or refunds (cb-006 F2/F5).
 *
 * Money-safety gates BEFORE creating any charge:
 *   - engine off / no DB        → 503 (never charge with no way to confirm)
 *   - booking unknown           → 404
 *   - booking not pending       → 409 already_resolved (don't double-charge)
 *   - hold expired              → 409 expired (seat may have been re-sold)
 *
 * Returns { url } (JSON) — the client redirects to the processor's hosted page.
 */
export const dynamic = 'force-dynamic'

const LOCALE_ALLOWLIST = ['en', 'nl', 'es', 'de', 'it', 'fr']

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('booking-checkout', reqId)

  // Engine gate — fail-closed (matches reserve + getOpenSlots).
  if (process.env.BOOKING_ENGINE !== 'inhouse') {
    return attachRequestId(
      NextResponse.json({ error: 'Booking engine not active' }, { status: 503 }),
      reqId,
    )
  }

  // IP rate limit — same shape as skein/junior checkout.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `booking-checkout:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return attachRequestId(
      NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
      ),
      reqId,
    )
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Bad request' }, { status: 400 }), reqId)
  }
  const b = body as Record<string, unknown>
  const bookingId = typeof b.bookingId === 'string' ? b.bookingId.trim() : ''
  if (!bookingId) {
    return attachRequestId(NextResponse.json({ error: 'Bad request' }, { status: 400 }), reqId)
  }
  const rawLocale = typeof b.locale === 'string' ? b.locale : ''
  const locale = LOCALE_ALLOWLIST.includes(rawLocale) ? rawLocale : 'en'

  // ── Resolve + validate the held booking ──────────────────────────────────
  const booking = await getBooking(bookingId)
  if (!booking) {
    return attachRequestId(NextResponse.json({ error: 'Booking not found' }, { status: 404 }), reqId)
  }
  if (booking.status !== 'pending') {
    // Already confirmed or cancelled — never create a second charge for it.
    return attachRequestId(
      NextResponse.json({ error: 'Booking already resolved', code: 'ALREADY_RESOLVED' }, { status: 409 }),
      reqId,
    )
  }
  if (isHoldExpired(booking.holdExpiresAt, new Date())) {
    // Hold lapsed; the seat may have been re-sold. Don't take money for it.
    return attachRequestId(
      NextResponse.json({ error: 'Reservation expired', code: 'HOLD_EXPIRED' }, { status: 409 }),
      reqId,
    )
  }

  // ── Create checkout via the configured vendor ─────────────────────────────
  const result = await createBookingCheckout({ booking, locale })
  if (!result.ok) {
    // Generic public error — vendor config detail stays in server logs only.
    log.warn('Booking checkout creation failed', { bookingId, code: result.code })
    return attachRequestId(
      NextResponse.json({ error: 'Could not start checkout', code: result.code }, { status: result.status }),
      reqId,
    )
  }

  log.info('Booking checkout created', { bookingId })
  return attachRequestId(NextResponse.json({ url: result.url }, { status: 200 }), reqId)
}
