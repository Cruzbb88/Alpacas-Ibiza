---
report_number: 003
date: "2026-05-29"
project_name: "alpaca-farm-redesign"
project_tag: "alpaca-farm"
mode: "default"
target_path: "C:/Users/cruzb/Projects/alpaca-farm-redesign"
language: "TypeScript/Next.js (App Router)"
gaps_found: 12
gadgets_designed: 12
gadgets_injected: 0
gap_scan_score: 76
gadget_design_score: 96
injection_plan_score: NA
inventory_score: NA
composite_score: 85
previous_composite: 82
score_delta: "+3"
trend: "improving"
---

# Exploding Pen Report #003

**Date**: 2026-05-29
**Target**: C:/Users/cruzb/Projects/alpaca-farm-redesign
**Language**: TypeScript/Next.js (App Router)
**Mode**: default (targeted hunt)
**Composite Score**: 85/100

## Executive Summary

Targeted sweep across 7 specific areas: `app/[locale]/`, `app/api/`, `lib/payment-failure-tracker.ts`, `lib/mollie-manage-token.ts`, `app/api/mollie-manage/*`, email templates, and forms. Found 12 gaps — none are architectural regressions, all are small omissions in recently-landed code. The most security-relevant: token length has no cap in `verifyTokenWithScope` (attacker can send a 10MB string and waste CPU on base64 decode + HMAC); severity transition logging is absent from `payment-failure-tracker.ts` (first/at-risk/action-required escalations are invisible without it); and the contact-form server route enforces no input length limits (body parser accepts arbitrary-size strings). All 12 are addressable in under 20 lines each.

## L1: Capability Gap Scan (Score: 76/100)

| # | Category | Severity | File | Function | Gap Description |
|---|----------|----------|------|----------|-----------------|
| 1 | Input validation | critical | lib/mollie-manage-token.ts:116 | verifyTokenWithScope | No max length on token before base64 decode + HMAC — attacker can send a 10MB string |
| 2 | Input validation | critical | app/api/contact/route.ts:15 | POST | name/email/message have no server-side length cap — 1MB messages accepted |
| 3 | Logging/observability | important | lib/payment-failure-tracker.ts:65 | recordFailure | Severity transitions (first→at-risk, at-risk→action-required) produce no log/metric |
| 4 | Logging/observability | important | lib/payment-failure-tracker.ts:80 | resetFailures | No log emitted on counter reset — silent recovery after payment success |
| 5 | Input validation | important | lib/payment-failure-tracker.ts | (module-level) | No reset on subscription cancel — canceled customer retains stale failure count |
| 6 | Error recovery | important | app/api/mollie-manage/route.ts:- | POST | No OPTIONS handler — CORS preflight from custom browser integration will fail |
| 7 | Logging/observability | important | app/api/mollie-manage/status/route.ts:83 | GET | No X-Robots-Tag response header on GET endpoint — `<meta robots>` alone is not picked up by all crawlers |
| 8 | Input validation | important | components/newsletter-form.tsx:52 | NewsletterForm | Email input has no `inputMode="email"` and no `maxLength` — mobile UX gap + uncapped paste |
| 9 | Logging/observability | important | lib/email-templates.ts:emailLayout | emailLayout | No plain-text fallback in mailer.ts — Resend sends HTML-only; spam filters penalise missing text/plain |
| 10 | Logging/observability | nice-to-have | app/api/mollie-manage/route.ts:169 | sendEmail call | Welcome/manage email has no List-Unsubscribe header (unlike newsletter which has it) |
| 11 | Input validation | nice-to-have | components/contact-form.tsx:512 | ContactForm | textarea lacks `maxLength` HTML attribute — client-side char-count shown but browser doesn't enforce it natively |
| 12 | Error recovery | nice-to-have | app/[locale]/error.tsx:27 | Error boundary useEffect | Error beacon fires on every re-render when `error` reference changes — no dedup guard |

## L2: Gadget Designs (Score: 96/100)

---

### gd-001: tokenLengthGuard
- **Category**: Input validation
- **Type**: utility (inline guard)
- **Lines**: 4
- **For gap**: #1 in lib/mollie-manage-token.ts:116 — verifyTokenWithScope

