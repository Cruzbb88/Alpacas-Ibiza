# Exploding Pen — Gadget Inventory

> Cumulative tracker of all designed and deployed gadgets for this project.
> Auto-updated by the Exploding Pen skill. Do not edit manually.

**Last updated**: 2026-05-31
**Total gadgets**: 5
**Deployed**: 0 | **Designed**: 5 | **Removed**: 0 | **Superseded**: 0

| ID | Name | Category | Pattern | Lines | Status | Target Files | Injected | Impact | Origin |
|----|------|----------|---------|-------|--------|-------------|----------|--------|--------|
| gd-014 | withRetryOnResend | Retry logic | call-site wrapper | 14 | designed | lib/mailer.ts | — | All outbound email (welcome, renewal, quarterly, discount-codes) | ep-005 |
| gd-015 | fetchWithRetry (Stripe intent) | Retry logic | call-site wrapper | 9 | designed | components/adopt/embedded-checkout.tsx | — | Stripe embedded checkout intent creation | ep-005 |
| gd-016 | fetchWithRetry (Mollie intent) | Retry logic | call-site wrapper | 9 | designed | components/adopt/embedded-mollie-checkout.tsx | — | Mollie embedded checkout intent creation | ep-005 |
| gd-017 | mollieScriptLoadTimeout | Timeout handling | useEffect utility | 10 | designed | components/adopt/embedded-mollie-checkout.tsx | — | Mollie embedded checkout SDK load | ep-005 |
| gd-018 | trackCorporateEnquirySubmit | Logging/observability | call-site injection | 7 | designed | components/corporate-enquiry-form.tsx, lib/analytics-events.ts | — | Corporate B2B funnel GA4 visibility | ep-005 |

## Notes

- gd-014 supersedes ep-004 G-011 (same gap, same target; G-011 was designed-only with
  no injection plan; gd-014 has full L3 plan).
- gd-015 and gd-016 share a utility: create `lib/client-retry.ts` once, import in both.
- G-012 (ep-004) is resolved — `lib/newsletter.ts` already uses `fetchWithTimeout`.
- G-013 (ep-004, @react-pdf dynamic import) is deferred — not gadget-sized in isolation.
