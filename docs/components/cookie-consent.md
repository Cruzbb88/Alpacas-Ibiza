# `CookieConsent`

**Source:** [components/cookie-consent.tsx](../../components/cookie-consent.tsx) — 108 LOC.

## What it does
Persistent GDPR/cookie-consent banner stored to `localStorage` under key `ai_cookie_consent_v1`. On first visit (no stored value) renders a fixed bottom bar with Accept All / Reject Non-Essential buttons. On choice: writes consent to localStorage, updates `window.dataLayer` with a GTM `cookie_consent_update` event, and applies Google Consent Mode v2 grant/deny signals for `ad_storage`, `analytics_storage`, `ad_user_data`, and `ad_personalization`.

## Usage

```tsx
import { CookieConsent } from '@/components/cookie-consent'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CookieConsent />
    </>
  )
}
```

## Anatomy

- Returns `null` when consent already stored in `localStorage`
- `div[role="dialog"][aria-live="polite"].fixed.bottom-0.inset-x-0.z-[1000]` — banner
  - `div.max-w-5xl.flex.flex-col.md:flex-row` — inner layout row
    - `p#cookie-consent-message.flex-1.text-sm` — consent message text
      - `Link[href="/{locale}/cookies"]` — "cookie policy" link
    - `div.flex.gap-2.shrink-0` — button group
      - `button[type="button"]` — "Reject non-essential"
      - `button[type="button"].bg-primary` — "Accept all"

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| _(none)_ | — | — | — | Locale from `useParams()` |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| Consent already stored | `readConsent()` returns non-null on mount | `visible = false`; component returns `null` |
| First visit | No stored consent | Banner visible at bottom of viewport |
| Accepted | "Accept all" clicked | Grants all Consent Mode signals; banner dismissed |
| Rejected | "Reject non-essential" clicked | Denies all Consent Mode signals; banner dismissed |

## Accessibility
- Wrapper has `role="dialog"`, `aria-live="polite"`, `aria-label`, and `aria-describedby="cookie-consent-message"`.
- Both buttons are `type="button"` (no accidental form submission).
- No focus trap or focus management when banner appears — keyboard users may not be auto-directed to it.
- No `aria-modal="true"` — does not visually cover content but is a dialog by role.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus between the "cookie policy" link, the "Reject non-essential" button, and the "Accept all" button |
| `Enter` / `Space` | Activate the focused button — writes consent to `localStorage`, fires Consent Mode v2 signal, and dismisses the banner |

Both buttons are `type="button"` (no form). No custom `onKeyDown` handlers — behaviour is native. No focus trap is set when the banner appears; keyboard users reach it by tabbing through the page.

## i18n
Translation keys used (via `t(locale)`):
- `cookieConsent.ariaLabel`
- `cookieConsent.message`
- `cookieConsent.policyLink`
- `cookieConsent.reject`
- `cookieConsent.accept`

All keys have inline English fallback strings.

## Dependencies
- npm: none
- internal: `lib/translations`, Next.js `Link`

## Used by
- `app/[locale]/layout.tsx`

## Known gaps
- No focus trap when banner is shown — WCAG 2.1 §2.1.2 (No Keyboard Trap) is satisfied, but users may not discover the dialog without announcement.
- `readConsent()` guards against `localStorage` throws (privacy mode) but does not handle `SecurityError` specifically.
- GTM Consent Mode v2 push uses array-style `dataLayer.push(['consent', ...])` which is the correct UA/GA4 pattern but is untested without a live GTM container.
- `STORAGE_KEY = 'ai_cookie_consent_v1'` — `ai_` prefix looks like an artifact; confirm intended namespace.
