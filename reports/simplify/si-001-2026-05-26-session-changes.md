# Simplify Review — Session Changes
**Date:** 2026-05-26  
**Scope:** `git diff HEAD` — all files modified this session  
**Focus files:** `app/api/contact/route.ts`, `app/api/commission/route.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/api/availability/route.ts`, `lib/` additions

---

## Findings

### 1. [HIGH] Auth credential comparison not timing-safe
**File:** `app/api/auth/[...nextauth]/route.ts:23-26`  
**Before:**
```ts
credentials?.username === adminUsername &&
credentials?.password === adminPassword
```
**After (applied):**
```ts
safeEqual(credentials?.username, adminUsername) &&
safeEqual(credentials?.password, adminPassword)
```
`safeEqual()` already existed in `lib/secrets.ts` and is used correctly everywhere else in the codebase (webhook, reminder, review-request, owner-digest). This session added the fail-closed env check but missed upgrading the comparison to use the existing timing-safe helper. Timing attacks on admin login are real — fixed.

---

### 2. [MED] IP extraction inlined 3× — existing rate-limit module is the right home
**Files:** `app/api/contact/route.ts:18-21`, `app/api/commission/route.ts:18-21`, `app/api/newsletter/route.ts:16-19`  
**Before (each file):**
```ts
const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
```
**After (applied):** Extracted to `lib/rate-limit.ts` as `getClientIp(request)`. All three callers updated to import and use it. The extraction lives in `rate-limit.ts` because IP extraction and rate limiting always travel together; co-location avoids a future caller forgetting the Cloudflare header precedence.

---

### 3. [LOW] Dead `sum()` function added to `lib/utils.ts`
**File:** `lib/utils.ts:8-10`  
**Before:**
```ts
export function sum(a: number, b: number): number {
  return a + b
}
```
**After (applied):** Deleted. No callers anywhere in `app/`, `components/`, or `lib/`. This session introduced it with no usage. `lib/utils.ts` is the project's shared utility module; dead exports here pollute the public surface.

---

## Quality Notes (no action needed)

- `app/api/contact/route.ts:65` — `// sendEmail will throw on error; if we reach here it succeeded` — marginal comment explaining what `catch` already makes obvious. Left in place; borderline but not worth a churn commit.
- `app/api/commission/route.ts:64` — `// success if we get here` — same pattern. Leave.
- `app/api/availability/route.ts:113-115` — ISR comment is a good "why" comment (explains the rationale for 1800 vs 7200). Keep.
- `app/api/auth/[...nextauth]/route.ts:16-17` — "Fail-closed: Tier 1 env (per CLAUDE.md)" — this is a valid "why" comment citing a non-obvious constraint. Keep.

## Efficiency Notes (no action needed)

- `app/api/availability/route.ts:61` — `Promise.allSettled()` fan-out with `.slice(0, 3)` cap is correct. No change.
- `app/api/availability/route.ts:92-94` — dedup via `Map` keyed on date is O(n); fine at current scale (≤24 dates).
- `lib/rate-limit.ts` in-memory store: already documented as acceptable until Redis/Vercel KV needed (ADR 001).

---

## Files Changed by This Review

| File | Change |
|---|---|
| `lib/utils.ts` | Removed dead `sum()` export |
| `lib/rate-limit.ts` | Added `getClientIp()` helper |
| `app/api/contact/route.ts` | Import + use `getClientIp` |
| `app/api/commission/route.ts` | Import + use `getClientIp` |
| `app/api/newsletter/route.ts` | Import + use `getClientIp` |
| `app/api/auth/[...nextauth]/route.ts` | Import `safeEqual`; use for credential comparison |

**reports/simplify/ file count:** 0 → 1
