/**
 * Vendor-NEUTRAL booking settle orchestrator (spec-011 §C/§D/§G/§I): turns a PAID
 * booking payment — from EITHER Stripe or Mollie — into a confirmed booking +
 * guest email + owner alert.
 *
 * The vendor lives entirely in the injected `refund` fn and the `paymentRef`
 * (Stripe `pi_…` / Mollie `tr_…`); everything here is payment-processor agnostic.
 * The pure confirm/refund decision is in confirm-payment.ts; this is the
 * side-effect glue (DB read for the email, mailer, owner-notify) and is
 * intentionally fail-quiet — a webhook must still return 200.
 */
import { handleBookingPaymentPaid } from './confirm-payment'
import { getBooking, getSlot } from './store'
import { buildBookingConfirmationEmail } from '@/lib/email-templates'
import { sendEmail } from '@/lib/mailer'
import { notifyOwnerAlert } from '@/lib/owner-notify'
import { getContactEmail } from '@/lib/validate-env'
import { makeRequestLogger } from '@/lib/request-id'
import { SITE_BASE_URL } from '@/lib/config'
import { signBookingManageToken } from '@/lib/booking-manage-token'

/** Token-gated guest manage-link for a booking (no account needed). */
function manageUrlFor(bookingId: string, locale: string | null): string {
  const token = signBookingManageToken(bookingId)
  return `${SITE_BASE_URL}/${locale ?? 'en'}/tours/manage?id=${encodeURIComponent(bookingId)}&token=${encodeURIComponent(token)}`
}

const log = makeRequestLogger('booking-webhook', 'settle')

export interface BookingPaidArgs {
  bookingId: string
  /** Vendor payment id — the confirm idempotency key AND the refund target. */
  paymentRef: string
  locale?: string | null
  /** Issues a vendor refund for `paymentRef`; returns true on success. */
  refund: (paymentRef: string) => Promise<boolean>
}

/** "alpaca-tour" → "Alpaca Tour" (no invented data — just a display transform). */
function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Confirm the held seat; send the guest receipt; alert the owner on failures. */
export async function handleBookingPaid(args: BookingPaidArgs): Promise<void> {
  const outcome = await handleBookingPaymentPaid(
    { bookingId: args.bookingId, paymentRef: args.paymentRef },
    args.refund,
  )

  switch (outcome.status) {
    case 'confirmed':
      log.info('[booking] confirmed', { bookingId: args.bookingId })
      await sendBookingConfirmation(args.bookingId, args.locale ?? null)
      break
    case 'already_confirmed':
      // Idempotent re-delivery — the email already went out on the first confirm.
      log.info('[booking] already confirmed (idempotent)', { bookingId: args.bookingId })
      break
    case 'refunded':
      log.warn('[booking] refunded', {
        bookingId: args.bookingId, reason: outcome.reason, refundOk: outcome.refundOk,
      })
      if (!outcome.refundOk) {
        void notifyOwnerAlert('Booking refund FAILED — manual action needed', [
          `Booking: ${args.bookingId}`,
          `Reason: ${outcome.reason}`,
          `Payment: ${args.paymentRef}`,
          'Guest was charged, the seat cannot be honored, and the automatic refund failed. Refund manually.',
        ])
      }
      break
    default:
      // not_found / no_db — a payment we could not match to a persisted booking.
      log.warn('[booking] payment unmatched', { bookingId: args.bookingId, status: outcome.status })
      void notifyOwnerAlert('Booking payment could not be matched', [
        `Booking: ${args.bookingId}`,
        `Status: ${outcome.status}`,
        `Payment: ${args.paymentRef}`,
        'A payment arrived for a booking that was not found/persisted. Investigate before the customer disputes.',
      ])
  }
}

/** Send the guest their confirmation/receipt. Fail-quiet — never blocks the 200. */
async function sendBookingConfirmation(bookingId: string, locale: string | null): Promise<void> {
  try {
    const booking = await getBooking(bookingId)
    if (!booking?.guestEmail) {
      log.info('[booking] no guest email — confirmation skipped', { bookingId })
      return
    }
    const slot = await getSlot(booking.slotId)
    if (!slot) {
      log.warn('[booking] slot missing — confirmation skipped', { bookingId, slotId: booking.slotId })
      return
    }
    const { subject, html } = buildBookingConfirmationEmail({
      guestName: booking.guestName,
      tourName: titleCaseSlug(slot.tourSlug),
      startsAtUtc: slot.startsAt,
      partySize: booking.partySize,
      amountEurMinor: booking.amountEurMinor,
      bookingRef: booking.id,
      locale,
      manageUrl: manageUrlFor(booking.id, locale),
    })
    await sendEmail({ to: booking.guestEmail, subject, html, replyTo: getContactEmail() })
    log.info('[booking] confirmation email sent', { bookingId })
  } catch (e) {
    log.warn('[booking] confirmation email failed (fail-quiet)', {
      bookingId, error: e instanceof Error ? e.message : String(e),
    })
  }
}
