# ADR 028 — In-house tour-booking engine (flagged, off by default)

**Status:** Accepted · 2026-06-15
**Supersedes:** none (refines [ADR 021 — FareHarbor replaced by Stripe/Mollie](021-fareharbor-replaced-by-stripe-mollie.md): tours stay on FareHarbor *at launch*, but the in-house path now exists behind a flag)
**Related:** [ADR 015 — Stripe primary, Mollie deferred](015-stripe-primary-mollie-deferred.md), [ADR 017 — SITE_BASE_URL mandatory for redirects](017-site-base-url-mandatory-for-redirects.md), [ADR 018 — optional SDK dynamic imports](018-optional-sdk-dynamic-imports.md), pre-mortem `reports/crystal-ball/cb-006-2026-06-15-inhouse-booking-premortem.md`

## Context

Tours are booked through FareHarbor, which takes a per-booking cut. Owner asked
whether we could take bookings in-house and "keep more cash." The project already
has every dependency an in-house engine needs:

- Drizzle + Postgres (`lib/db/`), with `getDb()` fail-quiet null when
  `DATABASE_URL` is unset (ADR-style activation contract already in place).
- Stripe + Mollie checkout + webhooks already wired and hardened.
- A `BookingEngine` seam (`lib/booking-engine/_types.ts`) whose `BookingEngineKind`
  already reserved `'own'`.

So the only genuinely *missing* thing was the booking domain itself (slots,
holds, confirmation). A crystal-ball pre-mortem (cb-006, 72/100 "BUILD but
gated") surfaced 7 failure modes; the design below addresses each.

## Decision

**Build an in-house booking engine, gated behind `BOOKING_ENGINE=inhouse`,
defaulting OFF. FareHarbor remains the default engine until the owner flips the
flag and provisions a database.** Stripe-first; Mollie is the symmetric
follow-up.

### Data model (`lib/db/schema.ts`)

- `tour_slots(capacity, booked_count, price_eur_minor, status, …)` — one bookable
  occurrence. `booked_count` already nets out active holds.
- `bookings(slot_id, party_size, status pending|confirmed|cancelled,
  hold_expires_at, payment_ref, amount_eur_minor, …)`.
- **`payment_ref` UNIQUE on a nullable column** = idempotent confirm: Postgres
  allows many NULLs (un-paid holds never collide), but a duplicate webhook with
  the same `payment_ref` collides instead of double-confirming.
- Migration: `drizzle/0000_inhouse_booking.sql`.

### Money/concurrency invariants (the part that had to be right — cb-006 F1–F7)

| # | Risk | Mechanism |
|---|------|-----------|
| F1/F6 | Oversell in the pay window | `reserveSlot()` = **one** transaction: atomic conditional `UPDATE tour_slots SET booked_count=booked_count+party WHERE id AND status='open' AND booked_count+party<=capacity RETURNING`, then insert pending booking. Two concurrent reserves can't both win. |
| F2/F5 | Payment for a seat we can't honor | `confirmBooking()` → `decideConfirm()`: confirmed+same ref = idempotent no-op; confirmed+diff ref = **refund** (conflict); cancelled = refund; pending+expired hold = refund; else confirm. `handleBookingPaymentPaid()` executes the refund side-effect. **Never keep money for a seat we can't give.** |
| F3 | DB unset → fabricated state | Every store fn is fail-closed on `getDb()` null: `getOpenSlots`→[], `reserveSlot`→`unavailable`, routes→503. |
| F4 | Timezone/DST | All timestamps `timestamptz` UTC; formatted via `Intl` `timeZone: 'Europe/Madrid'` at the edge (`lib/booking/format-slot.ts`). |
| F5 | Double capacity-restore | `decideCancel()` returns `noop` for already-cancelled; restore guarded by `GREATEST(booked_count - party, 0)`. |
| F7 | Holds double-counted in availability | `seatsLeft = capacity - booked_count` (holds already in `booked_count`); read path must NOT separately subtract pending rows. |

Pure decision logic lives in `lib/booking/store-logic.ts` (no DB, 11 unit tests);
DB transactions wrap it in `lib/booking/store.ts`.

### Money-path (Stripe-first)

1. `POST /api/booking/reserve` → `reserveSlot()` holds seats (20-min `hold_expires_at`), returns `bookingId`.
2. `POST /api/booking/checkout` → Stripe Checkout `mode:'payment'`, inline `price_data` for `amount_eur_minor`, `metadata.booking_id`. Re-validates pending + non-expired before charging.
3. `checkout.session.completed` (booking_id branch in `/api/stripe-webhook`) → `handleBookingPaymentPaid()` → confirm, or refund via `stripe.refunds.create({ payment_intent })`.
4. `/api/booking-cleanup` (Vercel cron, `*/15 * * * *`) → `releaseExpiredHolds()` restores capacity for un-paid expired holds.

### Availability read

`InHouseAdapter` (`lib/booking-engine/inhouse-adapter.ts`) maps each tour slug →
`getOpenSlots()` → `AvailabilitySlot`. `getBookingEngine()` returns it when
`BOOKING_ENGINE=inhouse`; **the booking CTA still uses the FareHarbor embed URL**
until the customer-facing slot-picker UI lands — read path migrates first.

## Consequences

- **Activation = owner action**, not a deploy: set `DATABASE_URL`, apply the
  migration, set `BOOKING_ENGINE=inhouse`, and seed `tour_slots` (owner data —
  capacity/price/times). Until then the site is byte-for-byte the FareHarbor
  behavior; every store fn no-ops.
- **Cleanup cadence depends on Vercel plan.** `*/15 * * * *` needs Pro-tier
  sub-daily crons. On Hobby (daily-only), an expired hold occupies capacity until
  the daily sweep — mitigated because confirm-time re-validation still refunds
  expired holds, so money is never wrongly kept; only capacity accuracy lags.
- **Stripe-only today.** Mollie booking checkout + a `mollie-webhook` booking_id
  branch are the symmetric follow-up. With `PAYMENT_VENDOR=mollie` (ADR-019
  default) the booking checkout route 503s until that lands — flag stays off.
- **Still to build before go-live:** customer slot-picker UI + admin slot CRUD
  (owner-design — deferred, no fabricated design choices).

## New env vars

- `DATABASE_URL` — promotes from "schema only" to live booking persistence (Tier 1 *when* `BOOKING_ENGINE=inhouse`).
- `BOOKING_ENGINE=inhouse` — activates the in-house read + money-path. Defaults to FareHarbor.
