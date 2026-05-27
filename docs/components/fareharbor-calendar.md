# `FareHarborCalendar`

**Source:** [components/fareharbor-calendar.tsx](../../components/fareharbor-calendar.tsx) — 96 LOC.

## What it does
Injects FareHarbor's official script-tag calendar embed into the page via a `useEffect`-managed `<script>`. The script replaces the wrapper `<div>` with FareHarbor's full booking UI. On script load fires a conversion event; on script error renders a direct FareHarbor link as fallback. Supports per-item scoping (single-tour calendar) or flow-scoped full calendar.

## Usage

```tsx
import { FareHarborCalendar } from '@/components/fareharbor-calendar'

export default function Page() {
  return <FareHarborCalendar />
}
```

With single-tour scope:

```tsx
<FareHarborCalendar itemId="12345" />
```

## Anatomy

- `div.fareharbor-calendar-wrapper.w-full` (ref: `containerRef`) — script injection target
  - `noscript` — static fallback link (only when JS disabled)
    - `a` — "View Available Dates & Book Now" direct FareHarbor link
  - _(FareHarbor script replaces this div's content at runtime)_
  - `a` — error-fallback link (injected by `script.onerror`, not JSX)

> Source: components/fareharbor-calendar.tsx:79–91. FareHarbor's script completely replaces the `containerRef` div content; the `<noscript>` is the only persistent child.

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `shortname` | `string` | No | `NEXT_PUBLIC_FAREHARBOR_SHORTNAME` or `'alpacasibiza'` | FareHarbor account |
| `flowId` | `string` | No | `NEXT_PUBLIC_FAREHARBOR_FLOW_ID` | Scopes to booking flow |
| `itemId` | `string` | No | undefined | Filters to single tour item |
| `fullItems` | `boolean` | No | `true` | Include full item images/descriptions |
| `fallback` | `'simple' \| 'error'` | No | `'simple'` | FareHarbor's built-in JS-disabled fallback |
| `className` | `string` | No | `''` | Applied to wrapper div |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| Script loading | `useEffect` mounts | Empty `<div>` (FareHarbor script takes over) |
| Script loaded | `script.onload` | FareHarbor calendar replaces div content |
| Script error | `script.onerror` | Inline "View Available Dates & Book Now" link |
| JS disabled | `<noscript>` | Static anchor link to FareHarbor |

## Accessibility
- Script-injected FareHarbor UI owns its own a11y — this component cannot control it.
- Error fallback link has `rel="noopener noreferrer"` and `target="_blank"`.
- `<noscript>` link is the same.
- No `aria-*` on the wrapper div; FareHarbor script replaces content entirely.

## Keyboard interactions

The calendar UI is injected by a third-party FareHarbor `<script>` that replaces the wrapper `<div>` at runtime — keyboard interactions are owned and managed by FareHarbor's embed, not this component.

| Key | Action |
|-----|--------|
| _(FareHarbor-managed)_ | All calendar navigation, date selection, and modal interactions are handled by the FareHarbor embed |
| `Tab` / `Enter` | Error-fallback link ("View Available Dates & Book Now") is a native `<a>` — standard keyboard accessible |

## i18n
- No translation keys. "View Available Dates & Book Now" fallback text is hardcoded English — **UNMAPPED** for non-English locales.

## Dependencies
- npm: none (FareHarbor script loaded from CDN at runtime)
- internal: `lib/analytics` (trackConversion.bookingCalendarOpen)

## Used by
- `app/[locale]/tours/page.tsx`
- `app/[locale]/yoga/page.tsx`
- `app/[locale]/experiences/family-farm-days/page.tsx`
- `app/[locale]/experiences/corporate-team-building/page.tsx`

## Known gaps
- `fallbackHref` is computed after `useEffect` closes over it — the `fallback` and `flowId`/`itemId` values in `onerror` are always current but the URL is rebuilt on every render even when unused.
- Fallback button text `"View Available Dates & Book Now"` is hardcoded English — not i18n-aware.
- No loading indicator while FareHarbor script fetches; container is empty white space.
- Script cleanup on unmount only calls `reset(widgetId)` — the injected DOM from FareHarbor is not explicitly cleared, which can leave orphaned nodes on fast navigation.
