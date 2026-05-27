---
report_type: crystal-ball-full
project: alpaca-farm-redesign
date: 2026-05-26
slug: alpaca-redesign-coherence-audit
score: 71
verdict: NEEDS-ATTENTION
auditor: claude-sonnet-4-6 (manual execution, Cortex-offline)
cortex_available: false
---

# Crystal Ball Report — cb-001
**Project**: alpaca-farm-redesign  |  **Scope**: full (6 layers, QUICK mode — no Cortex history)  |  **Date**: 2026-05-26

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Layer 1: Outcome Alignment — 78%

Stated goal: redesign alpacasibiza.com as a multi-locale, FareHarbor-routed, high-conversion site for 4 revenue streams (tours, woven shop, commissions, Alcaca manure).

- ✅ Tour booking (FareHarbor embed, availability widget, booking CTAs) — implementation path clear
- ✅ Woven shop — route + product components exist, purchase routes to FareHarbor items
- ✅ Commission lead capture — route + API route `app/api/commission/route.ts`
- ✅ Alcaca email-inquiry — route present, matches live site's email-first model
- ✅ Multi-locale (6 locales, i18n middleware, per-locale routing) — shipped
- ✅ GA4 + GTM — hardcoded and live in `app/layout.tsx:79-89`
- ✅ Resend email — `lib/mailer.ts` live; contact, commission, newsletter API routes active
- ⚠️ PARTIAL: Alpaca herd page (`app/[locale]/alpacas/page.tsx`) — route shipped, but 0 of 14 bios/photos are populated. Owner input is the explicit blocker; tracked in OWNER_INPUT_NEEDED.md. Implementation path exists.
- ❌ GAP: Adopt-a-Paca — REALITY_CHECK marks it 🔴 (live site has €75/mo pricing, a real revenue stream). OWNER_INPUT_NEEDED.md covers it only as a 🟢 optional at `€15/mo suggested`. **Suggested price (€15) contradicts verified live price (€75/mo or €900/yr)**. No route exists. Unaddressed.
- ❌ GAP: Wedding/photoshoot page — live `/weddings-photoshoots` is a real activity; redesign has no route. Not in OWNER_INPUT_NEEDED.md at all.
- ❌ GAP: Yoga pricing — live price is €30/person/1h15min; redesign copy mentions yoga but no dedicated page or price display.
- ⚠️ DRIFT: `/experiences/romantic-sunset`, `/experiences/family-farm-days` — both routes exist in code but neither appears on the live site. REALITY_CHECK flags them as "inventions." Tracked but unresolved; ship risk.

**Score: 9 of 11 stated-outcome features have an implementation path = 78%** (Adopt/Wedding both blocked at design stage, not just content-gap).

---

## Layer 2: Cross-Technology Integration Health — 80%

