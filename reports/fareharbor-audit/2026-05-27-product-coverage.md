# FareHarbor Product Coverage Audit
**Date:** 2026-05-27
**Sources:** live-site nav (sa-001-2026-05-26-live-site.md), lib/config.ts, app/[locale] route tree, .env.local.example

---

## Coverage Matrix

| # | Product | Live URL / Nav | Alpaca Route | Env Var in config.ts | CTA Wired | Status |
|---|---|---|---|---|---|---|
| 1 | Meet the Herd tour | Activiteiten → (tours hub) | `/tours` (card) | `FAREHARBOR_ITEM_TOUR_MEET_HERD` | `getFareHarborTourUrl('meet-herd')` — fail-open | GREEN |
| 2 | Weaving Workshop tour (1-session) | Activiteiten → (tours hub) | `/tours` (card) | `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP` | `getFareHarborTourUrl('weaving-workshop')` — fail-open | GREEN |
| 3 | Farm Experience tour | Activiteiten → (tours hub) | `/tours` (card) | `FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE` | `getFareHarborTourUrl('farm-experience')` — fail-open | GREEN |
| 4 | Photo Session tour | Activiteiten → (tours hub) | `/tours` (card) | `FAREHARBOR_ITEM_TOUR_PHOTO_SESSION` | `getFareHarborTourUrl('photo-session')` — fail-open | GREEN |
| 5 | Alpaca Yoga | Activiteiten → Alpaca yoga | `/yoga` (full page) | `FAREHARBOR_ITEM_YOGA` | `getFareHarborItemUrl(FAREHARBOR_ITEM_YOGA)` — fail-open | GREEN |
| 6 | Gift Cards / Vouchers | (no explicit live nav item found; implied by FH gift card feature) | `/gifts` (full page) | `FAREHARBOR_ITEM_GIFT_CARD` | `getFareHarborGiftCardUrl()` — fail-open | GREEN |
| 7 | Weddings | Activiteiten → Weddings & Photoshoots | `/weddings` (full page) | `FAREHARBOR_ITEM_WEDDINGS` exists in config.ts | CTA uses `FAREHARBOR_BOOKING_URL` (generic). FAREHARBOR_ITEM_WEDDINGS imported in comment only — NOT wired into the CTA yet | YELLOW |
| 8 | Photoshoots (editorial/commercial — separate from wedding context) | Activiteiten → Weddings & Photoshoots | No dedicated route. Weddings page covers both, but no standalone `/photoshoots` page | `FAREHARBOR_ITEM_PHOTOSHOOTS` exists in config.ts | Not wired to any CTA | YELLOW |
| 9 | Business Incentives / Brainstormsessies | Activiteiten → Business incentives & brainstormsessies | No dedicated route. `/experiences/corporate-team-building` is closest analogue | `FAREHARBOR_ITEM_BUSINESS_INCENTIVES` exists in config.ts | Corporate page uses `contact` link only (no FH calendar item filter). FAREHARBOR_ITEM_BUSINESS_INCENTIVES not imported by any page | YELLOW |
| 10 | 2-Day Weaving + Spinning Workshop (off-season, with San) | Informatie weaving / Wishfulfilling weaving | `/workshops` (full page) | No env var slot — on-request only, no FareHarbor calendar needed by design | CTA → `/contact?subject=Workshop inquiry` — intentional (not FH bookable) | GREEN (intentional no-FH) |
| 11 | Adopt-a-Paca | Activiteiten → Adopt a paca | `/adopt` (full page) | Stripe / Mollie / Mailto (NOT FareHarbor) — `PAYMENT_VENDOR`, `STRIPE_*`, `MOLLIE_*` | `getPaymentAdapter().buildAdoptCheckoutUrl()` — fail-open to mailto | GREEN (Stripe/Mollie, not FH) |
| 12 | Romantic Sunset Tour | Not in live nav — redesign-originated | `/experiences/romantic-sunset` (full page) | `FAREHARBOR_ITEM_ROMANTIC_SUNSET` — referenced in page comment only, NOT declared in config.ts, NOT in .env.local.example | CTA is hardcoded `mailto:` — FH wiring explicitly deferred (OWNER_INPUT_NEEDED comment) | RED |
| 13 | Family Farm Days | Not in live nav — redesign-originated | `/experiences/family-farm-days` (full page) | No env var slot | CTA uses hardcoded `https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes` (not using FAREHARBOR_BOOKING_URL from config) | YELLOW |
| 14 | Alcaca shop items | Activiteiten → Alcaca (alcaca in nav) | `/shop/alcaca` | `FAREHARBOR_ITEM_ALCACA` | `getFareHarborCategoryUrl('alcaca')` | GREEN |
| 15 | Woven items shop | Wishfulfilling weaving → Onze collectie | `/shop/woven` | `FAREHARBOR_ITEM_WOVEN` | `getFareHarborCategoryUrl('woven')` | GREEN |
| 16 | Commission weaving | Wishfulfilling weaving | `/shop/commission` | `FAREHARBOR_ITEM_COMMISSION` | `getFareHarborCategoryUrl('commission')` | GREEN |

---

## Status Summary

