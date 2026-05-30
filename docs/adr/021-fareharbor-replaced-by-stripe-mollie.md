# ADR 021 — FareHarbor will be replaced by Stripe/Mollie on-site checkout

**Status:** Accepted · 2026-05-30
**Supersedes:** none
**Related:** [ADR 013 — Payment provider defaults / manual mailto](013-payment-provider-defaults-manual-mailto.md), [ADR 019 — Mollie primary, Stripe fallback](019-mollie-primary-stripe-fallback.md)

## Context

Live audit cycle 13 confirmed that alpacasibiza.com routes ALL booking and
adoption through FareHarbor: every tour CTA and adopt CTA points at
`https://fareharbor.com/embeds/book/alpacasibiza/?flow=1257173`. FareHarbor is
currently the only checkout path for customers.

Owner confirmed 2026-05-30: "we will be replacing fareharbour." This is a
first-party statement of intent, not a developer assumption.

The redesign already has Stripe (cards) and Mollie (SEPA Direct Debit)
infrastructure in place per ADR 019, including webhooks, idempotency,
dunning/failure-tracking, retention emails, referral discounts, PDF cert
generation, and the `/api/mollie-manage` self-service management portal.

## Decision

The redesign launches with **Stripe + Mollie as the primary checkout** for
adoption subscriptions. FareHarbor is retained as a backward-compatible option
during a migration window (`paymentAdapter.vendor === 'fareharbor'` code path
exists) but is NOT the destination.

The booking path (tours, experiences, gift cards) remains FareHarbor-embedded
for launch because the on-site checkout replacement targets adoption only at
this stage. Tour booking to on-site is tracked separately.

## Consequences

- **Customer migration** occurs via the `/admin/migration` tool over a 12-month
  window. Yearly-subscription customers migrate at anniversary; monthly
  customers migrate at the next billing date.
- **FareHarbor decommissioning target: month 13.** After 12 months, the
  `paymentAdapter.vendor === 'fareharbor'` code path and the FareHarbor webhook
  route (`/api/fareharbor-webhook`) can be removed.
- **No new adopters are directed to FareHarbor.** The adopt CTA from launch
  points at the Mollie/Stripe on-site checkout.
- **FareHarbor env vars** (`FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY`,
  `FAREHARBOR_WEBHOOK_SECRET`) remain Tier 2 / Tier 1 respectively during the
  migration window. They become dead config on decommission.
- **In-code failsafe map** row for `fareHarborPassthroughPaymentProvider` and
  `/api/fareharbor-webhook` remains until decommission (see CLAUDE.md).
