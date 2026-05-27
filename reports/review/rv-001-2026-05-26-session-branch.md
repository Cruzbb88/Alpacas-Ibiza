# Review rv-001 — 2026-05-26 session branch

**Verdict:** REQUEST CHANGES (2 blockers, rest nits/praise)

**Scope:** `git diff HEAD` — all uncommitted files (67 changed, ~2 000 net deletions).

**Pre-flight:** PRACTICES.md, CLAUDE.md, START_HERE.md, package.json, all 9 ADRs read. Rules 1–12 applied.

---

## Aggregate findings

| # | Category | Severity | File(s) |
|---|---|---|---|
| F1 | ADR conflict — scripts strategy | BLOCKER | `app/layout.tsx` |
| F2 | Dead code — `sum()` exported, never imported | BLOCKER | `lib/utils.ts` |
| F3 | i18n gap — new shop keys missing from 4 of 6 locales | NIT | `translations/de,es,fr,it.json` |
| F4 | i18n gap — `contact.mapHeading/mapTitle/mapLargerLink` missing from ALL translation files | NIT | all `translations/*.json` |
| F5 | `Retry-After` unit ambiguity | NIT | `app/api/contact/route.ts`, `app/api/commission/route.ts` |
| F6 | Test gap — `useFormSubmit` hook has no test | NIT | `lib/useFormSubmit.ts` |
| F7 | Test gap — `rateLimit` has a test file but contact/commission rate-limit integration is untested | NIT | `lib/rate-limit.test.ts` |
| P1 | Praise — Rule 4 dead code removed | PRAISE | `app/shop/*`, `app/contact/page.tsx`, `app/about/page.tsx` |
| P2 | Praise — `sum` → `useFormSubmit` DRY extraction | PRAISE | `lib/useFormSubmit.ts`, both forms |
| P3 | Praise — UNMAPPED sentinel for prices (Rule 5) | PRAISE | `app/[locale]/shop/alcaca`, `woven/page.tsx` |
| P4 | Praise — webhook helpers extracted + tested (Rule 8) | PRAISE | `lib/webhook-router.ts` + `.test.ts` |
| P5 | Praise — CSP Report-Only added with justification comments | PRAISE | `next.config.mjs` |
| P6 | Praise — `DEFAULT_TO` exported from mailer (single source, Rule 6) | PRAISE | `lib/mailer.ts` |
| P7 | Praise — `SITE_BASE_URL` pulled into `page-breadcrumbs` (Rule 6) | PRAISE | `components/page-breadcrumbs.tsx` |
| P8 | Praise — `product.image` typed `string | null` + `next/image` migration | PRAISE | `components/product-card.tsx` |

---

## Per-file annotations

### BLOCKERS

#### F1 — `app/layout.tsx` — ADR-006 conflict
**Lines changed:** GA4 + GTM strategy `beforeInteractive` → `afterInteractive`

ADR-006 explicitly documents why `beforeInteractive` was chosen: Google's server-side tag checker requires scripts in the SSR HTML payload. The change rationale comment says "consent stub still beforeInteractive" — but ADR-006 is not specifically about the consent stub; it is about GA4 (`G-Y946QDVVQV`) and GTM (`GTM-KR3CGLS6`). Changing their strategy without updating ADR-006 or leaving a `REVISIT IF` note violates PRACTICES.md "don't re-litigate without a new ADR."

**Required action:** Either (a) update ADR-006 with the new reasoning (Google tag checker no longer requires SSR injection, or FLoC/performance tradeoff was re-evaluated), or (b) revert. If the change is intentional, a new ADR-010 is needed that supersedes ADR-006 section on GA4/GTM strategy.

#### F2 — `lib/utils.ts:7-9` — `sum()` is dead code
A `sum(a, b)` function was added to `lib/utils.ts`. Zero imports of `sum` exist anywhere in the codebase (grep confirmed). This is either scaffolding that was meant to be deleted, or a placeholder committed by mistake.

**Required action:** Delete the three lines. `lib/utils.ts` is the shared utility module imported by most components; leaving phantom exports signals false intent.

---

### NITS

