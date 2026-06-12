# i18n Fabrication Audit — 2026-06-09

Ground truth: Tour = 1 hr / €21.19; Yoga = 1.5 hr (confirmed), €30, max 6, Wed+Sat, ages 15+; Adopt = €75/mo, €900/yr; Skein = €200; 14 alpacas; Founders = San & Bart; Location = Es Currals, Santa Eulària, Ibiza.

---

## en.json fabrications

- key: `experiences.tour.oneLiner` = "Meet and hand-feed the herd on a guided **90-minute** farm walk." → INVENTED (real: 1 hour per FAQ + guest review)
- key: `experiences.romantic.oneLiner` = "A private golden-hour walk for two with **cava, tapas, and a photographer**." → INVENTED (three specific inclusions with no source; romantic page itself only shows "optional Cava add-on" — so tapas and a photographer are AI-added)
- key: `experiences.family.oneLiner` = "Hands-on alpaca care, a kids weaving demo, and **farm-fresh snacks**." → INVENTED (snacks not confirmed; family page safety section mentions "kid-friendly drinks and snacks" as a UI card — also unsourced but in-scope for a separate review)
- key: `experiences.corporate.oneLiner` = "Team-building with the herd, lunch, and **branded photography**." → INVENTED (lunch and branded photography are specifics without source)
- key: `experiences.weddings.oneLiner` = "Say your vows with the herd as your backdrop — **photoshoot included**." → INVENTED (weddings page says "contact for details"; no confirmed inclusion)
- key: `tours.planVisit.pricing.starting` = "Starting at **€30 per person**" → WRONG PRICE (real tour = €21.19; €30 is the yoga price — conflated)
- key: `yoga.whatBody` = "A **90-minute** outdoor Hatha yoga session…" → CONFLICT WITH SUBTITLE (subtitle correctly says "1.5 hours"; this string spells it "90-minute" — internally inconsistent and could confuse if the 1.5 hr vs "90 min" conflict resolves differently from the live site)
- key: `gifts.flow.tourDescription` = "**90-min** farm tour, valid for 12 months. Choose any tour type at booking." → INVENTED DURATION (real = 1 hour); "valid for 12 months" is also unverified
- key: `adopt.timeline.photoshoot.desc` = "An hour with your alpaca and our photographer. **Digital downloads included.**" → INVENTED (digital downloads not mentioned in confirmed adoption benefits)
- key: `family.faq.duration.a` = "Family visits are typically **1.5 to 2 hours**" → UNCONFIRMED (no confirmed duration for family visits; 2 hours upper bound is invented)
- key: `faq.duration.a` (EN) = "The Alpaca Tour runs approximately **1 hour**." → REAL (matches ground truth — flagged as correct for reference)
- key: `press.subtitle` = "Alpacas Ibiza has been featured in Belgian national press, regional Flemish media, Spanish local newspapers, and **international travel outlets**." → UNVERIFIED CLAIM (international travel outlets is unsourced marketing language; Belgian + Flemish + Spanish is plausible but unchecked)
- key: `awards.*` (section header) = "Awards & Recognition" / "Recognized by" / "Certified" → SECTION EXISTS with no content yet — if rendered it would imply awards that are unconfirmed
- key: `corporate.itinerary.item4.desc` = "Organic, locally sourced picnic lunch under the carob trees." → INVENTED (specific menu style + "carob trees" location invented)

## nl.json fabrications

