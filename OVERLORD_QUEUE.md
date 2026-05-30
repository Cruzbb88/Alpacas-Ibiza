# Overlord Queue
_AI-side continuation file. Next autonomous turn reads this and continues. Cruz does NOT need to read this._

## Latest cycle
_Updated after every cycle._

| Cycle | Commit | Files | Skill / agents fired | Status |
|---|---|---|---|---|
| 1 | `081ce76` | audit-batch fixes | 6 parallel Sonnets — real-user breakage, dead crons, XSS gate, referral loss | shipped |
| 2 | `e1897b7` | i18n sentinel-strip, canonical email/IG/FB, a11y (sticky-bar, newsletter, cookie), SEO meta | 6 parallel Sonnets | shipped |
| 3 | `492c719` | FareHarbor itemIds, Mollie return state, font swap, email escaping, admin/error/404, POST security, CSP, currency, loading.tsx, PWA, form GDPR, sentinel cleanup | 9 parallel Sonnets + code-review survivor batch | shipped |
| 4 | _(this turn)_ | `OVERLORD_QUEUE.md` scaffold | 1 Sonnet | complete |

## What the system has converged on (stable)

- i18n sentinel-strip — no raw sentinel keys in rendered output
- FareHarbor itemIds — wired to correct alpaca inventory IDs
- Canonical email / Instagram / Facebook — single source of truth in config
- Empty-page noindex — pages with no content excluded from crawl index
- Mollie return state — payment return URL validates and handles all states
- Font swap — font-display:swap applied, no FOIT
- Sticky-bar a11y — keyboard nav + ARIA roles correct
- Newsletter a11y — form labelling, focus management
- Cookie banner a11y — focus trap, ARIA live region
- SEO meta — title/description/OG per-page, no duplicates
- Email template escaping — XSS-safe Handlebars/JSX output
- Admin pages — auth-gated, no public exposure
- Error / 404 pages — branded, no stack traces, correct HTTP status
- POST security — CSRF token + rate limiting on mutation endpoints
- CSP origins — Content-Security-Policy headers locked to known origins
- Currency formatting — locale-aware, no raw number concatenation
- loading.tsx siblings — Suspense boundaries aligned with route segments
- PWA manifest — icons, theme-color, display mode correct
- Form draft GDPR strip — draft data not persisted beyond session
- Sentinel cleanup — no orphan translation keys left in repo

## What the system has NOT yet attacked

1. E2E test coverage — Playwright adopt + booking flow
2. Bundle size analysis — identify and trim top-5 heaviest imports
3. Real-world load testing — mock 100 req/s against checkout-intent endpoint
4. GDPR data-export request flow end-to-end — subject access request → CSV download
5. Database migration scaffold — in-memory / JSON stores → Postgres or Vercel KV
6. i18n parity — EN keys with no DE/IT/ES/NL/FR counterpart (add when owner copy supplied)
7. Admin user management — hardcoded single admin → multi-user with roles
8. Webhook delivery monitoring — dead-letter queue + retry dashboard
9. Sitemap.xml accuracy — rebuild after noindex delistings in cycle 3
10. Per-page Lighthouse runs — automated CI gate, score deltas vs baseline

## Next-cycle plan (autonomous)

### Item 1 — E2E test coverage
- **Goal:** Playwright test adopt flow (select alpaca → fill form → Mollie redirect mock) + booking flow (FareHarbor embed loads + date picker reachable).
- **Files / surface:** `tests/e2e/` (create), `playwright.config.ts` (create or extend), `app/adopt/`, `app/booking/`.
- **Agent prompt skeleton:**
  ```
  You are a Playwright test author. Repo: alpaca-farm-redesign.
  Task: write tests/e2e/adopt.spec.ts covering:
  1. Landing → select alpaca → proceed to checkout form
  2. Form validation (required fields)
  3. Mollie redirect triggered (mock fetch, assert redirect URL matches pattern)
  Task: write tests/e2e/booking.spec.ts covering:
  1. Booking page loads, FareHarbor iframe present
  2. Date picker reachable via keyboard
  Run: pnpm exec playwright test --reporter=dot
  Verify: exit 0, no test failures.
  Done-when: both spec files present, all assertions pass, tsc --noEmit clean.
  ```
- **Verification:** `pnpm tsc --noEmit` + `pnpm exec playwright test --reporter=dot` exit 0.
- **Done-when:** `tests/e2e/adopt.spec.ts` + `tests/e2e/booking.spec.ts` exist, all pass.

