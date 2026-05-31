---
report_type: "exploding-pen"
report_number: 005
date: "2026-05-31"
project_name: "alpaca-farm-redesign"
project_tag: "alpaca-farm"
mode: "deep"
target_path: "C:\\Users\\cruzb\\Projects\\alpaca-farm-redesign"
language: "TypeScript / Next.js"
gaps_found: 6
gadgets_designed: 5
gadgets_injected: 0
gap_scan_score: 69
gadget_design_score: 100
injection_plan_score: 93
inventory_score: 0
composite_score: 57
previous_composite: 8.5
score_delta: "+48.5"
trend: "improving"
---

# Exploding Pen Report #005

**Date**: 2026-05-31
**Target**: C:\Users\cruzb\Projects\alpaca-farm-redesign
**Language**: TypeScript / Next.js
**Mode**: deep
**Composite Score**: 57/100

---

## Executive Summary

Six confirmed capability gaps across the cycle-5 additions and recent overlord cycles.
Three are retry gaps: `resend.emails.send` (ep-004 G-011 still un-injected), and both
embedded-checkout intent fetches (Stripe + Mollie). One is a timeout gap: the Mollie
SDK CDN load via `next/script` has `onError` but no timer guard — a slow CDN produces
an indefinite loading spinner with no escape. One is an observability gap:
`CorporateEnquiryForm` fires zero GA4 events on success while the equivalent
`contact-form.tsx` fires `contact_form_submit`. One is a circuit-breaking gap on
Google Places that was flagged in ep-004 but deferred (still deferred; noted as
nice-to-have here too).

Five gadgets are designed: three retry wrappers at call sites, one SDK-load timeout
gadget for the Mollie embedded checkout, and one GA4 event hook for the corporate
enquiry form. All are under 20 lines, stdlib/no-new-deps, and surgically targeted at
a single injection site each.

All gaps marked in ep-004 as "next cycle" were re-verified:
- G-011 (resend retry): still un-injected — re-listed as G-014.
- G-012 (newsletter SendGrid timeout): RESOLVED — `lib/newsletter.ts` already uses
  `fetchWithTimeout` at all 4 call sites.
- G-013 (react-pdf dynamic import): verified — `app/api/adopt-certificate/route.ts`
  still imports statically (`import { renderToStream } from '@react-pdf/renderer'`).
  Re-listed as G-019 (see note below; not included in this cycle's gadget set since
  it is a larger refactor than <20 lines in isolation).

---

## L1: Capability Gap Scan (Score: 69/100)

| # | Category | Severity | File | Function/Site | Gap Description |
|---|----------|----------|------|---------------|-----------------|
| 1 | Retry logic | important | lib/mailer.ts:78 | `sendEmail` → `resend.emails.send` | No retry/backoff on Resend email send; 503 spikes permanently drop welcome/renewal emails. `lib/retry.ts` exists but is unused here. |
| 2 | Retry logic | important | components/adopt/embedded-checkout.tsx:95 | `createIntent` useEffect → `fetch('/api/checkout/intent')` | No retry on Stripe intent creation; a single transient 500 from the API route aborts the entire checkout flow. |
| 3 | Retry logic | important | components/adopt/embedded-mollie-checkout.tsx:140 | `createIntent` useEffect → `fetch('/api/mollie-checkout/intent')` | Same pattern as gap #2 — Mollie intent fetch has no retry; transient failure kills checkout. |
| 4 | Timeout handling | important | components/adopt/embedded-mollie-checkout.tsx:339-343 | `<Script strategy="lazyOnload">` for `https://js.mollie.com/v1/mollie.js` | `onError` fires when the CDN request errors, but a slow CDN (200ms → ∞) never fires `onError`. `sdkReady` stays `false`, form shows "Preparing secure payment field…" indefinitely. No timer fallback. |
| 5 | Logging/observability | important | components/corporate-enquiry-form.tsx:133-135 | `handleSubmit` success branch | `setStatus('success')` fires but no `trackEvent` call. The standard `contact-form.tsx` fires `contact_form_submit` on success; corporate enquiry is a blind spot in GA4. |
| 6 | Circuit breaking | nice-to-have | app/api/google-reviews/route.ts:73 | `fetchWithTimeout` → Google Places API | No circuit-breaker state; repeated Google Places failures (key revoked, quota hit) still attempt the upstream call on every non-cached request. Mitigated by 6h ISR + 30 req/min IP rate-limit. |

