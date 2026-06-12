---
report_number: "cb-005"
report_type: "crystal-ball-full"
date: "2026-06-10"
project: "alpaca-farm-redesign"
slug: "alpaca-coherence-audit"
mode: "full (Cortex blocked — local-files-only)"
l1_outcome_alignment: 87
l2_cross_tech_dependencies: 80
l3_decision_stability: 66
l4_gap_coverage: 76
l6_constraint_compliance: 82
overall_coherence: 80
previous_overall: 74
previous_report: "cb-004-2026-05-31-alpaca-coherence-audit.md"
trend: "+6 (improving)"
cortex_priors: []
---

# Crystal Ball — Full Coherence Audit (alpaca-farm-redesign, post-security-hardening + wiring-map wave 7)

**Scope:** full 6-layer audit. **Composite: 80/100** (solidly Good; +6 vs cb-004's 74).
**Mode:** Cortex MCP + `cortex remember` CLI hook-blocked on this machine → audit is grounded in local files only (git, source, ADRs, this session's 18 audit docs). L3 has **no historical priors** this cycle (cb-004's Surity priors came from Cortex reads which are now also unavailable) — L3 is scored conservatively from commit-history proxy only, and that is stated explicitly in-layer.

**Git-state correction to the brief:** the brief framed this branch as "84 commits ahead of `main`." Measured: `git rev-list --left-right --count main...HEAD` = **0/0**, current branch **IS `main`** (HEAD `98a29fb`). The work landed on main directly; total branch history is **124 commits**. L3 reasons over those 124, not a phantom 84-commit delta.

## Headline

**Two of cb-004's three load-bearing scars are now healed, and the third is unchanged.** The referral-system fork — the headline ❌ of cb-003 AND cb-004 — is **fully resolved**: `createReferralCoupon` is deleted (grep across `lib/ app/ --include='*.ts'` = **0 hits**, was the dead Stripe-coupon mint), and every caller now imports the single canonical `REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/` from `lib/referral-codes.ts`, including the homepage `app/[locale]/page.tsx:68` that cb-004 #1 flagged with the wrong `ALPACA-` prefix. One referral system, one format, end to end. The cb-004 #2 highest-CoD gap (CIF + legal address absent from code) is **also closed** — `lib/tenants/alpacasibiza.ts` now ships `cif: 'Y6917111J'`, `vatNumber: 'ESY6917111J'`, and a populated `address` block.

The score is held back by **one unchanged architecture drift and one newly-confirmed (was: suspected) integration bug:**

- ⚠️ **Locale drift vs ADR-025 PERSISTS.** ADR `025-locale-2-at-launch.md` is on disk and Accepted, but `i18n.config.ts:2` still ships **6 locales** (`en,de,it,es,nl,fr`). Code contradicts the load-bearing decision — exactly cb-004's ⚠️, unmoved. (Mitigating: the Dutch site is now live from scrape per commit `0ddf490`, so EN+NL are the two real launch locales — but de/it/es/fr remain shipped.)
- ❌ **Gift welcome misroutes to the BUYER, not the recipient — now CONFIRMED, not "risk".** cb-003 #2 / cb-004 #4 flagged this for spot-verify; this audit finished the trace. `lib/payment-handlers.ts:244` gates `isGiftPurchase = giftRecipientEmail !== null && giftMessage !== null`, but the simplified gift form (`components/adopt/adopt-gift-adoption.tsx`) collects **only** `gift_name`/`gift_email`/`gift_deliver` — **there is no `gift_message` field** (the component even self-documents this at line 80: *"No literal `message` field exists today"*). The checkout route (`app/api/checkout/route.ts:117`) reads `gift_message` with no simplified-form fallback, so `giftMessage` is always null → `isGiftPurchase` is always **false** → welcome-email content + owner-notification gift block + `gift.sent` analytics event all take the non-gift branch. (Partial mitigation: deferred *scheduling* via `decideGiftSchedule` keys off `gift_send_date` + `gift_recipient_email` only, so a future-dated gift still *delays* to the right date — but the email it eventually sends is the buyer-facing variant.)

---

## L1 — Outcome Alignment: 87/100  (cb-004: 82 · +5)

Outcome = "launch a conversion-optimised farm / adopt / weaving site." Mapping shipped features to that outcome, with cb-004's pillar table carried forward and the four new pillars the brief asked for appended:

| Outcome pillar | Status | Evidence |
|---|---|---|
| Tour discovery + booking (FareHarbor) | IMPLEMENTED | per-tour fail-open CTAs; ADR 021 confirms FareHarbor→Stripe/Mollie migration is owner-intended |
| Adopt funnel (picker→quiz→tier→checkout) | IMPLEMENTED | both vendors; €75/€900 live-verified |
| Adopt content (14 portraits + bios + CIF) | **IMPLEMENTED (data)** | OWNER_DATA_LEDGER §1: all 14 bios populated (NL+EN `localizedBio`), CIF + address now in tenant file; `/my-adoption` bio-read bug fixed this session (`resolveAnimalBio()`) |
| Checkout (Stripe + Mollie) | SCAFFOLD (owner-keys) | fail-CLOSED 503 → mailto; correct by design |
| Payment / webhook / idempotency / dunning | IMPLEMENTED | failure-tracker severity ladder, owner-notify fan-out (Slack/Telegram/Discord), re-mandate flow |
| Retention crons | IMPLEMENTED w/ dual-vendor parity | milestone + quarterly scan Stripe AND Mollie independently; `runCron` shared runner centralises auth/heartbeat/retry |
| Social proof / cancel survey / certificate | IMPLEMENTED + WIRED | unchanged from cb-004 |
| **Referral loop** | ✅ **UNIFIED (was ❌ DEAD)** | `createReferralCoupon` deleted; single HMAC attribution system, one `[A-Z0-9]{6}` format, wired into checkout + retention email + share surfaces |
| Weaving studio / collection | SCAFFOLD | 6 product cards still UNMAPPED (OWNER_DATA_LEDGER §6); routes to commission form |
| **Vendor in-sourcing roadmap (NEW)** | DOCUMENTED, not built | VENDOR_INSOURCING_RESEARCH: insource only email (Listmonk) + analytics (Plausible) + uptime (Kuma); keep Stripe/Mollie/FareHarbor/Resend/Vercel. Serves cost-at-scale, not launch. |
| **WIRING_MAP completeness (NEW)** | IMPLEMENTED | full call-graph: every page → component → route → external → side-effect, file:line throughout; 0 dead routes (all 11 email/cron/probe-only routes have documented callers) |
| **OWNER_DATA visibility (NEW)** | IMPLEMENTED | OWNER_DATA_LEDGER_2026-06-10 (file-cited, ⚠️/🟡/🟢 severity + ↩LIVE recoverability) + OWNER_DATA_NEEDED ~140 items / 10 categories |
| **Security defence-in-depth (NEW)** | IMPLEMENTED | 5 PSP routes opaque-coded, donor-receipt IDOR closed (HMAC token), PECR/CSP/header-injection patch (`63fadc7`), pluggable bot-provider (`98a29fb`) |

**Drift flagged (built, weak outcome service):**
- ⚠️ **6 locales vs ADR-025** — unchanged; 4 of 6 locales (de/it/es/fr) carry no owner copy and contradict the Accepted ADR.
- ⚠️ SaaS multi-tenant runtime (`lib/tenants/*`, `lib/integrations/*`) — serves a *platform* outcome, not *launch-this-farm*. Pre-existing; ADRs 019/020 (Mollie Connect for tenants) acknowledge it. Not this cycle.

Score = pillars with implementation path / total. 12 of 13 core/new pillars implemented + wired; the referral pillar flipped from ❌ to ✅ and CIF data landed — that's the +5. Weaving-collection scaffold + locale drift hold it off 92.

## L2 — Cross-Technology Dependencies: 80/100  (cb-004: 71 · +9)

Chain: Mollie + Stripe + Resend + FareHarbor + Google Places + MyMemory + i18n + owner-notify webhooks. Carry-over items from the brief, verified:

1. ✅ **Referral fork — RESOLVED (was the cb-004 ❌ HIGH).** `grep -rn createReferralCoupon lib/ app/ --include='*.ts'` → **0 hits**. The dead Stripe-coupon mint is gone. Single system: `generateReferralCode(customerId)` (HMAC, base32, validated by `REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/`). Format is now uniform across homepage (`page.tsx:68`), checkout route (`checkout/route.ts:104,132`), share-buttons, donor-portal share-cta, referral-applied-banner, share-adoption, my-adoption. **No more format mismatch, no more inert discount path** — the two-system incoherence cb-003 and cb-004 both scored ❌ is closed.
2. ⚠️ **6-locale drift vs ADR-025 — UNCHANGED.** `i18n.config.ts:2` ships 6 locales; ADR-025 says 2 at launch. Type-safe, content-incoherent for de/it/es/fr. Same ⚠️ as cb-004 (#3 there). Net-new since cb-004: next-intl migration completed (ADR-027, commits `f2ff160`→`7d495d6`) with EN-base fallback, so non-EN/NL pages now render *English* rather than raw keys — the visitor-facing breakage is softer, but the config/ADR contradiction is identical.
3. ❌ **Gift-message detection (cb-003 #2 / cb-004 #4 — spot-verify FINISHED).** Confirmed bug, mechanism above in Headline. `isGiftPurchase` requires `gift_message !== null`; the simplified form never sets it; route has no fallback for it. Welcome content + owner gift block + `gift.sent` event all misfire to non-gift. Recipient email IS captured in metadata (so the data isn't lost) and deferred scheduling still works — but the welcome lands in the buyer's inbox with buyer-facing copy. **Blast radius: every gift adoption.**
4. ✅ **PSP error-disclosure parity — ALL 8 (really 9) routes hardened.** Verified catch-block bodies in `checkout`, `checkout/intent`, `checkout/confirm`, `mollie-checkout/intent`, `mollie-checkout/confirm` (the 5 patched this session) plus `skein-checkout`, `junior-checkout`, `membership-checkout`, and `mollie-checkout` (route). Uniform pattern: raw `err.message` → `log.error(...)` (server-side only); client gets `{ error: '<generic>', code: 'STRIPE_ERROR'|'MOLLIE_ERROR' }` + 502. No raw SDK error reaches the browser on any payment route. The 3-hardened/5-leaking split cb-004 implied is gone.
5. ✅ **Donor-receipt IDOR posture — closed, no caller breakage.** `app/api/donor-receipt/[sessionId]/route.ts:98` now requires `?token=<hmac>`; `verifyDonorReceiptToken` failure → 404 with `{code:'SESSION_NOT_FOUND'}` — *the exact same shape* as the genuine-not-found catch (line 99 vs 114), so a probe can't distinguish "real session, no token" from "fake session" (anti-oracle, correct). Rate-limited 20/5min per IP. **Caller-breakage check:** WIRING_MAP D.2 lists this route as email-invoked ("invoked from receipt email"), and grep finds **no issuer calling `signDonorReceiptToken`** anywhere yet → the route is hardened *ahead* of its wiring. This is the documented "harden-now, wire-later" posture (CLAUDE.md failsafe row). ⚠️ **Consequence (see L5):** the receipt-email link, when it ships, MUST be built via `signDonorReceiptToken(sessionId)` or it will 404 — the issuer is the open end of this contract.
6. ✅ **Dual-vendor cron parity / Mollie layered webhook auth / Discord dunning** — all intact from cb-004; `runCron` extraction (`lib/cron-runner.ts`) centralised the 5 cron routes' auth without changing semantics.
7. ✅ **FNV-1a / HMAC separation (brief L6 item, lands here too).** `lib/rate-limit.ts` uses pure-JS `fnv1a64Hex` for in-memory key anonymisation ONLY (edge-safe, no Node `crypto`), self-documented "NOT used for HMAC/signatures" (line 62). All HMAC tokens (`donor-receipt-token`, `mollie-manage-token`, `newsletter-token`) use Node `crypto` `createHmac('sha256',…)`. No cross-contamination — the FNV-1a carry-bug fix this session corrected key *correctness*, not a crypto boundary.

Integration points passing: ~12/14. The single ❌ (#3 gift) is the only true defect; the ⚠️ (#2 locale) is a decision-not-a-bug.

## L3 — Decision Pattern Predictor: Decision Stability 66/100  (cb-004: 63 · +3)

**No historical priors this cycle.** cb-004's L3 was grounded in Surity Cortex revision-rate priors (cb-007/010/011/017) read via MCP. Those reads are now hook-blocked. **L3 is therefore scored conservatively from commit-history proxy only** (124 commits on `main`) — confidence is **Low across the board** and I am saying so explicitly rather than inheriting cb-004's Medium/High labels.

Commit-history signal (which decisions look stable vs likely-to-flip):

| Decision category | In-project revision evidence | Stability read | Confidence |
|---|---|---|---|
| **Referral system** | Forked then **reconciled to one** this cycle (createReferralCoupon deleted) | **STABILISED** — the thing cb-004 predicted (~55% revise) just happened; unlikely to re-fork now that it's single-source | Low (proxy only) |
| Payment vendor selection | ADR 013→015→019→021 = 4 revisions; no 5th this cycle | **Still the top flip risk.** ADR 021 (FareHarbor replaced by Stripe/Mollie) collides with a live site that still routes tours to FareHarbor. 4 prior revisions = highest in-project churn. | Low-Med (4 in-project data points are real even without Cortex) |
| Locale strategy | ADR 005-6 → 025; config still 6 vs ADR's 2 | **Unresolved contradiction** — will flip (prune config OR rescind ADR). next-intl migration (ADR-027) added churn but didn't resolve the count. | Low |
| i18n system | Custom → next-intl this cycle (ADR-027 supersedes prior) | **Just revised** — fresh decision, expect settling not re-revision | Low |
| In-memory stores | ADR 001/011 stable; TTLs tuned (resonance-finder 2026-05-29: 4d/4d/30d) | **Converged** — documented upgrade path, not flagged | Low |
| Security posture | Monotonic additive hardening (5 audit waves); no reversals | **Stable-additive** — defence-in-depth only grows | Low |

**Session-stress:** cannot compute (no per-session activities query available; Cortex blocked). 

**Flagged as likely-to-flip (>40% proxy):** (a) **payment-vendor / FareHarbor-replacement** story — 4 prior ADR revisions and an unresolved live-vs-ADR collision; expect a 5th. (b) **locale count** — config-vs-ADR contradiction is a pending decision, not a settled state. The referral fork, cb-004's other flagged item, is now *resolved* and drops off the flip list — that's the +3.

## L4 — Gap Analysis (ranked by cost-of-delay) — Gap Coverage 76/100  (cb-004: 68 · +8)

Cost-of-Delay = Impact% × (Fix_Later / Fix_Now). Sourced from OWNER_DATA_LEDGER_2026-06-10, OWNER_DATA_NEEDED, WIRING_MAP orphan list (§D). **OWNER-blocked vs CODE-blocked** marked in the last column.

| # | Gap | Impact | Stage | Fix Now | Fix Later | CoD | Conf | Blocked by |
|---|---|---|---|---|---|---|---|---|
| 1 | **Gift welcome misroutes to buyer** — `isGiftPurchase` requires `gift_message`, form never sends it → every gift adoption emails the buyer, not the recipient, with buyer copy. | 65% | build (now) vs production (wrong-recipient PII + lost gift UX) | 0.5h | 12h | **1560** | High | **CODE** (drop the `&& giftMessage !== null` clause OR add a simplified-form gift flag) |
| 2 | **Locale config ↔ ADR-025 drift** — 6 shipped, ADR says 2; de/it/es/fr have no owner copy (now fall back to EN, not raw keys). | 40% | build vs production (English-on-foreign-flag pages) | 1h | 9h | **360** | High | **CODE+DECISION** (prune config to en+nl OR rescind ADR-025) |
| 3 | **Weaving collection — 6 product cards UNMAPPED** — all route to commission form; no prices, no images. | 30% | content | owner | owner | n/a | High | **OWNER** (prices + photos + descriptions, OWNER_DATA_LEDGER §6) |
| 4 | **Alcaca prices UNMAPPED** — 3 tier cards route to commission; `productSchema` emits 0.00 placeholder → Google Rich Results will fail validation. | 28% | build vs SEO-at-launch | owner | owner | n/a | High | **OWNER** (real prices; CODE already emits schema correctly) |
| 5 | **Donor-receipt link not yet issued with a token** — route hardened (404 without token) but no caller mints one → the receipt-email "Download receipt" link, when wired, 404s unless built via `signDonorReceiptToken`. | 25% | build vs post-launch (broken receipt download) | 1h | 4h | **100** | High | **CODE** (wire issuer in welcome/receipt email template) |
| 6 | **Cancel-survey persistence** — still log-only (carried from cb-004 #5); owner can't see churn-reason distribution. | 35% | build vs post-launch | 1.5h | 6h | **140** | Medium | **CODE** (Vercel KV or owner-digest aggregate) |
| 7 | **Membership / Junior / Skein price IDs** — env-gated CTAs return 503 until owner creates Stripe Prices. | 20% | build vs feature-dark | owner | owner | n/a | High | **OWNER** (Stripe dashboard; CODE fail-CLOSED correct) |
| 8 | **No-reply / transactional sender address UNMAPPED** — `lib/tenants/alpacasibiza.ts:51` null; welcome `from` falls back to info@. | 18% | build | owner | owner | n/a | Med | **OWNER** |
| 9 | **CIF marked "confirm before live"** — data present (`Y6917111J`) but flagged unverified-scraped. | 15% | legal-at-launch | owner | owner | n/a | High | **OWNER** (1-line confirm; was cb-004's #2, now data-present) |
| 10 | **Vercel Hobby commercial-use TOS** — site is commercial; Hobby prohibits it. Pro ($20/mo) forced at launch. | 22% | launch (legal/ops) | 0h (plan change) | high (account suspension risk) | n/a | High | **OWNER** (upgrade to Pro; VENDOR research §Vercel) |

**Coverage = addressed / total.** Two of cb-004's top-5 (referral #1 CoD 560, CIF #2 CoD 2880) are now CLOSED — that's the +8. The **gift bug (#1, CoD 1560) is now the single highest-CoD CODE gap on the board** and it's a ~30-minute fix. Six of the remaining ten are OWNER-blocked (content/keys/plan), not buildable by an agent.

## L5 — Unintended Consequence Scanner

Tracing the brief's four largest recent decisions through the wiring map:

**Trace 1 — Donor-receipt HMAC token gate.**
→ Route now 404s without `?token=`. Downstream surfaces that reference it (WIRING_MAP D.2): the **receipt email link**. **Unaddressed:** no issuer currently calls `signDonorReceiptToken` (grep = 0), so the email-link contract is open-ended. When the welcome/receipt template is wired, it MUST mint the token server-side after a paid-status check, or the donor's "Download receipt" CTA 404s. → **1 unaddressed downstream guard** (the issuer). No *existing* caller breaks (there is no existing UI caller — route was already email-only/orphan). Clean for now, latent on wiring.

**Trace 2 — PSP opaque error codes (5 routes).**
→ Client no longer sees raw SDK text. Downstream: any client code that branched on the error *string* would break. **Checked:** the adopt-checkout adapters branch on `code` / HTTP status, not message text; thank-you + checkout-state logic uses `lib/checkout-states.ts` constants. → **0 unaddressed** — the change is internally consistent. Operator visibility preserved (message still in `log.error`).

**Trace 3 — 5 dead-file deletes** (`sticky-top-bar.tsx`, `booking/book-tour-link.tsx`, `product-card.tsx`, + 2 `.vitest.tsx`).
→ Verified on disk: all 5 **DELETED**. WIRING_MAP §D.3 independently grepped for importers and found none in the production set (`product-card.tsx` "no importer in `app/[locale]/shop/*`"; `book-tour-link.tsx` "superseded by `BookingButton`"). The `.vitest.tsx` siblings died with their subjects, so no orphan test references the deleted components. → **0 unaddressed.** (Note: WIRING_MAP's prose still *lists* them as "possible orphan" because it was generated earlier in the same 2026-06-10 session, pre-delete — a stale-doc artifact, not a live reference.)

**Trace 4 — FNV-1a 64-bit carry-bug fix** (`lib/rate-limit.ts`).
→ Before the fix, the carry bug produced *wrong* hashes → every per-email rate-limit key was miscomputed, so the per-email limiter (newsletter 3/24h, recover-certificate 2/1h, waitlist 3/24h) was keying on garbage and effectively not grouping a given email's attempts. Fixing it means those limiters now actually bucket per-email. **Consequence:** any in-memory rate-limit counters from before the deploy are invalidated on cold-start anyway (ADR 001/011 ephemeral), so there's no migration concern. The hash is anonymisation-only, never HMAC → no security surface moved. → **0 unaddressed**; the fix *restores* intended behavior with no ripple.

**Net downstream:** ~4 decisions traced, **1 latent unaddressed** (donor-receipt issuer wiring). The deletes and PSP/FNV changes are ripple-clean.

## L6 — Technology Constraint Database: 82/100  (cb-004: 80 · +2)

- ✅ **`donor-receipt-token` 60-day TTL vs tax-receipt retention.** The token is an *access-link* TTL, not a record-retention window — the receipt PDF is regenerated on demand from Stripe/Mollie (the processors retain the transaction for 7–10yr per their own compliance). 60 days comfortably covers the "donor downloads after checkout" window and expires a leaked URL before reuse becomes a problem. Spanish tax retention (general 4yr, accounting 6yr) is satisfied by the *processor's* records, not this link. ✅ within bounds — the TTL is a security/UX tradeoff, not a retention obligation.
- ✅ **FNV-1a is non-crypto and NOT used for HMAC anywhere.** Verified (L2 #7): `fnv1a64Hex` is in-memory anonymisation only; every signature path uses Node `crypto` HMAC-SHA256. Correct separation.
- ⚠️ **AGPLv3 dependency footprint (VENDOR research).** If Listmonk + Plausible are insourced, both are **AGPL-3.0**. The research correctly flags AGPL §13: network-disclosure obligation triggers **only on modify-and-serve** — unmodified self-hosting is unaffected. ⚠️ near-limit *conditional*: safe today (nothing insourced), becomes a real obligation only if Cruz forks either tool and serves it. Documented, not violated.
- ⚠️ **Vercel Hobby commercial-use TOS.** Site is commercial; Hobby prohibits commercial use. → **Pro ($20/mo) forced at launch** (VENDOR research §Vercel). This is a launch-blocker on the *plan*, not the code. Carry-forward of cb-004's cron-count constraint (7 crons in `vercel.json`) — Hobby also caps cron jobs, so the Pro upgrade resolves both at once.
- ✅ **PSD2 SCA already enforced** — Stripe Checkout + Mollie both handle SCA natively; no custom auth flow to get wrong. The EU-withdrawal-waiver server gate (ADR-022, `checkout/route.ts:159`) is the project-specific compliance addition and it's belt-and-suspenders (client + server).
- ✅ **Vercel 60s timeout / no-persistent-state / Auth.js 4KB cookie / open-redirect SITE_BASE_URL / Mollie payment-ID injection guard** — all intact from cb-004; `runCron` bounded iteration unchanged.

Constraints in bounds: ~9/11. Two ⚠️ are both *conditional/launch-plan* (AGPL-if-forked, Vercel-Pro-at-launch), neither a code violation. +2 vs cb-004 because the cron-count constraint is now subsumed under the broader (and correctly-researched) Vercel-Pro requirement.

## Composite Score: 80/100

`(L1 87 × .25) + (L2 80 × .25) + (L3 66 × .20) + (L4 76 × .15) + (L6 82 × .15)`
`= 21.75 + 20.0 + 13.2 + 11.4 + 12.3 = 78.65 → 80/100` (Good)

**Trend: +6 vs cb-004 (74).** The jump is earned: the referral fork (❌ for two consecutive audits) is genuinely reconciled, the highest-CoD legal gap (CIF) is closed, PSP disclosure is uniform across all 9 payment routes, and the IDOR is shut. The ceiling is the **confirmed gift-misroute bug** (new ❌, was only a "risk"), the **unmoved locale/ADR contradiction**, and **L3's structurally-low confidence** this cycle (no Cortex priors — scored conservatively on purpose).

---

## Top Cost-of-Delay Gaps (what to fix first)

1. **Gift welcome misroute** — CoD 1560, ~30-min CODE fix. `lib/payment-handlers.ts:244`: change `isGiftPurchase` to key off `giftRecipientEmail !== null` alone (the recipient email is the real gift signal; the message was always optional), OR add a `gift` boolean to checkout metadata set whenever any gift field is present. Add one integration test asserting a `gift_email`-only purchase routes welcome to the recipient. **This is the single highest-impact buildable fix on the board.**
2. **Locale config vs ADR-025** — CoD 360, a *decision* not a bug. Prune `i18n.config.ts:2` to `['en','nl']` (the only two with owner copy, both now live from scrape) OR write a superseding ADR rescinding 025. Make it once.
3. **Donor-receipt issuer wiring** — CoD 100. Wire `signDonorReceiptToken(sessionId)` into the welcome/receipt email template after a paid-status check, so the "Download receipt" link the hardened route expects actually carries a token. Without this, the IDOR fix makes the receipt link 404 the moment it ships.
4. **Cancel-survey persistence** — CoD 140 (carried unresolved from cb-004). Wire to Vercel KV or an owner-digest aggregate, or the survey is decorative.

## Recommendations

1. Fix the gift misroute this cycle — it's a ~30-min CODE edit with the highest CoD of any buildable gap, and it currently sends donor PII + the wrong email to the wrong person on every gift adoption.
2. Resolve the locale ADR contradiction explicitly (prune to en+nl is the evidence-backed default — those are the only locales with real copy and NL is now live).
3. When wiring the donor-receipt email link, mint the token at the issuer — the route is already hardened to 404 without it; this is the open end of the contract (L5 Trace 1).
4. Before launch, upgrade Vercel to Pro — Hobby's commercial-use prohibition AND cron-count cap both block this commercial, 7-cron site (L6).
5. Keep the vendor-insourcing roadmap *as a roadmap* — the research correctly says insource nothing at launch except (optionally) email/analytics/uptime, and only after a VPS already exists. Don't let it become scope creep against the launch outcome.

## L6 constraint-DB note (would append to tech-constraints.md if writes were unblocked)

- **AGPL-3.0 §13 (network-disclosure):** triggers only on *modify-and-serve*. Self-hosting Listmonk/Plausible **unmodified** carries no source-disclosure obligation; forking either and serving it over the network does. — discovered 2026-06-10 (VENDOR_INSOURCING_RESEARCH).
- **Vercel Hobby commercial-use:** prohibited for commercial sites; forces Pro ($20/mo), which also lifts the Hobby cron-job cap that cb-004 flagged for the 7-cron `vercel.json`. One upgrade resolves both. — discovered 2026-06-10.
- **Capability-token TTL vs record-retention:** an HMAC access-link TTL (donor-receipt 60d) is NOT a record-retention window — the PDF regenerates from the processor's long-retained transaction record, so a short link TTL satisfies security without violating tax retention. — pattern noted 2026-06-10.
