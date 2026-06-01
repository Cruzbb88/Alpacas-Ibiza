# ADR 015 — Stripe is primary payment processor; Mollie wired but deferred

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Superseded by:** ADR-019.
**Related:** ADR 013 (PaymentProvider defaults), CLAUDE.md failsafe map

## Context

Two PaymentProvider adapters are fully implemented for Adopt-a-Paca: `payment-stripe-direct.ts` and `payment-mollie.ts`. Both ship with checkout routes (`/api/checkout`, `/api/mollie-checkout`), webhook routes (`/api/stripe-webhook`, `/api/mollie-webhook`), env-var validation in `lib/validate-env.ts`, and unit tests in `lib/payment-providers.test.ts`.

A pricing comparison ran 2026-05-27 against the live €75/mo Adopt-a-Paca tier:

| Vendor | Card €75/mo | SEPA €75/mo | Volume-discount break-even |
|---|---|---|---|
| Stripe | ~€1.75 / charge (2.3%) | ~€0.85 / charge (1.1%) | requires >€80K/yr fees for custom pricing |
| Mollie | ~€1.60 / charge (2.1%) | **€0.25 flat** (0.3%) | flat — no negotiation needed |

At any realistic volume (50–500 donors), Mollie SEPA is the cheapest legal option in EU. But the owner explicitly chose Stripe for: (a) faster account activation (~10 min vs 1–2 day KYC), (b) Stripe Promotion Codes natively integrating with the wired discount-codes follow-up, (c) Stripe Tax availability for future EU VAT compliance, (d) better DX and tooling familiarity.

## Decision

**Stripe is the primary processor.** Set `PAYMENT_VENDOR=stripe` in production. All shipped infrastructure (checkout, webhook, billing portal, welcome email, discount-codes follow-up) targets Stripe by default.

**Mollie code stays in the repo, deferred.** `PAYMENT_VENDOR=mollie` activates a fully functional Mollie path. No SDK is installed by default (dynamic-import guard keeps the build green). To activate later: `pnpm add @mollie/api-client`, create Mollie account, set `MOLLIE_API_KEY` + `MOLLIE_WEBHOOK_SECRET`, flip `PAYMENT_VENDOR=mollie`. Estimated migration: 30 min owner work + 1 deploy.

**Re-evaluation trigger:** revisit Mollie if SEPA share of donor base exceeds 30% AND Stripe fees exceed €5K/year. At that point Mollie SEPA becomes ~€80K/year cheaper at 10K-donor scale.

## Consequences

- Stripe SDK is the canonical payment SDK for documentation, runbooks, ADRs.
- Mollie code is treated as deferred fallback — kept tested, not exercised in CI happy paths.
- `OWNER_INPUT_NEEDED.md` Stripe activation runbook is the primary path; Mollie runbook present but marked "deferred".
- New webhook events should add Stripe handling first; Mollie equivalents are optional.
- If Mollie code is ever refactored, parity with Stripe handling is required (welcome email, discount codes, fail-quiet semantics) — see ADR 016.
