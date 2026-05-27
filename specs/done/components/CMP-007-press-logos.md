---
id: "CMP-007"
title: "PressLogos — press coverage trust band"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Horizontal strip of press outlet logos (Belgian media coverage) that links to source articles where available; homepage trust signal.

## Props
```ts
interface PressLogosProps {
  title?: string   // e.g. "As featured in"
  className?: string
}
```

## Consumers
- `app/[locale]/press-kit/page.tsx`
- Owner drop-in for homepage (DROP_IN_GUIDE.md)

## Failsafe behavior
`hasLivePress()` → false → `null` in production, amber hint (via `PressLogos.DevHint`) in dev. Mirrors `GoogleReviewsBadge` pattern. CLAUDE.md: "PressLogos" failsafe noted.

## Acceptance criteria
- [ ] Production: `null` when no entries have `logoUrl` set + `status: 'live'`
- [ ] Dev: amber hint box with `PressLogos.DevHint` text
- [ ] Entry with `articleUrl` wraps logo in `<a target="_blank" rel="noopener">`
- [ ] Entry without `articleUrl` wraps in `<span>`
- [ ] Grayscale → color on hover; opacity-70 baseline

## Owner-input dependencies
- Logo files at `public/images/press/<slug>.svg|png`
- Entries in `lib/data/press.ts` with `logoUrl` + `status: 'live'`

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
