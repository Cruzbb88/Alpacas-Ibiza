# `ContactForm`

**Source:** [components/contact-form.tsx](../../components/contact-form.tsx) — 171 LOC.

## What it does
Multi-field contact form (name, email, subject, message) that submits to `/api/contact` via the `useFormSubmit` hook. Integrates Cloudflare Turnstile bot-protection, tracks the conversion event on success, and replaces itself with a success panel after submission.

## Usage

```tsx
import { ContactForm } from '@/components/contact-form'

export default function Page() {
  const labels = {
    name: 'Name', email: 'Email', subject: 'Subject', message: 'Message',
    send: 'Send', sending: 'Sending…', success: 'Message sent!', error: 'Something went wrong.',
  }
  return <ContactForm labels={labels} />
}
```

## Anatomy

- `div.text-center.rounded-lg` — success panel (replaces form on success)
  - `div.text-4xl` — ✅ emoji
  - `p` — success message
- `form.space-y-4` — main form (idle/loading/error states)
  - `HoneypotField` (name="company_url") — hidden spam trap
  - `div` ×4 — field wrappers (name, email, subject, message)
    - `label` — field label
    - `input` / `textarea` — form control
  - `TurnstileWidget` — Cloudflare CAPTCHA
  - `p.text-red-600` — error message (only on error state)
  - `button[type="submit"]` — submit button

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `labels` | `ContactFormProps['labels']` | Yes | — | All visible strings: name, email, subject, message, send, sending, success, error |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| `idle` | Initial | Form rendered, submit enabled |
| `loading` | Submit fired, awaiting API | Button disabled + "Sending…" label |
| `success` | API 200 | Form replaced by `role="status"` success panel; focus moved to success heading |
| `error` | API non-200 or network fail | Inline error text in `#contact-form-status`; focus moved to first invalid field |

## Accessibility
- All fields have explicit `<label htmlFor>` associations.
- `aria-required="true"` on required fields; `aria-invalid` set dynamically on error.
- `aria-describedby` on name/message points to `#contact-form-status`; on email also includes `#contact-email-hint` (screen-reader hint with example).
- Success state uses `role="status"` + `aria-live="polite"` + programmatic focus via `ref`.
- Submit button has `aria-disabled` matching the `disabled` attribute.
- Turnstile wrapper has `role="group" aria-label="Bot verification"`.
- `noValidate` on `<form>` — validation is server-side + custom; native browser popups suppressed.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus between name, email, subject, message fields, the Turnstile widget, and the Submit button |
| `Enter` | Submit the form when the Submit button is focused; also submits if pressed inside a single-line text input (native browser behaviour) |
| `Esc` | No explicit reset handler — clears browser autofill suggestion popups if open |

There is no custom `onKeyDown` handler on this form; behaviour above is native HTML + browser defaults. The Turnstile iframe's keyboard interactions are managed by Cloudflare (see `TurnstileWidget` doc).

## i18n
- No internal translation calls. All strings come from the `labels` prop supplied by the parent page.

## Dependencies
- npm: none
- internal: `components/turnstile-widget`, `lib/analytics` (trackConversion.contactFormSubmit), `lib/useFormSubmit`

## Used by
- `app/[locale]/contact/page.tsx`

## Known gaps
- `subject` field has no `required` attribute or `aria-required`, but the other fields do — inconsistent validation UX.
- `firstInvalidRef` captures the first `:invalid` element but `useEffect` only fires after a re-render; the focus may not land on the correct element if validation is async.
- Error text from `labels.error` is generic — no per-field error messages.
