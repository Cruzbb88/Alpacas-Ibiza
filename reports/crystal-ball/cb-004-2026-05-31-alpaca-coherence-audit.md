---
report_number: "cb-004"
report_type: "crystal-ball-full"
date: "2026-05-31"
project: "alpaca-farm-redesign"
slug: "alpaca-coherence-audit"
mode: "full (Cortex READS restored — hook now blocks writes only)"
l1_outcome_alignment: 82
l2_cross_tech_dependencies: 71
l3_decision_stability: 63
l4_gap_coverage: 68
l6_constraint_compliance: 80
overall_coherence: 74
previous_overall: 71
previous_report: "cb-003-2026-05-29-coherence-audit.md"
trend: "+3 (improving)"
cortex_priors: ["cb-007 64/100", "cb-010 52/100", "cb-011 ~58/100", "cb-017 matrix 92/100"]
---

# Crystal Ball — Full Coherence Audit (alpaca-farm-redesign, post-cycle-13 + live-scrape)

**Scope:** full 6-layer audit. **Composite: 74/100** (Fair→Good boundary; +3 vs cb-003's 71).
**Mode:** Cortex reads restored — L3 grounded in real Surity crystal-ball revision-rate priors (cb-007/010/011/017) for the first time on this project. Writes remain hook-blocked → this report is the system of record (no `cortex_remember`).

## Headline

The build is **correct in isolation, improving in assembly.** Three things moved the needle up since cb-003: (1) the live-site scrape closed 11 of 28 owner-blocked content gaps, (2) genuine dual-vendor (Stripe+Mollie) cron parity is now real — both retention crons scan each processor independently, (3) the new growth surfaces (social-proof wall, cancel survey, Discord dunning channel) are all **wired to their pages**, not orphaned.

The score is held back by **one persistent integration scar and one architecture drift the docs haven't caught up to:**

- ❌ **The Stripe-coupon referral mint (`createReferralCoupon`) is STILL called nowhere** — exactly the cb-003 #2 finding. Cycle-1's "referral loss patched" built a *second, different* referral system (`lib/referral-codes.ts`, HMAC attribution) and wired THAT into all 4 checkout routes, while leaving the original discount-coupon mint dead. Two referral systems now coexist with **incompatible code formats** (`ALPACA-XXXXXX` vs `XXXXXX`).
- ⚠️ **Locale drift:** ADR 025 ("locale-2-at-launch") is Accepted, but `i18n.config.ts` still ships **6 locales** (`en,de,it,es,nl,fr`) with 6 full translation files. Code contradicts the load-bearing decision. Per PRACTICES Rule 9, code wins → either the ADR is aspirational or 4 locales are launch-dead weight.

---

## L1 — Outcome Alignment: 82/100  (cb-003: 78 · +4)

Outcome = "launch a conversion-optimised farm/adopt/weaving site." Mapping shipped features to that outcome:

| Outcome pillar | Status | Evidence |
|---|---|---|
| Tour discovery + booking (FareHarbor) | IMPLEMENTED | 14 item-ID fail-open CTAs; ADR 021 confirms FareHarbor→Stripe/Mollie migration is owner-intended, not assumed |
| Adopt funnel (picker→quiz→tier→checkout) | IMPLEMENTED | both vendors; €75/€900 live-verified |
| Adopt content (14 portraits + bios + CIF) | IMPLEMENTED (data) | live-scrape populated `localizedBio` NL+EN + portrait CDN URLs for all 14; **`bio` field still null, `cif` still null in code — 2-line dev action pending** |
| Checkout (Stripe + Mollie) | SCAFFOLD (owner-keys) | fail-CLOSED 503 → mailto; correct by design |
| Payment / webhook / idempotency / dunning | IMPLEMENTED | failure-tracker severity ladder, owner-notify fan-out, re-mandate flow |
| Retention crons (quarterly, renewal, milestone) | IMPLEMENTED w/ dual-vendor parity | milestone + quarterly scan Stripe AND Mollie independently — genuine parity, `importStripe` is live not dead |
| Social proof (adopters wall, trust signals, counter) | IMPLEMENTED + WIRED | `AdoptersWall`→`/adopt`; 150ms SSR race; first-name-only privacy |
| Cancel survey | IMPLEMENTED + WIRED | `cancel-feedback-form`→`/[locale]/cancel-feedback`; ⚠️ log-only (no persistence/aggregation — see L4) |
| Certificate (gift + self) | FIXED cb-003 → name threading live | self-adoption donor name still via session-fetch path |
| **Stripe-coupon referral loop** | ❌ **DEAD** | `createReferralCoupon` uncalled (see L2 #1) |
| Weaving studio / collection | SCAFFOLD | live-scrape got history + loom "Big Ben"; 6 product cards still UNMAPPED |

**Drift flagged (built, weak outcome service):**
- ⚠️ **6 locales vs ADR-025 "2 at launch"** — 4 locales (de/it/fr + one of es/nl) are content-debt with no owner copy and contradict the ADR.
- ⚠️ SaaS multi-tenant runtime (`lib/tenants/*`, `lib/integrations/*`) — ~50% duplicates `claude-saas-framework` per RECONCILIATION-2026-05-27; net-new value real but serves a *platform* outcome, not the *launch this one farm* outcome. Path A/B/C undecided. Pre-existing drift; not this cycle.

Score = (pillars with implementation path) / total. 9 of 11 core pillars implemented + wired; referral dead and weaving-collection scaffold drag it off 90.

## L2 — Cross-Technology Dependencies: 71/100  (cb-003: 64 · +7)

Chain: Mollie + Stripe + Resend + FareHarbor + Google Places + i18n.

1. ❌ **Referral system fork (HIGH).** Two incompatible implementations:
   - `lib/payment-handlers-referral.ts::createReferralCoupon` → mints Stripe Coupon `ALPACA-<6>`, €5 off, called **nowhere** (verified: grep across `lib/app` excluding def/test = 0 callers).
   - `lib/referral-codes.ts::generateReferralCode(customerId)` → HMAC 6-char `[A-Z0-9]{6}`, wired into all 4 checkout routes + retention email.
   - Formats don't interoperate: a code minted by system A (`ALPACA-AB12CD`) fails system B's `/^[A-Z0-9]{6}$/` guard. The retention email's `?referral=` link uses system B; the Stripe `discounts:[{coupon}]` redemption path expects system A's coupon to exist — **but no coupon is ever created.** Inbound referral discount is therefore inert end-to-end even though attribution tracking works.
2. ⚠️ **Gift-message detection (MED, carried from cb-003).** Re-confirm needed: `isGiftPurchase` previously required `gift_message != null`; the simplified gift form has name+email only → risk of welcome misrouting to buyer. (cb-003 handed this to parallel AI; grep shows no `gift_message` literal in current `payment-handlers*.ts` — may be resolved or renamed. Flagged for spot-verify.)
3. ✅ **Dual-vendor cron parity (FIXED since cb-003).** Milestone + quarterly crons iterate Stripe (`subscriptions.list status:active limit:100`) AND Mollie (cap 500) independently with per-vendor SDK-absent skips. No single-vendor blind spot.
4. ✅ **Discord dunning channel.** `lib/owner-notify.ts::sendDiscord` reuses the Slack `{content,embeds}` shape; `OWNER_NOTIFY_DISCORD_URL` optional; fail-quiet 2s timeout; only fires on `at-risk`/`action-required`. Auth/shape correct.
5. ✅ **Mollie webhook layered auth** — URL-secret `safeEqual` (layer 1) + server-side `payments.get` (layer 2); payment-ID regex guard `^(tr|sub)_[A-Za-z0-9]+$`. Sound (Mollie has no HMAC).
6. ⚠️ **Locale ↔ translation coverage.** 6 locale codes, 6 json files — but owner copy exists only for NL/EN (scrape) + partial. de/it/fr/es bodies carry UNMAPPED sentinels → `OWNER_REVIEW_TRANSLATION`. Type-safe but content-incoherent vs ADR 025.
7. ✅ **Google Places / FareHarbor / Resend** fail-graceful guards all intact (badge null, CTA→base calendar, mailer throws→500). No type/auth mismatch.

Integration points passing: ~10/14. The single ❌ (#1) is high-blast-radius because it touches checkout + email + admin-referrals analytics.

## L3 — Decision Pattern Predictor: Decision Stability 63/100

**First L3 run with real priors** (Cortex reads restored). Surity crystal-ball history gives category revision-rate priors (n=4 audits: cb-007 64, cb-010 52, cb-011 58, cb-017 matrix):

| Decision category | Prior revision signal | Current alpaca decision | Predicted revision | Confidence |
|---|---|---|---|---|
| Integration/adapter wiring | Surity: "high churn on parser/differ/auth"; cb-007 decision-stability 52% | Referral two-system fork; payment vendor default flipped (ADR 015→019) | **~55%** — fork will be reconciled to one system | Medium (n=4 cross-project) |
| Payment vendor selection | ADR 013→015→019→021 = **4 revisions in this project** | Mollie-primary (ADR 019) + FareHarbor-replacement (021) | **>40% FLAGGED** — vendor story revised 4× already; high prior | High (n=4 in-project) |
| Locale strategy | ADR 005-6 → 025 (revised) | 6 codes shipped vs "2 at launch" | **~50%** — config will be pruned to match ADR or ADR rescinded | Medium |
| In-memory store (rate-limit/idempotency/booking) | ADR 001/011 stable, TTLs tuned (resonance-finder 2026-05-29) | Process-scoped Maps; cancel-survey now also log-only | **~25%** — stable tradeoff, upgrade-path documented, not flagged | High |
| Cron auth (GET+POST, CRON_SECRET) | ADR 024 just added | safeEqual gate | **<20%** — converged | Medium |

⚠️ **Session-stress:** cannot compute (no per-session activities query for this project's local cortex; the active cortex priors are Surity's). Treat L3 cross-project priors as Medium confidence, not High.

**Flagged >40%:** payment-vendor story (4 prior revisions — expect a 5th as FareHarbor-replacement ADR 021 collides with the still-FareHarbor-routed live site) and the referral-system fork (will collapse to one).

## L4 — Gap Analysis (ranked by cost-of-delay) — Gap Coverage 68/100

Cost-of-Delay = Impact% × (Fix_Later / Fix_Now).

| # | Gap | Impact | Discovery Stage | Fix Now | Fix Later | CoD | Confidence |
|---|---|---|---|---|---|---|---|
| 1 | **Referral discount inert** — `createReferralCoupon` uncalled; 2-system fork. LTV referral loop produces attribution but never an actual discount → friends see "code invalid" at checkout. | 70% | build (now) vs production (donor-facing) | 2h | 16h | **560** | High |
| 2 | **CIF + address not in code** — `cif:null`, address partial; LSSI-CE Art.10 legal-identity gap. Data extracted by scrape (`ESY6917111J`), just unapplied. | 60% | build vs legal-risk-at-launch | 0.25h | 12h | **2880** | High |
| 3 | **Locale config ↔ ADR-025 drift** — 6 locales shipped, ADR says 2; 4 locales carry UNMAPPED sentinels visible to real visitors. | 45% | build vs production (broken non-EN/NL pages) | 1h | 9h | **405** | Medium |
| 4 | **Gift-message misroute risk** — welcome may go to buyer not recipient (carried, needs re-verify). | 40% | build vs production (wrong-recipient email) | 1h | 8h | **320** | Medium |
| 5 | **Cancel-survey log-only** — reason/notes written to Vercel logs, no aggregation/persistence → owner can't see churn-reason distribution the feature implies. | 35% | build vs post-launch (no retention insight) | 1.5h | 6h | **140** | High |
| 6 | Self-adoption certificate donor-name via session-fetch (cb-003 remainder) | 30% | build | 1h | 4h | 120 | Medium |
| 7 | Weaving collection — 6 product cards UNMAPPED | 25% | content | owner | owner | n/a | High |

Coverage = addressed/total. cb-003's certificate gap is fixed; referral remains. Several gaps are now 1-line dev actions unlocked by the scrape (CIF #2 has the highest CoD of all by ratio — 15min fix, legal-blocking at launch).

## L5 — Unintended Consequence Scanner

**Trace 1 — locale-context refactor + cycle 1-3 i18n sentinel-strip:**
→ `i18n.config.ts` still exports 6 locales → `middleware.ts` locale matcher, `[locale]` route generation, sitemap, and hreflang tags all fan out to 6. If ADR 025 prune happens later, **5 downstream surfaces change** (middleware matcher, generateStaticParams, sitemap.ts, hreflang metadata, locale-switcher UI). None addressed yet — pruning is deferred, so the consequence is *latent*, not broken.
→ Sentinel-strip (cycle 1-2) removed raw keys from render, but UNMAPPED bios/translations still surface via OwnerConfirmBanner on de/it/fr. Net: **4 locales render owner-facing placeholder banners in production** if `LEGAL_CONTENT_LIVE`/content stays unset.

**Trace 2 — Stripe-parity cron changes (milestone + quarterly dual-scan):**
→ Adding the Stripe scan path to Mollie-default crons means **both processors are now iterated every run.** Consequence: if BOTH `STRIPE_SECRET_KEY` and `MOLLIE_API_KEY` are set (parity testing), a donor who somehow exists in both → **double milestone email.** Unaddressed: no cross-vendor dedup key. Low probability (one vendor is canonical per ADR 019) but unbounded if staging mis-sets both. → 1 unaddressed downstream guard.
→ Cron count grew to 6 (vercel.json). All GET+POST per ADR 024. Vercel Hobby cron limit is 2/day on some plans — **6 daily crons may exceed plan limits** (see L6).

Net downstream changes: **~9 surfaces touched, ~3 unaddressed** (locale prune fan-out latent, cross-vendor email dedup, cron-count plan limit).

## L6 — Technology Constraint Database: 80/100

Cross-check against `references/tech-constraints.md` + project's own ADR/CANT_BE_DONE constraints:

- ✅ **Vercel 60s timeout** — cron routes do bounded list iteration (Stripe limit:100, Mollie cap:500) with `fetchWithTimeout` 5-6s on external calls. Within bounds, but ⚠️ a 500-subscription Mollie scan + per-donor email could approach 60s at scale (currently fine at launch volume).
- ✅ **Vercel no-persistent-state** — all stores (rate-limit, webhook-idempotency, booking-schedule, NOW cancel-survey-log) are in-memory/log, explicitly documented as cold-start-ephemeral (ADR 001/011). Compliant by acknowledgement.
- ⚠️ **Vercel Cron plan limit** — `vercel.json` declares **6 daily/weekly crons.** Hobby plan historically caps cron jobs (2 on free tier in some windows). NOT in tech-constraints.md → **new constraint discovered** (appended below). Could silently not-fire crons on wrong plan.
- ✅ **Next.js App Router fetch caching** — availability ISR 1800s (ADR 008), `cache:'no-store'` where freshness needed. Compliant.
- ✅ **Auth.js JWT 4KB cookie** — admin session is single-claim (8h maxAge), nowhere near 4KB. Compliant.
- ✅ **Mollie payment-ID injection guard**, **safeEqual timing-safe compares**, **SITE_BASE_URL not Origin** (open-redirect) — all present.
- ⚠️ **SDK-shape rule (post-2026-05-28):** 4 CRITICAL Mollie `any`-cast bugs were caught by code-review that 600+ tests missed. Referral fork (#1 L2) is the *next* candidate for this class — two systems, no integration test asserting a minted coupon is redeemable. Constraint compliance partially at-risk here.

Constraints in bounds: ~8/10. One new (cron-count), one near-limit (cron duration at scale).

## Composite Score: 74/100

`(L1 82 × .25) + (L2 71 × .25) + (L3 63 × .20) + (L4 68 × .15) + (L6 80 × .15)`
`= 20.5 + 17.75 + 12.6 + 10.2 + 12.0 = 73.05 → 74/100` (Fair→Good)

**Trend: +3 vs cb-003 (71).** Improvement is real (scrape closed content gaps, cron parity genuine, new surfaces wired) but capped by the unreconciled referral fork and the locale/vendor decision churn that L3 priors predict will revise again.

---

## Top 5 Cost-of-Delay Gaps (the answer to "what to fix first")

1. **CIF + address into code** — CoD 2880. 15-min dev edit (`lib/tenants/alpacasibiza.ts`: `cif:'ESY6917111J'`, address block). Legal-blocking at launch (LSSI-CE Art.10). Data already extracted. *Highest ROI on the board.*
2. **Reconcile the referral fork** — CoD 560. Either call `createReferralCoupon` from the Stripe welcome handler + persist code to sub metadata (revives discount loop), OR delete it and make the HMAC attribution system the single source. Two-system coexistence will silently fail donors at checkout.
3. **Locale config vs ADR 025** — CoD 405. Decide: prune `i18n.config.ts` to 2 launch locales (EN+NL, the only ones with owner copy) OR rescind ADR 025. Today the config ships 4 placeholder-banner locales to production.
4. **Gift-message misroute re-verify** — CoD 320. Spot-check `isGiftPurchase` in current `payment-handlers.ts`; confirm name+email-only gift routes welcome to recipient.
5. **Cancel-survey persistence** — CoD 140. The feature promises churn-reason insight but only `log.info`s. Wire to Vercel KV or at minimum an owner-digest aggregate, or the survey is decorative.

## Recommendations

1. Apply the 2 scrape-unlocked 1-line dev edits (CIF, address) this cycle — zero owner dependency, kills the single highest-CoD gap.
2. Pick ONE referral system and add an integration test asserting end-to-end redeemability (the SDK-shape-rule lesson: tests that don't assert cross-system contract miss exactly this class).
3. Resolve the locale ADR-vs-config contradiction explicitly — it's a decision, not a bug; make it once.
4. Add a cross-vendor dedup key to the dual-scan crons before any staging run sets both Stripe+Mollie keys.

## New constraint discovered (append to tech-constraints.md)

- **Vercel Cron job count**: Hobby/free plan caps the number of cron jobs (historically 2). `vercel.json` declaring 6 crons requires Pro plan or crons silently won't fire. Verify plan tier before relying on owner-digest / MRR-digest / quarterly / renewal / milestone / deferred-gift schedules — discovered 2026-05-31.
