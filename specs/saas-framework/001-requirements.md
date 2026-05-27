# SaaS Framework — Phase 1 Requirements
**Version:** 0.1 | **Date:** 2026-05-27 | **Author:** Claude Code (Phase 1 Discovery)
**Reconnaissance logged:** START_HERE, PRACTICES, REALITY_CHECK, INTEGRATION_STATUS, OWNER_INPUT_NEEDED, CANT_BE_DONE, lib/config.ts, lib/data/alpacas.ts, app/**/page.tsx (22 routes inventoried), grep scans for hardcoded tenant values.

---

## 1. Tenant Personas

Five archetypes, ranked by addressable volume and willingness to pay.

### P1 — Alpaca / Small-Herd Farm (San & Bart archetype)
- **Sell:** guided herd tours, trekking, weaving workshops, yoga, alpaca manure (Alcaca), adoption subscriptions, gifts
- **Scale:** 1–3 staff, <500 bookings/yr, single location
- **Tech sophistication:** low — currently on Squarespace or a developer-built bespoke site
- **Willingness to pay:** €30–80/mo (comparable to Squarespace Business €23/mo + FareHarbor booking fee)
- **Existing toolchain:** FareHarbor for bookings, Mailchimp or nothing for email, Google Business Profile — *no* in-house dev
- **Evidence:** REALITY_CHECK.md Tier 3 cites Hensting Alpacas (UK, WooCommerce), Buddy's Alpaca Farm (US, custom shop), Mary's Poop+ (US, Squarespace). All three run bespoke stacks — none is a multi-tenant product, which is the gap Cruz exploits.

### P2 — Agritourism / Farm Experience Operator (not alpacas)
- **Sell:** harvest tours, olive-oil tastings, cheese-making workshops, horse-trekking, cooking classes
- **Scale:** similar to P1; some have multiple seasonal experiences
- **Tech sophistication:** low-medium — may use FareHarbor or Bokun already
- **Willingness to pay:** €40–100/mo if bookings are managed; anchored against Bokun Starter (~€49/mo + commission)
- **Existing toolchain:** FareHarbor OR Bokun OR self-managed forms; social-first marketing

### P3 — Equestrian / Retreat Center
- **Sell:** riding lessons, day retreats, accommodation packages, corporate away-days
- **Scale:** medium — 5–15 staff, 1 000+ bookings/yr, sometimes multi-location
- **Tech sophistication:** medium — often has someone "who handles the website"
- **Willingness to pay:** €80–200/mo; compares to Wix Business €17/mo + booking plugins, but needs more
- **Existing toolchain:** Wix or WordPress + Calendly / Acuity; email via Mailchimp

### P4 — Photography / Creative Experience Operator
- **Sell:** golden-hour alpaca shoots, portrait sessions, branded content packages
- **Scale:** solo or duo; high per-session revenue, low volume (<200 bookings/yr)
- **Tech sophistication:** low — Instagram-first, relies on DM-to-email inquiry
- **Willingness to pay:** €20–50/mo; price-sensitive; feature-light tier is the hook
- **Existing toolchain:** Instagram + Google Forms + Stripe links; no CMS

### P5 — Specialty Tour Operator (agritourism aggregator / DMC)
- **Sell:** curated experience packages across multiple venues
- **Scale:** 3–10 staff; manages bookings on behalf of multiple activity providers
- **Tech sophistication:** medium-high — used to Bokun or Rezdy APIs
- **Willingness to pay:** €150–400/mo; wants white-label capability and API access
- **Existing toolchain:** Bokun (~€49/mo + 1.5% commission) or Rezdy; often dual-stacked

---

## 2. Use Cases (Priority Order)

| # | Use case | Who | Must-have for v1 |
|---|---|---|---|
| UC-01 | Configure tenant brand (logo, colors, site name, tagline) | All | Yes |
| UC-02 | Configure content entities (animals, experiences, products — generic, not alpacas) | P1–P3 | Yes |
| UC-03 | Receive form submissions (contact, commission, newsletter) to tenant's own email | All | Yes |
| UC-04 | Configure own FareHarbor shortname + item IDs | P1–P3 | Yes |
| UC-05 | Configure own Resend API key (email from their own domain) | All | Yes |
| UC-06 | Configure own GA4 measurement ID | P1–P4 | Yes |
| UC-07 | View own bookings via FareHarbor webhook | P1–P3 | v1.5 |
| UC-08 | Get own admin / analytics dashboard | All | v1.5 |
| UC-09 | Be charged monthly by Cruz (Stripe billing) | All | Yes — Cruz's revenue |
| UC-10 | Configure own Turnstile site key (bot protection on their forms) | All | Yes |
| UC-11 | Configure own Google Reviews place ID | P1–P3 | v1.5 |
| UC-12 | Manage i18n content per locale (their own translations) | P2–P5 | v2 |
| UC-13 | Add custom pages (press, weddings, sustainability) | P1–P4 | v2 |

