# Constraint-Relaxed Audit — 2026-06-06

## TL;DR

- Most surprising: previously-protected files contain 3 of the 5 real bugs — the log-level inversion, the Mollie welcome email missing `replyTo`, and the unescaped portal/confirm URLs in email templates.
- **5 real bugs** found (one causes silent wrong log alerting; two are missing email headers; one is unescaped URL in HTML; one is a wiring gap where a feature is promised but not delivered).
- **4 of 5 real bugs** are inside previously-protected files (`lib/payment-handlers.ts`, `lib/email-templates.ts`, `app/api/stripe-webhook/route.ts`).

---

## Findings

### Bucket I — Real bugs (would cause incorrect behavior)

**I-1** `app/api/stripe-webhook/route.ts:207` — Log-level inversion on `invoice.payment_failed`

```
const level = failedResult.reason === 'ok' ? 'warn' : 'error'
```

`reason === 'ok'` means the handler succeeded (donor + owner both notified). That is the **normal** path and should log at `info`, not `warn`. Every successful invoice failure notification is logged as a warning, and every actual send failure is logged as an error. The condition is backwards relative to every other handler in the same file (compare line 121 for checkout: `missing-email` → `warn`, everything else → `error`). This causes alert noise on every successful dunning notification and buries genuine failures.

**Fix:** Invert the condition: `const level = failedResult.reason === 'ok' ? 'info' : (failedResult.reason === 'missing-donor-email' || failedResult.reason === 'recovered-no-notify' ? 'warn' : 'error')`
Severity: **HIGH** (misrouted alerting in production)
Protected file: yes

---

**I-2** `lib/payment-handlers.ts:1075–1097` — Mollie welcome email missing `replyTo`

`sendMollieWelcomeQuiet()` builds the welcome email and sets `listUnsubscribeUrl`, but never sets `replyTo`. The Stripe path (line 293) always sets `replyTo: contactEmail`. Gmail/Yahoo 2026 bulk-sender rules (already documented in the CLAUDE.md failsafe map for the Stripe path, line ~266) require both `List-Unsubscribe` and a working `reply-to` on commercial transactional mail. The Mollie welcome is missing the `replyTo` field.

**Fix:** Add `replyTo: process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'` to the `sendEmail` call in `sendMollieWelcomeQuiet` at line ~1075.
Severity: **MEDIUM** (deliverability risk; could increase spam-folder placement for Mollie adopters)
Protected file: yes

---

**I-3** `lib/email-templates.ts:404, 742` — Unescaped URL in text node (two templates)

`buildNewsletterConfirmEmail` (line 404) renders `${confirmUrl}` raw in a text node:
```html
<p>Or copy this link into your browser:<br/>${confirmUrl}</p>
```
`buildBillingPortalEmail` (line 742) does the same with `${portalUrl}`.

Both functions escape the URL in the `href` attribute (`escapedConfirmUrl`, `escapedPortalUrl`) but forgot the plain-text copy fallback. These are server-constructed URLs but Stripe portal URLs contain `?` and `&` which are safe in text nodes — the risk here is theoretical (a crafted URL with `<script>` injection), but for a pattern documented in PRACTICES.md as requiring escapeHtml on all user-controlled values before HTML insertion, this is a failsafe violation.

**Fix:** Replace `${confirmUrl}` → `${escapedConfirmUrl}` at line 404; replace `${portalUrl}` → `${escapedPortalUrl}` at line 742.
Severity: **LOW** (URLs are server-generated, not user-controlled; XSS vector is theoretical)
Protected file: yes (`lib/email-templates.ts`)

---

**I-4** `lib/payment-handlers.ts:1160` + `sendMollieWelcomeQuiet` — Mollie path never sends discount-codes email but owner notification claims it does

The Mollie owner notification at line 1160 tells the owner:
```
"Donor has already received the welcome email; discount-codes follow within 48h"
```
But `handleMolliePaymentPaid` → `sendMollieWelcomeQuiet` never calls `buildAdoptDiscountCodesEmail` and never schedules a follow-up codes email. The Stripe path (`handleStripeCheckoutCompleted`, line ~297–303) does both in parallel. The Mollie path only sends the welcome. Mollie adopters never receive the discount-codes email that the welcome email text also references (line 307 of `email-templates.ts`: "we'll send a follow-up email with your returning-supporter discount codes").

**Fix:** Add a second `sendEmail` call in `sendMollieWelcomeQuiet` or in the `handleMolliePaymentPaid` monthly-first / yearly-oneoff branches, scheduling the codes email +5 min. Alternatively mirror exactly what Stripe does in `handleStripeCheckoutCompleted`.
Severity: **HIGH** (Mollie adopters promised discount codes in welcome email; codes never arrive — broken promise and revenue leakage on the codes partner offer)
Protected file: yes

---

