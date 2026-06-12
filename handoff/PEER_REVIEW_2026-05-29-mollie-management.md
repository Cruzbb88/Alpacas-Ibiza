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

## Status update 2026-06-05 — 3-Q audit (claude-code session)

Applied the 3-question test to every item: Q1 does the named line still exhibit the bug? Q2 is there a clear fix path? Q3 would fixing break callers?

Items 1, 2, 3 (htmlPage shells), 5, and note 4 were already fixed by the time this audit ran (14 days of codebase evolution). Items 3 (resetFailures product-scope), 4 (dedup returns wrong severity), 6 (cache poisons errors) and notes 1 and 2 still had bugs — fixed in this session.

---

## CRITICAL — dead refund ternary (correctness, payments)

**Status: CLOSED (ALREADY-FIXED, no code change needed)**

**File:** `app/api/mollie-webhook/route.ts:163`

~~The canceled-seed refund branch:~~
~~```ts~~
~~amount: payment.metadata?.tier === 'yearly'~~
~~  ? undefined~~
~~  : undefined,~~
~~```~~

~~Both ternary arms are `undefined`. The `tier === 'yearly'` distinction is silently lost; Mollie interprets missing `amount` as a full refund regardless of intent.~~

**Verified current code (2026-06-05):** The ternary is gone. The refund block at lines 193–197 now calls `payments.refunds.create({ paymentId: payment.id })` with no `amount` field, and a comment explains the rationale (full refund of verification charges is correct). The intent is explicit.

---

## HIGH — CSRF Origin-null bypass

**Files:**
- `app/api/mollie-manage/cancel/route.ts:126`
- `app/api/mollie-manage/update-payment/route.ts:135`

**Status: CLOSED (ALREADY-FIXED, no code change needed)**

~~```ts~~
~~if (origin && origin !== SITE_BASE_URL) { ...block... }~~
~~```~~

~~The `origin &&` short-circuit means requests with NO Origin header pass through.~~

**Verified current code (2026-06-05):** Both routes now call `isSameOriginPost(request)` from `lib/same-origin-guard.ts`. That helper REJECTS missing Origin (returns false when origin is null). The old short-circuit is gone. The same-origin-guard module documents the rationale for the strict policy and the one known exception path.

---

## HIGH — resetFailures wipes adopt counter across products

**File:** `lib/payment-handlers.ts:575`

**Status: CLOSED — fixed 2026-06-05**

`handleMolliePaymentPaid` called `resetFailures('mollie', customerId)` unconditionally before the `isAdopt` check.

**Fix applied:** Added `&& isAdopt` guard to the `resetFailures` block so non-adopt products (e.g. shop payments) can no longer wipe the adopt-a-paca failure ladder. `isAdopt` is already computed from `payment.metadata?.product` before the guard. Comment explains the cross-product bug.

**Changed:** `lib/payment-handlers.ts` — `if (payment.customerId)` → `if (payment.customerId && isAdopt)`.

---

## HIGH — payment-failure-tracker dedup returns wrong severity

**File:** `lib/payment-failure-tracker.ts:99`

**Status: CLOSED — fixed 2026-06-05**

Dedup-hit branch returned `severity: severityFor(Math.max(1, count))` where `count = prev?.count ?? 0`. After reset (count=0) + late Mollie retry, returned severity='first' to a recovered customer, triggering a spurious "payment failed" email.

**Fix applied (3 parts):**
1. `lib/payment-failure-tracker.ts`: Added `'none'` to `FailureSeverity` type. Dedup branch with `count === 0` now returns `{ count: 0, severity: 'none', isFirstRecord: false }` instead of `severity: 'first'`. Updated `_internalGetStoreSnapshot` return type to use `FailureSeverity`.
2. `lib/payment-handlers.ts` (Mollie failed handler): Guard added — when `severity === 'none'` return early without sending any email.
3. `lib/payment-handlers.ts` (Stripe failed handler): Same guard added.
4. `lib/payment-failure-tracker-readers.ts`: Comment added to note 'none' never appears in snapshot (store tracks real counts, not dedup-hit sentinel).