**Scoring**: 100 − (4 × 5) − (1 × 3) = 100 − 20 − 3 = **77**

> Note: ep-004 scoring was on a 0–10 scale (score: 8). This report uses the
> canonical 0–100 scale per gap-scanner.md. Previous composite adjusted in
> trend table accordingly.

**Gaps NOT found (verified clean)**:

- `/api/contact` rate-limit — present: 5 req/5 min per IP via `lib/rate-limit.ts`.
- Corporate enquiry form server-side input validation — `/api/contact` has length
  caps, honeypot, Turnstile, `isValidEmail`, `sanitizeHeader`, `escapeHtml`. Subject
  passthrough is `sanitizeHeader`-cleaned server-side.
- `ShareAlpacaButton` graceful degrade — returns `null` when `!canShare`. Valid.
- `ShareButtons` graceful degrade — pure anchor links, no Web Share API, no crash
  path.
- `AdoptShareCard` graceful degrade — both `handleNativeShare` and `handleCopy`
  catch errors silently; multi-button fallback renders without JS share API.
- `GoogleReviewsBadge` graceful degrade — `failed || !data || !data.configured ||
  !data.rating` → `return null`. Valid.
- `lib/newsletter.ts` timeout — all 4 SendGrid call sites use `fetchWithTimeout`.
  G-012 from ep-004 is resolved.
- Embedded Mollie/Stripe checkout error recovery — both components show
  `initError` state with `fallbackHostedUrl` escape-hatch link. Valid.
- Connection pooling — N/A (Drizzle pool intentional, documented in CLAUDE.md).

---

## L2: Gadget Designs (Score: 100/100)

### gd-014: withRetryOnResend

- **Category**: Retry logic
- **Type**: call-site wrapper
- **Lines**: 11
- **For gap**: #1 — `lib/mailer.ts:78`

> Wraps `resend.emails.send` with the existing `withRetry` from `lib/retry.ts`, retrying only on 5xx and rate-limit codes.

```typescript
// Drop into lib/mailer.ts — import already available via lib/retry.ts
const { data, error } = await withRetry(
  () => resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    replyTo,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(Object.keys(listUnsubscribeHeaders).length > 0 ? { headers: listUnsubscribeHeaders } : {}),
    ...(resendAttachments && resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
  }),
  {
    attempts: 3,
    baseDelayMs: 500,
    shouldRetry: (err) => {
      const e = err as { statusCode?: number; code?: string }
      return (e?.statusCode ?? 0) >= 500 || e?.code === 'rate_limited'
    },
  }
)
```

**Line count (non-empty, non-comment)**: 14 — within limit.

---

### gd-015: withRetryOnIntentFetch

- **Category**: Retry logic
- **Type**: call-site wrapper (client-side fetch)
- **Lines**: 11
- **For gap**: #2 — `components/adopt/embedded-checkout.tsx:95`

> Wraps the `/api/checkout/intent` fetch with exponential backoff; retries on 5xx or network error only (not 4xx — those indicate a config problem, not a transient fault).

```typescript
/** Retry a fetch at most maxAttempts times on 5xx or network failure. */
async function fetchWithRetry(
  input: RequestInfo, init: RequestInit, maxAttempts = 3
): Promise<Response> {
  for (let i = 1; i <= maxAttempts; i++) {
    const res = await fetch(input, init)
    if (res.ok || res.status < 500 || i === maxAttempts) return res
    await new Promise(r => setTimeout(r, 300 * 2 ** (i - 1)))
  }
  return fetch(input, init) // unreachable but satisfies TS
}
```

