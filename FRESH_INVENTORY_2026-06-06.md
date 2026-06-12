# Fresh Inventory — 2026-06-10 (labeled 2026-06-06 per task spec)

> Generated from actual file reads, git diff, tsc, and pnpm build.
> DO NOT trust prior session notes — a large multi-session diff is uncommitted.

---

## A. Page Inventory (`app/[locale]/`)

Total pages: **49** `page.tsx` files found.

| Path slug | SC/CC | JSON-LD schemas | Primary CTA / outbound link | Incomplete / blockers |
|---|---|---|---|---|
| `/` (homepage) | SC | LocalBusiness, WebSite | FareHarbor booking, adopt CTA | ALPACA_CAM_EMBED_URL unset → cam section null |
| `/about` | SC | LocalBusiness, BreadcrumbList | Contact / Visit | Owner content blocks (finca size UNMAPPED in translation) |
| `/adopt` | SC | Product (AdoptAPaca), FAQPage, BreadcrumbList | Checkout (Stripe/Mollie/mailto) | Greeting cards, Junior tier, Campaign banner all env-gated |
| `/alpacas` | SC | ItemList (alpacas), BreadcrumbList | Individual alpaca pages | Renders empty until lib/data/alpacas.ts populated |
| `/alpacas/[slug]` | SC | Animal (alpaca profile), BreadcrumbList | Adopt CTA | notFound() on missing slug |
| `/cancel-feedback` | SC | none | Adopt page | — |
| `/contact` | SC | none | Email form | — |
| `/cookies` | SC | none | none | LEGAL_CONTENT_LIVE env gate; placeholder shown if unset |
| `/experiences` | SC | ItemList (experiences), BreadcrumbList | Individual experience pages | — |
| `/experiences/corporate-team-building` | SC | Event, Product, BreadcrumbList | BookingButton (FH item) | FAREHARBOR_ITEM_BUSINESS_INCENTIVES unset → main cal fallback |
| `/experiences/family-farm-days` | SC | Event, Product, BreadcrumbList | BookingButton (FH item) | FAREHARBOR_ITEM_FAMILY_FARM_DAYS unset → main cal fallback |
| `/experiences/romantic-sunset` | SC | Event, Product, BreadcrumbList | BookingButton (FH item) | FAREHARBOR_ITEM_ROMANTIC_SUNSET unset → main cal fallback |
| `/gifts` | SC | Product, BreadcrumbList | FareHarbor gift card URL | FAREHARBOR_ITEM_GIFT_CARD unset → main cal fallback |
| `/herd-family` | SC | none | Adopt tier | notFound() unless HERD_FAMILY_LIVE=true |
| `/impressum` | SC | none | none | LEGAL_CONTENT_LIVE gate |
| `/journal` | SC | Blog, BreadcrumbList | Journal post cards | Empty state until lib/data/journal.ts populated |
| `/journal/[slug]` | SC | Article, BreadcrumbList | Back to journal / related | notFound() for draft/archived/unknown slugs |
| `/media` | SC | none | none | PhotoGallery/VirtualFarmTour render null until media.ts populated |
| `/membership` | SC | Product, BreadcrumbList | Membership checkout | notFound() unless MEMBERSHIP_LIVE=true |
| `/membership/thank-you` | SC | none | Back to home | — |
| `/my-adoption` | SC | none | Billing portal / manage | Auth-gated; error-state.tsx sibling handles auth failures |
| `/newsletter-confirmed` | SC | none | Homepage | — |
| `/newsletter/archive` | SC | none | Newsletter subscribe | Empty state until newsletter-issues.ts populated |
| `/newsletter/unsubscribed` | SC | none | Homepage | — |
| `/offline` | SC | none | Retry | PWA offline page |
| `/preferences` | **CC** | none | Email preferences API | Token-validated before form renders |
| `/press` | SC | none | Press kit download | PressLogos renders null until press.ts + logos populated |
| `/press-kit` | SC | none | Download PDF links | PDF links are OWNER_INPUT_NEEDED |
| `/privacy` | SC | none | none | LEGAL_CONTENT_LIVE gate |
| `/recover-certificate` | SC | none | Certificate recovery form | — |
| `/redeem-voucher` | **CC** | none | Adopt CTA | VALID_VOUCHER_CODES needed or all codes invalid |
| `/share-adoption` | SC | none | Social share buttons | — |
| `/shop` | SC | ItemList (products), BreadcrumbList | Individual shop pages | — |
| `/shop/alcaca` | SC | Product, BreadcrumbList | BookingButton | TODO comment: confirm Alcaca Oro Negro prices per size tier |
| `/shop/commission` | SC | Product, BreadcrumbList | Commission form | — |
| `/shop/woven` | SC | Product, BreadcrumbList | BookingButton | FAREHARBOR_ITEM_WOVEN unset → main cal fallback |
| `/sitemap` | SC | none | Internal links | — |
| `/skein` | SC | Product, FAQPage, BreadcrumbList | Skein checkout (Stripe) | SKEIN_CALLOUT_LIVE gates homepage callout |
| `/skein/thank-you` | SC | none | Homepage | — |
| `/sustainability` | SC | none | Contact / Visit | — |
| `/terms` | SC | none | none | LEGAL_CONTENT_LIVE gate |
| `/tour-confirmation` | SC | none | ICS download | — |
| `/tours` | SC | ItemList (tours), FAQPage, BreadcrumbList | FareHarbor booking | SeasonalPriceList null until TOUR_SEASONAL_WINDOWS set |
| `/visit` | SC | LocalBusiness (map), BreadcrumbList | FareHarbor / directions | Travel time values UNMAPPED in translations |
| `/weaving` | SC | Product, BreadcrumbList | BookingButton (weaving workshop) | Images now wired to self-hosted paths (changed in this diff) |
| `/weddings` | SC | Event, BreadcrumbList | BookingButton (FH item) | FAREHARBOR_ITEM_WEDDINGS unset → main cal fallback |
| `/workshops` | SC | Event, BreadcrumbList | BookingButton | — |
| `/yoga` | SC | Event, Product, BreadcrumbList | BookingButton (FH item) | FAREHARBOR_ITEM_YOGA unset → main cal fallback |
| `/[...slug]` | SC | none | none | Catch-all → notFound() always |

