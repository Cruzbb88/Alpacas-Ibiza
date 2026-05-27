# ADR 013 — `PaymentProvider` defaults to `manual-mailto`; Stripe Connect gated until tenant #1

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Related:** ADR 004 (email-only shop), ADR 011 (in-memory defer-KV)

## Context

The framework needs to support tenant checkout flows (Adopt-a-Paca, gift cards, future products) across multiple payment processors. Each tenant has its own market — Belgian tenants want Bancontact (Mollie), US tenants want Stripe, EU agritourism tenants often have no online checkout at all (mailto inquiry).

A single hardcoded Stripe integration would force every tenant into a US-centric checkout flow with no fallback for tenants who haven't (or can't) set up Stripe yet. Worse: shipping a `stripe-connect` flow before the platform itself is licensed for money transmission is a regulatory risk.

## Decision

`PaymentProvider` is one provider class with 5 adapter implementations:

| Kind | Status | Failsafe |
|---|---|---|
| `manual-mailto` | DEFAULT, always works | Returns `{unconfigured: true, fallbackUrl: 'mailto:…'}` |
| `fareharbor-passthrough` | Works | Delegates to BookingProvider — no Stripe needed |
| `stripe-direct` | Works for single-account Stripe | `await import(/* webpackIgnore */ 'stripe')` — package optional |
| `stripe-connect` | **Throws on activation** | Loud `console.error` + falls back to `manual-mailto`. DEFER UNTIL TENANT #1 SIGNS. |
| `mollie` | Stub — EU/Bancontact | Same optional-import pattern |

The selection lives in `tenant.payment.kind` (optional — omitted = manual-mailto).

## Consequences

**Positive:**
- The first tenant ships with zero payment infrastructure (`manual-mailto`) — onboarding has no payment-system friction
- Adding a real processor is one config change per tenant
- The `stripe-connect` throw-guard prevents accidental unlicensed money transmission until Cruz explicitly unlocks it (CLAUDE.md failsafe map row 36)
- All Stripe deps stay OPTIONAL via dynamic import — repo size + deploy size stay small for tenants that don't need Stripe

**Negative / Trade-offs:**
- Five adapter files for one provider class is more surface than a single Stripe wrapper would be
- `stripe-connect` falls back silently to mailto if accidentally selected — operators must monitor for the `console.error` line

## Upgrade triggers

- Tenant #1 explicitly signs up for online checkout → unlock `stripe-direct` for that tenant
- Cruz incorporates as platform / licenses money transmission → activate `stripe-connect`
- Belgian tenant signs → enable `mollie` adapter (currently stub)

## References

- `lib/integrations/payment.ts` — interface
- `lib/integrations/payment-manual-mailto.ts` — default fallback
- `lib/integrations/payment-stripe-direct.ts` — single-account Stripe
- `lib/integrations/payment-stripe-connect.ts` — DEFERRED, throws on activation
- `app/api/checkout/route.ts` — current Stripe Checkout endpoint (works for stripe-direct)
- `app/api/stripe-webhook/route.ts` — fail-CLOSED if `STRIPE_WEBHOOK_SECRET` unset
- `specs/saas-framework/005-billing-onboarding.md` — full economic + risk analysis
- ADR 011 — same in-memory defer pattern for rate limiting
