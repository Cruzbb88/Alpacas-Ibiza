---
report_type: "exploding-pen"
report_number: 010
date: "2026-06-15"
project_name: "alpaca-farm-redesign"
project_tag: "cancel-refund-scan"
mode: "default"
target_path: "app/api/booking/cancel, lib/booking/booking-payment (refundBookingPayment), lib/booking/store (claimRefund), booking-cancel-button, app/api/booking-reminders, lib/booking-manage-token, cancellation email"
language: "TypeScript"
gaps_found: 3
gadgets_designed: 2
gadgets_injected: 2
gap_scan_score: 87
gadget_design_score: 100
injection_plan_score: NA
inventory_score: NA
composite_score: 93
previous_composite: 89
score_delta: "+4"
trend: "improving"
---

# Exploding Pen Report #010

**Date**: 2026-06-15 · **Target**: cancel + refund + email-chain surface · **Mode**: default · **Composite**: 93/100

## Executive Summary

Scanned the new self-service cancel, vendor-routed refund, refund-claim guard, manage-token,
reminder/review cron, and cancellation email. The surface is **healthy** — most candidates were
already covered (the score rises 89→93). Two genuine timeout gaps found and **injected**; one
low-value compliance candidate **rejected**.

## L1: Capability Gap Scan (87/100)

| # | Category | Severity | File | Gap |
|---|----------|----------|------|-----|
| 1 | Timeout handling | important | booking-payment.ts (refundBookingPayment, `tr_` branch) | Mollie refund call was bare — Stripe refund had `timeout:10_000`, Mollie didn't; a hung refund pins the cancel route |
| 2 | Timeout handling | important | booking-reminders/route.ts | `sendEmail` has no per-call timeout; one hung Resend send stalls the whole `allSettled` cron batch |
| 3 | Compliance/obs | nice-to-have | cancel email | No `List-Unsubscribe` header — **REJECTED**: it's a one-off transactional notice (CAN-SPAM exempt), and the proposed `?action=delete` link goes nowhere (misleading) |

## L2: Gadget Designs (100/100) — both injected

### gd-031: mollieRefundTimeout — Timeout — **injected**
Wraps `mollie.payments.refunds.create` in the existing `raceWithTimeout(p, 10_000)` → `null` on timeout → `false` (owner-alert path already handles it). Parity with the Mollie checkout-create timeout already in the same file.

### gd-032: cronSendEmailTimeout — Timeout — **injected**
`sendEmailWithTimeout(opts, 15_000)` wraps `sendEmail` via `raceWithTimeout`; throws on timeout so the existing per-recipient `catch` counts it as a failure instead of hanging the batch. Applied to both reminder + review sends.

## Rejected (correctly — already handled)
- Cancel-button double-submit → `disabled={busy}` + AbortSignal + server `claimRefund` already cover it.
- Retry on refund → deliberately absent; retrying past the `claimRefund` mutex would bypass refund-exactly-once. Owner-alert is the right path.
- Cancel-route observability → `log.info('[booking-cancel] cancelled', { refunded, refundEligible })` already records both.

## Scoring

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Gap Scan | 87 | 35% | 30.45 |
| L2 Gadget Design | 100 | 30% | 30.00 |
| L3 / L4 | N/A | — | — |
| **Composite** (/0.65) | | | **93** |

## Trend (last 3)

| Report | Date | Score | Gaps | Gadgets |
|--------|------|-------|------|---------|
| ep-008 | 2026-06-15 | 90 | 4 | 3 |
| ep-009 | 2026-06-15 | 89 | 4 | 3 |
| ep-010 | 2026-06-15 | 93 | 3 | 2 |

**Direction:** 90 → 93 (↑) — surface maturing; more candidates land as "already handled" than as gaps.
