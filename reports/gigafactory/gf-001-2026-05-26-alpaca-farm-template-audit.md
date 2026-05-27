# GF-001 — Alpacas Ibiza Template Audit
**Date:** 2026-05-26
**Agent:** Gigafactory (Sonnet 4.6) — Step 0 Config Discovery + Generator Opportunity Scan
**Project:** `C:\Users\cruzb\Projects\alpaca-farm-redesign`

---

## Step 0: Config Discovery

### YAML Configs Found (non-node_modules)

| File | Purpose |
|------|---------|
| `.claude/commands/pickup-references/voice-profile.yaml` | User voice/style profile for /pickup output |
| `.claude/commands/self-heal/zone-map.yaml` | Zone/section map for self-heal command |
| `.claude/hooks/damage-control/patterns.yaml` | Damage-control hook patterns |
| `pnpm-lock.yaml` | Package lock (not a config) |

No application-level YAML configs exist. There is no config-driven page creation system — no `page-template-audit.yaml`, no `PageShell`, no `UniversalPageRenderer`, no slot-based layout router, no route group pattern beyond the single `[locale]` wrapper.

### Layout / Shell Architecture

| Layer | File | Role |
|-------|------|------|
| Root layout | `app/layout.tsx` | HTML shell, GTM, fonts |
| Locale layout | `app/[locale]/layout.tsx` | Header, Footer, StickyBookingBar, CookieConsent, JSON-LD (LocalBusiness + Org) |
| Pages | `app/[locale]/*/page.tsx` | All content — NO shared page shell, NO slot system |

The locale layout is the only reusable wrapper. Every page is a standalone file composing components manually with inline Tailwind. There is no `PageShell`, `PageHeader`, or `UniversalPageRenderer` abstraction.

### Component Inventory (shared, non-UI)

`Hero`, `Features`, `FAQ`, `FareHarborCalendar`, `Timeline`, `ReviewCard`, `BookingSection`, `CancellationBadge`, `AvailabilityUrgency`, `GoogleReviewsBadge`, `PageBreadcrumbs`, `ExperienceCards`, `ChoicePaths`, `WeavingShowcase`, `ContactForm`, `CommissionForm`, `NewsletterForm`, `ProductCard`, `StickyBookingBar`

---

## Generator Opportunity Scan

### Page Inventory

| Route | Page | Hero | FAQ | Booking Calendar | CTA Banner | Features Grid | Product Grid | Legal Prose | Verdict |
|-------|------|------|-----|-----------------|------------|---------------|--------------|-------------|---------|
| `/` | Home | Y | N | N | Y | Y | N | N | One-off |
| `/tours` | Tours | Y | Y (10 items) | Y | N | Y | N | N | Generator candidate |
| `/alpacas` | Meet Alpacas | Y | N | N | N | N (data-driven grid) | N | N | One-off |
| `/about` | About | N (gradient section) | N | N | N | 4-card values grid | N | N | One-off |
| `/contact` | Contact | N (gradient section) | N | N | N | N | N | N | One-off |
| `/shop` | Shop index | N (gradient section) | N | N | N | N | 3-cat cards | N | Generator candidate |
| `/shop/woven` | Woven goods | N (gradient section) | N | N | N | N | 6-product grid | N | Generator candidate |
| `/shop/alcaca` | Alcaca fertiliser | N (gradient section) | N | N | N | N | 3-product grid | N | Generator candidate |
| `/shop/commission` | Commission | N (gradient section) | N | N | N | N | N | N | One-off (form page) |
| `/gifts` | Gift vouchers | Y | N | Y | N | N | N | N | Generator candidate |
| `/experiences/corporate-team-building` | Corporate | Y | Y (5 items) | Y | Y | 4-feature grid | N | N | Generator candidate |
| `/experiences/family-farm-days` | Family | Y | Y (3 items) | Y | N | N | N | N | Generator candidate |
| `/experiences/romantic-sunset` | Romantic | Y | N | N | N | 3-col icon grid | N | N | Generator candidate (stub) |
| `/privacy` | Privacy | Y | N | N | N | N | N | Y (sections + lists) | Generator candidate |
| `/terms` | Terms | Y | N | N | N | N | N | Y (sections + lists) | Generator candidate |
| `/cookies` | Cookies | Y | N | N | N | N | N | Y (sections + lists) | Generator candidate |

---

## Pattern Analysis

### Pattern 1: Experience Page (STRONGEST candidate)

Present in: `corporate-team-building`, `family-farm-days`, `romantic-sunset`, and implicitly `tours` (same arc).

