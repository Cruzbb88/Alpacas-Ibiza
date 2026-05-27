# SaaS Blueprint — Multi-Tenant Platform
## sb-001 | 2026-05-27 | alpacasibiza as Tenant #1

**Status:** Design only. No code. No file moves. No deploy decisions.
**Scope:** Convert alpaca-farm-redesign from a hardcoded single-tenant Next.js site into a platform where alpacasibiza is tenant #1 and new agri-tourism operators can be onboarded via config files, not code changes.

---

## 1. Tenancy Model Decision

**Recommended: Multi-Tenant Single-Deploy (hostname-based)**

Single Vercel project. All tenants share the same Next.js runtime. Tenant identity is resolved at the middleware layer from the incoming `Host` header and carried through every render as a `TenantContext`.

Rationale: The platform targets small agri-tourism operators (farms, alpaca ranches, yoga retreats). Each tenant's traffic volume is modest — peak season bursts, long off-season quiet. The noisy-neighbor risk that justifies per-deploy isolation does not exist at this scale. A per-deploy model would triple operational complexity (separate Vercel projects, separate env-var management, separate deploys per code change) while delivering no real isolation benefit for sub-10K monthly visitors per tenant. Shared infra + per-tenant config files is the right trade-off until the platform has 50+ tenants with measurable traffic divergence.

Upgrade path: If a future enterprise tenant demands physical isolation (contractual requirement, not preference), extract that tenant to its own Vercel project pointing at the same codebase. The config-file model makes this a one-hour migration, not a refactor.

---

## 2. Tenant Resolution — middleware.ts Modification Path

**Current state:** `middleware.ts` does locale detection only. It reads URL path, cookie, and `Accept-Language`. The `Host` header is never read. Tenant is always implicitly `alpacasibiza`.

**Target state:** middleware resolves tenant FIRST, then resolves locale within that tenant's allowed locale set.

Resolution chain (in order, first match wins):

1. `Host` header → strip port → look up in `TENANT_HOSTNAME_MAP` (loaded from `lib/tenants.ts`).
2. If no match and host ends in `.alpacafarm.io` (platform subdomain), extract the subdomain slug as tenant ID.
3. If still no match, fall back to `alpacasibiza` (the platform default tenant) for local dev / unconfigured preview deploys.

The resolved `tenantId` is injected into the response as `x-tenant-id` header. All Server Components read it via `headers()`. No client-side tenant detection — the server resolves it once.

Locale detection stays exactly as-is, but the allowed locales list and the `defaultLocale` are sourced from the resolved tenant's config, not the hardcoded `middleware.ts` array.

**File that changes:** `middleware.ts` (lines 3-4 hardcoded arrays become tenant-config lookups).

---

## 3. Architecture Layers

### 3a. Tenant Config — `tenants/<id>/config.json`

Canonical schema per tenant:

```
{
  "id": "alpacasibiza",
  "displayName": "Alpacas Ibiza – Es Currals",
  "domain": "alpacasibiza.com",
  "platformSubdomain": "alpacasibiza",

  "brand": {
    "primaryColor": "#hex",
    "accentColor": "#hex",
    "fontFamily": "Inter",
    "logoPath": "/tenants/alpacasibiza/public/logo.webp",
    "ogImagePath": "/tenants/alpacasibiza/public/og-default.webp"
  },

  "locales": ["en", "de", "it", "es", "nl", "fr"],
  "defaultLocale": "en",

  "booking": {
    "vendor": "fareharbor",
    "fareharbor": {
      "shortname": "alpacasibiza",
      "flow": 1257173,
      "gtmContainer": "GTM-KR3CGLS6"
    }
  },

  "email": {
    "vendor": "resend",
    "fromAddress": "noreply@alpacasibiza.com",
    "contactEmail": "info@alpacasibiza.com"
  },

  "analytics": {
    "ga4MeasurementId": "G-Y946QDVVQV"
  },

  "features": {
    "adoptAPaca": false,
    "yogaBooking": true,
    "weddingsPage": false,
    "pressPage": false,
    "googleReviewsBadge": false,
    "newsletter": true
  },

  "pricing": {
    "tourBaseEur": 30,
    "yogaEur": 30
  },

  "legal": {
    "businessName": "UNMAPPED",
    "cif": "UNMAPPED",
    "addressLine1": "San Carlos",
    "locality": "Santa Eularia des Riu",
    "country": "ES",
    "phone": "UNMAPPED"
  },

  "social": {
    "facebook": "https://www.facebook.com/alpacasibiza",
    "instagram": "https://www.instagram.com/alpacasibiza"
  },

  "saasplan": "starter",
  "ownerEmail": "UNMAPPED",
  "onboardedAt": "2026-05-27"
}
```

