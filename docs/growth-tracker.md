# Growth tracker — deferred items + revisit triggers

This file lists code paths that are intentionally NOT-YET-DONE because the
upgrade has a cost-benefit threshold that hasn't been crossed yet. Each entry
states what would trigger the work AND what to do at that point.

The point: when a trigger fires, future-Cruz should be able to find the right
file and the right action without re-discovering "why didn't we already do this."

If the trigger has been hit, REMOVE the entry from this file and do the work.

---

## 1. In-memory stores → Vercel KV (or equivalent persistence)

**Where:**
- `lib/webhook-idempotency.ts` (Mollie + Stripe webhook dedup)
- `lib/payment-failure-tracker.ts` (dunning escalation counters)
- `lib/vat-tracker.ts` (EU-OSS threshold tally)
- `lib/subscriptions-snapshot-cache.ts` (Mollie subscriptions cache)

**Status:** All four use `globalThis`-pinned `Map`s. State is process-local.
A Vercel Lambda cold start, redeploy, or idle-recycle resets every counter
to zero.

**Why deferred:** ADR 001 (process-scoped persistence). At current Alpacas
Ibiza scale (dozens of subscribers) the tradeoff favours zero infra setup
over perfect retention. Each store carries a "cold-start caveat" banner
where the data surfaces (VAT page, dunning page, owner-mrr-digest email).

**Trigger to revisit (any one):**
- VAT: `ossThresholdRemainingEurMinor` drops below €2,000 (i.e. YTD
  cross-border revenue > €8,000). Cold-start risk becomes a tax-compliance
  risk at this point.
- Dunning: Two consecutive Sunday MRR digests where the dunning section is
  empty AND the owner can name a donor they recall failing. Means cold-start
  is hiding work from the operator.
- Idempotency: Any owner-reported double-send (welcome email twice, donor
  charged twice on same Mollie payment). The retry window for both Stripe
  and Mollie is wide enough that any restart inside it loses dedup.
- Subs cache: Mollie API quota errors visible in Vercel logs, or
  `/admin/analytics/subscriptions` median load-time > 3s.

**What to do when triggered:**
1. Add `@vercel/kv` (or Upstash Redis) — both already supported by Vercel.
2. Replace each `Map` with KV `hset` / `hget` keyed by the same shape.
3. Keep the `globalThis` Map as an L1 cache in front of KV (read-through).
4. Delete the cold-start banners from the admin pages + digest email.
5. Update ADR 001 with the actual migration story.

---

## 2. Admin route auth middleware (consolidation)

**Where:** Every `app/admin/**/page.tsx` repeats:

```ts
const session = await getServerSession(auth)
if (!session) redirect('/admin/login')
```

**Status:** 11 admin pages + every admin API route do this independently.
A new admin page that forgets the check is an unauthenticated route.

**Why deferred:** Next.js App Router's middleware-based auth is awkward when
combined with NextAuth + the file-based routing we're using. A middleware
guard plus per-route check is belt-and-braces; deleting the per-route check
is risk-equivalent to adding a way for a bug in middleware to expose every
admin page at once.

**Trigger to revisit:**
- A new admin route ships without the `getServerSession` check (anyone, any
  PR). The cost of catching it in review becomes higher than the cost of
  centralising.
- A second authentication scheme appears (e.g. a Tony-only role) — the
  per-route check would no longer be a one-liner.

**What to do when triggered:**
1. Add `middleware.ts` matching `/admin/:path*` with the redirect logic.
2. KEEP the per-route check (defence-in-depth: middleware bugs can't expose
   the page on its own).
3. Document the layered model in CLAUDE.md so the redundancy is explained.

---

## 3. `iterateMollieSubscriptions` shared helper

**Where:**
- `app/api/owner-mrr-digest/route.ts` (line 102 onwards — 500-row cap,
  pagination, SubRaw normalisation)
- `app/admin/analytics/subscriptions/page.tsx` (same shape, same cap)

**Status:** Both iterate `mollie.subscriptions.iterate()` with a hard 500-row
cap and the same normalising mapper into a SubscriptionRow shape. Diffs
between the two are accidental rather than intentional.

