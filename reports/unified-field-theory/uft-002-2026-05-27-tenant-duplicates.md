---
report: uft-002
date: 2026-05-27
scope: tenant-specific value duplication across whole repo
mode: targeted-grep (single tenant lift to tenants/alpacasibiza/config.ts)
analyst: Claude Sonnet 4.6 (manual UFT execution per Cruz prompt)
predecessor: uft-001 (lib/ + app/ generic duplication, score 74)
---

# UFT-002 — Tenant Duplicate Catalog (alpacasibiza)

**Goal:** Inventory every alpacasibiza-specific value duplicated across the codebase so we can lift to ONE typed tenant config file. This is the *duplication catalog*, not a rebuild plan (see matrix-reload for that).

**Scope filter:** Excluded `node_modules/`, `reports/`, `docs/`, `*.md`, `specs/` from code counts. Reports/docs were used only to confirm the universe of distinct values.

---

## Top 10 Most-Duplicated Alpacasibiza-Specific Values (code-only)

Ranked by total occurrences in code (translations + .ts/.tsx + config); reports/docs excluded.

| # | Value | Type | Code occurrences | Files | Canonical home today? |
|---|---|---|---|---|---|
| 1 | `#556B2F` | Brand olive hex (literal, not CSS var) | **42** | 10 | NONE — globals.css has it once as comment, all uses are raw |
| 2 | `Wishfulfilling Weaving` | Sub-brand name | **36** | 8 (6 locales + layout.tsx + page.tsx) | NONE |
| 3 | `#F5F5DC` / `#f5f5dc` | Brand beige hex | **31** | 10 | NONE — email-templates.ts BRAND has one copy |
| 4 | `alpacasibiza` (slug, code-only) | Tenant slug | **72** | 29 | partial — `lib/config.ts` for FAREHARBOR shortname only |
| 5 | `Es Currals` | Brand prefix | **25** | 15 (6 locales + 5 pages + 1 layout + structured-data) | NONE |
| 6 | `info@alpacasibiza.com` (code-only) | Primary email | **11** | 8 | partial — `lib/mailer.ts` `DEFAULT_TO`, but 7 sites still inline (per uft-001 FD-3) |
| 7 | `hello@alpacasibiza.com` | Secondary/newsletter email | **17** | 7 (newsletter.ts + 6 locales × ~3 keys) | partial — `lib/newsletter.ts` FROM_EMAIL with env fallback |
| 8 | `+32475586544` (E.164) / `+32 475 58 65 44` (display) | Owner phone — two formats | **7** (E.164) + **6** (display) = **13** | 6 | NONE — duplicated as link, schema, display |
| 9 | `San Carlos` | Address locality (untranslated literal) | **11** | 11 (6 locales + 5 code files) | NONE |
| 10 | `GTM-KR3CGLS6` | GTM container ID | **2** (script + noscript in layout.tsx) + **1** in next.config.mjs CSP comment = **3** | 2 | NONE — hardcoded twice in same file |

**Total code-level alpacasibiza-specific references catalogued: ~270 across ~35 files.**

---

## Full Inventory Table (every requested pattern)

