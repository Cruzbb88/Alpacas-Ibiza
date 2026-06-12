# API Route Categorization — 2026-06-06

## TL;DR
- Bucket A (vendor-mandated, cannot consolidate): **4 routes**
- Bucket B (auth-boundary separated, should not consolidate): **22 routes**
- Bucket C (caching-contract separated): **4 routes**
- Bucket D (Next.js convention / method-shape separated): **5 routes**
- Bucket E (genuinely shareable logic, consolidation candidates): **25 routes**
- Total: **60**

---

## Verdict

**Could we have 1 mega-route? No.** The Bucket A routes cannot move (vendor URL contracts). The Bucket B routes MUST stay separated because collapsing auth classes into one handler creates blast-radius: an admin session bug would expose public form logic, and a CRON_SECRET leak would expose payment webhook logic. The Bucket C routes need incompatible cache headers and cannot share a single response. Even ignoring all of those, "1 route" would be a 3,000-line dispatch table that is harder to audit and harder to reason about than 60 small files.

**The honest consolidation opportunity is in helpers, not route files.** 5 cron routes share identical boilerplate (auth, Mollie iterate, allSettled fan-out, heartbeat ping). 3 form submission routes share identical guard stacks (honeypot + Turnstile + rate-limit + escapeHtml). 2 checkout pairs (Stripe/Mollie) share identical intent/confirm patterns. Shared helpers would reduce LOC and regression risk without merging files.

---

## Per-route table

