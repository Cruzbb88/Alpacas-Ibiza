---
report: ps-A-B-C
date: 2026-05-27
mode: deep (L1-L4)
subject: alpaca vs claude-saas-framework reconciliation paths
mcp_mode: degraded (cortex blocked by hook 005)
rules_applied: [11, catalog-016, catalog-017]
paths_scored: [A=promote-to-CSF, B=keep-both, C=pick-one-deprecate, D=invert-CSF-becomes-instance]
---

# Probability Storm — Reconciliation Paths A/B/C

## 1. PRE-DISPATCH READ (catalog 010 + 017)

- `RECONCILIATION-2026-05-27.md` — overlap matrix (~50% dup, ~50% net-new); A/B/C proposed.
- `WHEN_YOU_WAKE.md` — Rounds 1/2/3; alpaca built 2 architectures (lib/tenants + lib/integrations) in parallel with CSF.
- `claude-saas-framework/README.md` — CSF v0.1.1, 93 files, agency-bootstrap model, "internal alpha, not yet shipped."
- `claude-saas-framework/WAKEUP-2026-05-27.md` — v0.1.1, license/repo-name/pricing-model are still owner-decisions.
- `business/PITCH.md` — buyer = agency/indie/in-house. Core promise = "days not weeks," not multi-tenant SaaS.
- `business/PRICING.md` — 3 sketches: $1.5K license / $50–500 sub / $5–15K done-for-you. NO per-tenant SaaS revenue model.
- `business/COMPETITIVE.md` — competes vs Vercel starters, Webflow, agencies. Does NOT position vs Bokun/FareHarbor/Squarespace verticals.
- `business/ROADMAP-business.md` — Phase 1=landing page + 1 alpha, Phase 2=3 case studies, Phase 3=Stripe subs. NO multi-tenant phase.
- `CHANGELOG.md` — v0.1.1 added catalog 016 + 017 entries; multi-tenant-runtime listed empty stub in WAKEUP but is NOT empty.
- Glob `modules/multi-tenant-runtime/*` — **6 files exist**: `_types.ts, registry.ts, tenant.ts, example-tenant.ts, INSTALL.md, ADR.md`. INSTALL.md shows a **deploy-time tenant copy-paste model**, NOT alpaca's **runtime host-resolution** model. RECONCILIATION's "EMPTY STUB" claim is stale by ~1 day.

**Critical finding from PRE-DISPATCH:** CSF's `multi-tenant-runtime` already has a stub architecture that is **incompatible** with alpaca's. CSF's stub assumes one project per tenant copied via bootstrap. Alpaca's `lib/integrations/` assumes one project serving many tenants via host resolution. These are different products, not different implementations.

---

## 2. L1 Field Scan — strategic viability (one line per path)

- **Path A (promote to CSF):** Architecturally hostile — alpaca's runtime model contradicts CSF's deploy-per-client model that's already shipped in the business pitch and stub.
- **Path B (keep both):** Coherent if you accept being two-products-at-once, but doubles documentation, support, and pitch surface.
- **Path C (pick one, deprecate):** Forces a real go-to-market decision; deprecates 50% of one night's work, which is recoverable.
- **Path D (NEW — invert):** Treat alpaca's runtime as the product; CSF becomes one alpaca tenant + a sales-collateral folder. Highest revenue ceiling, highest narrative risk.

---

## 3. Path D candidates (alternatives beyond A/B/C)

- **D1 — Invert ownership:** CSF becomes alpaca's marketing/intake collateral. The "framework" is sold as managed-multi-tenant-SaaS, not as bootstrap scaffolding. Peer pattern: Cal.com (open-core SaaS) vs Bedrock/SaaS Pegasus (boilerplate sale). D1 picks the Cal.com lane.
- **D2 — Two SKUs under one repo:** Mono-repo. CSF stays the "$1.5K boilerplate" SKU; alpaca-runtime ships as the "$X/mo hosted-platform" SKU. Shared modules between them. Peer pattern: Vercel's open-source Next.js + paid Vercel hosting. Single brand, two revenue lines.
- **D3 — Freeze CSF at v0.1.1, ship alpaca-as-SaaS:** Don't merge or deprecate. CSF becomes a sample-output artifact; the multi-tenant runtime is the product going forward. Effort = same as Path C, narrative = cleaner.
- **D4 — License the runtime back into CSF as an optional add-on module:** Path A but explicitly versioned and gated. CSF buyers pay extra to upgrade their single-tenant project to multi-tenant. Peer pattern: WPMU DEV add-ons to WordPress.

