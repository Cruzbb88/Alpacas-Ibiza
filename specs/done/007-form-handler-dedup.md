---
id: "007"
title: "Form handler dedup — email envelope + useFormSubmit hook"
priority: P1
depends_on: []
est_size: S (1.5–2h)
---

## Context

Two refactor wins bundled from the unified-field scan (uft-001 Clusters 1 + 2):

1. **Email envelope duplication:** `app/api/contact/route.ts`, `app/api/commission/route.ts`, and `app/api/owner-digest/route.ts` each build their own `<div style="...">` HTML envelope. `lib/email-templates.ts` already exports `emailLayout()` and `BRAND` constants — the form routes don't use it.
2. **Form state machine duplication:** `components/contact-form.tsx` and `components/commission-form.tsx` are ~90 lines each of near-identical `useState('idle'|'loading'|'success'|'error')` + Turnstile + fetch POST logic.

**Already done (do not redo):** XSS escape on both `contact` and `commission` routes shipped via `escapeHtml()`. Failsafe map row added to CLAUDE.md. See ADR-007.

Source: uft-001 Clusters 1 + 2.

## Acceptance criteria

- [ ] `app/api/contact/route.ts`, `app/api/commission/route.ts`, and `app/api/owner-digest/route.ts` all use `emailLayout()` from `lib/email-templates.ts` instead of inline HTML envelopes. No duplicate `<div style="font-family:sans-serif...">` string exists in API routes.
- [ ] A `lib/useFormSubmit(endpoint, onSuccess)` hook (or equivalent) exists and is used by both `contact-form.tsx` and `commission-form.tsx`. The hook handles: idle/loading/success/error state, Turnstile token, fetch POST, and error reset.
- [ ] No behaviour change from user's perspective — form submission flows are functionally identical before and after.
- [ ] TypeScript compiles with no errors after refactor.

## Implementation notes

- Files to touch: `app/api/contact/route.ts`, `app/api/commission/route.ts`, `app/api/owner-digest/route.ts`, `components/contact-form.tsx`, `components/commission-form.tsx`.
- New file: `lib/useFormSubmit.ts` (or `hooks/use-form-submit.ts`).
- `lib/email-templates.ts` already has `emailLayout()` — confirm signature before wiring.
- The `escapeHtml()` calls already in contact/commission routes must continue to run BEFORE values are passed into `emailLayout()` — `emailLayout()` does not escape.

## Out of scope

- Newsletter form (inline, different pattern — lower priority).
- Webhook auth dedup (uft-001 Cluster 3 — separate effort, no XSS risk).
