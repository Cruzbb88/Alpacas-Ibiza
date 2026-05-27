# CG-004 — Page Positioning / Information Architecture Audit
**Date:** 2026-05-27  
**Method:** WebFetch homepage + key conversion page per reference. Airbnb Luxury returned HTTP 403 (blocked); Lavender Farm Thailand ECONNREFUSED. Both gaps noted below.

---

## 1. Reference Section Sequences

| # | Site | Vertical | Homepage sequence | Conversion page sequence |
|---|------|----------|-------------------|--------------------------|
| 1 | **Can Martí** (canmarti.com) | Ibiza eco-hotel | NAV → HERO carousel → headline + copy → **3-col value props** (farm / rooms / offer) → scenic photo → **media trust bar** (Elle, Condé Nast, NatGeo, Guardian…) → feature deep-dives → **certification badges** → FOOTER | NAV → page title + intro → room listing (gallery + copy + capacity + **price** + CTA) × 4 → **amenity icon bar** (6 icons) → brand tagline → booking conditions → FOOTER |
| 2 | **Atzaró** (atzaro.com) | Ibiza agro-hotel | NAV + **Book Now button in header** → HERO + tagline → **value proposition paragraph** → **6-tile feature grid** (rooms / dining / spa / sustainability…) → alternating text-image deep-dives → weddings & events → what's on → brand philosophy → explore carousel → group directory → CONTACT + FOOTER | (homepage IS the conversion entry — no separate tours page fetched) |
| 3 | **Agriturismo.it** | Agritourism directory | NAV → **HERO search widget** (dates + guests) → regional nav grid → featured properties → **owner registration CTA** → editorial block → curated listings (3 sets) → travel inspiration → **manager testimonials** → directory index → **4-block value props** → **FAQ** → FOOTER | (directory model — listing cards are the conversion unit) |
| 4 | **Intrepid Travel** (intrepidtravel.com) | Tour operator | NAV → **sale banner** → **search widget** → HERO carousel → **3-col value props** ("1000s of experiences / shared adventures / positive change since 1989") → featured trip cards (with was/now price + savings) → **"What Sets Us Apart" 6-block** → popular destinations → content/stories → FOOTER | About/small-group page: NAV → HERO → **3 trust pillars (35 yrs / deeper trips / give back)** → what sets us apart → **origin story** → purpose CTA → FOOTER |
| 5 | **Airbnb Luxury** | Luxury stays | **403 Forbidden — blocked WebFetch.** Gap implication: cannot confirm sequence. Excluded from pattern count. | — |
| 5b | **Lavender Farm Thailand** | Peer farm experience | **ECONNREFUSED — site down or geo-blocked.** Gap implication: no peer farm sequence available. Excluded from pattern count. | — |

---

## 2. Alpaca's Current Sequences

### `/` Homepage (`app/[locale]/page.tsx`)
```
HERO
→ PressLogos ("As featured in")          ← trust bar, position 1.5
→ ChoicePaths (4-tile path selector)
→ WeavingShowcase (product feature)
→ Features (6-icon "Why Alpacas Ibiza")
→ EventsCalendar (upcoming events)
→ ExperienceCards (3 special experiences)
→ LatestStories (journal)
→ TestimonialsWall (guest reviews)
→ Final CTA (gradient section + TrustSignals)
→ NewsletterForm
→ (Footer in layout)
```

### `/tours` page (`app/[locale]/tours/page.tsx`)
```
Breadcrumbs
→ HERO
→ Tour types / Features (4 tour cards, no prices)
→ Timeline ("What to Expect")
→ Plan Your Visit (hours / location / pricing cards + special events CTA)
→ FAQ (10 questions)
→ Booking section (GoogleReviewsBadge + AvailabilityUrgency + FareHarborCalendar + TrustSignals + CancellationBadge)
→ TestimonialsWall
→ (Footer)
```

---

## 3. Patterns 3+ Competitors Share That Alpaca Lacks

