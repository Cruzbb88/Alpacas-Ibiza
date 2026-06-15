# Competitor Deep Compare — Wave 3 (Ibiza luxury peer set) — 2026-06-13

Source: `/deep-research` workflow `whwpks0k0`. 5 angles × parallel fan-out → 21 primary sources fetched → 81 claims → 25 adversarially verified (20 confirmed, 5 killed). Every non-UNVERIFIED claim rests on a **direct primary-source page fetch** (often raw-HTML grep for the negative "no booking engine" assertions). This pass deliberately went **deeper on fewer competitors** to beat the verifier rate-limiting that sank Can Martí / La Granja / Cas Gasí across waves 1–2.

## Headline corrections to prior assumptions

1. **The "Ibiza hides price behind enquiry" hypothesis is REFUTED (0-3).** The verified luxury norm is **transparent, on-page, dual-season pricing** with explicit deposit % and inline VAT/tourist-tax disclosure.
2. **Two competitors are no longer bookable and must be DROPPED:** Cas Gasí is **CLOSED** (page title literally "WE ARE CLOSED" — becoming members-only Soho Farmhouse), and La Granja is now the **Slowness** membership brand with its booking page returning **HTTP 404**.
3. **No verified peer uses a global booking engine** (no SiteMinder/Mews/GuestCentric/CoverManager/FareHarbor). This **validates the redesign's direction** — the peer norm is direct/local, not a global SaaS engine.

## (i) Per-competitor × per-dimension matrix

| Dimension | Can Martí (canmarti.com) | Atzaró (atzaro.com) | Cas Gasí | La Granja | Six Senses Ibiza |
|---|---|---|---|---|---|
| **1. Pricing presentation** | Transparent dual-season "**from**": *"Suite prices start from 230€/night (+10% VAT). In July and August from 320€/night"* — every room type (Superior 340→590, Master 300→400, Casita 300→400). [/rooms/] | Dual-season spa: Deluxe *"240€ pp (01.06–04.10) / 210€ pp (05.10–01.11)"* across 6 experiences; engine: *"995EUR", "Best available price!", "Taxes included"*. [/spa-ibiza/day-experiences/, bookings.atzaro.com] | **ABSENT — closed** | **ABSENT — 404** | UNVERIFIED |
| **2. Deposit / balance timing** | **50% deposit** at booking; *"balance must be paid 10 days prior to arrival"*. [/rooms/] | **25% deposit**; *"remaining balance charged 7 days prior to check-in"*; seasonal cancellation tiers (high 14d / mid-low 7d). [bookings.atzaro.com/en/] | ABSENT | ABSENT | UNVERIFIED |
| **3. Bundled inclusion** | UNVERIFIED | **"90€ f&b credit at the spa"** baked into headline on 5 of 6 day packages (6th substitutes breakfast). [/spa-ibiza/day-experiences/] | ABSENT | ABSENT | UNVERIFIED |
| **4. Booking engine** | **NONE** — raw-HTML grep: zero siteminder/mews/guestcentric/covermanager hits. 8 "RESERVE" buttons → `/contact/` + `mailto:finca@canmarti.com` + phone. [/rooms/, /contact/] | **NeoBookings** (Ibiza-local vendor, NIF B-57298010) on `bookings.atzaro.com` subdomain, ~4-step flow. [bookings.atzaro.com] | ABSENT | ABSENT | UNVERIFIED |
| **5. Gift vouchers** | UNVERIFIED | **Two flat denominations 100€ / 200€**, group-wide digital eVoucher redeemable across all Atzaró businesses, NeoBookings checkout. NO custom amount, NO greeting-card add-on, NO stated expiry. [/vouchers/] | ABSENT | ABSENT | UNVERIFIED (Douro Valley shop evidence was off-target, refuted) |
| **6. Post-booking email lifecycle** | Manual deposit → *"confirmed once deposit received"*; full sequence UNVERIFIED | UNVERIFIED | ABSENT | ABSENT | UNVERIFIED |
| **7. SEO / JSON-LD / OG / hreflang** | **UNVERIFIED** (no script-grep performed) | **UNVERIFIED** | n/a | n/a | UNVERIFIED |
| **8. Trust-signal density** | **Very high**: 8 press logos (Elle, Marie-Claire, Condé Nast Traveler, Evening Standard, NatGeo Traveler, Telegraph, Good Travel, Guardian) + 3 eco-certs (Certificación Ecológica, Consell Balear, ECEAT) + TripAdvisor + Google badges + Balearic Tourist Register **AG-0004-EIF**. [canmarti.com] | UNVERIFIED this pass (wave-2: press elsewhere, none on /bonos/ conversion page) | ABSENT | ABSENT | UNVERIFIED |
| **9. Multilingual** | `/en/` exists; locale count + quality UNVERIFIED | EN + currency switch (USD/GBP); depth UNVERIFIED | n/a | n/a | UNVERIFIED |

