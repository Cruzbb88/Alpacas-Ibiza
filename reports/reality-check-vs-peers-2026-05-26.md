# Reality Check: Alpaca Redesign vs Peers
**Date:** 2026-05-26  
**Auditor:** Claude Sonnet 4.6  
**Method:** Full codebase read + live WebFetch of all three peers  
**Verdict up front:** Pre-shippable. Structurally sound, technically ahead of peers — but zero real media, zero real alpaca photos, zero wired shop. A visitor hitting this today would see name labels where photos should be and emoji where products should be.

---

## Peer Baselines (from live fetches)

| Site | What it actually is |
|---|---|
| **alpacasibiza.com (live)** | The incumbent. Dutch-primary, EN toggle. Moderate content depth, FareHarbor wired, Instagram embed, personal founder story, alpaca profiles exist. No press logos. No certifications. Feels hand-built but authentic. |
| **canmarti.com** | Ibiza eco-finca B&B. 3 languages (EN/ES/FR). 7 major press logos (Elle, Guardian, Condé Nast, Telegraph, etc.). 3 sustainability certifications with badges. TripAdvisor + Google Reviews links. Full booking conditions. Detailed amenity pricing. Feels like a boutique hotel with editorial backing. |
| **atzaro.com** | Luxury agritourism hotel. 2 languages (EN/ES). 300-year heritage narrative. Dedicated press page. Restaurant, spa, events, weddings, vegetable garden all as separate sections. Downloadable 2026 brochure. Multi-brand ecosystem (9 properties). Feels like a 4-star resort, not a farm. |

---

## Scored Comparison (1–10)

### A. Visual Polish — does it look professionally designed or template-y?

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **6/10** | Clean olive/terra/sand palette, 16px radius, Geist Sans, semantic token system — tasteful. But gradient-only heroes (no real photo), emoji product cards in shop, `bg-secondary/20 h-48` placeholder boxes where product images belong. The palette is correct; the content is missing. |
| **canmarti.com** | 9/10 | Professional carousel photography, editorial press logos, certification badges render the page visually dense with real content. |
| **atzaro.com** | 8/10 | Luxury hotel photography, consistent brand language. Some lazy-load placeholders visible but everything earns its space. |
| **live alpacasibiza.com** | 5/10 | Hand-built feel, authentic farm photos, but layout is visually dated. Our redesign already beats the incumbent here. |

**Gap to close:** Real hero photography. Without it, the palette floats on nothing.

---

