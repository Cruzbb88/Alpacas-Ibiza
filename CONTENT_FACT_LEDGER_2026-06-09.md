# CONTENT FACT LEDGER — whole-site delusion sweep (2026-06-09)

**Goal (Cruz):** zero AI delusions across the entire site. Every visitor-facing claim must trace to a real source, or be neutralized.

**Method:** 6 parallel evidence-agents, one per content surface (numbers · alpaca bios · founder story · reviews/press/awards · experiences/yoga copy · JSON-LD/meta/shop). Hard rule enforced: never call a claim "verified" without naming the source; default unsourced specifics to FABRICATED; never invent the real value.

**Verified-fact baseline (the only things known true — cross-checked vs live FareHarbor + alpacasibiza.com):** Tour 1 hr / all ages / €21.19 · Yoga 1.5 hr / ages 15+ / €30 / Wed+Sat / max 6 · Adopt €75 mo / €900 yr · Skein €200 · 14 named alpacas (real photos, NL bios verbatim from live site) · founders San & Bart, ex-Belgium late-2018 · 5 alpacas arrived 10 Aug 2019 · Es Currals, San Carlos (Santa Eulària des Riu), Ibiza · address from owner's terms page "C/3 Bungalow Park 22, 07850 San Carlos".

> ⚠️ **Concurrent edit note:** while this sweep ran, a live editor began applying fixes to `lib/structured-data.ts` (address now wired to the tenant record's `07850`; `priceRange '€€'` and `paymentAccepted` removed) and `translations/en.json` (tour price `€30`→`€21.19`). Items marked **[being fixed live]** are already in hand — don't double-apply.

---

## A. CLEAN — verified real, leave alone

- **Founder / farm / weaving story** — every dated claim (Belgium late-2018, 5 alpacas 10 Aug 2019, herd of 14, crias Chet/Toots/Bardot, 6 more spring-2021 from Alpaca Flanders, Maria 81, Es Currals etymology, San's 2013 weaving start, the 92-yr-old loom seller, loom "Big Ben", plant dyes) traces to the live-site scrape / today's WebFetch of `/wie-zijn-wij`. **No fabrication.**
- **Alpaca NL bios** — verbatim from the owner's live per-alpaca pages. The English versions are AI translations flagged `OWNER_REVIEW_TRANSLATION` (need sign-off, not fabricated).
- **Facebook reviews** (6, on home + tours) — real owner-supplied text (`lib/data/testimonials.ts`), all `rating: null`.
- **Prices in JSON-LD**: Tour 21.19, Yoga 30, Adopt 75/900, Skein 200 — all match baseline.
- **Gated-empty components** (render nothing until owner adds data): press logos, awards, bookings ticker, Google reviews, virtual tour, events, journal, gallery. Correct fail-quiet — no fake data ships.
- **The big prior fabrications are already gone**: fake `aggregateRating` "127 reviews", the 4-tour-type taxonomy, the 5-stage all-day timeline — all confirmed removed.

---

## B. FABRICATED — wrong/invented, renders to visitors (FIX)

| # | Claim (quoted) | Location | Right value / action | Status |
|---|---|---|---|---|
| 1 | "Starting at €30 per person" (tour) | en.json `tours.planVisit.pricing.starting` | €21.19 (FareHarbor) | **[being fixed live]** |
| 2 | structured-data postcode `07819`, priceRange `€€`, street "San Carlos" | lib/structured-data.ts | 07850 + real street from tenant record | **[being fixed live]** |
| 3 | "From €30 · By appointment" (tour OG card) | app/[locale]/tours/opengraph-image.tsx:57 | From €21.19 | OPEN |
| 4 | "guided 90-minute farm walk" (tour) | en.json `experiences.tour.oneLiner`:215 | "1-hour" (FareHarbor = 1 hr) | OPEN |
| 5 | "90-minute farm tours" (experiences meta desc) | app/[locale]/experiences/page.tsx:33 | "1-hour" | OPEN |
| 6 | "90-min farm tour, valid for 12 months. Choose any tour type at booking." | en.json `gifts.flow.tourDescription`:1565 + gifts/page.tsx:157 fallback | "A 1-hour farm tour with the herd." (drop "90-min", the removed multi-type taxonomy, and the unverified 12-mo validity) | OPEN |
| 7 | postcode `07819` in inline schemas | app/[locale]/visit/page.tsx:51, yoga/page.tsx:58 | 07850 (or read tenant) — part of the live address sweep | OPEN (likely caught by live sweep) |
| 8 | Hardcoded ⭐⭐⭐⭐⭐ on every review card (real FB reviews carry no rating) | components/review-card.tsx:73-77 | remove the star row (keep text + author) | OPEN |
| 9 | Fabricated testimonial "An unforgettable experience. The alpacas were wonderful…" attributed to a generic "guest" | en.json `guestStories.testimonial/guest/visited`:338-340 (×6 locales) | delete keys (AI-invented, orphaned, wiring hazard) | OPEN |
| 10 | **Experiences comparison grid** — invented durations/group-sizes/inclusions: Workshops "3 hours / Up to 8 / Refreshments+farm tour"; Romantic Sunset "2 hours / 2 guests / cava+tapas+photographer 30 min+digital download"; Family "Half day / ages 4+ / mini weaving demo / farm-fresh snacks"; Weddings "Up to 80 / ceremony venue+catering coordination+bespoke favours"; Corporate "Up to 30 / half-full day / lunch+branded photography+team-building" | app/[locale]/experiences/page.tsx:105-189 | cut the invented specifics, keep the offering → "Contact for details" / "On request". **NEVER replace with a new invented number.** | OPEN — worst offender |
| 11 | **Corporate "Sample Itinerary"** — entire timed schedule (10:00 Welcome, 10:30 Meet the Herd, 11:30 Team Challenge, 1:00 Farm Lunch "organic picnic under the carob trees") + FAQ ("groups 5–40", "2–4 weeks advance", standard inclusions) | app/[locale]/experiences/corporate-team-building/page.tsx:53-61,200-226 + en.json `corporate.itinerary.*` | remove the itinerary section + neutralize FAQ to "contact us" | OPEN |
| 12 | "Later cancellations may incur a 50% fee" (yoga) | en.json `yoga.faq.refund.a`:245 | invented fee % — replace with "contact us re cancellations" | OPEN |
| 13 | "Children under 3 are free" / "Family visits are typically 1.5–2 hours" | en.json `family.faq.age.a`:634, `duration.a`:642 | no source (FareHarbor = "All Ages", no such product) — neutralize | OPEN |
| 14 | "90-minute outdoor Hatha yoga session" | en.json `yoga.whatBody`:1321 | phrasing-align to "1.5-hour" to match the fact tile + FareHarbor (90 min = 1.5 hr; not a value conflict, just inconsistent wording) | OPEN |

---

## C. OWNER-CONFIRM — plausibly real, only the owner can verify (do NOT ship as fact unconfirmed)

**Contact / location (in JSON-LD → Google ingests these):**
- Phone `+32475586544` (Belgian mobile) — still the active number? (×3 schema sites)
- Geo coords `38.9861, 1.5228` — confirm vs a real GPS/cadastral reading (drives the Maps pin)
- Postcode final confirm `07850` vs old `07819` (tenant record already flags this)
- Opening hours — schema lists all 7 days "by appointment"; confirm the real bookable days
- WhatsApp `+34689446781`, CIF `Y6917111J` — confirm still active (receipts only, not in JSON-LD)

**Adopt perks stated as contractual at checkout (material if wrong):**
- "6 free farm tours/year (up to 4 guests each)", "5 kg Alcaca fertilizer/year in 2 batches", welcome-gift bundle contents, "10% weaving / 15% farm-shop discount", certificate "posted 7–10 days", gift bundle "ships 2–3 weeks" — none in the verified baseline.

**Alpaca data:**
- `breed` (Huacaya ×14), `color`, `personality`, and some `fun_fact` lines are **AI editorial additions not on the live bios** — confirm or cut.
- **3 birthdays drive the live birthday-email cron**: Bardot 2022-01-19, Chet 2020-11-20, Toots 2021-02-03 — "extracted from bio prose, owner to confirm exact day." Wrong day = wrong automated email. (Other 11 are `null` → correctly skipped.)
- Fela "arrived March 2021" (live site only says "spring 2021"); Róisín Murphy "has visited her namesake" — confirm or soften.

**Real offerings, specifics unknown (the cut-specifics items in §B.10/11):** weaving workshop, weddings, corporate, family, romantic-sunset, family-farm-days durations / group sizes / inclusions / prices.

**Genuine two-source conflict (don't pick — owner decides):**
- Yoga duration: FareHarbor "1.5 hr" vs live site "1 h 15 min". Code uses 1.5 hr in the fact tile + the Event JSON-LD still says "1 hour 15 minute" (structured-data.ts:277).

**Shop:** Alcaca + Woven product prices are honest `0.00` placeholders (`// OWNER_INPUT_NEEDED`) — supply real prices or drop `productSchema` until then (Google suppresses €0 Product snippets).

**Brand superlatives to soften or source:** Alcaca "purest/most fertile manure of all animal species", "65-hour digestion", "three stomach chambers" — present as fact with no citation.

---

## D. Bottom line

The **story and identity content is clean** (real, sourced). The delusions are concentrated in **tour numbers, machine-readable address/rating data, fake review stars, and the invented experience/corporate specifics** (§B). The §B price/address items are **being fixed live right now**; §B.3-14 are the remaining open visitor-facing fixes (worst: the experiences grid + corporate itinerary). §C is the owner punchlist — real-or-not can't be settled from the codebase.
