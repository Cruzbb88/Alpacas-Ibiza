---
id: "004"
title: "Delete dead non-localized routes with USD prices and invented team names"
priority: P0
depends_on: []
est_size: S (1–2h)
---

## Context

`app/shop/*`, `app/about`, and `app/contact` are non-localized routes that exist alongside the localized `app/[locale]/` equivalents. They contain USD prices and invented team names not present on the live site. If Next.js route resolution ever changes, or if a redirect breaks, these routes silently serve incorrect pricing and fake content to real users.

Source: PLAN.md A3, VERIFICATION_RESULTS #5, task-radar Q1 "Dead non-localized routes".

## Acceptance criteria

- [ ] `app/shop/*`, `app/about`, and `app/contact` (non-localized) are deleted from the repo.
- [ ] No 404s introduced: all previously reachable non-localized URLs redirect (301) to their `[locale]` equivalents using `middleware.ts` or Next.js `redirects`.
- [ ] No USD price appears anywhere in the codebase outside of a `TODO: OWNER_INPUT_NEEDED` comment.
- [ ] No invented team member names exist in any component or translation file.
- [ ] `app/sitemap.ts` does not reference any deleted routes.
- [ ] Build passes (`next build`) with no type errors after deletion.

## Implementation notes

- Files to delete: `app/shop/` tree, `app/about/page.tsx`, `app/contact/page.tsx` (non-locale versions).
- Check `middleware.ts` — may need a catch-all redirect rule for `/shop`, `/about`, `/contact` → `/en/shop`, `/en/about`, `/en/contact`.
- Search codebase for `USD` and `$` in price strings before deleting to confirm all are in these files.

## Out of scope

- Redesigning the shop or about pages (separate effort).
- i18n completeness for remaining locales.
