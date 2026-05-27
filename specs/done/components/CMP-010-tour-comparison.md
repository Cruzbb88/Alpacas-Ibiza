---
id: "CMP-010"
title: "TourComparison — side-by-side tour table"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Side-by-side comparison of the 4 core tour types; desktop sticky-header table, mobile stacked cards; each column ends with a `BookingButton` CTA.

## Props
```ts
interface TourSpec {
  product: FareHarborProduct
  name: string
  duration: string   // e.g. '90 min' | 'Contact for details'
  price: string      // e.g. 'from €30 / person'
  capacity: string
  includes: string[]
  bestFor: string
}

interface TourComparisonProps {
  tours: TourSpec[]
  title?: string
  subtitle?: string
}
```

## Consumers
- `app/[locale]/tours/page.tsx`

## Failsafe behavior
No data is hard-coded in the component; all spec values arrive as props. Unmapped fields use caller-supplied fallback strings (e.g. `'Contact for details'`). `BookingButton` inside each column inherits its own fail-open guarantee (CMP-001).

## Acceptance criteria
- [ ] Desktop (`md:`): sticky-header `<table>` with rows: Duration, Price, Capacity, Best for, Includes, Book CTA
- [ ] Mobile: stacked `<div>` cards with same data as `<dl>` entries
- [ ] `BookingButton` per tour resolves to correct or fallback URL (see CMP-001)
- [ ] Empty `includes` array renders empty `<ul>` without crash

## Owner-input dependencies
- Confirmed per-tour prices, durations, and capacities (OWNER_INPUT_NEEDED.md)
- `FAREHARBOR_ITEM_*` env vars for per-tour CTAs (see CMP-001)

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
