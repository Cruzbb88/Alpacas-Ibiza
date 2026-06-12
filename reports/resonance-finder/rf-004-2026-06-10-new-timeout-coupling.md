---
report_type: "resonance-finder"
report_number: 004
date: "2026-06-10"
project: "alpaca-farm-redesign"
mode: "default (focused — new params this session)"
params_inventoried_total: "~120 (fully mapped across rf-001…rf-003)"
new_params_this_session: 3
mis_tuned_found: 0
l1_score: 95
l2_score: 92
composite_score: 93
previous_composite: 88
trend: "stable-well-tuned"
---

# Resonance Finder #004 — coupling check on session-new timeouts

**Mode**: default, focused. The full tunable-parameter surface (~120 knobs: token TTLs,
rate limits, fetch timeouts, idempotency/cache TTLs, row caps, retry counts) was already
inventoried and tuned across **rf-001…rf-003** (latest 2026-05-30) and is ADR-documented
(ADR 008 ISR 1800s, ADR 011 rate limits, the 2026-05-29 idempotency-TTL tunings). This run
checks only the **3 parameters introduced this session** for mis-tuning and resonance
(dangerous coupling with an upstream budget).

## New parameters this session

| Param | Value | File | Origin |
|---|---|---|---|
| Form-submit client timeout | `AbortSignal.timeout(15_000)` | `lib/hooks/use-form-submit.ts` | gd-020 (ep-006) |
| Availability client timeout | `AbortSignal.timeout(8_000)` | `lib/use-availability.ts` | gd-019 (ep-006) |
| `createTtlValueStore` reuse TTLs | 5 min / 1 h | referral-count-reader, adopters/count | uft-002 |

## L2 — sensitivity + coupling (the resonance check)

**Resonance rule:** a client-side timeout must sit *above* the worst-case server budget it
waits on, with margin — too tight and it aborts a request the server would have answered
(false failure); too loose and the user stares at a spinner long after the server gave up.

| Param | Coupled upstream budget | Margin | Verdict |
|---|---|---|---|
| Availability 8s | route returns 503 instantly if keys unset; else FareHarbor via parallel `fetchWithTimeout(5–6s)` (`Promise.allSettled`) → ~6s worst case | **~2s above** | ✅ well-tuned |
| Form-submit 15s | `/api/contact` = Resend + `withRetry(3, 500ms base)` ≈ ≤5s; Vercel function limit ≈10s (504s first, client receives it) | **≥5s above** | ✅ well-tuned |
| Reuse TTLs 5min/1h | unchanged values, merely re-homed onto the shared store | n/a | ✅ identical to pre-migration |

**Sensitivity ranking of the new knobs:** all LOW — they are ceilings on already-fast paths,
not hot-loop tuning. Lowering the 8s/15s would only convert successful-but-slow requests
into false timeouts; raising them only lengthens the worst-case spinner. Current values are
in the correct band.

## Verdict

**0 mis-tuned parameters.** The two new timeouts are correctly sized against their coupled
upstream budgets (no resonance anti-pattern — neither is tighter than the path it guards).
The re-homed cache TTLs are byte-identical to their pre-uft-002 values. No re-tuning applied;
none warranted. The broader parameter surface remains as tuned in rf-001…rf-003.
