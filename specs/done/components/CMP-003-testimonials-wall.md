---
id: "CMP-003"
title: "TestimonialsWall — 3-column testimonial grid"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Renders a responsive 3-column grid of guest testimonials sourced from `lib/data/testimonials.ts`, sorted newest-first.

## Props
```ts
interface TestimonialsWallProps {
  title?: string
  subtitle?: string
  limit?: number     // cap on cards shown; default: all live entries
  className?: string
}
```

## Consumers
- `components/latest-stories.tsx`
- Owner pick for additional pages (DROP_IN_GUIDE.md)

## Failsafe behavior
`hasLiveTestimonials()` → false → renders `null` in production; amber hint box in dev. No entries needed at build time. CLAUDE.md failsafe map: mirrors PressLogos pattern.

## Acceptance criteria
- [ ] Production: renders nothing when zero entries have `status: 'live'`
- [ ] Dev: amber hint box visible when empty
- [ ] Renders `TestimonialCard` per live entry, newest first
- [ ] `limit` prop caps the number of cards without error

## Owner-input dependencies
- At least one entry in `lib/data/testimonials.ts` with `status: 'live'`

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
