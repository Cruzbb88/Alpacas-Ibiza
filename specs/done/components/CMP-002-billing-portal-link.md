---
id: "CMP-002"
title: "BillingPortalLink — adopt subscription self-service"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Collapsed `<details>` at the bottom of the adopt page; lets existing donors enter their email to be redirected to the Stripe Customer Portal.

## Props
```ts
interface BillingPortalLinkProps {
  locale: string
}
```

## Consumers
- `app/[locale]/adopt/page.tsx`

## Failsafe behavior
API route `/api/billing-portal` returns 503 if `STRIPE_SECRET_KEY` unset (fail-CLOSED). Component surfaces `CUSTOMER_NOT_FOUND` error with a `mailto:info@alpacasibiza.com` fallback; network errors show a retry message. CLAUDE.md failsafe row: "Billing portal 503 if STRIPE_SECRET_KEY unset".

## Acceptance criteria
- [ ] `<details>` collapsed by default (not visible on page load)
- [ ] Valid email + known Stripe customer → redirect to portal
- [ ] Unknown customer → amber error with contact email
- [ ] Network failure → error message, no crash
- [ ] Stripe SDK absent → 503 handled gracefully by the API route

## Owner-input dependencies
- Stripe Customer Portal activated in Stripe dashboard (Settings → Billing → Customer portal)
- `STRIPE_SECRET_KEY` set in Railway/Vercel

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
