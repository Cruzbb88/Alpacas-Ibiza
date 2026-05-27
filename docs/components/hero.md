# `Hero`

**Source:** [components/hero.tsx](../../components/hero.tsx) — 99 LOC.

## What it does
Full-bleed hero section supporting an optional background video (autoplay muted loop), a fallback static background image, a gradient overlay, and up to two CTA buttons. The primary CTA fires a `bookTourClick` conversion event. Falls back to a CSS gradient if neither video nor image is provided.

## Usage

```tsx
import { Hero } from '@/components/hero'

export default function Page() {
  return (
    <Hero
      title="Meet Our Alpacas"
      subtitle="Unforgettable experiences on Ibiza's only alpaca farm."
      cta={{ label: 'Book a Tour', href: '/en/tours' }}
    />
  )
}
```

## Anatomy

- `section.relative.w-full.min-h-[600px]` — full-bleed section
  - `video[autoPlay muted loop playsInline]` — video background (only when `videoSrc` set; source: hero.tsx:35–46)
  - `div.absolute.inset-0.bg-cover` — static image background (only when no `videoSrc`; source: hero.tsx:48–57)
  - `div.absolute.inset-0.bg-gradient-to-br.backdrop-blur-[1px]` — overlay scrim (always present)
  - `div.relative.z-10.max-w-3xl` — content container
    - `h1.text-4xl.md:text-6xl` — page title
    - `p.text-lg.md:text-xl` — subtitle
    - `div.flex.flex-col.sm:flex-row` — CTA button row (only when `cta` or `secondary` set)
      - `Button asChild` → `Link` — primary CTA (accent style; only when `cta` set)
        - `ArrowRight` icon
      - `Button asChild variant="outline"` → `Link` — secondary CTA (only when `secondary` set)

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `title` | `string` | Yes | — | `<h1>` content |
| `subtitle` | `string` | Yes | — | Body paragraph |
| `cta` | `{ label: string; href: string }` | No | — | Primary button (accent style) |
| `secondary` | `{ label: string; href: string }` | No | — | Secondary outline button |
| `backgroundImage` | `string` | No | — | Path passed to `next/image` `<Image fill priority>`; ignored when `videoSrc` present |
| `videoSrc` | `string` | No | — | MP4 source; takes precedence over `backgroundImage` |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| Video present | `videoSrc` prop set | `<video>` autoplay background |
| Image only | `backgroundImage` set, no video | `<Image fill priority sizes="100vw">` — LCP-optimized |
| No media | Neither prop | CSS linear-gradient fallback |

## Accessibility
- `<h1>` uses `text-balance` for typographic wrapping.
- Background `<video>` has `muted`, `playsInline`, and `aria-hidden="true"` — decorative, hidden from assistive tech.
- No `aria-label` on `<section>` — page must have a single `<h1>` to provide landmark context.
- Background video has no `<track>` for captions — acceptable for decorative video (`aria-hidden` set).
- CTA uses `Button asChild` + `Link` — renders as `<a>`, fully keyboard accessible.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus between the primary CTA and secondary CTA buttons (when both are present) |
| `Enter` / `Space` | Activate the focused CTA — navigates to `cta.href` or `secondary.href` via Next.js `<Link>` (rendered as `<a>`) |

Background video (`aria-hidden="true"`) and static image (`alt=""`) have no keyboard surface. No custom `onKeyDown` handlers; behaviour is native anchor/button semantics from `Button asChild + Link`.

## i18n
- No translation calls. All strings passed via props by the parent page (which handles i18n).

## Dependencies
- npm: `lucide-react` (ArrowRight)
- internal: `components/ui/button`, `lib/analytics` (trackConversion.bookTourClick)

## Used by
- `app/[locale]/page.tsx`, `app/[locale]/about/page.tsx`, `app/[locale]/tours/page.tsx`, `app/[locale]/alpacas/page.tsx`, `app/[locale]/experiences/*`, `app/[locale]/yoga/page.tsx`, `app/[locale]/gifts/page.tsx`, `app/[locale]/terms/page.tsx`, `app/[locale]/cookies/page.tsx`, `app/[locale]/privacy/page.tsx`

## Known gaps
- Many callers note `{/* backgroundImage pending owner photo supply — Hero falls back to gradient */}` — several pages intentionally omit both props, relying on the gradient fallback.
- `trackConversion.bookTourClick()` fires on the primary CTA regardless of `href`; non-booking uses (e.g., legal pages) will emit booking conversion events incorrectly.
- No `preload` or `poster` on `<video>` — may cause flash on slow connections.