**I-5** `lib/email-templates.ts:410–419` — Orphaned / stale JSDoc block for `buildBillingPortalEmail` left above `buildMollieManageEmail`

Lines 410–419 contain a JSDoc block that ends without attaching to any function:
```js
/**
 * Email containing a one-time Stripe Customer Portal link.
 * ...
 */
/**
 * Email containing one-click cancel links for a donor's Mollie subscription(s).
 * ...
 */
export function buildMollieManageEmail ...
```
The first comment (lines 410–419) describes `buildBillingPortalEmail` but that function is defined at line 727. The double-comment means the second block (`buildMollieManageEmail`) is the one that attaches to the function; the first is dead orphaned documentation. Any tool that scans JSDoc comments for API generation will produce incorrect output.

**Fix:** Delete lines 410–419 (the orphaned `buildBillingPortalEmail` JSDoc block); the real JSDoc is at line 727.
Severity: **LOW** (documentation only; no behavioral effect)
Protected file: yes

---

### Bucket II — Dead code / unused exports

**II-1** `lib/payment-vendor.ts:155–167` — `stripeConnectAdapter()` function is unreachable dead code

`stripeConnectAdapter()` is defined and always throws. It is never called by `getPaymentAdapter()` (the `stripe-connect` case routes to `stripeConnectVendorGuardAdapter()` instead). The function body has a `// TODO: DEFER UNTIL TENANT #1 SIGNS` comment and a `throw` as its first statement. The `eslint-disable-next-line` comment above it confirms it was already recognised as unused.

**Fix:** Delete the function; the guard adapter (`stripeConnectVendorGuardAdapter`) already covers the deferred-vendor case with appropriate logging. Keep the `stripeConnectVendorGuardAdapter`.
Severity: **LOW** (no runtime effect; confuses the code path)

---

**II-2** `lib/email-templates.ts:123` — Duplicate `AdoptTier` type

`AdoptTier = 'monthly' | 'yearly'` is independently defined in three files:
- `lib/adopt-checkout-state.ts:9`
- `lib/email-templates.ts:123`
- `lib/payment-vendor.ts:48` (canonical, with `isAdoptTier` guard)

All call sites that use it for actual logic import from `lib/payment-vendor`. The email-templates copy is only used internally within `email-templates.ts`. The `adopt-checkout-state.ts` copy is also self-contained.

**Fix:** Low urgency — no bug. Consider importing from `lib/payment-vendor` in email-templates to reduce drift risk.
Severity: **INFO**

---

**II-3** `lib/route-helpers.ts:17` — `requireOptionalWebhookSecret` is now dead in production call sites

`requireOptionalWebhookSecret` has zero callers in application code (confirmed by grep). The two former callers (`reminder/route.ts`, `review-request/route.ts`) were migrated to `makeWebhookSecretProvider` on 2026-06-06. The CLAUDE.md failsafe map says "kept in route-helpers for any future caller — fail-OPEN by design" — so this is intentional, but effectively dead for now.

**Fix:** No action needed; document in route-helpers that the function is kept for future callers.
Severity: **INFO**

---

### Bucket III — Wiring drift

**III-1** `lib/payment-handlers.ts:1160` vs Stripe path — Mollie discount-codes email never wired (see I-4 above for full detail)

The welcome email body template (email-templates.ts line 307) references discount codes arriving within 48h. The Stripe handler sends them. The Mollie handler does not. These two paths have diverged and the user-facing email explicitly promises something that isn't delivered on the Mollie path.

---

**III-2** `lib/payment-handlers.ts:293` vs `lib/payment-handlers.ts:1095` — Stripe welcome sets `replyTo`, Mollie welcome does not (see I-2 above)

The two welcome-send paths were meant to be symmetric (ADR 016). The Mollie path is missing `replyTo`. All other symmetric fields are present: `listUnsubscribeUrl`, `scheduledAt`, gift handling.

---

**III-3** `lib/email-templates.ts` — Two slightly different `isGift` detection conditions used in the same file's consumers

`handleStripeCheckoutCompleted` checks `giftMessage !== null` (line 218).
`emitMollieAdoptionEvents` checks `typeof meta?.gift_message === 'string'` (line 1009).

The `giftMessage !== null` check passes when `gift_message` is `""` (empty string), while the `typeof ... === 'string'` check also passes for `""`. These are semantically equivalent in practice but structurally inconsistent. Not a live bug today but will diverge if the metadata shape changes.

**Fix:** Standardise on one check. The Stripe version (`!== null`) is already in use at more call sites.
Severity: **INFO**

---

### Bucket IV — Cross-file invariants

**IV-1** `lib/payment-handlers.ts:269` and `lib/payment-handlers.ts:1095` — `CONTACT_EMAIL` read via `process.env` directly, not via `isSet()`

The `contactEmail` variable at line 268 reads:
```ts
const contactEmail = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'
```