> Reject tokens over a safe maximum before any crypto work.

```typescript
// Add at the top of verifyTokenWithScope(), before the dot-split:
const MAX_TOKEN_BYTES = 2048
if (!token || token.length > MAX_TOKEN_BYTES) return null
```

**Injection**: `lib/mollie-manage-token.ts` line 117, insert after `try {` open brace.

---

### gd-002: contactBodyLengthCap
- **Category**: Input validation
- **Type**: middleware (inline guard)
- **Lines**: 8
- **For gap**: #2 in app/api/contact/route.ts:15 — POST body parse

> Cap input lengths server-side after parse to prevent >1 MB free-text from reaching sendEmail.

```typescript
// After `const { name, email, subject, message, ... } = body` (line 16):
const MAX_NAME = 200, MAX_EMAIL = 320, MAX_MSG = 4000, MAX_SUBJ = 200
if (
  (name && String(name).length > MAX_NAME) ||
  (email && String(email).length > MAX_EMAIL) ||
  (message && String(message).length > MAX_MSG) ||
  (subject && String(subject).length > MAX_SUBJ)
) {
  return attachRequestId(NextResponse.json({ error: 'Input too long' }, { status: 400 }), reqId)
}
```

---

### gd-003: severityTransitionLog
- **Category**: Logging/observability
- **Type**: utility (inline addition)
- **Lines**: 7
- **For gap**: #3 in lib/payment-failure-tracker.ts:65 — recordFailure

> Emit a structured console.warn whenever severity escalates so Vercel logs capture transitions.

```typescript
// In recordFailure(), after computing `severity` (line 72), add:
const prevSeverity: FailureSeverity =
  (prev?.count ?? 0) === 0 ? 'first' : (prev?.count ?? 0) === 1 ? 'at-risk' : 'action-required'
if (severity !== prevSeverity || count === 1) {
  console.warn('[payment-failure-tracker] severity', { vendor, customerId, count, severity, prevSeverity })
}
```

---

### gd-004: resetFailureLog
- **Category**: Logging/observability
- **Type**: utility (inline addition)
- **Lines**: 4
- **For gap**: #4 in lib/payment-failure-tracker.ts:80 — resetFailures

> Log when a counter resets so payment recovery is observable.

```typescript
// In resetFailures(), after _store.set(...) (line 87), add:
const prevCount = prev?.count ?? 0
if (prevCount > 0) {
  console.info('[payment-failure-tracker] reset', { vendor, customerId, prevCount })
}
```

---

### gd-005: cancelResetFailures
- **Category**: Input validation / state management
- **Type**: utility (one call-site addition)
- **Lines**: 3
- **For gap**: #5 in lib/payment-failure-tracker.ts — no reset on cancel

> Call resetFailures on subscription cancel so the in-memory counter doesn't haunt a re-enrolling donor.

```typescript
// In handleMollieSubscriptionCanceled (lib/payment-handlers.ts), after the product guard (line 1018):
if (subscription.customerId) {
  resetFailures('mollie', subscription.customerId)
}
```

---

### gd-006: mollieManageOptions
- **Category**: Error recovery (CORS)
- **Type**: handler
- **Lines**: 10
- **For gap**: #6 in app/api/mollie-manage/route.ts — no OPTIONS

> Add OPTIONS handler so CORS preflight from browser-based integrations gets a proper 204.

```typescript
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.SITE_BASE_URL ?? 'https://alpacasibiza.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    },
  })
}
```

---

### gd-007: xRobotsTagNoindex
- **Category**: Logging/observability (SEO safety)
- **Type**: header addition (inline)
- **Lines**: 5
- **For gap**: #7 in app/api/mollie-manage/status/route.ts:83 — no X-Robots-Tag

> Add X-Robots-Tag: noindex to the HTML response so Googlebot respects it even if it ignores the <meta> tag.

```typescript
// In htmlPage() function (status/route.ts, cancel/route.ts, update-payment/route.ts),
// add to the headers object alongside Content-Type:
headers: {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
}
```

---

### gd-008: newsletterEmailInputAttrs
- **Category**: Input validation / accessibility
- **Type**: attribute addition
- **Lines**: 3
- **For gap**: #8 in components/newsletter-form.tsx:52 — missing inputMode + maxLength

