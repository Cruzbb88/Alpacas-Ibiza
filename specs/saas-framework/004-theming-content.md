# 004 — Theming + Content Model
**SaaS Framework Phase 4 · alpaca-farm-redesign**
_2026-05-27 — design-only, no component changes_

---

## Reconnaissance findings

| File | Key fact |
|---|---|
| `tailwind.config.ts` | All colors already `hsl(var(--token))` — CSS variable layer is scaffolded |
| `app/globals.css:15–70` | `:root` block defines 20+ HSL tokens (primary = olive 82 39% 30%, accent = terra 25 70% 55%, etc.) |
| `translations/en.json` | 591 leaf string keys across 6 locales; no per-tenant namespace |
| `lib/data/alpacas.ts` | `{ id, name, bio: null, image: null }` — UNMAPPED sentinel pattern established |
| `lib/structured-data.ts:33–50` | `organizationSchema()` hardcodes name, sameAs, telephone for Alpacas Ibiza |
| `app/[locale]/experiences/corporate-team-building/page.tsx` | **80 hardcoded hex occurrences** (`#556B2F`, `#708090`, `#F5F5DC`, `#F9F9F9`) bypassing the CSS variable layer |
| `lib/config.ts` | `SITE_BASE_URL`, `TOUR_BASE_PRICE_EUR`, FareHarbor shortname — all single-tenant constants |

---

## 1. Per-tenant brand surface

Every item below lives in a `tenant.config.ts` file under `tenants/<slug>/`.

### Identity
| Field | Type | Notes |
|---|---|---|
| `slug` | `string` | URL-safe, kebab-case. Primary key. |
| `businessName` | `string` | Display name (e.g. "Alpacas Ibiza") |
| `legalName` | `string \| null` | For invoices/structured-data |
| `taxId` | `string \| null` | CIF/VAT — UNMAPPED until owner supplies |
| `logoUrl` | `string \| null` | Absolute URL or `/public/tenants/<slug>/logo.svg` |
| `faviconUrl` | `string \| null` | 32×32 PNG or SVG |
| `ogDefaultImage` | `string \| null` | 1200×630 fallback for pages without a specific image |

### Contact + location
| Field | Type |
|---|---|
| `telephone` | `string \| null` |
| `email` | `string \| null` |
| `address` | `PostalAddress \| null` (schema.org shape) |
| `geo` | `{ latitude: number; longitude: number } \| null` |
| `socialUrls` | `Record<'facebook'\|'instagram'\|'tiktok'\|'youtube', string \| null>` |

### Commerce
| Field | Type |
|---|---|
| `currency` | `string` (ISO 4217, default `"EUR"`) |
| `defaultLocale` | `Locale` |
| `supportedLocales` | `Locale[]` |
| `bookingProvider` | `'fareharbor' \| 'custom' \| null` |
| `bookingShortname` | `string \| null` |

### Hours + policy
| Field | Type |
|---|---|
| `openingHours` | `OpeningHoursSpec[] \| null` (schema.org shape) |
| `cancellationPolicy` | `string \| null` — prose, used in booking UI |
| `priceRange` | `'€' \| '€€' \| '€€€' \| null` |

---

## 2. Tailwind tenant-theme strategy

**Situation:** `tailwind.config.ts` already maps every color token through `hsl(var(--token))`. `globals.css:15–70` defines the `:root` block. However, 80 occurrences of raw hex (`bg-[#556B2F]`) in experience pages bypass this entirely and will resist theming.

**Recommendation: CSS variables injected at layout level (Option A).**

```ts
// lib/tenant/theme.ts
export interface TenantTheme {
  primary: string        // HSL triple: "82 39% 30%"
  primaryFg: string
  secondary: string
  accent: string
  accentFg: string
  background: string
  foreground: string
  radius: string         // e.g. "1rem"
}

export function buildCssVars(theme: TenantTheme): string {
  return `
    --primary: ${theme.primary};
    --primary-foreground: ${theme.primaryFg};
    --secondary: ${theme.secondary};
    --accent: ${theme.accent};
    --accent-foreground: ${theme.accentFg};
    --background: ${theme.background};
    --foreground: ${theme.foreground};
    --radius: ${theme.radius};
  `.trim()
}
```

In `app/[locale]/layout.tsx` (server component):
```tsx
<html style={buildCssVars(tenant.theme)} ...>
```

**Why not the alternatives:**

