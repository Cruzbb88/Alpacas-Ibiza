---
id: "CMP-004"
title: "PhotoGallery — image grid with lightbox"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Renders a filterable photo grid (2/3/4 columns) from `lib/data/media.ts`; clicking any thumbnail opens a fullscreen Radix Dialog lightbox with keyboard arrow navigation.

## Props
```ts
interface PhotoGalleryProps {
  title?: string
  category?: MediaCategory
  limit?: number
  columns?: 2 | 3 | 4   // default 3
  className?: string
}
```

## Consumers
- `app/[locale]/media/page.tsx`
- Owner drop-in for any page (DROP_IN_GUIDE.md)

## Failsafe behavior
`hasLiveMedia()` → false → `null` in production, amber hint in dev. Category filter with no live results → `null` (no crash). CLAUDE.md failsafe row: "PhotoGallery renders null in production when no photos are live".

## Acceptance criteria
- [ ] Empty state: `null` in production, amber dev hint
- [ ] Category-filtered empty set: `null` (no empty grid)
- [ ] Lightbox: Escape closes, ArrowLeft/Right navigates, focus trapped
- [ ] `DialogTitle` visually hidden (a11y compliant)
- [ ] Prev/next buttons hidden when only 1 photo

## Owner-input dependencies
- Files at `public/images/gallery/`
- Entries in `lib/data/media.ts` with `status: 'live'`

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
