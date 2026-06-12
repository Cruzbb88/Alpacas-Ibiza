# Page-Level Fabrication Audit — 2026-06-09

## Per-page findings

### app/[locale]/experiences/page.tsx
- Line 33 (metadata description): `"90-minute farm tours"` → INVENTED. FareHarbor states 1 hour, not 90 min. Recommend: `"1-hour farm tours"`
- Line 65: `duration: '1 hour'` → REAL (FareHarbor, corrected 2026-06-06)
- Line 85: `duration: '1.5 hr'` → REAL (FareHarbor yoga)
- Line 105: `duration: '3 hours'` (workshops) → UNSOURCED. Only "2-day" is verified. Recommend: UNMAPPED/owner confirm.
- Line 106: `groupSize: 'Up to 8'` (workshops) → UNSOURCED. No verified group cap. Recommend: UNMAPPED.
- Lines 113–116 (workshops includes): `"Refreshments + farm tour included"` → UNSOURCED. Recommend: remove or OWNER_INPUT.
- Line 125: `duration: '2 hours'` (romantic-sunset) → UNSOURCED. No verified duration.
- Line 126: `groupSize: '2 guests'` (romantic-sunset) → UNSOURCED.
- Line 131–135 (romantic includes): `"Glass of cava + tapas board"`, `"Professional photographer for 30 minutes"`, `"Digital photo download"` → ALL UNSOURCED/INVENTED. High danger.
- Line 144: `duration: 'Half day'` (family-farm-days) → UNSOURCED.
- Line 148–153 (family includes): `"Mini weaving demo for kids"`, `"Farm-fresh snacks"` → UNSOURCED/INVENTED.
- Line 164: `groupSize: 'Up to 80'` (weddings) → UNSOURCED.
- Lines 167–172 (weddings includes): `"Catering coordination"`, `"Bespoke alpaca-themed favours"` → UNSOURCED.
- Lines 186–191 (corporate includes): `"Lunch + coffee breaks"`, `"Branded photography"` → UNSOURCED (itinerary in i18n backs this partially but is also fabricated — see below).
- Line 180: `duration: 'Half / full day'` (corporate) → UNSOURCED.
- Line 181: `groupSize: 'Up to 30'` (corporate) → UNSOURCED (FAQ on that page says "5 to 40").

### app/[locale]/experiences/romantic-sunset/page.tsx
- Lines 24, 29 (metadata): `"cava, tapas, and a professional photographer included"` → INVENTED. No FareHarbor or owner source.
- Lines 73–80 (three feature boxes): driven by i18n keys `romantic.champagne`, `romantic.photos`, `romantic.privacy`. See translations/en.json line 586–596 below.

### app/[locale]/experiences/corporate-team-building/page.tsx
- Lines 53–57 (hardcoded FAQ answer): `"Standard packages include welcome refreshments, guided alpaca interaction, a team challenge activity, and an organic farm lunch."` → INVENTED. "Organic farm lunch" has no source.
- Lines 53–57 (FAQ): `"Weaving workshops, photography, and custom add-ons are available."` → UNSOURCED inclusions.
- Line 128–129: `"we'll send a tailored proposal within 48 hours"` → UNSOURCED SLA. Recommend: UNMAPPED.
- Itinerary via i18n (corporate.itinerary.item1–4): See translations/en.json lines 551–570 — fabricated timed agenda (10:00 AM–1:00 PM) with "Coffee, tea, and local pastries", "organic, locally sourced picnic lunch under the carob trees". NO SOURCE for any time, food, or carob trees.

### app/[locale]/tours/page.tsx
- Lines 60–62: Comment confirms prior fabrication (4 tour types, all-day timeline) was removed 2026-06-06. Page itself is CLEAN of hard-coded fabrications.
- Reviews (lines 327–369): Named real guests with real text sourced from Facebook; appear genuine.
- CLEAN.

### app/[locale]/yoga/page.tsx
- Line 46–48 (yogaActivitySchema): `postalCode: '07819'` and `streetAddress: 'San Carlos'` → postalCode UNSOURCED; San Carlos is an area name not a street address.
- Line 49: structured data description says `"1.5 hours"` — REAL per FareHarbor. However line 1321 of translations says `"A 90-minute outdoor Hatha yoga"` → 90 min ≠ 1.5 hr (1h15 on live site, 1.5h on FareHarbor). Inconsistency; needs owner confirm which is correct.
- MOSTLY CLEAN with above caveats.