| Pattern | Code occurrences | Files | Notes |
|---|---:|---:|---|
| `alpacasibiza` (slug) | 72 | 29 | Plus 84 more in reports/docs/.env — see context table below |
| `Es Currals` | 25 | 15 | 6 locales × 2 lines (title + sectionTitle) + layout meta x2 + 5 page metas |
| `Wishfulfilling Weaving` | 36 | 8 | Repeated literally in all 6 locale files (weavingTitle, title, weavingDescription, subtitle, etc.) AND in `app/layout.tsx` (meta title + description) AND in `app/[locale]/page.tsx` (component label comment) |
| `+32 475 58 65 44` (display) | 6 | 6 | Footer, contact page, email-templates (footer line + reminder body), OWNER_INPUT_NEEDED, reports |
| `+32475586544` (E.164/links) | 7 | 5 | `tel:` + 2× `wa.me/` + 2× structured-data telephone + email-templates whatsappUrl default |
| `info@alpacasibiza.com` (code-only) | 11 | 8 | Footer (mailto), contact page (mailto), email-templates footer line, structured-data, mailer DEFAULT_TO, payment-vendor, adopt page x2 |
| `G-Y946QDVVQV` (GA4) | 2 in layout.tsx + 1 in .env.local.example = **3** | 2 | Hardcoded twice in `app/layout.tsx` (src + config call) |
| `GTM-KR3CGLS6` (GTM) | 2 in layout.tsx + 1 CSP comment = **3** | 2 | `app/layout.tsx:82` + `:87`, plus next.config.mjs comment |
| `San Carlos` | 11 | 11 | 6 locales (translated suffix only — locality stays "San Carlos") + 5 code files (yoga `streetAddress`, structured-data `streetAddress`, footer, email-templates x2) |
| `Santa Eulària` / `Santa Eularia` | 6+ | 5 | structured-data `addressLocality`, contact map comment + 2 iframe attrs, alpacas page, yoga page (`addressLocality`) |
| `07819` (postal code) | 2 | 2 | `lib/structured-data.ts:76`, `app/[locale]/yoga/page.tsx:67` |
| `38.9861` (lat) / `1.5228` (lng) | 5 | 2 | structured-data x2, contact page x3 (comment, iframe `marker=`, iframe link `mlat`/`mlon`) |
| `#546A2E` (HSL-computed olive — appears in reports only as a derived value) | 0 in code | 0 | All code uses `#556B2F` literal or `--primary` CSS var; the `#546A2E` in reports is a HSL→hex round-trip of `--primary: 82 39% 30%` |
| `#6DA855` / `#6da855` (themeColor green) | 1 | 1 | `app/layout.tsx:35` `themeColor`. (README mentions it once as docs.) Diverges from `--primary` `#556B2F` — known internal inconsistency. |
| `#DC7E3B` (accent terra) | 0 in code | 0 | Only appears in reports; in code it's HSL `25 70% 55%` via globals.css. Not a duplication issue. |
| Belgian press outlet names | 0 outside `lib/data/press.ts` (6 entries) | 1 | Already centralized — no duplication. Outlet strings are owner-supplied content, not tenant-config. |

---

## Additional Tenant Values Discovered (not in original pattern list)

While scanning, these tenant-specific constants also surfaced as duplicated:

| Value | Where | Comment |
|---|---|---|
| `noreply@alpacasibiza.com` | `lib/mailer.ts:5` (FROM_EMAIL template literal) | Single occurrence but distinct from `info@` / `hello@`. Tenant constant. |
| `Alpacas Ibiza` (org name string) | layout meta, footer, mailer FROM display, structured-data x3, email-templates BRAND.name, owner-digest digest, copyright line | 10+ direct string literals across code; no central `TENANT.name` |
| `https://www.facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/` | footer | Sole code copy, but the FB URL in `structured-data.ts:41` is a different one (`/alpacasibiza`) — already drifted |
| `https://www.facebook.com/alpacasibiza` | `lib/structured-data.ts:41` | Conflicts with footer (above). LIKELY one is wrong. |
| `https://www.instagram.com/alpacasibiza` (structured-data) vs `https://www.instagram.com/wishfulfillingweaving/` (footer) | structured-data + footer | Two different IG handles wired — also drifted |
| `FLOW=1257173` (FareHarbor flow id) | `.env.local.example:17` only in code (rendered via env at runtime) | Already env-driven; tenant-scoped but not duplicated in source |
| `wa.me/32475586544` URL | email-templates.ts (x2), footer.tsx (x1) | 3 copies of the same URL formed from the phone number |
| `maps.google.com/?q=Alpacas+Ibiza,+San+Carlos,+Ibiza,+Spain` | email-templates.ts:38 default | Derived from name+address but hardcoded as a string |
| `themeColor: '#6da855'` literal | `app/layout.tsx:35` | Tenant brand surface; already known to diverge from `--primary` |

---

## Values That LEGITIMATELY Differ Per Locale (DO NOT centralize)

These are translation files doing their job — they MUST diverge per locale and should remain in `translations/*.json`:

