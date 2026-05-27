# `TurnstileWidget`

**Source:** [components/turnstile-widget.tsx](../../components/turnstile-widget.tsx) — 92 LOC.

## What it does
Renders a Cloudflare Turnstile CAPTCHA widget using the explicit render API. Lazily loads the Turnstile JS from Cloudflare's CDN if not already present. On token receipt, writes to a hidden `<input>` (for standard form submissions) and calls the `onToken` callback. Returns `null` entirely if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset — safe for local dev.

## Usage

```tsx
import { TurnstileWidget } from '@/components/turnstile-widget'

function MyForm() {
  const [token, setToken] = useState('')
  return (
    <form>
      <TurnstileWidget onToken={setToken} />
    </form>
  )
}
```

## Anatomy

- Returns `null` when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset
- `div[className]` — outer wrapper (ref: none; receives `className` prop)
  - `input[type="hidden"][name="cf-turnstile-response"]` (ref: `inputRef`) — token carrier for form POST
  - `div` (ref: `containerRef`) — Turnstile render target; Cloudflare replaces this with an iframe at runtime

> Source: turnstile-widget.tsx:87–91. The two children (hidden input + empty div) are the entire static JSX; Cloudflare's `turnstile.render()` injects the iframe into `containerRef`.

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `fieldName` | `string` | No | `'cf-turnstile-response'` | Hidden input `name` attribute |
| `onToken` | `(token: string) => void` | No | — | Called when Turnstile issues a token |
| `className` | `string` | No | `''` | Applied to outer wrapper div |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| No site key | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` unset | Returns `null` — no widget, no input |
| Script loading | `useEffect`, Turnstile not yet loaded | Empty div (Turnstile loads async) |
| Widget rendered | Turnstile `render()` called | Interactive CAPTCHA widget (appearance: interaction-only) |
| Token received | User passes challenge | Hidden input populated; `onToken` called |
| Unmount / cleanup | Component unmounts | `turnstile.reset(widgetId)` called |

## Accessibility
- Turnstile widget itself is owned by Cloudflare — this component cannot control its internal a11y.
- Hidden input (`type="hidden"`) is not interactive.
- No wrapper `aria-*` — parent components wrap in `role="group" aria-label="Bot verification"`.

## Keyboard interactions

This component renders a Cloudflare Turnstile iframe — keyboard interactions (focus, challenge navigation, token completion) are fully managed by Cloudflare's embed, not by this component.

| Key | Action |
|-----|--------|
| `Tab` | Focus enters the Turnstile iframe if the challenge is visible (`appearance: 'interaction-only'` means the widget is invisible until a challenge is triggered) |
| _(Cloudflare-managed)_ | All challenge interaction keyboard behaviour is owned by Cloudflare's embed |

The hidden `<input type="hidden">` is not interactive and is not reachable by keyboard.

## i18n
- No translation keys. Turnstile widget language is controlled by Cloudflare (typically auto-detects browser locale).

## Dependencies
- npm: none (Turnstile loaded from `https://challenges.cloudflare.com/turnstile/v0/api.js` at runtime)
- internal: none

## Used by
- `components/contact-form.tsx`
- `components/commission-form.tsx`
- `components/newsletter-form.tsx`

## Known gaps
- `onToken` is in the `useEffect` dependency array but is a new function reference on every render — could cause repeated `turnstile.reset()` + `render()` cycles. Callers should memoize or use `useCallback`.
- The Cloudflare script tag is appended to `document.head` but never removed on unmount — accumulates across navigations in SPA mode.
- No `error-callback` exposed as a prop; widget silently fails if Cloudflare is unreachable.
- `appearance: 'interaction-only'` means the widget is visually invisible until challenged — no affordance that bot-protection is active.
