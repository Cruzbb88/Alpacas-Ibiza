# Resonance Finder — Parameter Inventory
**Report:** rf-001  
**Date:** 2026-05-26  
**Project:** Alpacas Ibiza (`alpaca-farm-redesign`)  
**Scope:** L1 (Inventory) + L2 (Sensitivity Ranking)

---

## Parameter Table

| Parameter | File:Line | Current Value | Sensitivity | Recommended Range | Reasoning |
|---|---|---|---|---|---|
| `fetchWithTimeout` default `ms` | `lib/fetch.ts:6` | `5000` ms | **HIGH** | `3000–8000` ms | Default used by every external call that doesn't pass an explicit value. Too low → spurious Turnstile/FareHarbor aborts under slow networks; too high → user-facing 500s hang for 8s. Currently the items-fetch in availability falls through to this default. |
| Turnstile verify timeout | `lib/turnstile.ts:43` | `5000` ms (explicit) | **HIGH** | `3000–6000` ms | Cloudflare's own SLA is <500 ms; 5s is a safe ceiling but 3s already covers 99th-pct. Fail mode in prod is **fail-closed** (blocks form submission), so a too-tight value creates false positives. |
| Turnstile fail-open in prod (network error) | `lib/turnstile.ts:51–54` | Fail-closed in prod, fail-open in dev | **HIGH** | Keep fail-closed in prod | Logic is correct but the asymmetry is invisible — no env-var to flip it. If site temporarily can't reach Cloudflare, all contact/commission forms return 400. Consider adding `TURNSTILE_FAIL_OPEN_ON_ERROR=1` escape hatch. |
| Availability ISR revalidate | `app/api/availability/route.ts:114` | `7200` s (2h) | **HIGH** | `1800–3600` s | FareHarbor docs say cache daily totals, but availability *slots* can fill in minutes for popular dates. 2h window means sold-out dates still appear open on the page. 30–60 min is the practical minimum without hammering the API. |
| Availability max items fan-out | `app/api/availability/route.ts:62` | `slice(0, 3)` | **HIGH** | `3–5` | Hard cap limits data for operators with >3 tour types. Adding a 4th type silently gets no data. Should be driven by `FAREHARBOR_MAX_ITEMS` env var; default 3 is acceptable for current scale. |
| Availability date window | `app/api/availability/route.ts:25` | `+30 days` | **MED** | `21–60 days` | Tourists booking Ibiza trips typically look 4–8 weeks out. 30 days is on the low side for summer advance bookings; 45 days captures more without significant API cost. |
| Availability max dates returned | `app/api/availability/route.ts:97` | `slice(0, 8)` | **MED** | `6–12` | 8 upcoming dates drives the UI date-picker. Too few → users can't see next available slot; too many → UI overflows on mobile. Closely coupled to the `booking-section.tsx:65` `slice(0,8)` mirror — both must change together. |
| Google Reviews ISR revalidate | `app/api/google-reviews/route.ts:89` | `21600` s (6h) | **LOW** | `3600–86400` s | Reviews change rarely; 6h is reasonable. CDN s-maxage=86400 in the response header is already set independently, creating a cache inconsistency (ISR may refresh before CDN TTL expires). Align or document. |
| Google Reviews browser cache (`max-age`) | `app/api/google-reviews/route.ts:74` | `21600` s (6h) | **LOW** | `3600–21600` s | Browser will use stale reviews for 6h even if ISR regenerates. Acceptable for social proof widget. |
| Google Reviews `topReviews` limit | `app/api/google-reviews/route.ts:61` | `slice(0, 3)` | **LOW** | `3–5` | Social proof; 3 reviews is industry standard. Non-critical. |
| Webhook reminder lead time | `app/api/fareharbor-webhook/route.ts:29` | `REMINDER_LEAD_MS = 48h` | **MED** | `24–72h` | 48h pre-tour is a good default but should be configurable via env (`REMINDER_LEAD_HOURS`). Some operators prefer 24h to reduce no-shows; wedding/corporate tours may want 72h. Hardcoded constant. |
| Webhook review request lag | `app/api/fareharbor-webhook/route.ts:30` | `REVIEW_LAG_MS = 24h` | **MED** | `4–48h` | 24h post-tour is sensible but 4–6h captures the emotional peak sooner. Hardcoded. Env-var escape hatch would help. |
| Owner digest booking rows cap | `app/api/owner-digest/route.ts:95` | `slice(0, 50)` | **LOW** | `20–100` | Email digest; 50 rows is fine. Only matters if operator runs >50 bookings/week (unlikely at current scale). |
| Owner digest fetch timeout | `app/api/owner-digest/route.ts:71` | `8000` ms | **MED** | `6000–10000` ms | Cron job, no user waiting, so higher timeout is acceptable. 8s is reasonable for a paginated bookings endpoint. Slightly inconsistent with the 5s default — fine by intent. |
| NextAuth session strategy | `app/api/auth/[...nextauth]/route.ts:31` | `'jwt'` (no maxAge set) | **HIGH** | Set `maxAge: 28800` (8h) | No explicit `maxAge` means NextAuth defaults to 30 days for JWT sessions. Admin session persists a month. For a single-admin site this is a low-exploitation risk, but setting 8h matches a workday and limits exposure if a device is left unattended. |
| NextAuth admin password fallback | `app/api/auth/[...nextauth]/route.ts:15` | `|| 'password'` | **HIGH** | Remove fallback entirely | If `ADMIN_PASSWORD` env var is unset, the hardcoded fallback `'password'` is in effect in production. Should `throw` or `return null` when env var is absent rather than silently using a trivially guessable credential. |
| Newsletter fetch (no timeout) | `lib/newsletter.ts:30` | No timeout (bare `node-fetch`) | **MED** | Wrap with 5000 ms timeout | `subscribe()` uses raw `node-fetch` without `AbortController`. SendGrid contact-upsert endpoint can take 2–3s; if it hangs, the newsletter API route will hang with it. Should use `fetchWithTimeout`. |
| TOAST_REMOVE_DELAY | `hooks/use-toast.ts:9` | `1000000` ms (~16 min) | **LOW** | `5000–10000` ms | Toast notifications persist for 16 minutes unless manually dismissed. This is the Radix/shadcn default, clearly intentional (auto-dismiss left to the consumer), but it means error toasts stack indefinitely if the user doesn't interact. |
| TOAST_LIMIT | `hooks/use-toast.ts:8` | `1` | **LOW** | `1–3` | Only one toast visible at a time. Fine for this site's use case (single form actions). |
| `images.unoptimized` | `next.config.mjs:7` | `true` | **MED** | `false` (use Next.js image optimization) | Disables all Next.js image optimization (WebP conversion, responsive sizes, lazy loading). Likely set to avoid build complexity, but results in larger image payloads. On a tourism site with many hero images this materially affects LCP. |
| `typescript.ignoreBuildErrors` | `next.config.mjs:4` | `true` | **MED** | `false` | Type errors are silently ignored at build time. A misconfigured env-driven type (e.g. wrong `scheduledAt` format) will ship to production without warning. |
| Availability lookback (none — forward only) | `app/api/availability/route.ts:22` | `today + 30d` | **LOW** | — | Route correctly returns only future dates. No issue. |
| Middleware locale cookie TTL | `middleware.ts:65` | No `maxAge` on cookie | **LOW** | `maxAge: 31536000` (1 year) | `NEXT_LOCALE` cookie is set without an explicit expiry, making it a session cookie. Browser restart clears it and re-triggers Accept-Language detection. Setting a 1-year maxAge would persist the user's language preference. |

---

## Summary Stats

- **HIGH sensitivity:** 5 parameters  
- **MED sensitivity:** 7 parameters  
- **LOW sensitivity:** 9 parameters  

---

## Top 5 High-Sensitivity Knobs

| Rank | Parameter | Current | Recommended |
|---|---|---|---|
| 1 | `ADMIN_PASSWORD` fallback | `'password'` hardcoded if env unset | Remove fallback; `return null` when env absent |
| 2 | NextAuth JWT `maxAge` | Not set (defaults to 30 days) | `maxAge: 28800` (8h) |
| 3 | Availability ISR `revalidate` | `7200` s (2h) | `1800` s (30 min) |
| 4 | Turnstile fail-open escape hatch | No env override; hard fail-closed on network error | Add `TURNSTILE_FAIL_OPEN_ON_ERROR=1` env-var escape |
| 5 | `fetchWithTimeout` default `ms` | `5000` ms (no explicit value on items-list call) | Pass `8000` explicitly on FH items-list; keep `5000` for Turnstile |
