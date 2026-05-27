# ADR-005: 6-locale i18n with `en` default and GB flag for English

**Date**: 2026-05-26
**Status**: Accepted

## Context

Alpacas Ibiza is in Ibiza, Spain. Its visitor base is documented as British, German, Dutch, Italian, Spanish, and French. The site needs multi-language support. Decisions required: which locales, which default, and how to represent English (no native English-speaking country is the business location).

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Spanish default (es) | Matches host country | Most target visitors are non-Spanish; booking UX degrades for largest segment |
| English default + 5 EU locales | Covers documented visitor base; `en` as neutral lingua franca is standard | GB flag for `en` is technically wrong (should be `en` globe or US flag) |
| **English default + GB flag + 5 EU locales** | Matches visitor expectation; GB visitors are the dominant foreign segment | GB flag is imprecise for all English speakers; politically sensitive post-Brexit in some markets |
| English default + globe icon for `en` | Technically correct | No standard globe emoji; renders inconsistently across OSes |

## Decision

**`en` as `defaultLocale`, GB flag (`🇬🇧`) for the switcher, 6 locales total: en, de, it, es, nl, fr** (`i18n.config.ts`).

GB flag is an acknowledged imprecision. British visitors are the largest documented foreign segment, so the flag serves as practical shorthand. The alternative (globe, no flag, US flag) is less recognizable or less accurate for the actual audience.

## Consequences

**Positive**
- Default locale matches primary booking audience without requiring a language redirect.
- 6 locales cover all documented visitor nationalities.
- Flag-per-locale pattern is standard for this audience.

**Negative / trade-offs**
- GB flag excludes non-British English speakers (Irish, South African, Australian visitors will see an unfamiliar flag for their language).
- Adding a 7th locale (e.g., `ca` for Catalan — Ibiza context) requires translation files + a new flag entry.

## Revisit if

- Audience data shows significant non-GB English speakers warrant a different flag treatment
- Catalan-speaking locals are added as a target audience