| Status | Count | Products |
|---|---|---|
| GREEN | 9 | Tours ×4, Yoga, Gift Cards, Workshops (no-FH by design), Adopt-a-Paca (Stripe/Mollie), Alcaca, Woven, Commission |
| YELLOW | 4 | Weddings (env var exists, CTA not wired), Photoshoots (env var exists, no page), Business Incentives (env var exists, not imported), Family Farm Days (hardcoded URL, no env var) |
| RED | 1 | Romantic Sunset (env var not declared anywhere, CTA is mailto only) |

**Total products inventoried: 16**
(including 3 shop categories; excluding Adopt-a-Paca from FareHarbor count since it uses Stripe/Mollie)

---

## Top 3 Gaps

### Gap 1 — Romantic Sunset: env var completely missing from config.ts and .env.local.example
`FAREHARBOR_ITEM_ROMANTIC_SUNSET` is referenced by name in a comment in `app/[locale]/experiences/romantic-sunset/page.tsx` line 127, but is never declared in `lib/config.ts` or documented in `.env.local.example`. CTA is a hardcoded `mailto:` with no fail-open fallback to FareHarbor. When the owner creates this FH item, there is no slot to drop the ID into — the page needs a code change.

**Fix required:** Add `export const FAREHARBOR_ITEM_ROMANTIC_SUNSET = process.env.FAREHARBOR_ITEM_ROMANTIC_SUNSET` to `lib/config.ts`, add entry to `.env.local.example`, and wire `getFareHarborItemUrl(FAREHARBOR_ITEM_ROMANTIC_SUNSET)` as the CTA href.

### Gap 2 — Weddings: env var declared but not imported or used in the CTA
`FAREHARBOR_ITEM_WEDDINGS` exists in `lib/config.ts` line 91 and even appears in a comment in `app/[locale]/weddings/page.tsx` line 200, but the page imports only `FAREHARBOR_BOOKING_URL` (the generic calendar). The primary CTA points at `FAREHARBOR_BOOKING_URL` — a general FareHarbor calendar, not a wedding-specific item. Once the owner creates a FH wedding item, this cannot be activated without a code import change.

**Fix required:** Import `FAREHARBOR_ITEM_WEDDINGS` and `getFareHarborItemUrl` in `weddings/page.tsx`, replace `FAREHARBOR_BOOKING_URL` with `getFareHarborItemUrl(FAREHARBOR_ITEM_WEDDINGS)`.

### Gap 3 — Business Incentives: env var declared but no page consumes it
`FAREHARBOR_ITEM_BUSINESS_INCENTIVES` exists in `lib/config.ts` line 93. The closest page is `/experiences/corporate-team-building`, which has a `FareHarborCalendar` component (unfiltered, shows all items) and a `contact` link as primary CTA. The `FAREHARBOR_ITEM_BUSINESS_INCENTIVES` var is never imported by any page. The live site nav label is "Business incentives & brainstormsessies" — this is a named live revenue line that has no dedicated filtered booking path.

**Fix required (two options):** (a) Import and use `FAREHARBOR_ITEM_BUSINESS_INCENTIVES` in `corporate-team-building/page.tsx` to filter the embedded `FareHarborCalendar`, OR (b) create a dedicated `/experiences/business-incentives` page if the owner wants it fully separated from corporate team building.

---

## Secondary Gaps (lower priority)

**Photoshoots (standalone editorial/commercial):** `FAREHARBOR_ITEM_PHOTOSHOOTS` is in config.ts but there is no dedicated `/photoshoots` page. The weddings page covers "Weddings & Photoshoots" together, which mirrors the live site nav grouping. If the owner wants to sell editorial/commercial photoshoots as a standalone product (separate from weddings), a new page is needed.

**Family Farm Days — hardcoded URL:** `app/[locale]/experiences/family-farm-days/page.tsx` line 92 hardcodes `https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes` directly in the Hero CTA instead of using `FAREHARBOR_BOOKING_URL` from `lib/config.ts`. This is not wrong (same URL) but breaks the single-source-of-truth pattern — if the shortname ever changes, this page won't update automatically.

---

## CAN'T DO WITHOUT OWNER

Every `FAREHARBOR_ITEM_*` env var requires the owner to:
1. Log in to FareHarbor admin.
2. Navigate to Items (or Items → Gift Cards for gift cards).
3. Find or create the product.
4. Copy the numeric item ID.
5. Paste it into `.env.local` (or the deploy platform's env panel).

Until these IDs are set, all CTAs fail-open to the general FareHarbor calendar (`https://fareharbor.com/embeds/book/alpacasibiza/?full-items=yes`) — no booking path is ever inert, but filtering is missing.

**Items that need IDs from owner before launch:**
- `FAREHARBOR_ITEM_TOUR_MEET_HERD`
- `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP`
- `FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE`
- `FAREHARBOR_ITEM_TOUR_PHOTO_SESSION`
- `FAREHARBOR_ITEM_YOGA`
- `FAREHARBOR_ITEM_GIFT_CARD`
- `FAREHARBOR_ITEM_WEDDINGS` (after code fix above)
- `FAREHARBOR_ITEM_PHOTOSHOOTS` (after page is created or merged into weddings page)
- `FAREHARBOR_ITEM_BUSINESS_INCENTIVES` (after code fix above)
- `FAREHARBOR_ITEM_ROMANTIC_SUNSET` (after config.ts + page fix above)