### Item 2 — Bundle size analysis
- **Goal:** Identify top-5 heaviest imports; eliminate or lazy-load; target <200 kB First Load JS per route.
- **Files / surface:** `next.config.*`, `app/` route tree, `package.json`.
- **Agent prompt skeleton:**
  ```
  You are a Next.js bundle analyst. Repo: alpaca-farm-redesign.
  Task:
  1. Run `pnpm build` and capture `.next/analyze/` (enable ANALYZE=true).
  2. Identify routes with First Load JS > 200 kB.
  3. For each offending route: find the import, apply dynamic() or move to edge runtime.
  4. Re-run build, confirm sizes drop.
  Verify: pnpm tsc --noEmit clean. No route above 200 kB First Load JS.
  Done-when: all routes ≤200 kB First Load JS in build output.
  ```
- **Verification:** `pnpm build` output, grep `First Load JS` for values > 200 kB.
- **Done-when:** Zero routes above 200 kB First Load JS.

### Item 3 — GDPR data-export flow
- **Goal:** Subject access request (SAR) form → queues export job → generates CSV of donor's personal data → emails download link.
- **Files / surface:** `app/api/gdpr/`, `lib/gdpr.ts` (create), email templates, admin SAR queue view.
- **Agent prompt skeleton:**
  ```
  You are a GDPR compliance engineer. Repo: alpaca-farm-redesign.
  Task:
  1. Create POST /api/gdpr/export — accepts email, validates, enqueues job (in-memory or Vercel KV queue).
  2. Create lib/gdpr.ts: collectDonorData(email) aggregates: adoption records, newsletter consent, gift records.
  3. Create GET /api/gdpr/export/[token] — streams CSV of collected data, expires token after download.
  4. Send email via Resend with download link on job completion.
  5. Add admin /admin/gdpr page: lists pending SARs, status, timestamp.
  Verify: pnpm tsc --noEmit. Unit test: collectDonorData returns correct shape for seed data.
  Done-when: POST → email delivered → CSV downloadable → admin sees entry.
  ```
- **Verification:** `pnpm tsc --noEmit` clean + manual curl POST → assert 200 + email queued.
- **Done-when:** Full round-trip functional, no tsc errors.

### Item 4 — Sitemap.xml accuracy
- **Goal:** Rebuild sitemap excluding noindexed routes; verify all canonical URLs resolve 200.
- **Files / surface:** `app/sitemap.ts` or `public/sitemap.xml`, noindex list from cycle 3.
- **Agent prompt skeleton:**
  ```
  You are an SEO engineer. Repo: alpaca-farm-redesign.
  Task:
  1. Read app/sitemap.ts (or locate sitemap generation).
  2. Cross-reference with noindex list (grep for noindex in app/ metadata exports).
  3. Remove noindexed routes from sitemap output.
  4. Add any missing canonical routes (adopt, gift, booking, news, admin excluded).
  5. Validate: every URL in sitemap returns 200 (use curl in CI or script).
  Verify: pnpm tsc --noEmit. Grep sitemap output for noindexed slugs — must be zero.
  Done-when: sitemap contains only indexable routes, all return 200.
  ```
- **Verification:** `pnpm tsc --noEmit` + grep sitemap for excluded slugs returns 0 matches.
- **Done-when:** Sitemap file updated, zero noindexed URLs present.

## Operating contract

- No menu at end of turn
- No "which do you want next" questions
- Cruz reads NOTHING — read `FORWARD_PLAN.md` for the human queue, this file for the AI queue
- Fire 6-10 Sonnets per cycle in parallel
- Commit per cycle
- Verify `pnpm tsc --noEmit` before commit
- Rule 5: never invent owner data
- Never push to git
- Never `-i` flag, never `--no-verify`

## Cycle log

| Cycle | Date | Commit | Outcome summary |
|---|---|---|---|
| 1 | 2026-05-30 | `081ce76` | Real-user breakage fixed: dead crons removed, XSS gate added, referral loss patched |
| 2 | 2026-05-30 | `e1897b7` | i18n sentinel-strip, canonical contact info, full a11y pass (sticky-bar/newsletter/cookie), SEO meta |
| 3 | 2026-05-30 | `492c719` | FareHarbor wired, Mollie states, font swap, email escaping, admin/404/error, POST security, CSP, currency, PWA, GDPR form draft, sentinel cleanup |
| 4 | 2026-05-30 | _(no commit — scaffold only)_ | OVERLORD_QUEUE.md written; next cycle primed |