---

## 3. Alpaca-Specific Extraction Matrix

**Method:** grep scans on `*.ts` / `*.tsx` for `alpacasibiza`, `Ibiza`, `Es Currals`, `alpaca`, `shortname`, `GTM-`, `G-Y946`, `info@alpacasibiza`, `FLOW=`. 22 routes inventoried via Glob.

### 🟢 Tenant-config — abstract via `tenant.config.ts`

| # | Hardcoded value | File:line | Config key |
|---|---|---|---|
| 1 | `'https://alpacasibiza.com'` | `lib/config.ts:9` | `tenant.siteUrl` |
| 2 | `'alpacasibiza'` FareHarbor shortname | `lib/config.ts:45`, `lib/payment-vendor.ts:80`, `components/fareharbor-calendar.tsx:30`, `app/api/availability/route.ts:7`, `app/api/owner-digest/route.ts:33` | `tenant.fareharborShortname` |
| 3 | `'Alpacas Ibiza'` brand name | `lib/email-templates.ts:8`, `lib/structured-data.ts:36`, `components/footer.tsx:20`, `components/header.tsx:32`, `app/layout.tsx:15` | `tenant.brandName` |
| 4 | `'Es Currals Alpacas Ibiza'` long name | `lib/structured-data.ts:59`, `app/[locale]/yoga/page.tsx:55` | `tenant.legalName` |
| 5 | `'info@alpacasibiza.com'` contact email | `lib/email-templates.ts:18`, `lib/mailer.ts:4`, `components/footer.tsx:98-99`, `app/[locale]/contact/page.tsx:88-89` | `tenant.contactEmail` |
| 6 | `'noreply@alpacasibiza.com'` from email | `lib/mailer.ts:5` | `tenant.fromEmail` |
| 7 | `'hello@alpacasibiza.com'` newsletter from | `lib/newsletter.ts:5` | `tenant.newsletterFromEmail` |
| 8 | `'G-Y946QDVVQV'` GA4 measurement ID | `app/layout.tsx:67,74` | `tenant.ga4MeasurementId` |
| 9 | `'GTM-KR3CGLS6'` GTM container | `app/layout.tsx:82,87` | `tenant.gtmContainerId` |
| 10 | `TOUR_BASE_PRICE_EUR = 30` | `lib/config.ts:17` | `tenant.baseExperiencePrice` |
| 11 | `YOGA_PRICE_EUR = 30` | `lib/config.ts:28` | `tenant.yogaPrice` (or `secondaryExperiencePrice`) |
| 12 | `@alpacasibiza` Instagram tag in emails | `lib/email-templates.ts:48` | `tenant.instagramHandle` |
| 13 | `https://www.facebook.com/alpacasibiza` | `lib/structured-data.ts:41`, `app/[locale]/page.tsx:216` | `tenant.facebookUrl` |
| 14 | `https://www.instagram.com/alpacasibiza` | `lib/structured-data.ts:42` | `tenant.instagramUrl` |
| 15 | `+32 475 58 65 44` WhatsApp number | `lib/email-templates.ts:18`, `app/[locale]/contact/page.tsx` (inferred) | `tenant.whatsappNumber` |
| 16 | `Alpacas Ibiza` copyright line | `components/footer.tsx:126` | `tenant.brandName` (same key) |
| 17 | `[Alpacas Ibiza] Weekly digest` email subject | `app/api/owner-digest/route.ts:40,141` | `tenant.brandName` (same key) |
| 18 | `admin@alpacasibiza.com` auth fallback | `app/api/auth/[...nextauth]/route.ts:28` | `tenant.adminEmail` |
| 19 | `https://g.page/r/alpacasibiza/review` Google review URL | `lib/email-templates.ts:70` | `tenant.googleReviewUrl` |
| 20 | `https://g.page/r/alpacasibiza` badge link | `components/google-reviews-badge.tsx:44` | `tenant.googleReviewUrl` |
| 21 | `San Carlos, Ibiza, Spain` maps query | `lib/email-templates.ts:38` | `tenant.locationQuery` |
| 22 | `'mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry'` | `lib/payment-vendor.ts:33`, `app/[locale]/adopt/page.tsx:52-53` | `tenant.adoptEnquiryEmail` |
| 23 | `'Sent via alpacasibiza.com contact form'` | `app/api/contact/route.ts:58` | `tenant.siteUrl` (same key) |
| 24 | `'Sent via alpacasibiza.com commission form'` | `app/api/commission/route.ts:57` | `tenant.siteUrl` (same key) |
| 25 | `'Thanks for subscribing to the Alpacas Ibiza newsletter'` | `app/api/newsletter/route.ts:56` | `tenant.brandName` (same key) |
| 26 | FareHarbor shortname in embed script tag | `app/layout.tsx:98` | `tenant.fareharborShortname` |
| 27 | `FLOW=1257173` FareHarbor flow ID | implied by calendar embed config (see `INTEGRATION_STATUS:10`) | `tenant.fareharborFlowId` |