**Notes:**
- `CC` = Client Component (`'use client'` at top). Only 2 pages are CC: `/preferences` and `/redeem-voucher`.
- SC = Server Component (default, no `'use client'`).
- `/weaving/collection` was **deleted** in this diff; 301 redirect added to `/shop/woven`.

---

## B. API Route Inventory (`app/api/`)

Total routes: **64** `route.ts` files found.

| Route | Method(s) | Auth gate | Rate-limit | Cache-Control | Failsafe documented |
|---|---|---|---|---|---|
| `/api/availability` | GET | open | ISR 1800s | no-store (dynamic) | Yes — 503 if FH keys unset |
| `/api/adopt-certificate` | GET | open (session ID in URL) | no | inline | Yes — 503 if Stripe SDK absent |
| `/api/adopt-count` | GET | open | no | ISR | — |
| `/api/adopt-deferred-gifts` | GET | CRON_SECRET | via runCron | no | Yes |
| `/api/adopt-milestone-emails` | GET | CRON_SECRET | via runCron | no | Yes |
| `/api/adopt-quarterly-update` | GET | CRON_SECRET | via runCron | no | Yes |
| `/api/adopt-renewal-reminders` | GET | CRON_SECRET | via runCron | no | Yes |
| `/api/alpaca-birthday-cards` | GET | CRON_SECRET | via runCron | no | Yes |
| `/api/analytics/data` | GET | session | no | no-store | — |
| `/api/auth/[...nextauth]` | GET+POST | NextAuth | — | — | Yes — fail-closed if creds unset |
| `/api/billing-portal` | POST | open (email oracle) | 5/5min IP | no-store | Yes — 503 if STRIPE_SECRET_KEY unset |
| `/api/calendar/renewal/[sessionId]` | GET | open | no | — | — |
| `/api/cancel-feedback` | POST | open | honeypot | no | — |
| `/api/checkout` | POST | open | 3/5min IP | no | Yes — 503 if STRIPE_SECRET_KEY unset |
| `/api/checkout-session/[id]` | GET | open | no | no-store | — |
| `/api/checkout/confirm` | GET | open | no | no | — |
| `/api/checkout/intent` | POST | open | no | no | — |
| `/api/commission` | POST | open | 2/5min IP + honeypot + Turnstile | no | Yes |
| `/api/contact` | POST | open | 2/5min IP + honeypot + Turnstile | no | Yes |
| `/api/donor-receipt/[sessionId]` | GET | open (session ID) | no | no-cache | Yes — 503 if PDF SDK absent |
| `/api/email-preferences` | GET+POST | HMAC token | 5/5min IP | no-store | Yes — 400/410 on bad/expired token |
| `/api/fareharbor-webhook` | POST | FAREHARBOR_WEBHOOK_SECRET (fail-CLOSED) | no | no | Yes |
| `/api/gdpr-request` | POST | open | 3/h IP + honeypot + Turnstile | no | Yes — always 200 |
| `/api/google-reviews` | GET | open | ISR | no | Yes — `{configured:false}` if keys unset |
| `/api/health` | GET | open | no | no-store | Yes — checks TIER1_KEYS |
| `/api/junior-checkout` | POST | open | 3/5min IP | no | Yes — 503 if keys unset |
| `/api/launch-readiness` | GET | session OR CRON_SECRET | no | no-store | Yes — fail-quiet checks |
| `/api/log-error` | POST | open | 20/h IP | no | Yes — 204, no body |
| `/api/membership-checkout` | POST | open | IP (mirrors checkout) | no | Yes — 503 if keys unset |
| `/api/mollie-checkout` | POST | open | IP | no | Yes — 503 if keys unset |
| `/api/mollie-checkout/confirm` | GET | open | no | no | — |
| `/api/mollie-checkout/intent` | POST | open | no | no | — |
| `/api/mollie-manage` | POST | open (email oracle) | 5/5min IP | no | Yes — 503 if MOLLIE_API_KEY unset |
| `/api/mollie-manage/cancel` | POST | HMAC token + origin check | no | no | Yes |
| `/api/mollie-manage/status` | GET | open | no | no-store | — |
| `/api/mollie-manage/update-payment` | GET+POST | HMAC token + origin check | 5/60s IP | no | Yes |
| `/api/mollie-webhook` | POST | URL-secret (fail-CLOSED) | no | no | Yes |
| `/api/newsletter` | POST | open | 5/5min IP + 3/24h email + honeypot + Turnstile | no | Yes — double opt-in only |
| `/api/newsletter/confirm` | GET | HMAC token | no | no | Yes — 400/410 |
| `/api/newsletter/unsubscribe` | GET+POST | HMAC token | no | no | Yes — always 200/303 |
| `/api/owner-digest` | GET | CRON_SECRET | no | no | Yes — 401 if secret wrong |
| `/api/owner-mrr-digest` | GET | CRON_SECRET | via runCron | no | Yes |
| `/api/recover-certificate` | POST | open (email oracle) | 2/h email + Turnstile | no | Yes — always 200 |
| `/api/reminder` | POST | REMINDER_WEBHOOK_SECRET (fail-OPEN) | 2/5min IP | no | Yes |
| `/api/resend-webhook` | POST | RESEND_WEBHOOK_SECRET (fail-CLOSED) | no | no | Yes |
| `/api/review-request` | POST | REVIEW_REQUEST_WEBHOOK_SECRET (fail-OPEN) | 2/5min IP | no | Yes |
| `/api/search` | GET | open | ISR 1h | 1y immutable | — |
| `/api/setup-probe` | GET | open | no | no-store | Yes — fail-quiet per check |
| `/api/skein-checkout` | POST | open | 3/5min IP | no | Yes — 503 if keys unset |
| `/api/social-proof` | GET | open | ISR 30min | 1y immutable | Yes — fallback copy if unconfigured |
| `/api/stripe-webhook` | POST | STRIPE_WEBHOOK_SECRET (fail-CLOSED) | no | no | Yes |
| `/api/tour-ics` | GET | open | 20/5min IP | no | Yes — 400 on bad params |
| `/api/translate` | POST | open | 30/min IP | 24h in-memory | Yes — always 200, noop result |
| `/api/voucher-redeem` | POST | open + honeypot + Turnstile | IP | no | Yes — always 200 |
| `/api/waitlist` | POST | open + honeypot + Turnstile | 2/5min IP + 3/24h email | no | Yes — always 200 |
| `/api/admin/*` | various | session (getServerSession) | varies | no | Yes — 401/501 patterns |