| Route | Bucket | Why this bucket | If E: consolidation candidate |
|---|---|---|---|
| `app/api/stripe-webhook/route.ts` | **A** | URL is hardcoded in Stripe Dashboard webhook config; HMAC signature uses raw body; URL is the contract | — |
| `app/api/mollie-webhook/route.ts` | **A** | URL secret embedded in webhook registration (`getMollieWebhookUrl`); Mollie calls this exact URL; URL includes `?secret=` | — |
| `app/api/fareharbor-webhook/route.ts` | **A** | URL hardcoded in FareHarbor dashboard; `x-webhook-secret` header auth; URL is the contract | — |
| `app/api/resend-webhook/route.ts` | **A** | URL registered at Resend dashboard; Svix-signed; URL is the contract | — |
| `app/api/auth/[...nextauth]/route.ts` | **B** | NextAuth catch-all; framework-owned GET+POST; cannot co-locate with anything; JWT session gating foundation for all admin routes | — |
| `app/api/admin/alpacas/delete-upload/route.ts` | **B** | `getServerSession(auth)` gate; admin-only; DELETE method; Vercel Blob mutation — mixing with public routes risks session-leak blast | — |
| `app/api/admin/alpacas/upload/route.ts` | **B** | `getServerSession(auth)` gate; admin-only; multipart POST; Vercel Blob PUT — same | — |
| `app/api/admin/content-stage/route.ts` | **B** | `getServerSession(auth)` gate; admin-only; filesystem write | — |
| `app/api/admin/migration-links/route.ts` | **B** | `getServerSession(auth)` gate; admin-only; Stripe session creation | — |
| `app/api/admin/quarterly-update/route.ts` | **B** | `getServerSession(auth)` gate; admin-only; in-memory store write | — |
| `app/api/admin/quarterly-update/preview/route.ts` | **B** | `getServerSession(auth)` gate; returns HTML email preview; no-store; admin only | — |
| `app/api/admin/quarterly-update/suggest/route.ts` | **B** | `getServerSession(auth)` gate; pure content helper; admin only | — |
| `app/api/admin/replay-event/route.ts` | **B** | `getServerSession(auth)` gate; re-POSTs to live webhooks; admin only | — |
| `app/api/admin/send-test-email/route.ts` | **B** | `getServerSession(auth)` gate + RESEND_API_KEY fail-closed; admin only | — |
| `app/api/admin/suppressions/route.ts` | **B** | `getServerSession(auth)` gate; GET/POST/DELETE methods on suppression list; admin only | — |
| `app/api/analytics/data/route.ts` | **B** | `getServerSession(auth)` gate; admin-only GA4 proxy | — |
| `app/api/setup-probe/route.ts` | **B** | `getServerSession(auth)` gate; admin setup wizard probe; 10 req/60s rate-limit | — |
| `app/api/launch-readiness/route.ts` | **B** | dual-auth: admin session OR CRON_SECRET token; not public; mixed gate | — |
| `app/api/adopt-milestone-emails/route.ts` | **B** | `verifyCronSecret` Bearer-only gate; Vercel cron; must not mix with public routes | — |
| `app/api/adopt-quarterly-update/route.ts` | **B** | `verifyCronSecret` Bearer-only gate; Vercel cron | — |
| `app/api/adopt-renewal-reminders/route.ts` | **B** | `verifyCronSecret` Bearer-only gate; Vercel cron | — |
| `app/api/alpaca-birthday-cards/route.ts` | **B** | `verifyCronSecret` Bearer-only gate; Vercel cron | — |
| `app/api/adopt-deferred-gifts/route.ts` | **B** | `verifyCronSecret` Bearer-only gate; Vercel cron (stub) | — |
| `app/api/owner-digest/route.ts` | **B** | CRON_SECRET Bearer or `?secret=` query gate; Vercel cron | — |
| `app/api/owner-mrr-digest/route.ts` | **B** | `verifyCronSecret` Bearer-only gate; Vercel cron | — |
| `app/api/availability/route.ts` | **C** | `export const revalidate = 1800` (30 min ISR); mixing with no-store routes would force no-store | — |
| `app/api/google-reviews/route.ts` | **C** | `export const revalidate = 21600` (6h ISR); `s-maxage=86400` on success; mixing would kill CDN absorption | — |
| `app/api/search/route.ts` | **C** | `force-static`, `revalidate = 3600`; `s-maxage=86400, stale-while-revalidate=2592000`; most aggressive caching in the project | — |
| `app/api/social-proof/route.ts` | **C** | `export const revalidate = 1800`; `s-maxage=1800, stale-while-revalidate=86400` | — |
| `app/api/checkout/confirm/route.ts` | **D** | Only exists because embedded checkout is a separate mode (`isEmbeddedCheckout()` gate); gated off by default (returns 404); same auth class as `/api/checkout` | Stripe embedded checkout pair |
| `app/api/checkout/intent/route.ts` | **D** | Same as above — stage 1 of embedded migration; 404 unless `CHECKOUT_MODE=embedded` | Stripe embedded checkout pair |
| `app/api/mollie-checkout/confirm/route.ts` | **D** | Mollie equivalent of `checkout/confirm`; gated by `isEmbeddedCheckout()` | Mollie embedded checkout pair |
| `app/api/mollie-checkout/intent/route.ts` | **D** | Mollie equivalent of `checkout/intent`; gated by `isEmbeddedCheckout()` | Mollie embedded checkout pair |
| `app/api/newsletter/confirm/route.ts` | **D** | Separate from `/newsletter` by design: double opt-in requires separate GET URL that can't share route-file with POST signup (different URL, different token scope, different HTTP method semantics) | — |
| `app/api/contact/route.ts` | **E** | Public form: honeypot + Turnstile + per-IP rate-limit + escapeHtml + sendEmail to owner | shares guard stack with `commission`, `waitlist`, `gdpr-request` |
| `app/api/commission/route.ts` | **E** | Public form: identical guard stack to `contact` (honeypot `phone_extension`, Turnstile, rate-limit, escapeHtml, sendEmail to owner) | shares guard stack with `contact`, `waitlist` |
| `app/api/waitlist/route.ts` | **E** | Public form: identical guard stack (honeypot `business_name`, Turnstile, per-IP + per-email rate-limit, escapeHtml, sendEmail to owner and subscriber) | shares guard stack with `contact`, `commission` |
| `app/api/gdpr-request/route.ts` | **E** | Public form: same guard stack (honeypot `business_name`, Turnstile, per-IP rate-limit, escapeHtml, sendEmail to owner); adds Mollie discovery step | shares guard stack with `contact`, `commission`, `waitlist` |
| `app/api/checkout/route.ts` | **E** | Stripe adopt checkout; IP rate-limit + SDK guard + `requireEnvOrReturn503` pattern | shares Stripe boilerplate with `skein-checkout`, `checkout/intent`, `billing-portal` |
| `app/api/skein-checkout/route.ts` | **E** | Stripe one-off checkout; identical SDK guard + rate-limit + `requireEnvOrReturn503` pattern; same `SITE_BASE_URL` redirect rule | shares Stripe boilerplate with `checkout` |
| `app/api/mollie-checkout/route.ts` | **E** | Mollie equivalent of `checkout`; same rate-limit + SDK guard + fail-closed pattern; `SITE_BASE_URL` redirect | shares Mollie boilerplate with `mollie-manage`, `mollie-manage/cancel`, `mollie-manage/update-payment` |
| `app/api/billing-portal/route.ts` | **E** | Stripe customer portal; honeypot + Turnstile + dual rate-limit + email-oracle closure; `SITE_BASE_URL` redirect | shares Stripe SDK guard + oracle closure pattern with `recover-certificate`, `mollie-manage` |
| `app/api/mollie-manage/route.ts` | **E** | Mollie equivalent of `billing-portal`; exact same anti-oracle + Turnstile + dual rate-limit + email side-channel pattern | shares oracle closure pattern with `billing-portal`, `recover-certificate` |
| `app/api/mollie-manage/cancel/route.ts` | **E** | Token-gated HTML page; HMAC cancel token; same-origin POST guard; calls `handleMollieSubscriptionCanceled` | shares token-gate pattern with `mollie-manage/status`, `mollie-manage/update-payment` |
| `app/api/mollie-manage/status/route.ts` | **E** | Token-gated HTML status dashboard; `verifyMollieStatusToken`; renders HTML via `htmlMollieManagePage` | shares token-gate + HTML response pattern with `mollie-manage/cancel`, `mollie-manage/update-payment` |
| `app/api/mollie-manage/update-payment/route.ts` | **E** | Token-gated SEPA re-mandate; `verifyMollieUpdatePaymentToken`; GET = HTML form, POST = creates Mollie payment | shares token-gate + HTML response pattern with `mollie-manage/cancel`, `mollie-manage/status` |
| `app/api/recover-certificate/route.ts` | **E** | Same anti-oracle + dual rate-limit + Turnstile pattern as `billing-portal` and `mollie-manage`; looks up Stripe+Mollie customers and emails certificate link | shares oracle closure pattern with `billing-portal`, `mollie-manage` |
| `app/api/newsletter/route.ts` | **E** | Newsletter POST: honeypot + Turnstile + dual rate-limit + HMAC token sign + sendEmail; same form guard stack as `contact` family, plus double opt-in logic | shares guard stack pattern; double opt-in token logic shared with `newsletter/confirm`, `newsletter/unsubscribe` |
| `app/api/newsletter/unsubscribe/route.ts` | **E** | HMAC token verify + `unsubscribe()` + 303 redirect / 200 JSON; scope guard against confirm tokens | shares token + scope pattern with `newsletter/confirm`, `email-preferences` |
| `app/api/email-preferences/route.ts` | **E** | Per-type opt-out; HMAC token verify; GET returns HTML form, POST mutates Stripe+Mollie metadata; same scope-guard pattern as newsletter/unsubscribe | shares token-gate + HTML interstitial pattern with `newsletter/unsubscribe`, `mollie-manage/*` |
| `app/api/adopt-certificate/route.ts` | **E** | PDF render via `@react-pdf/renderer`; rate-limited public GET; dynamic import guard; no-store | shares PDF render pattern with `donor-receipt` |
| `app/api/donor-receipt/[sessionId]/route.ts` | **E** | PDF render via same lib; rate-limited GET; dynamic import guard; dual Stripe+Mollie path; no-store | shares PDF render pattern with `adopt-certificate` |
| `app/api/checkout-session/[id]/route.ts` | **E** | Stripe session lookup for thank-you name personalisation; rate-limited GET; no-store | shares Stripe SDK lookup pattern with `calendar/renewal/[sessionId]` |
| `app/api/calendar/renewal/[sessionId]/route.ts` | **E** | Stripe session lookup → ICS generation; rate-limited GET; no-store | shares Stripe SDK lookup pattern with `checkout-session/[id]`; shares ICS logic with `tour-ics` |
| `app/api/tour-ics/route.ts` | **E** | ICS file from URL params; rate-limited GET; no-store; `buildICS()` helper | shares ICS generation pattern with `calendar/renewal/[sessionId]` |
| `app/api/adopt-count/route.ts` | **E** | Adopter count proxy; delegates to `getActiveAdopterCount()`; conditional no-store vs s-maxage depending on source | thin wrapper; similar pattern to `social-proof` |
| `app/api/health/route.ts` | **E** | Liveness check; reads `TIER1_KEYS`; no-store | thin wrapper; similar to `setup-probe` and `launch-readiness` (all health-related) |
| `app/api/log-error/route.ts` | **E** | Client error sink; per-IP rate-limit; 4KB cap; 204 always; `appendClientError` | standalone but trivially small |
| `app/api/cancel-feedback/route.ts` | **E** | Exit-survey sink; per-IP rate-limit; always 200; log only | standalone, trivially small |
| `app/api/reminder/route.ts` | **E** | Manual fallback for tour reminder email; `makeWebhookSecretProvider` fail-open; rate-limited; sends one email | shares email template + guard pattern with `review-request` |
| `app/api/review-request/route.ts` | **E** | Manual fallback for post-tour review-request email; identical guard stack and shape as `reminder` | shares email template + guard pattern with `reminder` |