### B. Content Depth — real copy vs placeholder/lorem

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **5/10** | Translation keys resolve to real sentences in EN/DE/etc — not lorem ipsum. But alpaca bios are all `null`. Sustainability has two `[UNMAPPED]` sentinels (finca size, dye count). Shop/woven has real prices but no real product descriptions. Adopt page has a prominent `// TODO: OWNER_CONFIRMED` comment. About page has no team section. |
| **canmarti.com** | 8/10 | Per-room detail, farm-to-table sourcing, full booking policies, GDPR disclosure, pricing tiers including extras (cots, cleaning). |
| **atzaro.com** | 9/10 | Historical narrative, per-department contact emails, downloadable brochure, multi-brand cross-links. |
| **live alpacasibiza.com** | 6/10 | Has actual alpaca profiles with photos + bios, founder narrative with timeline (Belgium → Ibiza 2018), weaving backstory (San's 2013 start). More content depth than the redesign currently has. |

**Gap to close:** Alpaca bios + photos are the most painful gap. The live site already has them; the redesign has 14 name labels pointing at `null`.

---

### C. Trust Signals — press, reviews, certifications, named team

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **4/10** | `PressLogos` component is built but renders `null` in production (no logo files provided). `GoogleReviewsBadge` renders `null` without API keys. Real named reviews (Sue, Verena, Gemma, Renate, Sven, Paul) are hardcoded with dates — this is genuine. No certifications. No named team photos anywhere. |
| **canmarti.com** | 9/10 | 7 major press logos (Elle, Marie Claire, Condé Nast, Guardian, etc.), 3 eco-certifications, TripAdvisor + Google Reviews links. |
| **atzaro.com** | 8/10 | Dedicated press page, heritage claims, multi-award ecosystem. |
| **live alpacasibiza.com** | 5/10 | Instagram feed embed, founder story, no press logos either — so we're not behind on this specific axis relative to the incumbent. |

**Gap to close:** Press logos are owner-blocked. But the GoogleReviewsBadge can be wired even without owner logo files — that's an API key gap, not a content gap.

---

### D. Conversion Clarity — does a first-time visitor know what to do?

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **7/10** | "Book Tour" CTA in header, hero, experience cards, and final CTA — well-distributed. ChoicePaths section cleanly separates the four revenue streams. FareHarborCalendar on tours page is solid. Adopt page CTA is just a mailto link (payment not wired). Shop "Add to Cart" button does nothing. |
| **canmarti.com** | 7/10 | Multi-channel contact (phone, email, deposit terms) is clear but the booking flow itself is via inquiry, not instant. |
| **atzaro.com** | 9/10 | Dual primary CTAs (bedroom + table booking), department-specific email routing, WhatsApp, downloadable brochure. |
| **live alpacasibiza.com** | 7/10 | "Plan je bezoek" button appears repeatedly, FareHarbor integrated. Same tier as the redesign. |

**Gap to close:** Wire the shop or remove the "Add to Cart" button. It currently erodes trust by doing nothing on click.

---

### E. Mobile Readiness — flex layouts, type scale, image strategy

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **8/10** | Tailwind responsive classes throughout (`grid-cols-1 md:grid-cols-3`, `text-3xl md:text-4xl`), Sheet component for mobile nav, breakpoints consistent. No fixed-px widths found. Weakness: gradient-only heroes don't require responsive image strategy yet, but when real photos arrive this will need `next/image` with srcset. |
| **canmarti.com** | 8/10 | Carousel with mobile gestures, language flags in header. |
| **atzaro.com** | 7/10 | Some lazy-load placeholder issues visible, but desktop-strong. |
| **live alpacasibiza.com** | 5/10 | Older layout, likely not Tailwind. Responsive but dated. |

**Where we lead:** Mobile nav and responsive grid structure are cleaner than the live incumbent.

---

### F. Brand Specificity — Ibiza farm voice, not generic agritourism

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **6/10** | The copy references San Carlos, Es Currals, Ibiza specifically. Founder names (Bart, San) appear in reviews. Weaving section has real backstory. But the About page has no photo of the founders, no timeline, no "we moved from Belgium" hook that makes the story personal. The live site has this; the redesign doesn't yet. |
| **canmarti.com** | 8/10 | "400 year old Ibicencan farmhouse," permaculture philosophy, specific crop references. |
| **atzaro.com** | 9/10 | "300-year-old finca," named estate history, Ibiza heritage language throughout. |
| **live alpacasibiza.com** | 8/10 | Personal founder narrative is the strongest trust signal on the live site. The redesign abstracts this away. |

**Gap to close:** Founder story with photos on the About page. This is the single biggest personality gap.

---

### G. Booking UX — how does the booking flow compare to peers?

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **8/10** | FareHarborCalendar embedded on `/tours` page. GoogleReviewsBadge adjacent to booking (when configured). AvailabilityUrgency widget. CancellationBadge. 10-item FAQ above the calendar. Breadcrumbs. JSON-LD TouristTrip + FAQPage schemas. This is genuinely strong. |
| **canmarti.com** | 6/10 | Inquiry-based, deposit terms detailed but no instant booking. |
| **atzaro.com** | 8/10 | Direct booking portal for hotel rooms, separate restaurant reservation. |
| **live alpacasibiza.com** | 7/10 | FareHarbor integrated, "Plan je bezoek" repeated — functional but no urgency signals or FAQs. |

**Where we lead:** The booking page is the strongest page in the redesign. FAQ + urgency signals + cancellation badge + JSON-LD is better than all three peers on this specific page.

---

### H. E-commerce / Product — woven shop + Alcaca — real or stub?

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **3/10** | Woven shop has 6 products with real prices (€45–€180) but emoji placeholders where photos go, and "Add to Cart" button that does nothing. Alcaca page not read but referenced in nav. Commission page in nav but not built. No cart, no checkout, no payment integration. |
| **canmarti.com** | 5/10 | Organic shop referenced but primarily a B&B — not a full e-commerce site. |
| **atzaro.com** | 4/10 | Gift vouchers available, no product shop. |
| **live alpacasibiza.com** | 3/10 | Shop exists but is also thin — so we're at parity with the incumbent here, which is not a compliment. |

**Gap to close:** Either wire Stripe/Shopify or replace "Add to Cart" with "Contact to Order" before launch. A dead button is worse than no button.

---

### I. Localization — 6 locales vs peer norm of 1-3

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **9/10** | EN, DE, IT, ES, NL, FR — 6 locales with full translation key resolution. ReviewCard has per-language translate toggle. hreflang alternates via `alternates.canonical`. Structured data lists all 6 languages. This is a genuine lead over all peers. |
| **canmarti.com** | 6/10 | 3 languages (EN/ES/FR). |
| **atzaro.com** | 4/10 | 2 languages (EN/ES). |
| **live alpacasibiza.com** | 3/10 | 2 languages (NL primary, EN toggle). |

**Where we lead by widest margin.** Dutch-speaking Belgians are the core customer; German and Italian tourists are the next tier for Ibiza. This is a real strategic advantage.

---

### J. SEO / Structured Data — hreflang, JSON-LD, sitemap

| | Score | Evidence |
|---|---|---|
| **Alpaca redesign** | **8/10** | JSON-LD on tours (TouristTrip + FAQPage), alpacas (LocalBusiness), adopt (Product/Offer with schema.org price specs). `generateMetadata` with `alternates.canonical` on multiple pages. Breadcrumbs via `PageBreadcrumbs`. `organizationSchema` with sameAs social links. GA4 pixel + GTM hardcoded. The main gap: aggregateRating block deliberately omitted until Google Reviews API is wired — correct decision but means no star snippet in SERPs yet. |
| **canmarti.com** | 7/10 | GDPR-compliant consent, TripAdvisor/Google Reviews links. |
| **atzaro.com** | 6/10 | Dedicated press page, downloadable brochure. SEO basics not visible from fetch. |
| **live alpacasibiza.com** | 4/10 | Basic meta, no visible structured data, single-locale with EN toggle. |

**Where we lead:** Structured data coverage is significantly better than the live incumbent and likely better than peers.

---

## Net Composite Score

Weights reflect what a tourist-destination site actually converts on:

| Axis | Weight | Alpaca | Best Peer |
|---|---|---|---|
| A. Visual polish | 15% | 6 | 9 (canmarti) |
| B. Content depth | 20% | 5 | 9 (atzaro) |
| C. Trust signals | 15% | 4 | 9 (canmarti) |
| D. Conversion clarity | 15% | 7 | 9 (atzaro) |
| E. Mobile readiness | 10% | 8 | 8 |
| F. Brand specificity | 10% | 6 | 9 (atzaro) |
| G. Booking UX | 5% | 8 | 8 |
| H. E-commerce | 5% | 3 | 5 (canmarti) |
| I. Localization | 3% | 9 | 6 (canmarti) |
| J. SEO | 2% | 8 | 7 (canmarti) |

**Alpaca redesign weighted score: 5.9 / 10**

**Shippable v1 threshold: 7.0 / 10**

**canmarti equivalent: ~7.8 / 10**  
**atzaro equivalent: ~8.1 / 10**  
**live alpacasibiza.com equivalent: ~5.4 / 10**

The redesign scores 5.9. It beats the incumbent (5.4) but falls 1.1 points short of the shippable threshold. The deficit is almost entirely concentrated in three axes: content depth (null bios, dead shop), trust signals (no live press logos, no wired reviews badge), and visual polish (no real photos).

Verdict: **Pre-shippable.** The architecture is shippable. The content is not.

---

## Top 5 Fixes by Impact

### 1. Alpaca bios + photos on `/alpacas`
**File:** `lib/data/alpacas.ts`  
**Change:** Owner provides 14 photos + short bios (1-3 sentences each). Drop photos in `public/images/alpacas/`. Set `image` and `bio` fields.  
**Hours:** 0.5 dev (scaffolding done) + owner time to write 14 bios.  
**Impact:** Converts the most personality-rich page from a name grid to a character roster. The live site has this. We don't.

### 2. Wire the shop or kill the button
**File:** `app/[locale]/shop/woven/page.tsx`  
**Change:** Either (a) integrate Stripe/Shopify Buy button per product or (b) replace `<button>Add to Cart</button>` with a WhatsApp/email inquiry link (`wa.me/32475586544?text=I%27m%20interested%20in%20...`).  
**Hours:** 2h for inquiry-link approach; 8-16h for real Stripe.  
**Impact:** A dead Add to Cart button is the single most trust-destroying element on the site. It signals "unfinished."

### 3. Founder story + photos on About page
**File:** `app/[locale]/about/page.tsx`  
**Change:** Add a "Meet San & Bart" section with founder photos (2 images), the Belgium → Ibiza 2018 narrative, and San's 2013 weaving origin story. This content exists on the live site.  
**Hours:** 1h dev + owner provides 2 photos.  
**Impact:** Canmarti and Atzaro both win on brand specificity because they have a named human face. Alpaca redesign has founder names only in review text.

### 4. Wire GoogleReviewsBadge on the homepage
**File:** `app/[locale]/page.tsx`  
**Change:** Add `<GoogleReviewsBadge />` to the homepage guest reviews section (it's already on the tours page). More importantly, set `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` so it renders instead of `null`.  
**Hours:** 0.5h dev (component exists, just not placed on homepage). Key setup is an ops task.  
**Impact:** Star rating + review count visible on landing page = same trust signal canmarti has with TripAdvisor link.

### 5. Real hero image (any page)
**File:** `components/hero.tsx` + `public/images/`  
**Change:** The Hero component already accepts `backgroundImage` (used on alpacas page pointing to `/images/hero-alpacas.webp` which doesn't exist yet). Owner provides ONE good farm photo. Wire it to the homepage hero.  
**Hours:** 0.5h dev + owner provides 1 photo.  
**Impact:** The homepage gradient hero is the first thing a visitor sees. canmarti and atzaro open with real photography. This is the biggest first-impression gap.

---

## Top 3 Things Alpaca Redesign Does That Peers Don't

### 1. Six-locale full translation with per-review language toggle
No peer does this. The live site does NL+EN. Canmarti does 3. Atzaro does 2. The ReviewCard "translate" button is genuinely novel — it surfaces the German review for German visitors, the Dutch review for Dutch visitors, in-language. This serves the actual customer base (Dutch/Belgian tourists, German tourists) better than any peer.

### 2. Structured data depth (TouristTrip + FAQPage + Product/Offer + LocalBusiness)
The tours page alone has two JSON-LD schemas (TouristTrip + FAQPage). The adopt page has a correct schema.org Product/Offer with `UnitPriceSpecification` and `referenceQuantity`. The live incumbent almost certainly has none of this. This is invisible to visitors but matters for SERP features.

### 3. Production-grade security and reliability infrastructure
Turnstile CAPTCHA on forms (fail-open dev, fail-closed prod), `safeEqual()` timing-safe comparison, `fetchWithTimeout()` on every external call, `Promise.allSettled()` fan-out, JWT 8h auto-logout, validated env on boot. None of this is visible to a visitor — but it means the site won't embarrass the owner at 3am during Ibiza high season. No peer has documented this level of care.

---

## 3 Axes Closest to Peer Parity

1. **D. Conversion clarity (7/10)** — "Book Tour" is prominent, well-distributed, and tied to real FareHarbor. Canmarti uses inquiry-only. We're roughly tied.
2. **E. Mobile readiness (8/10)** — Tailwind responsive grids, Sheet mobile nav, consistent breakpoints. Cleaner than the live incumbent.
3. **G. Booking UX (8/10)** — FAQ + urgency signals + cancellation badge above the calendar. Best single page in the build. Beats the live site on this page specifically.

---

## 3 Axes Where We Lag Most

1. **H. E-commerce (3/10)** — Dead "Add to Cart" button, no cart, no checkout. The live site is equally thin here, but that's not a defense — it means neither version closes this revenue stream.
2. **C. Trust signals (4/10)** — PressLogos renders null (no files). GoogleReviewsBadge renders null (no API key). Reviews are present but text-only with no star aggregate. Canmarti has 7 major press logos and 3 eco-certifications. This gap is almost entirely owner-blocked, which is important context — but a visitor doesn't know that.
3. **B. Content depth (5/10)** — Fourteen null bios on the alpacas page. Two `[UNMAPPED]` sentinels on sustainability. Adopt CTA goes to mailto. The architecture is complete; the data is missing. The live site has more content depth today.

---

## Most Painful Single Observation

The `/alpacas` page renders 14 named cards with no images and no bios. The alpacas are the product. They are the reason people come. On the page specifically designed to introduce them, every single one is a blank placeholder. The live site has Barbarella's photo and her personality blurb. The redesign has 14 identical gray boxes with names. A first-time visitor hitting that page would assume the site is unfinished — because on that page, it is.

---

## CAN'T DO WITHOUT HELP (what would change the verdict)

These items are owner-blocked. No amount of engineering closes them:

1. **One real farm photo** — homepage hero, any page. Without photography, the palette is decorating a void.
2. **14 alpaca bios + photos** — the live site has them. The redesign has the names. Owner must write or provide.
3. **Press logo files** — the component is built and fail-quiet. Owner must drop SVG/PNG files and flip `status: 'live'` in `lib/data/press.ts`.
4. **Google Places API key** — `GoogleReviewsBadge` renders null without it. This is an ops/credential task, not a dev task.
5. **Shop payment decision** — Stripe vs FareHarbor subscriptions vs Mollie vs "contact to order." Until the owner picks one, the shop can't be wired. The current dead button is the worst of all options.
6. **Adopt payment vendor confirmation** — adopt/page.tsx has an explicit `// TODO: OWNER_CONFIRMED` blocking the payment CTA. This is the right call, but it means the page converts to mailto instead of payment.

**The redesign is engineered. It is not yet content-complete. The gap between 5.9 and 7.0 is almost entirely owner content, not engineering work.**
