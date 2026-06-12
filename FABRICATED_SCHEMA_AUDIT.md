# Structured Data + Tenant Fabrication Audit — 2026-06-09

## lib/structured-data.ts findings

### `localBusinessSchema()` (lines 54–93)
- `telephone: '+32475586544'` → REAL (matches `tenant.phoneE164`; Belgian mobile, confirmed live site)
- `email: 'info@alpacasibiza.com'` → REAL (matches `tenant.contactEmail`)
- `priceRange: '€€'` → GENERIC (acceptable boilerplate)
- `currenciesAccepted: 'EUR'` → REAL
- `paymentAccepted: 'Cash, Credit Card'` → **FABRICATED** — no source confirms payment methods. FareHarbor handles bookings; cash-on-farm and specific card brands not verified anywhere in OWNER_INPUT_NEEDED or REALITY_CHECK.
- `address.streetAddress: 'San Carlos'` → **CONFLICT** — schema hardcodes `'San Carlos'` (locality, not a street); tenant `alpacasibiza.ts` has `'C/3 Bungalow Park 22'` as the real street address from the live-site scrape. Schema is wrong.
- `address.postalCode: '07819'` → **CONFLICT** — schema hardcodes `07819`; `alpacasibiza.ts` explicitly flags a postal code conflict (`07850` from live site /algemene-voorwaarden vs the stale `07819`). Schema uses the stale value. OWNER_INPUT_NEEDED: confirm correct code.
- `address.addressLocality: 'Santa Eulària des Riu'` → REAL
- `address.addressRegion: 'Islas Baleares'` → REAL (Spanish form; schema's own locale, ok)
- `geo.latitude: 38.9861, geo.longitude: 1.5228` → PLAUSIBLE but UNVERIFIED. The prompt note says Es Currals is ~38.997, 1.495. The emitted coords (38.9861, 1.5228) are ~1.5 km NE of that estimate and likely correspond to a nearby point, not the exact farm gate. No authoritative source (Google Maps pin, tenant GPS capture) is cited in any doc. **Flag as UNVERIFIED.**
- `openingHoursSpecification` → GENERIC/OK — emits "By appointment only" description with no specific hours, which is accurate per FareHarbor appointment model. No invented hours.
- `aggregateRating` → ABSENT (correctly suppressed — comment at line 88 explains policy compliance). CLEAN.

### `organizationSchema()` (lines 25–50)
- `contactPoint.telephone: '+32475586544'` → REAL (same as `phoneE164`)
- `contactPoint.availableLanguage: ['English', 'Dutch', 'German', 'Spanish', 'French', 'Italian']` → **FABRICATED** — no source in OWNER_INPUT_NEEDED, REALITY_CHECK, or tenant config confirms all 6 languages are actually spoken/supported. Dutch + English plausible (Belgian founders); German/Spanish/French/Italian are inventions.
- `sameAs` Instagram: `wishfulfillingweaving` → REAL (matches `tenant.social.instagramUrl` and confirmed live-site handle)
- `sameAs` Facebook: confirmed People URL → REAL
- `foundingDate` → **ABSENT** (correctly omitted). CLEAN.
- `numberOfEmployees` → **ABSENT** (correctly omitted). CLEAN.
- `awards` → **ABSENT** (correctly omitted; `lib/data/awards.ts` is empty). CLEAN.

### `touristTripSchema()` (lines 104–152)
- `price: '21.19'` → REAL (confirmed FareHarbor "Alpaca Tour · From €21.19", comment at line 101 documents the correction from €30)
- `priceCurrency: 'EUR'` → REAL
- `availability: InStock` → GENERIC/OK

### `yogaWeeklyEventSchema()` (lines 255–299)
- `price: '30'` → REAL (verified per comment "€30 per person, max 6 attendees")
- `description: '1 hour 15 minute Hatha yoga'` → REAL (comment: "Verified live data (REALITY_CHECK Tier 2)")
- `location.streetAddress: 'San Carlos'` → **SAME CONFLICT** as localBusinessSchema — same stale/wrong street value
- `location.postalCode: '07819'` → **SAME CONFLICT** — stale vs `07850` live-site value
- `performer` → ABSENT (correctly omitted as UNMAPPED). CLEAN.
- `startDate` → dynamically forward-rolled. CLEAN.

### `herdAttractionSchema()` (lines 415–435)
- 14 named alpacas in description → REAL (matches `alpacasibiza-content.ts` roster of 14)
- `address.streetAddress: 'San Carlos'` → **SAME CONFLICT** (3rd instance)
- `address.postalCode: '07819'` → **SAME CONFLICT** (3rd instance)

### `adoptAPacaServiceSchema()` (lines 443–491)
- `price: '75'` (monthly), `price: '900'` (yearly) → REAL (comment: VERIFICATION_RESULTS.md #10)

### `workshopHowToSchema()` (lines 384–406)
- `totalTime: 'P2D'` → REAL (2-day workshop, confirmed)
- `estimatedCost` → ABSENT (correctly omitted as UNMAPPED). CLEAN.

### `weddingsServiceSchema()` (lines 361–380)
- `offers` → ABSENT (correctly omitted as UNMAPPED). CLEAN.
- `areaServed: 'Ibiza, Spain'` → REAL.

### `personSchema()` — about page emission
- `name: 'San De Wilde'`, `role: 'Co-founder & owner'` → REAL (sourced from LIVE_SITE_CONTENT_INVENTORY.md)
- `name: 'Bart'` (no surname) → REAL but incomplete. No surname emitted; acceptable.

### `productSchema()` — per-page emissions
- `/skein`: `priceEur: SKEIN_SPONSORSHIP_PRICE_EUR` (€200 default) → REAL (confirmed constant, env-overridable for staging only)
- `/gifts`: `priceEur: 21.19` → REAL (matches tour base price)
- `/shop/alcaca`: `priceEur: 0` + `availability: 'InStock'` → **FABRICATED** — price is genuinely unknown (price-on-request), so `0.00` is a placeholder that Google will render as a €0.00 product. InStock is also unverified (seasonal product). Comment acknowledges the placeholder.
- `/shop/woven`: `priceEur: 0` + `availability: 'InStock'` → **FABRICATED** — same issue: price-on-request items emitting €0.00 and InStock to Google Rich Results.

---

## lib/tenants/alpacasibiza.ts findings

- `contactEmail: 'info@alpacasibiza.com'` → REAL
- `phoneE164: '+32475586544'` → REAL (confirmed; Belgian mobile per live-site)
- `whatsappE164: '+34689446781'` → REAL (sourced from live-site /algemene-voorwaarden, with OWNER_INPUT_NEEDED caveat)
- `cif: 'Y6917111J'` → PROVISIONALLY REAL (extracted from live site 2026-05-31; OWNER_INPUT_NEEDED flag present)
- `address.streetAddress: 'C/3 Bungalow Park 22'` → REAL (live-site scrape)
- `address.postalCode: '07850'` → CONFLICT FLAG (live site says 07850; prior value 07819 still hardcoded in structured-data.ts). Tenant has the more likely-correct value.
- `geo.latitude: 38.9861, geo.longitude: 1.5228` → UNVERIFIED (same coords as structured-data.ts; no authoritative source cited)
- `social.twitterHandle: null` → CLEAN (correctly UNMAPPED)
- `social.googleReviewUrl: null` → CLEAN (correctly UNMAPPED)
- `touristRegistration: null` → CLEAN
- `foodHandlingCert: null` → CLEAN
- `trustBadges: []` → CLEAN

---

## Per-page emission findings

- `app/[locale]/layout.tsx`: emits `localBusinessSchema` + `organizationSchema` + `websiteSearchSchema` + `siteNavigationSchema` on every page — inherits `paymentAccepted` fabrication and `availableLanguage` fabrication on every route.
- `app/[locale]/page.tsx` (homepage): emits `localBusinessSchema` — inherits address/postal/paymentAccepted issues.
- `app/[locale]/visit/page.tsx`: emits `visitPlaceSchema()` (inline, line 39–62) AND `localBusinessSchema()`. The inline `visitPlaceSchema` hardcodes `postalCode: '07819'` and `streetAddress: 'San Carlos'` — same stale values, **fourth and fifth instances**.
- `app/[locale]/tours/page.tsx`: emits `touristTripSchema` — price verified REAL.
- `app/[locale]/yoga/page.tsx`: emits `yogaWeeklyEventSchema` + `localBusinessSchema` — yoga price REAL; address conflict inherited.
- `app/[locale]/shop/alcaca/page.tsx`: emits `productSchema` with `priceEur: 0` — FABRICATED Rich Result.
- `app/[locale]/shop/woven/page.tsx`: emits `productSchema` with `priceEur: 0` — FABRICATED Rich Result.
- `app/[locale]/about/page.tsx`: emits founder `personSchema` — REAL names/roles.
- All other pages: inherit `localBusinessSchema` issues via layout or inline call; no additional fabrications found.

---

## Summary

| Category | Count |
|---|---|
| Schema functions audited | 13 |
| Tenant fields audited | 14 |
| Fabricated / unverified fields | 8 |
| Address/postal conflicts (same stale value, 5 locations) | 1 root cause, 5 instances |

### Fabrications ranked by Google SERP risk

1. **HIGH — `productSchema` `priceEur: 0` on `/shop/alcaca` and `/shop/woven`**: Google Product Rich Results will display "€0.00" for price-on-request items. This is actively misleading and will cause rich result policy violations.

2. **HIGH — `paymentAccepted: 'Cash, Credit Card'` in `localBusinessSchema`** (emitted on every page via layout): No source confirms these payment methods. Emitted to Google as authoritative fact about the business on every crawled URL.

3. **HIGH — `availableLanguage` 6-language list in `organizationSchema`** (emitted on every page via layout): Dutch + English plausible; German/Spanish/French/Italian are invented. Emitted as fact about customer-service capability.

4. **MEDIUM — `address.streetAddress: 'San Carlos'` + `postalCode: '07819'`** in `localBusinessSchema`, `yogaWeeklyEventSchema`, `herdAttractionSchema`, and the inline `visitPlaceSchema` (5 hardcoded locations): The street name is actually a locality; the real street is `C/3 Bungalow Park 22`. Postal code `07819` conflicts with live-site value `07850`. Tenant config has the correct values; structured-data.ts was never updated to read from tenant.

5. **MEDIUM — `geo` coordinates unverified**: `38.9861, 1.5228` appears in both `structured-data.ts` and `tenant.geo` but has no cited authoritative source (no Google Maps pin, no GPS reading). Risk: map pack shows wrong pin.

6. **LOW — `Bart` (no surname) in `personSchema`**: Structurally fine; Google may not surface a Person schema with no surname. Not fabricated, just incomplete.