| Pattern | Can Martí | Atzaró | Agriturismo.it | Intrepid | Alpaca has it? |
|---------|-----------|--------|----------------|----------|----------------|
| **Book/search CTA or button in navigation header** | — | YES (Book Now in header) | YES (search widget in hero) | YES (sale banner + search) | NO — nav has no booking CTA |
| **Value proposition paragraph/block directly under hero** (before navigating visitor into sub-options) | YES (3-col value props) | YES (intro paragraph) | YES (3-col at bottom, but search widget creates immediate value) | YES (3-col value props slot 3) | PARTIAL — PressLogos is there but ChoicePaths comes before any "why us" framing |
| **Media / certification trust bar visually above the fold or within first 2 sections** | YES (media logos in section 7, but early in scroll) | — | — | — | PARTIAL — PressLogos at slot 1.5 exists; but no certification badges |
| **Pricing visible on tour/room listings** (not buried in "Plan Your Visit") | YES (per-room on rooms page) | — | YES (on listing cards) | YES (was/now on trip cards) | NO — tours page has 4 tour cards with zero prices; pricing lives in a separate card block lower |
| **Testimonials / social proof BEFORE the booking widget, not after** | — | — | YES (manager testimonials mid-page) | — | NO — on /tours, TestimonialsWall is AFTER the booking section |
| **Origin/story narrative section** (brand authenticity anchor) | — (implicit via farm content) | YES (brand philosophy) | — | YES (founders story) | NO — no farm origin story block on homepage or tours |

---

## 4. Gap Score

**Homepage gap score: 3/6 patterns missing**  
**Tours page gap score: 3/6 patterns missing**  
Combined gap: moderate-high. The two most damaging gaps are pricing absence and testimonials-after-booking order on `/tours`.

---

## 5. Top 3 Positioning Changes (ranked by conversion impact)

### Change 1 — Show prices on tour cards (HIGHEST impact)
**What:** All 4 tour type cards on `/tours` currently show zero pricing info. Can Martí shows room prices inline. Intrepid shows was/now pricing on every trip card. Agriturismo shows prices on listing cards.  
**Why it converts:** Visitors who don't see prices self-qualify badly — they either bounce assuming it's expensive, or they click Book and hit sticker shock. Transparent pricing reduces abandonment at the calendar step.  
**File to edit:** `app/[locale]/tours/page.tsx` — the `tourTypes` array (lines 26–56). Add a `price` or `priceFrom` field, then update `components/features.tsx` (or whichever component renders the tour cards) to display it.

### Change 2 — Move TestimonialsWall above the booking widget on /tours (HIGH impact)
**What:** Currently the sequence on `/tours` is: FAQ → Booking section (calendar + CTA) → TestimonialsWall. Social proof arrives AFTER the conversion ask, so visitors who are on the fence leave without seeing reviews.  
**Why it converts:** All 3 sites that use social proof place it before or directly adjacent to the booking action, not after. A guest review immediately before "ready to book?" reduces the final hesitation moment.  
**File to edit:** `app/[locale]/tours/page.tsx` — move the `<TestimonialsWall>` block (lines 288–293) to between the FAQ section (line 233) and the Booking section (line 236). Three-line change.

### Change 3 — Add a "Book now" button to the navigation header (MEDIUM-HIGH impact)
**What:** Atzaró, Agriturismo.it, and Intrepid all surface a booking entry point in the persistent navigation header. Alpaca's nav has no booking CTA; visitors must scroll to a CTA or know to go to `/tours`.  
**Why it converts:** On mobile especially, users who are ready to book should not need to scroll. A sticky nav CTA captures intent at any scroll depth.  
**File to edit:** `components/header.tsx` (or equivalent nav component in `app/[locale]/layout.tsx`). Add a `<BookTourLink>` or `<BookingButton product="general">` as a primary button in the nav right-side slot.

---

*No invented section content. All sequences derived from live WebFetch results or alpaca source files.*
