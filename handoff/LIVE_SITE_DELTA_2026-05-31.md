# Live Site Delta — 2026-05-31
**Re-scrape date:** 2026-05-31
**Prior inventory:** `handoff/LIVE_SITE_CONTENT_INVENTORY.md` (scraped 2026-05-31, Round 1+2)
**Pages fetched this pass:** 6 (home, wie-zijn-wij, alpacas-ibiza, informatie-weaving, adopt-a-paca, contact-1)
**Method:** WebFetch one-by-one, compared verbatim against prior inventory text

---

## Delta by page

### /home

**Change count: 2**

**CHANGED — H1 wording**

Prior inventory (2026-05-31 Round 1):
> H1: "Alpacas de allereerste alpacaboerderij op Ibiza"

Live site today:
> H1: "Alpacas Ibiza, de allereerste alpacaboerderij op Ibiza"

The site name "Alpacas Ibiza" is now explicitly prepended to the H1. Prior inventory had "Alpacas" only (truncated by the fetcher or genuinely different). This is the canonical SEO H1 — redesign should use the full form.

**CHANGED — H2 set restructured**

Prior inventory H2 list:
> "Alpaca Farm & Weefstudio / Wishfulfilling Weaving - Made in Ibiza, embracing the world / San en Bart verhuisden eind 2018 vanuit België naar Ibiza... / Bezoek nu onze alpacaboerderij met weefstudio / Plan je bezoek / Follow us on Instagram"

Live site today H2/H4:
> H2: "Alpaca Farm & Weefstudio" / "Wishfulfilling Weaving Made in Ibiza, embracing the world" / "San en Bart verhuisden eind 2018 vanuit België naar Ibiza om hun jarenlange droom waar te maken: een eigen alpacaboerderij met weefstudio" / "Bezoek nu onze alpacaboerderij met weefstudio"
> H4: "Plan je bezoek" / "Follow us on Instagram"

The "San en Bart" H2 now carries the full sentence verbatim:
> "San en Bart verhuisden eind 2018 vanuit België naar Ibiza om hun jarenlange droom waar te maken: een eigen alpacaboerderij met weefstudio"

Prior inventory had this truncated with "..." — the full text is now confirmed. Use this as the sub-headline on the Home hero or About intro.

**New body paragraphs confirmed (not in prior verbatim body extract):**

> "Es Currals Alpacas Ibiza is de allereerste alpacaboerderij op Ibiza en bevindt zich in het rurale noorden van het eiland, op een authentieke finca in een prachtig natuurdecor."

> "Hier bevindt zich ook het kloppend hart van Wishfulfilling Weaving, de artisanale weefstudio waar met voornamelijk alpacawol exclusieve sjaals met de hand geweven worden op een traditionale houten weefgetouw."

Prior inventory summarised these but did not quote them verbatim from the homepage specifically. These are the two canonical one-paragraph descriptions of the dual business (farm + studio). Use verbatim on Home "about" block.

**FORWARD_PLAN gap resolution: NONE on this page.** FareHarbor URLs unchanged, no new item IDs, no opening hours, no prices.

---

### /wie-zijn-wij

**Change count: 1**

**NEW — verbatim detail about San's spinning speed**

Prior inventory:
> "San (Founder & Owner): Focuses on reviving traditional weaving crafts; spins yarn and transforms alpaca wool into textile creations."

Live site today (new verbatim detail not in prior inventory):
> "San spins yarn at 160km/u"

This appears to be the live site's literal claim about the speed of her spinning wheel / yarn-winding process. Prior inventory paraphrased her role but omitted this specific figure. Capture verbatim; flag for owner confirmation (may be a speed reference for spinning wheel RPM converted to thread speed — context unclear without seeing surrounding sentence).

**Everything else on this page matches prior inventory verbatim.** Founder descriptions, Maria story, farm name origin — all unchanged.

**FORWARD_PLAN gap resolution: NONE new.** Founder bios already marked "integration pending" from prior scrape.

---

### /alpacas-ibiza

**Change count: 0 — unchanged**

All body copy, headings, herd count (14), arrival date (10 August 2019), alpaca names (Mojo, Lewis, Marrón, Dusty, Barbarella + offspring Chet/Toots/Bardot + 6 from Alpaca Flanders), and image URLs match prior inventory verbatim. No new content detected.

**FORWARD_PLAN gap resolution: NONE new.**

---

### /informatie-weaving

**Change count: 1**

**NEW — image URL not in prior inventory**

Prior inventory listed these weaving/product image filenames:
- `stencil.facebook-ad-carousel-2.jpg`
- `Nelson-min-scaled.jpg`
- `14_optimized.jpeg`
- `15_optimized.jpg`
- `Chicas2-washed.jpeg`
- `37daa1ae-7000-4c30-9867-a94297bb1981.jpg`
- `Alpacas-Ibiza-14-min.jpg`
- `Alpacas-Ibiza-20-min.jpg`

Live site today includes an additional image not previously catalogued:
> `stencil.facebook-ad-link-27.jpg`

Full CDN path (base `https://images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3/`):
> GUID not resolved by fetcher — filename confirmed as `stencil.facebook-ad-link-27.jpg`

**Everything else on this page matches prior inventory.** Headings (H2 set), Big Ben loom story, natural dyes (hibiscus, avocado), hand-process narrative — all unchanged. No prices surfaced.

**FORWARD_PLAN gap resolution: NONE new.** Weaving collection product prices still JS-rendered, inaccessible via SSR.