#### F3 — `translations/de.json`, `es.json`, `fr.json`, `it.json` — missing shop keys
New keys `wovenPage.madeToOrderNote`, `wovenPage.contactForPricing`, `alcacaPage.inquireNote`, `alcacaPage.contactForPricing` were added to `en.json` and `nl.json` (confirmed lines 295–296, 319–320 in each). They are absent from the four other locale files. `lib/translations.ts` falls back to English silently, so German/Spanish/French/Italian visitors see English copy in those fields. Not a crash but an i18n regression for the 4 affected locales.

#### F4 — All `translations/*.json` — `contact.map*` keys missing
`app/[locale]/contact/page.tsx:118,122,135` calls `translate('contact.mapHeading')`, `translate('contact.mapTitle')`, and `translate('contact.mapLargerLink')`. None of these keys exist in any translation file (en.json `contact` section ends at `byAppointment`, line 565). The code uses `|| 'fallback string'` guards so the page renders in English for all locales — not a crash, but translation coverage is incomplete for a visible new section.

#### F5 — `app/api/contact/route.ts:29`, `app/api/commission/route.ts:29` — `Retry-After` unit
`Retry-After` RFC 7231 expects **seconds** as an integer. The code computes `Math.ceil(limit.resetMs / 1000)` which converts ms to seconds — this is correct. However `rateLimit()` returns `resetMs: windowMs` for the **allowed** path and `oldestInWindow + windowMs - now` for the **blocked** path. The blocked path value is already in ms and the divide-by-1000 is correct. Marking as nit because the math is right, but the variable name `resetMs` is ambiguous at the call site (could be confused for seconds). A rename to `resetAfterMs` in the interface would make the unit unambiguous.

#### F6 — `lib/useFormSubmit.ts` — no test
The hook is now shared by `CommissionForm` and `ContactForm`, and handles the `onSuccess/onError` branching. No test file exists for it. Given that both consumer forms removed their own `try/catch` in favour of this hook, a test covering `onSuccess` (res.ok), `onError` (non-ok), and network failure paths would protect the consolidation.

#### F7 — Rate-limit integration — not covered in route tests
`lib/rate-limit.test.ts` tests the `rateLimit()` helper in isolation (good). But the contact and commission routes now have rate-limit calls inline; there is no integration test verifying that a 6th request within 5 min returns 429 with a `Retry-After` header. Not a blocker because the helper is tested, but the route-level wiring has no coverage.

---

## Missing tests list

| Change | Test status | Gap |
|---|---|---|
| `lib/useFormSubmit.ts` (new hook) | No test | Happy path, error path, network failure |
| `app/api/contact/route.ts` rate-limit wiring | Not covered | 6th request → 429 + `Retry-After` header |
| `app/api/commission/route.ts` rate-limit wiring | Not covered | Same as above |
| `app/[locale]/contact/page.tsx` map section | Not covered | iframe renders; fallback strings visible |
| `app/layout.tsx` GA4/GTM strategy change | Not covered | SSR tag detection (manual/Playwright) |

---

## ADR alignment summary

| ADR | Status |
|---|---|
| ADR-001 Resend scheduledAt | No conflict. `computeScheduleWindows` preserves 48h/24h offsets. |
| ADR-002 Turnstile asymmetric fail | No conflict. Rate-limit added before Turnstile, does not touch turnstile logic. |
| ADR-003 Webhook fail-closed | No conflict. 503-on-unset-secret guard unchanged (line 72 range preserved). |
| ADR-004 Email-only no e-commerce | Alcaca and woven pages now correctly route to `/contact` when no item ID (compliant). |
| ADR-005 6-locale GB flag | No conflict. `i18nConfig.locales` driven from existing config. |
| **ADR-006 GA4 beforeInteractive** | **CONFLICT — see F1 above.** |
| ADR-007 Admin fail-closed | No conflict. Auth route unchanged. |
| ADR-008 Availability ISR 1800s | No conflict. |
| ADR-009 Client availability dedup | `AvailabilityUrgency` now correctly uses `useAvailability` hook — compliant. |

---

*Report generated: 2026-05-26. Pre-flight file count in `reports/review/`: 0. Post-write count: 1.*