---

## C. Component Inventory

- **Total component files:** 192 `.tsx` files in `components/`
- **Client components** (`'use client'` directive): 135 files
- **Server components** (no directive): 57 files

### Accessibility-focused components (aria-live / aria-current / aria-label / aria-hidden)

`components/admin/monitoring-card.tsx`, `components/admin/setup-step.tsx`, `components/adopt/adopt-benefits-list.tsx`, `components/adopt/adopt-checkout-link.tsx`, `components/adopt/adopt-gift-adoption.tsx`, `components/adopt/adopt-share-card.tsx`, `components/adopt/adopt-sticky-mobile-bar.tsx`, `components/adopt/adopter-counter.tsx`, `components/adopt/adopters-wall.tsx`, `components/adopt/adoption-certificate-preview.tsx`, `components/adopt/adoption-timeline.tsx`, `components/adopt/alpaca-personality-match.tsx`, `components/adopt/alpaca-picker.tsx`, `components/adopt/campaign-banner.tsx`, `components/adopt/cancel-feedback-form.tsx`, `components/adopt/embedded-checkout.tsx`, `components/adopt/embedded-mollie-checkout.tsx`, `components/adopt/greeting-card-picker.tsx`, `components/adopt/junior-tier-card.tsx`, and ~80 more including all form, nav, gallery, and booking components.

### Env-gated UI components

