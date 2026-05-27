# ADR 018 — Payment SDKs (`stripe`, `@mollie/api-client`) are optional dependencies loaded via dynamic `import()`

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Related:** ADR 013 (PaymentProvider defaults), ADR 015 (Stripe primary, Mollie deferred)

## Context

The site ships without `stripe` or `@mollie/api-client` in `package.json` dependencies. They are added on the deploy that activates each processor. This avoids:

- Bundling ~3 MB of unused SDK code for tenants who use neither processor (most don't yet).
- Forcing a Node-runtime install of a payment SDK before the owner has signed up for the account.
- Breaking the build on Vercel preview deploys that don't have the SDK yet.

The cost: a `import 'stripe'` at the top of any file would crash the build with "module not found". Conventional SDK usage would break.

## Decision

**Both SDKs are loaded via dynamic `await import()` inside try/catch with the bundler hints `/* webpackIgnore: true */` and `/* turbopackIgnore: true */`.** The wrapper functions live in:

- `lib/integrations/stripe-sdk.ts` → `importStripe()` returns the SDK factory or `null`
- `lib/integrations/payment-mollie.ts` → `importMollie()` returns the SDK factory or `null`

Both implementations cache the resolved factory at module level so subsequent calls in the same process are free. Both fail gracefully on missing module — callers receive `null` and respond with HTTP 503 + `code: STRIPE_SDK_MISSING` or `MOLLIE_SDK_MISSING`.

**`@ts-ignore` is required on the dynamic import line** because the package types are absent until installed. This is the only allowed `@ts-ignore` in the payment surface.

**Build invariant:** `pnpm build` MUST succeed without either SDK installed. CI verifies this.

## Consequences

- New developers MUST NOT write `import Stripe from 'stripe'` at the top of a payment file. The pattern is `await importStripe()` followed by `if (!factory) return earlyFailureResponse`.
- TypeScript types for Stripe events and Mollie payments are typed as `any` at the route boundary (`event: any`, `MollieClient = any`). This is a known type-safety gap and is acceptable because:
  - The dynamic-import constraint precludes pulling in `@stripe/types`.
  - Webhook handlers immediately narrow `any` to a `StripeCheckoutSessionLike` / `MolliePaymentLike` interface defined in our code.
  - Unit tests assert behaviour against the narrowed interface, not the SDK shape.
- If a future SDK call requires types the narrowed interface doesn't carry, the right move is to extend the narrowed interface in `lib/payment-handlers.ts`, NOT to add `import type from 'stripe'`.
- CI test setup MUST run without the SDKs installed. Tests that need to assert SDK-mediated behaviour (e.g. happy-path checkout session creation) MUST mock at the `importStripe()` / `importMollie()` boundary.
- On deploy: `pnpm add stripe` for Stripe activation, `pnpm add @mollie/api-client` for Mollie activation. Document in OWNER_INPUT_NEEDED.md.
