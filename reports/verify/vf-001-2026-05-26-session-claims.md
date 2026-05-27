# VF-001 — Session Claims Verification
**Date:** 2026-05-26  
**Verifier:** Claude Code (Sonnet 4.6)  
**Scope:** commit `cdbc550` — "refactor: address peer-review findings — XSS, timing attacks, dedup, a11y"  
**Pre-count `reports/verify/`:** 0 files  
**Post-count `reports/verify/`:** 1 file (this one)

---

## Verdict Table

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | XSS escape on contact + commission routes | **VERIFIED** | `escapeHtml()` imported and called before interpolation in both routes; `lib/html.ts` covers `&`, `<`, `>`, `"`, `'`, `/` via ENT map |
| 2 | Admin auth fail-closed | **VERIFIED** | No `\|\| 'admin'` / `\|\| 'password'` fallback; returns `null` when env unset; `maxAge: 8 * 60 * 60` (28800) |
| 3 | `emailLayout()` adoption — no inline `font-family:sans-serif;max-width:600px` in `app/api/` | **VERIFIED** | `grep` over `app/api/` returned 0 matches |
| 4 | `/api/availability` cache = `revalidate = 1800` | **VERIFIED** | Last line of `availability/route.ts`: `export const revalidate = 1800` |
| 5 | `useFormSubmit` hook exists + consumed by both forms | **VERIFIED** | `lib/useFormSubmit.ts` exists; both `contact-form.tsx` (line 6) and `commission-form.tsx` (line 6) import it |
| 6 | `next build` passes, exit 0, no image-optimization errors | **VERIFIED** | `✓ Compiled successfully in 4.3s`, `✓ Generating static pages (131/131)`, zero image warnings in output |

**Aggregate: 6/6 VERIFIED**

---

## Evidence Detail

### Claim 1 — XSS escape
`lib/html.ts` ENT map:
```
'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;'
```
`app/api/contact/route.ts` — escape happens before template interpolation:
```ts
const safeName = escapeHtml(name)
...
html: emailLayout(`...${safeName}...`)
```
Same pattern confirmed in `app/api/commission/route.ts`.

### Claim 2 — Admin auth fail-closed
`app/api/auth/[...nextauth]/route.ts`:
```ts
if (!adminUsername || !adminPassword) {
  console.error('[auth] ADMIN_USERNAME or ADMIN_PASSWORD unset — admin login disabled')
  return null
}
```
No fallback defaults found. `session.maxAge = 8 * 60 * 60` (28800 seconds).

### Claim 3 — emailLayout() adoption
`grep -r "font-family:sans-serif;max-width:600px" app/api/` → **No matches found**

### Claim 4 — Availability cache
`app/api/availability/route.ts` final export:
```ts
// 30-min ISR — tour slots can sell out fast; 2h cache risks showing sold-out dates
export const revalidate = 1800
```

### Claim 5 — useFormSubmit hook
`lib/useFormSubmit.ts` — file exists.  
`components/contact-form.tsx:6` — `import { useFormSubmit } from '@/lib/useFormSubmit'`  
`components/commission-form.tsx:6` — `import { useFormSubmit } from '@/lib/useFormSubmit'`

### Claim 6 — next build
```
✓ Compiled successfully in 4.3s
✓ Generating static pages using 19 workers (131/131) in 1662.9ms
```
Zero image-optimization errors. One runtime-only log (`FareHarbor API Error: Forbidden`) from static generation hitting live API without credentials — expected in dev/CI; not a build error.

---

## Findings
- The FareHarbor `Forbidden` log during `next build` appears because static-page generation calls the live API without credentials set in the build env. This is noise in CI but could confuse someone reading raw build output. Worth a comment in `availability/route.ts` or a build-time guard.
- No `|| 'admin'` fallback found anywhere in the auth tree — pass is clean.
- `session.maxAge` comment says "8h" — matches the `8 * 60 * 60` value; no drift.