---

## Consolidation candidates (Bucket E detail)

### 1. The "public form" guard stack — `contact`, `commission`, `waitlist`, `gdpr-request`

All four follow: honeypot check → IP rate-limit → per-email rate-limit (waitlist/gdpr) → Turnstile verify → escapeHtml inputs → sendEmail to owner.

**Proposal:** Extract `lib/public-form-guard.ts` with a `runPublicFormGuard({ body, ip, captchaToken, honeypotField, rateLimitKey })` function that returns `{ ok: boolean; response?: NextResponse }`. Each route calls this once, then does its specific email template. Saves ~60 lines per route × 4 routes = ~240 LOC reduction, zero behavioral change.

Effort: **S** (pure extraction, no logic change).

### 2. Cron runner boilerplate — `adopt-quarterly-update`, `adopt-milestone-emails`, `adopt-renewal-reminders`, `alpaca-birthday-cards`, `owner-mrr-digest`

All five follow: `verifyCronSecret` → Mollie iterate (cap 500) + optional Stripe iterate (cap 1000) → build recipient list → `Promise.allSettled` fan-out → per-recipient idempotency check → `sendEmail` → `pingHeartbeat`.

**Proposal:** Extract `lib/cron-runner.ts` with a `runCron<T>({ name, buildRecipients, sendToRecipient, idempotencyKeyFn, heartbeatKey })` runner function. Each route becomes a thin config object. Saves ~100–150 lines per cron × 5 routes = ~600 LOC reduction. The biggest regression risk is around idempotency key naming (each cron uses a slightly different key format) — document the contract explicitly.

