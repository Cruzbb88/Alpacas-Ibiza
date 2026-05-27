# `GoogleReviewsBadge`

**Source:** [components/google-reviews-badge.tsx](../../components/google-reviews-badge.tsx) — 61 LOC.

## What it does
Fetches live Google Places rating and review count from `/api/google-reviews` and renders a compact star-rating badge linking to the Google business page. Shows a skeleton during fetch to prevent layout shift; renders nothing if the API is unconfigured (`{configured: false}`) or the fetch fails.

## Usage

```tsx
import { GoogleReviewsBadge } from '@/components/google-reviews-badge'

export default function Page() {
  return <GoogleReviewsBadge className="mt-2" />
}
```

## Anatomy

- Returns `null` when unconfigured, failed, or no rating
- `a[href="https://g.page/r/alpacasibiza"][target="_blank"]` — badge anchor
  - `span[aria-hidden="true"].text-yellow-500` — star string (e.g. `★★★★★`)
  - `span.font-semibold` — numeric rating (e.g. `4.9`)
  - `span.text-foreground/60` — review count (e.g. `(127 Google reviews)`)

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `className` | `string` | No | `''` | Applied to the anchor element |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| Loading (`data === null && !failed`) | Fetch in flight | `h-6 w-32` skeleton pill |
| Fetch failed | Network error | Returns `null` |
| Not configured (`!data.configured`) | Missing API keys | Returns `null` |
| Success | Data available with rating | Star badge `<a>` element |

## Accessibility
- Link has descriptive `aria-label`: `"Google rating {N} stars from {M} reviews"`.
- Star characters (`★☆`) are `aria-hidden="true"` — label carries the full description.
- `rel="noopener noreferrer"` on external link.
- AbortController used to cancel fetch on unmount — avoids state updates on unmounted component.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus to/from the badge `<a>` element |
| `Enter` | Open Google Business page (`https://g.page/r/alpacasibiza`) in a new tab |

The component renders a single native anchor; no custom keyboard handlers are present.

## i18n
- No translation keys. `"Google reviews"` label text is hardcoded English — **UNMAPPED**.
- Business URL `https://g.page/r/alpacasibiza` is hardcoded.

## Dependencies
- npm: none
- internal: `components/ui/skeleton`

## Used by
- `app/[locale]/tours/page.tsx`

## Known gaps
- `"Google reviews"` suffix in the badge text is hardcoded English.
- Business URL is hardcoded — should come from `lib/config` or env for multi-tenant reuse.
- `topReviews` is in the `ReviewSummary` interface but never rendered — dead field in this component.
- Stars rendered via string repetition (`'★'.repeat(...)`) — not accessible without `aria-label` if label is ever removed.