Fields marked `UNMAPPED` require owner input (already tracked in `OWNER_INPUT_NEEDED.md`). They do not block the config file's existence — the failsafe pattern already present in the codebase handles missing values gracefully.

### 3b. Tenant Content — `tenants/<id>/content/`

Structure:

```
tenants/
  alpacasibiza/
    content/
      translations/
        en.json        ← overrides / merges with platform base en.json
        nl.json
        de.json
        es.json
        fr.json
        it.json
      alpacas.json     ← herd roster: [{id, name, bio, photoPath}] × 14
      press.json       ← [{outlet, logoPath, url, year}]
      team.json        ← [{name, role, bio, photoPath}]
      products.json    ← [{id, name, category, priceEur, fareharborItemId, description}]
```

Translation loading strategy: Platform ships a base translation set (currently `translations/*.json` at repo root). Tenant content overrides are deep-merged at request time: platform keys first, tenant keys win on collision. This means a new tenant does NOT need to translate 100% of strings — they inherit platform defaults and override only what differs (brand name, prices, location copy).

`alpacas.json` is the correct home for the 14 named herd members currently tracked in `PLAN.md C2` and `REALITY_CHECK.md`. The data file replaces the to-be-created `lib/data/alpacas.ts` (which PLAN.md Track A5 proposes) — same shape, tenant-scoped location.

### 3c. Tenant Assets — `tenants/<id>/public/`

```
tenants/
  alpacasibiza/
    public/
      logo.webp
      og-default.webp
      hero.webp
      favicon.ico
```

Serving strategy: Next.js `public/` folder cannot be dynamically namespaced per hostname without a CDN rewrite. Two options, pick one before implementation:

**Option A (simpler):** Commit per-tenant assets into the repo under `tenants/<id>/public/`. Reference them with absolute paths in config.json. Next.js serves them as static files via a catch-all route: `app/tenant-assets/[...path]/route.ts` reads the file from the tenant's public folder and streams it. Works without a CDN change.

**Option B (production-grade):** Upload per-tenant assets to Cloudflare R2 or Vercel Blob at onboarding time. Config.json stores the CDN URL, not a relative path. Removes the repo from the asset-serving path. Preferred when the platform has more than 10 tenants or any tenant uploads large image sets.

Alpacasibiza as tenant #1: start with Option A. The codebase already notes that `OWNER_INPUT_NEEDED.md` is waiting on real photos — there are no committed assets yet, so Option A has zero switching cost.

### 3d. Tenant Secrets — env-var namespace

No secrets live in `config.json` (it is committed to the repo). All credentials use a namespaced env-var convention:

```
ALPACASIBIZA_RESEND_API_KEY=re_...
ALPACASIBIZA_FAREHARBOR_APP_KEY=...
ALPACASIBIZA_FAREHARBOR_USER_KEY=...
ALPACASIBIZA_NEXTAUTH_SECRET=...
ALPACASIBIZA_CRON_SECRET=...
ALPACASIBIZA_TURNSTILE_SECRET_KEY=...
ALPACASIBIZA_GA4_PRIVATE_KEY=...
```