### 🟡 Content-model — needs generic entity abstraction

| # | Alpaca-specific | File:line | Generic equivalent |
|---|---|---|---|
| 28 | `Alpaca` interface + `ALPACAS[]` roster | `lib/data/alpacas.ts:9-31` | `CreatureEntity` or `TeamMemberEntity` with `id, name, bio, image` — same shape, rename |
| 29 | `lib/data/press.ts` — press data hardcoded to Ibiza outlets | `lib/data/press.ts:2,58` | `PressItem[]` in tenant content config |
| 30 | `/alpacas` route (herd page) | `app/[locale]/alpacas/page.tsx` | `/[locale]/herd` or `/[locale]/team-members` — tenant configures route label |
| 31 | `/adopt` route + benefit list | `app/[locale]/adopt/page.tsx` | `AdoptionConfig` in tenant config (price tiers, benefits array) |
| 32 | `/yoga` route | `app/[locale]/yoga/page.tsx` | Generic "secondary experience" or page-builder block |
| 33 | `/shop/alcaca` (manure) route | `app/[locale]/shop/alcaca/page.tsx` | Generic product category; tenant configures category name + description |
| 34 | `/shop/woven` route | `app/[locale]/shop/woven/page.tsx` | Generic product category |
| 35 | `/shop/commission` route | `app/[locale]/shop/commission/page.tsx` | Generic "custom order" inquiry |
| 36 | `/experiences/romantic-sunset`, `/family-farm-days`, `/corporate-team-building` | `app/[locale]/experiences/*/page.tsx` | Generic "experience" content type; tenant creates N experiences |
| 37 | Structured-data `TouristTrip` description copy | `lib/structured-data.ts:110-113` | Template strings pulling from `tenant.primaryExperienceDescription` |

### 🔴 Integration-adapter — needs provider interface

| # | Hardcoded integration | File:line | Provider interface |
|---|---|---|---|
| 38 | FareHarbor embed + API | `components/fareharbor-calendar.tsx`, `app/api/availability/route.ts`, `app/api/owner-digest/route.ts` | `BookingProvider` interface: `getCalendarEmbedUrl()`, `getAvailability()`, `getBookings()`. FareHarbor is the first implementation. Bokun / Rezdy would be second. |
| 39 | Resend mailer | `lib/mailer.ts:1-5`, `lib/newsletter.ts` | `EmailProvider` interface: `send()`, `subscribe()`. Resend is impl-1. SendGrid impl-2. |
| 40 | GA4 Data API (admin analytics) | `app/api/analytics/data` route | `AnalyticsProvider` interface: `getPageviews()`, `getSessions()`. GA4 is impl-1. |

### ⚪ Universal — already generic, no abstraction needed

| # | What | File |
|---|---|---|
| 41 | Turnstile widget (site key via env, already env-driven) | `components/turnstile-widget.tsx` |
| 42 | `validateEnv()` boot check | `lib/validate-env.ts`, `instrumentation.ts` |
| 43 | `safeEqual()` timing-safe compare | `lib/secrets.ts` |
| 44 | `escapeHtml()` XSS guard | `lib/html.ts` |
| 45 | `fetchWithTimeout()` | `lib/fetch.ts` |
| 46 | `useFormSubmit` hook + `emailLayout()` | `lib/email-layout.ts`, `hooks/use-form-submit.ts` |
| 47 | Rate limiter (5 req/5 min per IP) | `lib/rate-limit.ts` |
| 48 | NextAuth CredentialsProvider + 8h JWT | `app/api/auth/[...nextauth]/route.ts` |
| 49 | Sitemap + robots.ts | `app/sitemap.ts`, `app/robots.ts` |
| 50 | Security headers + CSP (next.config.mjs) | `next.config.mjs:12-63` |

---

## 4. Pricing Model

