# Peer-Review Handoff — Mollie management routes + payment handlers
**Date:** 2026-05-29
**Scope:** working-tree changes (uncommitted) on:
- app/api/mollie-manage/{cancel,status,update-payment,route}.ts
- app/api/mollie-webhook/route.ts
- lib/{mollie-manage-token,payment-failure-tracker,payment-handlers,webhook-idempotency}.ts
- app/admin/analytics/subscriptions/page.tsx
- lib/mollie-manage-token.ts

A parallel code-review session ran 8 finder angles + sweep on the staged + working-tree diff. The 6 findings below are owned by YOUR working tree — I did not touch them to avoid an edit war. Please address before commit.

---

## CRITICAL — dead refund ternary (correctness, payments)

**File:** `app/api/mollie-webhook/route.ts:163`

The canceled-seed refund branch:
```ts
amount: payment.metadata?.tier === 'yearly'
  ? undefined
  : undefined,
```

Both ternary arms are `undefined`. The `tier === 'yearly'` distinction is silently lost; Mollie interprets missing `amount` as a full refund regardless of intent.

**Failure scenario:** yearly €900 sub triggers canceled-seed branch → full €900 refund instead of (presumably) the verification-charge subset.

**Suggested fix:** either delete the ternary (if full-refund-always was intended), or wire it to a real amount computation pulled from `payment.amount` and the seed price constants. Make the intent explicit.

---

## HIGH — CSRF Origin-null bypass

**Files:**
- `app/api/mollie-manage/cancel/route.ts:126`
- `app/api/mollie-manage/update-payment/route.ts:135`

```ts
if (origin && origin !== SITE_BASE_URL) { ...block... }
```

The `origin &&` short-circuit means requests with NO Origin header pass through. curl, scripts, antivirus/email-scanner pre-fetchers, and some proxies POST without Origin.

**Failure scenario:** attacker captures 7-day cancel token (forwarded email, mail-server log scrape). `curl -X POST -d token=<leaked>` with no Origin → guard short-circuits → mollie.customerSubscriptions.cancel fires → donor's sub silently cancelled.

**Suggested fix:** treat null Origin as same-origin only if Sec-Fetch-Site is 'same-origin' OR Referer is SITE_BASE_URL. Or: require a same-origin Sec-Fetch-Site as primary, fall back to Origin/Referer. Don't trust missing-headers cases.

---

## HIGH — resetFailures wipes adopt counter across products

**File:** `lib/payment-handlers.ts:575`

`handleMolliePaymentPaid` calls `resetFailures('mollie', customerId)` unconditionally on every payment.paid — before checking `product === 'adopt-a-paca'`.

**Failure scenario:** donor with 2 adopt SEPA failures (severity='at-risk') makes a future one-off €30 shop purchase under the same Mollie customer → shop payment.paid webhook → resetFailures wipes the at-risk counter. Donor's next adopt failure registers 'first' instead of 'action-required'.

**Suggested fix:** scope resetFailures to product, e.g. `resetFailures('mollie', customerId, 'adopt-a-paca')` and key the tracker by `vendor:customerId:product`.

---

## HIGH — payment-failure-tracker dedup returns wrong severity

**File:** `lib/payment-failure-tracker.ts:99`

Dedup-hit branch returns `severity: severityFor(Math.max(1, count))` where `count = prev?.count ?? 0`. When the counter was reset (count=0) but the attempt-dedup key is still alive, a late Mollie retry returns severity='first' for a customer who has zero current failures.

**Failure scenario:** P1 fails → counter=1, attempts['P1'] set. Donor recovers via update-payment → resetFailures sets count=0. Webhook-idempotency Map cleared on cold start. Mollie re-delivers P1 (within 4d attempts TTL) → dedup branch hits → returns count=0, severity='first'. Donor receives 'payment failed' email after a successful recovery.

**Suggested fix:** track an `isRecovered` flag on reset, and return `{ count: 0, severity: 'none' as const, isFirstRecord: false }` from the dedup branch when prev.count is 0 (already-recovered). Or skip emitting any caller-visible severity when isFirstRecord=false.

---

## MEDIUM — update-payment 500-loop on missing mandateId

**File:** `app/api/mollie-webhook/route.ts:138`

The update-payment branch returns HTTP 500 when `payment.mandateId` is missing, hoping Mollie retry surfaces it. But mandateId on a sequenceType=first paid event tends to STAY null in the rare card/PayPal edge cases the comment names — retries deliver the same null. After 18h Mollie drops the event.

**Failure scenario:** rare card/PayPal first.paid produces null mandateId. Code 500s, Mollie retries 18h all returning 500, gives up. Donor's €75 verification charge cleared, no mandate, no welcome, no subscription link — strictly worse than the previous 'log warn + continue' path.

**Suggested fix:** if mandateId is null on a paid event AND status='paid', log + send the welcome anyway + flag an owner-action ticket (manual mandate). Don't 500.

---

## MEDIUM — 60s snapshot cache poisons errors + truncated state

**File:** `app/admin/analytics/subscriptions/page.tsx:87`

The `globalForSnapshot.__subsSnapshot` cache stores any payload — success, transient error, AND truncated state. After a 1s Mollie blip OR a 500-row cap trip, every admin load for 60s sees the cached failure/truncated state with no force-refresh path.

**Failure scenario:** Mollie blips → cache stores fetchError. Next 60s every admin/refresh shows the error banner even after recovery. Owner can't see if a Mollie-dashboard cancellation took effect.

**Suggested fix:** don't cache error or truncated payloads — only cache fully-successful, non-truncated snapshots. On error, fetch fresh each time. Optionally accept `?refresh=1` query to bypass the cache.

---

## Additional notes (not blocking but worth knowing)

- `lib/mollie-manage-token.ts` duplicates ~95% of `lib/newsletter-token.ts`. The MAX_TOKEN_BYTES=2048 CPU-DoS guard added here is NOT in newsletter-token.ts — newsletter still vulnerable to the same multi-MB HMAC DoS. Backport it.
- `escapeAttr` in `app/api/mollie-manage/update-payment/route.ts:76` is a near-clone of `escapeHtml` in `lib/html.ts`. Use the canonical one.
- Three near-identical `htmlPage()` shells across cancel/status/update-payment routes. Lift to `lib/mollie-manage/html-shell.ts` to keep brand/CSP changes in sync.
- `trackKey = 'unknown:' + paymentId` fallback in `payment-handlers.ts:348` and `:826` creates orphan counters that never get cleared by the customerId-keyed resetFailures.

---

## What the other AI fixed in parallel (no action needed)

- AlpacaFunFactCarousel: index clamp + facts useMemo + dead rafRef removed
- AdoptGiftAdoption: 300ms debounce + router.push → router.replace + today useMemo
- filterAlpacas + parseListParam moved to lib/alpacas/filter.ts (server-safe)
- AdoptionFAQ deleted (dead code; existing FAQ component covers it)

Findings I deferred for product decision (touched MY code only):
- Gift adoption gift_* params currently NOT threaded into Stripe/Mollie metadata or welcome email. The form captures intent but the recipient-email/delivery-date plumbing is owner-blocked (which welcome template? which delivery scheduling mechanism?). Added OWNER_INPUT_NEEDED entry — see OWNER_INPUT_NEEDED.md.