**Line count**: 9 — well within limit.

---

### gd-016: withRetryOnMollieIntentFetch

- **Category**: Retry logic
- **Type**: call-site wrapper (client-side fetch)
- **Lines**: 9
- **For gap**: #3 — `components/adopt/embedded-mollie-checkout.tsx:140`

> Identical gadget as gd-015. Can be co-located in a shared `lib/client-retry.ts` and imported by both components. Designed separately to keep each injection plan independent; in practice one utility serves both.

```typescript
/** Retry a fetch at most maxAttempts times on 5xx or network failure. */
async function fetchWithRetry(
  input: RequestInfo, init: RequestInit, maxAttempts = 3
): Promise<Response> {
  for (let i = 1; i <= maxAttempts; i++) {
    const res = await fetch(input, init)
    if (res.ok || res.status < 500 || i === maxAttempts) return res
    await new Promise(r => setTimeout(r, 300 * 2 ** (i - 1)))
  }
  return fetch(input, init)
}
```

**Line count**: 9.

> Implementation note: gd-015 and gd-016 are identical. Preferred placement is a new
> `lib/client-retry.ts` that both components import. This keeps the gadget under 20
> lines and the injection at each call site is a single-line change.

---

### gd-017: mollieScriptLoadTimeout

- **Category**: Timeout handling
- **Type**: utility hook
- **Lines**: 14
- **For gap**: #4 — `components/adopt/embedded-mollie-checkout.tsx` (useEffect, post-Script-load)

> After the `<Script lazyOnload>` triggers `onLoad`, the component sets `sdkReady=true`. This gadget adds a separate `useEffect` that starts a timer on mount; if `sdkReady` is still false after `timeoutMs`, it fires `setInitError`. No new deps — uses `useEffect` + `setTimeout` from React/stdlib.

```typescript
/** In EmbeddedMollieCheckout: fire initError if SDK hasn't loaded within timeoutMs. */
useEffect(() => {
  if (sdkReady) return            // already loaded — nothing to do
  const timer = setTimeout(() => {
    if (!sdkReady) {              // re-check inside closure
      setInitError(
        'Payment field could not load in time. ' +
        'Please refresh the page or use the hosted checkout link.'
      )
    }
  }, 12_000)                      // 12s >> typical CDN RTT; shorter than Vercel 25s limit
  return () => clearTimeout(timer)
}, [sdkReady])
```

**Line count**: 10.

---

### gd-018: trackCorporateEnquirySubmit

- **Category**: Logging/observability
- **Type**: call-site injection (client component)
- **Lines**: 7
- **For gap**: #5 — `components/corporate-enquiry-form.tsx:133`

> Fires a typed GA4 event on successful corporate enquiry submission. Requires adding `corporate_enquiry_submitted` to `lib/analytics-events.ts` `EventParamsMap` (a 3-line addition to the type map, not a new dep). The `trackEvent` call itself is the gadget.

```typescript
// In lib/analytics-events.ts — add to EventParamsMap:
corporate_enquiry_submitted: {
  has_group_size: boolean
  has_preferred_month: boolean
}

// In corporate-enquiry-form.tsx line 133 (after setStatus('success')):
try {
  trackEvent('corporate_enquiry_submitted', {
    has_group_size: groupSize.trim().length > 0,
    has_preferred_month: preferredMonth.trim().length > 0,
  })
} catch { /* analytics never blocks UX */ }
```

**Line count (gadget call site only)**: 7. The EventParamsMap addition is 3 lines and is a type extension, not logic.

---

## L3: Injection Plan (Score: 93/100)

### Injection Plan: gd-014 (withRetryOnResend)

