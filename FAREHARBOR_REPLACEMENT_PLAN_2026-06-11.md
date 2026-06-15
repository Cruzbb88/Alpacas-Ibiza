# FareHarbor (tour booking) replacement plan
**2026-06-11.** The one big remaining cash lever: tour/experience bookings still run through FareHarbor (~6% added to the customer's price ≈ **~€3,000/yr** at ~€50k of online tours). Adoption already moved to on-site Stripe/Mollie (ADR-021); **tours are tracked separately and need an owner decision.** This is the decision + a ready implementation path. **Owner-blocked on: the go-decision + your FareHarbor contract terms (notice period / lock-in).**

## The 3 options
| Option | Cost/yr | Effort | Kills the 6% surcharge? |
|---|---|---|---|
| **Keep FareHarbor** | €0 fee to you, but **~€3,000/yr taken from customers** + ~2% processing | — | ❌ |
| **A — Bookeo (flat-fee SaaS)** ⭐ fast | **~€360/yr** flat, **0% commission** | 1–2 wk | ✅ immediately |
| **B — In-house on this stack** | ~€700/yr (hosting + Stripe/Mollie ~1.4%) after a one-time build | €8–12k one-time (or in-house dev) | ✅ + full control |

## Why in-house here is *adapter-shaped*, not greenfield
This codebase already has the hard parts:
- **`lib/booking-engine/_types.ts`** — a `BookingEngine` interface (`getAvailability(itemIds, dateRange)`) with `FareHarborAdapter` + `NullAdapter`. A new `InHouseAdapter` slots into the same seam; the availability route + UI don't change. *(Note: `_types.ts` says the seam is "not an invitation to build alternatives" — so doing this needs a new ADR superseding ADR-021's "tours stay FareHarbor at launch.")*
- **On-site checkout already built** — `app/api/{checkout,mollie-checkout,checkout-session}` + webhooks + idempotency + receipts. Tour checkout reuses this.
- **Email confirmations** — `lib/mailer.ts` + `lib/handlers/tour-email-handler.ts` (reminder/review-request) already exist.

**The genuine gap (what's missing for in-house):**
1. **Slot/inventory data model** — tour types × date/time slots × capacity, with atomic "decrement on book" (needs a real DB — Postgres/Supabase; the project currently has no persistent booking store, only in-memory caches per ADR-001).
2. **Booking flow UI** — calendar + slot picker + party size (the availability *display* exists; the *reserve* step doesn't).
3. **Double-booking prevention** — transactional reservation write (optimistic lock / DB transaction).
4. **Admin** — create/close slots, view/cancel/refund bookings.

## Recommended path (phased)
- **Phase 1 — now (owner action, ~1–2 wk):** move tour booking to **Bookeo Standard (~€30/mo, 0% commission)**. Eliminates the ~€3,000/yr customer surcharge immediately, no code build, no lock-in, EU VAT support. Point the existing Book CTAs at the Bookeo flow (a config change in `lib/config.ts`, not a rebuild).
- **Phase 2 — later, only if volume justifies (~6–12 wk dev):** build the **`InHouseAdapter`** against the existing `BookingEngine` seam + a Postgres slot store + Stripe/Mollie checkout. Break-even vs Bookeo ~yr 2–3. Requires a new ADR.
- **Skip:** Cal.com (meeting scheduler — no tour capacity/group/multi-ticket); FareHarbor status-quo (the 6% is the thing we're removing).

## What I can do without the owner's go-decision
Nothing that *commits* the swap (it needs the decision + a superseding ADR). But these are safe prep, if you want them:
- Draft the **superseding ADR** (022: in-house tour booking) capturing the decision + the seam plan.
- Write the **Postgres slot-store schema + `InHouseAdapter` skeleton** behind a `BOOKING_ENGINE=inhouse` flag (defaults off — zero runtime change until flipped), so Phase 2 is a flag-flip + fill-in, mirroring how membership/junior/skein are env-gated today.

## Net
- **Fastest cash win:** Bookeo → ~€3,000/yr of customer-facing fees gone, ~€360/yr cost, your action.
- **Best long-term:** in-house adapter on the seam you already have — but that's a real build and an owner decision, not something to start unprompted.

Full vendor context: [VENDOR_COST_REDUCTION_2026-06-11.md](VENDOR_COST_REDUCTION_2026-06-11.md). FareHarbor decommission timeline for *adoption*: [docs/adr/021-fareharbor-replaced-by-stripe-mollie.md](docs/adr/021-fareharbor-replaced-by-stripe-mollie.md).

---

## Appendix — "Could we build it in-house?" Concrete architecture (researched 2026-06-15)

**Verdict: technically yes, ~5–7 dev-days — but it needs a persistent DB the project deliberately does NOT have** (ADR-001: in-memory only). So in-house booking is a *DB-introducing* change, not just an adapter. Recommendation stands: **Bookeo now; build in-house only if the site is being actively developed AND tour volume grows past ~€1,500/mo** (where Stripe's ~2.9% undercuts FareHarbor's 7–9%).

**The missing piece is a slot store + atomic reserve.** Minimal Postgres/Supabase shape:
```sql
tour_slots ( id uuid pk, tour_id uuid, starts_at timestamptz, capacity int, booked_count int default 0 )
bookings   ( id uuid pk, slot_id uuid, guest_name text, guest_email text, party_size int,
             payment_intent_id text, status text default 'pending', created_at timestamptz default now() )
```
**Double-booking prevention** = one atomic statement (Postgres MVCC, serverless-safe, no explicit lock):
```sql
UPDATE tour_slots SET booked_count = booked_count + $party
 WHERE id = $slot AND booked_count + $party <= capacity
 RETURNING id;   -- 0 rows → slot full → reject
```
**Front-end:** shadcn/ui "Calendar Booking Slots" block (MIT) fed by the `BookingEngine` seam → on confirm, the existing Stripe/Mollie checkout. **Email confirmations** reuse `lib/mailer.ts`.

**The 3 real risks (budget for these, not the happy path):**
1. **Overselling in the pay window** — decrement `booked_count` on checkout-start, restore via webhook on failure/expiry; a cleanup cron releases stale `pending` rows. *(This is the hard one.)*
2. **Timezone/DST** — store `timestamptz` UTC, render in `Europe/Madrid`; test the Oct/Mar transitions (looks fine in dev, breaks confirmation times in prod).
3. **Refund/cancellation policy** — FareHarbor gives you this free; in-house you build the windows + guest comms. Decide the policy before building.

**Build path when you decide:** new ADR-022 (supersede 021's "tours stay FareHarbor") → add `InHouseAdapter implements BookingEngine` behind `BOOKING_ENGINE=inhouse` (defaults off, zero runtime change) → Supabase slot store + atomic RPC → shadcn slot UI → wire existing checkout + mailer. Sources: shadcn.io booking block, Supabase/Postgres MVCC + GiST exclusion-constraint docs, automate.travel FareHarbor pricing 2026 (all retrieved 2026-06-15).