- Locale-specific tour names, marketing copy, sectionTitles, subtitles in 6 languages
- Country name suffix: `Spain` / `Spanje` / `Spagna` / `Espagne` / `España` / `Spanien` in the `San Carlos, Ibiza, <country>` line
- Locale-specific page metas inside `app/[locale]/<page>/page.tsx` files (handled by Next.js per-route metadata, sometimes pulling from translations)
- Welcome/CTA copy referencing brand or product names

**Untranslated literals inside translation files** (e.g. `Es Currals`, `Wishfulfilling Weaving`, `Alpacas Ibiza`, `San Carlos`, `info@alpacasibiza.com`, `hello@alpacasibiza.com`, the phone number) — these are tenant constants that happen to live in translation files because the rest of the sentence is localized. They should NOT be hardcoded inside locale JSON; they should be `{{tenant.brand.sub}}` style interpolation tokens at translation time, OR the sentence should be a template with the brand inserted from `tenants/alpacasibiza/config.ts`.

---

## Proposed Schema Sketch — `tenants/alpacasibiza/config.ts`

```ts
// tenants/alpacasibiza/config.ts
// Single source of truth for everything tenant-specific. Generic infra
// (lib/mailer, lib/turnstile, etc.) consumes this via dependency injection
// or direct import. NO HARDCODED 'alpacasibiza' strings outside this file
// (except the file path itself).

export interface TenantConfig {
  slug: 'alpacasibiza'                       // for FareHarbor shortname, embed URL, file paths
  brand: {
    name: string                             // 'Alpacas Ibiza'
    fullName: string                         // 'Es Currals Alpacas Ibiza'
    prefix: string                           // 'Es Currals'
    subBrand: string                         // 'Wishfulfilling Weaving'
    tagline: string                          // 'First Alpaca Farm & Weaving Studio'
  }
  contact: {
    primaryEmail: string                     // 'info@alpacasibiza.com'
    newsletterEmail: string                  // 'hello@alpacasibiza.com'
    noreplyEmail: string                     // 'noreply@alpacasibiza.com'
    fromDisplay: string                      // 'Alpacas Ibiza Website <noreply@alpacasibiza.com>'
    phoneE164: string                        // '+32475586544'
    phoneDisplay: string                     // '+32 475 58 65 44'
    whatsappUrl: string                      // 'https://wa.me/32475586544'  (derived)
  }
  address: {
    streetAddress: string                    // 'San Carlos'
    addressLocality: string                  // 'Santa Eulària des Riu'
    addressRegion: string                    // 'Islas Baleares'
    addressCountry: 'ES'
    postalCode: '07819'
    mapsUrl: string                          // 'https://maps.google.com/?q=Alpacas+Ibiza,+San+Carlos,+Ibiza,+Spain'
  }
  geo: {
    latitude: 38.9861
    longitude: 1.5228
    osmEmbedBbox: '1.4828,38.9661,1.5628,39.0061'
  }
  brandColors: {
    primary: '#556B2F'                       // olive — used in 42 code refs
    secondary: '#F5F5DC'                     // beige — 31 code refs
    themeColor: '#6da855'                    // viewport themeColor (TODO: reconcile with primary)
    // future: accent, etc.
  }
  social: {
    facebook: string                         // canonicalize one URL
    instagram: string                        // canonicalize one handle (currently drifted)
  }
  analytics: {
    ga4MeasurementId: string                 // 'G-Y946QDVVQV'
    gtmContainerId: string                   // 'GTM-KR3CGLS6'
  }
  fareharbor: {
    shortname: 'alpacasibiza'
    flowId: '1257173'
  }
  press: PressMention[]                      // re-export from lib/data/press.ts or move into tenant
  // i18n stays in translations/, but those files SHOULD use template tokens like
  //   "title": "{{brand.fullName}}"
  // instead of duplicating "Es Currals Alpacas Ibiza" 6 times.
}

export const tenant: TenantConfig = { /* … */ }
```

