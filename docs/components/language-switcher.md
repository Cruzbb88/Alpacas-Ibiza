# `LanguageSwitcher`

**Source:** [components/language-switcher.tsx](../../components/language-switcher.tsx) — 47 LOC.

## What it does
Radix-UI Select dropdown that lists available locales with flag emoji and locale name. On selection, strips the old locale segment from the current pathname, prepends the new locale, and performs a hard `window.location.href` navigation to force a full server-component re-render.

## Usage

```tsx
import { LanguageSwitcher } from '@/components/language-switcher'

function Header() {
  return <LanguageSwitcher />
}
```

## Anatomy

- `Select` (Radix via `components/ui/select`) — root select primitive
  - `SelectTrigger.w-[140px]` — trigger button showing current locale
    - `SelectValue` — current locale flag + name
  - `SelectContent` — dropdown portal
    - `SelectItem` (×N locales) — one per `i18nConfig.locales` entry
      - `span.flex.items-center.gap-2` — item row
        - `span` — flag emoji (`i18nConfig.localeFlagEmoji[locale]`)
        - `span` — locale name (`i18nConfig.localeNames[locale]`)

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| _(none)_ | — | — | — | Locale list, names, and flags come from `i18nConfig` |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| Current locale selected | `useParams()` | Select trigger shows current locale flag + name |
| User selects new locale | `onValueChange` | Full-page hard navigation to new-locale path |

## Accessibility
- Radix `Select` provides keyboard navigation (arrow keys, Enter, Escape) and `aria-expanded` on the trigger.
- Flag emojis are inline text inside `SelectItem` — no explicit `aria-hidden`; screen readers may announce them. Acceptable because `localeNames` string follows immediately.
- No explicit `aria-label` on the trigger — screen readers announce the selected value.

## Keyboard interactions

Powered by Radix UI `Select` (`components/ui/select`), which implements the [ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus to/from the Select trigger |
| `Enter` / `Space` | Open the locale dropdown |
| `Arrow Down` / `Arrow Up` | Move between locale options within the open dropdown |
| `Enter` / `Space` | Select the focused locale (triggers `window.location.href` hard navigation) |
| `Esc` | Close the dropdown without changing locale |
| `Home` / `End` | Jump to first / last locale option in the list |

Radix manages `aria-expanded`, `aria-selected`, and focus trapping inside the popover. Source: Radix `Select` primitive (via `components/ui/select.tsx`).

## i18n
- Locale metadata from `i18nConfig.localeNames` and `i18nConfig.localeFlagEmoji` — all locale display strings are config-driven, not translated strings.

## Dependencies
- npm: `@radix-ui/react-select` (via `components/ui/select`)
- internal: `i18n.config`, `components/ui/select`

## Used by
- `components/header.tsx` (desktop nav and mobile menu)

## Known gaps
- Hard `window.location.href` navigation discards all React state and triggers a full page reload — intentional to re-render server components, but loses scroll position and any unsaved form state.
- No `hreflang` link injection or SEO signal from this component — language discovery for crawlers must be handled at the page/layout level.
- Flag emojis may render inconsistently across platforms (Windows renders them as two-letter codes, not flag images).
