# `CommissionForm`

**Source:** [components/commission-form.tsx](../../components/commission-form.tsx) — 156 LOC.

## What it does
Three-field commission inquiry form (name, email, project description) that submits to `/api/commission`. Structurally mirrors `ContactForm`: uses `useFormSubmit`, integrates Turnstile, fires a conversion event on success, and replaces itself with a success panel.

## Usage

```tsx
import { CommissionForm } from '@/components/commission-form'

export default function Page() {
  const labels = {
    name: 'Name', email: 'Email', description: 'Project description',
    submit: 'Submit', sending: 'Sending…', success: 'Request received!', error: 'Something went wrong.',
  }
  return <CommissionForm labels={labels} />
}
```

## Anatomy

- `div.text-center.rounded-lg` — success panel (replaces form on success)
  - `div.text-4xl` — ✨ emoji
  - `p` — success message
- `form.space-y-6` — main form
  - `HoneypotField` (name="phone_extension") — hidden spam trap
  - `div` ×3 — field wrappers (name, email, description)
    - `label` — field label
    - `input` / `textarea[rows=6]` — form control
  - `TurnstileWidget` — Cloudflare CAPTCHA
  - `p.text-red-600` — error message (only on error)
  - `button[type="submit"]` — submit button

## Props
| Prop | Type | Required | Default | Notes |
|------|------|----------|---------|-------|
| `labels` | `CommissionFormProps['labels']` | Yes | — | name, email, description, submit, sending, success, error |

## States
| State | Trigger | UI behavior |
|-------|---------|-------------|
| `idle` | Initial | Form rendered |
| `loading` | Submitting | Button disabled + "Sending…" label |
| `success` | API 200 | Success panel with sparkles emoji; focus moved to success heading |
| `error` | API failure | Error text in `#commission-form-status`; focus on first invalid |

## Accessibility
- Explicit `<label htmlFor>` on all fields.
- `aria-required="true"`, `aria-invalid`, and `aria-describedby` on required inputs.
- Email hint (`#commission-email-hint`) is `sr-only`.
- Success uses `role="status"` + `aria-live="polite"` + programmatic `ref` focus.
- Turnstile wrapper: `role="group" aria-label="Bot verification"`.
- `noValidate` on `<form>`.

## Keyboard interactions

| Key | Action |
|-----|--------|
| `Tab` / `Shift+Tab` | Move focus between name, email, description fields, the Turnstile widget, and the Submit button |
| `Enter` | Submit the form when the Submit button is focused; also submits from the name/email single-line inputs via native browser behaviour |
| `Esc` | No explicit reset handler — dismisses browser autofill suggestion dropdowns if open |

No custom `onKeyDown` handlers; behaviour is native HTML. The Turnstile iframe's keyboard interactions are managed by Cloudflare (see `TurnstileWidget` doc).

## i18n
- No internal translation calls. All strings from `labels` prop.

## Dependencies
- npm: none
- internal: `components/turnstile-widget`, `lib/analytics` (trackConversion.commissionSubmit), `lib/useFormSubmit`

## Used by
- `app/[locale]/shop/commission/page.tsx`

## Known gaps
- Nearly identical to `ContactForm` (same hook, same a11y pattern, same error handling). These two components share ~80% of their logic — a shared `<BaseForm>` abstraction would reduce drift risk.
- Same `firstInvalidRef` async-focus timing caveat as `ContactForm`.
- Generic single error message — no per-field feedback.