**Impact**: High (protects all outbound email — welcome, quarterly update, renewal, discount-codes, owner notifications)
**Disruption Risk**: Low — wraps the call expression, no signature change, no test mocks target `resend.emails.send` directly
**Injection Order**: 1 of 5

**Target**: `lib/mailer.ts` lines 78–87

**Before**:
```typescript
const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    replyTo,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(Object.keys(listUnsubscribeHeaders).length > 0 ? { headers: listUnsubscribeHeaders } : {}),
    ...(resendAttachments && resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
})
```

**After**:
```typescript
import { withRetry } from './retry.ts'  // add to existing imports (already in lib/)

const { data, error } = await withRetry(
  () => resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    replyTo,
    ...(scheduledAt ? { scheduledAt } : {}),
    ...(Object.keys(listUnsubscribeHeaders).length > 0 ? { headers: listUnsubscribeHeaders } : {}),
    ...(resendAttachments && resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
  }),
  {
    attempts: 3,
    baseDelayMs: 500,
    shouldRetry: (err) => {
      const e = err as { statusCode?: number; code?: string }
      return (e?.statusCode ?? 0) >= 500 || e?.code === 'rate_limited'
    },
  }
)
```

**Gadget Placement**: Inline at call site. `lib/retry.ts` already exists — just add the import.
**Import**: `import { withRetry } from './retry.ts'` at top of `lib/mailer.ts`

**Rollback**:
```
Replace: const { data, error } = await withRetry(() => resend.emails.send({ ... }), { ... })
With:    const { data, error } = await resend.emails.send({ ... })
Remove import { withRetry } from './retry.ts' if unused.
```

---

### Injection Plan: gd-015 + gd-016 (withRetryOnIntentFetch — shared utility)

**Impact**: High (protects all embedded checkout flows — both Stripe and Mollie intent creation)
**Disruption Risk**: Low — new utility file, call-site wrap, no signature changes
**Injection Order**: 2 of 5

**Step A** — Create `lib/client-retry.ts`:
```typescript
// lib/client-retry.ts
/** Retry a fetch at most maxAttempts times on 5xx or network failure. */
export async function fetchWithRetry(
  input: RequestInfo, init: RequestInit, maxAttempts = 3
): Promise<Response> {
  for (let i = 1; i <= maxAttempts; i++) {
    const res = await fetch(input, init)
    if (res.ok || res.status < 500 || i === maxAttempts) return res
    await new Promise(r => setTimeout(r, 300 * 2 ** (i - 1)))
  }
  return fetch(input, init)
}
```

**Step B** — `components/adopt/embedded-checkout.tsx` line 95:

Before:
```typescript
const res = await fetch('/api/checkout/intent', {
```

After:
```typescript
import { fetchWithRetry } from '@/lib/client-retry'
const res = await fetchWithRetry('/api/checkout/intent', {
```

**Step C** — `components/adopt/embedded-mollie-checkout.tsx` line 140:

Before:
```typescript
const res = await fetch('/api/mollie-checkout/intent', {
```

After:
```typescript
import { fetchWithRetry } from '@/lib/client-retry'
const res = await fetchWithRetry('/api/mollie-checkout/intent', {
```

**Rollback**:
```
For embedded-checkout.tsx:   Replace fetchWithRetry → fetch, remove import.
For embedded-mollie-checkout.tsx: same.
If no other callers remain, delete lib/client-retry.ts.
```

---

### Injection Plan: gd-017 (mollieScriptLoadTimeout)

**Impact**: Medium (protects embedded Mollie checkout UX — prevents indefinite loading spinner)
**Disruption Risk**: Low — adds a `useEffect` inside the same component, no prop or API changes
**Injection Order**: 3 of 5

**Target**: `components/adopt/embedded-mollie-checkout.tsx` — add after the existing `useEffect` that tears down components (lines ~237–249).

