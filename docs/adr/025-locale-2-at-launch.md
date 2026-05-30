# ADR 025 — Locale debt: 6 locales built, 2 (NL + EN) supported at launch

**Status:** Proposed — pending owner/Cruz decision
**Date:** 2026-05-30
**Related:** [ADR 005 — 6-locale config, EN default, GB flag](005-6-locale-en-default-gb-flag.md)

## Context

The redesign was built with 6 locales: `en`, `nl`, `de`, `es`, `fr`, `it`
(per ADR 005). The live site (alpacasibiza.com) has operated NL + EN only for
7 years. Owner has shown zero behaviour of serving DE / ES / FR / IT audiences.

The 4 unused translation files are populated with `__UNTRANSLATED__` sentinels
that fall back to English at render time. As of cycle 13:

- **NL and EN:** fully translated, review-ready.
- **DE, ES, FR, IT:** English fallbacks only. Publishing them creates 4× the
  sitemap pages for content that is in English regardless of locale — a
  duplicate-content SEO risk (Google may demote or deindex).
- **Hreflang + alternates** for 6 locales are generated at build time,
  pointing search engines at pages that serve English content under a
  DE/ES/FR/IT URL.

## Decision

At launch, `i18n.config.ts` defines `locales = ['nl', 'en']` only.

The `de`, `es`, `fr`, `it` translation files are **preserved in the codebase**
— reactivating them is a 1-line change in `i18n.config.ts`. They are not
exposed via sitemap, hreflang, locale-switcher, or alternate links.

## Consequences

- **-67% sitemap size** (2 locale URLs per page instead of 6). No
  duplicate-content risk.
- **Hreflang** collapses to `en` + `nl` only. Clean signal to search engines.
- **Locale-switcher UI** shows 2 options only. Less clutter.
- **The 4 extra locales become a "future expansion" reserve.** When the owner
  has actual DE/ES/FR/IT content, flip `locales` in `i18n.config.ts` and
  translate the sentinel strings.
- **If this decision is rejected:** the duplicate-content SEO cost must be
  explicitly accepted. Document the risk in OWNER_INPUT_NEEDED.md and add a
  `noindex` directive to locale pages with `__UNTRANSLATED__` content until
  translation is complete.

## Status note

This ADR is PROPOSED. If Cruz rejects it (he originally commissioned all 6
locales), change status to ACCEPTED with the full-6-locale rationale, and add
the duplicate-content mitigation to OWNER_INPUT_NEEDED.md.
