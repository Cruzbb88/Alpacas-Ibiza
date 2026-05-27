---
id: "CMP-006"
title: "AwardsBadges — trust signal badge band"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Horizontal strip of award/certification logos (TripAdvisor, eco-certs, animal-welfare schemes) linking to issuing org verification pages where available.

## Props
```ts
interface AwardsBadgesProps {
  title?: string         // e.g. "Certified & recognised"
  category?: AwardCategory
  className?: string
}
```

## Consumers
- No active page consumer yet; owner picks placement (DROP_IN_GUIDE.md)

## Failsafe behavior
`hasLiveAwards()` → false → `null` in production, amber hint (via `AwardsBadges.DevHint`) in dev. Category filter with no live results → `null`. Mirrors PressLogos pattern.

## Acceptance criteria
- [ ] Production: `null` when no entries have `status: 'live'`
- [ ] Dev: amber hint box with `AwardsBadges.DevHint` text
- [ ] Logo with `verifyUrl` wraps in `<Link target="_blank" rel="noopener">`
- [ ] Logo without `verifyUrl` wraps in `<span>` (not an inert link)
- [ ] Grayscale → color on hover

## Owner-input dependencies
- Logo files at `public/images/awards/<slug>.svg|png`
- Entries in `lib/data/awards.ts` with `logoUrl` + `status: 'live'`

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
