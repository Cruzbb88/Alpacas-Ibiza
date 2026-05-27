# `Footer`

**Source:** [components/footer.tsx](../../components/footer.tsx) — 131 LOC.

## What it does
Four-column site footer (About, Quick Links, Shop, Contact) with locale-prefixed internal links, tel/WhatsApp/email/social links, and a dynamic copyright year. WhatsApp link fires a `whatsappClick` conversion event.

## Usage

```tsx
import { Footer } from '@/components/footer'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  )
}
```

## Anatomy

- `footer.w-full.border-t.bg-background` — semantic footer
  - `div.max-w-7xl.px-4.py-12` — inner container
    - `div.grid.grid-cols-1.md:grid-cols-4.gap-8` — 4-column grid
      - `div` — About column: `h3` "Alpacas Ibiza" + `p` tagline
      - `div` — Explore column: `h3` + `ul` with 4 `Link` items (tours, shop, about, contact)
      - `div` — Shop column: `h3` + `ul` with 3 `Link` items (woven, commission, manure)
      - `div` — Contact column: `h3` + `ul` with address, `a[href="tel:…"]`, WhatsApp `a`, email `a`, Instagram `a`, Facebook `a`
    - `div.mt-8.border-t.text-center` — copyright bar
      - `p` — `© {year} Alpacas Ibiza.` + i18n copyright text

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| _(none)_ | — | — | — | Locale from `useParams()` |

## States
Component is stateless — renders based solely on locale and translation keys.

## Accessibility
- Uses semantic `<footer>` element.
- WhatsApp link has `aria-label="Chat on WhatsApp"` and `aria-hidden` on the emoji.
- All external links have `rel="noopener noreferrer"`.
- Internal nav links use Next.js `<Link>` (keyboard-accessible).
- Column headings are `<h3>` — document outline requires these follow an `<h2>` on the page; pages must provide appropriate heading hierarchy.

## Keyboard interactions

The footer is a semantic `<footer>` landmark containing standard `<a>` and `<button>` elements; all interactive elements are natively keyboard-accessible.

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus through all nav links (Visit, Shop, Discover, Support, Legal columns), then the tel/email/social/WhatsApp links, then the "Manage cookie preferences" button |
| `Enter` | Activate the focused link (navigate) or button ("Manage cookie preferences" — reloads page after clearing `localStorage` consent key) |

No custom `onKeyDown` handlers. The "Manage cookie preferences" `<button>` at `components/footer.tsx:184` is the only interactive non-link element.

## i18n
Translation keys used (via `t(locale)`):
- `footer.tagline`
- `footer.explore`
- `footer.aboutUs`
- `footer.contact`
- `footer.shopTitle`
- `footer.wovenCollection`
- `footer.customCommission`
- `footer.alpacaManure`
- `footer.copyright`
- `nav.tours`, `nav.shop`

## Dependencies
- npm: none
- internal: `lib/translations`, `lib/analytics` (trackConversion.whatsappClick), Next.js `Link`

## Used by
- `app/[locale]/layout.tsx` (every locale page)

## Known gaps
- Phone number (`+32 475 58 65 44`), email (`info@alpacasibiza.com`), address (`San Carlos, Ibiza`), and social URLs are all hardcoded — **UNMAPPED** for multi-tenant use.
- No `<nav aria-label="Footer">` wrapper — screen readers cannot distinguish footer navigation from other landmarks.
- `new Date().getFullYear()` runs at render time; on SSR this is fine, but in static export it would bake the build year.
- WhatsApp number hardcoded as `32475586544` (Belgian area code) — should be config-driven.
