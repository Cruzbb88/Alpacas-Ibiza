# 002 — Tenant Model

**Phase 2 of SaaS Blueprint** | Status: DRAFT — awaiting Cruz GO decisions
**Date:** 2026-05-27
**Depends on:** 001-saas-discovery (assumed complete)
**Crystal-ball mode:** local-file (no Cortex per CANT_BE_DONE.md:Limit-1)

---

## 1. Tenant Identification — Recommendation: All-of-the-above (slug + optional CNAME)

Every tenant gets a permanent slug (`escurrals`, `vineyard`). The slug is the system's canonical identifier in all data stores and logs. Custom domain is additive, not a replacement.

| Strategy | Pros | Cons for small tour ops | Migration impact |
|---|---|---|---|
| **Subdomain** `escurrals.alpacaframework.com` | Zero DNS on tenant side; easy wildcard cert | Tenant can't use their own brand domain; subdomains blocked on some corporate Wi-Fi | `middleware.ts` reads `request.headers.get('host')`, extracts subdomain prefix before first `.` |
| **Path-prefix** `alpacaframework.com/escurrals/` | No DNS changes ever | URL looks platform-branded, not tenant-branded; harder to white-label SEO; route collisions with `[locale]` segment (see §2) | Wrap `app/[locale]` under `app/[tenant]/[locale]` — restructures the entire App Router tree |
| **Custom domain** `escurralsalpacas.com` CNAME to framework | Fully white-label; client controls their brand URL | Requires DNS literacy from each client; certificate provisioning per domain (Vercel supports this but needs pro plan) | `middleware.ts` reads `Host` header, looks up tenant map, falls through to 404 if unknown |
| **All-of-the-above** (slug + optional CNAME) | Tenants start on subdomain, graduate to custom domain when they're ready; framework owns canonical slug permanently | Most complex middleware; two lookup paths | Additive — subdomain stays authoritative; custom domain is an alias stored in tenant config |

**Pick: All-of-the-above.** Rationale:
- Tour operators are small businesses. Most won't manage DNS at onboarding. Subdomain gets them live on day 1.
- High-value clients (or clients with existing brand equity like alpacasibiza.com) need custom domain to preserve their Google ranking.
- The slug never changes even if the domain changes — it anchors all data relationships.
- Vercel supports wildcard subdomains + per-domain certs natively on Pro. No third-party cert tooling needed.

---

## 2. Locale × Tenant Route Shape — Pick: Subdomain + locale-in-path

**Chosen shape:** `{tenant}.alpacaframework.com/{locale}/...` for subdomain tenants, `escurralsalpacas.com/{locale}/...` for custom-domain tenants (tenant resolved server-side from Host header before locale segment).

Current shape per `middleware.ts:9-11`: `/{locale}/...`
Current sitemap per `app/sitemap.ts:32`: `${BASE_URL}/${locale}${route}`

Path-prefix shape (`framework.com/{tenant}/{locale}/...`) is rejected because it requires restructuring the entire `app/[locale]/` App Router directory tree into `app/[tenant]/[locale]/`, which is a big-bang rewrite with no feature-flag rollout path. It also creates route ambiguity — `alpacaframework.com/es/tours` is ambiguous: is `es` a tenant slug or the Spanish locale?

**Sitemap impact:** Each tenant's sitemap becomes `https://{tenant-domain}/{locale}{route}`. The `app/sitemap.ts` file needs a `tenantConfig` context — it currently hardcodes `SITE_BASE_URL` from `lib/config.ts`. Post-migration: sitemap is generated per-tenant with their canonical base URL and their enabled locales only (per `tenantConfig.localeConfig.enabled`).

**hreflang impact:** `alternates.languages` in `app/sitemap.ts:37-40` must use the tenant's enabled locale list (not all 6 from `i18nConfig`). A tenant enabling only `en + nl` should not emit hreflang for `de/it/es/fr`. This also resolves the spec-005 locale-debt concern (`specs/todo/005-locale-strategy.md`) for per-tenant scope.

