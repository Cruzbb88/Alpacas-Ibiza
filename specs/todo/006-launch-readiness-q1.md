---
id: "006"
title: "Launch readiness — Q1 blockers (synthesised from task-radar 2026-05-29)"
priority: P0
depends_on: []
est_size: M (owner-action heavy, low code volume)
---

## Context

Task-radar sub-agent pass (2026-05-29) identified 26 unfinished items across the project. Nine of them are Quadrant 1 (Urgent + Important — block production launch). This spec consolidates them with explicit owner-vs-code partitioning.

## Q1 blockers (must close before public launch)

### Legal

- [ ] **Privacy / Terms / Cookies pages** — replace placeholder text with real GDPR-compliant content. (Existing `specs/todo/002-legal-content-gdpr.md` covers this; do not duplicate work.)
- [ ] **Spanish legal footer** — CIF, registered business name, full physical address must render in every locale's footer. Currently absent.
- [ ] **Cancellation policy copy** — '24h free cancellation' on every tour card and Terms page must match the actual FareHarbor window. If FareHarbor allows shorter, our copy is a misrepresentation.

### Security / ops

- [ ] **Admin credentials hardening** — `ADMIN_USERNAME` and `ADMIN_PASSWORD` must be strong, non-default values in Vercel before deploy. The fail-closed guard logs an error but doesn't enforce strength. **Owner action: set in Vercel dashboard.**
- [ ] **Turnstile keys** — `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` unset → all forms unprotected. **Owner action: provision Turnstile keys in Cloudflare dashboard, set in Vercel.**
- [ ] **Resend domain verification** — emails currently send from Resend's shared `noreply@resend.dev` style domain. DKIM/SPF for `alpacasibiza.com` must be configured in Resend and DNS, then all `from` addresses updated.

### Integrations

- [ ] **Payment processor live** — either `MOLLIE_API_KEY` + `MOLLIE_WEBHOOK_SECRET` OR `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` must be set in Vercel. Currently both unset → all checkout CTAs fall back to mailto.
- [ ] **FareHarbor item IDs** — every `FAREHARBOR_ITEM_*` env var per tour, gift card, wedding, romantic sunset, family farm days. Per-tour Book buttons fall back to the generic calendar without these. **Owner action: copy item IDs from FareHarbor admin → set in Vercel.**

### Content

- [ ] **318 untranslated keys per non-EN locale** (de/it/es/fr) — render `__UNTRANSLATED__: …` to visitors. Two options:
  - (a) Prune `it` + `fr` from active locales (decision flagged in `specs/todo/005-locale-strategy.md`).
  - (b) Commission a professional translation pass.

## Done means

- Every checkbox above is `[x]`.
- `npx next build` produces zero "missing key" warnings.
- A live test adoption (€1 test charge or full €75) is completed end-to-end on prod via Mollie OR Stripe.
- A live test contact-form submission lands in `info@alpacasibiza.com` via Resend's verified domain.
- All four non-English locales render real translations or the locale has been removed from `i18n.config.ts`.

## Out of scope (tracked separately)

- Q2 strategic items (Stripe Tax automation, DB persistence for adoption records, real alpaca bios/photos, brand color owner-review, sustainability page facts, owner-digest cron wiring, Google Reviews badge) — see `reports/skill-roadmap/sr-002-2026-05-28.md` for the full Eisenhower matrix.
- Q3/Q4 items (press logos, E2E tests, KV upgrade for rate-limit + booking-schedule stores, CSP enforcement) — defer per existing ADRs.
- Tenant revenue path — see `docs/adr/020-mollie-connect-for-tenants.md`.
