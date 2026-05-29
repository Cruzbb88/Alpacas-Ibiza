# Embedded checkout migration plan

Today's `/api/checkout` and `/api/mollie-checkout` routes do a server-side
303-redirect to the payment processor's hosted page. Industry peers (Patreon,
Memberful, Substack) embed payment fields directly into their own page with
Stripe Elements / Mollie Components.

**Why it matters:** hosted-redirect checkouts typically convert 15-25% lower
than embedded ones per Stripe's published data. For the Adopt-a-Paca funnel,
that's the single highest-leverage UX change available — and it's the one
this codebase has NOT done because it requires rewriting the highest-traffic
page in the app.

This doc plans the migration. Not done yet — needs owner sign-off on the
UX direction before flipping the conversion-critical page.

---

## Where we are today

`app/[locale]/adopt/page.tsx` is a server component that renders:
- Hero + tier cards (`components/adopt/adopt-tier-card.tsx`)
- Alpaca picker (`components/adopt/alpaca-picker.tsx`)
- Gift adoption sub-flow (`components/adopt/adopt-gift-adoption.tsx`)
- CTA that fires `GET /api/checkout?tier=monthly&alpaca=…&gift_*=…`
- Server returns 303 → Mollie/Stripe hosted page
- Donor pays on the processor's page
- Processor redirects back to `/adopt?checkout=success`

User leaves our domain mid-funnel. They see Mollie/Stripe chrome. We lose:
- Branded experience consistency
- Conversion analytics on the payment step (no fire of intent-vs-completion)
- Ability to A/B test card vs SEPA vs Apple Pay positioning
- Skeleton / optimistic states ("matching your alpaca…")

---

## Where we want to be

```
[/en/adopt page]
  ↓ user picks tier + alpaca + (optionally) gift
[Embedded payment field (Stripe Elements OR Mollie Components)]
  ↓ enters card / SEPA inline, no redirect
[POST /api/checkout/confirm → creates PaymentIntent server-side]
  ↓ confirms with Stripe/Mollie via JS SDK
[Success state inline — no leaving our domain]
  ↓ webhook delivers subscription.created
[/en/adopt?checkout=success thanks page]
```

Donor never leaves alpacasibiza.com. Brand fidelity stays high. Every step
fires a GA4 event (per the analytics-events catalog) so we can see exact
drop-off between intent and completion.

---

## What needs to change

### Server side

1. Replace `/api/checkout` server-redirect flow with a `/api/checkout/intent`
   endpoint that creates a Stripe PaymentIntent (or Mollie payment in
   `manualConfirmation` mode) and returns the client secret + payment ID.
2. Add a `/api/checkout/confirm` endpoint that takes the confirmed payment
   ID + verifies it with the processor before showing success state. (This
   step is belt-and-braces — the webhook is still the source of truth.)
3. Keep the existing hosted-redirect routes alive behind a feature flag
   (`CHECKOUT_MODE=embedded|hosted`) for fallback / staged rollout.

### Client side

1. Install `@stripe/stripe-js` + `@stripe/react-stripe-js` for Stripe path.
2. Install `@mollie/components-react` (if exists; else hand-roll Mollie's
   `mollie.createComponent` JS API) for Mollie path.
3. Convert `app/[locale]/adopt/page.tsx` into a hybrid: server component
   for hero / tier / alpaca picker, client component for the payment field.
