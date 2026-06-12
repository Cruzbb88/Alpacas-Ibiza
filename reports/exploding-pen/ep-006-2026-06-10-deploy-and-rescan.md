---
report_type: "exploding-pen"
report_number: 006
date: "2026-06-10"
project_name: "alpaca-farm-redesign"
project_tag: "alpaca-farm"
mode: "default"
target_path: "C:\\Users\\cruzb\\Projects\\alpaca-farm-redesign"
language: "TypeScript / Next.js"
gaps_found: 2
gadgets_designed: 2
gadgets_injected: 2
gap_scan_score: 90
gadget_design_score: 100
injection_plan_score: 100
inventory_score: 100
composite_score: 95
previous_composite: 76
score_delta: "+19"
trend: "improving"
---

# Exploding Pen Report #006 — deploy prior cycle + fresh rescan

**Date**: 2026-06-10 · **Mode**: default (+ inventory reconciliation) · **Composite**: 95/100

## Executive summary

Two outcomes this cycle:

1. **Reconciliation** — all 5 gadgets designed in ep-005 (gd-014…gd-018) were found
   **already injected** in the working tree (the inventory still listed them as
   `designed`). Verified each at its call site and flipped status to `injected`.

2. **Fresh rescan** found the codebase exceptionally well-hardened (translate,
   newsletter, owner-notify, replay-event, social-proof, healthz all already wrap
   external calls in `fetchWithTimeout`/AbortController). Only **2 genuine new
   timeout gaps** remained — both client-side fetches with a `.catch` but no
   abort, so a *stalled* (vs failed) request hangs the UI forever. Both fixed.

## Reconciliation — ep-005 gadgets verified deployed

| ID | Gadget | Verified at | Status |
|----|--------|-------------|--------|
| gd-014 | withRetryOnResend | `lib/mailer.ts:4,211` (`import { withRetry }` + wrap) | injected ✓ |
| gd-015 | fetchWithRetry (Stripe intent) | `components/adopt/embedded-checkout.tsx:51,96` | injected ✓ |
| gd-016 | fetchWithRetry (Mollie intent) | `components/adopt/embedded-mollie-checkout.tsx:55,141` | injected ✓ |
| gd-017 | mollieScriptLoadTimeout | `components/adopt/embedded-mollie-checkout.tsx:252-260` | injected ✓ |
| gd-018 | trackCorporateEnquirySubmit | `corporate-enquiry-form.tsx:139` + `analytics-events.ts:119,147` | injected ✓ |

Shared util `lib/client-retry.ts` exists (backs gd-015/gd-016). Coverage 5/5.

## L1 — fresh gap scan (score 90/100)

| # | Category | Severity | File | Site | Gap |
|---|----------|----------|------|------|-----|
| 1 | Timeout handling | important | `lib/hooks/use-form-submit.ts:38` | shared `submit()` fetch | No timeout on the **shared form-submit hook** POST. `.catch` handles thrown errors, but a stalled server (connection open, no response) leaves *every* form using this hook stuck on `loading` indefinitely. Highest blast radius of any remaining gap. |
| 2 | Timeout handling | nice-to-have | `lib/use-availability.ts:27` | `fetch('/api/availability')` | Client availability fetch has a `.catch` fallback but no abort; a slow FareHarbor upstream (proxied by the route) leaves the date grid pending forever. |

**Verified clean (no gap):** `lib/translate.ts` (`fetchWithTimeout 5000`), `lib/newsletter.ts`
(SendGrid, fetchWithTimeout), `app/api/admin/replay-event/route.ts:298` (AbortController +
`REPLAY_FETCH_TIMEOUT_MS`), `lib/owner-notify.ts` (2s timeout), `app/api/social-proof` +
`healthz` (AbortSignal.timeout), all 6 payment/checkout routes (503 fail-closed + mailto
fallback), reCAPTCHA client `grecaptcha.execute` (`.catch` fail-open). The 10-category sweep
otherwise returns clean — retry/rate-limit/circuit/validation/graceful-degradation are
already covered project-wide (97-row failsafe map in CLAUDE.md).

## L2 — gadgets designed + injected this cycle

### gd-020: formSubmitTimeout  ⟶ injected
- **Category**: Timeout handling · **Lines**: 8 · **Gap #1**
- Adds `signal: AbortSignal.timeout(15_000)` to the shared hook's fetch, plus a friendly
  `TimeoutError` branch in the existing `catch` so a hang becomes a clear, retryable error
  instead of an infinite spinner. No new deps; every form using `useFormSubmit` benefits.
- **Injected**: `lib/hooks/use-form-submit.ts` (fetch init + catch message).

### gd-019: availabilityFetchTimeout  ⟶ injected
- **Category**: Timeout handling · **Lines**: 1 + comment · **Gap #2**
- `fetch('/api/availability', { signal: AbortSignal.timeout(8_000) })`. The existing
  `.catch(() => ({ dates: [], error: 'failed' }))` already converts the abort to the
  graceful fallback — zero downstream change.
- **Injected**: `lib/use-availability.ts:27`.

## Verification
- `tsc --noEmit` → clean (DOM lib provides `AbortSignal.timeout` + `DOMException`).
- `npm test` → 846 pass / 0 fail (incl. `use-form-submit.test.ts`).

## Scoring
| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Gap Scan | 90 | 35% | 31.5 |
| L2 Gadget Design | 100 | 30% | 30.0 |
| L3 Injection Plan | 100 | 20% | 20.0 |
| L4 Inventory | 100 | 15% | 15.0 |
| **Composite** | | | **96.5 → 95** |

## Still deferred (not gadget-sized, unchanged from ep-005)
- Circuit breaker on Mollie API (~30-line state machine).
- `@react-pdf/renderer` dynamic import (ADR-018) — larger than a <20-line gadget in isolation.
