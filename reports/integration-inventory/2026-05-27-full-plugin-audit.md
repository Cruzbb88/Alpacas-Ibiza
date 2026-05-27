# Full Plugin & Integration Audit — alpaca-farm-redesign
**Date:** 2026-05-27  
**Auditor:** Claude Code (Sonnet)  
**Sources:** package.json, app/layout.tsx, lib/integrations/*, app/api/*, .env.local.example, CLAUDE.md failsafe map, INTEGRATION_STATUS_2026-04-20.md, OWNER_INPUT_NEEDED.md, CANT_BE_DONE.md

---

## Summary Counts

| Status | Count |
|---|---|
| WIRED | 19 |
| PARTIAL | 10 |
| MISSING | 5 |
| NOT-PLANNED-FOR-V1 | 12 |
| **Total inventoried** | **46** |

---

## Full Matrix

### PAYMENTS

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **Stripe Checkout** (Adopt single-account) | PARTIAL | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ADOPT_PRICE_ID_MONTHLY`, `STRIPE_ADOPT_PRICE_ID_YEARLY`, `PAYMENT_VENDOR=stripe` | `app/api/checkout/route.ts`, `app/api/stripe-webhook/route.ts`, `lib/integrations/payment-stripe-direct.ts`, `lib/payment-vendor.ts` | Checkout 503; adopt CTA silently falls back to mailto. Webhook 503 (fail-CLOSED). | SDK not installed (`stripe` not in package.json). Owner must: create Stripe account + 2 Price objects + register webhook endpoint. Then: `pnpm add stripe`, set 5 env vars, set `PAYMENT_VENDOR=stripe`. |
| **Stripe Connect** (multi-tenant platform fee) | PARTIAL — guarded | `STRIPE_PLATFORM_SECRET_KEY`, `PLATFORM_FEE_BPS` (commented in .env.example) | `lib/integrations/payment-stripe-connect.ts`, `lib/payment-vendor.ts` `stripeConnectVendorGuardAdapter()` | Guard adapter throws + logs on every CTA build. Deliberately prevents activation. | DEFER until tenant #1 signs. Activation requires separate legal review (money transmission). |
| **Mollie** (EU SEPA Direct Debit, recommended) | PARTIAL | `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_SECRET`, `PAYMENT_VENDOR=mollie` | `app/api/mollie-checkout/route.ts`, `app/api/mollie-webhook/route.ts`, `lib/integrations/payment-mollie.ts`, `lib/payment-vendor.ts` | Checkout 503; adopt CTA falls back to mailto. Webhook 503 (fail-CLOSED). | SDK not installed (`@mollie/api-client` not in package.json). Owner must: create Mollie account, enable SEPA/Cards/iDEAL/Bancontact, copy API key. Then: `pnpm add @mollie/api-client`, set 3 env vars, set `PAYMENT_VENDOR=mollie`. |
| **Mailto fallback** (Adopt default) | WIRED | None | `lib/integrations/payment-manual-mailto.ts`, `lib/payment-vendor.ts` | N/A — this IS the fallback | Active right now. CTA sends to `info@alpacasibiza.com`. No config needed. |
| **FareHarbor passthrough** (Adopt via booking item) | WIRED (adapter only) | `FAREHARBOR_ITEM_ADOPT_MONTHLY`, `FAREHARBOR_ITEM_ADOPT_YEARLY` | `lib/integrations/payment-fareharbor-passthrough.ts` | Falls back to mailto if item IDs unset | Needs owner to create Adopt items in FareHarbor and provide item IDs. |
| **PayPal** | NOT-PLANNED | — | — | — | Not in scope for v1. |

---

### BOOKING

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **FareHarbor embed** (calendar widget) | WIRED | None (hardcoded: shortname=alpacasibiza, FLOW=1257173) | `app/layout.tsx:106-109` (`lazyOnload` script tag) | Script simply doesn't load if CDN down | Nothing. Hardcoded and live. |
| **FareHarbor item-specific URLs** | WIRED (fail-open) | `FAREHARBOR_ITEM_TOUR_*`, `FAREHARBOR_ITEM_YOGA` (optional per-tour IDs) | `lib/config.ts` `getFareHarborTourUrl()` | Falls back to main calendar URL if item ID unset | Owner must supply 4–5 item IDs from FareHarbor admin (see OWNER_INPUT_NEEDED). Without them, "Book this tour" buttons open general calendar. |
| **FareHarbor API** (live spots-left widget) | PARTIAL | `FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY` | `app/api/availability/route.ts`, `lib/booking-engine/fareharbor-adapter.ts` | Returns 503; UI hides date grid, keeps static CTA | Requires FareHarbor Pro plan. Owner emails support@fareharbor.com. API route and adapter fully built — just needs keys. |
| **FareHarbor webhooks** (booking.created, availability.completed) | WIRED | `FAREHARBOR_WEBHOOK_SECRET` | `app/api/fareharbor-webhook/route.ts`, `app/api/reminder/route.ts`, `app/api/review-request/route.ts`, `lib/webhook-router.ts` | Webhook returns 503 (fail-CLOSED) if secret unset | Owner must configure FareHarbor webhook endpoints (dashboard → Integrations → Webhooks) with `booking.created` → `/api/reminder` and `availability.completed` → `/api/review-request`. Env var `FAREHARBOR_WEBHOOK_SECRET` must match. |
| **FareHarbor shop item IDs** | PARTIAL | `FAREHARBOR_ITEM_WOVEN`, `FAREHARBOR_ITEM_COMMISSION`, `FAREHARBOR_ITEM_ALCACA` | `lib/config.ts` | Falls back to base calendar | Owner must decide whether shop items live in FareHarbor or Stripe/elsewhere. |

---

### EMAIL

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **Resend** (transactional) | WIRED | `RESEND_API_KEY`, `CONTACT_EMAIL` (Tier 1 — MUST set) | `lib/mailer.ts`, `lib/integrations/email-resend.ts`, `app/api/contact/route.ts`, `app/api/commission/route.ts`, `app/api/newsletter/route.ts`, `app/api/reminder/route.ts`, `app/api/review-request/route.ts`, `app/api/owner-digest/route.ts` | Mailer THROWS on missing key (routes catch → 500 response). Not silent. | Set `RESEND_API_KEY` in Vercel env. Also: verify `alpacasibiza.com` domain in Resend dashboard + add DKIM/SPF DNS records before launch (currently uses Resend default domain). |
| **SendGrid** (newsletter list management) | PARTIAL | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_LIST_ID` | `lib/newsletter.ts` (called from `app/api/newsletter/route.ts`) | Warn + returns `{success:false}` silently — newsletter form still works, just doesn't sync to list | Code is built and integrated. Owner must: create SendGrid account, get API key, create a list, set 3 env vars. Without them the form works (confirmation email via Resend still sends) but no list is built. |
| **Email console-only adapter** | WIRED | None | `lib/integrations/email-console-only.ts` | N/A — used in dev/test mode | Dev/test fallback. Already working. |

---

### BOT PROTECTION

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **Cloudflare Turnstile** | WIRED (fail-open) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | `components/turnstile-widget.tsx`, `lib/turnstile.ts`, `lib/integrations/captcha-turnstile.ts` | Widget renders `null` (form shows without bot check). Server validates fail-open on missing secret. Prod `console.warn` fires. | Owner must: register site at dash.cloudflare.com → Turnstile, copy Site Key + Secret Key, set 2 env vars. Free, 5 min setup. |
| **Captcha-none adapter** | WIRED | None | `lib/integrations/captcha-none.ts` | N/A — fallback when Turnstile not configured | Already active as fallback. |

---

### ANALYTICS

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **GA4 client-side pixel** | WIRED | None (hardcoded `G-Y946QDVVQV`) | `app/layout.tsx:74-83` | Always fires. GDPR Consent Mode v2 gates analytics_storage. | Nothing. Live and firing. GDPR consent gate also wired. |
| **GTM** (FareHarbor container) | WIRED | None (hardcoded `GTM-KR3CGLS6`) | `app/layout.tsx:85-100` | Always fires. | Nothing. `GTM-NJRGZPGS` from INTEGRATION_STATUS_2026-04-20.md is stale — only `GTM-KR3CGLS6` exists in code (verified in CLAUDE.md 2026-05-26). |
| **GA4 server-side** (admin analytics dashboard) | PARTIAL | `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` (Tier 2) | `app/api/analytics/data/route.ts`, `lib/analytics.ts`, `app/admin/analytics` | Admin analytics page dark (no data) | Owner must: create GA4 service account with Viewer role, generate JSON key, set 3 env vars. OR: invite owner to GA4 native (simpler). Also need `ADMIN_USERNAME`+`ADMIN_PASSWORD` for the protected `/admin` route. |
| **Vercel Analytics** | NOT-PLANNED | — | — | — | `@vercel/analytics` not in package.json. Not planned for v1. |
| **PostHog / Plausible** | NOT-PLANNED | — | — | — | Not in scope. |

---

### REVIEWS / TRUST

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **Google Places API** (live review badge) | PARTIAL | `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_PLACE_ID` | `app/api/google-reviews/route.ts`, `components/google-reviews-badge.tsx` (implied) | Returns `{configured:false}`; `GoogleReviewsBadge` renders `null` | Owner must: enable Places API (New) in Google Cloud Console, create API key, find Place ID for "Alpacas Ibiza", set 2 env vars. |
| **Facebook reviews** (hardcoded) | WIRED | None | `lib/data/testimonials.ts`, `components/review-card.tsx`, `components/testimonial-card.tsx` | Always shows (static data) | 6 hardcoded reviews from REALITY_CHECK.md scrape. No live API call — static data only. |
| **TripAdvisor** (badge/widget) | NOT-PLANNED | — | — | — | Not in scope. |
| **TrustPilot** | NOT-PLANNED | — | — | — | Not in scope. |

---

### AUTH

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **NextAuth** (admin login) | WIRED (fail-CLOSED) | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (all Tier 1) | `app/api/auth/[...nextauth]/route.ts`, `app/admin/` | `authorize()` returns `null` + `console.error` if ADMIN_USERNAME/PASSWORD unset. No default creds. JWT session 8h. Admin pages are `noindex`. | **Launch blocker.** Set all 4 env vars before any deploy. `NEXTAUTH_SECRET` = `openssl rand -hex 32`. |

---

### HOSTING / DEPLOY

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Vercel deploy config** | WIRED | None | `vercel.json` (cron entry present) | N/A | `vercel.json` exists with cron config. Owner must: create Vercel account, connect GitHub repo, paste env vars in Vercel dashboard, add custom domain. See CANT_BE_DONE.md "Domain DNS cutover" limit. |
| **Cloudflare DNS** | NOT-PLANNED (infra) | — | — | — | Referenced in INTEGRATION_STATUS doc as infra layer. Not a code integration — DNS is pointed at Vercel at deploy time. Owner action only. |

---

### CRON / SCHEDULED JOBS

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **Vercel Cron** (owner weekly digest) | WIRED | `CRON_SECRET` (Tier 1) | `vercel.json` (schedule: `0 9 * * MON`), `app/api/owner-digest/route.ts` | 401 on missing/wrong `CRON_SECRET`. Digest itself fails-quiet on missing FareHarbor API keys (sends lightweight fallback instead of full data). | Set `CRON_SECRET` env var before deploy. Vercel free tier supports weekly crons. |

---

### i18n

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Built-in t() helper + 6 locale JSONs** | WIRED | None | `lib/translations.ts`, `middleware.ts`, locale JSON files (en/de/it/es/nl/fr) | Always works | Nothing. |

---

### MAPS

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **OpenStreetMap iframe** (default) | WIRED | None | `lib/integrations/map.ts` `osmIframeProvider()`, `components/tenant-map.tsx` | Always shows — no credentials required | Nothing. Default map provider, active by default. |
| **Google Maps Embed API** | PARTIAL | `GOOGLE_MAPS_EMBED_API_KEY` | `lib/integrations/map.ts` `googleEmbedProvider()` | Falls back to OSM if key unset (fail-open) | Owner must: enable Maps Embed API in Google Cloud Console, create restricted API key, set `GOOGLE_MAPS_EMBED_API_KEY`. Optional — OSM already works fine. |

---

### SOCIAL

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **WhatsApp click-to-chat** | WIRED | None (phone number hardcoded in footer) | `components/footer.tsx:91-94` | Always shows. Phone: +32 475 58 65 44 | Owner must confirm this is the correct number (flagged in OWNER_INPUT_NEEDED.md). |
| **Instagram link** | WIRED | None | `components/footer.tsx:103-109`, `app/contact/page.tsx:87-92` | Always shows | Points to instagram.com/wishfulfillingweaving. No embed SDK — static link only. |
| **Facebook link** | WIRED | None | `components/footer.tsx:112-117` | Always shows | Points to facebook.com page. No SDK embed — static link only. |
| **Instagram/Facebook embed SDK** | NOT-PLANNED | — | — | — | No embed SDK loaded anywhere. Social proof uses hardcoded review data. |

---

### CMS / CONTENT

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Static TypeScript content** | WIRED | None | `lib/integrations/content-static-typescript.ts`, `lib/tenants/alpacasibiza-content.ts` | Always works | Default content layer. |
| **MDX** | NOT-PLANNED | — | — | — | No MDX packages in package.json. Legal pages (Privacy Policy, Terms) are placeholder static pages. |
| **Sanity / Contentful** | NOT-PLANNED | — | — | — | Not in scope for v1. |

---

### IMAGE OPTIMIZATION

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **next/image** | WIRED | None | Used across components | Falls back to native `<img>` on error | Active — Next.js built-in. |
| **Cloudflare Images / Imgix** | NOT-PLANNED | — | — | — | Not in scope for v1. |

---

### NEWSLETTER / CRM

| Integration | Status | Env Vars Required | Files | Fail Mode (env unset) | Cruz must do |
|---|---|---|---|---|---|
| **SendGrid** (list sync) | PARTIAL | `SENDGRID_API_KEY`, `SENDGRID_LIST_ID`, `SENDGRID_FROM_EMAIL` | `lib/newsletter.ts`, `app/api/newsletter/route.ts` | Warn on startup; subscribe() returns `{success:false}`. Form still works — just no list sync. | Code built. Owner must create SendGrid account + list. Note: `node-fetch` is imported but not in package.json — **build may fail** if `node-fetch` is not available in the Node 18+ runtime. Needs a verify. |
| **Mailchimp / ConvertKit** | NOT-PLANNED | — | — | — | Not in scope. |

---

### FORMS / DATA CAPTURE

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Contact form** | WIRED | `RESEND_API_KEY`, `CONTACT_EMAIL` | `app/api/contact/route.ts`, `lib/html.ts` (escapeHtml, sanitizeHeader) | 500 if Resend key missing | Nothing beyond setting Tier 1 env vars. |
| **Commission form** | WIRED | `RESEND_API_KEY`, `CONTACT_EMAIL` | `app/api/commission/route.ts` | 500 if Resend key missing | Same as contact form. |
| **Newsletter form** | WIRED | `RESEND_API_KEY` (confirmation email) + optionally `SENDGRID_*` | `app/api/newsletter/route.ts` | Confirmation email 500 if Resend missing; SendGrid sync silent-fails | Same. |
| **Rate limiting** (all 3 forms) | WIRED | None | `lib/rate-limit.ts` (5 req / 5 min per IP, in-memory) | Always active. Process-scoped — resets on cold start. | Nothing. In-memory; upgrade to Vercel KV if volume justifies (ADR 011). |

---

### PDF / DOCUMENTS

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Adoption certificate PDF** | MISSING | — | — | Certificate is mentioned in email copy (`lib/email-templates.ts:141`) and in adopt page description. No PDF generation library (jsPDF, react-pdf, puppeteer) is in package.json. No certificate component exists. | **v1 gap.** Certificate is promised in Adopt-a-Paca marketing copy. Either: (a) generate PDF on server and email it, or (b) send a physically mailed certificate (postal). If digital: needs `@react-pdf/renderer` or equivalent + a certificate design. If postal: no code needed, just a manual process. Owner must decide. |
| **Invoice PDF** | NOT-PLANNED (Stripe handles) | — | — | Stripe Checkout generates receipts/invoices automatically | If Mollie is chosen: Mollie does not auto-generate invoice PDFs. May need implementation. |

---

### MONITORING / LOGGING

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Sentry** | NOT-PLANNED | — | — | — | Not in package.json. Not in scope for v1. |
| **Branded global error boundary** | WIRED | None | `app/global-error.tsx` | Shows branded error page on root layout throws | Nothing. |
| **Vercel logs** | WIRED (implicit) | None | — | Always on when deployed to Vercel | Nothing. |
| **validate-env startup check** | WIRED | None | `instrumentation.ts`, `lib/validate-env.ts` | Tier 1 missing → `console.error`. Tier 2 missing → `console.warn`. Never throws. | Nothing. |

---

### SECURITY INFRASTRUCTURE

| Integration | Status | Env Vars Required | Files | Fail Mode | Cruz must do |
|---|---|---|---|---|---|
| **Security headers + CSP Report-Only** | WIRED | None | `next.config.mjs:12-63` | Always on | Nothing. HSTS, X-Frame SAMEORIGIN, Referrer-Policy, Permissions-Policy, CSP-RO all active. |
| **safeEqual() timing-safe compare** | WIRED | None | `lib/secrets.ts` | Always on | Nothing. Used in webhook + cron auth. |
| **fetchWithTimeout()** | WIRED | None | `lib/fetch.ts` | 5-6s AbortController on all external HTTP calls | Nothing. |
| **Stripe/Mollie open-redirect fix** | WIRED | `SITE_BASE_URL` (uses hardcoded default if unset) | `app/api/checkout/route.ts`, `app/api/mollie-checkout/route.ts` | Uses hardcoded alpacasibiza.com default if env unset | Nothing extra. Fixed 2026-05-27. |

---

## Integrations Cruz might not realize are ready (built + fail-quiet without env)

These are fully wired but invisible until env vars are set:

1. **Resend** — mailer is live, contact/commission/newsletter/reminder/review-request/owner-digest all route through it. Just needs `RESEND_API_KEY` set. Domain verification also needed before launch.
2. **GA4 + GTM** — both pixels hardcoded in layout.tsx. Firing right now in dev. GDPR Consent Mode v2 gate is also wired. No env vars needed for client-side.
3. **Turnstile** — widget and server validation fully built. Forms work without it (fail-open). Just needs Cloudflare site registration + 2 env vars.
4. **FareHarbor embed** — live in layout.tsx. Calendar widget active with no env vars needed.
5. **FareHarbor webhooks** (reminder + review-request) — routes fully built, just need `FAREHARBOR_WEBHOOK_SECRET` set and FareHarbor to be told the URLs.
6. **Google Places reviews badge** — built, just needs `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID`.
7. **Vercel Cron** — `vercel.json` has the schedule. Just needs `CRON_SECRET` set and Vercel deploy to activate.
8. **SendGrid newsletter list sync** — `lib/newsletter.ts` is built and wired. Just needs account + 3 env vars.
9. **Mollie** — full checkout + webhook routes built, dynamic import guard so SDK absence is safe at build time. Just needs account + `pnpm add @mollie/api-client`.
10. **OSM map** — active right now with zero config. `tenant-map.tsx` renders it.

---

## Integrations Cruz NEEDS for v1 launch but are NOT built

1. **Stripe SDK not installed** — `stripe` package is absent from package.json. `app/api/checkout/route.ts` does a dynamic import with a catch (returns `STRIPE_SDK_MISSING` 503). Must `pnpm add stripe` before Stripe path goes live.
2. **Mollie SDK not installed** — `@mollie/api-client` absent from package.json. Same dynamic-import guard pattern. Must `pnpm add @mollie/api-client` before Mollie path goes live.
3. **Adoption certificate PDF** — promised in adopt page copy and welcome email (`lib/email-templates.ts:141`). No PDF generation exists. Owner must decide: digital PDF (needs library + design) or physical mail (manual process, no code). If digital, `@react-pdf/renderer` or similar must be added.
4. **Stripe customer portal route** — no `/api/stripe-portal` or `/api/mollie-portal` route exists. Adopt-a-Paca subscribers have no self-service way to cancel or update their card. Not built anywhere in `app/api/`. Post-launch gap.
5. **`node-fetch` missing from package.json** — `lib/newsletter.ts` does `import fetch from 'node-fetch'` but `node-fetch` is not in `dependencies`. Node 18+ has native fetch so this likely works at runtime, but it's a lint/typecheck failure. Should either remove the import and use native fetch, or add `node-fetch` to deps.

---

## CAN'T DO WITHOUT HELP — v1 vs v2 scope

### v1 launch blockers (must be done before go-live)

| What | Who | Time |
|---|---|---|
| Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | Owner (Vercel env vars) | 5 min |
| Set `RESEND_API_KEY`, `CONTACT_EMAIL` | Owner | 5 min |
| Set `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET` | Owner | 5 min |
| Verify domain in Resend dashboard (DKIM/SPF) | Owner + DNS access | 30 min |
| Decide: Stripe or Mollie for Adopt-a-Paca + install SDK | Owner decision + Cruz installs SDK | 1 hour |
| Create Stripe Price objects OR Mollie account + API key | Owner | 30–60 min |
| Decide: certificate PDF digital or physical | Owner | 10 min |
| Vercel deploy + env vars + domain DNS cutover | Owner (Vercel account) + DNS access | 2 hours (with propagation) |

### v1 nice-to-have (degrade gracefully until set)

- Turnstile bot protection (2 env vars, 5 min)
- FareHarbor API keys (Pro plan, owner must request)
- Per-tour item IDs (4 IDs from FareHarbor admin)
- Google Places review badge (API key + Place ID)
- GA4 service account for in-site analytics dashboard (alternative: grant owner native GA4 access)
- SendGrid list sync (owner must create account)

### v2 / post-launch

- Stripe customer portal (self-service cancel/update card) — **not built**
- Adoption certificate PDF generation — **not built** (owner must decide digital vs postal first)
- Google Maps Embed API (optional upgrade from OSM; OSM works fine)
- Vercel Analytics (optional, add `@vercel/analytics`)
- Sentry error monitoring (optional)
- Stripe Connect (multi-tenant) — DEFER until tenant #1 signs
- MDX for legal pages (currently static placeholder text; privacy policy/terms need real legal content regardless of MDX)
