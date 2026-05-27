---
id: "005"
title: "Locale strategy — default locale, flag emoji, prune untranslated locales"
priority: P0
depends_on: []
est_size: S (2–3h code, owner decision required)
---

## Context

Six locales are configured (`en/de/it/es/nl/fr`). The default is `en`, but the live site is Dutch-first (Belgian founders, Belgian press). IT and FR have no real translations — they're machine-guessed at best, empty at worst. The English flag emoji is `🇬🇧`, wrong for a Spain-based business.

No peer alpaca/agritourism site runs more than 3 locales at launch. Running 6 with 2 untranslated creates maintenance debt and potential SEO harm (duplicate/thin-content hreflang entries).

Source: OWNER_INPUT_NEEDED.md:14–18, PLAN.md C1, VERIFICATION_RESULTS #7, task-radar Q2.

## Acceptance criteria

- [ ] Owner decision is recorded in `OWNER_INPUT_NEEDED.md` (or PRACTICES.md) before this spec ships: (a) default locale = `en` or `nl`; (b) drop IT/FR or keep as "machine-translated, uncurated" with a visible notice.
- [ ] `i18n.config.ts` (or equivalent) reflects the confirmed locale list — no untranslated locales enabled unless they carry a "machine-translated" notice in the UI.
- [ ] Default locale in `next.config.mjs` matches owner decision.
- [ ] English language switcher uses `🇺🇸` or a text label (`EN`) — not `🇬🇧`.
- [ ] `hreflang` tags in `app/[locale]/layout.tsx` only cover active, populated locales.
- [ ] `next build` produces no missing-translation warnings for active locales.

## Implementation notes

- Files to touch: `i18n.config.ts`, `next.config.mjs` (defaultLocale), `components/language-switcher.tsx` (flag emoji), `app/[locale]/layout.tsx` (hreflang).
- If dropping IT/FR: delete their translation JSON files and remove from `locales` array; add 301 redirects from `/it/*` and `/fr/*` to `/en/*`.
- If keeping as machine-translated: add a banner component (e.g., `<MachineTranslatedBanner />`) rendered when `locale === 'it' || locale === 'fr'`.

## Out of scope

- Full professional translation of IT/FR (owner/translator work, not code).
- RTL locale support.