### app/[locale]/weddings/page.tsx
- CLEAN — all specific claims marked `[OWNER_INPUT_NEEDED]`; no invented prices, durations, or inclusions rendered in production.

### app/[locale]/workshops/page.tsx
- CLEAN — all prices, group sizes, specific months, meals show "Contact for pricing" or are deferred via i18n keys marked UNMAPPED.

### app/[locale]/about/page.tsx
- Line 47: founder name `'San De Wilde'` — confirmed real (translations/en.json line 795: "Sandra De Wilde").
- CLEAN — no invented bios; all content via i18n keys which should be audited separately.

### app/[locale]/contact/page.tsx
- Lines 22–23 (metadata): `"Visit our farm in San Carlos, Ibiza"` — San Carlos is an area, not a street address with number; acceptable and matches live site.
- Line 111: hardcoded `"Ibiza, Spain"` — generic, acceptable.
- Line 122–124: phone `+32475586544` — appears to be a Belgian number; live contact from tenant config. Needs owner confirmation it is current.
- MOSTLY CLEAN.

### app/[locale]/sustainability/page.tsx
- Line 13: comment flags `"6-hectare"` (draft copy) as UNCONFIRMED. That text does not appear to render in production (only in the OwnerConfirmBanner dev-only block).
- CLEAN in production — UNMAPPED flags properly guarded.

### app/[locale]/press/page.tsx
- CLEAN — all entries render outlet names only; logos/articles show "coming soon" until owner supplies.

### app/[locale]/press-kit/page.tsx
- CLEAN — all download URLs are `null`/disabled. No invented facts. Founder bio PDF card description is a generic placeholder, not a real bio.

### app/[locale]/visit/page.tsx
- Line 59: `telephone: '+32475586544'` in JSON-LD — Belgian number, same as contact page; needs owner confirm.
- Lines 119, 129, 139, etc.: all direction/GPS content via i18n keys. Safe.
- MOSTLY CLEAN.

### app/[locale]/weaving/page.tsx
- Lines 106–114: `studioHistoryBody` rendered conditionally — in production this renders the i18n value. Translation line 1647: `"San fell in love with weaving in 2013. She started on small table looms, then invested in a traditional Swedish wooden loom from a 92-year-old master weaver who gave her private lessons and named the loom Big Ben."` — THIS IS SPECIFIC INVENTED BACKSTORY with unverifiable details: year (2013), "92-year-old master weaver", "Big Ben" as loom name, "private lessons". No source in FareHarbor or verified live site.
- DANGEROUS IN PRODUCTION.

### app/[locale]/shop/page.tsx
- Line 73: `description: 'Sponsor an alpaca\'s spring shearing — receive their spun wool in autumn. €200 · 14 slots/year.'` — €200 is real (SKEIN_PRICE_EUR default); 14 slots matches 14 alpacas; CLEAN.

### app/[locale]/shop/alcaca/page.tsx
- CLEAN — all prices show "price on request". Products are UNMAPPED as required.

### app/[locale]/shop/woven/page.tsx
- CLEAN — all prices are "price on request".

### app/[locale]/alpacas/page.tsx
- CLEAN — pulls from `lib/data/alpacas.ts` which has all bios as `null`.

### app/[locale]/alpacas/[slug]/page.tsx
- CLEAN — bios are null/UNMAPPED; birth dates for Bardot (2022-01-19), Chet (2020-11-20), Toots (2021-02-03) flagged "extracted from bio prose; owner to confirm exact day". LOW risk — dates extracted from existing prose, not invented.

### app/[locale]/media/page.tsx
- CLEAN — renders null/empty-state until owner populates.

---

## translations/en.json — Fabricated content rendering in production pages

These keys are rendered in production (not behind dev-only guards):

