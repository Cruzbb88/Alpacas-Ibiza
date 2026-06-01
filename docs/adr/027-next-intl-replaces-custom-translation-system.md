# ADR 027 — next-intl 4.x replaces custom `lib/translations.ts` + `lib/locale-context.tsx`

**Status:** Accepted · 2026-06-01
**Supersedes:** none
**Related:** [ADR 005-6 — 6-locale i18n with `en` default](005-6-locale-en-default-gb-flag.md), [ADR 025 — 2 locales at launch](025-locale-2-at-launch.md)

## Context

The codebase previously used a hand-rolled translation system:

- `lib/translations.ts` — a `t()` helper that loaded locale JSON files and
  returned translated strings.
- `lib/locale-context.tsx` — a React context provider that threaded the current
  locale and `t()` function through the component tree.

This system worked at small scale but accumulated debt:

- Missing locale keys silently returned raw dot-key strings (e.g.
  `"adopt.cta.button"`) in production — not English fallback.
- No compile-time key safety — typos were invisible until runtime.
- The context-threading pattern was verbose and caused unnecessary re-renders.
- Inline fallback strings were scattered across 87 files rather than living in
  a single `en.json` source of truth.

Commits f2ff160 / 33e761a / 7d495d6 migrated the full site to next-intl 4.x.

## Decision

**Replace `lib/translations.ts` + `lib/locale-context.tsx` with next-intl 4.x.**

- The next-intl plugin is wired in `next.config.mjs` pointing at
  `next-intl.config.ts`.
- All locale message files live under `messages/<locale>.json` (EN is the
  primary/base locale).
- `getMessageFallback` in `next-intl.config.ts` implements an EN-base
  deep-merge fallback: missing keys in any non-EN locale resolve to the EN
  value, not a raw dot-key.
- Inline fallback strings harvested from across the 87 migrated files are
  consolidated into `messages/en.json`.
- `useTranslations()` / `getTranslations()` replace all `t()` call-sites.

## Consequences

**Positive:**

- Missing keys in non-EN locales show English text, not raw dot-keys.
  `getMessageFallback` fires only when the key is absent from EN too (which
  is a genuine authoring error surfaced as a visible gap rather than silent
  fallback).
- All 5 non-EN locales (de, it, es, nl, fr) fall back to EN gracefully for any
  untranslated key — launch is safe with partial translations.
- Single `messages/en.json` is the canonical source of truth for all copy;
  inline fallbacks in component code are eliminated.
- next-intl provides type-safe key inference when TypeScript strict mode is on,
  catching typos at compile time.

**Negative / trade-offs:**

- `next-intl` is now a hard dependency — removing it requires reverting all 87
  call-sites.
- `getMessageFallback` only fires for keys absent from EN too; if an EN key is
  present but empty string, non-EN locales receive the empty string (not a
  fallback). Authors must not leave EN keys blank.
- next-intl's async `getTranslations()` in Server Components requires `await` —
  a minor ergonomic change from the synchronous `t()` pattern.

## Migration scope

- 87 files migrated (components, pages, API routes with user-facing messages).
- `lib/translations.ts` and `lib/locale-context.tsx` deleted.
- `messages/en.json` created as the EN base; per-locale files follow the same
  key schema.
- `next-intl.config.ts` owns the fallback strategy and locale list (mirrors
  `i18n.config.ts` per ADR 005-6).

## References

- Commits: f2ff160, 33e761a, 7d495d6
- `next-intl.config.ts` — plugin config + `getMessageFallback`
- `next.config.mjs` — plugin wiring (`withNextIntl`)
- `messages/en.json` — EN base locale (authoritative copy source)
- [ADR 005-6](005-6-locale-en-default-gb-flag.md) — locale list + default locale decision