4. New `components/adopt/embedded-checkout.tsx` — renders Elements or
   Components depending on `PAYMENT_VENDOR` env. Wraps Stripe's `<Elements
   stripe={stripePromise}>` or Mollie's `<MollieComponents apiKey>`.
5. Optimistic UI: on payment confirm, immediately show "matching your
   alpaca…" state. Then webhook-driven "all set!" replaces it on
   `?checkout=success` redirect (or via SSE/polling — see step 4 below).

### Webhook integration

1. Webhook handler stays as the source of truth (per existing fail-quiet
   contract). No change to `lib/payment-handlers.ts` event flow.
2. Add a real-time "did my payment actually go through?" signal for the
   client. Options:
   - Poll `/api/checkout/status?paymentId=...` every 2s for ~30s.
   - Server-sent events (SSE) from the success page.
   - Pessimistic UI: show success state only after the webhook fires the
     event bus (per #4 in the architectural-shifts list). Easiest +
     correct.

### Analytics

Pre-existing `lib/analytics-events.ts` already defines
`adopt_checkout_started`. Add two new events for the embedded flow:
- `adopt_payment_field_focused` — donor engaged with the payment input
- `adopt_payment_confirmed` — JS SDK returned success before webhook

This is the funnel resolution the hosted flow can't give us.

---

## Migration sequencing (recommended)

Stage 1 — **infrastructure** (1 day)
- Add `CHECKOUT_MODE` env var; default `hosted`.
- Stand up `/api/checkout/intent` + `/api/checkout/confirm` behind that flag.
- No UI change yet; existing flow keeps working.

Stage 2 — **UI build** (2 days)
- Build `components/adopt/embedded-checkout.tsx` with Stripe Elements first
  (mollie path can lag — Stripe is the easier integration).
- Wire under `if (CHECKOUT_MODE === 'embedded') …`.
- Render in adopt page below the existing tier cards on a feature-flagged
  preview URL `/en/adopt?checkout=embedded-preview`.

Stage 3 — **internal test** (half day)
- Cruz + 1-2 trusted donors run end-to-end test purchases.
- Confirm GA4 funnel events fire correctly.
- Confirm webhook still reconciles subscription state.

Stage 4 — **A/B rollout** (1 week)
- 10% of traffic → embedded, 90% → hosted.
- Compare conversion rates.
- Roll forward to 50% if embedded wins, else back to hosted + diagnose.

Stage 5 — **full cutover** (instant flag flip once A/B confirms)
- Set `CHECKOUT_MODE=embedded` in prod.
- Hosted-redirect code stays in repo for 30 days as rollback.
- Delete hosted code after 30 days clean.

---

## Why this is deferred (today)

1. **Adopt page is the highest-traffic conversion path.** A botched migration
   = direct revenue loss. Two days of careful work beats two hours of "ship
   and pray."
2. **Cruz needs to approve the UX direction.** Embedded checkout changes
   the visual flow of the most-shown page — that's an owner-call, not a
   bot-call.
3. **The hosted flow is functional today.** ROI of migration is real but not
   urgent until conversion volume increases.

**Revisit trigger:**
- First month with > 50 distinct donor sessions on `/adopt` per the GA4
  funnel events (once analytics-events #5 ships and gives us the metric).
- Or: Stripe / Mollie publish a deliverability change that breaks the
  hosted redirect (e.g. Safari intelligent tracking).
- Or: Cruz asks for it.

---

## Files affected when we do it

- `app/api/checkout/route.ts` (split: keep hosted path, add intent path)
- `app/api/mollie-checkout/route.ts` (same)
- `app/api/checkout/intent/route.ts` (new)
- `app/api/checkout/confirm/route.ts` (new)
- `app/[locale]/adopt/page.tsx` (hybrid server/client)
- `components/adopt/embedded-checkout.tsx` (new)
- `lib/integrations/stripe-sdk.ts` (expand Elements support)
- `lib/integrations/payment-mollie.ts` (expand Components support)
- `lib/analytics-events.ts` (add 2 events)
- `package.json` (+@stripe/stripe-js +@stripe/react-stripe-js)

Total scope: ~600 lines of new code, ~200 lines refactored.

---

## What this doc is NOT

It's not an architectural blueprint set in stone. It's the plan we'd
follow if Cruz signed off on the conversion-rate-vs-stability tradeoff.
Until then, the bandaid is the right call.