Effort: **M** (shared shape needs careful extraction; each cron has slightly different metadata fields).

### 3. Mollie management token-gated HTML pages — `mollie-manage/cancel`, `mollie-manage/status`, `mollie-manage/update-payment`

All three follow: verify HMAC token with matching scope → GET returns HTML confirmation form → POST mutates Mollie (cancel / status render / create payment) → `htmlMollieManagePage` for response. They already share `htmlMollieManagePage` and `isSameOriginPost`. The token verify functions have the same interface.

**Proposal:** They are already thin after extracting `htmlMollieManagePage`. The remaining duplication is just the boilerplate `requireEnvOrReturn503` + `getMollieClient` setup (~15 lines). Extract a `lib/mollie-manage-helpers.ts` with `getMollieClientOrReturn503(reqId)`. Saves ~30 LOC across 3 routes.

Effort: **S** (trivial helper extraction).

### 4. Oracle-closure email-lookup routes — `billing-portal`, `mollie-manage`, `recover-certificate`

All three follow: honeypot → IP rate-limit → per-email rate-limit → Turnstile → lookup customer in Stripe/Mollie → email response out-of-band → always return `{ ok: true }`. They share the same privacy contract but differ in what they email (portal link vs manage link vs certificate link).

**Proposal:** Extract `lib/oracle-form-guard.ts` mirroring the public-form-guard idea. The lookup and email-send steps remain in each route (too domain-specific), but the outer guard layer (~50 lines per route) is identical. Saves ~100 LOC.