**Consumption pattern:**
- `lib/config.ts` (existing) re-exports `tenant.fareharbor.shortname`, `tenant.analytics.*` for backward compat with current imports
- `lib/mailer.ts` reads `tenant.contact.fromDisplay`, `tenant.contact.primaryEmail`
- `lib/email-templates.ts` reads `tenant.brandColors`, `tenant.contact`, `tenant.address`
- `lib/structured-data.ts` reads `tenant.brand.fullName`, `tenant.address`, `tenant.geo`, `tenant.contact`, `tenant.social`
- `app/layout.tsx` reads `tenant.brand.*`, `tenant.brandColors.themeColor`, `tenant.analytics.*`, `tenant.fareharbor.shortname`
- `components/footer.tsx` reads `tenant.address.streetAddress`, `tenant.contact.*`, `tenant.social.*`
- Translation files lose the bare brand strings — instead, use a runtime template-token replacer in `t()`.

---

## CAN'T DO WITHOUT HELP

1. **Drifted social URLs.** `lib/structured-data.ts:41-42` lists `facebook.com/alpacasibiza` + `instagram.com/alpacasibiza`. `components/footer.tsx:104,113` links `instagram.com/wishfulfillingweaving/` + `facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/`. **Owner must confirm which IG handle and which FB URL are canonical** before we lift to `tenant.social`. We must not pick one silently.

2. **`themeColor` vs `--primary` divergence.** `app/layout.tsx:35` sets `themeColor: '#6da855'` (bright green), but `app/globals.css` `--primary: 82 39% 30%` resolves to `#556B2F` (olive). Both are tenant-config candidates, but they are NOT the same value. Lift both into `tenant.brandColors` but **flag for owner** before normalizing them to one hex. (Per CLAUDE.md this is already a known internal inconsistency; the lift doesn't fix it, it just makes the divergence explicit.)

3. **`#546A2E` in reports vs `#556B2F` in code.** Reports talk about `#546A2E` as `--primary`. The code uses `#556B2F` in 42 places. `#546A2E` does NOT appear anywhere in source code. The discrepancy is a HSL→hex round-trip artifact: `hsl(82, 39%, 30%) ≈ #556B2F` (and reports rounded it slightly differently). **No action needed** — this is a reporting artifact, not a duplication. Treat `#556B2F` as the literal in code.

4. **Phone vs WhatsApp number.** They are the same E.164 today. If they ever diverge (owner adds a separate WhatsApp Business number), `tenant.contact.whatsappUrl` should NOT be derived from `phoneE164`. Worth a flag in the schema.

5. **`hello@` vs `info@` distinction.** The `hello@` address only appears in (a) `lib/newsletter.ts` FROM, (b) translations of privacy/terms/cookies "last-updated" lines, and (c) the `OWNER_INPUT_NEEDED` Resend domain verification doc. **Owner question: is `hello@` ever going to receive replies, or is `info@` the only real inbox?** If `info@` is the only real one, the translations are misleading and `hello@` should be removed from public-facing copy entirely — that's a content fix, not a config lift.

6. **`Es Currals` vs `Alpacas Ibiza` precedence.** Some surfaces use `Es Currals Alpacas Ibiza`, some use just `Alpacas Ibiza`, some use `Alpacas Ibiza – Es Currals`. Three different orderings appear in `structured-data.ts` alone (line 36 `Alpacas Ibiza`, line 59 `Alpacas Ibiza – Es Currals`, line 110 `Alpaca Farm Experience – Guided Tour Ibiza`). **Owner must pick a canonical brand-name composition rule** before we lift — otherwise we just freeze the inconsistency.

---

## Summary

- **270+ tenant-value references** across **~35 code files** are candidates for lift into `tenants/alpacasibiza/config.ts`
- **Top duplication offenders**: brand hex `#556B2F` (42), `Wishfulfilling Weaving` (36), brand hex `#F5F5DC` (31), `Es Currals` (25), `hello@alpacasibiza.com` (17)
- **Already-partial owners** worth extending: `lib/config.ts` (FareHarbor), `lib/mailer.ts` (`DEFAULT_TO`), `lib/email-templates.ts` (`BRAND` const), `lib/newsletter.ts` (FROM)
- **Locale-correct duplication** (which stays): translated copy bodies — but the **untranslated tenant nouns inside those JSONs** (phone, email, brand names, locality) should switch to interpolation tokens once `tenant` config exists
- **Blockers to a clean lift**: 3 owner-input items above (social URL drift, themeColor reconciliation, brand-name composition rule) — everything else is mechanical
