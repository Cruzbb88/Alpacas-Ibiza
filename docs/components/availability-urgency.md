# `AvailabilityUrgency`

**Source:** [components/availability-urgency.tsx](../../components/availability-urgency.tsx) — 46 LOC.

## What it does
Conversion-lift micro-component that displays the next available tour date and, when applicable, a scarcity badge ("Only N spots left") and a weekly-capacity summary. Renders nothing if the availability API is unconfigured, errored, or returned no dates.

## Usage

```tsx
import { AvailabilityUrgency } from '@/components/availability-urgency'

export default function Page() {
  return <AvailabilityUrgency className="mb-4" />
}
```

## Anatomy

- `div.rounded-lg.border.border-primary/30.bg-primary/5.p-3` — root wrapper (only when slot available)
  - `span[aria-hidden="true"]` — calendar emoji 📅
  - `span.font-medium` — "Next available: **{dayStr}**"
    - `strong` — formatted date string
  - `span.rounded-full.bg-orange-500/10` — scarcity badge (only when `capacity <= 5`)
  - `span.text-xs.text-foreground/60` — weekly capacity note (only when `totalSlotsThisWeek` in 1–30)

> Returns `null` when API is unavailable or no dates returned (source: availability-urgency.tsx:42).

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `className` | `string` | No | `''` | Applied to the wrapper div |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| Loading (`data === null`) | `useAvailability` pending | Returns `null` (no skeleton) |
| Error or empty | `data.error` or `data.dates.length === 0` | Returns `null` |
| Next slot capacity ≤ 5 | `next.capacity <= 5` | Orange scarcity badge rendered |
| Total week slots 1–30 | `totalSlotsThisWeek` in (0,30] | "N spots total this week" note rendered |

## Accessibility
- Calendar emoji has `aria-hidden="true"`.
- Scarcity badge text is fully readable (no icon-only).
- No `role` or `aria-live` — updates do not announce to screen readers since component returns null during load.

## Keyboard interactions

No interactive keyboard surface — semantic landmark only. The component renders a read-only `<div>` with informational text and badges; it contains no focusable elements, links, or buttons.

## i18n
- No translation keys. All text is hardcoded English:
  - `"Next available:"`, `"Only N spots left"`, `"N spots total this week"` — **UNMAPPED**.

## Dependencies
- npm: none
- internal: `lib/use-availability`

## Used by
- `app/[locale]/tours/page.tsx` (above `FareHarborCalendar`)

## Known gaps
- All display text is hardcoded English — needs i18n keys for multilingual support.
- Scarcity threshold (≤ 5) and weekly urgency threshold (≤ 30) are hardcoded constants with no prop override.
- No skeleton during load; component simply disappears, causing potential layout shift on the tours page.
- Date is formatted with `undefined` locale (`toLocaleDateString(undefined, ...)`) instead of the page locale.
