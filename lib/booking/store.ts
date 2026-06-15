/**
 * In-house booking store — Drizzle transactions over tour_slots + bookings.
 * Implements the cb-006 pre-mortem invariants:
 *   F1/F6  reserve = ONE transaction: atomic conditional capacity decrement +
 *          pending-booking insert. No oversell, no split writes.
 *   F2/F5  confirm + cancel are idempotent and money-safe (decideConfirm /
 *          decideCancel in ./store-logic.ts). A paid-but-unhonorable booking
 *          returns refund:true so the caller refunds.
 *   F3     fail-CLOSED when DATABASE_URL is unset: getDb() is null ⇒ no fake
 *          availability, no unpersistable bookings.
 *   F4     all timestamps are timestamptz UTC; format in Europe/Madrid at the edge.
 *
 * Activation: BOOKING_ENGINE=inhouse + DATABASE_URL. Defaults off.
 */
import { and, eq, gte, isNotNull, isNull, lt, lte, ne, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/client'
import { tourSlots, bookings, type TourSlot, type Booking } from '@/lib/db/schema'
import { decideConfirm, decideCancel } from './store-logic'
import { makeRequestLogger } from '@/lib/request-id'

/** Default hold window — comfortably covers a Stripe/Mollie checkout session. */
const DEFAULT_HOLD_MS = 20 * 60 * 1000

const storeLog = makeRequestLogger('booking-store', 'tx')

/**
 * Reject a DB op that outlives `ms` so a hung pool / lock can't pin a serverless
 * function on the money path (mirrors the codebase's fetchWithTimeout posture —
 * the DB was the one unguarded I/O boundary). Caller-side latency bound only:
 * the underlying query may still settle in the driver; that's acceptable here
 * because confirm/cancel are idempotent and an orphaned hold is reaped by cron.
 */
function withDbTimeout<T>(p: PromiseLike<T>, op: string, ms = 8000): Promise<T> {
  let t: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, rej) => {
    t = setTimeout(() => rej(new Error(`db-timeout:${op}:${ms}ms`)), ms)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(t)) as Promise<T>
}

/** One structured line for any paid-but-unhonorable outcome → refund initiated. */
function logRefundDecision(bookingId: string, reason: string): void {
  storeLog.warn('[confirm] paid booking NOT honorable → refund', { bookingId, reason })
}

/** Postgres unique-violation (SQLSTATE 23505) — used for idempotency-key races. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505'
}

export type ReserveResult =
  | { ok: true; bookingId: string }
  | { ok: false; reason: 'unavailable' | 'sold_out' | 'bad_request' }

/**
 * Atomically HOLD `partySize` seats and create a pending booking in ONE
 * transaction. Fail-closed when no DB. The conditional UPDATE only succeeds when
 * capacity remains, so two concurrent reserves can never oversell.
 */
