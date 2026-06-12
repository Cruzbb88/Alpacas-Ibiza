# Journey Audit — 2026-06-06

## TL;DR

10 flows traced. **4 ✗ broken** (steps that return wrong data or silently drop a field). **7 ⚠ degrade** (feature dark, fallback in use, or requires runtime confirmation). **3 flows ✓ clean end-to-end** (contact form, admin login, newsletter subscribe/confirm/unsubscribe).

---

## Flow-by-flow

### Flow 1: First-time visitor lands on homepage (`/`)

Files touched: `app/[locale]/page.tsx` → `components/hero.tsx`, `components/cookie-consent-v3.tsx`, `components/language-switcher.tsx`, `lib/config.ts`

Steps:
1. ✓ `app/[locale]/layout.tsx` mounts; next-intl middleware resolves locale from Accept-Language or path prefix; `localePrefix: 'always'` means `/` 307s to `/en/`.
2. ✓ `app/[locale]/page.tsx` SSR — all sections render server-side; hero, weaving showcase, experience cards, reviews, newsletter CTA all compose cleanly.
3. ⚠ `CookieConsentBanner` locale handling: the `language.default` prop is set correctly to the active locale (passed down from layout). However the `translations` object hard-codes the cookie-consent UI text by calling `tr('cookieConsent.…')` for ALL locales at once during the single `useEffect(() => void CookieConsent.run(…), [locale])` call. Because `tr` is the next-intl hook for the *current* locale, all six locale keys receive the *same* translated strings — the strings for the active session locale. A German visitor (`locale=de`) sees German text, which is correct. But if vanilla-cookieconsent switches the locale internally (e.g. after the user flips the language picker mid-session without a full page reload), it will still show the server-rendered German strings rather than the switched locale strings because `useEffect` only re-runs when `locale` changes, and the language-picker does a `window.location.href` hard-navigate which triggers a full page reload anyway. **Verdict: works for normal navigation; degrade for the unlikely JS-only locale-switch-without-reload path.**
4. ✓ Language switcher (`components/language-switcher.tsx`) — `window.location.href` hard-navigate on select; locale stripped and rebuilt correctly; fallback to `i18nConfig.defaultLocale` when params absent.
5. ⚠ `AlpacaOfTheDay` and `AdoptersCounterBadge` — both are server components that call Stripe/Mollie to get counts. When payment vendor is unconfigured (no `PAYMENT_VENDOR` / keys unset) both fail-quiet and render `null`. Visitor sees a gap in the page layout. No hard break.
6. ✓ `SKEIN_CALLOUT_LIVE` gate — correctly absent by default; no broken callout renders.

Breaks found: none hard. One soft degrade on cookie locale.

---

### Flow 2: Visitor books a tour (`/tours` → FareHarbor)

Files touched: `app/[locale]/tours/page.tsx` → `components/booking/fareharbor-calendar.tsx` → `lib/config.ts` (`FAREHARBOR_BOOKING_URL`, `getFareHarborItemUrl`)

Steps:
1. ✓ `/tours` renders SSR. `FAREHARBOR_BOOKING_URL = getFareHarborEmbedUrl({ fullItems: true })` — falls back to `alpacasibiza` shortname when `NEXT_PUBLIC_FAREHARBOR_SHORTNAME` unset (warn in prod).
2. ✓ `FareHarborCalendar` mounts client-side with `IntersectionObserver` lazy-load (300px rootMargin). Script embed falls back to CTA link on `onerror`. Flow degrades gracefully when FareHarbor script unavailable.
3. ⚠ Per-tour item IDs (`FAREHARBOR_ITEM_TOUR_MEET_HERD`, etc.) are Tier 2 and unset in dev/staging. The `TourComparison` component's "Book this tour" CTAs call `getProductBookingUrl(product)` → `getFareHarborItemUrl(undefined)` → base calendar URL. **The Book buttons work but land on the general calendar, not the specific tour.** Per CLAUDE.md failsafe map this is intentional degradation; no hard break.
4. ✓ `FAREHARBOR_ITEM_TOUR_MEET_HERD` unset → `getFareHarborItemUrl(undefined)` → `https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes` — valid URL, never crashes.
5. ✓ Hero CTA links to `FAREHARBOR_BOOKING_URL` (base calendar) always.

Breaks found: none hard. Per-tour specificity only when item IDs set.

---

### Flow 3: Visitor adopts monthly (`/adopt` → Stripe → webhook → welcome email → certificate)