---

## 3. Data Store Options (Cruz picks — do not implement yet)

The existing codebase has: zero DB, in-memory stores (ADR 001, ADR 011), Resend for email, and an explicit "upgrade to KV when volume justifies" pattern. Any option must fit this upgrade-path thinking.

**DO NOT PICK THIS FOR CRUZ — enumerate only.**

| Option | ~10 tenants | ~100 tenants | ~1000 tenants | Complexity | Provision steps | Migration from current |
|---|---|---|---|---|---|---|
| **JSON file per tenant** `tenants/<slug>.json` | $0 | $0 | Impractical (git history bloat, no concurrent writes) | Lowest | None — just commit files | Trivial: extract hardcoded values → JSON file per ADR pattern |
| **Vercel KV (Upstash Redis)** | $0–$10/mo | $20–$60/mo | $200+/mo at high write volume | Low | 1 CLI command; already on upgrade path (ADR 001 + 011) | Low: port `globalForStore` pattern; tenant lookup = `kv.get('tenant:${slug}')` |
| **Vercel Postgres / Neon** | $0 (hobby) | $20/mo | $70–$150/mo | Medium | Vercel dashboard + Drizzle/Prisma schema | Medium: new ORM dep, new migration pipeline, schema write |
| **Supabase** | $0 (free tier) | $25/mo | $100–$400/mo + compute | Medium–High | New service account; RLS policies per table | Medium: wires Supabase Auth + RLS, but adds non-Vercel infra |
| **Cloudflare D1** | $0 | $0–$5/mo | $5–$25/mo | Medium | Requires Cloudflare Workers (incompatible with Vercel deployment unless proxied) | High: conflicts with current Vercel hosting target |
| **Vercel env vars with `TENANT_<SLUG>_*` prefix** | $0 | Fragile at ~50 | Hard limit ~100 vars total on most plans | Lowest | No new service; vars set in Vercel dashboard | Trivial: rename existing vars |