export async function reserveSlot(args: {
  slotId: string
  partySize: number
  guestName?: string | null
  guestEmail?: string | null
  /** Client dedupe key — a retried reserve with the same key returns the SAME hold. */
  idempotencyKey?: string | null
  /** Guest locale (drives confirmation/reminder/review email language). */
  locale?: string | null
  holdMs?: number
  now?: Date
}): Promise<ReserveResult> {
  const db = getDb()
  if (!db) return { ok: false, reason: 'unavailable' } // F3
  // Upper bound is defense-in-depth at the lib boundary (the route caps lower).
  // The conditional UPDATE already bounds party by capacity, but this stops an
  // absurd partySize from ever reaching `price * partySize` (int4 amount column).
  if (!Number.isInteger(args.partySize) || args.partySize < 1 || args.partySize > 100) {
    return { ok: false, reason: 'bad_request' }
  }
  const now = args.now ?? new Date()
  const holdExpiresAt = new Date(now.getTime() + (args.holdMs ?? DEFAULT_HOLD_MS))
  const key = args.idempotencyKey ?? null

  // Idempotent replay (spec-011 §I): a prior reserve with this key → return that
  // hold, never a second one. Covers the common "dropped response → client retry".
  // Scoped to (key, slot, party): a key reused for a DIFFERENT request is a client
  // bug — refuse rather than hand back a hold for the wrong slot/amount (review #2).
  if (key) {
    const prior = await withDbTimeout(
      db
        .select({ id: bookings.id, slotId: bookings.slotId, partySize: bookings.partySize })
        .from(bookings)
        .where(eq(bookings.idempotencyKey, key))
        .limit(1),
      'reserve-idem',
    )
    if (prior.length) {
      if (prior[0].slotId !== args.slotId || prior[0].partySize !== args.partySize) {
        return { ok: false, reason: 'bad_request' }
      }
      return { ok: true, bookingId: prior[0].id }
    }
  }

  try {
    return await withDbTimeout(db.transaction(async (tx) => {
      // F1/F6 — atomic conditional decrement (increment of bookedCount).
      const updated = await tx
        .update(tourSlots)
        .set({ bookedCount: sql`${tourSlots.bookedCount} + ${args.partySize}` })
        .where(
          and(
            eq(tourSlots.id, args.slotId),
            eq(tourSlots.status, 'open'),
            sql`${tourSlots.bookedCount} + ${args.partySize} <= ${tourSlots.capacity}`,
          ),
        )
        .returning({ id: tourSlots.id, price: tourSlots.priceEurMinor })

      if (updated.length === 0) return { ok: false as const, reason: 'sold_out' as const }

      const bookingId = `bk_${crypto.randomUUID()}`
      await tx.insert(bookings).values({
        id: bookingId,
        slotId: args.slotId,
        partySize: args.partySize,
        guestName: args.guestName ?? null,
        guestEmail: args.guestEmail ?? null,
        status: 'pending',
        holdExpiresAt,
        idempotencyKey: key,
        locale: args.locale ?? null,
        amountEurMinor: updated[0].price * args.partySize,
      })
      return { ok: true as const, bookingId }
    }), 'reserve')
  } catch (e) {
    // A concurrent reserve with the SAME key won the unique race; this insert
    // failed so its transaction rolled back (capacity decrement undone). Return
    // the winner's booking — the retry stays idempotent, no phantom hold. The
    // only unique index populated at insert is idempotency_key (payment_ref is
    // NULL here), so a 23505 is always the key collision. Same slot/party guard.
    if (key && isUniqueViolation(e)) {
      const prior = await db
        .select({ id: bookings.id, slotId: bookings.slotId, partySize: bookings.partySize })
        .from(bookings)
        .where(eq(bookings.idempotencyKey, key))
        .limit(1)
      if (prior.length && prior[0].slotId === args.slotId && prior[0].partySize === args.partySize) {
        return { ok: true, bookingId: prior[0].id }
      }
    }
    throw e
  }
}

export type ConfirmResult =
  | { ok: true; status: 'confirmed' | 'already_confirmed' }
  | { ok: false; refund: true; reason: 'expired' | 'cancelled' | 'conflict' }
  | { ok: false; refund: false; reason: 'no_db' | 'not_found' }

/**
 * Confirm a booking after payment. Idempotent + money-safe (cb-006 F2/F5):
 * a re-delivered webhook with the same paymentRef → already_confirmed; a paid
 * booking we can't honor → { refund: true } so the caller issues a refund.
 */
