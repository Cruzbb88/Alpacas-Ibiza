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

## 6. Locale-aware donor emails

**Where:**
- `lib/email-templates.ts` — `welcomeAdoptionEmailHtml`, `welcomeAdoptionSubject`,
  `buildAdoptDiscountCodesEmail`, `buildMollieManageEmail`, `buildBillingPortalEmail`
- `lib/payment-handlers.ts` — `buildDonorPaymentFailedHtml`,
  `buildMollieDonorPaymentFailedHtml`

**Status:** Donor locale is captured at checkout via `extractLocaleFromReferer`
but only baked into the success/return URL. It is NEVER written into
Stripe/Mollie payment `metadata`, so every webhook-triggered email is
English-only regardless of donor language. The reminder + review-request
templates partially honour locale but only cover EN/DE/ES — IT/NL/FR fall
through to English.

The `translations/nl.json` file is a stub — the entire `adopt.*` namespace
plus all `adopt.gift.*` keys are literal `"__UNTRANSLATED__: …"` placeholders.
NL donors going through the gift flow see those placeholders verbatim.

**Why deferred:** Three orthogonal blockers:
1. Need human translators for de/it/es/nl/fr versions of every donor email
   (~6 templates × ~5 languages = 30 copy items).
2. The translation-key linter / dead-key pruner doesn't exist yet — 139
   `en.json` keys are currently unused in code; before adding more keys we
   need to know what's live.
3. Threading `locale` through every email builder requires a one-PR sweep
   touching ~12 sites.

**Trigger to revisit:**
- The first paying NL/IT/FR donor reports the welcome email is "in English."
- Or: any of `welcomeAdoptionSubject(tier, isGiftWelcome)` callsites needs
  a third arg for a non-translation reason — at that point we add `locale`
  along with the new arg.

**What to do when triggered:**
1. Record `locale` into `metadata` on every checkout route (one line each in
   `app/api/checkout/route.ts` and `app/api/mollie-checkout/route.ts`).
2. Read `locale` back in `lib/payment-handlers.ts` from
   `session.metadata?.locale` / `payment.metadata?.locale`.
3. Thread it through every email builder as an optional 3rd-arg, defaulting
   to 'en' so backward-compat holds.
4. Fill `translations/nl.json` from a translator (currently a stub).
5. Replace all `adopt.gift.__UNTRANSLATED__` placeholders in de/it/es/nl/fr.

---

## 7. Hard-coded SITE_BASE_URL violations

**Where (13 files):**
- `app/layout.tsx` (alternates.languages + RSS link)
- `app/[locale]/layout.tsx`
- `app/[locale]/journal/[slug]/page.tsx`
- `app/[locale]/experiences/family-farm-days/page.tsx`
- `app/[locale]/experiences/corporate-team-building/page.tsx`
- `app/[locale]/shop/{woven,commission,alcaca}/page.tsx`
- `app/sitemap.ts`
- `lib/structured-data.ts` (feeds every JSON-LD breadcrumb)
- `components/page-breadcrumbs.tsx`
- `lib/email-templates.ts` (admin dashboard links in owner email)

**Status:** Each hard-codes `https://alpacasibiza.com` literally instead of
importing `SITE_BASE_URL` from `lib/config.ts`. Per ADR 017, the env-derived
constant is canonical so a future preview deploy / staging / multi-tenant
environment can swap host without re-touching 13 files.

**Why deferred:** All are read-only render paths (sitemap, JSON-LD,
breadcrumbs) — none are payment-critical, and the failure mode of the bug
"users see alpacasibiza.com in their breadcrumbs from a staging env" is
visible (not silent) and recoverable.

**Trigger to revisit:**
- A staging deploy hits one of these pages and the live URLs leak.
- Multi-tenant lands (ADR 020 implementation) — at that point every literal
  `alpacasibiza.com` becomes a tenant-bleed risk.

**What to do when triggered:**
1. One PR sweep: import `SITE_BASE_URL` and replace every literal.
2. Add a unit test that greps the codebase for `https://alpacasibiza.com`
   string literals and fails CI if any new ones appear outside the
   `lib/tenants/` registry.

---

## 8. Tenant ID hard-coded to 'alpacasibiza'

**Where (4 production sites):**
- `app/api/mollie-checkout/route.ts:149` — `tenantId: 'alpacasibiza'`
- `app/api/mollie-webhook/route.ts:294` — `tenantId: payment.metadata?.tenantId ?? 'alpacasibiza'`
- `app/api/mollie-manage/update-payment/route.ts:195` — `tenantId: sub.metadata?.tenantId ?? 'alpacasibiza'`
- `app/api/availability/route.ts:11` + `app/api/owner-digest/route.ts:36` — `FAREHARBOR_SHORTNAME || 'alpacasibiza'`

**Status:** Single-tenant blocker for Stripe Connect / Mollie Connect
(ADR 020). The tenant registry at `lib/tenants/server.ts` resolves a host
to a tenant config but the API routes don't read from it yet.

**Why deferred:** No tenant #2 signed yet. Adding host-derived tenant
resolution to the API routes is wasted work until a second customer is
on the platform.

**Trigger to revisit:**
- Tenant #2 signs an LOI / contract.
- Or: a need arises to deploy a staging instance on a different domain
  (e.g. `staging.alpacasibiza.com` vs `alpacasibiza.com`) and the routes
  start writing wrong tenant metadata.

**What to do when triggered:**
1. Wire `getTenant(request)` from `lib/tenants/server.ts` into
   `mollie-checkout/route.ts` line 149 first (the write path).
2. Remove the `'alpacasibiza'` fallback in `lib/tenants/server.ts`; replace
   with explicit 404 on unknown host.
3. Backfill any existing Mollie metadata that's missing `tenantId` via a
   one-time admin script.

---

## 9. Test coverage gaps (post-1561178 inventory)

The Sonnet 4 review listed 15 uncovered boundaries. Commit AFTER 1561178
added regression tests for the 6 highest-value (VAT year boundary,
prune cutoff, Bearer auth, gift message length, sendDate window, sanitize
error logs). Still uncovered:

- `payment-handlers.ts` gift owner-notify subject prefix (Stripe + Mollie
  `[Adopt-a-Paca] 🎁 GIFT` prefix has no assertion)
- `owner-mrr-digest` ISO-week boundary when today IS Monday 00:00 UTC
  (needs to extract the ISO-week math into a pure helper to test)
- `owner-mrr-digest` newCount7d 'canceled-before-window' straggler filter
- `owner-mrr-digest` DST mid-window timezone drift
- `owner-notify` actual 2s timeout firing (needs fake-timers integration)

**Why deferred:** First batch covers the bugs that would silently break
EU VAT compliance / lock the donor out of their portal. Remaining items
are mostly UX edge cases or need ISO-week extraction first.

**Trigger to revisit:**
- A regression on any of the above ships and gets reported.
- The `owner-mrr-digest` route is refactored — extract ISO-week to
  `lib/iso-week.ts` and test pure-function style.

**What to do when triggered:**
1. Extract `lib/iso-week.ts` exposing `currentIsoWeekUtc(now: Date) → {start, end}`.
2. Move newCount7d / canceledCount7d filters into pure helpers that take a
   row + window pair.
3. Property-test fake-timers around owner-notify with a sentinel pending
   fetch that never resolves.

---

## 10. Stripe SDK any-cast hardening (renamed from item 6)

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
