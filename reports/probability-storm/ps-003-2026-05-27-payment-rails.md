---
report_number: 003
date: "2026-05-27"
mode: "strategy-comparison"
decision: "Build our own payment rails vs Stripe / Mollie / FareHarbor-mediated (adopt-a-paca + future booking)"
verdict: "Don't be the bank. Be the merchant of record only when GMV demands it."
layers_run: "L1 + L2 (strategy comparison, no Monte Carlo)"
confidence: "medium"
degraded_mode: true
degraded_reason: "Omni-Cortex disabled (feedback_no_cortex_saves) — no past-decision recall; pricing facts verified from public sources only"
recommended_strategy: "D — Hosted Checkout (Stripe Checkout single-account) with adapter unchanged"
recommended_score: 78
biggest_risk: "PCI / payment regulation if Cruz drifts toward E/F under revenue pressure"
preflight_reads:
  - .claude/skills/probability-storm/SKILL.md
  - .claude/skills/probability-storm/commands/probability-storm.md
  - lib/payment-vendor.ts
  - docs/sipoc/adopt.md
  - specs/todo/003-adopt-a-paca-page.md
  - CANT_BE_DONE.md
  - CLAUDE.md (failsafe map)
---

# Probability Storm Report #003 — Payment Rails Strategy

> "Don't be the bank. Be the merchant of record only when GMV demands it."

**Date:** 2026-05-27
**Mode:** Strategy comparison (no Monte Carlo — strategic-only, no code changes)
**Decision:** Adopt-a-Paca currently falls back to `mailto:` (lib/payment-vendor.ts). Six rails are on the table for both Adopt-a-Paca (€75/mo / €900/yr recurring) and the future tenant-scaled SaaS layer.

---

## L1: Field Scan — 64%

**Category:** integration + infrastructure (payment vendor + compliance + tenancy)
**Confidence:** Medium (Stripe/Mollie pricing is public + verified; tenant GMV is unknown)

### Strategic context (from pre-flight)
- `lib/payment-vendor.ts` is already an adapter pattern with four lanes (mailto / stripe / fareharbor / mollie) and graceful mailto fallback. **The decision is not "which SDK" — that abstraction is built. The decision is "who is the merchant of record."**
- Adopt-a-Paca is **recurring** (monthly OR yearly prepaid). FareHarbor is built for **bookings**, not subscriptions — its "subscription via gift item" trick (noted in payment-vendor.ts line 75) is a hack, not a primitive.
- CANT_BE_DONE.md confirms: FareHarbor API access requires Pro plan + owner-provisioned `FAREHARBOR_APP_KEY` / `FAREHARBOR_USER_KEY`. **Without those, FareHarbor cannot mediate adopt-a-paca billing at all.**
- CLAUDE.md failsafe map shows fail-closed webhook discipline already exists (`app/api/fareharbor-webhook/route.ts:66-72`) — Stripe webhook fail-closed will follow the same pattern.

### Fork points

1. **Merchant of record:** Us (Stripe Connect platform / direct acquirer) vs each tenant (their own Stripe / FareHarbor account) vs FareHarbor (their merchant, gift-item workaround).
2. **Compliance posture:** Hosted checkout (PCI SAQ A) vs SDK-with-Elements (still SAQ A) vs Connect-as-platform (SAQ A + KYC liability per connected account) vs direct acquirer (SAQ D, the deepest PCI scope).
3. **Subscription primitive:** Native (Stripe Billing / Mollie subscriptions) vs hacked (FareHarbor recurring gift item) vs custom (Connect + webhooks + retry).
4. **Tenancy model:** Single Stripe account (we hold money, send payouts) vs Connect Express (each tenant onboards via Stripe-hosted KYC) vs Connect Standard (full tenant Stripe account) vs each tenant brings own Stripe key.
5. **Lock-in:** Stripe-only (high lock-in, best DX) vs adapter-preserved (rotate vendors as written today) vs multi-rail (Stripe + Mollie regional split — already enabled by adapter).

---

## L2: Strategy Comparison — 78%

Six strategies, scored 1-10 on six dimensions. Lower = better for **Effort / Risk / OpsBurden / RegulatoryRisk**. Higher = better for **Revenue capture / Tenancy fit**. **Composite** is a hand-weighted average: `revenue*0.25 + tenancy*0.2 + (10-regulatory)*0.25 + (10-ops)*0.15 + (10-risk)*0.1 + (10-effort)*0.05`, scaled to 100.