| Component | Gate condition |
|---|---|
| `components/alpaca-cam-embed.tsx` | `ALPACA_CAM_EMBED_URL` — renders null if unset or unsafe |
| `components/awards-badges.tsx` | data presence check |
| `components/booking/fareharbor-calendar.tsx` | `NEXT_PUBLIC_FAREHARBOR_SHORTNAME` |
| `components/corporate-enquiry-form.tsx` | `process.env.NODE_ENV` dev hint |
| `components/events-calendar.tsx` | `hasUpcomingEvents()` check |
| `components/header.tsx` | `adoptFlags` prop (SKEIN/MEMBERSHIP/HERD_FAMILY env) |
| `components/layout/owner-confirm-banner.tsx` | `NODE_ENV !== 'production'` |
| `components/legal-content-pending-notice.tsx` | `LEGAL_CONTENT_LIVE` |
| `components/photo-gallery.tsx` | `hasLiveMedia()` |
| `components/press-logos.tsx` | `hasLivePress()` |
| `components/social-proof-strip.tsx` | FareHarbor config check |
| `components/sw-register.tsx` | `NODE_ENV === 'production'` |
| `components/trust-signals.tsx` | data presence |
| `components/turnstile-widget.tsx` | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` |
| `components/vercel-instrumentation.tsx` | `NODE_ENV === 'production'` |
| `components/virtual-farm-tour.tsx` | `liveVirtualTourStops()` |

### Fail-quiet (renders null on missing config) components

`components/alpaca-cam-embed.tsx`, `components/adopt/greeting-card-picker.tsx`, `components/adopt/junior-tier-card.tsx`, `components/awards-badges.tsx`, `components/campaign-banner-generic.tsx`, `components/events-calendar.tsx`, `components/floating-whatsapp.tsx`, `components/photo-gallery.tsx`, `components/press-logos.tsx`, `components/seasonal-price-list.tsx`, `components/social-proof-strip.tsx`, `components/tours/bundle-cta.tsx`, `components/virtual-farm-tour.tsx`.

---

## D. Lib Inventory (`lib/`)

Total lib modules (non-test): **149** `.ts` files.

| File | Summary | Key exports | Module-level side effects | TODOs |
|---|---|---|---|---|
| `admin-styles.ts` | Admin UI CSS class constants | named style objects | none | — |
| `adopt-checkout-state.ts` | Reads URL query params to determine checkout state | `getAdoptCheckoutState()` | none | — |
| `adopt-fallback.ts` | Mailto fallback URL builder for adopt CTA | `buildAdoptMailtoUrl()` | none | — |
| `adopters/count.ts` | Mollie customer count (cached 5min) | `countAdopters()` | globalThis cache | — |
| `adopters/latest.ts` | Latest adopter display names | `getLatestAdopters()` | globalThis cache | — |
| `alpaca-gallery-store.ts` | In-memory gallery state for admin upload | `alpacaGalleryStore` | globalThis | — |
| `alpacas/filter.ts` | Filter alpaca roster by traits | `filterAlpacas()` | none | — |
| `alpacas/resolve-bio.ts` | Resolve alpaca bio from i18n or data | `resolveAlpacaBio()` | none | — |
| `analytics*.ts` (3 files) | GA4 event helpers, engagement tracking | `trackEvent()`, `trackEngagement()` | none | — |
| `booking-engine/` (4 files) | Pluggable booking engine (FareHarbor / null adapters) | `getBookingEngine()` | singleton | — |
| `booking-schedule-store.ts` | In-memory store for scheduled Resend emails | `bookingScheduleStore` | globalThis (ADR 001) | — |
| `brand.ts` | Brand constants (name, tagline) | named exports | none | — |
| `calendar/` (2 files) | ICS file builder + tour event builder | `buildTourIcs()` | none | — |
| `checkout-mode.ts` | Reads CHECKOUT_MODE env override | `getCheckoutMode()` | none | — |
| `checkout-states.ts` | Canonical checkout-state constants | `MOLLIE_PENDING_STATES`, `SUCCESS_LIKE_CHECKOUT_STATES` | none | — |
| `client-error-buffer.ts` | Ring buffer for client errors | `appendClientError()`, `getClientErrorEntries()` | globalThis ring buffer | — |
| `client-retry.ts` | Exponential backoff fetch helper | `fetchWithRetry()` | none | — |
| `client-track.ts` | Client-side event tracking | `trackClientEvent()` | none | — |
| `config.ts` | All env var constants + FareHarbor URL builders | ~50 exports | none | — |
| `consent-gate.ts` | Reads cookie-consent state | `hasConsented()` | none | — |
| `cron-auth.ts` | `verifyCronSecret()` HMAC check | `verifyCronSecret()` | none | — |
| `cron-runner.ts` | Shared cron wrapper (auth, timing, heartbeat) | `runCron()` | none | — |
| `data/alpacas.ts` | Alpaca roster (static TypeScript data) | `ALPACAS` array | none | — |
| `data/awards.ts` | Award/badge data | `AWARDS` | none | — |
| `data/events.ts` | Upcoming events data | `EVENTS` | none | — |
| `data/greeting-cards.ts` | Greeting card designs | `GREETING_CARDS` | none | — |
| `data/journal*.ts` (2 files) | Journal post data + access helpers | `findPost()`, `liveJournalPosts()` | none | — |
| `data/legal-meta.ts` | Legal page version/dates | named exports | none | — |
| `data/media.ts` | Photo gallery + virtual tour media | `liveMedia()`, `liveVirtualTourStops()` | none | — |
| `data/newsletter-issues.ts` | Newsletter archive issues | `liveNewsletterIssues()` | none | — |
| `data/press.ts` | Press mention data | `livePress()`, `hasLivePress()` | none | — |
| `data/search-index.ts` | Static search index entries | `SEARCH_INDEX` | none | — |
| `data/social-proof.ts` | Social proof data (reviews, adopter count) | named exports | none | — |
| `data/testimonials.ts` | Testimonial data | `TESTIMONIALS` | none | — |
| `db/` (6 files) | Drizzle ORM client, schema, migrations, readers | `db`, schema, read helpers | db singleton | — |
| `donor-portal-data.ts` | Mollie subscription + payment data for donor | `getDonorPortalData()` | none | — |
| `email-preferences-token.ts` | HMAC token for email prefs link | `buildPreferencesToken()`, `verifyPreferencesToken()` | none | — |
| `email-suppression.ts` | Email suppression list in-process store | `isSuppressed()`, `addSuppression()` | globalThis store | — |
| `email-templates.ts` | All transactional email HTML builders | ~15 `build*Email()` exports | none | — |
| `email-templates-retention.ts` | Retention/churn email templates | retention email builders | none | — |
| `event-subscribers.ts` | Internal domain event pub/sub | `subscribe()`, `emit()` | none | — |
| `events.ts` | Domain event type definitions | `DomainEvent` types | none | — |
| `fareharbor-products.ts` | Maps product slugs to FH booking URLs | `getProductBookingUrl()` | none | — |
| `fetch.ts` | `fetchWithTimeout()` wrapper | `fetchWithTimeout()` | none | — |
| `format-price.ts` | EUR price formatter | `formatPrice()` | none | — |
| `gift-fields.ts` | Gift adoption field helpers | `parseGiftFields()` | none | — |
| `handlers/tour-email-handler.ts` | Shared tour email dispatcher | `handleTourEmail()` | none | — |
| `heartbeat.ts` | Fires healthcheck.io ping | `pingHeartbeat()` | none | — |
| `honeypot.ts` | Bot honeypot field detection | `detectHoneypot()` | none | — |
| `hooks/use-form-draft.ts` | LocalStorage form draft hook | `useFormDraft()` | none | — |
| `hooks/use-form-submit.ts` | Form submit state machine | `useFormSubmit()` | none | — |
| `html.ts` | XSS escaping + CRLF sanitization | `escapeHtml()`, `sanitizeHeader()` | none | — |
| `i18n-metadata.ts` | hreflang alternate URL builder | `buildLocaleAlternates()` | none | — |
| `ics.ts` | Low-level ICS format helpers | `buildIcsEvent()` | none | — |
| `in-process-ttl-store.ts` | Generic TTL Map factory | `createTtlStore()` | none (globalThis for HMR) | — |
| `integrations/` (15 files) | Pluggable integration adapters (email, payment, captcha, booking, content, map) | adapter factories | none | — |
| `launch-readiness/checks.ts` | All 27 launch-readiness checks | `runLaunchReadinessChecks()` | none | — |
| `legal/auto-policy.ts` | Legal policy text generation | `getAutoPolicy()` | none | — |
| `log-pii.ts` | PII redaction for logs | `redactPii()` | none | — |
| `mailer.ts` | Resend wrapper + audit ring buffer | `sendEmail()`, `cancelScheduledEmail()` | globalThis audit buffer | — |
| `migration/parse-fareharbor-csv.ts` | CSV parser for FH booking history | `parseFarharborCsv()` | none | — |
| `milestones.ts` | Adoption milestone definitions | `MILESTONES` | none | — |
| `mollie-html-response.ts` | HTML response builder for Mollie cancel/update pages | `buildMollieHtmlResponse()` | none | — |
| `mollie-manage-token.ts` | HMAC cancel/update capability tokens | `buildMollieCancelToken()`, `verifyTokenWithScope()` | none | — |
| `monitoring/snapshot.ts` | Aggregates monitoring data for admin page | `getMonitoringSnapshot()` | none | — |
| `newsletter-token.ts` | HMAC newsletter confirm/unsubscribe tokens | `buildNewsletterToken()`, `verifyToken()` | none | — |
| `newsletter.ts` | Newsletter subscriber management (SendGrid) | `subscribeToNewsletter()` | none | — |
| `notfound-log.ts` | 404 referrer logger with dedupe | `logNotFound()`, `getRecentEntries()` | globalThis TTL store | — |
| `og-images.ts` | OG image URL helpers | `getOgImage()`, `DEFAULT_OG_IMAGE` | none | — |
| `oracle-form-guard.ts` | `withAlwaysOk200()` anti-enumeration wrapper | `withAlwaysOk200()` | none | — |
| `owner-notify.ts` | Slack/Telegram/Discord/webhook escalation | `notifyOwner()` | none | — |
| `payment-failure-tracker*.ts` (2 files) | Dunning severity tracker + readers | `recordFailure()`, `getFailureSeverity()` | globalThis TTL store | — |
| `payment-handlers*.ts` (3 files) | Pure payment event handlers (Stripe, Mollie, gift schedule, recovery) | `handleStripeCheckoutCompleted()`, `handleMolliePaymentPaid()`, etc. | none | — |
| `payment-vendor.ts` | Payment adapter factory (resolves PAYMENT_VENDOR) | `getPaymentAdapter()` | none | — |
| `pdf-renderer.ts` | `@react-pdf/renderer` wrapper | `renderPdfToResponse()` | none | — |
| `public-form-guard.ts` | Shared honeypot+rate-limit+Turnstile stack | `checkPublicFormGuard()` | none | — |
| `quarterly-content-store.ts` | In-memory quarterly update content staging | `quarterlyContentStore` | globalThis | — |
| `quarterly-suggest.ts` + `quarterly-update.ts` | AI-suggested + manual quarterly update email builders | named exports | none | — |
| `rate-limit.ts` | Sliding-window in-memory rate limiter | `rateLimit()`, `rateLimitByEmail()` | globalThis store + crypto import | — |
| `referral-codes.ts` | Referral code validation regex | `REFERRAL_CODE_RE` | none | — |
| `referral-count-reader.ts` | Counts referred Mollie subscriptions | `countReferredSubscriptions()` | 5min in-process cache | — |
| `request-id.ts` | X-Request-ID header helper | `getRequestId()` | none | — |
| `retry.ts` | Generic retry with backoff | `withRetry()` | none | — |
| `robots-env.ts` | `isProductionEnv()` check for robots.ts | `isProductionEnv()` | none | — |
| `route-helpers.ts` | `requireOptionalWebhookSecret()` legacy helper | `requireOptionalWebhookSecret()` | none | — |
| `same-origin-guard.ts` | Origin header check for POST routes | `checkSameOrigin()` | none | — |
| `search/build-index.ts` | Static search index builder | `buildSearchIndex()` | none | — |
| `secrets.ts` | Timing-safe secret comparison | `safeEqual()` | none | — |
| `structured-data.ts` | JSON-LD schema builders | `localBusinessSchema()`, `productSchema()`, `eventSchema()`, etc. | none | — |
| `tenant.ts` | Legacy tenant accessor | `getTenant()` | none | — |
| `tenants/` (8 files) | Multi-tenant config (alpacasibiza + example), registry, types, theme, server accessor | `getTenant()`, `tenantMetadata()` | none | — |
| `translate.ts` | MyMemory translation client | `translateText()` | none | — |
| `turnstile.ts` | Turnstile + reCAPTCHA v3 verifiers | `verifyHumanToken()`, `verifyViaTurnstile()`, `verifyViaRecaptcha()` | none | — |
| `use-availability.ts` | Client hook for tour availability | `useAvailability()` | none | — |
| `useFormSubmit.ts` | Legacy form submit hook (deprecated path — also at hooks/use-form-submit.ts) | `useFormSubmit()` | none | POTENTIAL DUPLICATE — two paths for same hook |
| `utils.ts` | Tailwind `cn()` helper | `cn()` | none | — |
| `validate-email.ts` | Email regex validator | `isValidEmail()` | none | — |
| `validate-env.ts` | Boot-time env var checker, TIER1_KEYS, TIER2_VARS | `validateEnv()`, `TIER1_KEYS`, `TIER2_VARS`, `isSet()`, `getContactEmail()` | `_ran` guard (module-level) | — |
| `vat-recorder.ts` + `vat-tracker.ts` | EU OSS VAT threshold tracker | `recordVatTransaction()`, `getVatSummary()` | none | — |
| `webhook-idempotency.ts` | Duplicate-event guard (4d TTL) | `isAlreadyProcessed()`, `markProcessed()` | globalThis TTL store | — |
| `webhook-router.ts` | Generic webhook dispatcher | `routeWebhook()` | none | — |
| `webhook-secret.ts` | `makeWebhookSecretProvider()` factory | `makeWebhookSecretProvider()` | none | — |

---

## E. Env Var Inventory

### validate-env.ts counts
- **TIER1_KEYS:** 8 keys (`RESEND_API_KEY`, `CONTACT_EMAIL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET`)
- **TIER2_VARS:** 60 entries in the exported array

### Env drift: vars in `.env.local.example` NOT in TIER1 or TIER2 lists

These 47 vars appear in `.env.local.example` but have no entry in `TIER2_VARS` (and are not in `TIER1_KEYS`). They either fall through to boot-log silence or are self-documenting via code:

**Notable omissions from TIER2_VARS (code actively uses these; /admin/env-check will show no entry):**
- `CAPTCHA_PROVIDER` — selects captcha adapter; not surfaced in TIER2
- `RECAPTCHA_SECRET_KEY` + `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` + `RECAPTCHA_MIN_SCORE` — reCAPTCHA v3 path not in TIER2
- `LEGAL_CONTENT_LIVE` — gates legal pages; not in TIER2
- `SKEIN_CALLOUT_LIVE` — seasonal gate; referenced in CLAUDE.md tier listing but not in `TIER2_VARS` array
- `RESEND_WEBHOOK_SECRET` — fail-CLOSED webhook guard; should arguably be TIER1 or TIER2
- `OWNER_SLACK_WEBHOOK_URL` / `OWNER_TELEGRAM_BOT_TOKEN` / `OWNER_TELEGRAM_CHAT_ID` / `OWNER_NOTIFY_DISCORD_URL` / `OWNER_GENERIC_WEBHOOK_URL` — escalation notifications not in TIER2
- `HEARTBEAT_*_URL` (4 vars) — cron dead-man's-switch monitors not in TIER2
- `REMINDER_WEBHOOK_SECRET` / `REVIEW_REQUEST_WEBHOOK_SECRET` — per-route FH webhook secrets not in TIER2
- `FAREHARBOR_ITEM_WOVEN` / `FAREHARBOR_ITEM_COMMISSION` / `FAREHARBOR_ITEM_ALCACA` — shop item IDs used in code but not in TIER2
- `FAREHARBOR_ITEM_TOUR_MEET_HERD` / `FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE` / `FAREHARBOR_ITEM_TOUR_PHOTO_SESSION` — tour item IDs not in TIER2

**Intentionally omitted (infrastructure / no boot-warn needed):**
- `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` — infra, auto-provided by Vercel
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_FAREHARBOR_SHORTNAME`, `NEXT_PUBLIC_FAREHARBOR_FLOW_ID` — hardcoded in code per CLAUDE.md
- `ADOPT_PRICE_MONTHLY_EUR`, `ADOPT_PRICE_YEARLY_EUR`, `YOGA_PRICE_EUR` — override-only pricing
- `SENDGRID_*` — optional list management
- `CHECKOUT_MODE` — dev-only override

