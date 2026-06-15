---
report_type: "crystal-ball-full"
report_number: 7
date: "2026-06-15"
project_name: "alpaca-farm-redesign"
project_tag: "inhouse-booking-coherence-audit"
scope: "end-to-end in-house booking flow"
coherence_score: 87
previous_score: 72
trend: "improving"
---

# Crystal Ball — Coherence Audit #007

**Scope:** the now-complete in-house booking flow, end to end — admin slot create → availability →
customer pick → reserve → vendor-neutral checkout → webhook confirm (Stripe + Mollie) → guest email +
owner alert → cleanup cron + async hold-extension.
**Coherence Score: 87/100** (cb-006 premortem of the unbuilt design scored 72 → now built + verified-coherent).

## Verdict: every seam connects. No FAIL seams.

A full L2 cross-tech trace confirmed each handoff with file:line evidence:

| Seam | Verdict |
|------|---------|
| createSlot input ↔ POST /api/admin/slots body ↔ form fields (€→minor conversion) | ✅ |
| listOpenSlots `TourSlot` ↔ book/page `PickerSlot` map ↔ slot-picker props | ✅ |
| reserve body sent ↔ read; reserve response `{ok,bookingId}` ↔ picker read | ✅ |
| checkout `{bookingId,locale}` ↔ route; `{url}` ↔ `cData.url` | ✅ |
| success_url `/[locale]/tours/thank-you` + cancel_url + `/tours/book` all resolve | ✅ |
| `/api/booking-cleanup` in vercel.json, path matches, `*/15` vs 20-min hold | ✅ |
| `BOOKING_ENGINE==='inhouse'` gate consistent (reserve/checkout/cleanup) + store fail-closed | ✅ |
| `PAYMENT_VENDOR` branch ↔ BOTH webhooks have a reachable `booking_id` branch BEFORE adopt logic | ✅ |
| `booking_id`+`locale` metadata set on both vendors ↔ read back with same keys | ✅ |
| §B invariants (no-oversell / idempotent-confirm / restore-once / fail-closed) — UI adds no bypass | ✅ |
| amount: `price×party` minor ↔ Mollie decimal string + Stripe `unit_amount` minor (qty 1) | ✅ |

## Top failure modes before go-live (ranked)

| # | Failure mode | Severity | Nature |
|---|--------------|----------|--------|
| FM1 | **Vendor/webhook config mismatch → orphaned paid booking.** `PAYMENT_VENDOR` resolves to vendor A but only vendor B's webhook is registered at the processor → checkout succeeds, no webhook confirms, hold reaped at 20 min, **no auto-refund** (refund only fires on an un-honorable *confirm*, which never runs). | HIGH | **Operational** (deploy config), not a code defect |
| FM2 | Reserve has no idempotency — a retried reserve POST creates a 2nd hold; on a 4-seat slot two phantom holds lock 2 seats for 20 min. | MED | Known — spec-011 §I (unbuilt) |
| FM3 | Sold-out last-seat race dead-ends on a 409 (degrades gracefully with a "just filled up" message; no live refresh; stale SSR `seatsLeft` cap). | MED | UX — spec-011 §I |
| FM4 | No GDPR `deleted_at` on `bookings` + no guest booking-lookup/check-in. | MED | Known — spec-011 §I (unbuilt) |
| FM5 | VAT/IVA not charged — price shown + charged is net; a physical EU tour is taxable at delivery. | MED | Owner/accountant decision — spec-011 §I |

## Recommendations

1. **FM1 is the one true go-live gate** and it's operational: after setting `PAYMENT_VENDOR`, register the matching webhook URL at that processor and fire one test booking through. Optional code mitigation: a reconciliation cron that alerts the owner on `pending` bookings with no terminal state after N hours (catches orphans regardless of webhook config).
2. FM2–FM5 are all already enumerated in spec-011 §I — none are regressions from the UI seam. Build order suggestion: reserve idempotency (cheap, money-adjacent) → GDPR soft-delete → VAT decision (owner) → guest lookup.

## Score basis

- L1 outcome alignment (spec-011): high — §A–G + UI all implemented; remaining are §I hardening + owner items.
- L2 cross-tech: 100 — all seams PASS.
- L4 gaps: the 5 FMs above; only FM1 is a build-era surprise (config trap), the rest are tracked §I items.

Deductions from 100: −7 for the FM1 orphan-booking config trap having no in-code safety net, −6 for the unbuilt §I hardening (idempotency/GDPR/VAT) that affects the go-live outcome. **= 87.**