## (ii) Where the redesign LAGS the verified Ibiza norm

Ranked by how clearly a verified peer does it better:

1. **Dual-season "from €X" pricing display** — Can Martí + Atzaró both publish it on-page. The redesign shows single prices or "Contact for details." **NOTE: the redesign already BUILT `SeasonalPriceList` + `getTourSeasonalWindows()`** — it's dark pending the owner setting `TOUR_SEASONAL_WINDOWS`. So this is **owner-data, not code.**
2. **Deposit-% + balance-timing line** — both peers state it explicitly (50%/10d, 25%/7d). The redesign has no deposit-display pattern. *Code-doable* IF the owner adopts a deposit model (today it's full-payment Stripe/Mollie).
3. **High-density trust block** — Can Martí runs 8 logos + 3 eco-certs + 2 review badges + license. The redesign **already built `PressLogos` + the footer trust section** — both dark/empty pending owner assets (logos, CBPAE cert, Turismo Activo registration). **Owner-data.**
4. **Bundled-inclusion framing** — Atzaró's "90€ f&b credit baked into the headline." The redesign has `BundleCta` (dark until `BUNDLE_*` env set) but not the *inclusive-headline* framing. *Code-doable* (display pattern).
5. **Flat-denomination quick-buy gift voucher** — Atzaró's two-button 100€/200€. The redesign has a richer gift *wizard* but not the friction-free fixed-denomination quick-buy. *Code-doable* (additive).

## (iii) Where the redesign already EXCEEDS the verified norm

- **Structured data** — competitors' JSON-LD is UNVERIFIED this pass, but waves 1–2 confirmed UK alpaca farms emit ZERO; the redesign emits 15+ schema types. (Caveat: Ibiza peers' schema posture is an honest UNVERIFIED — don't overclaim until script-grepped.)
- **Booking infrastructure direction** — peers use direct/local, NOT global engines. The redesign's FareHarbor→Stripe/Mollie + direct-form approach **matches the verified norm**; no global engine needed.
- **Payment abstraction** — Stripe + Mollie dual-rail vs single-processor peers.
- **Multilingual breadth** — 2 genuinely shippable locales (en/nl) already beats Can Martí's apparent EN-only; the other 4 are scaffold (see `reports/i18n/loc-quality-001`).

## (iv) CODE-DOABLE gaps to add (with competitor precedent)

| Gap | Precedent | Status in redesign |
|---|---|---|
| Dual-season "from €X" + inline VAT on experience/tour cards | Can Martí, Atzaró | **`SeasonalPriceList` already built** — owner sets `TOUR_SEASONAL_WINDOWS` |
| Deposit-% + "balance due N days before" line | Can Martí 50%/10d, Atzaró 25%/7d | Not built — code-doable IF owner adopts deposits |
| Bundled-inclusion headline framing (e.g. "incl. €X farm-shop credit") | Atzaró 90€ f&b credit | `BundleCta` exists; inclusive-framing not — code-doable |
| Flat-denomination quick-buy gift voucher (e.g. €50/€100) | Atzaró 100€/200€ | Gift wizard exists; flat quick-buy additive |
| Press-logo + eco-cert + review-badge + tourist-register trust block | Can Martí (8+3+2+license) | **`PressLogos` + footer trust already built** — owner supplies assets |
| Keep direct/self-hosted booking (do NOT add a global engine) | Can Martí (none), Atzaró (local NeoBookings) | Already aligned — no action |

**The pattern: 3 of the top gaps are already-built-but-dark components waiting on owner data, not missing code.**

## (v) Honestly-bounded UNVERIFIED gaps (still open after this pass)

- **Six Senses Ibiza** — UNVERIFIED on all 7 dimensions. The only Six Senses evidence that reached a vote was from the **Douro Valley** shop (wrong property) and was refuted. Needs a targeted re-fetch of `sixsenses.com/en/resorts/ibiza`.
- **SEO / JSON-LD posture for ALL Ibiza peers** — no `<script type="application/ld+json">` grep was performed. Whether Can Martí / Atzaró emit schema is unknown.
- **Post-booking email lifecycle** — no verified evidence for any competitor.
- **Multilingual quality** — locale counts + machine-vs-native quality unassessed for all peers.

These four remain the bounded research frontier. Three competitors are now **definitively characterised** (Can Martí verified; Cas Gasí + La Granja verified-as-dropped); one (Atzaró) is deeply verified; one (Six Senses Ibiza) is the single remaining live-but-unverified target.

---

**Time-sensitivity caveat:** Cas Gasí (closed spring 2025) and La Granja (→Slowness) changed status within ~12 months — drop both from any future pricing/booking benchmark. Atzaró's "995EUR" is a date-window display rate, not a standing price; the *structural* facts (open pricing, 25% deposit, taxes-included framing) are the transferable ones.