---

## F. Recent-Change Surface

**Uncommitted file count: 316** (`git status --short`)
- 174 modified (`M`)
- 133 new/untracked (`??`) including 38 new `.ts`/`.tsx` files
- 9 deleted (`D`)

### Deleted files
| File | Disposition |
|---|---|
| `app/[locale]/weaving/collection/page.tsx` | Merged into `/shop/woven`; 301 redirect added to `next.config.mjs` |
| `components/admin/check-list.tsx` | Replaced — no imports found pointing to it |
| `components/cookie-consent.tsx` | Replaced by `components/cookie-consent-v3.tsx` (vanilla-cookieconsent library) |
| `lib/launch-readiness/check-build.ts` | Consolidated into `lib/launch-readiness/checks.ts` (monolithic) |
| `lib/launch-readiness/check-content.ts` | Same consolidation |
| `lib/launch-readiness/check-deploy.ts` | Same consolidation |
| `lib/launch-readiness/check-dns.ts` | Same consolidation |
| `lib/launch-readiness/check-env.ts` | Same consolidation |
| `lib/payment-handlers-referral.ts` | Inlined into `lib/payment-handlers.ts`; no orphan imports found |

### New files of note (untracked)
`components/intl-client-provider.tsx` — wraps `NextIntlClientProvider` with a typed interface; used in layout.  
`components/cookie-consent-v3.tsx` — vanilla-cookieconsent v3 library, replaces the hand-rolled version.  
`lib/launch-readiness/checks.ts` — the monolithic consolidation of 5 deleted sub-files.  
`lib/oracle-form-guard.ts`, `lib/public-form-guard.ts` — security abstractions for form routes.  
`lib/cron-runner.ts` — shared cron auth/heartbeat/retry wrapper used by 5 cron routes.  
`lib/pdf-renderer.ts` — centralizes react-pdf dynamic import.  
`lib/in-process-ttl-store.ts` — shared TTL Map factory backing idempotency + rate-limit.  

