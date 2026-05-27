---
id: "CMP-009"
title: "CookieConsent — GDPR/PECR consent banner"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Fixed-bottom consent banner; persists choice to `localStorage` and signals GTM via Consent Mode v2 `dataLayer` events; renders only when no prior consent is stored.

## Props
None — reads locale from `useParams()`.

## Consumers
- `app/[locale]/layout.tsx`
- `app/layout.tsx`

## Failsafe behavior
`localStorage` read/write errors are swallowed silently (try/catch). If `readConsent()` returns `null` the banner appears; on accept or reject it hides permanently until storage is cleared. Translations fall back to hardcoded English strings if translation keys are absent.

## Acceptance criteria
- [ ] Hidden on load when `localStorage` has a prior consent value
- [ ] "Accept all" → `dataLayer` push `analytics_storage: 'granted'`
- [ ] "Reject non-essential" → `dataLayer` push `analytics_storage: 'denied'`
- [ ] localStorage write failure → banner still dismisses
- [ ] Links to `/${locale}/cookies` (locale-aware)
- [ ] `role="dialog"` + `aria-live="polite"` for screen readers

## Owner-input dependencies
- Translation keys: `cookieConsent.message`, `cookieConsent.accept`, `cookieConsent.reject`, `cookieConsent.policyLink`, `cookieConsent.ariaLabel`

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
