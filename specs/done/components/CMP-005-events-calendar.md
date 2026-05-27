---
id: "CMP-005"
title: "EventsCalendar — upcoming farm events"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Surfaces upcoming farm events in a 3-column card grid, sourced from `lib/data/events.ts`; auto-filters past one-off events while keeping recurring events always visible.

## Props
```ts
interface EventsCalendarProps {
  title?: string
  subtitle?: string
  limit?: number
  className?: string
}
```

## Consumers
- No active page consumer yet (drop-in slot; HOME page placement recommended per DROP_IN_GUIDE.md with `limit={3}`)

## Failsafe behavior
`hasUpcomingEvents()` → false → `null` in production, amber hint in dev. CLAUDE.md failsafe row: "EventsCalendar renders null in production when no events are live".

## Acceptance criteria
- [ ] Production: `null` when no live events
- [ ] Dev: amber hint box visible when empty
- [ ] One-off events with past dates filtered out automatically
- [ ] Recurring events (`recurrence: 'weekly:sat,sun'`) always shown
- [ ] CTA link renders only when `event.ctaUrl` is set

## Owner-input dependencies
- Entries in `lib/data/events.ts` with `status: 'live'`
- `date` (ISO) for one-off events OR `recurrence` string for recurring

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
