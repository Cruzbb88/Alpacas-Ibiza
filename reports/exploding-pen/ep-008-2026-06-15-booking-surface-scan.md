---
report_type: "exploding-pen"
report_number: 008
date: "2026-06-15"
project_name: "alpaca-farm-redesign"
project_tag: "booking-surface-scan"
mode: "default"
target_path: "lib/booking/, app/api/booking/, stripe-webhook booking branch, inhouse-adapter"
language: "TypeScript"
gaps_found: 4
gadgets_designed: 2
gadgets_injected: 3
gap_scan_score: 82
gadget_design_score: 100
injection_plan_score: NA
inventory_score: NA
composite_score: 90
previous_composite: 96
score_delta: "-6"
trend: "declining"
---

# Exploding Pen Report #008

**Date**: 2026-06-15
**Target**: in-house booking engine surface (new this session)
**Language**: TypeScript (667 .ts/.tsx files)
**Mode**: default (L1 + L2)
**Composite Score**: 90/100

## Executive Summary

Scoped scan of the in-house booking engine added this session (lib/booking/*, the
three booking API routes, the `booking_id` branch of stripe-webhook, and the
in-house availability adapter). The rest of the codebase was covered by ep-001…007
and remains hardened (97+ documented failsafes).

Three gadgets were **already designed AND injected during this session's build**
(captured here for inventory continuity): `withDbTimeout` (the DB was the one
unguarded I/O boundary on the money path), `logRefundDecision` (every refund the
system initiates now emits a structured line at the decision point), and
`parseInstant` (validates ISO dates before they reach SQL).

This scan found **4 remaining gaps**. Two are gadget-sized and designed below
(gd-026 Stripe-call timeout, gd-027 sold-out observability). Two are real but
**not gadget-sized** and are deferred to spec 011 §I (failed-refund owner alert →
reuse `owner-notify` with a payload adapter; distributed hold-DoS → needs a
durable rate-limit store, not a <20-line wrap). The composite dips vs ep-007 (96→90)
only because this scan targets brand-new code; it's not a regression in shipped
quality.

## L1: Capability Gap Scan (Score: 82/100)

| # | Category | Severity | File | Function | Gap Description |
|---|----------|----------|------|----------|-----------------|
| 1 | Timeout handling | important | app/api/booking/checkout/route.ts | POST | Stripe client built with `{ apiVersion }` only — no `timeout`; a hung Stripe API call pins the serverless fn (~80s SDK default) on the money path. DB calls are now guarded (gd-023); the Stripe call is the remaining unbounded I/O. |
| 2 | Logging/observability | important | app/api/stripe-webhook/route.ts | booking branch | A failed auto-refund (`refundOk:false`) is `log.error` only — no owner alert. A charged-but-unrefunded guest is invisible until someone reads Vercel logs. (NOT gadget-sized — see deferred.) |
| 3 | Rate limiting | important | app/api/booking/reserve/route.ts | POST | Per-IP in-memory limit (ADR-011) isn't shared across serverless instances; a 2-IP bot can hold out a small slot. (NOT gadget-sized — needs durable store.) |
| 4 | Logging/observability | nice-to-have | app/api/booking/reserve/route.ts | POST | The `sold_out` (409) branch emits no structured log — owner can't see demand pressure / how often slots fill. Only the 200 hold-created path logs. |

L1 = 100 − 5 − 5 − 5 − 3 = **82**.

## L2: Gadget Designs (Score: 100/100)

### gd-026: bookingStripeTimeout
- **Category**: Timeout handling
- **Type**: call-site option (constructor opts)
- **Lines**: 1 (option object change)
- **For gap**: #1 — app/api/booking/checkout/route.ts Stripe client

> Bounds the booking-checkout Stripe call so a stalled Stripe API can't pin the
> serverless function. Mirrors the per-call `{ timeout: 3000 }` already used in
> setup-probe; `StripeFactory` accepts arbitrary constructor opts.

```typescript
// Before: const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })
const stripe = stripeFactory(secretKey, {
  apiVersion: '2024-06-20',
  timeout: 10_000,        // ms — fail fast instead of the ~80s SDK default
  maxNetworkRetries: 1,   // one transparent retry on a network blip, then surface
})
```

### gd-027: reserveSoldOutLog
- **Category**: Logging/observability
- **Type**: call-site inline log
- **Lines**: 1
- **For gap**: #4 — app/api/booking/reserve/route.ts sold_out branch

> One structured line when a hold is refused for capacity, so the owner can see
> which slugs sell out and when. Fail-quiet (logging only; no behavior change).

```typescript
// In the `result.reason === 'sold_out'` branch, before the 409 return:
log.info('[booking-reserve] refused — sold out', { slotId, partySize })
```

## L3: Injection Plan (Score: N/A)

Injection planning requires `deep` mode. gd-026 and gd-027 are single-line
call-site changes (low disruption, no signature change) — run
`/exploding-pen inject gd-026` after a `deep` run, or apply directly.

## L4: Gadget Inventory (Score: N/A)

Inventory tracking detail requires `deep` mode; the cumulative inventory file was
updated additively for continuity (gd-023…gd-027). Deployment after this report:
12 injected / 14 total (gd-026, gd-027 `designed`).

## Scoring

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: Gap Scan | 82 | 35% | 28.70 |
| L2: Gadget Design | 100 | 30% | 30.00 |
| L3: Injection Plan | N/A | 20% | N/A |
| L4: Gadget Inventory | N/A | 15% | N/A |
| **Composite** (normalized /0.65) | | | **90** |

## Deferred (real gaps, NOT gadget-sized — tracked in spec 011 §I)

- **Failed-refund owner alert** (gap #2): the clean fix reuses `lib/owner-notify.ts`
  `notifyOwnerOnEscalation`, but that takes an `EscalationNotification` (dunning-shaped)
  payload — adapting it is >20 lines and crosses a module boundary, so it's a spec
  item (blocker), not a gadget. Do NOT hand-roll a duplicate notifier (anti-duplication).
- **Distributed hold-DoS limit** (gap #3): needs a durable (KV) rate-limit store per
  ADR-011's upgrade path — architectural, not a wrap.

## Changes Since Last Report

**NEW** (4 items):
- [NEW] Stripe-call timeout gap on booking checkout (gap #1 → gd-026)
- [NEW] Failed-refund owner-alert gap (gap #2, deferred to spec)
- [NEW] Hold-DoS durable-limit gap (gap #3, deferred to spec)
- [NEW] Sold-out observability gap (gap #4 → gd-027)

**RESOLVED** (3 items):
- [RESOLVED] DB money-path I/O had no timeout → gd-023 `withDbTimeout` injected
- [RESOLVED] Refund decisions were silent → gd-024 `logRefundDecision` injected
- [RESOLVED] Unvalidated ISO dates reaching SQL → gd-025 `parseInstant` injected

## Trend (last 3 reports)

| Report | Date | Score | Gaps | Gadgets | L1 | L2 | L3 | L4 |
|--------|------|-------|------|---------|----|----|----|----|
| ep-006 | 2026-06-10 | 94 | 2 | 2 | 90 | 100 | N/A | N/A |
| ep-007 | 2026-06-10 | 96 | 2 | 2 | 92 | 100 | N/A | N/A |
| ep-008 | 2026-06-15 | 90 | 4 | 2 | 82 | 100 | N/A | N/A |

**Direction:** 94 → 90 (↓, −4% over 3 reports) — dip is from scanning brand-new
booking code; 3 of this session's gaps were already injected before this report.
