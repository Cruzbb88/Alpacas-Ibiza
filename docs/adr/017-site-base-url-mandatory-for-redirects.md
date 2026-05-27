# ADR 017 — `SITE_BASE_URL` from `lib/config.ts` is mandatory for all redirect URLs

**Status:** Accepted · 2026-05-27 (security fix)
**Supersedes:** none
**Related:** CLAUDE.md failsafe map "Stripe checkout success_url uses SITE_BASE_URL"

## Context

`/security-review` ran on 2026-05-27 against the payment + newsletter routes and identified two MEDIUM-severity open-redirect vulnerabilities in `/api/checkout` and `/api/mollie-checkout`. Both routes built `success_url` / `returnUrl` like this:

```ts
const origin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (request.headers.get('origin') ?? 'https://alpacasibiza.com')
```

**Attack:** an attacker sends `GET /api/checkout?tier=monthly` with `Origin: https://attacker.com`. When `NEXT_PUBLIC_SITE_URL` is unset (common in preview deploys and during initial rollout), the server constructs a real Stripe Checkout session whose `success_url` points to `https://attacker.com/en/adopt?checkout=success`. Attacker shares this Stripe URL with a victim. Victim pays €75 to the legitimate Stripe account. Stripe redirects the victim to `attacker.com` — phishing under cover of a real, successful payment.

`lib/config.ts` already exported `SITE_BASE_URL` with a safe hardcoded default (`'https://alpacasibiza.com'`) and a `NEXT_PUBLIC_SITE_URL` env override. The checkout routes were duplicating the env read + adding the unsafe header fallback.

## Decision

**All redirect URLs in API routes MUST use `SITE_BASE_URL` from `lib/config.ts`.** The `request.headers.get('origin')` fallback is explicitly prohibited.

Applies to:
- `/api/checkout` `success_url` and `cancel_url`
- `/api/mollie-checkout` `returnUrl`
- `/api/billing-portal` `return_url`
- `/api/newsletter` verification email link
- `/api/newsletter/confirm` confirmation page redirect
- Any future route that constructs an outbound URL

**Mollie webhook URL also uses `SITE_BASE_URL`** (via `getMollieWebhookUrl()` in `lib/integrations/payment-mollie.ts`) — same attack class.

## Consequences

- `SITE_BASE_URL` becomes a Tier-1-adjacent constant — wrong value here breaks all checkout returns. Production override via `NEXT_PUBLIC_SITE_URL` is the only intended modification.
- Reviewers MUST reject any new route that reads `request.headers.get('origin')` for URL construction. CORS allow-list checks are a different concern and allowed.
- A regression guard test in `lib/payment-providers.test.ts` asserts `SITE_BASE_URL` is a full URL with no trailing slash — if a refactor breaks this contract, tests fail loudly.
- This rule does NOT apply to Stripe's `customer.list({ email })`-style API calls or to CORS allow-list comparisons against `request.headers.get('origin')` — those use cases are still valid.
- CLAUDE.md failsafe map lists each applied instance individually for traceability.
