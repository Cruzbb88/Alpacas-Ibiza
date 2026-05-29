# ADR 020 — Mollie Connect for tenant revenue (supersedes the Stripe Connect deferral in ADR 015)

**Status:** Accepted
**Date:** 2026-05-29
**Supersedes (partially):** [ADR 015 — Stripe primary, Mollie deferred](015-stripe-primary-mollie-deferred.md) — specifically the "Stripe Connect Express reserved for tenant flow" decision.
**Related:** [ADR 019 — Mollie primary, Stripe fallback](019-mollie-primary-stripe-fallback.md)

## Context

ADR 015 reserved Stripe Connect Express as the future tenant-revenue path on the theory that routing tenant customer money through our single-account Mollie would be unlicensed money transmission. ADR 019 then flipped the own-revenue path to Mollie. That left us at a fork: when tenant #1 signs, do we add a second processor (Stripe Connect alongside Mollie) or extend our Mollie integration with a tenant-collection path?

Research conducted 2026-05-29 (parallel sub-agent, multi-source) surfaced **Mollie Connect** — production-live since 2024 with two tracks: "Connect for Platforms" and "Connect for Marketplaces". Sources:
- [Mollie Connect Overview](https://docs.mollie.com/docs/connect-overview)
- [Connect for Marketplaces](https://docs.mollie.com/docs/connect-marketplaces-processing-payments)
- [Connect for Platforms — onboarding](https://docs.mollie.com/docs/connect-platforms-onboarding-customers)
- [Mollie User Agreement](https://www.mollie.com/legal/user-agreement)
- [`@mollie/api-client` (OAuth + Client Links)](https://github.com/mollie/mollie-api-node)

### Legal status (the load-bearing question)

Mollie B.V. holds a Dutch EMI licence (De Nederlandsche Bank, relation F0038). Under Mollie Connect Marketplaces:

- **Each sub-merchant has their own Mollie account** linked to ours via OAuth — we do NOT pool tenant money in our account.
- **Routing executes under Mollie's EMI licence**, not ours.
- **We are the "Platform Merchant"** — a defined role in Mollie's licensed framework, NOT a "pass-through" trying to hide as a single-account.
- **Liability** for chargebacks lies with the platform (us) to the extent Mollie cannot claw back from the sub-merchant balance.

This is structurally equivalent to Stripe Connect Express. The "single-account = unlicensed money transmission" risk that ADR 015 cited is resolved the same way Stripe Connect resolves it: by giving each sub-merchant their own licensed processor account and routing through the processor's licence.

### Feature comparison

| Capability | **Mollie Connect** | **Stripe Connect Express** |
|---|---|---|
| Sub-merchant onboarding | OAuth + Client Links → co-branded "Getting Started wizard" | OAuth + hosted Express onboarding |
| Hosted KYC | Yes (Mollie-hosted) | Yes (Stripe-hosted) |
| Application fee model | `applicationFee` param on Payment; cap €2.00 (raisable) | `application_fee_amount`; no hardcoded cap |
| Split payments | `routing` array at payment create; optional `releaseDate` | Transfer objects post-payment |
| Geography (sub-merchants) | EEA / Switzerland / UK | Global |
| Resell Pricing model | Yes (no-code markup option) | No equivalent |
| DX maturity | Younger, less third-party tooling | Industry standard |
| Our existing integration | Mollie adapter, webhook, tokens, MCP — extend, don't add | Net-new from zero |

### Codebase impact

The existing `lib/integrations/payment-stripe-connect.ts` `stripeConnectPaymentProvider` is a deliberate throw-guard (throws on activation per ADR 015 to prevent accidental enablement). It has zero implementation. Implementing Mollie Connect:

- Extends `lib/integrations/payment-mollie.ts` (already typed, ESM-safe, MCP-aware) with an OAuth path + `routing` array support.
- Adds `app/api/tenants/onboard/route.ts` (POST → create Client Link → return URL) and a webhook hook for onboarding status changes.
- Reuses the HMAC token infrastructure (`lib/mollie-manage-token.ts` → extend with a `tenant-onboard` scope).
- Keeps the Stripe Connect adapter as the documented fallback if Mollie Connect ever proves inadequate.

Vs. implementing Stripe Connect Express from scratch: this is ~60% less code, no second SDK, no second webhook surface, no second dashboard for the owner to log into.

## Decision

**For tenant revenue, use Mollie Connect — track "Connect for Platforms" first; switch to "Marketplaces" if a tenant requires split-payment-at-create-time.**

Stripe Connect Express remains the documented fallback (the `stripeConnectPaymentProvider` guard stays in place, set to throw, until any of the revisit triggers below fire).

### Implementation gates (do NOT activate Mollie Connect before all three are true)

1. Tenant #1 has signed a tenancy agreement that names them as the legal merchant.
2. Tenant #1 is an EEA / Switzerland / UK entity (Mollie sub-merchant requirement).
3. Per-payment application fee target is ≤ €2.00 OR Mollie account management has raised our cap in writing.

### Code consequences (deferred — execute at activation, not now)

When the three gates clear:

1. Add `MOLLIE_OAUTH_CLIENT_ID` + `MOLLIE_OAUTH_CLIENT_SECRET` to `.env.local.example` (Tier 2, fail-CLOSED if unset on the tenant-onboard route).
2. Extend `payment-mollie.ts` `molliePaymentProvider` with a `tenantId`-aware mode that:
   - Includes the tenant's `organizationId` in the OAuth bearer token.
   - Sets `applicationFee` on Payment create.
3. New route: `POST /api/tenants/onboard` → creates a Client Link, returns the redirect URL.
4. New route: `GET /api/tenants/onboard/status?token=…` → polls the organization status (needs-data / in-review / completed) for the owner-facing onboarding UI.
5. Extend `lib/mollie-manage-token.ts` with `tenant-onboard` scope.
6. `PAYMENT_VENDOR=mollie-connect` activates the connected-account adapter for tenant payment flows. Default `PAYMENT_VENDOR=mollie` (own-revenue, ADR 019) is unchanged.

## Revisit triggers (switch to Stripe Connect or dual-vendor)

- **Tenant #1 is non-EEA.** Mollie Connect's sub-merchant geography restriction would block them.
- **Mollie account management declines to raise the €2.00 cap** AND our pricing requires a higher fee.
- **Tenant #1 demands a hosted customer portal for their end-customers.** Mollie has no Stripe Customer Portal equivalent — we'd need to build per-tenant token-gated portals (same way we built `/api/mollie-manage/*` for own-revenue).
- **Stripe ships a Connect feature with no Mollie equivalent that unlocks a tenant-side capability we need** (e.g. Stripe Issuing, Treasury, Tax for tenants).

## Consequences

- **Single-vendor stays viable for everything.** Own revenue (ADR 019) + tenant revenue (this ADR) both on Mollie.
- **The throw-guard in `stripeConnectVendorGuardAdapter` stays in place** as a defence-in-depth measure — accidental flip of `PAYMENT_VENDOR=stripe-connect` still fails-closed loudly.
- **Tenant-onboarding code is deferred but planned.** When tenant #1 signs, the code to write is concrete (see "Code consequences" above), not exploratory.
- **EU-VAT/OSS implications inherit from ADR 019.** Each sub-merchant handles their own VAT; we don't pool. Our platform fees are still our responsibility (likely OSS-applicable if cross-border B2C).

## References

- [ADR 015 — Stripe primary, Mollie deferred (partially superseded)](015-stripe-primary-mollie-deferred.md)
- [ADR 019 — Mollie primary, Stripe fallback](019-mollie-primary-stripe-fallback.md)
- [Mollie Connect docs](https://docs.mollie.com/docs/connect-overview)
- [Mollie User Agreement (2025)](https://www.mollie.com/legal/user-agreement)