- _Tailwind rebuild per tenant:_ requires N separate `next build` runs or CSS bundle injection at CDN edge. Deployment complexity scales with tenant count. Acceptable for 2 tenants, painful at 10+.
- _Inline style props on every component:_ leaves a permanent Tailwind/inline-style split. The 80 hardcoded hex bypasses in corporate pages already prove this gets out of hand immediately.

**Hex bypass remediation** (prerequisite for theming to work): the 80 raw hex occurrences in `app/[locale]/experiences/corporate-team-building/page.tsx` must be replaced with semantic tokens (`text-primary`, `bg-secondary`, `border-accent/20`, etc.) before any tenant theme injection is meaningful. This is a component-edit task, not a design task — flagged as a Phase 5 implementation gate.

**Font strategy:** each tenant picks from a curated list defined in `lib/tenant/fonts.ts`:
```ts
type TenantFont = 'geist+playfair' | 'inter+cormorant' | 'system'
```
Font injection uses `next/font` per-tenant at layout boot. Tenants do not provide arbitrary Google Font strings (XSS vector, flash of unstyled text risk).

---

## 3. Content entity model

Two separate patterns are right for different reasons.

**5 typed interfaces sharing a base** — not a union mega-type. Rationale: TypeScript narrows cleanly, each interface is self-documenting, and the experience/product/review shapes diverge enough that a union would require `Partial<everything>` on the shared fields.

```ts
// lib/tenant/content.ts

interface ContentBase {
  id: string
  name: string
  description: string | null   // null = UNMAPPED sentinel
  image: string | null         // null = UNMAPPED sentinel
  sortOrder?: number
}

export interface AnimalEntity extends ContentBase {
  type: 'animal'
  species: string              // e.g. "alpaca", "llama"
  birthYear?: number | null
}

export interface ExperienceEntity extends ContentBase {
  type: 'experience'
  duration: string             // e.g. "2h"
  pricePerPerson: number
  currency: string
  capacity: number
  scheduleNote: string | null
  bookingItemId: string | null // FareHarbor item ID or equivalent
}

export interface ProductEntity extends ContentBase {
  type: 'product'
  price: number
  currency: string
  category: string
  sku: string | null
}

export interface TeamMemberEntity extends ContentBase {
  type: 'team'
  role: string
  bio: string | null
  languages: string[]
}

export interface ReviewEntity extends ContentBase {
  type: 'review'
  authorName: string
  date: string
  language: string
  translationKey: string | null
  platform: 'google' | 'facebook' | 'tripadvisor' | 'direct'
}

export type TenantContentEntity =
  | AnimalEntity | ExperienceEntity | ProductEntity | TeamMemberEntity | ReviewEntity
```

Each tenant's content lives in `tenants/<slug>/content/` as separate files (`animals.ts`, `experiences.ts`, etc.), each exporting a typed array. The framework imports them via `lib/tenant/loader.ts` and never hard-codes data.

---

## 4. Copy / translations

**Current state:** `lib/translations.ts` imports all 6 locale JSON files statically. `getTranslation()` falls back `locale → en → defaultValue`. 591 leaf keys, all Alpacas Ibiza-specific.

**Recommended layering:**

```
tenants/<slug>/translations/<locale>.json   ← tenant-specific overrides (sparse)
translations/<locale>.json                  ← base framework strings (UI chrome, form labels)
```

Resolution order in `lib/tenant/translations.ts`:
1. `tenants/<slug>/translations/<locale>.json[key]`
2. `tenants/<slug>/translations/en.json[key]`
3. `translations/<locale>.json[key]`
4. `translations/en.json[key]`
5. `defaultValue`

The base `translations/en.json` retains only framework-level strings (nav labels, error messages, form placeholders, legal boilerplate). All business-specific copy (`hero.title`, `hero.subtitle`, `features.farm.description`, etc.) moves to the tenant override file. For the alpaca-ibiza tenant, this means their override file is large initially; it shrinks as the framework matures and base strings absorb the generic portions.

**Tenant override file size estimate:** ~200 of the current 591 keys are business-specific. The other ~391 are framework chrome (nav, CTA labels, form validation, cookie notice) that can remain in the base.

---

## 5. JSON-LD per tenant

All functions in `lib/structured-data.ts` currently hardcode Alpacas Ibiza facts inline.

**Refactored API:** every function accepts a `TenantConfig` first argument:

```ts
// lib/structured-data.ts (refactored signatures only)

export function organizationSchema(tenant: TenantConfig): object
// Was: hardcoded name, sameAs, telephone
// Now: tenant.businessName, tenant.socialUrls, tenant.telephone

export function localBusinessSchema(
  tenant: TenantConfig,
  reviewData?: AggregateRatingInput
): object
// Was: hardcoded name, address, geo, telephone, email, openingHours
// Now: all from tenant config

export function touristTripSchema(
  tenant: TenantConfig,
  experience: ExperienceEntity
): object
// Was: hardcoded name, price, provider
// Now: experience.name, experience.pricePerPerson, tenant.businessName

export function productSchema(
  tenant: TenantConfig,
  product: ProductEntity
): object
// Was: hardcoded brand name, BASE_URL
// Now: tenant.businessName, tenant.siteBaseUrl
```

`faqPageSchema` and `breadcrumbSchema` are already data-driven — no change needed.

Call sites pass `tenant` down from layout or page via `getTenantConfig()` (server-only function). No client-side tenant config leakage.

---

## 6. Logo + image storage

**Recommendation: tenant pastes URLs (remote-first), with `/public/tenants/<slug>/` as the local fallback.**

Rationale for each option:
- **Vercel Blob / S3 / R2:** requires upload UI, signed URL management, CORS config, and billing per tenant. Premature for a framework where tenants are currently onboarded manually.
- **Remote URLs (tenant-supplied):** zero infra cost. Owner pastes their CDN or Google Drive direct link. Works today. Risk: link rot. Mitigate by storing the URL in `tenant.config.ts` as `image: string | null` with the UNMAPPED sentinel — broken links are visible at config-load time.
- **`/public/tenants/<slug>/`:** used when the operator (Cruz/Tony) has the asset and wants to bundle it. Logo SVGs belong here. Hero photos likely too large to commit.

**Hybrid rule:**
- Logo (SVG, <10KB): commit to `/public/tenants/<slug>/logo.svg`
- Favicon (PNG, <2KB): commit to `/public/tenants/<slug>/favicon.png`
- Hero / OG image (>100KB): tenant-supplied URL, stored in config
- Animal/product photos: tenant-supplied URLs initially; migrate to R2 when volume justifies an upload UI

---

## 7. Animal-vs-anything entity rename

`lib/data/alpacas.ts` → **`lib/data/animals.ts`** for the alpaca-ibiza tenant. The framework's shared interface is `AnimalEntity` in `lib/tenant/content.ts`.

URL slugs are **not** renamed in the framework router. They are configured per tenant via `tenant.navigation`:

```ts
// In tenant.config.ts
navigation: {
  animals: '/alpacas',          // alpaca-ibiza → /en/alpacas
  // or:
  animals: '/animals',          // generic livestock farm → /en/animals
  // or:
  animals: null,                // tenant has no animal roster page
}
```

The framework's `[locale]/[...slug]` catch-all or a configurable route segment maps `tenant.navigation.animals` to the `AnimalEntity` list page. No `if (tenant === 'foo')` switches — the tenant config is the switch.

---

## 8. Phase 4 GO conditions

| Decision | Status | Notes |
|---|---|---|
| Tailwind theme strategy | **NEEDS CRUZ INPUT** | Recommendation: CSS variables at layout. Hex bypass cleanup is blocking prerequisite. |
| Content entity shape | **NEEDS CRUZ INPUT** | Recommendation: 5 typed interfaces with shared base. |
| Logo/image storage | **NEEDS CRUZ INPUT** | Recommendation: commit SVG logos, remote URLs for photos. |
| Translation layering | Can ship without GO | Base + tenant override pattern is additive, no breaking change. |
| JSON-LD refactor signatures | Can ship without GO | Signature change is backward-compatible if existing callers pass current hardcoded values as a `TenantConfig` literal. |
| `AnimalEntity` + `lib/tenant/content.ts` shell | Can ship without GO | New file, no existing code touched. |
| CSS variable hookup in layout | **Blocked on hex cleanup** | 80 hex bypasses in corporate page must convert first or theming has no effect there. |

**Items that can ship before GO (scaffolding pass):**
- `lib/tenant/theme.ts` — type + `buildCssVars()` shell
- `lib/tenant/content.ts` — 5 interfaces
- `lib/tenant/translations.ts` — 4-layer resolver (additive, falls through to existing `lib/translations.ts`)
- `tenants/alpacas-ibiza/tenant.config.ts` — first tenant, populated from current hardcoded values

**Items gated on Cruz's GO:**
- Injecting `buildCssVars()` into layout (requires committing to CSS variable strategy)
- Splitting `translations/en.json` into base vs tenant-override (destructive to existing key paths if done wrong)
- FareHarbor shortname moving from `lib/config.ts` into `tenant.config.ts` (env var rename)
