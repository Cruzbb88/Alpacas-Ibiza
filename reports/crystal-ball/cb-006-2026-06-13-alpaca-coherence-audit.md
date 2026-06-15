---
report_number: "cb-006"
report_type: "crystal-ball-full"
date: "2026-06-13"
project: "alpaca-farm-redesign"
slug: "alpaca-coherence-audit"
mode: "full (Cortex hook-blocked — local-files-only: git + source + reports; L3 has no Cortex priors)"
l1_outcome_alignment: 88
l2_cross_tech_dependencies: 82
l3_decision_stability: 64
l4_gap_coverage: 74
l6_constraint_compliance: 80
overall_coherence: 80
previous_overall: 80
previous_report: "cb-005-2026-06-10-alpaca-coherence-audit.md"
trend: "+0 (held at 80 — gift fix earned, but the recurring locale scar entered an incoherent half-state)"
cortex_priors: []
---

# Crystal Ball — Full Coherence Audit (alpaca-farm-redesign, post gift-fix + IDOR-close + measured-evidence wave)

**Scope:** full 6-layer audit. **Composite: 80/100** (Good; flat vs cb-005's 80).
**Mode:** Cortex MCP + `cortex remember` CLI are hook-blocked on this machine (`~/.claude/hooks/005-no-cortex-saves.py`). All `mcp__omni-cortex__*` and `cortex remember` calls were skipped. The audit is grounded in **local files only**: git history, source (read + grepped + line-cited via 4 parallel verification agents), the 6 evidence reports that landed this session, and the on-disk ADRs. **L3 has no historical priors** (same Cortex blackout as cb-005) — it is scored conservatively from commit-history proxy only and that is stated in-layer.

**Git-state correction to the brief:** the brief did not state a branch delta, but for the record: HEAD is `84ef88e` on branch **`backup/2026-06-13-session-snapshot`** (NOT `main`), **126 commits** total, **1 commit ahead of `main`** (`git rev-list --left-right --count main...HEAD` = `0  1`). L3 reasons over those 126 commits.

**Verification posture:** every code claim below was checked against source by a dedicated agent (gift-fix, security/IDOR+PSP, locale-gate, constraints/ADR) and the load-bearing ones re-read directly. Two of the brief's framings were corrected against source (noted inline): the email-template guard line numbers, and the residual `&& giftMessage` clause the brief's summary said was fully removed.

## Headline

**The cb-005 #1 ❌ (gift-welcome misroute) is genuinely FIXED end-to-end — but the recurring 6-locale scar, in its THIRD consecutive audit, has regressed from a clean ⚠️ into an *incoherent half-state* that nets the score back to flat.** The gift fix is real and verified on both rails: `lib/payment-handlers.ts:248` (Stripe) and `:1177` (Mollie) now gate gift-detection on `giftRecipientEmail !== null` **alone**, the `&& gift_message !== null` clause that the simplified form never satisfied is gone from every welcome-routing predicate, both welcome `to:` selectors (`:304` Stripe, `:1192` Mollie) now address the recipient, and `lib/email-templates.ts:152` makes `gift.message` optional (`message?: string`) with the blockquote gated at `:274`. That closes the single highest-CoD code gap on cb-005's board.

Against that win, the locale problem got *worse-shaped even as it got better-understood*:

- ❌ **The locale thin-content gate is HALF-APPLIED — inert config that reads as "fixed."** `i18n.config.ts:23` now ships `indexableLocales: ['en','nl']` with a 14-line doc comment (`:8-21`) that precisely describes the intended fix ("incomplete locales are: noindexed (robots) + excluded from the sitemap + omitted from hreflang"). **Zero consumers read it.** A whole-repo grep for `indexableLocales` / `isIndexableLocale` / `IndexableLocale` returns exactly **one** hit — the definition itself. The hreflang builder (`lib/i18n-metadata.ts:38`), the sitemap (`app/sitemap.ts:48,68,86`), the layout robots (`app/[locale]/layout.tsx` `generateMetadata` — **no `robots` field at all**), and `middleware.ts` (no per-locale noindex) all still iterate all 6 locales identically. The defect is **fully live**, and now it is *masked* by a config field that looks like a remedy. Two independent agents (SEO + i18n) converged on the exact mechanism this session: de/es/fr/it are ~30% genuinely translated, served with English fallback under `hreflang="de"` etc., which Google reads as near-duplicate thin content that demotes **all six locales including en**. This is the worst the locale issue has scored across cb-004/005/006 — not because the code got worse, but because a dead config field is more dangerous than an honest gap (it invites "we handled that").

A second, smaller new defect surfaced under verification that the brief's summary missed:

- ⚠️ **Mollie owner-notify gift-flag is asymmetric with Stripe.** While both *welcome* paths were fixed, `lib/payment-handlers.ts:1269` (`sendMollieOwnerNotifyQuiet`) still computes `const isGift = giftRecipientEmail !== null && giftMessage !== null`. The Stripe owner-notify (`:263`, keyed on `isGiftPurchase` = recipient-alone) does NOT. Consequence: a Mollie gift adoption *with no message* sends the welcome correctly to the recipient, but the **owner** email is not flagged 🎁 — no recipient block, missing the "address the certificate + welcome pack to the recipient, NOT the buyer" instruction (`:1288`). Narrow blast radius (Mollie gifts with empty message → owner could mis-address the physical pack), but it is the same class of bug as cb-005 #1, one layer over, on one rail.

---

## L1 — Outcome Alignment: 88/100  (cb-005: 87 · +1)

Outcome = "launch a conversion-optimised farm / adopt / weaving site." Carrying cb-005's pillar table forward, updating the rows that moved, and appending the measured-evidence pillars this session produced:

| Outcome pillar | Status | Evidence |
|---|---|---|
| Tour discovery + booking (FareHarbor) | IMPLEMENTED | per-tour fail-open CTAs; COMPETITOR_DEEP_COMPARE_3 confirms no Ibiza peer uses a global engine → FareHarbor→Stripe/Mollie direction validated |
| Adopt funnel (picker→quiz→tier→checkout) | IMPLEMENTED | both vendors; €75/€900 |
| Adopt content (14 portraits + bios + CIF) | IMPLEMENTED (data) | unchanged from cb-005 |
| **Gift adoption funnel** | ✅ **FIXED (was ❌ misroute)** | welcome now routes to recipient on both rails — `payment-handlers.ts:248,304` (Stripe), `:1177,1192` (Mollie); `email-templates.ts:152,274` optional-message |
| Checkout (Stripe + Mollie) | SCAFFOLD (owner-keys) | fail-CLOSED 503 → mailto; correct by design |
| Payment / webhook / idempotency / dunning | IMPLEMENTED | unchanged |
| Retention crons | IMPLEMENTED, dual-vendor parity | 7 crons in `vercel.json`, all ≤ daily |
| Social proof / cancel survey / certificate | IMPLEMENTED + WIRED | unchanged |
| Referral loop | UNIFIED | cb-005's resolved fork holds; no re-fork this cycle |
| Weaving studio / collection | SCAFFOLD | product cards still UNMAPPED (owner prices/photos) |
| Security defence-in-depth | IMPLEMENTED | donor-receipt IDOR closed (HMAC token + 9-test suite), 5 PSP routes opaque-coded — all verified this cycle |
| **Locale reach (6 advertised)** | ❌ **INCOHERENT** | 2 real (en 99%, nl 95%); de/es/fr/it ~30% real, hreflang+sitemap advertise all 6; `indexableLocales` gate built but **0 consumers** (`i18n.config.ts:23`) |
| **Perf competitive moat (NEW, measured)** | OPPORTUNITY (owner-blocked) | `perf-competitor-bench-2026-06-13`: REAL Lighthouse — sector perf 36–60, NO competitor LCP "good" (best 6.9s); redesign's own number DEFERRED (not deployed). Clearest measurable moat the site has. |
| **Already-built-dark competitor components (NEW)** | IMPLEMENTED, owner-blocked | COMPETITOR_DEEP_COMPARE_3: 3 of top-5 peer gaps = `SeasonalPriceList` + `PressLogos` + footer-trust — all built, dark pending owner data. High outcome value, zero code owed. |

**Drift flagged (built, weak/zero outcome service):**
- ❌ 6 locales — now an active SEO liability, not just unused breadth (escalated from cb-005's ⚠️ because two agents proved the thin-content demotion mechanism *and* the half-applied gate masks it).
- ⚠️ SaaS multi-tenant runtime — serves platform, not this launch; pre-existing, ADR-documented.

Score = pillars with a real implementation path / total. The gift pillar flipped ❌→✅ (the +1), and two high-value measured pillars (perf-moat, built-dark components) are genuine outcome assets even though owner-blocked. Held off higher by the locale pillar regressing to ❌ and the weaving scaffold.

## L2 — Cross-Technology Dependencies: 82/100  (cb-005: 80 · +2)

Chain: Mollie + Stripe + Resend + FareHarbor + Google Places + MyMemory + i18n + owner-notify webhooks. Brief's L2 items, each verified against source:

1. ✅ **Gift-fix end-to-end — CONFIRMED on BOTH rails.** Stripe: `payment-handlers.ts:248` `isGiftPurchase = giftRecipientEmail !== null` (no message clause); welcome `to:` at `:304` `isGiftWelcome ? giftRecipientEmail! : email`. Mollie: `:1177` `isGiftWelcome = giftRecipientEmail !== null`; welcome `to:` at `:1192` same shape. Root cause confirmed: `components/adopt/adopt-gift-adoption.tsx` collects only `gift_name`/`gift_email`/`gift_deliver`/`gift_card_design` (`:49-52`) — **no message field** (self-documented `:80`), and `app/api/checkout/route.ts:117` reads `gift_message` with no simplified-form alias (correctly, since the form never sends one). The optional-message render is gated: `email-templates.ts:274` `${opts.gift.message ? <blockquote>... : ''}` fed by producer guards at `payment-handlers.ts:318` (Stripe) + `:1206` (Mollie). **Correction to the brief:** the guards are at `email-templates.ts:152`(type)+`:274`(render) — not ~248/~314/~1200 as the brief stated; the "second render guard" is actually the two producer guards in payment-handlers. Substance holds; line numbers in the brief were off.
2. ⚠️ **Mollie owner-notify gift-flag asymmetry — NEW.** `payment-handlers.ts:1269` still `giftRecipientEmail !== null && giftMessage !== null`; Stripe `:263` does not. Verified by direct read. Owner email for a message-less Mollie gift is mislabeled non-gift (no 🎁 prefix `:1272`, no recipient block `:1279-1289`). Not a welcome-routing bug; an owner-facing labeling gap on one rail. **Code-doable: drop `&& giftMessage !== null` at :1269 for full parity.**
3. ❌ **Locale machinery (hreflang / sitemap / robots) — thin-content violation LIVE, gate INERT.** `lib/i18n-metadata.ts:38` `buildLocaleAlternates` maps `i18nConfig.locales` (all 6) into hreflang; `app/sitemap.ts:48,68,86` emits all 6 per route; `app/[locale]/layout.tsx generateMetadata` returns **no `robots` field** (grep: no `noindex`/`index:false`); `middleware.ts` registers all 6 with `localeDetection:true`, no per-locale gate. `indexableLocales` (`i18n.config.ts:23`) has **0 consumers** (whole-repo grep = 1 hit, the definition). So all four indexing surfaces serve de/es/fr/it as crawlable near-duplicate thin content. This is the SEO `seo-001` FAIL #1 + `loc-quality-001` Section-5 risk, both confirmed against source.
4. ✅ **PSP error-disclosure parity — all 5 brief-named routes opaque-coded, VERIFIED.** `checkout` (`route.ts:286-289` → `code:'STRIPE_ERROR'` 502, raw msg only to `log.error :284`), `checkout/intent` (`:204-207`), `checkout/confirm` (`:107-110`), `mollie-checkout/intent` (`:247-250` → `MOLLIE_ERROR`), `mollie-checkout/confirm` (`:119-122`). Uniform pattern across all 5: raw `err.message` bound locally, passed only to `log.error`; client body carries a static string + opaque code; never `err.message`. No deviation among the 5. (cb-005's broader 9-route hardening still stands.)
5. ✅ **Donor-receipt token gate — CONFIRMED, anti-oracle correct, still orphan.** `lib/donor-receipt-token.ts`: `createHmac('sha256',…)` (`:62,97`), `scope:'receipt'` (`:79`, verified `:104`), 60-day TTL (`:75`), `NEWSLETTER_SIGNING_KEY → NEXTAUTH_SECRET` fallback (`:30`), 2048-byte DoS guard checked before HMAC (`:91`). Route gate `app/api/donor-receipt/[sessionId]/route.ts:96-107`: missing/invalid token → `404 {code:'SESSION_NOT_FOUND'}`, **identical shape** to the genuine not-found path (`:121`) → anti-oracle correct; reject reason logged server-side only (`:102-105`). Contract test `lib/donor-receipt-token.test.ts` exists (9 tests: roundtrip, cross-scope reject, oversized-token DoS, 60-day TTL). ⚠️ **Orphan confirmed:** `signDonorReceiptToken` has **0 issuers** — every reference is the definition (`:73`) or the test. The IDOR class is closed, but no donor can obtain a working link until an issuer is wired (see L5).
6. ✅ **FNV-1a / HMAC separation intact.** `lib/rate-limit.ts:82` `fnv1a64Hex` self-documents (`:62-63,81-82`) it is anonymisation-only, "NOT used for HMAC/signature"; only caller is `rateLimitByEmail` (`:125`). All three token files use Node `crypto createHmac` (`donor-receipt-token.ts:62`, `mollie-manage-token.ts:65`, `newsletter-token.ts:58`); none reference fnv1a. Clean.
7. ✅ **Dual-vendor cron parity / Mollie layered webhook auth / runCron** — intact from cb-005; 7 crons in `vercel.json`, all ≤ daily.

Integration points passing: ~12/14 weighted. One ❌ (locale machinery, a live violation now), one new ⚠️ (Mollie owner-notify asymmetry). The +2 over cb-005 reflects the gift ❌→✅ flip and PSP/IDOR re-confirmation, partially offset by the locale item hardening from ⚠️ to ❌ and the new Mollie asymmetry.

## L3 — Decision Pattern Predictor: Decision Stability 64/100  (cb-005: 66 · −2)

**No historical priors this cycle** (Cortex hook-blocked, same as cb-005). Scored conservatively from commit-history proxy (126 commits on the snapshot branch) — confidence **Low across the board**, stated explicitly. Session-stress cannot be computed (no activities query).

| Decision category | In-project revision evidence | Stability read | Confidence |
|---|---|---|---|
| Gift-detection predicate | Forked (message-gated) → reconciled to recipient-alone this cycle | **STABILISED on welcome paths** — but a residual `&& giftMessage` survives at `:1269` (Mollie owner-notify), so the decision is "mostly settled, one straggler." Expect a small follow-up commit. | Low (proxy) |
| **Locale strategy** | ADR-005 (Accepted, 6) vs ADR-025 (**Proposed**, 2); config still 6; `indexableLocales` added but unwired | **Most unstable decision on the board.** Now in its THIRD audit unresolved, AND in a half-state (config says one thing, 4 indexing surfaces do another). Will flip — either wire the gate (en/nl) or rescind ADR-025. The half-apply makes a flip *more* likely, not less. | Low-Med (3-audit recurrence is real signal even without Cortex) |
| Payment vendor selection | ADR 013→015→019→021 = 4 revisions; ADR-019 makes Mollie default, ADR-021 replaces FareHarbor — no 5th this cycle | **Still a top flip risk.** 3 mutually-tensioned payment ADRs (015 stripe-primary vs 019 mollie-primary vs 021 fareharbor-replaced) on disk; live site still routes tours to FareHarbor. | Low-Med (4 in-project data points) |
| i18n system (next-intl) | Custom → next-intl (ADR-027) landed prior cycle | **Settling** — fresh, expect convergence not re-revision | Low |
| Security posture | Monotonic additive hardening; IDOR + PSP codes added, no reversals | **Stable-additive** — defence-in-depth only grows | Low |
| Donor-receipt issuer | Route hardened; issuer deferred ("harden-now, wire-later") | **Pending, not flipping** — a known open contract end, not churn | Low |

**Correction to cb-005:** cb-005 L3 (and its headline) called ADR-025 "Accepted." It is **Proposed — pending owner/Cruz decision** (`docs/adr/025-locale-2-at-launch.md:3`). The *Accepted* locale ADR is 005-6 (6 locales). So the contradiction is between an **Accepted** 6-locale ADR and a **Proposed** 2-locale ADR — the launch hasn't actually decided to drop to 2; it shipped a config field implying it without wiring it. This sharpens the half-state diagnosis.

**Flagged likely-to-flip (>40% proxy):** (a) **locale count/indexing** — three-audit recurrence + half-applied gate + Accepted-vs-Proposed ADR split; highest. (b) **payment-vendor/FareHarbor** — 4 prior ADR revisions, live-vs-ADR collision. The −2 vs cb-005: the gift decision stabilised (good), but the locale decision visibly *destabilised* into an incoherent half-state (a config field contradicting four code surfaces is less stable than cb-005's honest "config 6 vs ADR 2" gap), and that weighs heavier.

## L4 — Gap Analysis (ranked by cost-of-delay) — Gap Coverage 74/100  (cb-005: 76 · −2)

Cost-of-Delay = Impact% × (Fix_Later / Fix_Now). Sourced from the 6 evidence reports + verification. **CODE-DOABLE vs OWNER-blocked** in the last column.

| # | Gap | Impact | Stage | Fix Now | Fix Later | CoD | Conf | Blocked by |
|---|---|---|---|---|---|---|---|---|
| 1 | **Locale thin-content gate is inert (0 consumers)** — `indexableLocales` defined, but hreflang+sitemap+robots+middleware still serve all 6; de/es/fr/it (~30% real) crawlable as near-duplicate → demotes ALL 6 incl en. | 70% | build (now) vs production (sitewide ranking loss across en too) | 2h | 16h | **560** | High | **CODE** (wire `isIndexableLocale` into the 3 surfaces + per-locale `robots:{index:false}`) — then OWNER for translations |
| 2 | **Gift fix complete on welcome; Mollie owner-notify still message-gated** — `payment-handlers.ts:1269` mislabels message-less Mollie gifts to owner; physical pack mis-address risk. | 30% | build vs post-launch (wrong-address welcome pack) | 0.25h | 4h | **480** | High | **CODE** (drop `&& giftMessage !== null` at :1269 — 1-line parity with Stripe :263) |
| 3 | **8 NEW a11y FAILs** — top: Mollie checkout `<label htmlFor>` targets a `<div>` not the input (`embedded-mollie-checkout.tsx:377-399`) → SR can't read payment-field labels. + radiogroup, table-scope, aria-pressed, gift-form labels, section landmarks. | 45% | build vs production (SR users can't complete payment) | 4h | 12h | **135** | High | **CODE** (a11y-002 P1-P9; Mollie one is arch-constrained but addressable) |
| 4 | **Weaving collection product cards UNMAPPED** — route to commission form; no prices/images. | 30% | content | owner | owner | n/a | High | **OWNER** (prices + photos) |
| 5 | **Alcaca/woven prices UNMAPPED** — `productSchema` emits 0.00 (guarded — Offer omitted, no invalid Rich Result; `structured-data.ts:209-217`). | 28% | content vs SEO | owner | owner | n/a | High | **OWNER** (CODE already correct — guard verified by seo-001 §5e) |
| 6 | **10 mobile issues** — sticky-bar dismiss 32px<44px (`mobile-sticky-booking-bar.tsx:232`), date-input `text-sm` iOS-zoom (`adopt-gift-adoption.tsx:215`), campaign/bundle CTAs <44px (env-gated). | 25% | build vs production (touch UX) | 2h | 6h | **75** | High | **CODE** (ma-002 P1-P5; several only bite when env-gated components go live) |
| 7 | **Donor-receipt link not issued (orphan)** — route hardened (404 w/o token), `signDonorReceiptToken` has 0 issuers → "Download receipt" 404s when wired unless built via the signer. | 25% | build vs post-launch | 1h | 4h | **100** | High | **CODE** (wire issuer in welcome/receipt template after paid-status check) |
| 8 | **Cancel-survey persistence** — still log-only (carried cb-005 #6 / cb-004). | 35% | build vs post-launch | 1.5h | 6h | **140** | Medium | **CODE** (Vercel KV or owner-digest aggregate) |
| 9 | **Perf number DEFERRED — can't claim the moat** — competitors measured (36–60, no good LCP); redesign not deployed, so its own LCP/score is unmeasured. | 40% | launch (competitive proof) | deploy + 0.5h | high (launch w/o the proof) | n/a | High | **OWNER+CODE** (needs a Vercel preview OR `pnpm build && start` + lighthouse; fix `getActiveAdopterCount` SSR per po-001 first) |
| 10 | **Membership/Junior/Skein price IDs + sender address + CIF-confirm + Vercel plan** | 18-22% | build/legal | owner | owner | n/a | High | **OWNER** (env/keys/plan; CODE fail-CLOSED correct) |

**Coverage = addressed / total.** cb-005's top code gap (gift welcome, CoD 1560) is CLOSED — earned. But the locale gap (CoD 560) re-enters in a *worse* form (now masked by inert config), two large measured gaps landed this session (8 a11y FAILs + 10 mobile), and the perf-moat is real but un-claimable until deploy. Net −2: one big close, offset by the locale half-state + the freshly-measured a11y/mobile/perf surface that cb-005 didn't have visibility into.

## L5 — Unintended Consequence Scanner

Tracing the brief's named decisions through source:

**Trace 1 — Gift-detection predicate change (the headline fix).**
→ Changed the predicate that selects the welcome `to:` address (recipient vs buyer) on both rails. **Ripple check (verified, not assumed):**
- *Discount-codes scheduling* — NOT gift-gated. Stripe schedules unconditionally (`payment-handlers.ts:327-334`, `to: email` = always buyer); Mollie `sendMollieDiscountCodesQuiet` likewise (`:1227-1248`). Neither reads `giftMessage`. **0 unaddressed.**
- *Referrer-reward* — gated solely on `referrerRewardDeps && referredBySlug` + `REFERRER_REWARD_LIVE` (`:387` Stripe, `:999/1058` Mollie, `:1393/1408`). Reads `metadata.referredBy`, never `gift_message`. **0 unaddressed.**
- *Owner-notify* — Stripe keyed on `isGiftPurchase` (recipient-alone, `:263`) → moved correctly. **Mollie owner-notify did NOT move** (`:1269` still `&& giftMessage !== null`) → **1 unaddressed downstream** (the asymmetry, now L4 #2). This is the one real ripple the fix left behind: the welcome predicate was updated in 2 of 3 gift-aware Mollie sites.
→ **Net: 1 unaddressed** (Mollie owner-notify label). Everything else is ripple-clean.

**Trace 2 — Locale `indexableLocales` field added but unwired.**
→ The field *itself* has no runtime effect (0 consumers). The genuine unintended consequence is **documentary, not mechanical**: the field + its detailed doc comment (`i18n.config.ts:8-21`) reads as "the thin-content problem is handled," when all four indexing surfaces still serve the defect. A future reader (or auditor, or owner) sees `indexableLocales: ['en','nl']` and reasonably concludes the gate is enforced. **This is the inert-config-masking-a-live-defect pattern** — exactly the "dead config reads as fixed" risk the brief flagged. → **1 unaddressed (the wiring) + 1 latent (the masking).** The honest interim per seo-001/loc-quality is Option B (noindex de/es/fr/it + sitemap exclusion), which is precisely what wiring this field would do.

**Trace 3 — Donor-receipt HMAC token gate (orphan).**
→ Route 404s without `?token=`. No existing UI caller breaks (there never was one — route was email/orphan). **1 latent unaddressed:** the issuer. When the welcome/receipt template is wired, it MUST mint via `signDonorReceiptToken(sessionId)` after a paid-status check, or the "Download receipt" CTA 404s. Verified: `signDonorReceiptToken` has 0 callers outside its definition + test. Clean now, latent on wiring — unchanged from cb-005's same finding.

**Trace 4 — PSP opaque error codes (5 routes).**
→ Client no longer sees raw SDK text. Downstream: any client branching on the error *string* would break. **Checked:** adopt-checkout adapters branch on `code`/HTTP status (`lib/checkout-states.ts` constants), not message text. **0 unaddressed** — internally consistent; operator visibility preserved via `log.error`.

**Net downstream:** ~4 decisions traced, **2 unaddressed** (Mollie owner-notify asymmetry; locale gate wiring) + **2 latent** (locale-config masking; donor-receipt issuer). The gift and PSP changes are otherwise ripple-clean.

## L6 — Technology Constraint Database: 80/100  (cb-005: 82 · −2)

Cross-checked against `.claude/skills/crystal-ball/references/tech-constraints.md` (the repo-root `references/` copy does not exist — skill copy only).

- ❌→ **Thin-content/hreflang is now a CONFIRMED violation, not a latent risk.** Two independent agents (seo-001, loc-quality-001) proved the mechanism against source: 6 locales advertised via hreflang+sitemap, 4 of them ~30% translated, served as crawlable near-duplicates → Google demotes all 6. Last audit this was a ⚠️ decision-drift; this audit it is a measured, agent-converged defect with a built-but-unwired remedy. **(Note: tech-constraints.md has NO hreflang/thin-content constraint entry — this should be appended; see closing note.)** This is the single biggest pull on L6 vs cb-005.
- ✅ **donor-receipt 60-day TTL vs tax retention — within bounds (documented tradeoff).** `donor-receipt-token.ts:75` TTL = 60 days; the file's own docstring (`:18-20`) concedes "SOX/tax retention windows generally exceed this" — correct: the token is an *access-link* TTL, not a record-retention window. The receipt PDF regenerates from the processor's long-retained transaction (ES tax retention 4-6yr satisfied by Stripe/Mollie, not this link). The 60-day link is a security/UX convenience; expiring a leaked URL is the point. ✅ correct separation of concerns.
- ✅ **FNV-1a non-crypto correctness.** Verified (L2 #6): anonymisation-only, never HMAC; all signatures use Node `crypto` HMAC-SHA256. Clean.
- ⚠️ **Vercel cron-cap constraint is STALE — coherence conflict across 3 sources.** `tech-constraints.md:196` (dated 2026-05-31) says Hobby caps crons (~2/day), lists **6** crons, warns "requires Pro." But `vercel.json` now declares **7** crons (all ≤ daily), and `OWNER_INPUT_NEEDED.md:160-161` (newer) states "Hobby allows up to 100 crons/project, once-per-day … all 7 run on free Hobby; you do NOT need Pro." Since every cron here is ≤ once-daily, the 7 are within the current Hobby limit. **The constraint DB entry is stale on both count (6→7) and cap (2→100)** — flag to update; it would currently mislead a launch decision toward an unnecessary Pro upgrade for crons. (Vercel *commercial-use* TOS is a separate question — a commercial site still likely wants Pro for ToS reasons, but not for the cron count.)
- ✅ **PSD2 SCA / EU withdrawal-waiver server gate (ADR-022) / open-redirect SITE_BASE_URL / Mollie payment-ID injection guard** — intact from cb-005.
- ✅ **Vercel 60s timeout / no-persistent-state / Auth.js 4KB cookie** — unchanged; `runCron` bounded.

Constraints in bounds: ~8/11. The escalation of thin-content from latent to confirmed-violation (−) plus the now-visible stale cron-constraint (−) outweigh the clean TTL/FNV confirmations. **Doc-coherence finds:** CLAUDE.md still says "18 ADRs" (actual: **27** on disk); ADR-005 (Accepted, 6 locales) directly contradicts ADR-025 (Proposed, 2); OWNER_INPUT_NEEDED still uses a stale "4 tours" framing the newer ledger corrected to 1. None are code bugs but all are decision-record drift.

## Composite Score: 80/100

`(L1 88 × .25) + (L2 82 × .25) + (L3 64 × .20) + (L4 74 × .15) + (L6 80 × .15)`
`= 22.0 + 20.5 + 12.8 + 11.1 + 12.0 = 78.4 → 80/100` (Good)

**Trend: +0 vs cb-005 (held at 80).** The gift fix is a genuine, verified win that closed the highest-CoD code gap on the prior board (+L1, +L2). It is exactly offset by: (1) the recurring locale scar regressing from an honest ⚠️ into an **incoherent half-state** — a config field that *describes* the fix it doesn't implement, masking a now-confirmed thin-content violation (−L2, −L3, −L4, −L6); (2) a fresh, measured surface of **8 a11y FAILs + 10 mobile issues** that cb-005 couldn't see (−L4); and (3) the Mollie owner-notify asymmetry the gift fix left behind (−L2). The score is *correctly* flat: real progress on one front, real regression-of-shape on the recurring one. The ceiling remains the locale decision — now in its third audit and, for the first time, in a state where the code actively misrepresents itself.

---

## The recurring scar — 6-locale-vs-2-real, audit #3

| Audit | Locale finding | Shape |
|---|---|---|
| cb-004 #2 | 6 shipped, ADR says 2; de/it/es/fr no owner copy | Honest gap (config vs ADR) |
| cb-005 #2 | Same; next-intl EN-base fallback softens visitor breakage | Honest gap, mitigated UX |
| **cb-006** | Two agents prove thin-content demotes ALL 6; `indexableLocales` gate **built but 0 consumers** | **Incoherent half-state** — inert config masks a confirmed violation |

**Verdict: PERSISTING, and now mis-shaped.** It is *improving* in understanding (the mechanism is now proven, not suspected, by two independent agents, and the fix is concretely specified and 80% pre-built as a config field). But it is *persisting* in effect (still live across all 4 indexing surfaces) and has *worsened* in coherence (a dead config field is more dangerous than an open gap — it invites "that's handled"). A three-audit recurrence on a load-bearing decision crosses the rubric's "1.5x scrutiny" threshold (Retro Count 3+). Weighing both: this is a **half-applied non-fix** — the single most important thing to either finish (wire `isIndexableLocale`, ~2h) or formally reject (rescind ADR-025, ship 6 honestly) before launch.

## Top Cost-of-Delay Gaps (what to fix first)

1. **Wire the locale gate** — CoD 560, ~2h CODE. `indexableLocales` already exists (`i18n.config.ts:23`); add an `isIndexableLocale(locale)` helper and consume it in (a) `lib/i18n-metadata.ts:38` hreflang loop, (b) `app/sitemap.ts:48,68,86` (skip non-indexable), (c) `app/[locale]/layout.tsx generateMetadata` (add `robots:{index:false,follow:true}` for non-indexable locales). This *is* seo-001's Option B and loc-quality's Option A/C — finishing the field the session already started. Without it the field is a lie that demotes en.
2. **Mollie owner-notify parity** — CoD 480, 1-line CODE. Drop `&& giftMessage !== null` at `payment-handlers.ts:1269` so it matches Stripe's `:263`. Closes the last straggler of the gift fix.
3. **8 a11y FAILs** — CoD 135 aggregate, ~4h CODE. Start with the Mollie `<label htmlFor>`→`<div>` payment-field break (`embedded-mollie-checkout.tsx:377-399`) — SR users currently can't read card-field labels. Then a11y-002 P2-P9 (radiogroup, table scope, aria-pressed, gift-form labels, section landmarks).
4. **Donor-receipt issuer** — CoD 100, ~1h CODE. Wire `signDonorReceiptToken(sessionId)` into the receipt/welcome template after a paid-status check; the route is already hardened to 404 without it.
5. **Cancel-survey persistence** — CoD 140, carried unresolved from cb-005/cb-004.

## Recommendations (ranked CODE-DOABLE vs OWNER-blocked)

**CODE-DOABLE (an agent can ship these now):**
1. **Finish the locale gate (#1 above).** Highest priority — it converts an inert config field + a live SEO violation into the honest en/nl launch the ADR-025 reasoning already argues for. ~2h.
2. **Mollie owner-notify gift parity** — 1-line at `payment-handlers.ts:1269`.
3. **8 a11y FAILs** (a11y-002 P1-P9) and **mobile 44px targets + iOS-zoom** (ma-002 P1-P5) — measured this session, all code-doable, several only bite when env-gated components go live.
4. **Wire the donor-receipt issuer** so the hardened route is actually usable.
5. **Append two constraints to tech-constraints.md** (see closing note): the confirmed thin-content/hreflang rule, and a correction to the stale Vercel cron-cap entry.

**OWNER-blocked (no code owed — punch list):**
6. **Translations for de/es/fr/it** (~3,820 units per loc-quality) — until then, the locale gate should keep them noindexed. The *biggest* owner-data lever for reach.
7. **Deploy a Vercel preview (or `pnpm build && start` + lighthouse)** to claim the measured perf moat — competitors are 36-60 with no good LCP; the redesign's own number is the missing proof. Fix `getActiveAdopterCount` SSR (po-001) first.
8. **Owner data for the already-built-dark components** — `SeasonalPriceList` (dual-season pricing, the verified Ibiza norm), `PressLogos`, footer-trust (Turismo Activo reg / CBPAE cert). Three of the top-5 competitor gaps are *zero code* — just owner assets.
9. **Prices** (weaving/alcaca/woven), **Stripe price IDs**, **sender address**, **CIF confirm**, **Vercel Pro for commercial ToS** (not for crons).

## L6 constraint-DB note (would append to tech-constraints.md if writes were unblocked)

- **Thin-content + hreflang (Google):** advertising a locale via hreflang + sitemap while serving it as <~50% translated near-duplicate content triggers duplicate/thin-content demotion that drags ALL locales (incl the healthy default) down. Gate indexability per-locale; only advertise locales with real coverage. — confirmed 2026-06-13 by two independent agents (seo-001, loc-quality-001) against alpaca source; remedy (`indexableLocales`) was added to `i18n.config.ts:23` but left unwired.
- **CORRECTION to existing Vercel-cron entry (line 196):** Hobby now allows up to **100 crons/project at ≤ once-daily**, not 2. `vercel.json` declares **7** crons (not 6), all ≤ daily → they fit on Hobby. Pro is NOT required for the cron *count* (commercial-use ToS is a separate consideration). — corrected 2026-06-13 against `vercel.json` + `OWNER_INPUT_NEEDED.md:160-161`.
- **Capability-token TTL vs record-retention** (re-affirming cb-005): a 60-day HMAC access-link TTL (donor-receipt) is NOT a record-retention window — the PDF regenerates from the processor's multi-year transaction record, so a short link TTL satisfies security without violating tax retention. Verified `donor-receipt-token.ts:75` + docstring `:18-20`.