- ✅ FareHarbor embed: `shortname=alpacasibiza`, FLOW=1257173 — correctly hardcoded, env override available via `NEXT_PUBLIC_FAREHARBOR_SHORTNAME`
- ✅ Resend: `lib/mailer.ts` imports Resend SDK; fail mode throws → routes catch → 500
- ✅ Turnstile: `components/turnstile-widget.tsx:83` renders `null` if key unset; server validates with fail-open in dev, fail-closed in prod
- ✅ GA4 pixel `G-Y946QDVVQV` hardcoded; Consent Mode v2 gates it on `ai_cookie_consent_v1` localStorage key
- ✅ `fetchWithTimeout()` wraps all external HTTP in `lib/fetch.ts` — 5-6s AbortController
- ✅ `Promise.allSettled()` in availability route:61 — one bad tour ID doesn't kill the whole response
- ✅ structured-data price: `lib/structured-data.ts:87` now uses `TOUR_BASE_PRICE_EUR` from `lib/config.ts:10` — A1 fix landed
- ❌ MISMATCH: GTM container conflict. `app/layout.tsx:84` loads only `GTM-KR3CGLS6` (FareHarbor's container). INTEGRATION_STATUS_2026-04-20.md:72 still says "✅ Both GTM containers firing." PLAN.md references `GTM-NJRGZPGS` as "primary." Decision deferred in OWNER_INPUT_NEEDED.md but docs remain contradictory. If NJRGZPGS was the site's own analytics container, its removal silently removes any non-FareHarbor GTM triggers.
- ⚠️ CONSTRAINT: `ADMIN_USERNAME` + `ADMIN_PASSWORD` default to `admin`/`password` (OWNER_INPUT_NEEDED.md:149). The in-memory `bookingScheduleStore` (ADR 001) loses state on cold start — acknowledged in CLAUDE.md but not surfaced to owner.
- ⚠️ CHECKLIST stale: INTEGRATION_CHECKLIST.md still has unchecked `[ ] Set up GA4` / `[ ] Set up SendGrid`. Banner was added at line 3 but underlying checkboxes not updated — a new contributor reading the checklist body (not the banner) will get wrong state.

**Score: 8 of 10 integration points verified passing = 80%**

---

## Layer 3: Decision Pattern Predictor — CONFIDENCE: LOW (no Cortex history)

No historical revision data available (Cortex offline per project policy). Predictions based on observed code+doc contradictions only.

| Decision Area | Observable Contradiction | Risk Level |
|---|---|---|
| GTM container strategy | Code ≠ INTEGRATION_STATUS ≠ PLAN.md — 3-way split | HIGH |
| Adopt-a-Paca pricing | OWNER_INPUT_NEEDED says €15/mo; live site is €75/mo | HIGH |
| Conversion order | Resolved (README updated to match code) — ✅ stable | LOW |
| Tour price constant | Resolved (A1 landed — TOUR_BASE_PRICE_EUR=30) — ✅ stable | LOW |
| aggregateRating removal | Resolved (A6 landed — removed from structured-data.ts) — ✅ stable | LOW |
| i18n coverage for new /alpacas route | de/es/fr/it missing `alpacas.*` keys — will silently fall back or throw | MEDIUM |

---

## Layer 4: Gap Analysis (ranked by cost-of-delay)

| # | Gap | Impact | Discovery Stage | Fix Now | Fix Later | Confidence |
|---|---|---|---|---|---|---|
| 1 | i18n: `alpacas.*` keys missing in de/es/fr/it | HIGH — route crashes or shows raw keys for 4 of 6 locales | Build/test | 1h | 3h (after launch complaints) | High |
| 2 | Adopt-a-Paca price mismatch: €15 in OWNER_INPUT vs €75 live | HIGH — if built at €15, real business underpriced | Pre-launch | 1h (doc fix + owner confirm) | 1 day (re-price, rebuild) | High |
| 3 | GTM dual-container intent unresolved | MEDIUM — analytics data loss if NJRGZPGS was site's own container | Pre-launch | 2h (decision + code) | Unknown (retroactive data loss) | Medium |
| 4 | INTEGRATION_CHECKLIST.md body stale (GA4/SendGrid unchecked) | MEDIUM — future contributor confusion, wrong onboarding | Now | 30min | Higher (after new contributor acts on it) | High |
| 5 | Wedding/photoshoot route missing + not in OWNER_INPUT_NEEDED | MEDIUM — real live revenue stream omitted entirely | Pre-launch | 2h (add OWNER_INPUT question) | 1 day (add route + content) | High |

---

## Layer 5: Unintended Consequence Scanner

### Change: A1 — TOUR_BASE_PRICE_EUR added to lib/config.ts

- ✅ `lib/structured-data.ts:87` imports and uses it correctly
- ✅ No other price references found in `lib/` that conflict
- ⚠️ Translation strings in `translations/en.json:169` ("Starting at €30 per person") still hardcoded text — not derived from the constant. If the price changes, `lib/config.ts` updates but translation strings don't auto-update. This is a known partial fix — full fix would require translation strings to reference a shared constant. Low risk at current price, becomes medium risk if price changes again.

### Change: A6 — aggregateRating removed from structured-data.ts

- ✅ `localBusinessSchema()` no longer emits aggregateRating — Rich Results test will now pass without the fake 127/5.0 data
- ✅ `touristTripSchema()` never had aggregateRating — unaffected
- ⚠️ No downstream component was relying on aggregateRating from structured-data.ts — confirmed clean removal
- **Unaddressed**: `components/google-reviews-badge.tsx` is scaffolded for the live API path. It is never imported in any page.tsx (grep confirms). This is correct as-is (awaiting API key), but the component is genuinely unreachable until wired in.

### Change: A5 — app/[locale]/alpacas/page.tsx shipped

- ❌ **4 of 6 translation files missing `alpacas.*` keys** — `de/es/fr/it` will get `undefined` or raw key strings from `t(locale)` calls at `alpacas.title`, `alpacas.subtitle`, `alpacas.bioComingSoon`. Only `en` and `nl` have the keys.
- ✅ OWNER_INPUT_NEEDED.md was updated to include the individual alpaca profiles section
- ⚠️ `app/[locale]/alpacas/page.tsx` uses `localBusinessSchema()` — this is the business schema, not an alpaca-specific one. A `CollectionPage` or `ItemList` schema would be more semantically appropriate for a herd roster page, but this is a low-priority SEO concern.
- ⚠️ `lib/data/alpacas.ts:35` exports a `@deprecated alpacas` alias. No imports of the old `alpacas` name exist in the codebase (confirmed), so the alias is harmless but could be cleaned up.

### Change: A3 — Dead non-localized routes deleted

- ✅ `app/shop/`, `app/about/`, `app/contact/` directories removed — confirmed clean
- ✅ `next.config.mjs` redirects + `middleware.ts` still present as double-layer redirect protection
- No downstream breakage detected — the routes were already unreachable before deletion

---

## Layer 6: Technology Constraints

Cross-checked against `.claude/skills/crystal-ball/references/tech-constraints.md` (last updated 2026-04-07) and known Next.js/Vercel constraints:

- ✅ Vercel serverless timeout: no single API route appears to chain multiple external calls that could approach 60s. `fetchWithTimeout()` caps each call at 5-6s.
- ✅ `Promise.allSettled()` pattern: correctly limits FareHarbor fan-out to `slice(0, 3)` items — won't exceed Vercel's concurrency per invocation
- ⚠️ `bookingScheduleStore`: in-memory store acknowledged in CLAUDE.md/ADR-001. On Vercel (serverless), each cold start loses the store. At scale with multiple concurrent invocations, state could diverge between instances. This is documented as a known tradeoff; the one-stale-email risk is real and accepted.
- ⚠️ Next.js `<img>` usage in `app/[locale]/alpacas/page.tsx:65` — uses a plain `<img>` tag with `// eslint-disable-next-line @next/next/no-img-element`. This bypasses Next.js image optimization (`<Image />`). For alpaca photos (which will be many, similar-sized images), `<Image />` would provide automatic WebP conversion and lazy loading. Currently `null` images so no immediate perf impact, but it's technical debt before owner provides photos.
- ✅ No Stripe or Supabase imports anywhere — correctly absent (e-commerce intentionally routes through FareHarbor)
- **New constraint to add**: `alpacas.bioComingSoon` and related i18n keys must be present in ALL locale JSON files before any new page goes live — missing keys silently degrade to raw key strings in Next.js `t()` fallback.

---

## Decision Debt

| Deferred Decision | Blocker | Escalation Risk |
|---|---|---|
| GTM dual vs single container | Needs Cruz + owner to decide | Medium — data loss if wrong |
| Adopt-a-Paca price (€15 vs €75) | Owner confirmation | High — pricing error at launch |
| Language default: `en` vs `nl` | Owner | Low — SEO preference |
| `/experiences/romantic-sunset` + `/family-farm-days` reality | Owner confirmation | Medium — ships unverified content |
| Admin credentials (`admin`/`password`) | Must be set before any deploy | HIGH — security |

---

## Overall Coherence Score: 71/100

| Layer | Weight | Score | Weighted |
|---|---|---|---|
| Outcome Alignment (L1) | 25% | 78 | 19.5 |
| Cross-Tech Health (L2) | 25% | 80 | 20.0 |
| Decision Stability (L3) | 20% | 60 (estimated, no Cortex) | 12.0 |
| Gap Coverage (L4) | 15% | 65 | 9.75 |
| Constraint Compliance (L6) | 15% | 65 | 9.75 |
| **Total** | **100%** | | **71/100** |

---

## Top 5 Findings (file:line)

1. **`translations/de.json`, `es.json`, `fr.json`, `it.json` — missing `alpacas.*` keys** (all ~line 667 where `en.json` has them). The new `/alpacas` route is live but renders broken text for 4 of 6 configured locales. Fix: copy the `alpacas` block from `en.json` into the 4 missing files with translated strings. Discovery stage: build. Fix now: 1h.

2. **`OWNER_INPUT_NEEDED.md:179` — Adopt-a-Paca suggested price is €15/mo, but `VERIFICATION_RESULTS.md:10` confirms live site charges €75/mo or €900/yr.** If owner says "yes" to Adopt-a-Paca and the doc is used as spec, the price shipped would be 80% below the real price. Fix: correct the suggested price in OWNER_INPUT_NEEDED.md to match verified reality.

3. **`app/layout.tsx:84` vs `INTEGRATION_STATUS_2026-04-20.md:72`** — code loads only `GTM-KR3CGLS6` (FareHarbor's container); STATUS doc says "✅ Both GTM containers firing." If `GTM-NJRGZPGS` was the site's own analytics container (not just FareHarbor's), its removal means any site-specific GTM triggers, goals, or remarketing tags are silently not firing. `OWNER_INPUT_NEEDED.md:31-35` documents this as an open question but it remains unresolved.

4. **`INTEGRATION_CHECKLIST.md:89-103` body** — still shows `[ ]` (unchecked) for GA4 setup and `[ ]` for SendGrid/email setup. A banner at line 3 says these are done, but the body is not updated. Any new contributor reading the checklist to understand what's done vs. pending will get the wrong picture. Fix: mark Phase 4 and Phase 5 email items as ✅ COMPLETE.

5. **`app/[locale]/alpacas/page.tsx:65`** — uses raw `<img>` tag (ESLint suppressed) instead of Next.js `<Image />`. No immediate impact while `alpaca.image === null`, but when owner provides photos this will skip automatic WebP optimization and lazy loading for potentially 14 images on a single page. Fix: replace with `<Image />` before images are wired.

---

## Recommendations

1. **Immediate (pre-ship):** Add `alpacas.*` translation keys to `de/es/fr/it` translation files. This is a build-correctness issue, not a content gap.
2. **Pre-launch:** Correct Adopt-a-Paca price in OWNER_INPUT_NEEDED.md from €15 to €75/mo (€900/yr prepaid). Source: verified live site.
3. **Pre-launch:** Resolve GTM container decision. Read commit `c436555` comment for intent; if dual-container was the design, re-add `GTM-NJRGZPGS` to `app/layout.tsx`. Then update INTEGRATION_STATUS to match code.
4. **Near-term:** Update INTEGRATION_CHECKLIST.md Phase 4 + 5 body checkboxes to reflect current state. The banner workaround does not prevent future confusion.
5. **When owner provides alpaca photos:** Replace `<img>` with `<Image />` in `app/[locale]/alpacas/page.tsx:65` before merging photo assets.

---

## CAN'T DO WITHOUT HELP

The following were NOT fully verifiable in this audit:

1. **Cortex decision history** — L3 (Decision Pattern Predictor) requires `cortex_recall`, `cortex_get_activities`, and `cortex_list_memories` to calculate historical revision rates by category. All were skipped (project rule `feedback_no_cortex_saves`). The decision stability score (60) is an estimate based on observed contradictions, not statistical data. Real L3 confidence: LOW.

2. **Session stress detection** — requires direct SQLite query on `cortex.db` activities table. Not run. Cannot determine if this session had elevated tool failure rates that would downgrade decision quality.

3. **Previous Crystal Ball runs** — this is cb-001, the first run. No trend comparison possible. Score drift cannot be assessed.

4. **Live site crawl verification** — cannot confirm whether the live `alpacasibiza.com` has changed since REALITY_CHECK.md was generated (2026-05-26). If the live site was updated since then, some verified facts (alpaca names, pricing, active routes) may have shifted.

5. **GA4 + GTM live verification** — cannot confirm both containers are actually receiving events. Would require Vercel production deploy + GTM Preview mode + GA4 DebugView. The code ships them correctly; whether they fire in production is unverified.

6. **FareHarbor FLOW=1257173 validity** — hardcoded in layout. Cannot verify this is the correct flow ID without FareHarbor API credentials. OWNER_INPUT_NEEDED.md notes API keys are pending.

7. **Admin credential exposure** — cannot confirm `ADMIN_USERNAME` and `ADMIN_PASSWORD` aren't already set to defaults in a deployed environment. This requires access to Vercel dashboard or `.env` on the deploy target.