export async function confirmBooking(
  bookingId: string,
  paymentRef: string,
  now: Date = new Date(),
): Promise<ConfirmResult> {
  const db = getDb()
  if (!db) return { ok: false, refund: false, reason: 'no_db' }

  return withDbTimeout(db.transaction(async (tx) => {
    const rows = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
    const b = rows[0]
    if (!b) return { ok: false as const, refund: false as const, reason: 'not_found' as const }

    const decision = decideConfirm(
      { status: b.status as 'pending' | 'confirmed' | 'cancelled', holdExpiresAt: b.holdExpiresAt, paymentRef: b.paymentRef },
      paymentRef,
      now,
    )
    if (decision.action === 'already_confirmed') return { ok: true as const, status: 'already_confirmed' as const }
    if (decision.action === 'refund') {
      logRefundDecision(bookingId, decision.reason)
      return { ok: false as const, refund: true as const, reason: decision.reason }
    }

    // Guard the state transition in SQL (NOT app code): only flip a row that is
    // STILL pending. Two concurrent confirms can't both win — the loser matches
    // 0 rows because the winner already moved it off 'pending' (cb-006 F2/F5).
    const updated = await tx
      .update(bookings)
      .set({ status: 'confirmed', paymentRef, confirmedAt: now })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, 'pending')))
      .returning({ id: bookings.id })

    if (updated.length === 0) {
      // Lost the race — the row was transitioned by a concurrent confirm/cancel
      // after our SELECT. Re-read the now-committed state and re-decide so we
      // never blindly confirm (or double-refund) on stale data.
      const again = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
      const b2 = again[0]
      if (!b2) return { ok: false as const, refund: false as const, reason: 'not_found' as const }
      const d2 = decideConfirm(
        { status: b2.status as 'pending' | 'confirmed' | 'cancelled', holdExpiresAt: b2.holdExpiresAt, paymentRef: b2.paymentRef },
        paymentRef,
        now,
      )
      if (d2.action === 'already_confirmed') return { ok: true as const, status: 'already_confirmed' as const }
      if (d2.action === 'refund') {
        logRefundDecision(bookingId, d2.reason)
        return { ok: false as const, refund: true as const, reason: d2.reason }
      }
      // Still 'pending' yet our guarded UPDATE matched 0 rows — contradictory;
      // treat as a transient miss so the webhook 500s and the processor retries.
      throw new Error(`confirmBooking: guarded update matched 0 rows but row still pending (${bookingId})`)
    }
    return { ok: true as const, status: 'confirmed' as const }
  }), 'confirm')
}

export type CancelResult = { ok: boolean; restored: boolean; reason?: 'no_db' | 'not_found' }

/**
 * Cancel a booking and restore capacity EXACTLY ONCE (cb-006 F5). Idempotent:
 * cancelling an already-cancelled booking is a no-op (no double-restore).
 */
export async function cancelBooking(bookingId: string, now: Date = new Date()): Promise<CancelResult> {
  const db = getDb()
  if (!db) return { ok: false, restored: false, reason: 'no_db' }

  return withDbTimeout(db.transaction(async (tx) => {
    const rows = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
    const b = rows[0]
    if (!b) return { ok: false, restored: false, reason: 'not_found' as const }

    if (decideCancel({ status: b.status as 'pending' | 'confirmed' | 'cancelled' }).action === 'noop') {
      return { ok: true, restored: false } // idempotent
    }
    // Guard the cancel in SQL so capacity is restored EXACTLY once (cb-006 F5):
    // only a row that is NOT already cancelled flips here. A concurrent second
    // cancel matches 0 rows (the winner already set 'cancelled') and skips the
    // capacity restore — otherwise two cancels would subtract partySize twice
    // and oversell. GREATEST(...,0) is a second floor, not the primary guard.
    const cancelled = await tx
      .update(bookings)
      .set({ status: 'cancelled', cancelledAt: now })
      .where(and(eq(bookings.id, bookingId), ne(bookings.status, 'cancelled')))
      .returning({ id: bookings.id })
    if (cancelled.length === 0) return { ok: true, restored: false } // lost race — already cancelled
    await tx
      .update(tourSlots)
      .set({ bookedCount: sql`GREATEST(${tourSlots.bookedCount} - ${b.partySize}, 0)` })
      .where(eq(tourSlots.id, b.slotId))
    return { ok: true, restored: true }
  }), 'cancel')
}

export type RescheduleResult =
  | { ok: true; newSlotId: string }
  | { ok: false; reason: 'unavailable' | 'not_found' | 'cancelled' | 'sold_out' | 'price_higher' }

/** Thrown to roll back the new-slot reserve when a concurrent move wins the race. */
class RescheduleConflict extends Error {}

/**
 * Move a booking to another OPEN slot of the (any) tour — self-service reschedule
 * (spec-011 §J). ONE transaction does the atomic two-slot capacity move:
 *   1. grab capacity on the new slot (same conditional UPDATE as reserve — no oversell)
 *   2. release the old slot's capacity
 *   3. point the booking at the new slot + RESET reminder/review stamps so the new
 *      date re-triggers the email chain.
 * v1 policy: no upcharge — the new slot must cost ≤ what was already paid; a
 * cheaper slot keeps the difference (no partial refund yet). Idempotent: moving to
 * the slot it's already on is a no-op success. Fail-closed when no DB.
 */
