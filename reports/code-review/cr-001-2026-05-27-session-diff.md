# Code Review cr-001 — Session diff 3d7dcf6..HEAD
**Date:** 2026-05-27  
**Reviewer:** Claude Code (automated, static analysis)  
**Scope:** 15 commits — security, components, i18n, perf, tests, tenant scaffold

---

## Verdict: REQUEST CHANGES

2 High-severity issues that need a fix before merge. The rest are Medium/Low and are call-outs for the next session.

---

## Per-area findings

### CRITICAL / HIGH

#### Finding 1 — HIGH: `x-tenant-slug` header trusted from request; middleware never strips it
- **File:** `lib/tenant.ts:30-34`
- **Severity:** High (tenant spoofing)
- **Issue:** `getTenant()` reads `x-tenant-slug` from the incoming request headers and uses it as the authoritative tenant resolver (Path 1, before host lookup). The middleware (`middleware.ts`) does **not** strip or block this header from external requests — it only handles locale redirects and immediately returns `NextResponse.next()` for all `/api/` paths. Any external caller can send `x-tenant-slug: example-vineyard` to any route and receive a different tenant's config (branding, contact email, booking URLs, FareHarbor shortname).
- **Fix:** Either (a) strip `x-tenant-slug` from incoming requests in middleware and re-set it from the registry (so only trusted server infrastructure can influence it), or (b) remove Path 1 entirely until middleware enforcement is in place — the comment already says "set by middleware for future multi-tenant routing."

#### Finding 2 — HIGH: Duplicate `getTenant` implementations with divergent resolution logic
- **File:** `lib/tenant.ts:26-44` vs `lib/tenants/server.ts:29-42`
- **Severity:** High (silent behaviour split)
- **Issue:** Two exported `getTenant()` functions exist with different resolution logic. `lib/tenant.ts` resolves by slug header first, then host, then fallback. `lib/tenants/server.ts` resolves by host only, then fallback (no slug header path, no `lookupBySlug`). The layout (`app/[locale]/layout.tsx`) imports from `lib/tenant`; all other pages import from `lib/tenants/server`. This means the root layout and every page use different resolution paths — the layout could return a tenant via slug spoofing (per Finding 1) while pages always do host-based lookup. The split is not documented anywhere as intentional.
- **Fix:** Delete one implementation. If slug-header routing is intentional for future use, consolidate into `lib/tenants/server.ts` and update the single consumer in `layout.tsx`. Add a comment explaining why the layout uses the other module.

---

### MEDIUM

#### Finding 3 — MEDIUM: `BookingSection` reads `data.message` on error but availability route emits `data.error`
- **File:** `components/booking/section.tsx:29-30`
- **Severity:** Medium (silent UX failure)
- **Issue:** Error branch checks `if (data.error)` then sets UI state to `data.message`. The `/api/availability` route returns `{ error: '...', message: '...' }` in some paths (credentials missing, API error) and `{ error: '...' }` with no `message` field in other branches. When `message` is absent `setError(undefined)` is called — the component renders with `error = undefined`, which is falsy, so the error UI state never shows. The date grid stays hidden (because `loading=false, error=falsy, dates=[]`) and the fallback CTA renders silently — not broken visually, but the operator sees no diagnostics.
- **Fix:** Use `setError(data.error || data.message || 'Unknown error')` or normalize the API shape to always return either `error` or `message` (not both).

#### Finding 4 — MEDIUM: `lookupBySlug` is O(n) over `_byHost` values, not tenants
- **File:** `lib/tenants/registry.ts:56-60`
- **Severity:** Medium (correctness edge case)
- **Issue:** `lookupBySlug` iterates `_byHost.values()` — which holds one entry **per hostname**, not per tenant. A tenant registered with 3 hostnames appears 3 times. If the same tenant object is registered under multiple hosts it will still return the right object (same reference), but the loop terminates on the **first** matching slug, which may be the second or third entry rather than the canonical first — harmless today (single tenant), but produces non-deterministic iteration order as tenants are added. More importantly, if a bug in `registerTenant` ever stored a mutated copy per host, `lookupBySlug` would silently return whichever copy it hits first.
- **Fix:** Maintain a separate `_bySlug: Map<string, Tenant>` in the registry and populate it in `registerTenant`. Reduces O(n×hosts) to O(1) and removes iteration-order dependence.

