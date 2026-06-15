# Booking engine — next-wave work breakdown (for parallel Sonnet agents)

**Context:** the in-house booking engine is built and money-safe. Full spec: `specs/todo/011-inhouse-booking-engine.md` (read §B invariants + §J before touching anything). This doc breaks the remaining §J competitor-driven features into **independent, self-contained tasks** — each can be picked up by a separate agent with no coordination beyond the shared seams noted below.

## Ground rules (every task)
- **Money invariants (§B) are sacred:** no-oversell (atomic conditional UPDATE), idempotent confirm, restore-exactly-once, fail-closed when `getDb()` is null. Never add a write path that bypasses these.
- **Reuse, don't reinvent.** Patterns already in the tree: HMAC tokens (`lib/booking-manage-token.ts`), vendor-neutral pay/refund (`lib/booking/booking-payment.ts` → `createBookingCheckout` / `refundBookingPayment`), email builders (`lib/email-templates.ts`), the orchestrator (`lib/booking/handle-booking-paid.ts`), store transactions (`lib/booking/store.ts`).
- **Verify once:** `npx tsc --noEmit` + `npm test` (one run). Put pure logic in `lib/booking/*.ts` with a sibling `*.test.ts` (the test glob covers `lib/booking/*.test.ts`). Do NOT re-run green suites repeatedly.
- **Schema changes:** edit `lib/db/schema.ts`, then `npx drizzle-kit generate --name=<x>` (incremental ALTER). Confirm it's an ALTER, not a rebuild.
- Tail each task with `/code-review` (and `/security-review` if it touches money or auth).

## The lifecycle "chain" (already wired — extend, don't duplicate)
```
reserve(hold) → checkout(pay) → webhook confirm → [confirmation email]
                                       │
        cron booking-reminders ────────┼──► [24h reminder email] ──► tour ──► [review email]
        cron booking-cleanup (expired holds)
        manage-link (token) ──► /tours/manage ──► cancel ──► [cancellation email] (+refund ≥24h)
```
New emails go through `lib/email-templates.ts` builders + `sendEmail`; new lifecycle triggers are either webhook branches or cron routes (use `runCron`).

---

## TASK A — Self-service RESCHEDULE  (depends on: manage-link ✅, builds beside cancel ✅)
**Goal:** from `/tours/manage`, let a guest move a confirmed booking to another OPEN slot of the same tour, no re-payment when price is equal.
**Files:** new `app/api/booking/reschedule/route.ts`; `lib/booking/store.ts` (`rescheduleBooking`); new email builder `buildBookingRescheduledEmail`; manage page + a client `BookingRescheduleControl` (slot dropdown from `listOpenSlots`).
**Approach:** token-gated (same `verifyBookingManageToken`). In ONE transaction: atomically reserve capacity on the new slot (same conditional-UPDATE guard as `reserveSlot`), then release the old slot's capacity, then point `bookings.slot_id` at the new slot. Reject if new slot is full/closed. **Price delta:** v1 = only allow same-or-lower price (no charge; if lower, optionally refund the difference via `refundBookingPayment` — or disallow price-different reschedules and note it). Send a reschedule-confirmation email with the new manage-link.
**Acceptance:** can't oversell the target slot; old slot capacity restored exactly once; idempotent if the webhook/road retries; emails the new date; unit tests for the capacity move + price-guard.
**Gotchas:** this is the trickiest §J item — the atomic two-slot capacity move is the whole game. Mirror `reserveSlot`/`cancelBooking` SQL-guard discipline. Keep `paymentRef` on the row.

## TASK B — Adult / child / family TICKET TYPES per slot  (largest; schema)
**Goal:** per-slot pricing tiers (e.g. Adult €21.19 / Child €10 / Under-3 free) instead of one flat per-person price. Most universal competitor feature.
**Files:** `lib/db/schema.ts` (new `tour_slot_ticket_types` table OR a JSON column on `tour_slots`; prefer a table: `{slot_id, label, price_eur_minor, sort}`); `bookings` gains a per-type breakdown (`booking_items` table `{booking_id, label, qty, unit_price_eur_minor}`); admin slot form (`components/admin/slot-manager.tsx`) to add tiers; `slot-picker.tsx` to pick qty per tier; `reserveSlot` to take a tier breakdown and compute `amountEurMinor = Σ qty×price`; capacity = total guests across tiers.
**Approach:** keep a single `capacity`/`booked_count` on the slot (seats are seats regardless of tier); tiers only affect price + the line-item breakdown. Reserve still does ONE atomic decrement on total party size.
**Acceptance:** flat-price slots still work (a single "Adult" tier is the default migration); amount = sum of tier line-items; no-oversell on total seats; admin can define tiers; confirmation email lists the breakdown.
**Gotchas:** don't fork the capacity logic per tier — capacity is on total guests. Migration must default existing/flat slots to one tier so nothing breaks.

## TASK C — ADD-ONS at checkout (feed cup / photo)  (depends on: B's `booking_items` is reusable)
**Goal:** optional paid extras added to the booking total.
**Files:** `tour_slots` add-ons config (or a small `add_ons` table per tour); `slot-picker.tsx` checkboxes/qty; `reserveSlot` adds add-on line-items to `amountEurMinor`; confirmation email lists them.
**Approach:** add-ons are line-items on the booking amount, NOT capacity-consuming. Reuse `booking_items` from Task B if built; else a small JSON column.
**Acceptance:** add-ons increase the charged amount correctly; no capacity impact; shown in confirmation + manage page.
**Gotchas:** sequence after Task B (shares the line-item model) to avoid two competing schemas.

## TASK D — PROMO / discount codes on tour checkout  (independent)
**Goal:** apply a discount code at booking checkout (e.g. LOCAL10). Extend the existing adoption discount-code mechanism.
**Files:** find the adoption discount-code logic (`grep ADOPT_DISCOUNT_CODE` / Stripe coupon usage); `slot-picker.tsx` code field; `reserveSlot`/checkout to validate + apply the discount to `amountEurMinor` (server-side validation only — never trust the client amount).
**Approach:** validate the code server-side, compute the discounted amount in `reserveSlot` (or at checkout-create), store the applied code on the booking. Stripe supports coupons natively; Mollie needs the discounted `amount` computed server-side.
**Acceptance:** invalid code → no discount (never errors the booking); discount reflected in the charged amount + confirmation; can't be gamed from the client.
**Gotchas:** the amount is authoritative server-side (`booking.amountEurMinor`); the picker's displayed total is cosmetic.

## TASK E — Wire GDPR erasure (small loose end)
**Goal:** `/api/gdpr-request` deletion requests should actually erase booking PII.
**Files:** `app/api/gdpr-request/route.ts` — on a `deletion` request, call `softDeleteBookingsByEmail(email)` (already built in `lib/booking/store.ts`) and include the erased-count in the owner email.
**Acceptance:** a deletion request nulls matching bookings' name/email + stamps `deleted_at`; fail-closed (no DB → 0, no error).
**Gotchas:** trivial — the helper exists and is case-insensitive; just call it.

---

## Suggested parallelization
- **Independent now:** A (reschedule), D (promo), E (GDPR wire) — no shared schema.
- **Sequence B → C** (C reuses B's `booking_items` line-item model).
- Each agent: read §B + §J first, build in `lib/booking/`, test once, `/code-review` tail.