export async function rescheduleBooking(
  bookingId: string,
  newSlotId: string,
  now: Date = new Date(),
): Promise<RescheduleResult> {
  const db = getDb()
  if (!db) return { ok: false, reason: 'unavailable' }
  try {
   return await withDbTimeout(db.transaction(async (tx) => {
    const rows = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1)
    const b = rows[0]
    if (!b) return { ok: false as const, reason: 'not_found' as const }
    if (b.status === 'cancelled') return { ok: false as const, reason: 'cancelled' as const }
    if (b.slotId === newSlotId) return { ok: true as const, newSlotId } // already there

    const slotRows = await tx
      .select({ price: tourSlots.priceEurMinor, status: tourSlots.status })
      .from(tourSlots).where(eq(tourSlots.id, newSlotId)).limit(1)
    const ns = slotRows[0]
    if (!ns || ns.status !== 'open') return { ok: false as const, reason: 'sold_out' as const }
    if (ns.price * b.partySize > b.amountEurMinor) return { ok: false as const, reason: 'price_higher' as const }

    // 1) Atomic capacity grab on the new slot (no oversell).
    const reserved = await tx
      .update(tourSlots)
      .set({ bookedCount: sql`${tourSlots.bookedCount} + ${b.partySize}` })
      .where(
        and(
          eq(tourSlots.id, newSlotId),
          eq(tourSlots.status, 'open'),
          sql`${tourSlots.bookedCount} + ${b.partySize} <= ${tourSlots.capacity}`,
        ),
      )
      .returning({ id: tourSlots.id })
    if (reserved.length === 0) return { ok: false as const, reason: 'sold_out' as const }

    // 2) Move the booking — guarded on the OLD slot + not-cancelled so a concurrent
    //    reschedule/cancel can't double-move or move a cancelled row. Loser matches
    //    0 rows → throw → the whole tx (incl. the new-slot reserve above) rolls back.
    const moved = await tx
      .update(bookings)
      .set({ slotId: newSlotId, reminderSentAt: null, reviewRequestedAt: null })
      .where(and(eq(bookings.id, bookingId), eq(bookings.slotId, b.slotId), ne(bookings.status, 'cancelled')))
      .returning({ id: bookings.id })
    if (moved.length === 0) throw new RescheduleConflict()

    // 3) Release the old slot's capacity (only the winner reaches here).
    await tx
      .update(tourSlots)
      .set({ bookedCount: sql`GREATEST(${tourSlots.bookedCount} - ${b.partySize}, 0)` })
      .where(eq(tourSlots.id, b.slotId))
    return { ok: true as const, newSlotId }
   }), 'reschedule')
  } catch (e) {
    // Lost the race — our new-slot reserve was rolled back; tell the guest to retry.
    if (e instanceof RescheduleConflict) return { ok: false, reason: 'sold_out' }
    throw e
  }
}

/**
 * Cron: release pending holds past their expiry (cb-006 F1). Each is cancelled
 * via cancelBooking so capacity is restored atomically + once. Returns count.
 */
export async function releaseExpiredHolds(now: Date = new Date()): Promise<number> {
  const db = getDb()
  if (!db) return 0
  // Strict `<` mirrors isHoldExpired's strict `>` (store-logic.ts): a hold AT
  // its exact expiry instant is NOT yet expired, so confirm and cleanup agree on
  // the boundary and never race over the same millisecond (cb-006 F1, review A#5).
  const expired = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.status, 'pending'), lt(bookings.holdExpiresAt, now)))
  let released = 0
  for (const row of expired) {
    const r = await cancelBooking(row.id, now)
    if (r.ok && r.restored) released++
  }
  return released
}

/**
 * Read a single booking by id. Fail-closed (cb-006 F3): returns null when no DB.
 * Used by the checkout route to resolve the amount to charge for a held seat.
 */
export async function getBooking(bookingId: string): Promise<Booking | null> {
  const db = getDb()
  if (!db) return null
  const rows = await withDbTimeout(
    db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1),
    'getBooking',
  )
  return rows[0] ?? null
}

/**
 * Admin: create a bookable slot. Owner DATA (time/capacity/price) comes from the
 * caller — never invented here. Fail-closed: null when no DB. Returns the new id.
 */
