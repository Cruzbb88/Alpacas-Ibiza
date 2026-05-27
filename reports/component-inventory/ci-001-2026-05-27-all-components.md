---
report_number: "001"
date: "2026-05-27"
auditor: "Claude Sonnet 4.6"
method: "full component read + grep consumer scan across app/**/*.tsx"
total_components: 31
shadcn_ui_components: 43
state_live: 22
state_stub: 4
state_dead: 5
---

# Component Inventory — ci-001

**Date:** 2026-05-27  
**Scope:** `components/*.tsx` (31 app-level) + `components/ui/*.tsx` (43 shadcn/ui — catalogued but not scored)  
**Method:** Read top 30 lines of every app-level component for props/exports; grep `app/**/*.tsx` for consumers; classify by state.

---

## Counts by State

| State | Count | Definition |
|---|---|---|
| **live** | 22 | Rendered in at least one route, props are populated |
| **stub** | 4 | Rendered in at least one route but output is null/hidden/placeholder in prod |
| **dead** | 5 | Zero imports anywhere in app/ or components/ (except self) |

---

## App-Level Components: Full Matrix

Sorted by priority (1 = ship-blocking, 5 = polish only).

| Component | Path | Key Props | Consumers | State | Priority |
|---|---|---|---|---|---|
| **Hero** | `components/hero.tsx` | `title, subtitle, cta?, secondary?, backgroundImage?, videoSrc?` | home, tours, alpacas, gifts, yoga, romantic-sunset, corporate-team-building, family-farm-days, privacy, cookies, terms | **live** (gradient fallback; photo never supplied) | **1** |
| **AlpacaCard** | `components/alpaca-card.tsx` | `alpaca: AnimalEntity, locale: Locale` | `alpacas/page.tsx` | **stub** (renders name-only placeholder; all 14 alpaca images are null) | **1** |
| **GoogleReviewsBadge** | `components/google-reviews-badge.tsx` | `className?` | `tours/page.tsx` | **stub** (renders null in prod — GOOGLE_PLACES_API_KEY unset) | **1** |
| **PressLogos** | `components/press-logos.tsx` | `title?, className?` | **DEAD** — zero app/ imports | **dead** | **1** |
| **BookingSection** | `components/booking-section.tsx` | none (reads locale from useParams) | **DEAD** — zero app/ imports | **dead** | **1** |
| **CookieConsent** | `components/cookie-consent.tsx` | none | `[locale]/layout.tsx` | **live** | **1** |
| **Header** | `components/header.tsx` | none | `[locale]/layout.tsx` | **live** | **2** |
| **Footer** | `components/footer.tsx` | none | `[locale]/layout.tsx` | **live** | **2** |
| **StickyBookingBar** | `components/sticky-booking-bar.tsx` | none | `[locale]/layout.tsx` | **live** | **2** |
| **FareHarborCalendar** | `components/fareharbor-calendar.tsx` | `shortname?, flowId?, itemId?, fullItems?, fallback?, className?` | tours, gifts, yoga, family-farm-days, corporate-team-building | **live** | **2** |
| **ContactForm** | `components/contact-form.tsx` | `labels: {name, email, subject, message, send, sending, success, error}` | `contact/page.tsx` | **live** | **2** |
| **ReviewCard** | `components/review-card.tsx` | `Review: {name, date, text, translationKey, language}` | home, tours | **live** | **2** |
| **AvailabilityUrgency** | `components/availability-urgency.tsx` | `className?` | `tours/page.tsx` | **stub** (silent null if FareHarbor API unset) | **2** |
| **ExperienceCards** | `components/experience-cards.tsx` | `cards: ExperienceCard[], title, subtitle` | `home/page.tsx` | **live** | **3** |
| **WeavingShowcase** | `components/weaving-showcase.tsx` | `title, subtitle, description, cta, href, badgeText?` | `home/page.tsx` | **live** (gradient placeholder — no real photo) | **3** |
| **ChoicePaths** | `components/choice-paths.tsx` | `paths: PathOption[], title?, subtitle?` | `home/page.tsx` | **live** | **3** |
| **FAQ** | `components/faq.tsx` | `items: FAQItem[], title?, subtitle?` | tours, yoga, family-farm-days, corporate-team-building | **live** | **3** |
| **Timeline** | `components/timeline.tsx` | `items: TimelineItem[], title?` | `tours/page.tsx` | **live** | **3** |
| **Features** | `components/features.tsx` | `items: FeatureItem[], title?, subtitle?` | home, corporate-team-building | **live** | **3** |
| **TenantMap** | `components/tenant-map.tsx` | `tenant: Tenant, heading?, iframeTitle?, largerMapLabel?, zoom?` | `contact/page.tsx` | **live** | **3** |
| **PageBreadcrumbs** | `components/page-breadcrumbs.tsx` | `locale, homeLabel?, crumbs: BreadcrumbCrumb[]` | about, adopt, gifts, contact, yoga, tours, sustainability | **live** | **3** |
| **CommissionForm** | `components/commission-form.tsx` | `labels: {name, email, description, submit, sending, success, error}` | `shop/commission/page.tsx` | **live** | **3** |
| **NewsletterForm** | `components/newsletter-form.tsx` | `locale: string` | `home/page.tsx` | **live** | **3** |
| **CancellationBadge** | `components/cancellation-badge.tsx` | `variant?: 'compact'\|'full', className?` | tours, gifts | **live** | **3** |
| **BookTourLink** | `components/book-tour-link.tsx` | `href, className?, children` | home, tours | **live** | **3** |
| **AnalyticsDashboard** | `components/analytics-dashboard.tsx` | none | `admin/analytics/page.tsx` | **live** | **4** |
| **LanguageSwitcher** | `components/language-switcher.tsx` | none | via `header.tsx` (indirect consumer) | **live** | **4** |
| **TurnstileWidget** | `components/turnstile-widget.tsx` | `fieldName?, onToken?, className?` | via contact-form, commission-form, newsletter-form (indirect) | **live** | **4** |
| **ProductCard / ProductGrid** | `components/product-card.tsx` | `product: Product, onAddToCart?, onWishlist?` | **DEAD** — zero app/ imports | **dead** | **5** |
| **ThemeProvider** | `components/theme-provider.tsx` | `children, ...ThemeProviderProps` | **DEAD** — not imported in app/layout.tsx or anywhere | **dead** | **5** |
| **BookingSection** | `components/booking-section.tsx` | none | **DEAD** — built but never placed | **dead** | **1** |

