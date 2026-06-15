---
id: "011"
title: "In-house tour-booking engine (replace FareHarbor)"
priority: P1
depends_on: ["DATABASE_URL provisioned", "STRIPE keys (Stripe-first)"]
est_size: L (multi-session; core built, UI + Mollie + go-live remain)
---

## Context

Tours are booked through FareHarbor, which takes a per-booking cut. This spec is
the **complete** requirement set for taking bookings in-house, so we can see
everything the engine needs and what is still missing — "aware of all."

The engine is gated behind `BOOKING_ENGINE=inhouse` (defaults to FareHarbor).
Design + pre-mortem: [ADR-028](../../docs/adr/028-inhouse-booking-engine.md),
`reports/crystal-ball/cb-006-2026-06-15-inhouse-booking-premortem.md`.

**Status legend:** ✅ built & tested · 🟡 built, not yet wired/verified end-to-end ·
⬜ not built (buildable) · 🔒 owner-data / owner-design blocked.

## Acceptance criteria

### A. Persistence
- [x] ✅ `tour_slots(capacity, booked_count, price_eur_minor, status, starts_at tz, duration_min)` — [lib/db/schema.ts](../../lib/db/schema.ts)
- [x] ✅ `bookings(slot_id fk, party_size, status, hold_expires_at, payment_ref, amount_eur_minor, …)` — same
- [x] ✅ `payment_ref` UNIQUE on nullable column = idempotent confirm (many NULL holds, dup paymentRef collides)
- [x] ✅ Migration generated — [drizzle/0000_inhouse_booking.sql](../../drizzle/0000_inhouse_booking.sql)
- [ ] 🔒 Migration **applied** to a real Postgres (needs `DATABASE_URL`)

### B. Money / concurrency invariants (cb-006 F1–F7)
- [x] ✅ F1/F6 No oversell: `reserveSlot` = one tx, atomic conditional `UPDATE … WHERE booked_count+party<=capacity RETURNING` — [lib/booking/store.ts](../../lib/booking/store.ts)
- [x] ✅ F2 Money-safety: paid-but-unhonorable → refund, never silently keep money — [confirm-payment.ts](../../lib/booking/confirm-payment.ts)
- [x] ✅ F5 Idempotent confirm + restore-exactly-once: status transitions guarded in SQL `WHERE…RETURNING` (not app code) — store.ts
- [x] ✅ F3 Fail-closed: every store fn no-ops when `getDb()` null
- [x] ✅ F4 timestamptz UTC; format via `Europe/Madrid` at the edge — [format-slot.ts](../../lib/booking/format-slot.ts)
- [x] ✅ F7 Holds netted into `booked_count`; read path uses `seatsLeft` only — [store-logic.ts](../../lib/booking/store-logic.ts)
- [x] ✅ Expiry boundary `<`/`>` aligned between confirm and cleanup
- [x] ✅ Unit tests: 11 (store-logic) + 9 (confirm-payment) + 9 (format-slot), all passing
- [ ] ⬜ Concurrency **integration test** against a real/ephemeral Postgres (two parallel reserves of the last seat; double-confirm; double-cancel). Unit tests cover the pure logic; the SQL-guard behavior is only proven by review, not by a live race test.