A `lib/tenant-secrets.ts` helper reads `process.env[${tenantId.toUpperCase()}_${KEY}`]` and throws a typed error if a Tier-1 secret is missing. The existing `validateEnv()` in `instrumentation.ts` is extended to iterate over all known tenant IDs and run the same check per-tenant on boot.

Vercel env-var limit: Vercel Hobby allows 100 env vars; Pro allows 1,000. At ~12 secrets per tenant, the single-deploy model supports up to 83 tenants on Pro before hitting the ceiling. Above that, migrate to a secrets manager (Doppler, AWS Parameter Store) with a single `DOPPLER_TOKEN` env var. This is a tenant-count concern, not a Day 1 concern.

### 3e. Tenant Billing — charging tenants for the platform

This is the SaaS revenue layer — distinct from FareHarbor booking revenue that flows to each tenant's own account.

Recommended mechanism: Stripe Billing with one Stripe Customer per tenant. The platform holds the Stripe customer ID in `config.json` (`stripeCustomerId`). A `/api/platform/billing` route (admin-only, guarded by a separate platform-admin NextAuth session) handles subscription creation, plan upgrades, and invoice retrieval.

Tenant billing is NOT in scope for the current single-tenant codebase. It requires a new route group `app/(platform-admin)/` and a Stripe account separate from any tenant's own payment processing. Design it in the next blueprint iteration when tenant #2 is real.

---

## 4. Migration Path — Which Files Become Tenant Config

| Current file:line | What it contains | Migration target |
|---|---|---|
| `lib/config.ts:9` | `SITE_BASE_URL = 'https://alpacasibiza.com'` | `tenants/alpacasibiza/config.json` → `domain` |
| `lib/config.ts:17` | `TOUR_BASE_PRICE_EUR = 30` | `config.json` → `pricing.tourBaseEur` |
| `lib/config.ts:28` | `YOGA_PRICE_EUR = 30` | `config.json` → `pricing.yogaEur` |
| `lib/config.ts:45` | hardcoded fallback `'alpacasibiza'` in `getFareHarborEmbedUrl` | `config.json` → `booking.fareharbor.shortname` |
| `lib/mailer.ts:4` | `FROM_EMAIL = 'noreply@alpacasibiza.com'` | `config.json` → `email.fromAddress` |
| `lib/mailer.ts:4` | `DEFAULT_TO = 'info@alpacasibiza.com'` | `config.json` → `email.contactEmail` |
| `lib/structured-data.ts:41` | `name: 'Alpacas Ibiza'` and social URLs | `config.json` → `displayName`, `social.*` |
| `lib/structured-data.ts:44` | `telephone: '+32475586544'` | `config.json` → `legal.phone` |
| `lib/structured-data.ts:48` | `availableLanguage: [...]` | `config.json` → `locales` |
| `app/[locale]/layout.tsx:29` | `siteName: 'Alpacas Ibiza'` | `config.json` → `displayName` |
| `middleware.ts:3-4` | hardcoded locales array + defaultLocale | `config.json` → `locales`, `defaultLocale` |
| `next.config.mjs:17` | GTM/GA4/FareHarbor in CSP script-src | Must stay in `next.config.mjs` for now; cannot be tenant-dynamic in static headers. Per-tenant CSP is a v2 concern. |
| `translations/*.json` (root) | All 6 locale files | Become platform base; tenant overrides in `tenants/<id>/content/translations/` |

The hardcoded GTM container `GTM-KR3CGLS6` in `app/layout.tsx:84` (per CLAUDE.md) is FareHarbor's container injected by their embed. It stays per-tenant in `config.json → booking.fareharbor.gtmContainer`, not in a shared layout.

---

## 5. Failure Modes

**Tenant A data leaking into Tenant B's render**

Risk: A Server Component caches a tenant-resolved value in module scope (e.g., a memoized config object). Subsequent requests from a different tenant hit the cached value.

Prevention: Never store tenant-resolved data in module-level variables. All tenant config reads go through `headers()` → `x-tenant-id` → `getTenantConfig(tenantId)` per-request. Next.js Server Components are per-request by design; the risk is self-inflicted through incorrect caching. Add a CI lint rule that flags `let`/`const` at module scope in `lib/tenant-*.ts` files.

**Shared rate-limit pool — tenant B's load blocking tenant A**

Risk: Resend, FareHarbor API, and Google Places API have account-level rate limits. If all tenants share one Resend API key, a tenant sending a newsletter blast exhausts the quota for everyone.

Prevention: Per-tenant API keys (already the design via `ALPACASIBIZA_RESEND_API_KEY` namespacing). Each tenant's key hits its own Resend account limit. FareHarbor keys are already per-operator by nature (each farm has its own FareHarbor account). Google Places API: share one key for now (review badges are read-only, low volume); split if a tenant drives >1,000 Places API calls/day.

**Theme override gaps**

Risk: A tenant sets `brand.primaryColor` in config.json but a component hardcodes a Tailwind class like `bg-primary` that only reads the CSS variable if it was set at build time.

Prevention: All theme tokens must flow through CSS custom properties set in a per-tenant `<style>` tag injected in `app/[locale]/layout.tsx`. Tailwind classes reference `var(--color-primary)` via `tailwind.config.ts` semantic tokens. New components must never hardcode hex values — this is an existing rule in `PRACTICES.md` that already applies.

**Locale bleed**

Risk: Tenant A supports `nl` as default; tenant B does not support `nl`. A visitor with `NEXT_LOCALE=nl` cookie from a previous visit to tenant A arrives at tenant B and gets a redirect loop or 404.

Prevention: Locale validation in middleware checks the resolved locale against the current tenant's `locales` array, not the global list. If the cookie locale is not in the tenant's list, fall back to the tenant's `defaultLocale` and reset the cookie.

---

## 6. Onboarding Flow for Tenant #2 — 12-Step Playbook

This is the repeatable process once the platform code supports multi-tenancy.

1. **Intake call (30 min):** collect tenant's domain, FareHarbor shortname, supported languages, brand hex values, Resend sender domain, contact email.
2. **Create config file:** copy `tenants/alpacasibiza/config.json` → `tenants/<new-id>/config.json`. Fill every non-secret field. Mark secrets as `UNMAPPED`. Commit.
3. **Create content scaffold:** `mkdir tenants/<new-id>/content/translations/`. Copy platform base `translations/en.json` to the tenant's folder as starting point. Tenant customises display copy.
4. **Asset collection:** request logo (SVG + WebP), hero image, OG image from tenant. Store in `tenants/<new-id>/public/` or upload to Blob storage and update config `logoPath`/`ogImagePath`.
5. **DNS:** tenant points their domain's CNAME to `cname.vercel-dns.com`. Add the domain in Vercel dashboard → Production → Custom Domains. No code change.
6. **Env vars:** add all `<TENANT_ID_UPPER>_*` secrets to Vercel project env vars for the Production environment.
7. **FareHarbor:** tenant provides their FareHarbor operator credentials. Set `TENANTID_FAREHARBOR_APP_KEY` and `USER_KEY`. Verify availability API responds: `curl https://<tenant-domain>/api/availability`.
8. **Email:** tenant provides Resend API key (their own Resend account) or we provision a sub-account. Set `TENANTID_RESEND_API_KEY`. Verify contact form sends.
9. **Analytics:** tenant provides GA4 Measurement ID. Set in `config.json → analytics.ga4MeasurementId`. No env var needed (public key).
10. **Feature flags:** review the `features` block in config.json with the tenant. Toggle `adoptAPaca`, `pressPage`, `weddingsPage` etc. based on their actual product offering.
11. **Smoke test:** hit all primary routes on the tenant's domain. Verify: locale detection, booking embed loads with correct FareHarbor shortname, contact form email arrives, structured data shows correct business name and address.
12. **Go live checklist:** confirm `validateEnv()` shows no Tier-1 errors in Vercel runtime logs. Confirm CSP Report-Only shows no violations. Confirm `sitemap.xml` returns tenant-scoped URLs.

---

## 7. Pricing Model Recommendation

**Recommended: Hybrid — flat monthly base + per-booking commission above a volume tier**

Rationale grounded in the tenant profile: small agri-tourism operators (farms, eco-retreats) have highly seasonal revenue — 80%+ of bookings in 4-5 summer months, near-zero in winter. A pure per-booking commission punishes seasonality: in a good August the platform takes a meaningful cut, but the tenant still owes nothing in January, creating zero recurring revenue for platform maintenance. A pure flat monthly fee is politically hard to sell when the farm earns nothing in winter.

Hybrid structure:
- **Base (all tiers):** €29/month flat. Covers hosting, email, analytics, one domain. Charged year-round. Provides predictable platform revenue floor.
- **Starter (default):** base only. Includes up to 50 bookings/month. No commission.
- **Growth (auto-upgrade):** base + 3% commission on FareHarbor booking revenue above 50 bookings/month. Commission is self-reported by tenant via FareHarbor webhook data already wired in the codebase (`app/api/fareharbor-webhook/route.ts`). No trust issue — the webhook is cryptographically verified.
- **Pro:** €79/month flat, no commission cap, adds multi-language content management UI, priority onboarding support.

Why not pure SaaS tiers (3-tier flat)? Agri-tourism operators compare themselves to Etsy or Booking.com which take commissions. "Pay only when you earn" is a psychologically easier sell for a first-time SaaS customer. The commission model aligns incentives: the platform wins when the tenant wins.

Why not pure commission? Platform needs predictable revenue to justify ongoing maintenance. €29/month from 20 tenants = €580/month baseline before any commission — enough to cover Vercel Pro, Resend, and Cloudflare.

---

## 8. CAN'T DO WITHOUT HELP — Decisions Blocked on Cruz

The following design choices cannot be resolved from the codebase alone:

1. **White-label vs. co-branded:** Does the platform present itself to tenant visitors at all (a "Powered by AlpacaFarm.io" badge in the footer), or is it fully white-label (tenant visitors never know the platform exists)? This determines whether `app/[locale]/layout.tsx` injects any platform branding and whether the platform needs its own public marketing site.

2. **Target tenant size:** Targeting operators similar to alpacasibiza (1-2 person family farm, <500 bookings/year, Ibiza/Mediterranean region) vs. larger agri-tourism businesses (10+ staff, multi-location, 5,000+ bookings/year) determines whether the tenant config-file model scales or whether a tenant management UI becomes necessary within the first year.

3. **Host strategy for tenant assets:** Commit to repo (Option A, simple, limited) vs. Vercel Blob / Cloudflare R2 (Option B, production-grade, requires CDN setup). This affects the onboarding flow immediately — Option A means asking tenants to submit assets as files for a commit; Option B means building an asset upload API before onboarding tenant #2.

4. **Platform domain:** Is the platform's own domain `alpacafarm.io`, `farmsite.io`, something else? The subdomain convention in the resolution chain (`<id>.alpacafarm.io`) depends on this. Also affects whether alpacasibiza retains its existing domain or migrates to a platform subdomain.

5. **Booking vendor lock-in:** Current design assumes FareHarbor as the only booking vendor. If tenant #2 uses a different operator (Checkfront, Fareharbor competitor, or direct Stripe checkout), does the platform need a booking-vendor abstraction layer now, or is FareHarbor-only acceptable for v1?

---

## File Reference Summary

Primary files requiring refactoring for multi-tenancy (in priority order):

1. `C:\Users\cruzb\Projects\alpaca-farm-redesign\middleware.ts` — add tenant resolution before locale detection; source locales from tenant config.
2. `C:\Users\cruzb\Projects\alpaca-farm-redesign\lib\config.ts` — all hardcoded alpacasibiza values (domain, FareHarbor shortname, prices) become tenant-config reads.
3. `C:\Users\cruzb\Projects\alpaca-farm-redesign\lib\mailer.ts` — `FROM_EMAIL` and `DEFAULT_TO` are hardcoded to alpacasibiza values; must be tenant-resolved per request.
4. `C:\Users\cruzb\Projects\alpaca-farm-redesign\lib\structured-data.ts` — all entity names, phone, email, social URLs, and geo coordinates are hardcoded; all become tenant-config reads.
5. `C:\Users\cruzb\Projects\alpaca-farm-redesign\app\[locale]\layout.tsx` — `siteName`, JSON-LD schemas, and OG metadata are alpacasibiza-specific; must accept tenant context.

Secondary (important but lower blast radius):

6. `C:\Users\cruzb\Projects\alpaca-farm-redesign\translations\*.json` (root) — restructure as platform base; tenant overrides sit in `tenants/<id>/content/translations/`.
7. `C:\Users\cruzb\Projects\alpaca-farm-redesign\app\[locale]\page.tsx` — hardcoded Facebook review URL (`facebook.com/alpacasibiza/reviews`) and any remaining brand strings must be tenant-config driven.

---

*Blueprint version 1.0 — Design only. No code changes. No file moves. All decisions subject to Cruz's answers to Section 8.*