**Why deferred:** The 500-row cap, the cap message ("KPIs are partial"),
and the SDK-shape any-cast are subtly different in each file. Unifying them
needs (a) extending the shared type to be lossless for both consumers, and
(b) deciding where the cap message lives. Neither is hard, but at <50
subscribers the duplication has not yet caused divergence-bugs.

**Trigger to revisit:**
- A new consumer of Mollie subscriptions iteration appears (a third place
  needing the same logic).
- An off-by-one or capping bug ships that would have been impossible if the
  cap logic were in one place.

**What to do when triggered:**
1. Extract `lib/mollie-subscriptions-iter.ts` exposing
   `iterateMollieSubscriptions(mollie, opts?)` returning typed
   `SubscriptionRow[]` + `{ capped: boolean }`.
2. Make the cap caller-supplied (default 500) so the admin page and the
   weekly digest can tune independently.
3. Both call sites now consume from the helper; remove the duplicates.

---

## 4. Severity-display unification

**Where:** Three different colour palettes for {first, at-risk, action-required}:
- `app/admin/analytics/dunning/page.tsx` — Tailwind colour-100/colour-800 family
- `lib/payment-handlers.ts` + `lib/email-templates.ts` — brand hex (#a44, #ffb300)
- `app/api/mollie-manage/status/route.ts` — Mollie status-badge palette

**Status:** Three palettes, three call sites, no shared helper.

**Why deferred:** A `severityDisplay(s) → {bg, fg, label}` helper would need
a `palette: 'admin' | 'email' | 'badge'` parameter, which adds more wiring
than the duplication costs. The palettes are intentionally surface-specific
(admin reads like a SaaS dashboard, emails are warmer, badges follow
Mollie's visual language).

**Trigger to revisit:**
- A new severity level lands (e.g. 'paused-by-bank', 'fraud-suspected'),
  forcing all three palettes to add a row simultaneously.
- A design pass collapses two of the palettes into one — the remaining
  divergence becomes one consumer, not three.

**What to do when triggered:**
1. Pick the most-stable palette as the canonical and update CLAUDE.md to
   declare it.
2. Convert the other two surfaces by adding a small per-surface mapper from
   the canonical → palette colours, rather than a generic helper.

---

## 5. Mollie customer lookup by email — linear scan

**Where:** `app/api/mollie-manage/route.ts` line 110 — walks
`mollie.customers.iterate()` with `.take(200)` to find one customer by email.

**Status:** Worst case O(n) per portal request. At 200 customers, p95 is
about 800ms. The hard cap protects against the page taking >4s if customer
count explodes.

**Why deferred:** Mollie's API has no email-filter parameter. A
DB-backed email→customerId index is the proper fix, but we don't have a
DB yet — adding one for this single index would be over-engineering.

**Trigger to revisit:**
- Mollie customer count exceeds 200 (the cap will start silently missing
  customers whose `customers.iterate()` order ranks them past the take).
- p95 of POST `/api/mollie-manage` exceeds 2s in Vercel analytics.

**What to do when triggered:**
1. Stand up a small KV-or-DB index `email-lowercase → customerId`.
2. Populate it on every `mollie-checkout` success in the webhook handler.
3. Replace the iterate-scan with a direct index lookup.
4. Keep the iterate-scan as a fallback for customers that pre-date the
   index, with a one-time backfill job.

---

## 6. Stripe SDK any-cast hardening

**Where:** Any place that still uses the `stripeFactory(...)` runtime-import
pattern without `import type { Stripe } from 'stripe'`.

**Status:** The Stripe SDK is dynamically imported (build succeeds without
it installed). The `as any` shape escape was the source of the customers_*
vs customerSubscriptions field-name bug that shipped earlier this quarter.

**Why deferred:** The current pattern uses `unknown` casts in narrow places.
Replacing those with `import type` is a one-PR sweep but currently only one
file (`stripe-webhook/route.ts`) has the pattern left.

**Trigger to revisit:**
- A second `as unknown as { ... }` cast on a Stripe object lands anywhere.
- A new Stripe SDK major version (current is `2024-06-20`).

**What to do when triggered:**
1. Add `import type { Stripe } from 'stripe'` at file top.
2. Replace `unknown` casts with the SDK's own typed shapes.
3. Update CLAUDE.md SDK-shape rule with the canonical example.
