# ADR 026 — Self-adoption certificate name fetched post-redirect via Stripe session-id

**Status:** Accepted · 2026-05-30
**Related:** [ADR 019 — Mollie primary, Stripe fallback](019-mollie-primary-stripe-fallback.md), [ADR 017 — SITE_BASE_URL mandatory for redirects](017-site-base-url-mandatory-for-redirects.md)

## Context

Bug cb-003 (cycle 12) found that self-adoption PDF certificates always rendered
"Honoured friend" as the recipient name. The root cause: at the time the Stripe
`success_url` is constructed, the donor's name is not yet known — the checkout
session has not been completed and the customer object does not exist in Stripe.

Gift adoption certs were fixed in cycle 12 by threading the **recipient name**
into `success_url` at checkout-URL-build time (the gift giver enters the
recipient name before going to Stripe). Self-adoption has no equivalent: the
donor's own name lives inside Stripe, not in our URL construction path.

## Decision

**Append `&session_id={CHECKOUT_SESSION_ID}` to the Stripe `success_url`.**
Stripe substitutes `{CHECKOUT_SESSION_ID}` with the real session ID at redirect
time. The thank-you page uses this ID to call a new public API route:

```
GET /api/checkout-session/[id]
```

This route calls:
```ts
stripe.checkout.sessions.retrieve(id, { expand: ['customer'] })
```

and returns **name only** (not email, not payment details). The session-id is
the capability — no separate auth token is needed because the session ID is
unguessable (Stripe-generated) and time-limited.

**Rate limit:** 30 requests / 5 minutes / IP on the route.

**Page render strategy:** the thank-you page renders immediately with a generic
greeting; a client-side `useEffect` fetches the name and triggers a second
render. The Stripe API call adds ~200 ms, which is absorbed in the
`useEffect` rather than blocking initial paint.

## Consequences

- **Mollie self-adoption keeps the generic fallback.** Mollie has no equivalent
  of `{CHECKOUT_SESSION_ID}` template substitution in `returnUrl`. Mollie
  self-adoption certs still render "Honoured friend" — this is the same UX as
  the pre-cycle-12 baseline. Acceptable.
- **The `/api/checkout-session/[id]` route is public** — no session required.
  The unguessable session-id is the only gate. Rate-limiting (30/5 min/IP)
  prevents enumeration.
- **Name-only response** — the route never returns email, payment amount, or
  other PII. Minimises exposure if the session-id is intercepted.
- **`success_url` construction** uses `SITE_BASE_URL` per ADR 017 — the same
  open-redirect protection that applies to all Stripe/Mollie redirects.
- **Gift adoption certs are unaffected.** They use the cycle-12 fix (name in
  `success_url`), which remains the simpler path where the name is known in
  advance.