---

### /adopt-a-paca

**Change count: 2**

**NEW — certificate PDF URL**

Not in prior inventory at all. Live page contains a direct link to a sample adoption certificate:

> `https://www.alpacasibiza.com/wp-content/uploads/2022/07/Adopt-a-paca-certificate-Anna-kopie.pdf`

This is a WordPress upload URL hosted on alpacasibiza.com (unusual — site is Squarespace; this `/wp-content/` path may be a legacy asset from a former WordPress install or an embedded PDF file served from a subdomain/redirect). The file appears to be a real adoption certificate sample with a name ("Anna") redacted or used as placeholder.

**ACTION FOR REDESIGN:** Fetch this PDF to extract the certificate design/fields. The redesign has a certificate generation feature (`lib/email-templates.ts buildAdoptCertificateEmail()`). The fields on this live sample certificate should match what the redesign generates.

**NEW — verbatim body copy from adoption package intro**

Prior inventory had the package benefits list but not the exact intro sentence. Live site today:

> "Je betaalt 75€ per maand (900€ vooraf voor het hele jaar) voor het voedsel en medische zorgen van je adoptiedier..."

This sentence is not in the prior inventory verbatim. It confirms: (a) the €75/€900 amounts match `lib/config.ts` constants (already verified), and (b) the stated purpose of the payment is "voedsel en medische zorgen" (food and medical care) — this is the consumer-facing framing. Use this framing in the adopt page copy.

**FORWARD_PLAN gap resolution:**
- Adopt price constants (€75/€900) — already marked verified in FORWARD_PLAN. No change.
- Certificate PDF URL newly discovered — resolves the open question of what the certificate looks like. See ACTION above.

---

### /contact-1

**Change count: 0 — unchanged**

All body copy matches prior inventory verbatim, including the confirmed live placeholder:
> "Hier nog een tekst voorzien."

Email (info@alpacasibiza.com), social links (Instagram + Facebook), FareHarbor URLs, and logo image URL all unchanged. No phone number on the contact page itself (phone is in `/algemene-voorwaarden` only, as noted in Round 2).

**FORWARD_PLAN gap resolution: NONE new.**

---

## Summary

| Page | Change count | What changed |
|---|---|---|
| /home | 2 | H1 full form confirmed; "San en Bart" H2 full sentence; 2 verbatim homepage body paragraphs |
| /wie-zijn-wij | 1 | "San spins yarn at 160km/u" — new verbatim detail |
| /alpacas-ibiza | 0 | Unchanged |
| /informatie-weaving | 1 | New image filename: `stencil.facebook-ad-link-27.jpg` |
| /adopt-a-paca | 2 | NEW certificate PDF URL; verbatim intro sentence confirmed |
| /contact-1 | 0 | Unchanged (placeholder still live) |
| **Total** | **6** | |

---

## FORWARD_PLAN gap cross-check

Items in FORWARD_PLAN that this re-scrape resolves or partially resolves:

| FORWARD_PLAN item | Section | Resolution status |
|---|---|---|
| Certificate design/fields for redesign adopt certificate feature | Section 3 (Polish) | **PARTIALLY RESOLVED** — sample PDF URL found at `https://www.alpacasibiza.com/wp-content/uploads/2022/07/Adopt-a-paca-certificate-Anna-kopie.pdf`. Fetch the PDF to extract field layout. |
| Adopt payment framing copy | Section 1 (Blocking) | **NEW VERBATIM** — "voor het voedsel en medische zorgen van je adoptiedier" is the owner's own framing. Use this in the adopt page Dutch copy. |
| H1 canonical text for SEO | Section 3 (Polish, brand copy) | **RESOLVED** — canonical H1 is "Alpacas Ibiza, de allereerste alpacaboerderij op Ibiza" |
| Homepage sub-headline (farm + studio dual description) | Section 3 (Polish) | **RESOLVED** — two verbatim paragraphs now captured (see /home section above) |

Items this re-scrape does NOT resolve (still owner-blocked):

- Opening hours: not on any page (farm is by-appointment only — this is intentional)
- Tour durations beyond yoga (1h 15m): not stated on live pages for other tours
- Per-tour FareHarbor item IDs: still JS-rendered only; 577841 remains the only confirmed ID
- Weaving collection prices: JS-rendered Squarespace commerce, inaccessible via SSR
- Legal pages (privacy, cookies, terms, impressum): not on live site
- Wedding/photoshoot pricing: live site still says "contact us"
- Workshop pricing: live site still says "on request"

---

## Action items from this delta

1. **Fetch the certificate PDF** at `https://www.alpacasibiza.com/wp-content/uploads/2022/07/Adopt-a-paca-certificate-Anna-kopie.pdf` — extract field names so `buildAdoptCertificateEmail()` matches the owner's real certificate layout.
2. **Update H1 in redesign SEO metadata** — confirm `Alpacas Ibiza, de allereerste alpacaboerderij op Ibiza` is used as the NL H1 (not truncated).
3. **Use verbatim homepage paragraphs** on the Home "about" block — both sentences are now confirmed sourced from the live site.
4. **Flag San's 160km/u spinning claim** for owner confirmation before using in redesign copy — it may be a fun fact or may need context.
5. **Investigate `stencil.facebook-ad-link-27.jpg`** — resolve full CDN GUID if needed for the weaving page image gallery.
6. **Placeholder on /contact-1 still live** — "Hier nog een tekst voorzien." is visible to production visitors. Flag for owner.
