/**
 * Pure booking state-machine — NO DB, NO I/O. The money/concurrency invariants
 * from the cb-006 pre-mortem live here as pure functions so they can be tested
 * exhaustively without a database. lib/booking/store.ts wraps these in Drizzle
 * transactions.
 */

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

/** The subset of a booking row the decision logic needs. */
export interface BookingRowView {
  status: BookingStatus
  holdExpiresAt: Date | null
  paymentRef: string | null
}

/**
 * Seats still bookable on a slot. `bookedCount` already includes active holds
 * (reserve increments it), so this nets out holds — the read path must NOT
 * separately subtract pending rows (cb-006 F7).
 */
export function seatsLeft(slot: { capacity: number; bookedCount: number }): number {
  return Math.max(0, slot.capacity - slot.bookedCount)
}

/** Is a pending hold expired at `now`? No expiry set ⇒ never expires. */
export function isHoldExpired(holdExpiresAt: Date | null, now: Date): boolean {
  if (!holdExpiresAt) return false
  return now.getTime() > holdExpiresAt.getTime()
}

export type ConfirmDecision =
  | { action: 'confirm' } //                       pending + valid hold → confirm, keep seat
  | { action: 'already_confirmed' } //             idempotent: same paymentRef already confirmed
  | { action: 'refund'; reason: 'expired' | 'cancelled' | 'conflict' } // paid but un-honorable

/**
 * What a confirm (payment success) should do for a booking row.
 * - Money-safety (cb-006 F2): a paid booking we can't honor → caller must REFUND.
 * - Idempotent (cb-006 F5): a re-delivered webhook with the SAME paymentRef is a no-op.
 *   A DIFFERENT payment landing on an already-confirmed booking is a conflict → refund
 *   (its seat was already taken by the first payment).
 */
export function decideConfirm(
  b: BookingRowView,
  paymentRef: string,
  now: Date,
): ConfirmDecision {
  if (b.status === 'confirmed') {
    return b.paymentRef === paymentRef
      ? { action: 'already_confirmed' }
      : { action: 'refund', reason: 'conflict' }
  }
  if (b.status === 'cancelled') return { action: 'refund', reason: 'cancelled' }
  // pending:
  if (isHoldExpired(b.holdExpiresAt, now)) return { action: 'refund', reason: 'expired' }
  return { action: 'confirm' }
}

export type CancelDecision =
  | { action: 'cancel_and_restore' } // active booking → cancel + restore capacity (once)
  | { action: 'noop' } //              already cancelled → idempotent no-op

/**
 * What a cancel should do. Capacity is restored EXACTLY once (cb-006 F5): a
 * second cancel of an already-cancelled booking must not restore again (oversell).
 */
export function decideCancel(b: { status: BookingStatus }): CancelDecision {
  return b.status === 'cancelled' ? { action: 'noop' } : { action: 'cancel_and_restore' }
}