- key: `faq.duration.a` (NL) = "Standaard tours duren **2-3 uur**." → INVENTED DURATION (real = 1 hour; this is the worst mistranslation in the file — directly contradicts the EN FAQ and guest reviews)
- key: `tours.planVisit.pricing.starting` = "Vanaf **€30 per persoon**" → WRONG PRICE (same error as EN — tour starts at €21.19, not €30)
- key: `gifts.flow.tourDescription` = "**90 min.** boerderijrondleiding, geldig 12 maanden." → INVENTED DURATION (same as EN)
- key: `adopt.timeline.photoshoot.desc` = "Een uur met jouw alpaca en onze fotograaf. **Digitale downloads inbegrepen.**" → INVENTED (same as EN)
- key: `family.faq.duration.a` (NL) = "Familiebezoeken duren doorgaans **1,5 tot 2 uur**" → UNCONFIRMED (same as EN)
- key: `romantic.champagne.desc` = "Optionele **Cava**-toevoeging om te proosten op de zonsondergang." → MARGINAL (Cava is listed as an option on the romantic page itself, but there's no confirmed farm service backing this)
- key: `corporate.itinerary.item4.desc` = "Biologische, lokaal geproduceerde picknicklunch onder de **johannesbroodbomen**." → INVENTED (same as EN — AI invented the specific "carob trees" setting)

---

## Summary

- Total keys reviewed: ~1,865 en.json + ~1,821 nl.json (full files)
- Fabricated / unverified keys: 14 distinct concepts across both files (many are the same key in both languages)
- Top 10 most-dangerous (would mislead a customer):

| # | Key | Value (truncated) | Truth |
|---|-----|-------------------|-------|
| 1 | `nl.faq.duration.a` | "tours duren 2-3 uur" | Real: **1 hour** (per EN FAQ, guest review: "precies een uur") |
| 2 | `en/nl.tours.planVisit.pricing.starting` | "Starting at €30 per person" | Real tour: **€21.19**; €30 is yoga price |
| 3 | `en/nl.experiences.tour.oneLiner` | "guided 90-minute farm walk" | Real: **1 hour** |
| 4 | `en/nl.gifts.flow.tourDescription` | "90-min farm tour, valid for 12 months" | Real: **1 hour**; 12-month validity unverified |
| 5 | `en/nl.experiences.romantic.oneLiner` | "cava, tapas, and a photographer" | **No confirmed inclusions**; romantic page only calls Cava an optional add-on |
| 6 | `en/nl.adopt.timeline.photoshoot.desc` | "Digital downloads included" | **Not in confirmed benefits list** |
| 7 | `en.yoga.whatBody` | "A 90-minute outdoor Hatha yoga session" | Technically correct duration but inconsistent with subtitle ("1.5 hours") — ambiguous |
| 8 | `en/nl.experiences.corporate.oneLiner` | "lunch, and branded photography" | **No confirmed inclusions** |
| 9 | `en/nl.family.faq.duration.a` | "typically 1.5 to 2 hours" | **No confirmed family visit duration** |
| 10 | `en.press.subtitle` | "featured in…international travel outlets" | Partial — Belgian/Spanish press plausible, "international travel outlets" is AI marketing language |

---

## Patterns observed

1. **Tour duration is wrong in multiple places**: 1-hour tour appears as "90 minutes" (experiences oneLiner, gifts flow, yoga.whatBody) and as "2-3 uur" in NL FAQ. The correct value ("approximately 1 hour") exists only in `faq.duration.a` (EN) and is corroborated by the Renate guest review ("precies een uur").

2. **Pricing is conflated**: €30/person (yoga price) was copy-pasted into `planVisit.pricing.starting` in both locales, overwriting the actual tour price of €21.19.

3. **Experience inclusions are systematically invented**: romantic (tapas + photographer), corporate (branded photography + lunch), weddings (photoshoot included), family (farm-fresh snacks) — all specifics that have no confirmed source. The pattern is consistent with an LLM padding experience descriptions.

4. **NL FAQ is the most dangerous single key**: `nl.faq.duration.a` claims "2-3 uur" for a standard tour that is 1 hour. A Dutch-speaking customer reading only this FAQ would arrive expecting a 2–3 hour experience and leave after 1 hour thinking the farm cut it short.

5. **Nothing was found in sustainability (water/energy cert claims), about founders (no invented career details), or alpaca bios** — those sections are either sourced from the real story or are appropriately marked OWNER_REVIEW_TRANSLATION. The fabrication is concentrated in experience descriptions and pricing/duration stats.