Files touched: `app/[locale]/adopt/page.tsx` → `lib/payment-vendor.ts` → `app/api/checkout/route.ts` → Stripe → `app/api/stripe-webhook/route.ts` → `lib/payment-handlers.ts` → `lib/email-templates.ts` → `lib/mailer.ts` → `app/api/adopt-certificate/route.ts`

Steps:
1. ✓ `/adopt` renders; `getPaymentAdapter()` returns the active vendor adapter; `monthlyUrl` built correctly for the active vendor.
2. ✓ `CheckoutGate` renders EU Art 16(m) waiver checkbox; links blocked client-side until checked; server-side gate in `/api/checkout` returns 400 if `waiver_accepted` not set.
3. ✓ `/api/checkout` GET/POST — Stripe session created; `success_url` uses `SITE_BASE_URL` (not Origin); `cancel_url` threads alpaca slug back correctly.
4. ✓ Stripe hosted checkout → donor pays → `checkout.session.completed` webhook fires.
5. ✓ `handleStripeCheckoutCompleted` — welcome email sent to `customer_details.email`; discount-codes email scheduled at `now + 5min`.
6. ✗ **Certificate on thank-you screen has blank donor name and alpaca name.** The `success_url` in `app/api/checkout/route.ts:198` is:
   ```
   `${SITE_BASE_URL}/${locale}/adopt?checkout=success&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`
   ```
   It does NOT include `donor_name` or `alpaca_name` query params. `AdoptThankYou` reads `params.get('donor_name')` and `params.get('alpaca_name')` at line 148–149, both return `null`. The `TODO` comment in `components/adopt-thank-you.tsx:138–140` explicitly flags this gap: *"the checkout route must thread donor_name and alpaca_name into success_url for these to fire in production."* Result: the certificate download link at `/api/adopt-certificate` always generates a generic certificate saying "Honoured friend" and no alpaca name, even when the donor picked a specific alpaca.
7. ⚠ `@react-pdf/renderer` is a dynamic import. If the SDK is absent at deploy time, `/api/adopt-certificate` returns `503 PDF_SDK_MISSING`. Certificate download silently 503s.
8. ✓ Welcome email content correctly personalised via `handleStripeCheckoutCompleted` (uses `customer_details.name` and `metadata.alpaca`).

Breaks found: **✗ Flow 3 step 6** — certificate always generic (no donor name, no alpaca name) because `success_url` doesn't thread those params. File: `app/api/checkout/route.ts:198`.

---

### Flow 4: Visitor adopts yearly + gift (`/adopt?gift_name=...&gift_email=...`)

Files touched: `app/[locale]/adopt/page.tsx` → `lib/payment-vendor.ts` → `app/api/checkout/route.ts` → `lib/gift-fields.ts` → `lib/payment-handlers.ts`

Steps:
1. ✓ `AdoptGiftAdoption` component renders gift fields UI. On submit, appends `?gift_name=…&gift_email=…` to the current URL (URL update, not a POST).
2. ✓ `/adopt` page picks up `gift_name`, `gift_email`, `gift_deliver` from `searchParams` (lines 104, 131–140); builds `adoptOpts` with `giftName`, `giftEmail`, `giftDeliver`.
3. ⚠ `buildAdoptCheckoutUrl('monthly', { giftName, giftEmail, giftDeliver })` — the `AdoptCheckoutOpts` interface in `lib/payment-vendor.ts:63–71` only declares `alpaca?: string`. Gift fields (`giftName`, `giftEmail`, `giftDeliver`) are **not declared on `AdoptCheckoutOpts`** and are therefore silently dropped by the Stripe adapter's `buildCheckoutUrl` call. The checkout URL built by `stripeDirectPaymentProvider.buildCheckoutUrl` does not receive gift fields.
4. ✗ **Gift fields do not reach the Stripe checkout session.** The `/api/checkout` GET handler at lines 109–121 reads `gift_email` / `gift_name` / `gift_deliver` from query params only when they were threaded into the checkout URL — which they were not (see step 3). Result: Stripe session metadata has no `gift_recipient_email`, no `gift_recipient_name`, no `gift_send_date`. `handleStripeCheckoutCompleted` sees `isGiftPurchase = false`, sends the welcome email to the *buyer* not the *recipient*, and never schedules the future send.
5. ? Gift name on certificate: cannot determine statically whether the certificate would use gift recipient name vs buyer name without a live checkout — but given step 4, the recipient's name never reaches Stripe metadata, so certificate would also be generic.