export async function createSlot(input: {
  tourSlug: string
  startsAt: Date
  durationMin: number
  capacity: number
  priceEurMinor: number
}): Promise<string | null> {
  const db = getDb()
  if (!db) return null
  const id = `slot_${crypto.randomUUID()}`
  await withDbTimeout(
    db.insert(tourSlots).values({
      id,
      tourSlug: input.tourSlug,
      startsAt: input.startsAt,
      durationMin: input.durationMin,
      capacity: input.capacity,
      priceEurMinor: input.priceEurMinor,
      status: 'open',
    }),
    'createSlot',
  )
  return id
}

/** Admin: every slot (all statuses), soonest first. Fail-closed: [] when no DB. */
export async function listSlots(): Promise<TourSlot[]> {
  const db = getDb()
  if (!db) return []
  return withDbTimeout(db.select().from(tourSlots).orderBy(tourSlots.startsAt), 'listSlots')
}

/** Admin: open or close a slot (closed slots stop taking bookings). Fail-closed. */
export async function setSlotStatus(slotId: string, status: 'open' | 'closed'): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  const updated = await withDbTimeout(
    db.update(tourSlots).set({ status }).where(eq(tourSlots.id, slotId)).returning({ id: tourSlots.id }),
    'setSlotStatus',
  )
  return updated.length > 0
}

/** Customer: all OPEN, future slots across every tour within a range. Fail-closed. */
export async function listOpenSlots(range: { start: Date; end: Date }): Promise<TourSlot[]> {
  const db = getDb()
  if (!db) return []
  return withDbTimeout(
    db
      .select()
      .from(tourSlots)
      .where(
        and(
          eq(tourSlots.status, 'open'),
          gte(tourSlots.startsAt, range.start),
          lte(tourSlots.startsAt, range.end),
        ),
      )
      .orderBy(tourSlots.startsAt),
    'listOpenSlots',
  )
}

/**
 * GDPR Article 17 erasure for booking PII (spec-011 §I). Nulls guest_name/
 * guest_email and stamps deleted_at for every not-yet-erased booking matching the
 * email; the row stays (capacity/accounting), only the personal data goes. Mirrors
 * the customers-table soft-delete. Fail-closed: returns 0 when no DB. Returns count.
 */
export async function softDeleteBookingsByEmail(email: string): Promise<number> {
  const db = getDb()
  if (!db) return 0
  const erased = await withDbTimeout(
    db
      .update(bookings)
      .set({ guestName: null, guestEmail: null, deletedAt: new Date() })
      // Match the normalized (lowercased) form stored at reserve time so an
      // Article-17 request can't miss a case variant (review #6).
      .where(and(eq(bookings.guestEmail, email.toLowerCase()), isNull(bookings.deletedAt)))
      .returning({ id: bookings.id }),
    'softDeleteBookings',
  )
  return erased.length
}

// ── Post-booking comms (reminders + review requests) — spec-011 §G / competitor-standard ─

export interface BookingWithSlot {
  bookingId: string
  guestName: string | null
  guestEmail: string | null
  locale: string | null
  tourSlug: string
  startsAt: Date
  durationMin: number
}

const REMINDER_SELECT = {
  bookingId: bookings.id,
  guestName: bookings.guestName,
  guestEmail: bookings.guestEmail,
  locale: bookings.locale,
  tourSlug: tourSlots.tourSlug,
  startsAt: tourSlots.startsAt,
  durationMin: tourSlots.durationMin,
}

/** Confirmed bookings whose tour starts in ~24h and haven't been reminded yet. */
export async function listBookingsNeedingReminder(now: Date = new Date()): Promise<BookingWithSlot[]> {
  const db = getDb()
  if (!db) return []
  const start = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  return withDbTimeout(
    db
      .select(REMINDER_SELECT)
      .from(bookings)
      .innerJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
      .where(
        and(
          eq(bookings.status, 'confirmed'),
          isNull(bookings.reminderSentAt),
          isNull(bookings.deletedAt),
          isNotNull(bookings.guestEmail),
          gte(tourSlots.startsAt, start),
          lte(tourSlots.startsAt, end),
        ),
      ),
    'listReminder',
  )
}

/** Confirmed bookings whose tour started 3–26h ago (so it's over) and have not
 * yet had a review request. Window keyed off startsAt — durationMin is short. */