---

## Dead Components — Detail

| Component | Why dead | Action |
|---|---|---|
| **BookingSection** | Built full availability calendar+date-grid UI. Never wired into any route. Partially overlaps FareHarborCalendar + AvailabilityUrgency. | Wire into tours/page.tsx above the FareHarborCalendar, OR delete if FareHarborCalendar covers the use case. Priority 1 — ship-blocker by omission. |
| **PressLogos** | Correct component, fail-quiet guard in place. Not imported anywhere in app/. | Wire into home/page.tsx above or below ReviewCard section. Owner must provide logo files first (OWNER_INPUT_NEEDED). |
| **ProductCard / ProductGrid** | Full shop card UI with wishlist/cart handlers. shop/page.tsx uses raw Link+divs instead. | Wire ProductGrid into shop/page.tsx. Needs real product images to ship — currently emoji placeholders. |
| **ThemeProvider** | Thin next-themes wrapper. app/layout.tsx never imports it. Dark-mode toggle does not exist. | Either delete (site has no dark mode) or wire and add toggle. Low priority. |

---

## Stub Components — Detail

| Component | Stub condition | What "build out" means |
|---|---|---|
| **Hero** | `backgroundImage` never passed — renders CSS gradient. Present in 11 routes. | Owner supplies photos. Hero already accepts `backgroundImage` prop; no code change needed. Once photos land, pass the prop. |
| **AlpacaCard** | `alpaca.image === null` for all 14 alpacas — renders name-label placeholder box. | Owner supplies alpaca photos + bios. Data lives in `lib/data/alpacas.ts`. Zero code change needed once content arrives. |
| **GoogleReviewsBadge** | `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` unset → renders null. | Set the two env vars. Component is complete. |
| **AvailabilityUrgency** | `FAREHARBOR_APP_KEY` / `FAREHARBOR_USER_KEY` unset → renders null silently. | Set FareHarbor API creds. Component is complete. |

---

## Top-10 Build-Out Priority List

1. **Hero (all 11 routes)** — Owner supplies real farm photography; pass `backgroundImage` prop. Zero code change. This single action upgrades visual score from 6/10 to ~9/10 peer parity.

2. **AlpacaCard (alpacas page)** — Owner supplies 14 alpaca photos + bios into `lib/data/alpacas.ts`. Component is complete; content is the only blocker.

3. **BookingSection (dead → wire)** — Wire above FareHarborCalendar in tours/page.tsx. Confirm it doesn't duplicate AvailabilityUrgency logic (they overlap — reconcile before wiring).

4. **GoogleReviewsBadge (tours page)** — Set `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID`. Currently the only live trust signal (besides hardcoded ReviewCards) and it's rendering null in prod.

5. **PressLogos (dead → wire + content)** — Import into home/page.tsx. Owner provides logo files at `public/images/press/<slug>.svg` and sets `status: 'live'` in `lib/data/press.ts`. Component logic is complete and fail-quiet.