### Half-applied / suspicious changes
1. **`middleware.ts`** — matcher pattern changed to exclude `.*\\..*` (all static assets). This is the standard fix for the "header logo 404 on locale redirect" bug. Build passes and the comment explains the reason. No concerns.
2. **`app/[locale]/layout.tsx`** — switched from `NextIntlClientProvider` to `IntlClientProvider` (thin wrapper). The new component exists and is wired. Clean.
3. **CRLF warnings on 5 files** (`my-adoption/page.tsx`, `share-adoption/page.tsx`, `my-adoption/error-state.tsx`, `experiences/corporate-team-building/page.tsx`, `experiences/family-farm-days/page.tsx`) — git line-ending conversion pending. Not a functional issue, but will show up dirty on commit.
4. **`lib/useFormSubmit.ts`** — a top-level legacy file duplicates `lib/hooks/use-form-submit.ts`. Both exist; unclear which consumers are using which path.

---

## G. Quality Signals

### tsc --noEmit
**Result: PASS (exit 0, no errors, no output)**

### pnpm build
**Result: PASS — 429 static pages generated**

Two Turbopack warnings (non-blocking):
1. `lib/mailer.ts:2` — `import { createHash } from 'crypto'` loaded in Edge Runtime context (via `app/[locale]/alpacas/[slug]/opengraph-image.tsx` import chain). This is a Turbopack static analysis warning; the crypto module is only used in Node.js routes at runtime, not on the edge. No breakage.
2. `lib/rate-limit.ts:58` — Same pattern: `crypto` import detected in edge import chain via `app/og/route.tsx`. Same class as #1.