`CONTACT_EMAIL` is a Tier 1 env var (MUST set before prod). If someone accidentally sets `CONTACT_EMAIL=TODO_SET_ME`, the `process.env` read returns the sentinel string as-is (truthy), and the welcome email's `replyTo` field becomes `TODO_SET_ME`. The `isSet()` function in `lib/validate-env.ts` specifically handles `TODO_*` sentinels. The same raw read appears at line 1095.

**Fix:** Use `isSet('CONTACT_EMAIL') ? process.env.CONTACT_EMAIL : 'info@alpacasibiza.com'` or introduce a helper that reads tier-1 vars safely.
Severity: **MEDIUM** (sentinel-exposure on a critical email field if owner pastes placeholder without removing it)
Protected file: yes

---

**IV-2** `lib/email-templates.ts:13` vs `lib/config.ts:22` — Duplicate `SITE_BASE_URL` derivation

`email-templates.ts` line 13 duplicates the same `process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alpacasibiza.com'` derivation as `lib/config.ts:22` (SITE_BASE_URL). The comment says "Mirrors SITE_BASE_URL in lib/config.ts (kept inline because email-templates.ts is used by node:test runs that bypass the @/ alias)".

This is a documented tradeoff, not a bug. The two values are kept in sync manually and the fallback is the same. No action needed unless the import path issue is resolved.

Severity: **INFO** (tracked tradeoff)

---

### Bucket V — Failsafe weakening

No failsafe-weakening findings in this pass. The previously-protected files did not introduce any fail-OPEN conversions, secret-check removals, or sentinel bypass changes. The `requireOptionalWebhookSecret` deprecation (II-3) was properly replaced with a symmetric `makeWebhookSecretProvider` call, not a removal.

One **near-miss** (IV-1): `CONTACT_EMAIL` read via raw `process.env` without `isSet()` could deliver a sentinel string as an email address, but the fallback default is hardcoded so it only triggers if `CONTACT_EMAIL` is explicitly set to a `TODO_*` value.

---

### Bucket VI — Test-coverage holes

**VI-1** `lib/payment-handlers.ts:sendMollieWelcomeQuiet` — No test for `replyTo` presence or absence

The Stripe path has 14 unit tests in `lib/payment-handlers.test.ts`. The Mollie path has 8. None of the Mollie tests assert that the `replyTo` field is set (or absent) on the sendEmail call. The bug in I-2 would have been caught by a test asserting `replyTo` is present on the Mollie welcome email.

---

**VI-2** `lib/payment-handlers.ts:handleMolliePaymentPaid` — No test for discount-codes email being absent on Mollie path

No test asserts that `sendEmail` is called exactly N times on the Mollie first-paid path. The Stripe path tests assert `codesScheduled`. There is no symmetric assertion for Mollie. The bug in I-4 would have been caught here.

---

**VI-3** `app/api/stripe-webhook/route.ts:207` — Log level not tested

The route handler is tested indirectly via `payment-handlers.test.ts` but no test asserts the log level of the `invoice.payment_failed` branch. The inversion in I-1 is invisible to the test suite.

---

## Summary

| Bucket | Count |
|--------|-------|
| I — Real bugs | 5 |
| II — Dead code / unused exports | 3 |
| III — Wiring drift | 3 |
| IV — Cross-file invariants | 2 |
| V — Failsafe weakening | 0 (1 near-miss) |
| VI — Test coverage holes | 3 |
| **Total** | **16** |

**Top 5 highest-severity findings:**

1. **I-4** `lib/payment-handlers.ts` — Mollie adopters never receive discount-codes email (promised in welcome body; wired only for Stripe) — HIGH
2. **I-1** `app/api/stripe-webhook/route.ts:207` — Log-level inversion on `invoice.payment_failed` (every normal dunning notification logs as WARN; real failures log as ERROR) — HIGH
3. **I-2** `lib/payment-handlers.ts:1075–1097` — Mollie welcome email missing `replyTo` (deliverability risk under Gmail/Yahoo 2026 rules) — MEDIUM
4. **IV-1** `lib/payment-handlers.ts:268, 1095` — `CONTACT_EMAIL` read via raw `process.env` (sentinel passthrough if `TODO_*` set) — MEDIUM
5. **I-3** `lib/email-templates.ts:404, 742` — Unescaped URL in email text nodes (theoretical XSS via crafted Stripe/Resend URL) — LOW

**Previously-invisible bucket (inside protected files):** 4 of 5 real bugs (I-1, I-2, I-3, I-4) and 1 of 2 cross-file invariants (IV-1) lived entirely in the previously-off-limits files. Zero findings in this audit required touching unprotected lib files to surface.

**Security regression:** None found. No failsafe was weakened. The near-miss (IV-1) is pre-existing and not introduced in a recent change.
