# CLAUDE.md — Alpacas Ibiza site (Claude entry point)

**Read [PRACTICES.md](PRACTICES.md) first.** It owns the rules-of-conduct (pre-flight checks, append protocol, retired rules). Don't duplicate them here.

This file holds two catalogs that PRACTICES doesn't: the in-code failsafe map (with file:line) and the env-var deploy tiers. Both are referenced by code, so they belong with the code.

---

## Pending designer review (DO NOT REVERT without owner sign-off)

| Change | File | Reason | Status |
|---|---|---|---|
| `--accent` darkened L=55%→40% (≈#DD7F3C→#AD561A) | [app/globals.css:43](app/globals.css#L43) | WCAG 1.4.3 — white on old accent was 2.93:1 (FAIL); new is ~7.2:1 (PASS). Visual shift: bright amber → deep burnt-orange on all CTAs. | OWNER REVIEW NEEDED |
| `--foreground` darkened L=30%→18% | [app/globals.css](app/globals.css) | WCAG 1.4.3 — `text-foreground/70` on #F9F9F9 was 3.82:1 (FAIL); at L=18% the /70 blend is ~4.9:1 (PASS). Also updated `--card-foreground`, `--popover-foreground`, `--sidebar-foreground`. Visual shift: body text shifts from medium-slate to deep-slate; /70 body copy visually darker. | OWNER REVIEW NEEDED |

---

## In-code failsafe map (DO NOT WEAKEN)

| Failsafe | Where | Fail mode |
|---|---|---|
| Turnstile widget no-op if site key unset | [components/turnstile-widget.tsx:82](components/turnstile-widget.tsx#L82) | renders `null` |
| Turnstile server fail-open if secret unset | [lib/turnstile.ts:27-34](lib/turnstile.ts#L27-L34) | `{ok:true}` + prod `console.warn` |
| Turnstile prod fail-closed on network error | [lib/turnstile.ts:51-54](lib/turnstile.ts#L51-L54) | asymmetric prod vs dev |
| Availability 503 if keys unset | [app/api/availability/route.ts:11-19](app/api/availability/route.ts#L11-L19) | UI hides date grid, keeps static CTA |
| Google Reviews `{configured:false}` if keys unset | [app/api/google-reviews/route.ts:41-46](app/api/google-reviews/route.ts#L41-L46) | `GoogleReviewsBadge` renders `null` |
| Webhook 503 if secret unset (fail-CLOSED) | [app/api/fareharbor-webhook/route.ts:66-72](app/api/fareharbor-webhook/route.ts#L66-L72) | security-critical, opposite of Turnstile |
| `validateEnv()` startup check — Tier 1 `console.error`, Tier 2 `console.warn` | [instrumentation.ts](instrumentation.ts) → [lib/validate-env.ts](lib/validate-env.ts) | runs once on server boot; never throws |
| `safeEqual()` for shared-secret compare | [lib/secrets.ts](lib/secrets.ts) | timing-attack safe |
| `escapeHtml()` on user input before email HTML | [lib/html.ts](lib/html.ts) | XSS prevention |
| `sanitizeHeader()` strips CR/LF from SMTP subject/name fields | [lib/html.ts](lib/html.ts) `sanitizeHeader()` → [app/api/contact/route.ts](app/api/contact/route.ts), [app/api/commission/route.ts](app/api/commission/route.ts) | CRLF header-injection prevention |
| `replyTo` email regex guard — omits field if invalid (graceful degrade) | [app/api/contact/route.ts](app/api/contact/route.ts), [app/api/commission/route.ts](app/api/commission/route.ts) | malformed `email` body param never reaches Resend; no 400 thrown |
| `fetchWithTimeout()` on every external HTTP call | [lib/fetch.ts](lib/fetch.ts) | 5-6s AbortController |
| `Promise.allSettled()` for per-item fan-out | [lib/booking-engine/fareharbor-adapter.ts](lib/booking-engine/fareharbor-adapter.ts) `getAvailability()` | 1 bad tour ≠ whole API down |
| Mailer THROWS on error (no silent fail) | [lib/mailer.ts:40-42](lib/mailer.ts#L40-L42) | routes catch → 500 |
| `cancelScheduledEmail` is fail-quiet (try/catch returns false) | [lib/mailer.ts:51-58](lib/mailer.ts#L51-L58) | caller continues; safe to call on already-sent emails (Resend no-ops) |
| Admin login fail-closed if ADMIN_USERNAME/PASSWORD unset | [app/api/auth/[...nextauth]/route.ts:13-19](app/api/auth/%5B...nextauth%5D/route.ts#L13-L19) | `authorize()` returns `null` + `console.error` (no default creds) |
| Admin JWT 8h auto-logout | [app/api/auth/[...nextauth]/route.ts:34](app/api/auth/%5B...nextauth%5D/route.ts#L34) | `session.maxAge = 8h` (overrides NextAuth 30-day default) |
| Security headers + CSP Report-Only on all routes | [next.config.mjs:12-63](next.config.mjs#L12-L63) | HSTS / X-Frame SAMEORIGIN / Referrer-Policy / Permissions-Policy / CSP-RO. See [docs/adr/010-csp-report-only-with-gtm-unsafe-inline.md](docs/adr/010-csp-report-only-with-gtm-unsafe-inline.md) |
| In-memory sliding-window rate limit on form routes | [lib/rate-limit.ts](lib/rate-limit.ts) → contact/newsletter/commission (5 req / 5 min per IP) | 429 + Retry-After header; process-scoped (ADR 011 upgrade path) |
| Per-tour FareHarbor URL falls back to base calendar if item ID unset | [lib/config.ts](lib/config.ts) `getFareHarborTourUrl()` | unset ID → general calendar URL via `getFareHarborItemUrl(undefined)`; never inert |
| `requireOptionalWebhookSecret()` shared fail-OPEN guard for reminder/review-request | [lib/route-helpers.ts](lib/route-helpers.ts) | fail-OPEN by design (opposite of `fareharbor-webhook` which is fail-CLOSED) |
| `isValidEmail()` type-narrowing validator | [lib/validate-email.ts](lib/validate-email.ts) | single regex, consolidated from 3 prior copies |
| Admin pages noindex | `app/admin/layout.tsx` metadata | `robots: noindex, nofollow, noarchive, nosnippet` so Google does not crawl `/admin/login` or `/admin/analytics` |
| `global-error.tsx` branded boundary | [app/global-error.tsx](app/global-error.tsx) | replaces default Next error page when root layout itself throws |
| Stripe Checkout 503 if STRIPE_SECRET_KEY unset | [app/api/checkout/route.ts:31-40](app/api/checkout/route.ts#L31-L40) | fail-CLOSED; adopt CTA falls back to mailto in adapter |
| Stripe webhook 503 if STRIPE_WEBHOOK_SECRET unset (fail-CLOSED) | [app/api/stripe-webhook/route.ts:29-38](app/api/stripe-webhook/route.ts#L29-L38) | mirrors fareharbor-webhook pattern; security-critical |
| Stripe Connect adapter throws if accidentally activated | [lib/payment-vendor.ts](lib/payment-vendor.ts) `stripeConnectAdapter()` + guard | DEFER UNTIL TENANT #1 SIGNS — prevents unlicensed money transmission |
| `MapProvider` google-embed falls back to osm-iframe if API key unset | [lib/integrations/map.ts](lib/integrations/map.ts) `googleEmbedProvider.embedUrl()` | fail-open — map always renders (OSM requires no creds) |
| `WebhookSecretProvider` fail-OPEN: missing env → allow through + prod warn | [lib/integrations/webhook-secret.ts](lib/integrations/webhook-secret.ts) `makeWebhookSecretProvider('…', 'fail-open')` | mirrors `requireOptionalWebhookSecret()` |
| `WebhookSecretProvider` fail-CLOSED: missing env → 503 | [lib/integrations/webhook-secret.ts](lib/integrations/webhook-secret.ts) `makeWebhookSecretProvider('…', 'fail-closed')` | mirrors `fareharbor-webhook` guard; security-critical |
| `PaymentProvider.verifyWebhook` fail-CLOSED if secret unset | [lib/integrations/payment-stripe-direct.ts](lib/integrations/payment-stripe-direct.ts) `verifyWebhook()` | returns `{ok:false}` — mirrors fareharbor-webhook; no silent webhook pass-through |
| `PaymentProvider.createCheckoutSession` fail-quiet on missing keys | [lib/integrations/payment-stripe-direct.ts](lib/integrations/payment-stripe-direct.ts) `createCheckoutSession()` | returns `{unconfigured:true, fallbackUrl}` — caller redirects to mailto: |
| `stripeConnectPaymentProvider` throws on activation | [lib/integrations/payment-stripe-connect.ts](lib/integrations/payment-stripe-connect.ts) | DEFER UNTIL TENANT #1 SIGNS — throw prevents unlicensed money transmission (mirrors payment-vendor.ts guard) |
| Mollie checkout 503 if `MOLLIE_API_KEY` or `MOLLIE_WEBHOOK_SECRET` unset | [app/api/mollie-checkout/route.ts](app/api/mollie-checkout/route.ts) | fail-CLOSED; adopt CTA falls back to mailto via [lib/payment-vendor.ts](lib/payment-vendor.ts) mollieAdapter |
| Mollie webhook 503 if `MOLLIE_WEBHOOK_SECRET` unset (fail-CLOSED) | [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) | mirrors stripe-webhook + fareharbor-webhook pattern; security-critical |
| Mollie webhook URL-path secret matched constant-time via `safeEqual()` | [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) | Mollie has no HMAC sigs — URL secret is layer 1, server-side payment fetch (`payments.get`) is layer 2 |
| `molliePaymentProvider.createCheckoutSession` fail-quiet on missing config | [lib/integrations/payment-mollie.ts](lib/integrations/payment-mollie.ts) `createCheckoutSession()` | returns `{unconfigured:true, fallbackUrl}` — caller redirects to mailto (mirrors Stripe direct) |
| `molliePaymentProvider.verifyWebhook` fail-CLOSED if secret/key unset | [lib/integrations/payment-mollie.ts](lib/integrations/payment-mollie.ts) `verifyWebhook()` | returns `{ok:false}` — no silent webhook pass-through |
| Mollie webhook routes payment.failed → handleMolliePaymentFailed (donor + owner emails) | [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) → [lib/payment-handlers.ts](lib/payment-handlers.ts) `handleMolliePaymentFailed()` | SEPA fails are recoverable; donor gets manage-link, owner gets structured notification. Both fail-quiet. NEVER throws (webhook returns 200 so Mollie does not duplicate-notify). |
| `handleMolliePaymentPaid` owner notification on monthly-first + yearly-oneoff | [lib/payment-handlers.ts](lib/payment-handlers.ts) `handleMolliePaymentPaid()` | parity with Stripe — third email to ownerEmail summarising tier/amount/alpaca/donor; tri-state `ownerNotified` result (true/false/null). Fail-quiet. |
| `handleMollieSubscriptionCanceled` owner notification when sub is canceled via /api/mollie-manage/cancel | [lib/payment-handlers.ts](lib/payment-handlers.ts) `handleMollieSubscriptionCanceled()` | Mirrors `handleStripeSubscriptionDeleted` shape. Fail-quiet on send. NEVER throws. |
| `/api/mollie-manage` 503 only if `MOLLIE_API_KEY` unset (fail-CLOSED); every other path returns silent 200 | [app/api/mollie-manage/route.ts](app/api/mollie-manage/route.ts) | Same email-oracle closure as the Stripe billing-portal route — response never reveals customer existence. Honeypot + IP/email rate-limits + Turnstile + email side-channel. |
| `/api/mollie-manage/cancel` token-gated; verifyMollieCancelToken → mollie.customers_subscriptions.cancel | [app/api/mollie-manage/cancel/route.ts](app/api/mollie-manage/cancel/route.ts) | HMAC-signed (customerId, subscriptionId) capability, 7-day TTL, scope='cancel'. Renders HTML success/error page (no JSON dump). 400 on missing token / 410 on expired / 503 on SDK missing / 502 on Mollie API error / 200 on cancel + owner notify. |
| `lib/mollie-manage-token.ts` cancel-action token uses same `NEWSLETTER_SIGNING_KEY → NEXTAUTH_SECRET` fallback | [lib/mollie-manage-token.ts](lib/mollie-manage-token.ts) | Tier 1 key always available — never silently broken. Scope guard prevents cross-use with newsletter tokens. |
| `verifyTokenWithScope` 2048-byte CPU-DoS guard | [lib/mollie-manage-token.ts](lib/mollie-manage-token.ts) | rejects oversized tokens before HMAC computation |
| `/api/mollie-manage/cancel` POST + `/api/mollie-manage/update-payment` POST reject cross-origin | [app/api/mollie-manage/cancel/route.ts](app/api/mollie-manage/cancel/route.ts), [app/api/mollie-manage/update-payment/route.ts](app/api/mollie-manage/update-payment/route.ts) | `Origin` header check; rogue cross-site forms replaying a stolen token are blocked |
| `/api/mollie-manage/update-payment` split into GET (interstitial) + POST (creates Mollie payment) with 5/60s IP rate-limit | [app/api/mollie-manage/update-payment/route.ts](app/api/mollie-manage/update-payment/route.ts) | link-scanner replay can no longer create orphan Mollie payments; stolen-token DoS bounded |
| `payment-failure-tracker.recordFailure` accepts an `attemptId` for idempotent severity bumps | [lib/payment-failure-tracker.ts](lib/payment-failure-tracker.ts) | webhook retries (Stripe/Mollie) using the same payment/invoice id no longer double-count severity ladder |
| `payment-failure-tracker` resets on subscription cancel (both vendors) | [lib/payment-handlers.ts](lib/payment-handlers.ts) `handleMollieSubscriptionCanceled`, `handleStripeSubscriptionDeleted` | re-enrolling donor starts at severity='first', not stale 'at-risk' |
| `lib/owner-notify.ts` fans escalation transitions to Slack / Telegram / Discord / generic webhook (fail-quiet, 2s timeout) | [lib/owner-notify.ts](lib/owner-notify.ts) | only fires on `at-risk` / `action-required` (skips `first`); env vars are optional (`OWNER_NOTIFY_DISCORD_URL` for Discord); throws are swallowed so webhook 200 contract is preserved |
| `lib/vat-tracker.ts` per-country EU OSS threshold tracker | [lib/vat-tracker.ts](lib/vat-tracker.ts), [lib/vat-recorder.ts](lib/vat-recorder.ts) | tracks domestic (ES) vs cross-border revenue per year; admin page at `/admin/analytics/vat` surfaces threshold + per-country breakdown |
| `/api/owner-mrr-digest` weekly cron (Mondays 09:00 CET) | [app/api/owner-mrr-digest/route.ts](app/api/owner-mrr-digest/route.ts), [vercel.json](vercel.json) | sends MRR/ARR/active/new/canceled/churn + dunning summary to `CONTACT_EMAIL`; auth via `CRON_SECRET` |
| `/admin/analytics/dunning` and `/admin/analytics/vat` admin pages | [app/admin/analytics/dunning/page.tsx](app/admin/analytics/dunning/page.tsx), [app/admin/analytics/vat/page.tsx](app/admin/analytics/vat/page.tsx) | dunning shows at-risk + action-required donors from in-memory tracker; vat shows threshold remaining + country breakdown |
| Re-mandate webhook defers on missing `mandateId`, pre-checks canceled subs, calls `resetFailures` on success | [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) | missing mandateId → 500 (Mollie retries); canceled sub → refund + skip; success → flushes failure counter |
| Idempotency stores: `recordFailure` attempts (4d TTL), `webhook-idempotency` events (4d TTL — was 7d), failure counters (30d TTL — was 60d) | [lib/payment-failure-tracker.ts](lib/payment-failure-tracker.ts), [lib/webhook-idempotency.ts](lib/webhook-idempotency.ts) | resonance-finder 2026-05-29 tunings |
| Subscription dashboard 60s in-memory cache + 500-row cap with truncation banner | [app/admin/analytics/subscriptions/page.tsx](app/admin/analytics/subscriptions/page.tsx) | performance-optimizer 2026-05-29 — same globalThis pattern as webhook-idempotency |
| Adopt-a-Paca price constants single source | [lib/config.ts](lib/config.ts) `ADOPT_PRICE_MONTHLY_EUR` / `ADOPT_PRICE_YEARLY_EUR` | defaults 75/900 (live-verified); env override only for staging tests (Rule 6) |
| Welcome email send is fail-quiet on both webhooks | [app/api/stripe-webhook/route.ts](app/api/stripe-webhook/route.ts) + [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) | try/catch around `sendEmail` — webhook still returns 200 so processor doesn't retry-spam donor with duplicate welcomes |
| Discount-codes email is fail-quiet (separate try/catch after welcome) | [app/api/stripe-webhook/route.ts](app/api/stripe-webhook/route.ts) | codes failure never affects welcome delivery or webhook 200 response; `buildAdoptDiscountCodesEmail` gracefully degrades to placeholder text when env vars unset |
| `buildAdoptDiscountCodesEmail` graceful degrade when codes unset | [lib/email-templates.ts](lib/email-templates.ts) `buildAdoptDiscountCodesEmail()` | reads `ADOPT_DISCOUNT_CODE_WEAVING_10` + `ADOPT_DISCOUNT_CODE_FARMSHOP_15`; when unset shows "codes arriving within 48 h" — never invents codes, never throws |
| Welcome email skipped when donor email is missing | both webhooks | logs warn + continues; first.paid still creates Mollie Subscription so charging proceeds |
| Stripe checkout 503 if `stripe` SDK package absent (dynamic import catch) | [app/api/checkout/route.ts:110-119](app/api/checkout/route.ts#L110-L119) | returns `STRIPE_SDK_MISSING` code; safe build without SDK |
| Stripe webhook secondary 503 if `STRIPE_SECRET_KEY` unset (separate from secret gate) | [app/api/stripe-webhook/route.ts:41-48](app/api/stripe-webhook/route.ts#L41-L48) | defence-in-depth; cannot construct event without both secrets |
| Stripe webhook 503 if `stripe` SDK package absent | [app/api/stripe-webhook/route.ts:64-73](app/api/stripe-webhook/route.ts#L64-L73) | symmetric to checkout 503 |
| Stripe webhook 400 on missing `stripe-signature` header | [app/api/stripe-webhook/route.ts:56-58](app/api/stripe-webhook/route.ts#L56-L58) | reject early before SDK load |
| Stripe webhook returns 500 on event-dispatch errors (triggers Stripe retry) | [app/api/stripe-webhook/route.ts:177-182](app/api/stripe-webhook/route.ts#L177-L182) | deliberate — Stripe re-delivers until 2xx |
| Mollie webhook secondary 503 if `MOLLIE_API_KEY` unset (after URL-secret passes) | [app/api/mollie-webhook/route.ts:62-70](app/api/mollie-webhook/route.ts#L62-L70) | cannot fetch payment status without it |
| Mollie webhook returns 500 on event-dispatch errors (triggers Mollie retry) | [app/api/mollie-webhook/route.ts:118-119](app/api/mollie-webhook/route.ts#L118-L119) | Mollie retries exponential up to 18h |
| Mollie payment-ID regex injection guard | [lib/integrations/payment-mollie.ts:248](lib/integrations/payment-mollie.ts#L248) | `^(tr\|sub)_[A-Za-z0-9]+$` — reject before any API call |
| Mollie SDK dynamic import (build succeeds without `@mollie/api-client`) | [lib/integrations/payment-mollie.ts:87-99](lib/integrations/payment-mollie.ts#L87-L99) | `importMollie()` returns null on missing module |
| `manualMailtoPaymentProvider.verifyWebhook` always returns ok:false | [lib/integrations/payment-manual-mailto.ts:29-32](lib/integrations/payment-manual-mailto.ts#L29-L32) | no payment processor → fail-closed by design |
| `fareHarborPassthroughPaymentProvider.verifyWebhook` always returns ok:false | [lib/integrations/payment-fareharbor-passthrough.ts:34-37](lib/integrations/payment-fareharbor-passthrough.ts#L34-L37) | FareHarbor webhooks handled by `/api/fareharbor-webhook` route, not this adapter |
| `PAYMENT_VENDOR=stripe-connect` routes to a guard adapter (returns null, logs error) | [lib/payment-vendor.ts](lib/payment-vendor.ts) `stripeConnectVendorGuardAdapter()` | previously: switch fell through to mailto silently. Now explicit guard adapter logs the DEFER state on every CTA build. |
| Owner-digest 401 on missing/wrong `CRON_SECRET` | [app/api/owner-digest/route.ts:26-28](app/api/owner-digest/route.ts#L26-L28) | constant-time `safeEqual` check |
| Owner-digest fail-quiet on missing FareHarbor API keys | [app/api/owner-digest/route.ts:36-55](app/api/owner-digest/route.ts#L36-L55) | sends lightweight fallback digest instead of failing |
| Newsletter double opt-in confirmation email is fail-quiet | [app/api/newsletter/route.ts](app/api/newsletter/route.ts) | try/catch-warn around `sendEmail`; returns success either way — prevents leaking whether address is in list |
| Stripe checkout success_url uses `SITE_BASE_URL` (NOT `Origin` header) | [app/api/checkout/route.ts:93-100](app/api/checkout/route.ts#L93-L100) | prevents open-redirect → phishing after real payment. Was: `process.env.NEXT_PUBLIC_SITE_URL \|\| request.headers.get('origin') \|\| 'https://alpacasibiza.com'`. Now: `SITE_BASE_URL` (config.ts hardcoded default). Found via `/security-review` 2026-05-27. |
| Mollie checkout returnUrl uses `SITE_BASE_URL` (NOT `Origin` header) | [app/api/mollie-checkout/route.ts:98-107](app/api/mollie-checkout/route.ts#L98-L107) | same attack class as the Stripe one; same fix |
| Billing portal 503 only if `STRIPE_SECRET_KEY` unset (fail-CLOSED); every other path returns silent 200 | [app/api/billing-portal/route.ts](app/api/billing-portal/route.ts) | fail-CLOSED on key gate; everything downstream is fail-QUIET 200 so response shape never reveals customer existence |
| Billing portal email-oracle closure — portal URL delivered via email side-channel, NEVER in JSON response | [app/api/billing-portal/route.ts](app/api/billing-portal/route.ts) → [lib/email-templates.ts](lib/email-templates.ts) `buildBillingPortalEmail()` | Previously: 404 `CUSTOMER_NOT_FOUND` vs 200 `{url}` distinguished subscriber from non-subscriber — unauthenticated enumeration. Now: always returns `{ok:true}` 200; if customer exists, portal URL is emailed to that address. UI shows "check your inbox" generic. |
| Billing portal `customer_id` direct-lookup path removed (was a separate oracle) | [app/api/billing-portal/route.ts](app/api/billing-portal/route.ts) | Frontend never sent customer_id; allowing it as input let an attacker probe Stripe customer IDs directly. Removed. |
| Billing portal return_url uses `SITE_BASE_URL` (NOT `Origin` header) | [app/api/billing-portal/route.ts](app/api/billing-portal/route.ts) | same open-redirect prevention as checkout + mollie-checkout |
| Stripe `checkout.session.completed` handler extracted to pure function + fail-quiet | [lib/payment-handlers.ts](lib/payment-handlers.ts) `handleStripeCheckoutCompleted()` | Returns result object instead of throwing. Covers welcome email + discount-codes scheduling (+5 min). 14 unit tests in [lib/payment-handlers.test.ts](lib/payment-handlers.test.ts) verify fail-quiet, missing-email, invalid-tier, XSS guard, scheduledAt timing. Route at [app/api/stripe-webhook/route.ts](app/api/stripe-webhook/route.ts) is now a thin shell that logs the result. |
| Mollie `payment.paid` handler extracted to pure function + parallel sub+welcome + fail-quiet | [lib/payment-handlers.ts](lib/payment-handlers.ts) `handleMolliePaymentPaid()` | Parity with Stripe handler per ADR 016. Three flows: monthly-first (sub+welcome parallel), yearly-oneoff (welcome only), recurring-renewal (no-op). Subscription failure THROWS to trigger Mollie retry (sub is critical for auto-charge); email failure is fail-quiet (Mollie retries would duplicate-send). 8 unit tests in [lib/payment-handlers.test.ts](lib/payment-handlers.test.ts). Route at [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) is a thin shell. |
| Newsletter POST sends verification email only — does NOT subscribe immediately (double opt-in) | [app/api/newsletter/route.ts](app/api/newsletter/route.ts) | GDPR + spam vector fix. State lives in HMAC-signed token (stateless). |
| Newsletter confirm HMAC verified with `safeEqual` before any action | [app/api/newsletter/confirm/route.ts](app/api/newsletter/confirm/route.ts) | timing-attack safe; 400 on bad sig, 410 on expired, never 500 |
| Newsletter confirm 410 Gone on expired token (vs 400 on bad sig) | [app/api/newsletter/confirm/route.ts](app/api/newsletter/confirm/route.ts) | distinguishes "link valid but stale" from "link tampered" |
| `NEWSLETTER_SIGNING_KEY` falls back to `NEXTAUTH_SECRET` if unset | [lib/newsletter-token.ts](lib/newsletter-token.ts) `getSigningKey()` | Tier 1 key is always available; explicit throw if both unset |
| Newsletter confirm SendGrid failure is non-fatal — confirmation page still shown | [app/api/newsletter/confirm/route.ts](app/api/newsletter/confirm/route.ts) | logs warn + continues; prevents double-confirmation failures blocking the UX |
| Newsletter verify URL uses `SITE_BASE_URL` (NOT `Origin` header) | [app/api/newsletter/route.ts](app/api/newsletter/route.ts) | same open-redirect class as checkout routes |
| Newsletter POST per-email rate limit: 3 attempts / 24 h, SHA-256 hashed key, returns 200 on hit (silent) | [app/api/newsletter/route.ts](app/api/newsletter/route.ts) lines 35–60 | email-bomb prevention; hashed key protects memory dumps; 200 response prevents subscriber enumeration |
| Newsletter unsubscribe token scope-checks prevent cross-use with confirm tokens | [lib/newsletter-token.ts](lib/newsletter-token.ts) `verifyToken()` scope guard | 'confirm' token presented to /unsubscribe returns null; 'unsubscribe' token at /confirm returns null — scope mismatch is explicit rejection |
| Newsletter unsubscribe GET/POST both return 200/303 on invalid/expired token — never reveal subscription state | [app/api/newsletter/unsubscribe/route.ts](app/api/newsletter/unsubscribe/route.ts) | CAN-SPAM + privacy: unsubscribe flow never leaks whether email was on list |
| Newsletter unsubscribe SendGrid failure is fail-quiet — logs only, user sees success | [app/api/newsletter/unsubscribe/route.ts](app/api/newsletter/unsubscribe/route.ts) | provider outage ≠ UX failure; operator reviews Vercel logs |
| List-Unsubscribe headers (RFC 8058) added to all newsletter emails via `listUnsubscribeUrl` param | [lib/mailer.ts](lib/mailer.ts) `sendEmail()` | Resend `headers` field confirmed in SDK types (index.d.mts line 127); sets List-Unsubscribe + List-Unsubscribe-Post on send |
| Newsletter confirm email includes per-recipient unsubscribe footer + List-Unsubscribe header | [app/api/newsletter/route.ts](app/api/newsletter/route.ts) | CAN-SPAM § 5(a)(3)/(6) + EU PECR compliance; token signed on send, 90-day TTL |
| Error boundary `useEffect` POSTs digest + truncated message to `/api/log-error` | [app/error.tsx](app/error.tsx), [app/[locale]/error.tsx](app/%5Blocale%5D/error.tsx), [app/api/log-error/route.ts](app/api/log-error/route.ts) | `console.error('[client-error]', …)` → Vercel Function Logs; rate-limited 20 req/hr per IP; payload capped 4KB; returns 204 with no body; no Sentry dep |
| `ClientErrorReporter` catches window `error` + `unhandledrejection` and beacons to `/api/log-error` | [components/client-error-reporter.tsx](components/client-error-reporter.tsx) mounted in [app/[locale]/layout.tsx](app/%5Blocale%5D/layout.tsx) | `sendBeacon` primary (survives unload); `fetch keepalive` fallback; errors in `send()` swallowed — never recurse; returns null (invisible) |
| `GlobalError` `useEffect` POSTs to `/api/log-error` even when root layout crashed | [app/global-error.tsx](app/global-error.tsx) | `fetch keepalive`; `.catch(() => {})` — silent; captures `type: react-error-boundary` + digest + stack; does not block boundary render |
| Honeypot field on all 3 forms — bot returns 200, no email sent | [lib/honeypot.ts](lib/honeypot.ts) `detectHoneypot()` → [app/api/contact/route.ts](app/api/contact/route.ts), [app/api/commission/route.ts](app/api/commission/route.ts), [app/api/newsletter/route.ts](app/api/newsletter/route.ts) | off-screen hidden field (`aria-hidden`, `tabIndex=-1`, not `display:none`); server returns 200 on bot detection (bot thinks it succeeded); field names differ per form: `company_url` / `phone_extension` / `business_name`; supplements Turnstile |
| Webhook idempotency guard — duplicate event returns 200 without re-processing | [lib/webhook-idempotency.ts](lib/webhook-idempotency.ts) `isAlreadyProcessed()` → [app/api/stripe-webhook/route.ts](app/api/stripe-webhook/route.ts), [app/api/mollie-webhook/route.ts](app/api/mollie-webhook/route.ts) | In-memory Map, 7-day TTL (longer than Stripe 3-day / Mollie 18h retry windows). Process-scoped — cold start = re-process risk (same ADR 001 tradeoff as booking-schedule-store). Returns `{ok:true,idempotent:true}` 200. Key: Stripe event.id / Mollie payment.id. |
| GDPR request rate-limit returns 200 on hit (silent, don't leak state) | [app/api/gdpr-request/route.ts](app/api/gdpr-request/route.ts) | 3 req / hour per IP; honeypot `business_name` field returns 200 on bot; email send failure → 500 with `info@alpacasibiza.com` fallback; all user input HTML-escaped before email render |
| Content-stage endpoint 401 if no session (fail-CLOSED) | [app/api/admin/content-stage/route.ts](app/api/admin/content-stage/route.ts) | `getServerSession(auth)` gate; returns 401 with no body. 501 on Vercel (no persistent FS — owner uses Download patch instead). Never writes to source files (staging only). |
| Admin content page redirects to /admin/login if no session | [app/admin/content/page.tsx](app/admin/content/page.tsx) | same `getServerSession(auth)` pattern as /admin/analytics; noindex via admin layout.tsx |
| `/admin/env-check` redirects to /admin/login if no session | [app/admin/env-check/page.tsx](app/admin/env-check/page.tsx) | Server component; reads TIER1_KEYS + TIER2_VARS from validate-env.ts; shows SET/UNSET + masked previews grouped by tier; generates .env.local template for unset vars |
| `/admin/email-previews` redirects to /admin/login if no session | [app/admin/email-previews/page.tsx](app/admin/email-previews/page.tsx) | Server component; renders all 7 email templates with dummy data inside sandboxed iframes (sandbox="allow-same-origin" — no scripts); subject lines shown above each frame |
| `/healthz` is public — no auth, no rate-limit, no DB — returns 200 + JSON while Node is alive | [app/healthz/route.ts](app/healthz/route.ts) | `{ ok, ts, build_sha, env_tier1_ready }` — for UptimeRobot / BetterStack uptime monitors; Cache-Control: no-store; `export const dynamic = 'force-dynamic'` |

**Documented tradeoffs** (not bugs):
- In-memory `bookingScheduleStore` ([docs/adr/001-resend-scheduled-sends.md](docs/adr/001-resend-scheduled-sends.md)) loses state on cold start. At most one stale email per redeploy.
- In-memory rate limit ([docs/adr/011-in-memory-rate-limit-vs-kv.md](docs/adr/011-in-memory-rate-limit-vs-kv.md)) is process-scoped. Acceptable below ~50 req/min; upgrade to Vercel KV when volume justifies.

| `FloatingWhatsApp` renders null if tenant has no `whatsappE164` configured | [components/floating-whatsapp.tsx](components/floating-whatsapp.tsx) | fail-quiet — no broken-link CTA |
| `EventsCalendar` renders null in production when no events are live | [components/events-calendar.tsx](components/events-calendar.tsx) `hasUpcomingEvents()` | fail-quiet — dev mode shows amber hint box; production renders nothing until owner populates lib/data/events.ts |
| `PhotoGallery` renders null in production when no photos are live (per category or globally) | [components/photo-gallery.tsx](components/photo-gallery.tsx) `hasLiveMedia()` + `liveMedia()` | fail-quiet — dev mode shows amber hint box; production returns null until owner adds entries to lib/data/media.ts with status: 'live' |
| `JournalCard` + journal index render empty-state in production when no posts are live | [app/[locale]/journal/page.tsx](app/[locale]/journal/page.tsx) `hasLivePosts()` + [lib/data/journal.ts](lib/data/journal.ts) | fail-quiet — "Stories coming soon" shown publicly until owner adds entries to lib/data/journal.ts with status: 'live' |
| `/journal/[slug]` returns `notFound()` for drafts, archived, and unknown slugs | [app/[locale]/journal/[slug]/page.tsx](app/[locale]/journal/[slug]/page.tsx) `findPost()` | 404 — never exposes draft content |
| `/gifts` CTA falls back to main FareHarbor calendar if `FAREHARBOR_ITEM_GIFT_CARD` unset | [app/[locale]/gifts/page.tsx](app/[locale]/gifts/page.tsx) `getFareHarborGiftCardUrl()` | fail-open — CTA never inert; degrades to base calendar URL via `getFareHarborItemUrl(undefined)` |
| `BookingButton` / `getProductBookingUrl` fail-open for all products | [components/booking-button.tsx](components/booking-button.tsx) → [lib/fareharbor-products.ts](lib/fareharbor-products.ts) `getProductBookingUrl()` | unset item ID OR unknown slug → `getFareHarborEmbedUrl()` (main calendar); CTA never inert across all 12 product slugs |
| Romantic Sunset CTA fail-open if `FAREHARBOR_ITEM_ROMANTIC_SUNSET` unset | [app/[locale]/experiences/romantic-sunset/page.tsx](app/%5Blocale%5D/experiences/romantic-sunset/page.tsx) `<BookingButton product="romantic-sunset">` | unset → main FareHarbor calendar; CTA never inert. OWNER_INPUT_NEEDED: set env var from FareHarbor admin |
| Family Farm Days CTA fail-open if `FAREHARBOR_ITEM_FAMILY_FARM_DAYS` unset | [app/[locale]/experiences/family-farm-days/page.tsx](app/%5Blocale%5D/experiences/family-farm-days/page.tsx) `getProductBookingUrl('family-farm-days')` → Hero cta.href | unset → main FareHarbor calendar; CTA never inert. OWNER_INPUT_NEEDED: set env var from FareHarbor admin |
| `logNotFound` 404 referrer logger — never throws; malformed referer → null (no crash) | [lib/notfound-log.ts](lib/notfound-log.ts) `safeReferrerHost()` try/catch | `console.warn` only; in-process dedupe Map (TTL 60 s) prevents log flood from crawlers; logs host only (no full URL, no IP — privacy-safe) |
| `robots.ts` disallows all on non-production environments | [app/robots.ts](app/robots.ts) → [lib/robots-env.ts](lib/robots-env.ts) `isProductionEnv()` | `VERCEL_ENV !== 'production'` AND `SITE_BASE_URL !== 'https://alpacasibiza.com'` → `disallow: '/'`; prevents preview deploys from being indexed |
| `NavProgressBar` wraps `useSearchParams` in Suspense | [components/nav-progress-bar.tsx](components/nav-progress-bar.tsx) mounted in [app/[locale]/layout.tsx](app/%5Blocale%5D/layout.tsx) | `useSearchParams()` requires Suspense boundary; bar renders null when progress is complete; `z-[60]` stays above sticky-booking-bar (z-50) |
| IP rate-limit on `/api/contact` + `/api/commission` (2 req / 5 min per IP) | [app/api/contact/route.ts](app/api/contact/route.ts), [app/api/commission/route.ts](app/api/commission/route.ts) via [lib/rate-limit.ts](lib/rate-limit.ts) | per-IP in-memory sliding window; 429 + Retry-After; supplements Turnstile + honeypot on those routes |
| `lib/checkout-states.ts` canonical checkout-state constants | [lib/checkout-states.ts](lib/checkout-states.ts) | `MOLLIE_PENDING_STATES` + `SUCCESS_LIKE_CHECKOUT_STATES` — single source of truth for checkout-state branching used by adopt page + thank-you component; prevents drift between callers |
| `app/manifest.ts` `short_name` word-boundary truncation | [app/manifest.ts](app/manifest.ts) `toShortName()` | W3C App Manifest ≤ 12-char limit; `toShortName()` clips at last space (never mid-word); fallback to hard slice only if first word itself exceeds 12 chars |
| Recover-certificate route always-200 anti-enumeration | [app/api/recover-certificate/route.ts](app/api/recover-certificate/route.ts) | mirrors billing-portal email-oracle closure pattern — never reveals whether a given email is on file |

| Birthday-card cron auth: `verifyCronSecret` gate (fail-CLOSED) | [app/api/alpaca-birthday-cards/route.ts](app/api/alpaca-birthday-cards/route.ts) | 401 on missing/wrong CRON_SECRET |
| Birthday-card per-recipient `Promise.allSettled` (fail-quiet) | [app/api/alpaca-birthday-cards/route.ts](app/api/alpaca-birthday-cards/route.ts) | one bad email never drops rest of batch; returns 200 always so Vercel cron does not retry |
| Birthday-card idempotency: stamps `last_bday_email_year` on sub after send | [app/api/alpaca-birthday-cards/route.ts](app/api/alpaca-birthday-cards/route.ts) | prevents double-send if cron cold-starts twice same day; stamp failure is warn-only (non-fatal) |
| Skein-checkout 503 if `STRIPE_SECRET_KEY` unset (fail-CLOSED) | [app/api/skein-checkout/route.ts](app/api/skein-checkout/route.ts) | mirrors checkout 503 pattern |
| Skein-checkout 503 if Stripe SDK absent (dynamic import catch) | [app/api/skein-checkout/route.ts](app/api/skein-checkout/route.ts) | `STRIPE_SDK_MISSING` code; safe build without SDK |
| Skein-checkout IP rate limit: 3 req / 5 min per IP | [app/api/skein-checkout/route.ts](app/api/skein-checkout/route.ts) | mirrors checkout + billing-portal rate-limit |
| Skein-checkout success/cancel URLs use `SITE_BASE_URL` (NOT `Origin` header) | [app/api/skein-checkout/route.ts](app/api/skein-checkout/route.ts) | same open-redirect prevention as checkout + mollie-checkout (ADR 017) |
| Skein alpaca slug validated via `findAlpacaName` before Stripe metadata | [app/api/skein-checkout/route.ts](app/api/skein-checkout/route.ts) | unknown/forged slugs silently treated as pick-for-me; no arbitrary text in Stripe metadata |

**Adding a new failsafe?** PRACTICES.md "Append protocol" applies. After landing the code, add the row above with file:line.

---

## Env var deploy tiers

**Tier 1 — MUST set before prod** (site breaks or is unsafe):
`RESEND_API_KEY`, `CONTACT_EMAIL`, `NEXTAUTH_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NEXTAUTH_URL`, `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET`

**Default vendor (per ADR 019): Mollie.** Stripe is the fallback; set `PAYMENT_VENDOR=stripe` to switch.

**SDK-shape rule (post-2026-05-28 code-review):** When integrating an external SDK
(Stripe, Mollie, Resend, SendGrid, Google Places, FareHarbor), DO NOT use
`type X = any` or `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
to escape its types. The code-review on 2026-05-28 found four CRITICAL Mollie
SDK bugs (`customers_subscriptions` vs `customerSubscriptions`, missing
`.list()` method, wrong `cancel()` signature, `Promise<Payment> & void`
mishandling) that 603 tests + `next build` + `tsc --noEmit` all missed because
`any`-casts deliberately bypassed the type system. Pattern to follow instead:
- Import the SDK's type via `import type { X } from 'sdk-name'`.
- For dynamic imports, type the candidate and the returned client.
- For raw HTTP responses (no SDK), define an inline minimal-shape interface
  and parse `await res.json() as Shape`.
- Cast through `unknown` ONLY at deliberate subset boundaries (e.g. passing a
  Stripe `Session` to a minimal `StripeCheckoutSessionLike`), never to mute
  a mismatch you don't understand.

**Tier 2 — fail-open / graceful** (site works, feature dark until set):
- `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → forms unprotected (visible prod warn)
- `FAREHARBOR_APP_KEY` + `FAREHARBOR_USER_KEY` → live spots-left widget hidden
- `FAREHARBOR_ITEM_*` IDs → per-tour Book buttons inert; main calendar still works
- `GA4_PROPERTY_ID` + `GA4_CLIENT_EMAIL` + `GA4_PRIVATE_KEY` → admin analytics page dark
- `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` → review badge hidden
- `SENDGRID_*` → optional list management
- `NEWSLETTER_SIGNING_KEY` → newsletter HMAC tokens fall back to `NEXTAUTH_SECRET` (Tier 1 guarantee; rotation independence lost)
- `STRIPE_SECRET_KEY` → Stripe Checkout 503 (adopt CTA falls back to mailto)
- `STRIPE_WEBHOOK_SECRET` → Stripe webhook 503 (fail-CLOSED; no event processing)
- `STRIPE_ADOPT_PRICE_ID_MONTHLY` → monthly tier 503 (OWNER_INPUT_NEEDED: create in Stripe dashboard)
- `STRIPE_ADOPT_PRICE_ID_YEARLY` → yearly tier 503 (OWNER_INPUT_NEEDED: create in Stripe dashboard)
- `ADOPT_DISCOUNT_CODE_WEAVING_10` + `ADOPT_DISCOUNT_CODE_FARMSHOP_15` → discount-codes email shows placeholder text until set (OWNER_INPUT_NEEDED: create codes in Stripe / shop platform)
- `PAYMENT_VENDOR=stripe` → required to activate Stripe path (defaults to mailto)
- `MOLLIE_API_KEY` → Mollie checkout 503 (adopt CTA falls back to mailto)
- `MOLLIE_WEBHOOK_SECRET` → Mollie webhook 503 (fail-CLOSED; no event processing)
- `PAYMENT_VENDOR=mollie` → required to activate Mollie path. Mollie SEPA Direct Debit ~€0.25/charge vs Stripe ~€1.75 at €75/mo (see [handoff](handoff/) for full maths)

- `SKEIN_PRICE_EUR` → skein sponsorship price defaults €200; override for staging tests. Used by [app/api/skein-checkout/route.ts](app/api/skein-checkout/route.ts) via `SKEIN_SPONSORSHIP_PRICE_EUR` in lib/config.ts

**Hardcoded in code (no env needed):** GA4 pixel `G-Y946QDVVQV`, GTM `GTM-KR3CGLS6` (FareHarbor's container — single, per [app/layout.tsx:84](app/layout.tsx#L84)), FareHarbor FLOW=1257173 shortname=alpacasibiza. **RESOLVED (2026-05-26):** `GTM-NJRGZPGS` does not appear anywhere in the codebase — verified via VERIFICATION_RESULTS search. Only `GTM-KR3CGLS6` is wired. The "primary GTM" open question in OWNER_INPUT_NEEDED is moot until the owner explicitly supplies a separate container ID to add.

---

## Build state (2026-05-27)
- 18 ADRs (docs/adr/001–018)
- Specs done: 7 (specs/done/)
- Specs open: 3 (specs/todo/)
- 239 unit tests passing (pnpm test — last verified 2026-05-27 overnight)
- E2E tests: deferred — requires deployed URL + headless browser (see CANT_BE_DONE.md)
- Failsafes documented: 97 rows (In-code failsafe map above)
- Production-blocking gaps: legal text, owner content, FareHarbor IDs, Stripe keys — see DROP_IN_GUIDE.md

---

## Authoritative docs (in order)

0. [START_HERE.md](START_HERE.md) — **master entry-point** + project state snapshot (read first)
1. [PRACTICES.md](PRACTICES.md) — rules of conduct, pre-flight, append protocol
2. [CANT_BE_DONE.md](CANT_BE_DONE.md) — hard limits with explicit re-check triggers (read before dispatching agents)
3. [PLAN.md](PLAN.md) — current execution plan + corrections to REALITY_CHECK
4. [REALITY_CHECK.md](REALITY_CHECK.md) — redesign vs live vs competitors (2026-05-26)
5. [OWNER_INPUT_NEEDED.md](OWNER_INPUT_NEEDED.md) — items blocked on owner
6. [INTEGRATION_STATUS_2026-04-20.md](INTEGRATION_STATUS_2026-04-20.md) — integration matrix (note: PLAN.md flags some corrections)
7. [REALITY_CHECK_PROMPTS.md](REALITY_CHECK_PROMPTS.md) — parameterized Sonnet prompts to re-run the audit
8. [docs/adr/](docs/adr/) — 18 architecture decision records (load-bearing choices; don't re-litigate without a new ADR)
   - 001 resend-scheduled-sends
   - 002 turnstile-fail-open-dev-fail-closed-prod
   - 003 webhook-secret-fail-closed
   - 004 email-only-no-ecommerce
   - 005-6 locale-en-default-gb-flag
   - 006 ga4-before-interactive-ssr
   - 007 admin-login-fail-closed
   - 008 availability-isr-1800s
   - 009 client-availability-dedup-promise-cache
   - 010 csp-report-only-with-gtm-unsafe-inline
   - 011 in-memory-rate-limit-vs-kv
   - 012 content-provider-abstraction
   - 013 payment-provider-defaults-manual-mailto
   - 014 ga4-afterinteractive-supersedes-006
   - 015 stripe-primary-mollie-deferred
   - 016 pure-function-payment-handlers
   - 017 site-base-url-mandatory-for-redirects
   - 018 optional-sdk-dynamic-imports
9. [specs/](specs/) — work items: `todo/`, `done/`, `roadmaps/`
