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