Shared structure:
1. `generateMetadata` block — hardcoded strings with OG image, canonical URL, title, description
2. Inline `faqItems` array
3. Inline `schemas` array (localBusinessSchema + faqPageSchema)
4. JSON-LD script blocks (pattern repeated identically across all 3)
5. `<Hero title subtitle cta backgroundImage />`
6. `<section>` booking calendar block — identical markup in corporate and family (copy-paste diff: title string only)
7. Content sections (unique per page but same section skeleton: `py-16 px-4 bg-X`, `max-w-4xl mx-auto`)
8. CTA Banner section — `bg-[#556B2F] text-white text-center` (corporate only, but identical shape)
9. `<FAQ items={faqItems} />`

`romantic-sunset` is a stub (missing metadata, missing FAQ, placeholder image) — a clear sign the page was never scaffolded consistently.

**Factory shape:** `ExperiencePageFactory(config)` where config carries:
```
slug, heroImage, metaTitle, metaDescription, ogImage,
faqItems[], features[], ctaBanner?, bookingCalendar: boolean,
itinerary?: { items[] }, gallery?: { images[] }
```

### Pattern 2: Shop Sub-Page (product grid pages)

Present in: `shop/woven`, `shop/alcaca` (and partially `shop` index).

Shared structure:
1. Gradient hero section — `py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10` — identical in all 3
2. Product grid section — `py-16 md:py-24 px-4 bg-background`
3. Product items rendered from inline array with icon + title + price + CTA button

`woven` has 6 products, `alcaca` has 3 products + benefits block — same skeleton, different item count and one extra block. `commission` breaks the pattern (it's a form page).

**Factory shape:** `ShopProductPageFactory(config)` where config carries:
```
slug, pageTitle, subtitle, products[]: { title, price, icon, ctaLabel },
benefitsBlock?: { title, items[] }
```

### Pattern 3: Legal Page (privacy / terms / cookies)

All 3 share an identical outer shell:
1. `<Hero title subtitle />` (no CTA, no background image)
2. `<section className="w-full py-16 md:py-24 px-4 bg-background">`
3. `<div className="max-w-4xl mx-auto prose prose-lg ...">`
4. Sections rendered as `translate('X.sectionNTitle')` + `translate('X.sectionNIntro')` + `translateArray('X.sectionNItems')` — the only difference is the translation namespace prefix and the number of sections.

This is the clearest mechanical duplication: 3 files with near-identical code, differing only in the translation key prefix and section count.

**Factory shape:** `LegalPageFactory(config)` where config carries:
```
namespace, sections[]: { titleKey, introKey?, itemsKey?, textKey?, type: 'text'|'list'|'subheaders' }
```

---

## Summary Table

| Generator | Pages covered | Lines saved (est.) | Priority |
|-----------|-------------|-------------------|----------|
| `ExperiencePageFactory` | corporate, family, romantic + future experiences | ~300 lines/page | HIGH — romantic stub broken |
| `LegalPageFactory` | privacy, terms, cookies | ~60 lines/page, near-zero divergence | HIGH — trivial win |
| `ShopProductPageFactory` | woven, alcaca + future products | ~50 lines/page | MEDIUM |

### What Does NOT Need a Generator

| Page | Reason |
|------|--------|
| Home (`/`) | Orchestrator page — unique composition of every component |
| About | Unique narrative structure, no repeating sibling |
| Contact | Unique (form + info layout), no sibling |
| Alpacas | Data-driven grid from `lib/data/alpacas` — already correctly data-driven |
| Commission | Form-only page, no siblings |

---

## Findings: No Page Template System Exists

The project has no `PageShell`, no `UniversalPageRenderer`, no slot pattern. Every page manually wires layout sections. The locale layout provides the nav/footer shell but nothing more.

The booking calendar section (`py-12 md:py-16 px-4 bg-[#F9F9F9]`) is copy-pasted verbatim between `corporate-team-building` and `family-farm-days` — the only diff is the `title` string passed to `translate()`. This is a concrete hardcoding issue.

Color tokens are inconsistently applied: experience pages use hardcoded hex (`#556B2F`, `#708090`, `#F5F5DC`) while shop and about pages use Tailwind design tokens (`text-foreground`, `bg-background`). A generator would enforce token usage.

---

## Suggested Next Steps

1. **Implement `LegalPageFactory` first** — highest mechanical repetition, lowest risk, 3 pages → 1 generator + 3 config files.
2. **Implement `ExperiencePageFactory`** — fixes the broken romantic stub, enforces consistent metadata + JSON-LD injection, adds any future experience (weddings, school trips) in minutes.
3. **Implement `ShopProductPageFactory`** — enables new product categories without new files.
4. **Consider a `BookingSection` component** — extract the copy-pasted FareHarbor calendar block (identical in corporate, family, gifts, tours) into a single parameterised component.
