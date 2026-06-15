/**
 * Payment → booking confirmation bridge (cb-006 F2/F5).
 *
 * A Stripe/Mollie webhook fires when a customer pays for a held booking. This
 * module turns that payment event into the right booking state transition:
 *
 *   - paid + booking still honorable  → confirm it (idempotent on paymentRef)
 *   - paid + booking NOT honorable    → REFUND the payment (expired hold, the
 *     seat was re-sold, or a second payment hit an already-confirmed booking)
 *
 * The money-safety rule is: NEVER keep a customer's money for a seat we cannot
 * give them. confirmBooking() decides honorable-vs-not (via decideConfirm); this
 * function executes the refund side-effect when it says refund.
 *
 * Refunds are injected as a dependency (`refund`) so this stays pure and unit
 * testable, and so the caller controls which vendor (Stripe vs Mollie) actually
 * issues the refund. `refund` MUST be idempotent at the vendor (refunding an
 * already-refunded payment should no-op) — webhooks are re-delivered.
 *
 * `confirm` is likewise injected (the real one is store.confirmBooking) so each
 * branch can be exercised without a live Postgres — and so this module never
 * transitively imports the DB client (keeps it edge- and unit-test-friendly).
 */
import type { ConfirmResult } from './store'

/** The confirm-step signature — the real one is store.confirmBooking. */
export type ConfirmFn = (
  bookingId: string,
  paymentRef: string,
  now: Date,
) => Promise<ConfirmResult>

export interface BookingPaymentEvent {
  /** Our booking id (from session/payment metadata `booking_id`). */
  bookingId: string
  /** Vendor payment/session id — the idempotency key for confirm. */
  paymentRef: string
}

export type BookingConfirmOutcome =
  | { status: 'confirmed' }
  | { status: 'already_confirmed' }
  | { status: 'refunded'; reason: 'expired' | 'cancelled' | 'conflict'; refundOk: boolean }
  | { status: 'no_db' }
  | { status: 'not_found' }

/**
 * Handle a successful-payment webhook for an in-house booking.
 *
 * @param refund  issues a vendor refund for `paymentRef`; returns true on
 *                success. Called ONLY when the booking can't be honored. Must be
 *                idempotent (webhooks retry). A throw is caught and treated as a
 *                failed refund so the webhook can still return 200 and the owner
 *                is alerted via the returned `refundOk: false`.
 */
export async function handleBookingPaymentPaid(
  event: BookingPaymentEvent,
  refund: (paymentRef: string) => Promise<boolean>,
  now: Date = new Date(),
  confirm: ConfirmFn = defaultConfirm,
): Promise<BookingConfirmOutcome> {
  const result: ConfirmResult = await confirm(event.bookingId, event.paymentRef, now)

  if (result.ok) {
    return { status: result.status === 'already_confirmed' ? 'already_confirmed' : 'confirmed' }
  }

  if (result.refund) {
    // Paid but un-honorable — give the money back. Swallow refund errors into a
    // flag so the webhook still 200s; a failed refund is an owner-alert, not a
    // reason to make the processor retry the whole event.
    let refundOk = false
    try {
      refundOk = await refund(event.paymentRef)
    } catch {
      refundOk = false
    }
    return { status: 'refunded', reason: result.reason, refundOk }
  }

  // refund:false, ok:false → infrastructure miss (no DB) or unknown booking.
  return { status: result.reason === 'no_db' ? 'no_db' : 'not_found' }
}

/**
 * Default confirm step — lazily imports the DB-backed store so this module's
 * static import graph stays DB-free (unit tests inject their own `confirm` and
 * never hit this path; the dynamic import is only resolved in production).
 */
const defaultConfirm: ConfirmFn = async (bookingId, paymentRef, now) => {
  const { confirmBooking } = await import('./store')
  return confirmBooking(bookingId, paymentRef, now)
}
