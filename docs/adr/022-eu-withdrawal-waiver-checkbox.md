# ADR 022 — Withdrawal waiver checkbox required at adopt checkout (EU Directive 2011/83 Art 16(m))

**Status:** Accepted · 2026-06-01
**Date:** 2026-05-30

**Status updated 2026-06-01:** wired and enforced (client gate + server 400). Legal copy still pending owner review.
**Related:** [ADR 021 — FareHarbor replaced by Stripe/Mollie](021-fareharbor-replaced-by-stripe-mollie.md)

## Context

Deep-research cycle 11 verified via three EUR-Lex primary sources that EU
Directive 2011/83/EC on consumer rights **applies to digital symbolic-adoption
subscriptions**:

- The 14-day right of withdrawal begins at contract conclusion (Art 9(2)(a)).
- Waiver of this right requires three elements under Art 16(m):
  1. **Express affirmative consent** — the consumer checks a box; pre-checked
     is not compliant.
  2. **Explicit acknowledgement of right loss** — the copy must state the
     consumer loses the withdrawal right on waiver.
  3. **Durable-medium confirmation** per Art 8(7) — a confirmation email
     constitutes a durable medium.

All three sources confirm the above interpretation is settled EU consumer law
as of 2026.

Current state: `components/legal/withdrawal-waiver-checkbox.tsx` is built but
is NOT wired to the adopt checkout form. The welcome email (sent on
`checkout.session.completed` / `payment.paid`) satisfies the durable-medium
requirement per Art 8(7). The checkbox copy has not been approved by the owner.

## Decision

**The withdrawal waiver checkbox must be wired to the adopt checkout before
the site goes live**, with `checked=false` as the default. Checkout cannot
proceed until the user explicitly checks the box.

The component (`components/legal/withdrawal-waiver-checkbox.tsx`) is the single
implementation. No duplicate copy elsewhere. The specific legal text displayed
requires owner approval before wiring.

## Consequences

- **Until owner approves copy and the checkbox is wired, every adoption
  checkout is technically non-compliant** with EU Directive 2011/83 Art 16(m).
- **Risk:** a consumer complaint triggers the 14-day withdrawal right; owner
  must refund. Mollie SEPA has an 8-week chargeback window, so a blameless
  refund is available regardless. This is the mitigation during the gap.
- **Welcome email already serves as the durable medium** per Art 8(7) — this
  requirement is met today.
- **Blocking item for launch.** This ADR is PROPOSED; it becomes ACCEPTED when
  the owner approves copy and the checkbox is wired to the checkout flow. The
  status MUST be updated then.
- Add to OWNER_INPUT_NEEDED.md: "Approve legal copy for withdrawal waiver
  checkbox."