Anchored against: Wix Business €17/mo, Squarespace Business €23/mo, Bokun Starter €49/mo + 1.5% commission, Resend Pro $20/mo (50K emails), FareHarbor (free to operator — charges guests a booking fee).

### Tier 1 — Starter (P4, P1 no-shop)
- **Price:** €29/mo (billed annually) / €39/mo month-to-month
- **Included:** 1 tenant, up to 5 pages, brand config, 1 FareHarbor integration, contact/newsletter forms → tenant email, Resend key (tenant-supplied), Turnstile protection, basic SEO + structured data, admin login
- **Gated:** analytics dashboard, webhook bookings view, GA4 data integration, multi-locale content editing
- **Rationale:** undercuts Squarespace Business by €6/mo while adding FareHarbor native integration that Squarespace lacks

### Tier 2 — Pro (P1, P2, P3)
- **Price:** €79/mo (billed annually) / €99/mo month-to-month
- **Included:** everything in Starter + GA4 analytics dashboard, FareHarbor webhook (booking confirmations, review requests, 48h reminder emails), Google Reviews badge, up to 15 pages + content model entities, adoption/subscription module, 3 locales
- **Gated:** white-label domain email branding, API access, priority support, P5 multi-venue
- **Rationale:** matches Bokun Starter (€49) + Resend Pro ($20) = ~€72/mo, while adding analytics and email automation that Bokun doesn't provide

### Tier 3 — Studio (P5, P3 multi-venue)
- **Price:** €199/mo (billed annually) / €249/mo month-to-month
- **Included:** everything in Pro + white-label from-email (tenant's own Resend domain), API access (booking webhooks to tenant's own systems), priority support SLA, up to 6 locales, custom page builder blocks
- **Gated:** Cruz's own infra costs + support burden justify the premium
- **Rationale:** below Rezdy Pro ($249/mo) + website stack. Positions Cruz as all-in-one vs. tool-plus-website

---

## 5. Risks & Non-Goals

### Non-goals (Phase 1 explicit scope-out)
- No multi-region deployment (single Vercel project per tenant, not edge-multi-region)
- No white-label mobile apps (web-only; no React Native wrapper)
- No custom domain SSL management (Vercel handles per-project domains)
- No built-in payment processing for tenant's e-commerce (FareHarbor handles guest charges; tenant Stripe is a v2 integration)
- No CMS headless editing UI (tenant config via `tenant.config.ts` + env vars in Phase 1; WYSIWYG editor is v3)
- No multi-venue aggregation in a single tenant (each P5 venue = its own tenant instance)

### Risks

**R1 — FareHarbor ToS may restrict SaaS resale.**
FareHarbor's standard terms grant operators a license to use the embed for their own bookings. Reselling a SaaS that wraps FareHarbor embeds in a multi-tenant framework may require FareHarbor's written permission or a partner agreement. *Mitigation:* treat FareHarbor shortname as tenant-supplied env var (Cruz never holds FH credentials), making each tenant the direct FareHarbor licensee. Contact FareHarbor partner program before launch.

**R2 — Per-tenant Resend key requirement increases tenant onboarding friction.**
Tenants who have never used Resend must create an account and set up domain verification before emails work. *Mitigation:* provide a Cruz-managed Resend account with sub-accounts as a "managed email" add-on (billed at cost + margin).

**R3 — Tenant content isolation is currently zero.**
The codebase has no multi-tenancy layer — it's a single-tenant Next.js site. Adding row-level isolation, per-tenant env var routing, and a provisioning system is a Phase 3 architectural decision, not a config tweak. Underestimating this scope is the biggest schedule risk.

**R4 — "Infinite clients" requires automated provisioning.**
Manual per-tenant deployment (clone repo, fill env vars, push to new Vercel project) doesn't scale past ~5 tenants. A control plane to provision/deprovision tenants is required before growth is viable.

---

## 6. Phase 1 GO Conditions

- [ ] **GO-1:** Cruz approves persona list (P1–P5) or amends/collapses personas
- [ ] **GO-2:** Cruz picks a pricing tier structure (3-tier above, or alternative model)
- [ ] **GO-3:** Cruz approves extraction matrix (items 1–50) or amends classifications
- [ ] **GO-4:** Cruz confirms FareHarbor partner approach (tenant-supplied keys = Cruz never holds FH creds)
- [ ] **GO-5:** Cruz confirms non-goals list (especially: no mobile app, no WYSIWYG in Phase 1)

Once all 5 GO conditions are met, Phase 2 (Specification / Blueprint) can begin.
Phase 2 first task: design the `tenant.config.ts` schema and the `BookingProvider` / `EmailProvider` interfaces.