Effort: **S**.

### 5. PDF generation routes — `adopt-certificate`, `donor-receipt`

Both routes: `importReactPdf()` → `React.createElement(PdfComponent, props)` as `ReactElement<DocumentProps>` → `pdfLib.renderToStream(element)` → `new Response(stream, ...)`. The dynamic import pattern, the `@ts-expect-error` on the stream cast, and the rate-limit are identical.

**Proposal:** Extract `lib/pdf-renderer.ts` with a `renderPdfResponse<P>(Component, props, filename)` helper. Both routes call it with their specific component. Saves ~25 lines × 2 = ~50 LOC.

Effort: **S**.

### 6. `reminder` / `review-request` manual fallback routes

These two routes are nearly identical: `makeWebhookSecretProvider` fail-open guard → rate-limit → parse body → `escapeHtml` inputs → call the same email template functions that `fareharbor-webhook` already uses → `sendEmail`. They differ only in the template called and the `scheduledAt` handling.

**Proposal:** Collapse into one route `app/api/send-tour-email/route.ts` that dispatches on `?type=reminder|review-request`. Saves ~80 LOC total.

Effort: **S**.

---

## What honest 1-mega-route would look like

If you collapsed all 60 routes into `app/api/dispatch/route.ts` with `?action=stripe-webhook|contact|checkout|...`:

**What you lose:**
1. **Auth class mixing**: The single handler must fork on auth type before doing anything. A bug in the fork logic could accidentally route an unauthenticated `?action=admin-suppressions` call into the admin branch. Separate files make this impossible — the framework enforces the path.
2. **Cache header contracts**: `search` needs `force-static`; `availability` needs ISR 1800; webhooks need `no-store`. A mega-route gets `no-store` on everything — CDN absorption for Google Reviews (6h) and Search (1h ISR) disappears entirely.
3. **Vendor URL contracts (Bucket A)**: Stripe, Mollie, FareHarbor, and Resend all have the webhook URL hardcoded in their dashboards. You cannot change those URLs without reconfiguring every vendor. These routes cannot be renamed.
4. **Blast radius on deploy errors**: A syntax error in a 3,000-line dispatch table takes down ALL 60 routes simultaneously. Today a bad edit to `contact/route.ts` takes down exactly one route.
5. **Auditability**: Security reviewers auditing the Stripe webhook handling need to read one 320-line file today. In a mega-route they must first understand the entire dispatch table, then find the Stripe branch.

**What you gain:**
- Marginally fewer files to import in a cold-start bundle scan (negligible in Next.js App Router which code-splits by route automatically).
- Nothing else.