| Line | Key | Claimed | Status |
|------|-----|---------|--------|
| 215 | experiences.tour.oneLiner | "90-minute farm walk" | INVENTED — FareHarbor says 1 hour |
| 223 | experiences.romantic.oneLiner | "cava, tapas, and a photographer" | INVENTED — no source |
| 551–570 | corporate.itinerary.item1–4 | Timed agenda 10AM–1PM, "organic picnic lunch under the carob trees", "local pastries" | ALL INVENTED — no source |
| 569 | corporate.itinerary.item4.desc | "Organic, locally sourced picnic lunch under the carob trees" | INVENTED |
| 642 | family.faq.duration.a | "Family visits are typically 1.5 to 2 hours" | UNSOURCED |
| 796 | terms.art2Items | `"Address: C/3 Bungalow Park 22, 07850 San Carlos Baleares Spain"` | SUSPICIOUS — likely real legal address in terms of service; BUT unverified. High danger if wrong. |
| 797 | terms.art2Items | `"Telephone: +34 689 446 781"` | SUSPICIOUS — different number from contact page (+32 Belgian). Needs owner confirm. |
| 799 | terms.art2Items | `"VAT number: ESY6917111J"` | UNVERIFIED — legal claim. |
| 1191 | adopt.perks.photoshoot.desc | "An hour with your alpaca and our photographer. Digital downloads included." | INVENTED inclusion in adopt perks |
| 1321 | yoga.whatBody | "A 90-minute outdoor Hatha yoga session" | INCONSISTENT — FareHarbor says 1.5 hr; live site says 1h15 |
| 1647 | weaving.studioHistoryBody | "San fell in love with weaving in 2013… 92-year-old master weaver… loom named Big Ben" | INVENTED backstory — no source |

---

## Summary

- Pages clean: 12 (tours, weddings, workshops, about, press, press-kit, media, shop, shop/alcaca, shop/woven, alpacas, alpacas/[slug])
- Pages with INVENTED claims: 5 (experiences/index, experiences/romantic-sunset, experiences/corporate-team-building, yoga, weaving)
- Translation file fabrications rendering in production: 11 keys (see table above)
- Total distinct fabrications: ~24

---

## Top 10 Most Dangerous (customer-misleading, file:line)

1. **translations/en.json:796** — Terms page legal address `"C/3 Bungalow Park 22, 07850 San Carlos"` — if wrong, legally liable and misleads customers on refunds/complaints. Different from tenant config address.

2. **translations/en.json:797** — Terms page phone `"+34 689 446 781"` — differs from contact page `+32 475 58 65 44`. Two different phone numbers shown to customers; one is wrong.

3. **translations/en.json:799** — Terms page VAT `"ESY6917111J"` — UNVERIFIED legal identifier appearing in consumer contract.

4. **app/[locale]/experiences/page.tsx:131–135** — Romantic Sunset `includes` list: `"Glass of cava + tapas board"`, `"Professional photographer for 30 minutes"`, `"Digital photo download"` — customer books expecting these; none are sourced. Source: experiences/page.tsx lines 131–135.

5. **translations/en.json:223** — experiences.romantic.oneLiner `"cava, tapas, and a photographer"` — this one-liner appears in the experience comparison table seen by every visitor; sets false expectation for a product that may not exist.

6. **translations/en.json:551–570** — corporate.itinerary: full timed agenda (10AM–1PM) with `"organic, locally sourced picnic lunch under the carob trees"` rendered on the corporate team-building page. Customer books a corporate day expecting lunch; no source for this.

7. **app/[locale]/experiences/corporate-team-building/page.tsx:57** — Hardcoded FAQ answer: `"Standard packages include welcome refreshments, guided alpaca interaction, a team challenge activity, and an organic farm lunch."` — customer is told lunch is standard; no source.

8. **translations/en.json:1647** — weaving.studioHistoryBody rendered on `/weaving` in production: invented backstory with `"2013"`, `"92-year-old master weaver"`, `"Big Ben"` loom name — specific falsifiable claims about San's biography.

9. **translations/en.json:215** — experiences.tour.oneLiner `"90-minute farm walk"` — FareHarbor clearly states 1 hour. Shown in the comparison table visible to all visitors choosing experiences. Customer arrives expecting 90 minutes, gets 60.

10. **translations/en.json:1191** — adopt.perks.photoshoot.desc: `"An hour with your alpaca and our photographer. Digital downloads included."` — appears in the Adopt-a-Paca perks breakdown. Customer pays expecting a professional photoshoot perk that has no source.
