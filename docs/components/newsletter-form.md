# `NewsletterForm`

**Source:** [components/newsletter-form.tsx](../../components/newsletter-form.tsx) — 116 LOC.

## What it does
Single-email newsletter signup form that posts to `/{locale}/api/newsletter` with Turnstile bot protection. On success fires a conversion tracking event and clears the input. Unlike `ContactForm`/`CommissionForm`, it does **not** use the `useFormSubmit` hook — it manages its own `fetch` call.

## Usage

```tsx
import { NewsletterForm } from '@/components/newsletter-form'

export default function Page({ params }: { params: { locale: string } }) {
  return <NewsletterForm locale={params.locale} />
}
```

## Anatomy

- `form.flex.flex-col.gap-2` — root form
  - `HoneypotField` (name="business_name") — hidden spam trap
  - `div.flex.gap-2` — email + submit row
    - `input[type="email"]` — email input
    - `button[type="submit"]` — subscribe button
  - `TurnstileWidget` — Cloudflare CAPTCHA (below the input row)
  - `p.text-green-600` — success message (only on success)
  - `p.text-red-600` — error message (only on error)

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `locale` | `string` | Yes | — | Prepended to the API route path |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| `idle` | Initial | Email input + subscribe button |
| `sending` | Submit in flight | Button disabled; same label text (no visible change) |
| `success` | API 200 | Green success message; focus moves to success paragraph |
| `error` | API non-200 or network fail | Red error message; focus returns to email input |

## Accessibility
- `<label>` for email input is `sr-only` (visible placeholder used instead).
- `aria-required="true"`, `aria-invalid` on error, `aria-describedby` points to hint + status.
- `#newsletter-email-hint` is `sr-only`.
- `#newsletter-form-status` is `role="status"` + `aria-live="polite"`.
- Success `<p>` has `tabIndex={-1}` for programmatic focus.
- Submit button has `aria-disabled` matching disabled state.
- Turnstile wrapper: `role="group" aria-label="Bot verification"`.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus between the email input, the Turnstile widget, and the Subscribe button |
| `Enter` | Submit the form when the email input is focused (single `<input type="email">` — native browser submit-on-enter) or when the Subscribe button is focused |
| `Esc` | No explicit reset handler — dismisses browser autofill suggestion dropdown if open |

No custom `onKeyDown` handlers. The Turnstile iframe's keyboard interactions are managed by Cloudflare (see `TurnstileWidget` doc).

## i18n
Translation keys used (via `t(locale)`):
- `newsletter.placeholder`
- `newsletter.subscribe`
- `newsletter.success`

## Dependencies
- npm: none
- internal: `lib/translations`, `components/turnstile-widget`, `lib/analytics` (trackConversion.newsletterSignup)

## Used by
- `app/[locale]/page.tsx` (home page)

## Known gaps
- `status === 'sending'` does not change the button label (renders same `translate('newsletter.subscribe')`) — no visible in-progress feedback beyond `opacity-50`.
- Manages its own fetch instead of using `useFormSubmit` — diverges from `ContactForm`/`CommissionForm` pattern; error handling is duplicated.
- `error` prop shadows the outer state variable naming — minor cognitive confusion.
- API path `/${locale}/api/newsletter` assumes locale-prefixed API routes, which is unusual in Next.js App Router; verify route exists at that path.
