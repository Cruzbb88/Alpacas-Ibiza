# `PageBreadcrumbs`

**Source:** [components/page-breadcrumbs.tsx](../../components/page-breadcrumbs.tsx) — 42 LOC.

## What it does
Server component that emits a `BreadcrumbList` JSON-LD `<script>` tag for SEO structured data. Automatically prepends a Home crumb; accepts additional crumbs as `name`/`path` pairs. Renders no visible UI — purely a structured-data injection point.

## Usage

```tsx
import { PageBreadcrumbs } from '@/components/page-breadcrumbs'

export default async function Page({ params }: { params: { locale: string } }) {
  return (
    <>
      <PageBreadcrumbs
        locale={params.locale}
        homeLabel="Home"
        crumbs={[{ name: 'Tours', path: 'tours' }]}
      />
    </>
  )
}
```

## Anatomy

- `script[type="application/ld+json"]` — sole rendered element; no visible DOM
  - Content: JSON-LD `BreadcrumbList` schema via `dangerouslySetInnerHTML`

> There is no wrapper div or visible UI. The component renders exactly one `<script>` tag (source: page-breadcrumbs.tsx:38–42). Visible breadcrumb nav requires a separate component.

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `locale` | `string` | Yes | — | Used to build locale-prefixed URLs |
| `homeLabel` | `string` | No | `'Home'` | Display name for the root crumb |
| `crumbs` | `BreadcrumbCrumb[]` | Yes | — | Array of `{ name: string; path: string }` |

## States
Stateless — pure render, no hooks.

## Accessibility
- Renders only a `<script type="application/ld+json">` — no visible DOM, no a11y surface.
- No visible breadcrumb trail is rendered; if a visible breadcrumb nav is needed for users, a separate component must be added.

## Keyboard interactions

No interactive keyboard surface — semantic landmark only. `PageBreadcrumbs` renders exclusively a `<script type="application/ld+json">` tag; there is no visible DOM, no focusable element, and no user-facing UI.

## i18n
- `homeLabel` defaults to English `'Home'` — callers should pass the translated string. Pages using this component do pass locale-appropriate strings via their own translation calls.

## Dependencies
- npm: none
- internal: `lib/structured-data` (breadcrumbSchema, toJsonLd), `lib/config` (SITE_BASE_URL)

## Used by
- `app/[locale]/tours/page.tsx`
- `app/[locale]/yoga/page.tsx`
- `app/[locale]/about/page.tsx`
- `app/[locale]/contact/page.tsx`
- `app/[locale]/sustainability/page.tsx`
- `app/[locale]/adopt/page.tsx`

## Known gaps
- No visible breadcrumb nav for users — JSON-LD only. Paired with `components/ui/breadcrumb` (Radix-based) if a visible trail is ever needed.
- `SITE_BASE_URL` must be correctly set; wrong base URL silently produces invalid structured data that Google may reject.
- `dangerouslySetInnerHTML` on the script tag is standard Next.js JSON-LD pattern — `toJsonLd` must escape characters properly (verify `lib/structured-data` escapes `</script>` sequences).
