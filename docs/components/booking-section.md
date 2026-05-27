# `BookingSection`

**Source:** [components/booking-section.tsx](../../components/booking-section.tsx) — 113 LOC.

## What it does
Renders the main tour-booking CTA block: shows up to 8 upcoming available-date cards fetched from `/api/availability`, with per-slot scarcity badges, then an anchor button linking to FareHarbor. Falls back to a skeleton grid while loading; silently degrades to the plain CTA when availability data is unavailable.

## Usage

```tsx
import { BookingSection } from '@/components/booking-section'

export default function Page() {
  return <BookingSection />
}
```

## Anatomy

- `div.w-full` — root wrapper
  - `div.mb-8` — date grid container (only when slots available)
    - `div.flex` — "Next Available Dates" heading row
      - `Calendar` icon (lucide)
      - `h3` — section heading (i18n key `bookingSection.nextDates`)
    - `div.grid.grid-cols-2.md:grid-cols-4` — up to 8 date cards
      - `div` (×N) — individual date card
        - `div.text-xs` — weekday label
        - `div.text-3xl` — day number
        - `div.text-sm` — month label
        - `div.text-xs.text-orange-600` — scarcity badge (only when `capacity <= 5`)
  - `div.animate-pulse` — loading state text (only while `loading`)
  - `div.text-center` — CTA block
    - `a` — FareHarbor booking anchor (primary CTA)
      - `ArrowRight` icon
    - `CancellationBadge` variant="full"
    - `p` — "Powered by FareHarbor" note
    - `p` — API error note (only on error)

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| _(none)_ | — | — | — | Locale derived from `useParams()` |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| `loading` (data === null) | `useAvailability` not yet resolved | 8-card skeleton grid |
| `error` (data.error truthy) | API failure / FareHarbor creds unset | Error note shown; CTA still rendered |
| dates loaded, length > 0 | API returns slots | Date grid + "Book Now" CTA |
| dates loaded, length === 0 | API returns empty | "View & Book" CTA (no date grid) |

## Accessibility
- Date cards are `cursor-pointer` `<div>`s with no `role`/`tabindex` — **not keyboard-activatable**; they are decorative (actual booking goes through the anchor CTA below).
- CTA `<a>` is a native anchor — inherits keyboard focus naturally.
- Scarcity badge text is visible text (not icon-only).

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus between the "Book Now" / "View & Book" CTA and other focusable elements on the page |
| `Enter` / `Space` | Activate the focused CTA anchor (`<a>`) — opens FareHarbor booking URL |

Date cards (`<div cursor-pointer>`) have no `tabindex` or `role` and are not keyboard-reachable. This is intentional — they are decorative; the actual booking action is the CTA anchor below them. See **Known gaps** for the open issue.

## i18n
Translation keys used (via `t(locale)`):
- `bookingSection.nextDates`
- `bookingSection.spotsLeft`
- `bookingSection.updatedNote`
- `bookingSection.bookNow`
- `bookingSection.viewAndBook`
- `bookingSection.poweredBy`
- `bookingSection.apiNote`

## Dependencies
- npm: `lucide-react` (ArrowRight, Calendar)
- internal: `lib/translations`, `lib/config` (FAREHARBOR_BOOKING_URL), `lib/analytics` (trackConversion), `lib/use-availability`, `components/cancellation-badge`, `components/ui/skeleton`

## Used by
- `app/[locale]/page.tsx` (home page) — implied via `BookingSection` usage (search: not found in app; component may be unused or embedded via a route not yet grepped). Verify before removing.

## Known gaps
- Date cards have no `role="button"` or `tabindex`; clicking them does nothing (no navigation). They appear interactive via `cursor-pointer` but are purely cosmetic. Either wire them to FareHarbor item URLs or drop the cursor styling.
- Scarcity threshold is hardcoded at `<= 5` spots (same threshold in `AvailabilityUrgency`) — no env or prop to tune.
- `key={idx}` on date cards is index-based; use slot date string instead.