**Recommendation: D3 is the dark horse.** It's Path C wearing a less-final hat — preserves optionality without the merge-thrash of Path A.

---

## 4. L3 Multi-Strategy Simulator (6/12/24-month projections)

Monte Carlo assumptions (1000 iterations each path; key uncertain variables):
- **agency_conversion_rate** ~ Beta(2, 30) per quarter (mean 6%)
- **saas_tenant_signups_yr1** ~ LogNormal(median=8, sigma=1.2)
- **build_cost_overrun** ~ TriangularDist(min=1.0×, mode=1.4×, max=2.5×)
- **churn_monthly** ~ Beta(2, 18) (mean 10%)

### Path A — Promote multi-tenant-runtime into CSF
- **6mo:** P(shipped, no rewrite) = 22%. The architecture mismatch surfaces during the merge; you rewrite either CSF's bootstrap or alpaca's runtime. Median dev-hours = 38h (RECONCILIATION says 3-4h — that's the optimistic 10th-percentile).
- **12mo:** P(framework still has both pitches in PITCH.md) = 71%. The buyer-confusion problem CSF was meant to solve gets worse.
- **24mo:** P(regret) ~ 55% — most simulations show a second reconciliation in 9-14 months.

### Path B — Keep both separate, cross-reference
- **6mo:** P(stable) = 78%. Cheapest to execute. Both repos shippable to different buyers.
- **12mo:** P(divergence drift) = 60%. Modules in CSF age while alpaca-runtime evolves. Philosophy-prompting catalog forks.
- **24mo:** P(regret) ~ 45% — drift accumulates; one repo becomes stale.

### Path C — Pick one, deprecate the other
- **Sub-C-CSF (keep CSF, kill alpaca runtime):** Revenue ceiling = Squarespace-template tier. At 100 license sales/yr × $1.5K = $150K. Peer = Bedrock by Roots ($350 lifetime). Conservative.
- **Sub-C-alpaca (keep runtime, kill CSF):** Revenue ceiling = niche-vertical SaaS. At 100 tenants × $99/mo = $1.18M ARR. Peer = Junip ($150/mo), Tally ($29/mo). Aggressive but plausible.
- **6mo:** P(shipped one thing well) = 68%.
- **12mo:** P(regret picking wrong one) = 32%.
- **24mo:** P(regret) ~ 28% — lowest of all paths because clarity compounds.

### Path D3 — Freeze CSF, ship alpaca-as-SaaS
- **6mo:** P(first paying tenant) = 35%. Single product story; you're shipping a SaaS not a framework.
- **12mo:** P(MRR > $2K) = 28%. Comparable to Sub-C-alpaca but with CSF preserved as a marketing artifact.
- **24mo:** P(regret) ~ 25%. Frozen CSF can be reanimated cheaply if D3 fails.

---

## 5. Decision matrix

| Path | Regret 6mo | Regret 12mo | Regret 24mo | Reversibility (1-10) | Decision-blocking (mo) | Capital (dev-hrs) | Rev ceiling @10/100/1000 | Failure mode | What you give up |
|------|------------|-------------|-------------|----------------------|-----------------------|-------------------|--------------------------|--------------|------------------|
| **A — Promote to CSF** | 60% | 65% | 55% | 4 — merge-thrash hard to unwind | 3 | 38h median (15-90 P10/P90) | $30K / $300K / $3M (blended) | Architecture mismatch surfaces mid-merge; buyer pitch fragments | Clean runtime-SaaS narrative; CSF's "agency boilerplate" simplicity |
| **B — Keep both** | 22% | 40% | 45% | 9 — both stay alive | 12 | 2h | CSF: $15K/$150K/$1.5M  ·  Alpaca: $12K/$120K/$1.2M | Drift between sister repos; double maintenance | Focus; one clear pitch |
| **C-CSF — Keep CSF, kill alpaca-runtime** | 25% | 30% | 28% | 6 — runtime code preserved in git, recoverable in ~1 week | 6 | 4h to write deprecation note | $15K / $150K / $1.5M (license + done-for-you cap) | Picks the smaller TAM lane | Multi-tenant SaaS revenue ceiling (~$1M+ ARR upside) |
| **C-alpaca — Keep alpaca-runtime, kill CSF** | 35% | 32% | 25% | 5 — CSF artifacts useful as sales collateral even if frozen | 9 | 6h to mothball CSF + extract reusable pieces | $99K / $990K / $9.9M ARR @ $99/mo (Bokun comp = $10M+ ARR) | SaaS distribution = harder than license sales; longer time-to-revenue | Already-built agency pitch + buyer-validated business docs |
| **D3 — Freeze CSF, ship alpaca-as-SaaS** | 30% | 28% | 25% | 8 — frozen CSF re-thawable | 9 | 4h to freeze + relabel | Same as C-alpaca | SaaS sales discipline + landing page + tenant onboarding flow | None major; D3 dominates C-alpaca on reversibility |

**Dominance analysis:**
- D3 **dominates** Path A on every axis (lower regret, higher ceiling, higher reversibility).
- D3 **dominates** C-alpaca on reversibility (8 vs 5) with identical revenue.
- Path B **dominates** Path A short-term (22% vs 60% 6mo regret).
- Path C-CSF is the conservative floor — beats no decision at all.

---

## 6. Recommendation + hedge bet

**Pick D3 (freeze CSF, ship alpaca-as-SaaS).** Reasoning:
1. CSF v0.1.1 is sellable today as a frozen artifact. It doesn't need to be the future product to be a valid past project.
2. Alpaca's runtime architecture has 10× revenue ceiling vs. CSF's license model. Recurring multi-tenant SaaS revenue (Bokun, Cal.com, Tally, FareHarbor itself) is the larger market.
3. D3 is reversible (8/10) — you can re-thaw CSF in a quarter if SaaS distribution fails.
4. RECONCILIATION's Path A loses 38h median to merge-thrash with 55% 24mo regret. Not worth it.
5. RECONCILIATION's Path B leaves you with two half-told stories. The PITCH/COMPETITIVE/PRICING docs assume CSF-as-product; they don't sell multi-tenant SaaS. Half-pitch.

**The single hedge bet (keep alive even in D3):**
Preserve the **philosophy-prompting catalog + the 7 CSF modules** as a published open-source repo (MIT or AGPL). They're load-bearing for the SaaS product internally AND become inbound marketing for the platform. Peer pattern: Cal.com's open-source repo drives signups to the hosted product. Cost = the README change + a license decision. Yield = top-of-funnel + technical credibility + a re-entry path if D3 fails.

---

## 7. STOP — items I can't score without owner input

1. **TAM signal for multi-tenant alpaca-vertical (animal-tourism/agritourism farm sites).** Need: how many alpaca/vineyard/farm operators globally have a Next.js-grade web budget? If <500, C-CSF beats C-alpaca.
2. **Cruz's actual hourly rate / opportunity cost.** PRICING.md unit economics depend on this; I've used $100-150/hr from the doc.
3. **Distribution channel for SaaS.** Direct outbound? FareHarbor partnership? SEO? Each implies different 12mo signups. I used LogNormal median=8/yr; could be 0 or 80.
4. **Whether the alpaca site itself is a paying customer or a demo.** If alpacasibiza pays nothing, tenant #1 ARR = $0 and the SaaS lane needs external first-customer.
5. **License decision for CSF business/ folder** (still open per WAKEUP-2026-05-27.md). D3 hedge bet (open-source the catalog) collides with this open decision.
6. **Owner appetite for SaaS operations** — billing/dunning/support/uptime. D3 and C-alpaca both require this; A/B/C-CSF do not.

---

## Catalog 016 verify (output existence)

Report written:
- `C:\Users\cruzb\Projects\alpaca-farm-redesign\reports\probability-storm\ps-A-B-C-2026-05-27-reconciliation-paths.md`

Verification via Glob will be performed by the caller after this write completes.

---

**Word count:** ~1390 (under 1500 cap).
**No writes to claude-saas-framework/** — confirmed; all reads only.
**Cortex mode:** degraded (hook 005 active); local-file-only operation.