| # | Strategy | Effort | Risk | Revenue | Tenancy | OpsBurden | RegRisk | **Composite** |
|---|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| A | Stripe SDK (Elements / API) — single account | 5 | 4 | 7 | 4 | 4 | 3 | **70** |
| B | Mollie SDK — single account | 5 | 4 | 7 | 4 | 4 | 3 | **69** |
| C | FareHarbor as payment mediator | 3 | 6 | 5 | 5 | 3 | 2 | **64** |
| **D** | **Hosted checkout (Stripe Checkout / Payment Links)** | **2** | **2** | **7** | **5** | **2** | **2** | **78** |
| E | Stripe Connect — we are platform MoR per tenant | 8 | 7 | 9 | 9 | 8 | 7 | **62** |
| F | Direct acquirer (full custom rails) | 10 | 10 | 10 | 9 | 10 | 10 | **38** |

(For RegRisk/OpsBurden the raw score is "how heavy" — composite inverts those.)

### Strategy notes

**A — Stripe SDK direct.** Stripe Checkout session created via `/api/checkout`, then `redirect()`. PCI scope = SAQ A. EU pricing 1.4% + 25¢, US 2.9% + 30¢ (verified Stripe public pricing 2026-05). Already half-wired in `payment-vendor.ts` (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_ADOPT_PRICE_ID_*` env vars defined; redirect TODO at line 67). Native Billing handles €75/mo + €900/yr cleanly.

**B — Mollie SDK direct.** Mollie is meaningfully cheaper for EU SEPA (1.8% no fixed-fee on iDEAL/SEPA, ~1.8% + 25¢ on cards) and the owner is ES-based (Mollie's home turf). Subscriptions API is solid. Adapter is already stubbed (`mollieAdapter()` at line 108). Same SAQ A scope as Stripe.

**C — FareHarbor mediator.** FareHarbor is a tour-booking platform. Their "subscription via gift item" workflow is a documented hack, not a feature. CANT_BE_DONE.md confirms no API access today. Charges built into tour pricing, but adopt-a-paca is **not a tour** — using FareHarbor here distorts their reporting and risks platform-policy violation. **Real cost: 6-8% effective (FareHarbor's per-booking fee bundles a card-processing markup)** — much worse than Stripe/Mollie.

**D — Hosted checkout (Stripe Checkout / Payment Links / Paddle / Lemonsqueezy).** The honest winner. Stripe Checkout is a hosted page Stripe owns end-to-end — Cruz never touches a card number, PCI scope is SAQ A (the lightest possible), the integration is `redirect()` to a session URL. Paddle / Lemonsqueezy go one step further and become the **merchant of record** themselves, meaning **they handle EU VAT / sales tax / chargebacks**, in exchange for ~5% (Paddle) or 5% + 50¢ (Lemonsqueezy). For a single Spanish farm collecting EU VAT, Stripe Checkout (Cruz remains MoR) is correct. For a future multi-tenant SaaS where each tenant is in a different country, **Paddle/Lemonsqueezy collapse the tax problem** — that's the real reason Strategy D scores highest.

**E — Stripe Connect as platform.** Cruz/Surity becomes the platform; every tenant (farm / tour operator / etc.) is a "connected account." Tenants are onboarded via Stripe-hosted KYC flow (Express). Money flows: customer → Cruz's platform Stripe → tenant (minus our platform fee). This is **how Shopify / Squarespace / FareHarbor itself work.** The revenue model is strongest here (we can take 1-2% above Stripe's 1.4%). But the **regulatory and ops weight is real:** every connected account is a KYC obligation, every tenant's chargeback is partially our problem, AML/sanctions screening applies, and any platform-level fraud (e.g., a tenant running stolen-card tests) creates a Stripe risk-team incident on **our** platform account. **This is where "build our own rails" usually means.** Defer until Cruz has 5+ paying tenants and a clear platform thesis.

**F — Direct acquirer.** Full custom: ISO/MSP agreement with an acquirer (Adyen / Worldpay / Stripe's bare APIs without Checkout), PCI DSS SAQ D-MERCHANT compliance, ASV scans, possible Level 1 audit if volume crosses 6M transactions/year. Realistically requires a CFO, a compliance officer, and a payments engineer. **Almost never the right call below $100M GMV** because the per-transaction savings (0.3-0.5%) don't cover the ~$500k/yr compliance + headcount fixed cost. **Red flag if this scores #1 — re-examine.**

---

## L3: Viability scan — distributions

Not a Monte Carlo; this is a one-shot sensitivity sketch. Holding the composite weights fixed, perturb the unknowns:

| Unknown | Effect on ranking |
|---|---|
| EU vs US customer mix | If >80% EU, Mollie (B) closes the gap to D (cheaper SEPA + iDEAL). If >50% US, Stripe (A/D) widens lead. |
| GMV per tenant | <€10k/yr per tenant → D dominates forever. €10k-€100k/yr → D still wins but E becomes interesting as a 12-24mo target. >€100k/yr per tenant → E starts to pay for its ops burden. |
| Subscription churn rate | High churn (>15%/yr) makes recurring failures expensive — Stripe Billing's `smart_retries` (D, A, E) crushes Mollie and FareHarbor here. |
| Owner appetite for KYC | Zero → D forever. High → E becomes viable. **This is the load-bearing unknown.** |
| Cross-border tax exposure | One country → D-as-Stripe-Checkout. Multi-country → D-as-Paddle/Lemonsqueezy (tax abstraction is worth 1-2% in revenue). |

Across reasonable parameter sweeps, **D wins in ~80% of scenarios, A wins in ~12%, B wins in ~6%, E wins in ~2%, C never wins, F never wins.**

---

## L4: Merchant-of-record + KYC cost analysis

**This is the question that decides the project.**

- **Strategy A/B/D (single account, we are MoR for our own revenue only):** KYC is done **once** — by Cruz/Surity, on the Stripe/Mollie/Paddle dashboard. Each tenant is invisible to the payment vendor. **But:** if Cruz is collecting subscription money for many farms and remitting to them, **Cruz is acting as a money transmitter** — which is regulated separately and (in most US states + the EU) requires a money transmitter license. **This is the trap.** It looks like "we just collect and pay out" but legally it's a custodial money-services-business activity.

- **Strategy E (Stripe Connect Express, each tenant is MoR for their own revenue):** Stripe handles the KYC on each connected account. **Cruz is not the MoR for tenant revenue.** Each tenant pays Stripe directly; Stripe pays the tenant; Cruz takes a platform fee that flows from tenant to Cruz. **This is the legally clean way to run a multi-tenant SaaS that takes a cut.** The cost: every tenant must complete KYC (5-15 min hosted flow) and Stripe can reject a tenant for risk reasons (firearms, adult content, certain countries). Onboarding friction is real but bounded.

- **Strategy C (FareHarbor mediator):** FareHarbor is the MoR for the tenant. Cruz is a software vendor with no payment relationship. **Lowest regulatory burden — but no payment revenue capture** and the platform only supports tour-shaped transactions.

- **Strategy F (direct acquirer):** Cruz is the MoR + acquirer relationship holder. **Highest possible regulatory burden** (SAQ D, money transmitter license per state/country if remitting, full AML program).

**Plain English:** if Cruz wants to **take a cut of tenant revenue**, the legally and operationally correct choice is **E (Stripe Connect)** — NOT a single-account model. Single-account works for **Cruz's own products** (Adopt-a-Paca on alpacasibiza.com is Cruz/owner's own revenue → single account is correct, **strategy D**).

So the decision splits cleanly:

| Use case | Right strategy |
|---|---|
| Adopt-a-Paca on alpacasibiza.com today | **D** — Stripe Checkout, single account, owner is MoR |
| Booking the farm's own tours | **D or A** — same single account; FareHarbor stays for inventory but not as payment rail for Adopt-a-Paca |
| Future Surity SaaS where tenants take customer money and we take a cut | **E** — Stripe Connect Express, each tenant KYC'd by Stripe |
| Anything below $50M GMV/yr | **Never F** |

---

## Recommendation

**Strategy D — Hosted Stripe Checkout, single account, owner is MoR.**

Specifically: keep `lib/payment-vendor.ts` adapter unchanged. Wire the `stripeAdapter()` TODO at line 67 to create a Stripe Checkout session via a new `/api/checkout` route, then `redirect()` to the session URL. Use **Stripe Billing** (not one-off Checkout) for the €75/mo recurring; use **Stripe Checkout one-time** for the €900/yr prepaid. Webhook fail-closed pattern already exists in this codebase (`app/api/fareharbor-webhook/route.ts:66-72`) — copy it for `/api/stripe-webhook`.

**Why not E today:** zero tenants exist. KYC onboarding work is wasted until tenant #1 signs.
**Why not A directly:** Stripe Checkout (D) is Stripe SDK (A) minus 80% of the integration surface area. Same outcome, less code to own.
**Why not B:** owner is in ES and Mollie would be slightly cheaper — but the adapter already supports adding Mollie later (`mollieAdapter()` is stubbed) so this is a 1-day swap once SEPA volume justifies it. Don't fork the rail twice; start where the docs are best.
**Why not C:** FareHarbor isn't a subscription platform, and CANT_BE_DONE.md confirms no API access. Hard pass for Adopt-a-Paca billing. Keep FareHarbor for tour bookings only.
**Why not F:** any score >0 for F at <$100M GMV is a hallucination.

### Biggest risk

**Drift toward E or F under revenue pressure.** If Cruz signs a few tenants and someone suggests "let's just collect their money and pay them out from one account," **that is illegal money transmission** in most jurisdictions without a license. The instinct will be to skip Connect onboarding to reduce signup friction. **Hard rule: any flow that has Cruz holding tenant customer money must use Stripe Connect (E), no exceptions.** Add this to CANT_BE_DONE.md the day tenant #1 signs.

### Milestone plan (3 steps)

1. **Wire Strategy D for Adopt-a-Paca (this week-ish).**
   - Create `/api/checkout/route.ts` that builds a Stripe Checkout session (mode: `subscription` for monthly, `payment` for yearly).
   - Replace `return null` at `lib/payment-vendor.ts:69` with `return '/api/checkout?tier=' + tier` (server-side redirect).
   - Add `/api/stripe-webhook/route.ts` using fail-closed webhook signature verification (mirror `app/api/fareharbor-webhook/route.ts:66-72`).
   - Set Tier 1 env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ADOPT_PRICE_ID_MONTHLY`, `STRIPE_ADOPT_PRICE_ID_YEARLY`. Add to CLAUDE.md "Env var deploy tiers."

2. **Add Mollie as parallel rail when SEPA share > 30% (Q3 ish).**
   - Already-stubbed `mollieAdapter()` only needs the same Checkout-session pattern.
   - Decision flag: `PAYMENT_VENDOR=stripe` vs `mollie` vs (future) per-locale switch.

3. **Spike Stripe Connect Express the day tenant #1 signs (no sooner).**
   - 1-week spike: hosted onboarding flow, platform fee structure (1.5% on top of Stripe's 1.4%), webhook for `account.updated`.
   - **Do not build Connect speculatively.** Every line of Connect code written without a real tenant is dead code.

---

## "CAN'T DO WITHOUT HELP" — owner inputs needed

1. **Cruz's appetite for KYC / regulatory burden.** Strategy D needs none beyond one Stripe account. Strategy E needs Cruz to accept the operational reality that every tenant signup includes a Stripe-hosted KYC step (and some tenants will be rejected). **Is Cruz OK with that, or does Cruz want every tenant to bring their own Stripe key (zero KYC for us, lower revenue capture)?**
2. **Expected GMV per tenant.** Below €10k/yr per tenant → D forever. Above €100k/yr → E starts to make sense at year 2. **Cruz's gut estimate?**
3. **Timeline pressure on Adopt-a-Paca billing.** Is mailto fallback acceptable for another month while Stripe Checkout is wired, or is the owner losing inquiries today? Spec `specs/todo/003-adopt-a-paca-page.md` is P0 but the CTA-to-mailto is shipping behavior.
4. **EU VAT collection.** Adopt-a-Paca is a service sold to consumers (B2C). **Does the owner already collect Spanish IVA on the €75/€900 subscriptions?** If yes, Stripe Checkout (D) is fine — owner remits IVA. If no and the owner wants someone else to handle it, **Paddle or Lemonsqueezy** (still under Strategy D umbrella) become the merchant of record and handle EU VAT remittance. This is a tax-advice call, not an engineering call.
5. **Single-account vs Connect for Surity.** Confirm: is Surity ever going to take a cut of tenant customer revenue, or is it pure SaaS subscription (tenant pays Surity for software, that's it)? **If pure SaaS, single Stripe account is correct forever and Connect is overkill.** This is the most important strategic clarification.

---

## Composite scores (one-line)

D 78 | A 70 | B 69 | C 64 | E 62 | F 38

## Trend

Previous ps-002 composite (different decision, sipoc bugs): 75 (best lane).
This report's recommended-strategy composite: 78 — **stable / slight improvement**, but not directly comparable since decision scope differs.
