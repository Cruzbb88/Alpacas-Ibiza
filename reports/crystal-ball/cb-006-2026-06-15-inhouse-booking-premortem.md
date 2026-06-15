---
report_type: "crystal-ball-premortem"
report_number: 006
date: "2026-06-15"
project: "alpaca-farm-redesign"
subject: "In-house tour-booking engine (replace FareHarbor for tours)"
coherence_score: 72
verdict: "BUILD — feasible on existing infra; 7 design invariants MUST hold first"
---

# Crystal Ball Pre-mortem #006 — In-house tour booking

**Assume it's 6 months later and the in-house booking system caused a real incident. Why?**
Ranked by money/trust impact. Each ends with the **invariant the design must guarantee.**

## F1 — Overselling in the pay window 🔴 (the critical one)
Two guests pass the capacity check at the same instant; both pay; the tour is oversold.
Root cause = decrementing `booked_count` at **confirm** (post-payment) instead of at **reserve**.
- **Invariant:** decrement the seat atomically **at reserve time** (a *hold*), not at confirm. Availability = `capacity − booked_count` already reflects holds, so the next guest sees fewer seats. The single `UPDATE … WHERE booked_count+party ≤ capacity RETURNING` is correct **only at reserve**.
- Holds carry `hold_expires_at`; a cleanup cron **and** the at-confirm check both honor expiry.

## F2 — Money taken, no booking 🔴
Payment succeeds but the confirm write is lost (webhook dropped, DB blip, or the hold expired and the seat was resold) → guest charged, no seat.
- **Invariant (money-safety):** every successful payment ends in **either a confirmed booking OR an automatic refund**. At confirm, re-validate the hold; if unfulfillable → refund + apology email. Never a charge with neither booking nor refund.
- Confirm is **idempotent** (reuse existing `lib/webhook-idempotency.ts`); webhook returns non-2xx to trigger Stripe/Mollie retry on transient failure.

## F3 — Booking engine "on" but DB unset → accepts unpersistable bookings 🔴
`getDb()` returns null when `DATABASE_URL` is unset. If `BOOKING_ENGINE=inhouse` but no DB, a naive adapter would show slots and "take" bookings it can't store.
- **Invariant (fail-closed):** `inhouse` requires **both** the flag **and** a live DB. If `getDb()` is null, the adapter shows **no availability** and the CTA falls back to the contact/FareHarbor path. Never accept money for a booking you can't persist.

## F4 — Timezone / DST 🟠
A 10:00 Ibiza tour shifts ±1h across the Mar/Oct DST boundary → wrong confirmation-email times, guests arrive an hour off.
- **Invariant:** store `timestamptz` (UTC); format with explicit `timeZone: 'Europe/Madrid'`; never do date math in local time. Test both DST transitions.

## F5 — Cancellation / refund + retry double-effects 🟠
Webhook retries double-confirm or double-charge; a cancel fails to restore capacity (seat lost forever) or restores it twice (oversell).
- **Invariant:** confirm and cancel are **idempotent**, keyed by payment-id / booking-id. Cancel restores `booked_count` atomically and **exactly once**. (Refund-window *values* are owner policy input; the *mechanism* is ours.)

## F6 — Non-atomic reserve (insert + decrement split) 🟠
Slot decremented but booking-row insert fails (or vice-versa) → ghost holds or unbacked seats.
- **Invariant:** the slot decrement + booking insert run in **one transaction**: `BEGIN; UPDATE slot … RETURNING; if 0 rows → ROLLBACK + reject; INSERT booking; COMMIT`.

## F7 — Availability/holds drift in the read path 🟡
`getAvailability()` shows seats that are actually held → reserve fails → poor UX.
- **Invariant:** because reserve decrements `booked_count`, availability already nets out holds. The read path must NOT separately exclude pending rows (would double-count).

## Gates BEFORE writing code
A. Decrement-on-reserve (hold + `hold_expires_at`) + cleanup cron restores expired holds atomically.
B. Idempotent confirm + idempotent cancel (reuse webhook-idempotency).
C. Money-safety: payment → booking OR refund, always.
D. Fail-closed when DB unset / misconfigured (no fake availability, no unpersistable bookings).
E. `timestamptz` UTC + explicit `Europe/Madrid` formatting.
F. Single transaction for decrement+insert; single-shot atomic capacity restore on cancel.
G. Owner supplies the refund-window *values*; we build the *mechanism* env-gated off.

## Coherence verdict
**72/100 — BUILD, but gated.** The infra is genuinely present (Drizzle+Postgres, fail-quiet `getDb()`, Stripe/Mollie checkout, webhook idempotency, mailer) so we are not missing a layer. The risk is entirely in **correctness of the money/concurrency path**, which the 7 invariants above pin down. Build the store + atomic reserve + idempotent confirm/cancel **first, with tests**, behind `BOOKING_ENGINE=inhouse` (off) + `DATABASE_URL` — then the UI/admin/checkout-wiring on top.