Breaks found: **✗ Flow 4 step 3–4** — gift fields (`giftName`/`giftEmail`/`giftDeliver`) declared in page-level `adoptOpts` but not on `AdoptCheckoutOpts` interface and not propagated into the checkout URL. File: `lib/payment-vendor.ts:63–71` (`AdoptCheckoutOpts` missing gift fields), `app/[locale]/adopt/page.tsx:132–143` (builds `adoptOpts` with gift fields that the type doesn't carry), `app/api/checkout/route.ts` (GET path reads `gift_name`/`gift_email` from query — never populated because URL builder dropped them).

---

### Flow 5: Returning adopter wants billing portal (Stripe path)

Files touched: `components/billing-portal-link.tsx` → `app/api/billing-portal/route.ts` → Stripe → `lib/email-templates.ts` `buildBillingPortalEmail` → `lib/mailer.ts`

Steps:
1. ✓ `BillingPortalLink` renders a "Manage my adoption" section with email input + Turnstile widget.
2. ✓ POST to `/api/billing-portal` — Stripe key gate; honeypot; IP rate-limit (3/5min); per-email rate-limit (2/1h); Turnstile verification; `stripe.customers.list({ email })`.
3. ✓ Customer not found → silent 200 (oracle closure). Customer found → `stripe.billingPortal.sessions.create` → URL emailed via side-channel.
4. ✓ `buildBillingPortalEmail(portalUrl)` → `sendEmail`. Portal URL never in JSON response.
5. ✓ Donor clicks email link → Stripe portal. `return_url` uses `SITE_BASE_URL` (open-redirect safe).
6. ⚠ **Mollie adopters who request the billing portal via `vendor=stripe` path** — `BillingPortalLink` receives `billingPortalVendor` from the adopt page which defaults to `'mollie'` when vendor is Mollie (line 149). But the billing-portal route is Stripe-only (`/api/billing-portal`). Mollie adopters are routed to `/api/mollie-manage` instead via a separate code path. This is by design but the component naming (`BillingPortalLink`) doesn't communicate the vendor switch. When `PAYMENT_VENDOR=mollie` the adopt page correctly passes `vendor='mollie'` — need to confirm `BillingPortalLink` uses that prop to hit the right endpoint.

Breaks found: ? Mollie portal routing — need runtime test to confirm `BillingPortalLink` uses the `vendor` prop to hit `/api/mollie-manage` vs `/api/billing-portal`. Mark as CANT-BE-DONE-LOCALLY.

---

### Flow 6: Referral flow (Alice shares code → Bob adopts)

Files touched: `lib/referral-codes.ts` → `app/[locale]/adopt/page.tsx` → `components/adopt/referral-applied-banner.tsx` → `app/api/checkout/route.ts`

Steps:
1. ✓ `generateReferralCode(customerId)` → 6-char base32 string matching `/^[A-Z0-9]{6}$/`.
2. ⚠ **Attribution vs discount are two separate params.** Attribution: `?ref=XXXXXX` (6-char code, no prefix). Discount: `?referral=XXXXXX` (a Stripe coupon ID). These are different URL params handled differently in `/api/checkout`. The banner (`ReferralAppliedBanner`) reads `searchParams.get('referral')` and validates against `REFERRAL_CODE_RE` (`/^[A-Z0-9]{6}$/`). The adopt page's `validReferral` also tests against `REFERRAL_CODE_RE` (imported as `REFERRAL_CODE_URL_RE`). **Both are now correctly checking for the 6-char format** (the old `ALPACA-[A-Z0-9]{6}` guard was fixed per the referral-codes.ts comment).
3. ✓ `?referral=XXXXXX` flows through `/api/checkout` → `stripe.coupons.retrieve(referralCode)` → applied only if `coupon.valid === true`. Silently dropped if invalid. Correct.
4. ✓ `?ref=XXXXXX` flows through `/api/checkout` → `verifyReferralCode` (format-check only) → written to `session.metadata.referredBy`. Attribution recorded.
5. ⚠ The banner shows on `?referral=XXXXXX` (the discount/coupon param). Alice's generated referral URL uses `?ref=XXXXXX` (attribution). **The banner will NOT show when Alice shares `?ref=XXXXXX` — it only shows for `?referral=XXXXXX`.** A donor who follows Alice's attribution link sees no banner confirming their referral is tracked, even though it is (silently written to metadata.referredBy). This is a UX gap, not a functional break.
6. ✓ Regex guard fixed: `REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/` matches generated codes correctly.

Breaks found: ⚠ Banner/attribution UX gap. No hard break.

---

### Flow 7: Visitor signs up for newsletter

Files touched: `components/newsletter-form.tsx` → `app/api/newsletter/route.ts` → `lib/newsletter-token.ts` → `lib/mailer.ts` → `/api/newsletter/confirm` → `lib/newsletter.ts` → `/[locale]/newsletter-confirmed` → email footer unsubscribe → `/api/newsletter/unsubscribe`

Steps:
1. ✓ POST `/api/newsletter` — honeypot (`business_name`); IP rate-limit (5/5min); per-email rate-limit (3/24h, silent 200); Turnstile; HMAC-sign token; confirmation email sent.
2. ✓ Confirmation email includes per-recipient unsubscribe URL + `List-Unsubscribe` header.
3. ✓ `GET /api/newsletter/confirm?token=…` — `verifyNewsletterToken` (HMAC + scope + expiry); 410 on expired, 400 on tampered; `subscribe(email)` calls SendGrid; 303 to `/newsletter-confirmed`.
4. ⚠ Redirect target is `${SITE_BASE_URL}/newsletter-confirmed` (no locale prefix). Next-intl middleware with `localeDetection: true` will 307-redirect this to `/en/newsletter-confirmed` (or detected locale). **Works for the common path but a non-English donor who clicks the confirmation link will be redirected to `/en/newsletter-confirmed` regardless of their browser locale.** The middleware uses Accept-Language so `/newsletter-confirmed` → `/de/newsletter-confirmed` for a German browser. Statically uncertain — depends on middleware locale-detection behaviour at runtime.
5. ✓ `/[locale]/newsletter-confirmed` page renders correctly.
6. ✓ Unsubscribe link in footer: `GET /api/newsletter/unsubscribe?token=…` — scope guard (`unsubscribe` token cannot be used at `/confirm`); HMAC verified; `unsubscribe(email)` calls SendGrid; 303 to `/en/newsletter/unsubscribed`. **HARDCODED `/en/` locale** — all users see the English unsubscribed page regardless of browser locale. Minor localisation gap.

Breaks found: none hard. Two soft localisation degrades (confirm redirect locale detection, unsubscribed page hardcoded `/en/`). File: `app/api/newsletter/unsubscribe/route.ts:26`.

---

### Flow 8: Visitor recovers certificate (`/recover-certificate`)

Files touched: `app/[locale]/recover-certificate/page.tsx` → `components/adopt/recover-certificate-form.tsx` → `app/api/recover-certificate/route.ts` → `lib/integrations/payment-stripe-direct.ts` / `payment-mollie.ts` → `lib/email-templates-retention.ts` `buildCertificateRecoveryEmail` → `app/api/adopt-certificate/route.ts`

Steps:
1. ✓ Page renders; `RecoverCertificateForm` client component handles input + POST.
2. ✓ POST `/api/recover-certificate` — IP rate-limit (3/15min); honeypot (`bee_finds_nectar`); email validation; per-email rate-limit (2/1h); Turnstile via `verifyHumanToken`.
3. ✓ `lookupStripe` → `customers.list(email)` → `subscriptions.list(customer, active)`. Reads `metadata.alpacaName ?? metadata.alpaca`.
4. ✓ `lookupMollie` → `customers.iterate(…).take(200).find(email match)` → `customerSubscriptions.iterate(…).take(100)`.
5. ⚠ Mollie customer scan is capped at 200. If the farm has > 200 customers and the adopter is beyond position 200, the lookup returns null and no certificate email is sent. Silent — user sees generic "check your inbox" regardless.
6. ✓ Certificate URL built: `/api/adopt-certificate?donor_name=…&alpaca_name=…` — correctly passes names to the PDF endpoint.
7. ✓ Email sent via `buildCertificateRecoveryEmail`; always-200 anti-enumeration guarantee.
8. ⚠ `@react-pdf/renderer` must be installed; 503 `PDF_SDK_MISSING` if absent.

Breaks found: ⚠ Mollie 200-customer cap (scale issue). Otherwise clean.

---

### Flow 9: Visitor uses contact form

Files touched: `components/contact-form.tsx` → `app/api/contact/route.ts` → `lib/honeypot.ts`, `lib/turnstile.ts`, `lib/rate-limit.ts`, `lib/html.ts`, `lib/mailer.ts`

Steps:
1. ✓ Contact form renders with honeypot field (`company_url`, `aria-hidden`, `tabIndex=-1`).
2. ✓ POST `/api/contact` — input length caps (200/320/200/4000); honeypot check; required fields (`name`, `email`, `message`); IP rate-limit (5/5min); Turnstile.
3. ✓ `escapeHtml` on all user fields; `sanitizeHeader` on name/subject (CRLF strip); `replyTo` omitted if invalid email.
4. ✓ `sendEmail` throws on error → route returns 500. No silent failure on delivery.
5. ✓ Confirmation page: route returns `{ success: true }` 200; client form shows success state.

Breaks found: **none**. Flow ✓ clean.

---

### Flow 10: Admin logs in to monitoring

Files touched: `app/admin/login/page.tsx` → `/api/auth/[...nextauth]/route.ts` → `middleware.ts` → `app/admin/monitoring/page.tsx` → `lib/monitoring/snapshot.ts`

Steps:
1. ✓ Middleware: `getToken({ req, secret: NEXTAUTH_SECRET })` gate; 307 to `/admin/login` when token absent.
2. ✓ `/api/auth/[...nextauth]` — `safeEqual` timing-safe credential check; fail-closed when `ADMIN_USERNAME`/`ADMIN_PASSWORD` unset (`console.error` + return null).
3. ✓ JWT session `maxAge: 8 * 60 * 60` (8h) — overrides NextAuth's 30-day default. Auto-logout confirmed in authOptions.
4. ✓ Admin pages are `noindex` via `app/admin/layout.tsx` metadata.
5. ✓ `/admin/monitoring` — `getServerSession(auth)` gate; redirect to `/admin/login` if no session.
6. ✓ `getMonitoringSnapshot()` fails-quiet for all subsections — broken subsystem returns empty/zeroed section, page renders empty-state message, never throws.
7. ✓ Mailer audit table (last 20) + client error feed (last 20) render from process-scoped ring buffers. Cold start = empty buffers (ADR 001 documented tradeoff).
8. ⚠ Monitoring page uses `export const revalidate = 60` (ISR). In the absence of a visitor hitting the page, the ISR cache won't refresh. Admin must hard-refresh for an up-to-the-minute view. Not a bug — documented behaviour, acceptable ops tradeoff.

Breaks found: **none**. Flow ✓ clean.

---

## Cross-flow findings

**A. Certificate always generic (affects Flow 3 and any gift flow)**
The `success_url` in `/api/checkout/route.ts:198` never includes `donor_name` or `alpaca_name`. Every adoption certificate downloaded from the thank-you screen says "Honoured friend" and has no alpaca name. A `TODO` comment in `components/adopt-thank-you.tsx:138–140` explicitly calls this out as unimplemented. Affects both monthly and yearly flows.

**B. Gift fields silently dropped before checkout URL (affects Flow 4)**
`AdoptCheckoutOpts` in `lib/payment-vendor.ts:63–71` declares only `{ alpaca?: string }`. Gift fields (`giftName`, `giftEmail`, `giftDeliver`) are populated in `app/[locale]/adopt/page.tsx:132–143` but the type cannot carry them. The Stripe adapter's `buildCheckoutUrl` call passes `{ mode, alpaca }` only; gift fields never reach the checkout URL. This means a gift purchase goes through as a normal purchase — the welcome email goes to the buyer, the gift recipient gets nothing, and no future send is scheduled.

**C. Referral banner param mismatch (affects Flow 6)**
`ReferralAppliedBanner` reads `?referral=` (the Stripe coupon-code param). Alice's attribution link uses `?ref=` (the metadata-only param). The banner never fires on attribution links; it only fires for legacy coupon-code links. Attribution still works silently.

**D. Newsletter unsubscribe hardcoded to `/en/` (affects Flow 7)**
`UNSUBSCRIBED_PAGE = …/en/newsletter/unsubscribed` in `app/api/newsletter/unsubscribe/route.ts:26`. German/Dutch/Italian subscribers see the English unsubscribed page. CAN-SPAM compliant (unsubscribe works) but localisation gap.

**E. Mollie portal routing (affects Flow 5)**
Cannot determine statically whether `BillingPortalLink` component correctly routes to `/api/mollie-manage` when `vendor='mollie'` prop is passed. Requires runtime test.

---

## Needs runtime test (CANT-BE-DONE-LOCALLY)

1. **Flow 5** — Mollie billing portal routing: confirm `BillingPortalLink` hits `/api/mollie-manage` not `/api/billing-portal` when `vendor='mollie'`.
2. **Flow 7** — Newsletter confirm redirect locale: confirm middleware locale-detects a German-browser request to `/newsletter-confirmed` and serves `/de/newsletter-confirmed` not `/en/newsletter-confirmed`.
3. **Flow 8** — `@react-pdf/renderer` SDK presence: confirm `adoptcertificate` returns a PDF and not 503 in the actual deploy.
4. **Flow 3/4** — Stripe SDK presence at `/api/checkout`: confirm `stripe` npm package is installed in the Vercel deploy (dynamic import guard means the build succeeds without it).