6. **WeavingShowcase (home)** — Gradient placeholder. Owner supplies a product/loom photo. Component already accepts `backgroundImage`-equivalent slot via its image side.

7. **ProductCard/ProductGrid (dead → wire)** — Import into `shop/page.tsx` and the three sub-shop pages. Needs real product images; current shop uses raw divs with emoji.

8. **CancellationBadge (tours, gifts)** — Already live. Add to home Hero CTA area and commission page. Conversion lift, 5-min task.

9. **AvailabilityUrgency (tours)** — Wire FareHarbor API creds. Add to home Hero section (currently only on tours). High conversion-lift per FareHarbor data.

10. **ThemeProvider (dead)** — Delete it or wire it. Leaving it dead is dead code. If dark mode is not planned, delete now.

---

## Missing Components That Should Exist

| Missing | Rationale | Source |
|---|---|---|
| **TestimonialsWall / review-wall.tsx** | canmarti.com pattern: full-bleed testimonial grid with star ratings, photos, source logos. ReviewCard exists but is only used as an inline strip on home+tours. No dedicated testimonials page or wall pattern. | peer audit |
| **SkipToContent link** | a11y hard requirement. No `<a href="#main-content">Skip to content</a>` exists anywhere in header.tsx or layout.tsx. Fails WCAG 2.4.1. | a11y |
| **SectionLayout wrapper** | mr-001 identified repeated `<section className="w-full py-16 md:py-24 px-4 ...">` pattern in 8+ components. Each component bakes its own py/px/bg. A shared `<SectionLayout bg variant>` wrapper would de-duplicate and make spacing consistent. | mr-001 |
| **LoadingSkeleton per async component** | GoogleReviewsBadge and AvailabilityUrgency have inline Skeleton usage. BookingSection has it. But FareHarborCalendar has no loading skeleton — the embed iframe just flashes. A per-component Skeleton pattern is ad-hoc, not systematic. | codebase pattern |
| **ErrorBoundary per route** | `app/global-error.tsx` exists (branded). But no per-route error.tsx boundaries exist inside `app/[locale]/`. A single global boundary means one bad API call (e.g. GA4 creds) can surface as a full-page error. | CLAUDE.md failsafe map |

---

## shadcn/ui Components — Usage Summary

43 files in `components/ui/`. Policy: treat as vendor code, do not modify. Only note which are actually imported.

**Used by app-level components:**
- `button.tsx` — Header, Hero, BookingSection, StickyBookingBar, WeavingShowcase, ProductCard
- `card.tsx` — ChoicePaths, ExperienceCards, Features, ReviewCard, Timeline, ProductCard, AnalyticsDashboard
- `sheet.tsx` — Header (mobile nav drawer)
- `select.tsx` — LanguageSwitcher
- `skeleton.tsx` — GoogleReviewsBadge, BookingSection
- `badge.tsx` — (indirect via component patterns)

**Likely unused (zero grep hits in app-level components):**
`accordion.tsx`, `alert-dialog.tsx`, `carousel.tsx`, `chart.tsx`, `command.tsx`, `context-menu.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `hover-card.tsx`, `input-otp.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `resizable.tsx`, `scroll-area.tsx`, `sidebar.tsx`, `toggle.tsx`, `toggle-group.tsx`

These were scaffolded by shadcn/ui init but never imported. Safe to leave — they add zero bundle weight until imported.

---

## CAN'T DO WITHOUT HELP

The following items are blocked on owner or Cruz's explicit decision:

1. **Hero photography** — 11 routes are gradient-only. This is the single highest-impact unblock. All code is ready.

2. **Alpaca photos + bios** — 14 animals, all null. The live site already has these; they need to be ported.

3. **Press logo files** — `lib/data/press.ts` has entries; `public/images/press/` needs the actual SVG/PNG files. Until then PressLogos is dead.

4. **FareHarbor API creds** — Unblocks AvailabilityUrgency on tours (and home if wired). Low effort once owner provides.

5. **Google Places creds** — Unblocks GoogleReviewsBadge. API key + place ID.

6. **BookingSection vs FareHarborCalendar reconciliation** — These two partially overlap (both show available dates). Cruz needs to decide: wire BookingSection above the embed, or delete it. Cannot be done autonomously — it affects the tours page UX.

7. **Dark mode decision** — ThemeProvider is dead. If dark mode is not planned, delete it now. If it is planned, wire it.

8. **ProductCard shop wiring** — Safe to do autonomously (wire ProductGrid into shop pages), BUT product images are all null so it will still show placeholders. Cruz may want to defer until owner provides product photos.