**Recommendation signal (for Cruz's decision):** The "JSON file → KV → Postgres" ladder matches how the existing ADRs escalate. JSON covers tenant 1–2 (alpacas-ibiza pilot). KV is the natural bridge — it's already on the upgrade path for two other stores. Postgres/Supabase is the right home if the schema grows to include booking data, invoices, or tenant users. D1 and env-var prefixing are dead ends at scale.

---

## 4. Tenant Resolution Flow

```
Incoming request
│
├── middleware.ts (runs first — Edge runtime)
│   │
│   ├── Extract host = request.headers.get('host')
│   │   ├── If host matches *.alpacaframework.com
│   │   │   └── slug = host.split('.')[0]
│   │   └── Else (custom domain)
│   │       └── slug = await resolveTenantByDomain(host)
│   │           ├── Cache hit (edge KV or in-memory LRU) → slug
│   │           └── Cache miss → KV/DB lookup → cache TTL 60s
│   │               └── Not found → return NextResponse 404 with branded error
│   │
│   ├── Attach slug to request via response header X-Tenant-Slug
│   │   (Next.js 14 App Router: use request.headers for server components)
│   │
│   └── Continue locale resolution (existing logic, middleware.ts:6-29)
│
└── Server Component / Route Handler
    ├── const slug = headers().get('x-tenant-slug')
    ├── const tenant = await getTenantConfig(slug)  ← adapter call
    └── Render with tenant context (branding, integrations, locale list)
```

**Cache miss path:** `resolveTenantByDomain` checks in-memory LRU first (process-scoped, same pattern as ADR 001/011), then the backing store (KV or JSON file). On miss from the store, returns null → 404 with `X-Tenant-Unknown: true` header for logging.

**Fail mode if slug not found:** Return `NextResponse.next()` with status 404 to a branded "tenant not found" page, not a framework error. Log `console.error('[tenant] unknown slug:', slug)` — same pattern as admin login fail-closed (`app/api/auth/[...nextauth]/route.ts:13-19`).

**Secret injection:** Tenant integration secrets (FareHarbor keys, Resend API key, etc.) are NOT in the tenant config object returned to the browser. The middleware only attaches the slug. Secrets are fetched server-side only, in route handlers or Server Components, keyed by slug from a secrets store (KV with `secret:${slug}:fareharborAppKey` pattern).

---

## 5. Per-Tenant Data Shape — Minimum Viable Schema

```typescript
// lib/tenant-types.ts

export type PlanTier = 'trial' | 'starter' | 'pro' | 'enterprise'
export type BillingStatus = 'trial' | 'active' | 'past_due' | 'cancelled'

export interface TenantBranding {
  logoUrl: string | null          // CDN URL, not in repo
  primaryHex: string              // e.g. '#4A7C59'
  accentHex: string
  fontHeading: string             // e.g. 'Playfair Display'
  fontBody: string                // e.g. 'Inter'
  faviconUrl: string | null
}

export interface TenantIntegrationRefs {
  // PUBLIC IDs — safe to include in config object
  fareharborShortname: string | null   // e.g. 'alpacasibiza'
  fareharborFlowId: string | null      // e.g. '1257173'
  ga4MeasurementId: string | null      // e.g. 'G-XXXXXXXX'
  gtmContainerId: string | null        // e.g. 'GTM-XXXXXXXX'
  resendFromDomain: string | null      // e.g. 'alpacasibiza.com'
  contactEmail: string                 // required — booking/form notifications
  // SECRETS — stored separately in secrets store, NEVER in this object:
  // fareharborAppKey, fareharborUserKey, resendApiKey,
  // ga4ClientEmail, ga4PrivateKey, adminUsername, adminPassword,
  // turnstileSecretKey, webhookSecret, cronSecret
}

export interface TenantContentRefs {
  // Pointers to tenant's content — not the content itself
  animalListId: string | null         // reference to content source
  experienceListIds: string[]
  shopItemIds: string[]
  heroImageUrl: string | null
}

export interface TenantBilling {
  planTier: PlanTier
  stripeCustomerId: string | null
  status: BillingStatus
  trialEndsAt: string | null          // ISO 8601
  currentPeriodEndsAt: string | null  // ISO 8601
}

export interface TenantLocaleConfig {
  default: string                     // e.g. 'nl'
  enabled: string[]                   // subset of i18nConfig.locales
}

export interface TenantConfig {
  // Identity
  slug: string                        // immutable, primary key
  displayName: string                 // e.g. 'Alpacas Ibiza'
  customDomain: string | null         // e.g. 'alpacasibiza.com'
  subdomainSlug: string               // always set; equals slug

  // Config objects
  branding: TenantBranding
  integrations: TenantIntegrationRefs  // public IDs only
  content: TenantContentRefs
  billing: TenantBilling
  localeConfig: TenantLocaleConfig

  // Meta
  createdAt: string                   // ISO 8601
  updatedAt: string                   // ISO 8601
}
```

**Where secrets live:** Secrets are never in `TenantConfig`. They are fetched from the backing secrets store (Vercel KV keys prefixed `secret:${slug}:*`, or Vercel env vars prefixed `TENANT_${SLUG.toUpperCase()}_*` for the JSON-file tier). The `TenantIntegrationRefs` carries only the public-facing IDs (shortname, flow ID, measurement ID) that are already embedded in client-side HTML on the current site.

---

## 6. Migration Path — alpacas-ibiza Becomes Tenant 1

**What changes:**

| File | Change |
|---|---|
| `lib/config.ts` | Extract `SITE_BASE_URL`, FareHarbor shortname/flowId, GA4 ID into `tenants/alpacas-ibiza.json` (or KV entry). `lib/config.ts` becomes `getTenantConfig(slug)` adapter shell. |
| `middleware.ts` | Add host→slug resolution before existing locale logic (lines 31-66). Attach `X-Tenant-Slug` header. |
| `app/sitemap.ts` | Replace `SITE_BASE_URL` hardcode with `tenantConfig.customDomain ?? \`${slug}.alpacaframework.com\``. |
| `i18n.config.ts` | `locales` array stays global (framework knows all supported locales); per-render filtering uses `tenantConfig.localeConfig.enabled`. |
| `next.config.mjs` | Add wildcard subdomain to `remotePatterns` when tenant logos are remote CDN URLs. Rate-limit keys in `lib/rate-limit.ts` should be `${slug}:${ip}` not just `${ip}` to isolate per-tenant quotas. |
| `app/[locale]/layout.tsx` | Pull branding tokens from `tenantConfig.branding` instead of Tailwind hardcodes. |
| `.env.local` | All hardcoded secrets become `TENANT_ALPACASIBIZA_*` keys (or KV entries). |

**What stays universal:** Next.js framework, App Router structure, middleware locale logic, all failsafe patterns (CLAUDE.md failsafe map), ADR patterns (rate-limit, in-memory KV upgrade path, Resend scheduledAt).

**Backwards compatibility window:** None needed. alpacas-ibiza is pre-launch (INTEGRATION_STATUS: NOT DEPLOYED). Big-bang extraction into tenant-1 config before first deploy is lower risk than a feature-flag rollout — there are no live users to break.

**Rollout strategy:** Big bang is correct here. Feature-flag rollout is for migrating live tenants; this is extracting a single pre-launch tenant. Steps:
1. Create `tenants/alpacas-ibiza.json` with all current hardcoded values extracted.
2. Build `lib/tenant-types.ts` (interface above) + `lib/tenant-adapter.ts` (reads JSON file).
3. Thread `tenantConfig` through middleware → layout → components.
4. Verify parity: all existing pages render identically.
5. Deploy as tenant 1. Add tenant 2 by adding a second JSON file.

---

## 7. Phase 2 GO Conditions

| Decision | Owner | Status |
|---|---|---|
| **GO-1:** Tenant axis — Cruz picks subdomain / path / custom / all-of-above | Cruz | PENDING |
| **GO-2:** Data store — Cruz picks JSON file / Vercel KV / Postgres / Supabase / other | Cruz | PENDING |
| **GO-3:** Tenant schema approved (or amend `TenantConfig` interface above) | Cruz | PENDING |
| **GO-4A:** Reversible scaffolding GO — interfaces + adapter shells (no DB migration, no data) | Cruz | Unlocks after GO-1+GO-3 |
| **GO-4B:** Data migration GO — actual store provisioning + data write | Cruz | Unlocks after GO-2+GO-4A |

**GO-4A and GO-4B are explicitly separate.** Adapter shells (`lib/tenant-types.ts`, `lib/tenant-adapter.ts`, middleware host resolution) can be merged and deployed before the backing store is chosen. They compile against an interface, not a concrete store. This gives Cruz a working multi-tenant scaffold with a JSON-file backing store that swaps to KV or Postgres later by changing one adapter implementation file.

---

## Crystal-Ball Pre-Mortem (local-file mode — no historical decay data per CANT_BE_DONE.md)

**Predicted issues if tenant axis is NOT locked before scaffolding:**
- Path-prefix requires restructuring `app/[locale]/` tree — if that decision flips after scaffold is built on subdomain, the App Router rewrite is non-trivial (estimated 2-4h rework).
- Custom domain cert provisioning is a Vercel Pro plan feature — if Cruz is on Hobby at first tenant-2 onboarding, this blocks launch.

**Predicted issues if DB is picked before GO-4A scaffolding:**
- Picking Supabase before the adapter interface is frozen risks building Supabase-specific calls into components instead of through the adapter — defeats the swappability.

**Risk: rate-limit store is process-scoped (ADR 011)** — when multi-tenant, a flood on tenant A's form routes shares the counter pool with tenant B. Fix: key rate-limit entries as `${slug}:${ip}` (one-line change in `lib/rate-limit.ts`). Flag this for GO-4A.
