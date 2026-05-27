# UFT-001 — Alpacas Ibiza Duplicate-Logic Scan
**Date:** 2026-05-26  
**Scope:** L1 catalog — abstract function overlap only, no migration plans  
**Agent:** unified-field-theory (Sonnet 4.6)

---

## Cluster Table

| # | Abstract Function | Duplicate Files | Gap / Risk | Proposed Canonical |
|---|---|---|---|---|
| 1 | **Form handler state machine** — `useState('idle'\|'loading'\|'success'\|'error')`, `handleChange`, `handleSubmit`, Turnstile token, fetch POST, success reset | `components/contact-form.tsx`, `components/commission-form.tsx` | Near-identical code (~90 lines each). Newsletter is structurally the same but inline. Any change to the loading/error pattern must hit 3 files. | `lib/useFormSubmit(endpoint, onSuccess)` hook |
| 2 | **Inline HTML email envelope** — `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">` template string with `color:#556B2F` brand header | `app/api/contact/route.ts`, `app/api/commission/route.ts`, `app/api/owner-digest/route.ts` | These three routes build their own email HTML from scratch. `lib/email-templates.ts` already has `emailLayout()` + `BRAND` constants — the form routes just don't use it. **Also: `contact` and `commission` interpolate `${name}`, `${email}`, `${message}` without `escapeHtml()` — XSS gap.** | Adopt `emailLayout()` from `lib/email-templates.ts`; gate user values through `escapeHtml()` before interpolation |
| 3 | **Webhook auth + JSON parse boilerplate** — env check → `safeEqual(header, secret)` → `401`, `request.json()` try/catch → `400 Invalid JSON` | `app/api/reminder/route.ts`, `app/api/review-request/route.ts`, `app/api/fareharbor-webhook/route.ts`, `app/api/owner-digest/route.ts` | Same 10-line prologue in 4 routes. Diverges slightly (bearer vs header), so bugs in one copy don't propagate. | `lib/webhookAuth(request, secretEnvKey): NextResponse | null` helper + `parseJsonBody(request)` utility |
| 4 | **Hook file duplication** — `useIsMobile` (20 lines, byte-for-byte identical) and `useToast` (192 lines, byte-for-byte identical) | `hooks/use-mobile.tsx` + `components/ui/use-mobile.tsx`, `hooks/use-toast.ts` + `components/ui/use-toast.ts` | shadcn/ui scaffolded copies into `components/ui/`; project also has a `hooks/` directory with the same files. Two live module paths — whichever is imported wins but state is shared via module-level `memoryState`, so the toast reducer state is actually shared. Risk: a future edit to one won't reach the other. | Delete `hooks/use-mobile.tsx` and `hooks/use-toast.ts`; all imports point to `components/ui/` |
| 5 | **FareHarbor API fetch headers** — `{ 'X-FareHarbor-API-App': appKey, 'X-FareHarbor-API-User': userKey }` wrapped in `fetchWithTimeout` | `app/api/availability/route.ts` (×2 calls), `app/api/owner-digest/route.ts` (×1 call) | Header object repeated inline. If FareHarbor adds HMAC signing the change must hit both routes. | `lib/fareharbor.ts` thin client: `fareharborFetch(path, timeout?)` |
| 6 | **Email regex validation** — `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` | `app/api/reminder/route.ts:39`, `app/api/review-request/route.ts:36`, `app/api/fareharbor-webhook/route.ts:112` | Same regex, three definitions. | `lib/validate-email.ts` or extend `lib/validate-env.ts` |

---

## Security Flag

**Critical:** `app/api/contact/route.ts` and `app/api/commission/route.ts` interpolate raw user input (`name`, `email`, `message`, `description`) directly into HTML strings sent via `sendEmail()`. `escapeHtml()` exists in `lib/html.ts` and is used by the webhook/reminder/review routes, but not by these two form routes. XSS payload would be delivered into the owner's inbox.

---

## Coverage Check — `fetchWithTimeout`

Used: `app/api/availability/route.ts`, `app/api/owner-digest/route.ts`, `app/api/google-reviews/route.ts`, `lib/turnstile.ts`.  
Not used: no remaining direct `fetch()` calls to external hosts were found in other routes.

## Coverage Check — `safeEqual`

Used: `app/api/reminder/route.ts`, `app/api/review-request/route.ts`, `app/api/fareharbor-webhook/route.ts`, `app/api/owner-digest/route.ts`.  
Not used: `app/api/analytics/data/route.ts` — not audited (out of scope for this scan).

---

## Summary Stats

| Metric | Value |
|---|---|
| API routes scanned | 9 |
| Form components scanned | 3 |
| Lib modules scanned | 7 |
| Duplicate clusters found | 6 |
| Security gaps found | 1 (XSS in contact + commission HTML) |
| Hook exact-copy pairs | 2 |
