---
report_type: "exploding-pen"
report_number: 009
date: "2026-06-15"
project_name: "alpaca-farm-redesign"
project_tag: "booking-ui-scan"
mode: "default"
target_path: "app/admin/slots, components/admin/slot-manager, app/api/admin/slots, components/booking/slot-picker, app/[locale]/tours/{book,thank-you}, lib/booking/{booking-payment,handle-booking-paid}"
language: "TypeScript"
gaps_found: 4
gadgets_designed: 3
gadgets_injected: 3
gap_scan_score: 79
gadget_design_score: 100
injection_plan_score: NA
inventory_score: NA
composite_score: 89
previous_composite: 90
score_delta: "-1"
trend: "declining"
---

# Exploding Pen Report #009

**Date**: 2026-06-15 · **Target**: new booking UI + vendor-neutral payment seam · **Mode**: default · **Composite**: 89/100

## Executive Summary

Scoped scan of the booking UI (admin slot manager, customer slot picker, book + thank-you pages)
and the vendor-neutral payment seam. Found **4 gaps**; the **3 gadget-sized ones were designed AND
injected** this session. Composite dips 90→89 only because this run targets brand-new UI surface.

## L1: Capability Gap Scan (79/100)

| # | Category | Severity | File | Gap |
|---|----------|----------|------|-----|
| 1 | Timeout handling | critical | slot-picker.tsx, slot-manager.tsx | Client `fetch()` had no timeout → "Book & pay"/"Saving…" spins forever on a hung endpoint |
| 2 | Input validation | important | slot-picker.tsx | Empty email/name passed straight to reserve → booking confirms but guest silently gets NO confirmation email |
| 3 | Timeout handling | important | booking-payment.ts | Mollie `payments.create` had no timeout (Stripe already did) → hung Mollie pins the function |
| 4 | Logging/observability | nice-to-have | handle-booking-paid.ts | Confirmed-booking log lacks amount/party context (SKIPPED — the `confirmed` outcome doesn't carry those fields; would log `undefined`) |

## L2: Gadget Designs (100/100) — all injected

### gd-028: clientFetchTimeout — Timeout handling — **injected**
`signal: AbortSignal.timeout(12_000)` on all 5 client fetches (2 in slot-picker, 3 in slot-manager). Browser-native, no deps; existing catch blocks already surface the error + reset the button.

### gd-029: bookingGuestGuard — Input validation — **injected**
8-line guard at the top of `book()`: requires a name + a valid email regex before any hold is consumed; uses the existing `setError` state. Stops the silent "no confirmation email" path.

### gd-030: mollieCreateTimeout — Timeout handling — **injected**
Wraps `mollie.payments.create` in the existing `raceWithTimeout(p, 10_000)` (lib/fetch) → `null` on timeout → returns `{ ok:false, code:'MOLLIE_TIMEOUT', status:504 }`. Parity with the Stripe SDK timeout.

## Rejected (correctly, per the scan)

- **Admin slots rate-limit / value bounds** — session-gated single-admin tool; an admin spamming their own slots isn't an abuse vector. Wrong tradeoff.
- **Mollie circuit breaker** — needs shared state (ADR-011) and would block valid bookings during a transient blip; per-request fail-closed is correct.
- **Thank-you `?booking=` XSS** — React auto-escapes `{booking}`; not a gap.

## Scoring

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Gap Scan | 79 | 35% | 27.65 |
| L2 Gadget Design | 100 | 30% | 30.00 |
| L3 / L4 | N/A | — | — |
| **Composite** (/0.65) | | | **89** |

## Trend (last 3)

| Report | Date | Score | Gaps | Gadgets |
|--------|------|-------|------|---------|
| ep-007 | 2026-06-10 | 96 | 2 | 2 |
| ep-008 | 2026-06-15 | 90 | 4 | 2 |
| ep-009 | 2026-06-15 | 89 | 4 | 3 |

**Direction:** 96 → 89 — dip reflects scanning fresh code (booking core + UI); every gadget found was injected.