#### Finding 5 — MEDIUM: `registry.ts` uses `.ts` file extensions in imports under `bundler` resolution
- **File:** `lib/tenants/registry.ts:12-14`
- **Severity:** Medium (build/test split)
- **Issue:** `import type { Tenant } from './_types.ts'`, `import { alpacasibiza } from './alpacasibiza.ts'`, `import { validateTenant } from './validate.ts'` all include the `.ts` extension. With `moduleResolution: "bundler"` in tsconfig, Next.js/webpack strips extensions, so these compile. However, the Vitest test runner (which uses `moduleResolution: node` by default unless overridden) will reject bare `.ts` extensions. The `lib/tenants/registry.test.ts` file already imports `from './registry.ts'` so tests may or may not run correctly depending on the Vitest config. Every other file in the codebase omits extensions on relative imports.
- **Fix:** Remove `.ts` extensions from `registry.ts` imports to match the project convention and avoid test-runner fragility.

---

### LOW

#### Finding 6 — LOW: `isExpiredNewsletterToken` will return `false` for an expired unsubscribe token (scope mismatch silent)
- **File:** `lib/newsletter-token.ts` (shared `isExpiredToken`)
- **Severity:** Low (wrong HTTP status code served to user)
- **Issue:** `isExpiredToken` does not check `payload.scope`. A confirm-scoped token that is expired AND passed to `isExpiredNewsletterToken` will correctly return `true`. But a **valid-signature unsubscribe-scoped token passed to `isExpiredNewsletterToken`** returns `true` even though the token is a wrong-scope token, not an expired one. In practice this path is not reachable today (routes use matching pairs), but the abstraction is fragile — an accidental wrong-scope + expired combination would show "Link Expired" instead of "Invalid Link."
- **Note:** Low because no current caller reaches the cross-scope path.

---

## Praise — 3 things that must NOT regress

1. **Timing-safe comparison is used everywhere a secret is compared.** Every webhook secret, admin password check, and newsletter token signature comparison goes through `safeEqual()`. This is consistent and correct.

2. **Payment webhook idempotency is process-level but explicitly acknowledged.** The `isAlreadyProcessed()` guard in `lib/webhook-idempotency.ts` correctly uses `globalThis` to survive HMR, documents the cold-start limitation with the ADR upgrade path, and applies to both Stripe and Mollie webhooks. The failure mode is documented, not hidden.

3. **Double-escaping is intentional and documented in tests.** The `escapeHtml` test suite explicitly tests the double-escaping contract ("call once only") and the `escapeHtml(null/undefined)` → `''` path. This prevents a class of XSS bugs from creeping back in through refactors.

---

## Off-the-happy-path concerns

- **Cold-start rate-limit reset:** The in-memory rate limiter is process-scoped. On Vercel edge cold starts (which happen on every new instance), the rate-limit store is empty. A bot that rotates IPs across Vercel regions can hit the newsletter route 5× per IP per region simultaneously and never trigger the limit. The per-email limit (hashed key) partially compensates but only if the bot uses real email addresses.

- **`buildLocaleAlternates` silently produces wrong canonical if `SITE_BASE_URL` has a path prefix.** `lib/config.ts` strips trailing slashes but does not strip path segments. If `NEXT_PUBLIC_SITE_URL=https://preview.vercel.app/alpacas`, the canonical becomes `https://preview.vercel.app/alpacas/en/tours` which is correct, but the `base.replace(/\/$/, '')` only removes one trailing slash — a URL like `https://example.com//` (double slash from env typo) would produce doubled slashes in all hreflang URLs.

- **`formatDate` in BookingSection uses `new Date(dateStr)` on a UTC ISO string without timezone offset.** Safari parses `2026-06-01` as UTC midnight, then `toLocaleDateString` applies the local timezone — in UTC+2 (Ibiza summer time) this renders correctly, but a user whose clock is significantly behind UTC (UTC-12) would see the date as the previous day. Low risk but worth noting for a booking-focused UI.