One deprecation warning: `middleware.ts` → "use proxy instead" per Next.js 16. Not blocking.

---

## Summary (under 500 words)

**Counts:**
- Pages: 49 | API routes: 64 | Components: 192 TSX files | Lib modules: 149 (non-test)
- Uncommitted files: 316 (174 modified, 133 new, 9 deleted)
- tsc: PASS (clean, no errors)
- pnpm build: PASS (429 pages, 2 non-blocking Turbopack crypto/edge warnings, 1 middleware deprecation warning)

**Differences from prior session notes:**
- `lib/launch-readiness/check-{build,content,deploy,dns,env}.ts` — 5 files were deleted and consolidated into a new `lib/launch-readiness/checks.ts`. No orphan imports; build confirms this is clean.
- `components/cookie-consent.tsx` — deleted; replaced by `components/cookie-consent-v3.tsx` using the `vanilla-cookieconsent` library. The new component is mounted in `app/[locale]/layout.tsx`.
- `app/[locale]/weaving/collection/page.tsx` — deleted; 301 redirect to `/shop/woven` added in `next.config.mjs`. Intentional consolidation.
- `lib/payment-handlers-referral.ts` — deleted; referral logic appears inlined into `lib/payment-handlers.ts`.
- `validate-env.ts` — significantly refactored: the long hand-rolled warn-per-key loop was replaced with a data-driven `TIER2_VARS` array loop. The `TIER2_VARS` export is new and is used by `/admin/env-check`.
- `middleware.ts` — one-line matcher change to exclude all dotted paths (static assets). Fixes logo/image 404s on locale routes. Clean.

