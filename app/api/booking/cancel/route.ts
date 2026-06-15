import { NextResponse } from 'next/server'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyBookingManageToken } from '@/lib/booking-manage-token'
import { getBooking, getSlot, cancelBooking, claimRefund } from '@/lib/booking/store'
import { refundBookingPayment } from '@/lib/booking/booking-payment'
import { buildBookingCancellationEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/mailer'
import { notifyOwnerAlert } from '@/lib/owner-notify'
import { getContactEmail } from '@/lib/validate-env'

/**
 * POST /api/booking/cancel   body: { id, token }
 *
 * Self-service guest cancellation (spec-011 §J), gated by the same HMAC manage
 * token as /tours/manage — no account. Policy: full refund if the tour is ≥24h
 * away (matches the "free cancellation up to 24h before" promise in our emails);
 * inside 24h → cancelled, no auto-refund.
 *
 * Money-safety order: free the seat first (cancelBooking, idempotent + restore-
 * once), THEN refund. A failed refund is owner-alerted (manual), never silently
 * swallowed. Cancellation email confirms the outcome to the guest.
 *
 * Fail-closed: invalid/expired token or unknown booking → generic 404 (no oracle).
 */
export const dynamic = 'force-dynamic'

const titleCase = (slug: string) =>
  slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('booking-cancel', reqId)

  const ip = getClientIp(request)
  const rl = rateLimit({ key: `booking-cancel:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return attachRequestId(
      NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }),
      reqId,
    )
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Bad request' }, { status: 400 }), reqId)
  }
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const token = typeof body.token === 'string' ? body.token : ''

  // Token gate — generic 404 on any failure so we never confirm a booking exists.
  if (!id || !token || !verifyBookingManageToken(token, id)) {
    return attachRequestId(NextResponse.json({ error: 'Not found' }, { status: 404 }), reqId)
  }
  // Per-booking throttle (the token is the auth; IP alone isn't enough) — a guest
  // never cancels the same booking more than once.
  const rlBooking = rateLimit({ key: `booking-cancel:id:${id}`, limit: 3, windowMs: 10 * 60 * 1000 })
  if (!rlBooking.allowed) {
    return attachRequestId(NextResponse.json({ error: 'Too many requests' }, { status: 429 }), reqId)
  }
  const booking = await getBooking(id)
  if (!booking) {
    return attachRequestId(NextResponse.json({ error: 'Not found' }, { status: 404 }), reqId)
  }
  if (booking.status === 'cancelled') {
    return attachRequestId(NextResponse.json({ ok: true, status: 'cancelled', refunded: false }), reqId)
  }

  const now = new Date()
  const slot = booking.slotId ? await getSlot(booking.slotId) : null
  const hoursUntil = slot ? (slot.startsAt.getTime() - now.getTime()) / 3_600_000 : -1
  const wasPaid = booking.status === 'confirmed' && !!booking.paymentRef
  const refundEligible = wasPaid && hoursUntil >= 24

  // 1) Free the seat (idempotent, restores capacity exactly once).
  await cancelBooking(id, now)

  // 2) Refund if policy allows — claim the refund right EXACTLY once so a
  //    double-click / concurrent request / late webhook can't double-refund.
  let refunded = false
  if (refundEligible && booking.paymentRef) {
    if (await claimRefund(id, now)) {
      refunded = await refundBookingPayment(booking.paymentRef)
      if (!refunded) {
        log.error('[booking-cancel] refund FAILED — manual refund needed', { bookingId: id, paymentRef: booking.paymentRef })
        void notifyOwnerAlert('Booking cancel refund FAILED — manual action needed', [
          `Booking: ${id}`,
          `Payment: ${booking.paymentRef}`,
          'Guest cancelled ≥24h out (refund due) but the automatic refund failed. Refund manually.',
        ])
      }
    } else {
      // Another path already refunded this booking — don't issue a second one.
      refunded = true
      log.info('[booking-cancel] refund already claimed elsewhere — skipping', { bookingId: id })
    }
  }

  // 3) Confirm to the guest (fail-quiet — cancellation already happened).
  if (booking.guestEmail) {
    try {
      const { subject, html } = buildBookingCancellationEmail({
        guestName: booking.guestName,
        tourName: slot ? titleCase(slot.tourSlug) : 'your tour',
        startsAtUtc: slot?.startsAt ?? null,
        bookingRef: booking.id,
        locale: booking.locale,
        refunded,
        refundEurMinor: refunded ? booking.amountEurMinor : null,
      })
      await sendEmail({ to: booking.guestEmail, subject, html, replyTo: getContactEmail() })
    } catch (e) {
      log.warn('[booking-cancel] cancellation email failed (fail-quiet)', { bookingId: id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  log.info('[booking-cancel] cancelled', { bookingId: id, refunded, refundEligible })
  return attachRequestId(NextResponse.json({ ok: true, status: 'cancelled', refunded }), reqId)
}
