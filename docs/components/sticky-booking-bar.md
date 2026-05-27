# `StickyBookingBar`

**Source:** [components/sticky-booking-bar.tsx](../../components/sticky-booking-bar.tsx) — 46 LOC.

## What it does
Mobile-only (`md:hidden`) fixed bottom bar that slides up after the user scrolls 100 px. Contains a single full-width "Book Tour" anchor button linking to FareHarbor. Fires a `bookTourClick` conversion event on click.

## Usage

```tsx
import { StickyBookingBar } from '@/components/sticky-booking-bar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StickyBookingBar />
    </>
  )
}
```

## Anatomy

- `div.fixed.bottom-0.left-0.right-0.z-50.md:hidden` — bar container (slides via `translate-y-full` / `translate-y-0`)
  - `a[href="https://fareharbor.com/embeds/book/alpacasibiza/..."].w-full.block` — FareHarbor anchor
    - `Button.w-full.rounded-full.h-12` — "Book Tour" label (i18n key `nav.bookTour`)

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| _(none)_ | — | — | — | Locale from `useParams()`; booking URL from `lib/config` |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| `isVisible = false` | `scrollY <= 100` | Bar translated off-screen (`translate-y-full`) |
| `isVisible = true` | `scrollY > 100` | Bar slides up (`translate-y-0`) |

## Accessibility
- Button rendered as `<a>` wrapping a `<Button>` — native anchor is keyboard-focusable.
- No `aria-label` on the bar itself; button label comes from `tr('nav.bookTour')`.
- When hidden via `translate-y-full`, the element remains in the DOM and focus order — screen readers and keyboard users can still tab to it while it is visually off-screen.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus to/from the "Book Tour" button (`<a>` rendered via `BookingButton`) |
| `Enter` | Navigate to the FareHarbor booking URL |

The bar is `md:hidden` (CSS-only hide on desktop) but the `<a>` remains in the DOM and tab order at all viewport widths. Screen readers and keyboard users can reach it on desktop even when it is visually hidden. See **Known gaps** for the open `aria-hidden` / `inert` gap.

## i18n
Translation key used:
- `nav.bookTour`

## Dependencies
- npm: none
- internal: `lib/translations`, `lib/config` (FAREHARBOR_BOOKING_URL), `lib/analytics` (trackConversion.bookTourClick), `components/ui/button`

## Used by
- `app/[locale]/layout.tsx` (rendered on every locale page)

## Known gaps
- Bar is `md:hidden` (mobile only) but remains in the DOM on all viewport widths — tabbing order includes it on desktop, which is confusing. Should add `aria-hidden` or `tabindex="-1"` when hidden via breakpoint, or move it to a mobile-only render branch.
- Scroll listener is attached on every render with no debounce/throttle — may fire rapidly on fast scrolls.
- `isVisible` starts as `false` on SSR, causing a hydration-safe initial hidden state, but there is no `inert` attribute to fully exclude the bar from a11y tree when off-screen.
