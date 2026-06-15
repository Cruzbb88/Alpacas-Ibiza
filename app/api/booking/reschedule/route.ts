import { NextResponse } from 'next/server'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyBookingManageToken, signBookingManageToken } from '@/lib/booking-manage-token'
import { getBooking, getSlot, rescheduleBooking } from '@/lib/booking/store'
import { buildBookingRescheduledEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/mailer'
import { getContactEmail } from '@/lib/validate-env'
import { SITE_BASE_URL } from '@/lib/config'

/**
 * POST /api/booking/reschedule   body: { id, token, newSlotId }
 *
 * Self-service guest reschedule (spec-011 §J), gated by the same HMAC manage
 * token as cancel. Moves the booking to another OPEN slot via the atomic two-slot
 * capacity move in `rescheduleBooking` (no oversell). v1 policy: no upcharge —
 * the new slot must cost ≤ what was paid. Confirms the new date by email.
 *
 * Fail-closed: invalid token / unknown booking → generic 404.
 */
export const dynamic = 'force-dynamic'

const titleCase = (slug: string) =>
  slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('booking-reschedule', reqId)

  const ip = getClientIp(request)
  const rl = rateLimit({ key: `booking-reschedule:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return attachRequestId(NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } }), reqId)
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Bad request' }, { status: 400 }), reqId)
  }
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const token = typeof body.token === 'string' ? body.token : ''
  const newSlotId = typeof body.newSlotId === 'string' ? body.newSlotId.trim() : ''

  if (!id || !token || !verifyBookingManageToken(token, id)) {
    return attachRequestId(NextResponse.json({ error: 'Not found' }, { status: 404 }), reqId)
  }
  // Per-booking throttle.
  const rlB = rateLimit({ key: `booking-reschedule:id:${id}`, limit: 5, windowMs: 10 * 60 * 1000 })
  if (!rlB.allowed) {
    return attachRequestId(NextResponse.json({ error: 'Too many requests' }, { status: 429 }), reqId)
  }
  if (!newSlotId) {
    return attachRequestId(NextResponse.json({ error: 'Pick a new date' }, { status: 400 }), reqId)
  }

  const result = await rescheduleBooking(id, newSlotId)
  if (!result.ok) {
    const map: Record<string, { status: number; msg: string }> = {
      unavailable: { status: 503, msg: 'Rescheduling is not available right now.' },
      not_found: { status: 404, msg: 'Not found.' },
      cancelled: { status: 409, msg: 'This booking is cancelled.' },
      sold_out: { status: 409, msg: 'That date just filled up — please pick another.' },
      price_higher: { status: 409, msg: 'That date costs more than you paid — reply to your email and we’ll help.' },
    }
    const m = map[result.reason] ?? { status: 400, msg: 'Could not reschedule.' }
    return attachRequestId(NextResponse.json({ ok: false, error: m.msg, code: result.reason }, { status: m.status }), reqId)
  }

  // Confirm the new date (fail-quiet — the move already committed).
  try {
    const booking = await getBooking(id)
    const newSlot = await getSlot(newSlotId)
    if (booking?.guestEmail && newSlot) {
      const locale = booking.locale ?? 'en'
      const manageUrl = `${SITE_BASE_URL}/${locale}/tours/manage?id=${encodeURIComponent(id)}&token=${encodeURIComponent(signBookingManageToken(id))}`
      const { subject, html } = buildBookingRescheduledEmail({
        guestName: booking.guestName,
        tourName: titleCase(newSlot.tourSlug),
        newStartsAtUtc: newSlot.startsAt,
        partySize: booking.partySize,
        bookingRef: booking.id,
        locale,
        manageUrl,
      })
      await sendEmail({ to: booking.guestEmail, subject, html, replyTo: getContactEmail() })
    }
  } catch (e) {
    log.warn('[booking-reschedule] confirmation email failed (fail-quiet)', { bookingId: id, error: e instanceof Error ? e.message : String(e) })
  }

  log.info('[booking-reschedule] moved', { bookingId: id, newSlotId })
  return attachRequestId(NextResponse.json({ ok: true }), reqId)
}