---

## MEDIUM — update-payment 500-loop on missing mandateId

**File:** `app/api/mollie-webhook/route.ts:138`

**Status: CLOSED (ALREADY-FIXED — deliberate 500, documented in CLAUDE.md)**

The 500 on missing mandateId is an intentional retry trigger. The CLAUDE.md failsafe map documents: "missing mandateId → 500 (Mollie retries)". The code comment at lines 160–168 explains the edge case and the decision to defer vs. accept.

The "stuck detector" for the rare card/PayPal null-mandateId-on-every-retry case was not implemented — accepted as documented degradation per the CLAUDE.md tradeoff entry.

---

## MEDIUM — 60s snapshot cache poisons errors + truncated state

**File:** `app/admin/analytics/subscriptions/page.tsx:87`

**Status: CLOSED — fixed 2026-06-05**

The original handoff was PARTIAL: the DB-preference path was added (lines 199–229) but error payloads and truncated payloads were still cached at lines 135–148 and 143–148 respectively.

**Fix applied:** `app/admin/analytics/subscriptions/page.tsx` — removed `globalForSnapshot.__subsSnapshot = ...` from the truncated branch and the catch branch. Only the fully-successful non-truncated path (line 151) now writes to the cache. Error and truncated responses are returned fresh each time. Comment explains the rationale.

---

## Additional notes (not blocking but worth knowing)

### Note 1 — MAX_TOKEN_BYTES backport to newsletter-token.ts
**Status: CLOSED — fixed 2026-06-05**

`lib/newsletter-token.ts` was missing the 2048-byte CPU-DoS guard present in `lib/mollie-manage-token.ts`.

**Fix applied:** Added `const MAX_TOKEN_BYTES = 2048` and `if (!token || token.length > MAX_TOKEN_BYTES) return null` at the top of `verifyToken()` in `lib/newsletter-token.ts`.

### Note 2 — escapeAttr near-clone in update-payment/route.ts
**Status: CLOSED — fixed 2026-06-05**

`escapeAttr` in `update-payment/route.ts` was a near-clone of `escapeHtml` from `lib/html.ts` (which escapes `&`, `<`, `>`, `"`, `'`, `/`).

**Fix applied:** Removed the local `escapeAttr` function and replaced its single call-site with `escapeHtml(token)` (the route already imported `escapeHtml` from `@/lib/html`).

### Note 3 — htmlPage() shells across cancel/status/update-payment
**Status: CLOSED (ALREADY-FIXED, no code change needed)**

All three routes now import `htmlMollieManagePage` from `lib/mollie-html-response.ts`, which was extracted in a prior session. The shell is unified.

### Note 4 — `trackKey = 'unknown:' + paymentId` orphan counters
**Status: CLOSED (ACCEPTED as documented degradation)**

`payment-handlers.ts` at the `handleMolliePaymentFailed` caller now includes an explicit comment at line ~1238 explaining why `unknown:` namespace is intentional. The orphan-counter behavior is accepted — it cannot be tied to a recovery event, but it's visible in logs and expires via TTL purge.

---

## What the other AI fixed in parallel (no action needed)

- AlpacaFunFactCarousel: index clamp + facts useMemo + dead rafRef removed
- AdoptGiftAdoption: 300ms debounce + router.push → router.replace + today useMemo
- filterAlpacas + parseListParam moved to lib/alpacas/filter.ts (server-safe)
- AdoptionFAQ deleted (dead code; existing FAQ component covers it)

Findings I deferred for product decision (touched MY code only):
- Gift adoption gift_* params currently NOT threaded into Stripe/Mollie metadata or welcome email. The form captures intent but the recipient-email/delivery-date plumbing is owner-blocked (which welcome template? which delivery scheduling mechanism?). Added OWNER_INPUT_NEEDED entry — see OWNER_INPUT_NEEDED.md.