export async function listBookingsNeedingReview(now: Date = new Date()): Promise<BookingWithSlot[]> {
  const db = getDb()
  if (!db) return []
  const start = new Date(now.getTime() - 26 * 60 * 60 * 1000)
  const end = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  return withDbTimeout(
    db
      .select(REMINDER_SELECT)
      .from(bookings)
      .innerJoin(tourSlots, eq(bookings.slotId, tourSlots.id))
      .where(
        and(
          eq(bookings.status, 'confirmed'),
          isNull(bookings.reviewRequestedAt),
          isNull(bookings.deletedAt),
          isNotNull(bookings.guestEmail),
          gte(tourSlots.startsAt, start),
          lte(tourSlots.startsAt, end),
        ),
      ),
    'listReview',
  )
}

/** Stamp reminder_sent_at exactly once (guarded so a cron re-run never re-sends). */
export async function markReminderSent(bookingId: string, now: Date = new Date()): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  const r = await withDbTimeout(
    db.update(bookings).set({ reminderSentAt: now })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.reminderSentAt)))
      .returning({ id: bookings.id }),
    'markReminder',
  )
  return r.length > 0
}

/** Stamp review_requested_at exactly once. */
export async function markReviewRequested(bookingId: string, now: Date = new Date()): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  const r = await withDbTimeout(
    db.update(bookings).set({ reviewRequestedAt: now })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.reviewRequestedAt)))
      .returning({ id: bookings.id }),
    'markReview',
  )
  return r.length > 0
}

/**
 * Claim the right to refund a booking — exactly once. Guarded UPDATE stamps
 * refunded_at only if it's still NULL, so the FIRST caller wins and every other
 * path (double-click cancel, a late duplicate webhook, the un-honorable-confirm
 * refund) gets `false` and must NOT issue a refund. Cross-vendor idempotency
 * (Mollie has no native key). Fail-closed: false when no DB.
 */
export async function claimRefund(bookingId: string, now: Date = new Date()): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  const r = await withDbTimeout(
    db.update(bookings).set({ refundedAt: now })
      .where(and(eq(bookings.id, bookingId), isNull(bookings.refundedAt)))
      .returning({ id: bookings.id }),
    'claimRefund',
  )
  return r.length > 0
}

/** Read a single tour slot by id. Fail-closed: null when no DB. */
export async function getSlot(slotId: string): Promise<TourSlot | null> {
  const db = getDb()
  if (!db) return null
  const rows = await withDbTimeout(
    db.select().from(tourSlots).where(eq(tourSlots.id, slotId)).limit(1),
    'getSlot',
  )
  return rows[0] ?? null
}

/**
 * Extend a pending hold's expiry — used when an async payment method (SEPA /
 * iDEAL / Bancontact) starts: the customer has committed but the charge settles
 * days later, so the 20-min hold must NOT be reaped by the cleanup cron before
 * `checkout.session.async_payment_succeeded` arrives (cb-006 / spec-011 §C). Only
 * a still-pending row is extended; returns true if it was. Fail-closed → false.
 */
export async function extendHoldForAsyncPayment(
  bookingId: string,
  holdUntil: Date,
): Promise<boolean> {
  const db = getDb()
  if (!db) return false
  const updated = await withDbTimeout(
    db
      .update(bookings)
      .set({ holdExpiresAt: holdUntil })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, 'pending')))
      .returning({ id: bookings.id }),
    'extendHold',
  )
  return updated.length > 0
}

/**
 * Open slots for a tour within a date range. Fail-closed (cb-006 F3): returns []
 * when no DB so the UI shows "no availability" rather than fabricated slots.
 * `bookedCount` already nets out holds, so callers compute seatsLeft() directly.
 */
export async function getOpenSlots(
  tourSlug: string,
  range: { start: Date; end: Date },
): Promise<TourSlot[]> {
  const db = getDb()
  if (!db) return []
  return withDbTimeout(
    db
      .select()
      .from(tourSlots)
      .where(
        and(
          eq(tourSlots.tourSlug, tourSlug),
          eq(tourSlots.status, 'open'),
          gte(tourSlots.startsAt, range.start),
          lte(tourSlots.startsAt, range.end),
        ),
      )
      .orderBy(tourSlots.startsAt),
    'getOpenSlots',
  )
}