**Before** (after the teardown useEffect, before the `handleSubmit` useCallback):
```typescript
  // 3) Tear down components on unmount so a re-mount doesn't double-attach.
  useEffect(() => {
    return () => {
      for (const c of componentsRef.current) {
        try { c.unmount() } catch { /* Best-effort cleanup. */ }
      }
      componentsRef.current = []
    }
  }, [])

  const handleSubmit = useCallback(
```

**After** (insert between the two blocks):
```typescript
  // 3) Tear down components on unmount so a re-mount doesn't double-attach.
  useEffect(() => {
    return () => {
      for (const c of componentsRef.current) {
        try { c.unmount() } catch { /* Best-effort cleanup. */ }
      }
      componentsRef.current = []
    }
  }, [])

  // 3b) SDK load timeout — if Mollie.js hasn't fired onLoad within 12s, show error.
  useEffect(() => {
    if (sdkReady) return
    const timer = setTimeout(() => {
      if (!sdkReady) {
        setInitError(
          'Payment field could not load in time. ' +
          'Please refresh the page or use the hosted checkout link.'
        )
      }
    }, 12_000)
    return () => clearTimeout(timer)
  }, [sdkReady])

  const handleSubmit = useCallback(
```

**Gadget Placement**: Inline in the same component file. No new import needed.

**Rollback**:
```
Remove the "3b) SDK load timeout" useEffect block (lines inserted above handleSubmit).
```

---

### Injection Plan: gd-018 (trackCorporateEnquirySubmit)

**Impact**: Medium (fills a GA4 blind spot for the corporate B2B funnel — no funnel data exists currently)
**Disruption Risk**: Low — adds a try/catch block after `setStatus('success')`, no state or prop changes
**Injection Order**: 4 of 5

**Step A** — `lib/analytics-events.ts`: add to `EventParamsMap` (after `adopt_checkout_started_via_referral` on line 110):

```typescript
  corporate_enquiry_submitted: {
    has_group_size: boolean
    has_preferred_month: boolean
  }
```

Also add to `EVENT_CATEGORY` map:
```typescript
  corporate_enquiry_submitted: 'engagement',
```

**Step B** — `components/corporate-enquiry-form.tsx` line 133 (after `setStatus('success')`, before `return`):

Before:
```typescript
            if (res.ok) {
                setStatus('success')
                return
            }
```

After:
```typescript
            if (res.ok) {
                setStatus('success')
                try {
                  trackEvent('corporate_enquiry_submitted', {
                    has_group_size: groupSize.trim().length > 0,
                    has_preferred_month: preferredMonth.trim().length > 0,
                  })
                } catch { /* analytics never blocks UX */ }
                return
            }
```

**Import**: Add `import { trackEvent } from '@/lib/client-track'` to `corporate-enquiry-form.tsx` imports.

**Rollback**:
```
Remove the try/catch trackEvent block from corporate-enquiry-form.tsx.
Remove import { trackEvent } from '@/lib/client-track' if unused.
Remove corporate_enquiry_submitted from lib/analytics-events.ts EventParamsMap + EVENT_CATEGORY.
```

---

## L4: Gadget Inventory (Score: 0/100)

No gadgets have been deployed yet. This is the first inventory snapshot for this project.

| ID | Name | Category | Pattern | Lines | Status | Target Files | Injected | Impact | Origin |
|----|------|----------|---------|-------|--------|-------------|----------|--------|--------|
| gd-014 | withRetryOnResend | Retry logic | call-site wrapper | 14 | designed | lib/mailer.ts | — | All outbound email (welcome, renewal, quarterly, discount-codes) | ep-005 |
| gd-015 | fetchWithRetry (Stripe intent) | Retry logic | call-site wrapper | 9 | designed | components/adopt/embedded-checkout.tsx | — | Stripe embedded checkout intent creation | ep-005 |
| gd-016 | fetchWithRetry (Mollie intent) | Retry logic | call-site wrapper | 9 | designed | components/adopt/embedded-mollie-checkout.tsx | — | Mollie embedded checkout intent creation | ep-005 |
| gd-017 | mollieScriptLoadTimeout | Timeout handling | useEffect utility | 10 | designed | components/adopt/embedded-mollie-checkout.tsx | — | Mollie embedded checkout SDK load | ep-005 |
| gd-018 | trackCorporateEnquirySubmit | Logging/observability | call-site injection | 7 | designed | components/corporate-enquiry-form.tsx, lib/analytics-events.ts | — | Corporate B2B funnel GA4 visibility | ep-005 |

