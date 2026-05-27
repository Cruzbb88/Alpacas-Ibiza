# Security Review sr-003-2026-05-27-session-diff

**Date:** 2026-05-27  
**Scope:** commits `3d7dcf6..HEAD`  
**Reviewer:** automated static analysis  

---

## Verdict: NEEDS FIXES

One medium-severity issue requires a fix before deploy. No critical findings. All failsafes in the CLAUDE.md map are intact.

---

## Findings

| # | Severity | File:line | Issue | OWASP |
|---|---|---|---|---|
| 1 | **Medium** | `app/api/billing-portal/route.ts:64-81` | Unauthenticated email-to-customer-ID oracle | A01 Broken Access Control |
| 2 | **Low** | `app/api/reminder/route.ts:69-71` | ICS `uid` includes raw `booking.pk` from webhook body without format-validation | A03 Injection |
| 3 | **Low** | `app/api/billing-portal/route.ts:63` | Unvalidated `customer_id` passed to Stripe portal session | A03 Injection |

---

## Finding Detail

### Vuln 1 — Unauthenticated email oracle + Stripe portal access: `app/api/billing-portal/route.ts:64`

* **Severity:** Medium
* **Confidence:** 0.85

`POST /api/billing-portal` accepts `{ email, customer_id }` with no authentication. When `customer_id` is absent, the route calls `stripe.customers.list({ email, limit: 1 })` and—if found—creates a **live Stripe billing-portal session URL** and returns it in the response body. The caller receives a full portal URL granting self-service access to subscription management (cancel, update payment, view invoices) without ever proving they own that email address.

**Exploit scenario:** Attacker posts `{"email":"victim@example.com"}`. If the victim is a subscriber, the server returns a Stripe-hosted portal URL granting access to their subscription. No CAPTCHA, no rate-limit, no authentication on this route. A 404 on non-subscribers is a mild subscriber-enumeration oracle (medium risk; main risk is portal access).

**Recommended fix:** Require authentication (session cookie + NextAuth) before issuing a portal session. At minimum: add Turnstile + rate-limit (same pattern as `/api/checkout`). The Stripe portal URL itself is short-lived but the window is still exploitable at scale.

---

### Vuln 2 — ICS UID injection from raw webhook body: `app/api/reminder/route.ts:69`

* **Severity:** Low
* **Confidence:** 0.80

In the new ICS-attachment branch (added this session), `bookingPk` is derived directly from `body.pk` and then interpolated into the ICS `uid` field:

```ts
const bookingPk = body.pk ? String(body.pk) : null
const uid = bookingPk ? `${bookingPk}@alpacasibiza.com` : ...
```

`escapeIcs()` does escape backslash, semicolon, comma, and newline — but **does not strip or validate the format of `bookingPk`**. A webhook caller who passes `body.pk = "evil\r\nBEGIN:VEVENT\r\nSUMMARY:injected"` could inject new iCalendar properties/events into the attachment. The `/api/reminder` route is nominally secret-gated, but is fail-OPEN if `FAREHARBOR_WEBHOOK_SECRET` is unset (per design), making this reachable in any environment where the secret is not configured.

**Recommended fix:** Validate `body.pk` matches `^[A-Za-z0-9_-]+$` before using it in the UID, or generate the UID independently (e.g., HMAC of the booking email + startAt).

---

### Vuln 3 — Unvalidated `customer_id` forwarded to Stripe: `app/api/billing-portal/route.ts:63`

* **Severity:** Low
* **Confidence:** 0.80

When the caller supplies `customer_id` directly, it is passed to `stripe.billingPortal.sessions.create({ customer: customerId })` with no format check. Stripe customer IDs follow `cus_[A-Za-z0-9]+`; an attacker who already knows a victim's Stripe customer ID (e.g., leaked from a Stripe event or another app sharing the account) can bypass the email-lookup step entirely and get a portal session. This compounds Vuln 1: even if email lookup is locked down, the `customer_id` path remains open.

**Recommended fix:** Validate `customer_id` against `/^cus_[A-Za-z0-9]+$/` before use, and apply the same auth gate as recommended in Vuln 1.

---

## Failsafe Regression Check

All 56+ rows in the CLAUDE.md failsafe map were checked against the session diff. **No regressions found.**

Specific checks on the highest-risk rows:

| Failsafe row | Status |
|---|---|
| Webhook 503 if secret unset (fail-CLOSED) — `fareharbor-webhook` | INTACT — diff only adds `reqId` wrappers, no logic change |
| `safeEqual()` for shared-secret compare | INTACT — added correctly to all new webhook routes (stripe, mollie) |
| Admin login fail-closed if `ADMIN_USERNAME/PASSWORD` unset | NOT TOUCHED — no auth route changes in this diff |
| Stripe webhook 503 if `STRIPE_WEBHOOK_SECRET` unset (fail-CLOSED) | INTACT — new `stripe-webhook` route correctly gates on both secrets |
| Mollie webhook URL-path secret matched constant-time via `safeEqual()` | INTACT — implemented in new `mollie-webhook` route |
| Stripe checkout `success_url` uses `SITE_BASE_URL` (not `Origin` header) | INTACT — explicitly noted in CLAUDE.md as a 2026-05-27 fix; code confirmed |
| Newsletter double opt-in — does NOT subscribe on POST | INTACT — token-based flow, confirm route required |
| `escapeHtml()` on all user input before email HTML | INTACT — used throughout; new GDPR route also escapes correctly |
| `sanitizeHeader()` CRLF guard on SMTP subject/name fields | INTACT — contact/commission routes unchanged |
| In-memory sliding-window rate limit on form routes | INTACT — new newsletter + log-error + unsubscribe all apply rate-limits |

---

## Notes on New Surface (no finding, observation only)

- **`lib/webhook-idempotency.ts`:** In-memory store is process-scoped. A cold-start during a Stripe 3-day retry window could re-process a payment event (welcome email duplicate). ADR 001 documents this tradeoff. Not a security issue.
- **`lib/request-id.ts` X-Request-ID reflection:** The route accepts a caller-supplied `X-Request-ID` if it matches `[a-zA-Z0-9-]{8,64}` and echoes it in the response header. This is standard correlation-ID practice; no injection risk since it only reaches response headers (not HTML or email bodies).
- **`lib/ics.ts` Google Calendar URL:** User-controlled fields (`summary`, `description`, `location`) are passed through `URLSearchParams` which URL-encodes them. No injection risk on the URL itself.
