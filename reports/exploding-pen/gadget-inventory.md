# Exploding Pen — Gadget Inventory

> Cumulative tracker of all designed and deployed gadgets for this project.
> Auto-updated by the Exploding Pen skill. Do not edit manually.

**Last updated**: 2026-06-15
**Total gadgets**: 19
**Deployed**: 19 | **Designed**: 0 | **Removed**: 0 | **Superseded**: 0

| ID | Name | Category | Pattern | Lines | Status | Target Files | Injected | Impact | Origin |
|----|------|----------|---------|-------|--------|-------------|----------|--------|--------|
| gd-014 | withRetryOnResend | Retry logic | call-site wrapper | 14 | injected | lib/mailer.ts | 2026-06-10✓ | All outbound email (welcome, renewal, quarterly, discount-codes) | ep-005 |
| gd-015 | fetchWithRetry (Stripe intent) | Retry logic | call-site wrapper | 9 | injected | components/adopt/embedded-checkout.tsx | 2026-06-10✓ | Stripe embedded checkout intent creation | ep-005 |
| gd-016 | fetchWithRetry (Mollie intent) | Retry logic | call-site wrapper | 9 | injected | components/adopt/embedded-mollie-checkout.tsx | 2026-06-10✓ | Mollie embedded checkout intent creation | ep-005 |
| gd-017 | mollieScriptLoadTimeout | Timeout handling | useEffect utility | 10 | injected | components/adopt/embedded-mollie-checkout.tsx | 2026-06-10✓ | Mollie embedded checkout SDK load | ep-005 |
| gd-018 | trackCorporateEnquirySubmit | Logging/observability | call-site injection | 7 | injected | components/corporate-enquiry-form.tsx, lib/analytics-events.ts | 2026-06-10✓ | Corporate B2B funnel GA4 visibility | ep-005 |
| gd-019 | availabilityFetchTimeout | Timeout handling | call-site option | 1 | injected | lib/use-availability.ts | 2026-06-10✓ | Date grid never hangs on a stalled FareHarbor upstream | ep-006 |
| gd-020 | formSubmitTimeout | Timeout handling | fetch option + catch branch | 8 | injected | lib/hooks/use-form-submit.ts | 2026-06-10✓ | Every form using useFormSubmit fails clearly at 15s instead of hanging forever | ep-006 |
| gd-021 | donorReceiptTokenAudit | Logging/observability | call-site inline log | 6 | injected | app/api/donor-receipt/[sessionId]/route.ts | 2026-06-10✓ | Distinguishes missing-vs-invalid token without weakening anti-oracle 404 response | ep-007 |
| gd-022 | donorReceiptTokenContract | Input validation (test) | sibling .test.ts | 87 | injected | lib/donor-receipt-token.test.ts | 2026-06-10✓ | Locks HMAC/scope/expiry/DoS-guard contract against future drift — keeps IDOR closed | ep-007 |
| gd-023 | withDbTimeout | Timeout handling | wrapper | 7 | injected | lib/booking/store.ts | 2026-06-15✓ | Bounds every booking tx/read (8s) so a hung pool/lock can't pin a serverless fn on the money path | ep-008 |
| gd-024 | logRefundDecision | Logging/observability | call-site inline log | 3 | injected | lib/booking/store.ts | 2026-06-15✓ | Structured WARN at every paid-but-unhonorable → refund decision, with reason | ep-008 |
| gd-025 | parseInstant | Input validation | utility | 4 | injected | lib/booking-engine/inhouse-adapter.ts | 2026-06-15✓ | Rejects unparseable/inverted ISO ranges before they reach SQL (fail-closed to []) | ep-008 |
| gd-026 | bookingStripeTimeout | Timeout handling | call-site option | 1 | injected | app/api/booking/checkout/route.ts | 2026-06-15✓ | Bounds the booking-checkout Stripe call (10s) — the last unguarded I/O on the money path | ep-008 |
| gd-027 | reserveSoldOutLog | Logging/observability | call-site inline log | 1 | injected | app/api/booking/reserve/route.ts | 2026-06-15✓ | Structured line on the sold_out 409 so the owner sees demand pressure / fill rate | ep-008 |
| gd-028 | clientFetchTimeout | Timeout handling | call-site option | 1 | injected | components/booking/slot-picker.tsx, components/admin/slot-manager.tsx | 2026-06-15✓ | AbortSignal.timeout(12s) on all 5 client fetches — buttons never spin forever on a hung endpoint | ep-009 |
| gd-029 | bookingGuestGuard | Input validation | call-site guard | 8 | injected | components/booking/slot-picker.tsx | 2026-06-15✓ | Requires name + valid email before a hold is used — stops the silent no-confirmation-email path | ep-009 |
| gd-030 | mollieCreateTimeout | Timeout handling | wrapper | 4 | injected | lib/booking/booking-payment.ts | 2026-06-15✓ | raceWithTimeout(10s) on mollie.payments.create — parity with the Stripe SDK timeout | ep-009 |
| gd-031 | mollieRefundTimeout | Timeout handling | wrapper | 8 | injected | lib/booking/booking-payment.ts | 2026-06-15✓ | raceWithTimeout(10s) on mollie.payments.refunds.create — a hung refund can't pin the cancel route | ep-010 |
| gd-032 | cronSendEmailTimeout | Timeout handling | wrapper | 6 | injected | app/api/booking-reminders/route.ts | 2026-06-15✓ | sendEmailWithTimeout(15s) — one hung Resend send can't stall the whole allSettled cron batch | ep-010 |

## Notes

- 2026-06-10 (ep-006): reconciled gd-014…gd-018 — all verified already injected in the
  working tree (call sites confirmed); status flipped designed → injected. Coverage 7/7 (100%).
- 2026-06-10 (ep-007): added gd-021 (observability) + gd-022 (contract test) after the
  donor-receipt HMAC token gate landed (closing the cb-005-flagged IDOR class).
- gd-015 + gd-016 share `lib/client-retry.ts` (`fetchWithRetry`).
- gd-019 + gd-020 use `AbortSignal.timeout` (no new deps); each relies on an existing
  `.catch` / `catch` to convert the abort into a graceful fallback or a clear error.
- gd-022 includes a cross-scope test: a valid `mollie-manage` cancel-scope token does
  NOT verify at donor-receipt scope (prevents cross-scope IDOR even with valid HMAC).
- G-012 (ep-004) resolved — `lib/newsletter.ts` already uses `fetchWithTimeout`.
- Deferred (not gadget-sized): Mollie circuit breaker (~30 lines); `@react-pdf/renderer`
  dynamic import per ADR-018.
- 2026-06-15 (ep-008): booking-engine surface scan. gd-023…gd-025 designed AND injected
  during this session's build (verified in-tree). gd-026 + gd-027 designed (single-line
  call-site changes — apply via `inject` or directly). Deferred to spec 011 §I (NOT
  gadget-sized): failed-refund owner alert (reuse `owner-notify`, needs payload adapter —
  do not duplicate the notifier) and distributed hold-DoS limit (needs durable KV store).