**3 most-concerning findings:**

1. **TIER2_VARS drift vs .env.local.example** — 47 env vars in `.env.local.example` have no entry in `TIER2_VARS`, meaning `/admin/env-check` will silently not surface them as missing. High-value omissions: `CAPTCHA_PROVIDER`, `RECAPTCHA_SECRET_KEY`, `LEGAL_CONTENT_LIVE`, `SKEIN_CALLOUT_LIVE`, `RESEND_WEBHOOK_SECRET`, all 4 `HEARTBEAT_*` vars, `FAREHARBOR_ITEM_WOVEN/COMMISSION/ALCACA`, and 3 tour item IDs. These are all functional vars that affect runtime behavior.

2. **Two crypto/Edge Runtime warnings in build** — `lib/mailer.ts` and `lib/rate-limit.ts` both import Node's `crypto` and are reachable via edge-runtime import chains (OG image route, setup-probe). Currently warnings, not errors, but the OG image route (`/api/og`) runs on Edge — if it ever actually calls `mailer.ts` or `rate-limit.ts` at edge runtime, it will fail at runtime with no type error or build failure. Needs import-chain audit.

3. **`lib/useFormSubmit.ts` (root-level) vs `lib/hooks/use-form-submit.ts`** — two files exist for what appears to be the same hook. If consumers are split across both paths, a change to one won't propagate to the other. Should verify which is canonical and remove/re-export the other.