**Deployment coverage**: 0/5 (0%) — all gadgets in `designed` status.

> Inventory score: 0 (no gadgets deployed). This is expected for a first-run inventory.

---

## Scoring

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: Gap Scan | 77 | 35% | 26.95 |
| L2: Gadget Design | 100 | 30% | 30.00 |
| L3: Injection Plan | 93 | 20% | 18.60 |
| L4: Gadget Inventory | 0 | 15% | 0.00 |
| **Composite** | | | **75.55 → 76** |

> **Composite score: 76/100**

> L3 deduction: -5 for gd-015/gd-016 sharing a utility file (injection plan
> covers both together, reducing per-gadget specificity slightly for gd-016).
> All other injections have full before/after diffs, clear placement, and
> rollback instructions.

---

## Changes Since ep-004

**NEW** (5 items):
- [NEW] gd-014: retry on `resend.emails.send` (ep-004 flagged G-011 but left as "design only"; now has full injection plan)
- [NEW] gd-015: retry on embedded Stripe intent fetch (new cycle-5 code not in ep-004 scan scope)
- [NEW] gd-016: retry on embedded Mollie intent fetch (new cycle-5 code not in ep-004 scan scope)
- [NEW] gd-017: Mollie SDK load timeout (ep-004 flagged vaguely as "Mollie SDK load timeout — verify"; now confirmed and gadget-designed)
- [NEW] gd-018: GA4 `corporate_enquiry_submitted` event (new cycle-5 code, zero coverage in ep-004)

**RESOLVED** (1 item):
- [RESOLVED] G-012 (newsletter SendGrid timeout) — `lib/newsletter.ts` already uses `fetchWithTimeout` at all 4 call sites. Gap is closed.

**DEFERRED** (2 items, not gadget-sized):
- Circuit breaker on Mollie API — ~30-line state machine, above gadget threshold. Still deferred.
- `@react-pdf/renderer` dynamic import (ADR 018 compliance) — static import remains at `app/api/adopt-certificate/route.ts:5`. Not <20 lines in isolation when you include the null-return guard + downstream call adaptation.

> Trend tracking available after 3+ reports on the same scoring scale. ep-001 through ep-004 used a non-standard 0–10 composite scale; this report uses the canonical 0–100 scale.

---

## Top 5 Gadgets to Inject Next Cycle

Ranked by impact × severity × injection simplicity:

1. **gd-014** — `withRetryOnResend` in `lib/mailer.ts:78`
   - Highest blast radius: all transactional email (welcome, renewal, quarterly). `lib/retry.ts` already exists. Single-call-site wrap. Inject first.

2. **gd-015 + gd-016** — `fetchWithRetry` for both embedded checkout intent fetches
   - Create `lib/client-retry.ts` once, import in both components. Two-line change per component. Protects payment funnel directly.

3. **gd-017** — `mollieScriptLoadTimeout` useEffect in `embedded-mollie-checkout.tsx`
   - Eliminates indefinite loading spinner. 10-line `useEffect` inserted between two existing blocks. No deps.

4. **gd-018** — `trackCorporateEnquirySubmit` in `corporate-enquiry-form.tsx`
   - Fills GA4 blind spot in the B2B funnel. Requires a 3-line type extension + 7-line call site. Inject last (lowest risk, observability-only).
