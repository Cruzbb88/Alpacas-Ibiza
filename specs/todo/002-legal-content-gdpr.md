---
id: "002"
title: "Legal content — Privacy Policy, Terms, Cookies, Spanish footer"
priority: P0
depends_on: []
est_size: M (4–6h content + 1h code)
---

## Context

Three pages carry generic placeholder text (Privacy Policy, Terms of Service, Cookies). GDPR legal risk for an EU-registered business before public launch. Separately, the footer is missing the Spanish legal footer (CIF, registered business name, full address) required for Spain-registered businesses.

Source: OWNER_INPUT_NEEDED.md:70–83, task-radar Q1 item "Privacy Policy / Terms / Cookies".

## Acceptance criteria

- [ ] `/privacy` page contains: real data-collection practices (Resend, GA4, FareHarbor, GTM), real cookie list (GA4 `_ga`, FareHarbor session, Turnstile), data controller name + contact, retention periods. No generic Lorem/placeholder text.
- [ ] `/terms` page contains: real cancellation/refund policy language matching FareHarbor flow setting, booking terms, governing law (Spain/EU). No generic placeholder text.
- [ ] `/cookies` page (or section in Privacy) lists every cookie set by the site with name, purpose, and duration.
- [ ] Site footer includes: CIF number, registered business name, full physical address. Values display in all locales.
- [ ] If owner has not provided content yet, pages show a single "Content pending — legal review in progress" notice rather than misleading generic text.

## Implementation notes

- Content is owner-provided (copy-paste into translation JSON or MDX). Code change is wiring it in.
- Files to touch: `app/[locale]/privacy/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/cookies/page.tsx` (or equivalent), footer component, `translations/en.json` (and all active locales).
- If pages are MDX-based, owner writes the MDX file; if i18n JSON, add keys.
- Spanish footer fields can default to `TODO: OWNER_INPUT_NEEDED` safely; placeholder text on legal pages cannot.

## Out of scope

- Lawyer review (owner's responsibility).
- Cookie consent banner implementation (already exists via GTM consent-mode).
