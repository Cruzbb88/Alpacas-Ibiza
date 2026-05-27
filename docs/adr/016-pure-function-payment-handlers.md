# ADR 016 — Payment webhook event handlers are pure functions; route files are thin shells

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Related:** ADR 001 (Resend scheduledAt — same pattern for FareHarbor handlers in `lib/webhook-router.ts`)

## Context

`/api/stripe-webhook` originally embedded ~60 lines of email-send + scheduling logic directly in the route handler. Zero unit tests. Behaviour (welcome email send, discount-codes scheduling, fail-quiet on send error) was impossible to test without mocking Next.js `Request` objects, route plumbing, and Stripe SDK construction.

The FareHarbor webhook (`lib/webhook-router.ts`) already established the pattern: pure functions take `(event, deps)` and return a result object. The route is a thin shell that verifies signatures and calls the helper. Easy to unit-test.

## Decision

**Webhook event dispatch logic lives in `lib/payment-handlers.ts` as pure functions.** Route handlers in `app/api/<provider>-webhook/route.ts` are thin shells that:

1. Verify the signature / URL-path secret.
2. Parse the event.
3. Call the pure handler with `{ sendEmail, now?, ... }` deps.
4. Log the handler's structured result.
5. Return 200 (fail-quiet) or 500 (handler explicitly chose retry).

**Handlers MUST NOT throw on email/notification errors.** The processor (Stripe, Mollie) retries on non-2xx. A transient Resend failure bubbling up as a 500 would duplicate-send the welcome email on every retry. Handlers return `{ welcomeSent, codesScheduled, reason }` and the route returns 200 regardless.

**Deps are injectable** so tests can pass fake `sendEmail` / `now()` and assert behaviour without mocking Next.js. The first handler — `handleStripeCheckoutCompleted` — has 14 unit tests in `lib/payment-handlers.test.ts` covering: happy path (monthly + yearly), missing email skip, invalid tier skip, fail-quiet on welcome error, fail-quiet on codes error, XSS guard, "Hi there" fallback, paymentRef appears, scheduledAt timing, custom delay override.

## Consequences

- Every new payment webhook event (`invoice.paid`, `customer.subscription.deleted`, Mollie `first.paid`, etc.) gets its own pure handler in `lib/payment-handlers.ts`, NOT inline in the route.
- Mollie webhook (`/api/mollie-webhook`) currently has inline dispatch — TODO: extract to `handleMolliePaymentPaid` for parity. Until extracted, the route is partially untested at the dispatch layer.
- Reviewers MUST reject PRs that add business logic to webhook route files. The route is signature-verify + log + delegate.
- The `deps.now` injection lets tests assert on `scheduledAt` deterministically; future handlers that emit timestamps should follow the same pattern.
- This ADR also implies: integration tests are NOT required if handler unit tests + route fail-CLOSED tests both exist. Wiring is verified by manual curl + Stripe `stripe listen` in staging.