> Add inputMode and maxLength to the newsletter email field for mobile UX and paste-size cap.

```tsx
// On the <input type="email" ...> element (line 52), add:
inputMode="email"
autoComplete="email"
maxLength={320}
```

---

### gd-009: plainTextFallback
- **Category**: Error recovery (deliverability)
- **Type**: utility addition to mailer.ts
- **Lines**: 8
- **For gap**: #9 in lib/mailer.ts — HTML-only sends; no text/plain

> Add a `text` param to SendEmailOptions and pass it to Resend so spam filters don't penalise HTML-only.

```typescript
// In SendEmailOptions, add:
text?: string
// In sendEmail(), add to resend.emails.send():
...(text ? { text } : {}),
// Callers can then pass text: buildPlainText(html) or a simple stripped version.
```

---

### gd-010: mollieManageListUnsubscribe
- **Category**: Logging/observability (CAN-SPAM compliance)
- **Type**: call-site addition
- **Lines**: 5
- **For gap**: #10 in app/api/mollie-manage/route.ts:169 — no List-Unsubscribe on manage email

> Pass listUnsubscribeUrl to sendEmail for the manage email so it gets RFC 8058 headers.

```typescript
// In POST (mollie-manage/route.ts), on the sendEmail({ to: email, subject, html }) call (line 169):
await sendEmail({
  to: email,
  subject,
  html,
  listUnsubscribeUrl: `${SITE_BASE_URL}/en/adopt#manage`,
})
```

---

### gd-011: contactTextareaMaxLength
- **Category**: Input validation
- **Type**: attribute addition
- **Lines**: 3
- **For gap**: #11 in components/contact-form.tsx:512 — textarea missing maxLength HTML attribute

> Add maxLength={MESSAGE_MAX} so the browser's built-in constraint fires before the counter reaches 2000.

```tsx
// On the <textarea id="contact-message" ...> element (line 512), add:
maxLength={MESSAGE_MAX}
// MESSAGE_MAX is already declared as 2000 at line 79 in the same file.
```

---

### gd-012: errorBeaconDedup
- **Category**: Logging/observability
- **Type**: ref guard
- **Lines**: 8
- **For gap**: #12 in app/[locale]/error.tsx:27 — useEffect fires on every render, not once per error

> Guard with a ref so the beacon fires exactly once per unique error digest.

```typescript
// Add at top of Error component body:
const reportedRef = useRef<string | null>(null)
// In useEffect, before fetch():
const key = error.digest ?? error.message
if (reportedRef.current === key) return
reportedRef.current = key
// Change dep array to: [error.digest, error.message]
```

---

## L3: Injection Plan

Injection planning requires `deep` mode.

## L4: Gadget Inventory

Inventory tracking requires `deep` mode.

## Scoring

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: Gap Scan | 76 | 35% | 26.60 |
| L2: Gadget Design | 96 | 30% | 28.80 |
| L3: Injection Plan | N/A | 20% | N/A |
| L4: Gadget Inventory | N/A | 15% | N/A |
| **Composite** | | | **85** |

Normalized: (26.60 + 28.80) / 0.65 = **85**

## Changes Since Last Report (ep-002)

**NEW** (12 items — all in newly scanned areas not covered by ep-002):
- [NEW] Token length cap missing in mollie-manage-token.ts
- [NEW] Contact API missing server-side input length limits
- [NEW] payment-failure-tracker missing severity transition logging
- [NEW] payment-failure-tracker missing reset log
- [NEW] payment-failure-tracker not called on subscription cancel
- [NEW] mollie-manage POST missing OPTIONS handler
- [NEW] mollie-manage status GET missing X-Robots-Tag header
- [NEW] newsletter-form missing inputMode + maxLength
- [NEW] mailer.ts no plain-text fallback
- [NEW] mollie-manage email missing List-Unsubscribe
- [NEW] contact-form textarea missing maxLength HTML attr
- [NEW] error boundary beacon fires on every re-render (no dedup)

> Trend tracking: 3 reports exist. Direction: 77 → 82 → 85 (improving, +8 total).