### C. Money-path — Stripe (default = Mollie, so Stripe must be opted in)
- [x] ✅ `POST /api/booking/reserve` — hold seats, return bookingId — [route](../../app/api/booking/reserve/route.ts)
- [x] ✅ `POST /api/booking/checkout` — Stripe `mode:'payment'`, charge held amount, idempotency-keyed — [route](../../app/api/booking/checkout/route.ts)
- [x] 🟡 `checkout.session.completed` booking branch → confirm or refund — [stripe-webhook](../../app/api/stripe-webhook/route.ts) (built; only proven by review — no live Stripe test event yet)
- [x] ✅ `/api/booking-cleanup` cron releases expired holds — [route](../../app/api/booking-cleanup/route.ts) + [vercel.json](../../vercel.json)
- [x] 🟡 Async EU methods (SEPA/iDEAL/Bancontact) — Stripe side BUILT: `completed`-unpaid extends the hold +7d (so cleanup can't reap a settling SEPA seat), `async_payment_succeeded` re-extends + settles, `async_payment_failed` releases. (Mollie equivalent still in §D.)

### D. Money-path — Mollie (the ADR-019 DEFAULT vendor) — vendor-swappable
- [x] ✅ Checkout is now vendor-neutral — [createBookingCheckout](../../lib/booking/booking-payment.ts) branches on `PAYMENT_VENDOR` (Mollie default / Stripe opt-in), same swap-by-env contract as Adopt. The [checkout route](../../app/api/booking/checkout/route.ts) calls the seam.
- [x] ✅ `mollie-webhook` `booking_id` branch → settle (confirm+email) on `paid`, release hold on failed/expired/canceled, extend hold on open/pending/authorized (async SEPA). Mollie full-refund on un-honorable.
- [x] ✅ Both webhooks share the vendor-neutral [handleBookingPaid](../../lib/booking/handle-booking-paid.ts) orchestrator; refund is injected per vendor.

### E. Availability read
- [x] ✅ `InHouseAdapter.getAvailability` maps slug→`getOpenSlots`→`AvailabilitySlot`, fail-closed, date-validated — [adapter](../../lib/booking-engine/inhouse-adapter.ts)
- [x] ✅ `getBookingEngine` returns it under `BOOKING_ENGINE=inhouse`; defaults unchanged
- [ ] 🟡 `getBookingUrl` still returns the FareHarbor embed URL (read path migrated first; booking CTA not yet pointed at the in-house flow)

### F. Customer + admin UI
- [ ] 🔒 Customer slot-picker page (pick date/time → party size → reserve → checkout) — **owner-design**
- [ ] 🔒 Booking confirmation / thank-you page at `/[locale]/tours/thank-you` (checkout success_url already points here) — owner-design
- [ ] 🔒 Admin slot CRUD (create/close occurrences, set capacity/price/time) — owner-design + owner-data
- [ ] 🔒 Slot seed data (real tour times, capacity, prices) — **owner-data; never invented**

### G. Lifecycle, ops, observability
- [x] ✅ Hold TTL = 20 min; cleanup cron `*/15 * * * *`
- [x] ✅ DB-timeout guard on every booking query/tx (8s)
- [x] ✅ Structured refund-decision logging at the store
- [x] ✅ Booking confirmation **email** to the guest on confirm — [buildBookingConfirmationEmail](../../lib/email-templates.ts) (Madrid-local date, escaped, 6 tests) wired via [handle-stripe-booking-paid.ts](../../lib/booking/handle-stripe-booking-paid.ts)
- [x] ✅ Owner alert on a failed auto-refund / unmatched payment — [notifyOwnerAlert](../../lib/owner-notify.ts) fired from the orchestrator
- [ ] ⬜ `/admin/monitoring` surface for booking volume / refunds (parity with payment monitoring)

### H. Activation gate (env)
- [ ] 🔒 `DATABASE_URL` set (promotes schema to live)
- [ ] 🔒 `BOOKING_ENGINE=inhouse`
- [ ] 🔒 `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `PAYMENT_VENDOR=stripe` (until Mollie path lands)

### I. Gaps surfaced by completeness audit (2026-06-15)
Independent critic verified §A–H (✅ claims hold, test counts correct) and found
these requirements the first draft missed. Nothing here is built.

**Blockers (before the first real booking):**
- [x] 🟡 **SEPA/async auto-refund bug — FIXED on the Stripe side.** `completed`-unpaid now extends the hold +7d and `async_payment_succeeded` re-extends + settles, so a SEPA payer is no longer auto-refunded before settlement. Still requires the Mollie equivalent (§D) since Mollie is the default vendor.
- [x] ✅ Guest **confirmation email** — built (Madrid-local, escaped, tested).
- [ ] ⬜ Guest **booking reference / lookup** (currently `bk_<uuid>` only in the success URL; no retrieval, no gate check-in).
- [x] ✅ **Failed auto-refund → owner alert** — `notifyOwnerAlert` fans to Slack/Telegram/Discord/webhook on `refundOk:false` or unmatched payment.

**Important:**
- [ ] ⬜ **VAT / Spanish IVA** on the tour charge — `automatic_tax:false`; a physical tour to EU consumers is taxable at point of delivery. Owner/accountant decision before the price is shown publicly.
- [ ] ⬜ **Customer cancellation / modification** flow + enforced refund policy (else confirmed seats sit un-resellable until the owner manually cancels).
- [ ] ⬜ **FareHarbor→in-house cutover runbook** — both engines live during seeding = same physical slot sold twice. Need an ordered cutover sequence.
- [x] ✅ **Reserve endpoint idempotency** — built: `bookings.idempotency_key` UNIQUE column; client sends a per-attempt key (slot-picker `useRef`); `reserveSlot` replays the same hold (scoped to slot+party) and rolls back on the concurrent-insert race. Reviewed.
- [ ] ⬜ **Hold-spam DoS** — per-IP in-memory rate limit (ADR-011) isn't shared across serverless instances; a 2-IP bot can hold out a 10-seat slot. Needs a durable cap for small slots.
- [x] ✅ **GDPR for `bookings`** — `bookings.deleted_at` + `softDeleteBookingsByEmail()` (case-insensitive), now WIRED into `/api/gdpr-request`: a deletion request erases matching booking PII and reports the count in the owner email.
- [ ] ⬜ **Sold-out contract** — `getOpenSlots` returns `spotsLeft:0` rows (intentional, for a "sold out" label); document that the picker must disable selection on `spotsLeft===0` so guests don't dead-end on a 409.

**Nice-to-have:**
- [ ] ⬜ i18n booking emails across the 6 locales (`locale` already stored in session metadata — just use it).
- [ ] ⬜ GA4 funnel tracking on reserve→checkout→thank-you (the metric that proves the switch was worth it).
- [ ] ⬜ No-show / check-in marking on confirmed bookings (admin-CRUD adjunct).

### J. Competitor-driven enhancements (grounded research 2026-06-15 — FareHarbor/Peek/Rezdy/Xola/Checkfront)
Ranked GAP-HIGH features that platforms treat as standard AND a small farm needs.
Skipped as enterprise/over-kill for a €21 single-session tour: deposits/BNPL, waitlist,
channel-manager/OTA, reseller API, multi-location, cross-guide resource scheduling.

- [x] ✅ **Pre-tour reminder + post-tour review request** wired to engine bookings — `/api/booking-reminders` cron + `reminder_sent_at`/`review_requested_at` stamps, reuses the existing email builders; `locale` now stored per booking so all comms are localized.
- [x] ✅ **Guest manage-link** (signed HMAC token, no account) — `lib/booking-manage-token.ts` (mirrors donor-receipt pattern; scope/expiry/DoS-cap/constant-time, 7 contract tests), token-gated `/tours/manage` page, link wired into confirmation + reminder emails. Security-reviewed (IDOR-safe; page-scoped `no-referrer` so the token can't leak via Referer). Unlocks cancel/reschedule.
- [x] ✅ **Self-service cancel + reschedule + policy** — DONE. **Cancel:** `/api/booking/cancel` (token-gated), 24h refund policy, vendor-routed refund, cancellation email, owner-alert; **refund-exactly-once** via `claimRefund` across cancel + both webhooks. **Reschedule:** `/api/booking/reschedule` + `rescheduleBooking` (atomic two-slot capacity move, no-oversell, no-upcharge policy, comms-stamps reset, concurrency-guarded with rollback), reschedule email, both controls on `/tours/manage`.
- [x] ✅ **Full automatic email chain** — confirmation → 24h reminder → post-tour review → cancellation, all wired to engine bookings, all localized per `bookings.locale`.
- [ ] ⬜ **Adult/child/family ticket types per slot** — the most universal pricing primitive; per-type price + capacity within a slot (larger schema change). Families are the core audience.
- [ ] ⬜ **Add-ons at checkout** (feed cup / photo pkg) — incremental revenue; line-items added to the booking amount.
- [ ] ⬜ **Promo / discount codes on tour checkout** — extend the existing adoption-discount-code logic to the booking flow.

## Out of scope (this spec)
- Multi-tenant slot isolation (single-tenant alpacasibiza only for now).
- Waitlist / overbooking / partial-party seating.
- Calendar (.ics) attachment on booking confirm (separate, reuses `/api/tour-ics`).

## Go-live blockers (the short list)
1. Owner: provision Postgres + apply migration + seed slots (B, F, H).
2. Build: customer UI + admin CRUD (F) — needs owner design sign-off.
3. ~~Build Mollie checkout + async handling~~ — ✅ DONE: booking payments swap on `PAYMENT_VENDOR` (Mollie default + async hold-extension built on both vendors).
4. Build: guest confirmation email + booking lookup + failed-refund owner alert (G/I).
5. Decide: VAT/IVA treatment on the tour price (I).
