# Alpacas Ibiza Redesign — Master Completeness & Peer Comparison
**Date:** 2026-06-05 · **Pages audited:** 27 · **Method:** factual completeness + peer-coverage only (no design recommendations)

---

## 1. Executive Verdict

The redesigned Alpacas Ibiza site is a **structurally strong, content-and-asset-starved build**. Across all 27 audited pages the weighted average completeness is **~47%**. Of those pages, **0 are "complete" (≥85%)**, **23 are "partial"**, and **4 are "owner-blocked"** (Media/Gallery 5%, Weaving Collection 12%, Press 28%, Journal sits at 30% partial but is content-starved). Against the **incumbent** (the live Dutch Squarespace site) the redesign is a clear win on architecture: it ships Adopt-a-Paca with a full conversion flow, Skein sponsorship, a filterable herd, Gifts, Sustainability, FAQ, structured data, and i18n that the incumbent simply does not have. Against **premium/market peers** (Can Martí, Spring Farm Alpacas, the FareHarbor Ibiza listing, the 8-operator UK/US/EU/NZ norm set) the redesign **genuinely lags on the three things that actually convert**: real photography (nearly every visual slot renders a CSS gradient or emoji placeholder), visible pricing (most product/experience pages show "Contact for details"), and live social-proof/trust signals (Google Reviews badge, TripAdvisor, press logos all wired but dark). The deficit is overwhelmingly **owner-blocked content (photos, prices, FareHarbor IDs, API keys, legal copy)** rather than missing code — the engineering scaffold is consistently ahead of the assets feeding it.

---

## 2. Master Comparison Table (worst → best)

| # | Page | Route | % | Status | Norms ✓ / ✗ | One-line verdict |
|---|------|-------|---|--------|-------------|------------------|
| 1 | Media/Gallery | `/media` | 5 | owner-blocked | 6 / 8 | Full lightbox infra, zero photos — empty state ships; noindexed. |
| 2 | Weaving Collection | `/weaving/collection` | 12 | owner-blocked | 5 / 8 | 6 numbered placeholder cards, no names/photos/prices — inferior to the live site it replaces. |
| 3 | Press | `/press` | 28 | owner-blocked | 5 / 8 | Accurate 6-outlet roster but all logos/URLs null — renders "coming soon", noindexed. |
| 4 | Journal | `/journal` | 30 | partial | 7 / 7 | Excellent blog engine, 1 live post, no newsletter/booking CTA. |
| 5 | Shop: Woven | `/shop/woven` | 32 | partial | 6 / 10 | Correct scaffold, 6 emoji products, zero prices/photos/descriptions. |
| 6 | Home | `/` | 38 | partial | 14 / 12 | Solid skeleton + real reviews, but every card is a gradient and trust layer is dark. |
| 7 | Romantic Sunset | `/experiences/romantic-sunset` | 38 | partial | 6 / 8 | Unique proposal upsell, but no price, no photo, no logistics. |
| 8 | Weaving | `/weaving` | 38 | partial | 8 / 10 | Launch-ready copy, all 3 photo slots empty — non-viable visually. |
| 9 | Experiences Hub | `/experiences` | 42 | partial | 9 / 11 | 7 experiences wired, but 14 missing i18n keys render raw strings; no imagery. |
| 10 | Weddings | `/weddings` | 42 | partial | 10 / 10 | Good dual-CTA structure; hero gradient, all "Contact for details", no pricing. |
| 11 | Sustainability | `/sustainability` | 42 | partial | 8 / 9 | Real prose + herd roster, but no cert badges, no hero, no CTA. |
| 12 | Shop: Commission | `/shop/commission` | 45 | partial | 8 / 8 | Best-in-class inquiry form, but no portfolio, process, price, or testimonials. |
| 13 | Shop Hub | `/shop` | 48 | partial | 7 / 8 | Strong engine; woven = emoji, all prices hidden; Skein/Alcaca carry it. |
| 14 | About | `/about` | 52 | partial | 10 / 8 | Rich dated origin story, but text-only — no photos, no CTA, no press. |
| 15 | Corporate Team-Building | `/experiences/corporate-team-building` | 52 | partial | 12 / 8 | Purpose-built B2B form + itinerary; 3 missing images, no price/proof. |
| 16 | Family Farm Days | `/experiences/family-farm-days` | 52 | partial | 6 / 7 | Real booking + FAQ; 7 image slots broken, no price anchor/reviews. |
| 17 | Shop: Alcaca | `/shop/alcaca` | 52 | partial | 6 / 8 | Strongest shop sub-page (real photos + copy); price hidden behind enquiry. |
| 18 | Yoga | `/yoga` | 52 | partial | 10 / 9 | Verified price/duration/cap beats incumbent; no hero, instructor, or reviews. |
| 19 | Tours | `/tours` | 62 | partial | 14 / 12 | Real FAQ + 6 reviews + booking; comparison table all "Contact for details". |
| 20 | Gifts | `/gifts` | 62 | partial | 8 / 7 | Full gift wizard + pricing; dead FAQ, no proof, €45-vs-€30 price conflict. |
| 21 | Workshops | `/workshops` | 62 | partial | 11 / 10 | Honest verified content; no photos, no price, no reviews. |
| 22 | Skein Sponsorship | `/skein` | 62 | partial | 10 / 9 | Complete novel checkout; emoji picker, undiscoverable, /adopt URL bug. |
| 23 | Visit | `/visit` | 72 | partial | 15 / 7 | Strong logistics + GPS; no map embed, no inline booking, no hours. |
| 24 | Adopt-a-Paca | `/adopt` | 72 | partial | 15 / 6 | Most complete page on the site; emoji picker, seeded reviews, EU legal placeholder. |
| 25 | Alpacas Herd | `/alpacas` | 72 | partial | 10 / 7 | 14 named alpacas + filter beats all peers; no hero photo, no booking CTA. |
| 26 | Alpaca Profile | `/alpacas/[slug]` | 72 | partial | 7 / 7 | Bilingual bios + adopt CTA; no age, no gallery, no booking, no OG image. |
| 27 | Contact | `/contact` | 72 | partial | 11 / 7 | Production-grade form + map; no full address, no inline WhatsApp, no CTA. |

**Status tally:** 0 complete · 23 partial · 4 owner-blocked. Weighted average ≈ **47%**.

---

## 3. Peer-Norm Coverage Matrix

Consolidated norms drawn from Can Martí, the FareHarbor Ibiza listing, the incumbent, and the 8-operator niche synthesis. ✓ = covered somewhere; ⚠ = wired but dark (owner-blocked); ✗ = absent.

| Peer norm | Status | Where on our site |
|-----------|--------|-------------------|
| Online booking widget (FareHarbor/Stripe) | ✓ | Tours, Gifts, all experiences, Adopt, Skein |
| Upfront pricing on product/experience pages | ⚠ | Only Adopt (€75/€900), Yoga (€30), Skein (€200), Gifts. Tours/woven/alcaca/weddings/workshops/commission all hidden |
| Star rating + review count displayed | ⚠ | GoogleReviewsBadge wired on Home/Tours/Adopt/Contact but renders null (no API key) |
| TripAdvisor / Travellers Choice badge | ✗ | Not in codebase on any page |
| Named individual alpaca roster | ✓ | `/alpacas`, `/alpacas/[slug]`, Adopt picker, Sustainability, Skein |
| Individual animal photos on roster/picker | ⚠ | Herd/profile have CDN photos; Adopt & Skein pickers show emoji (not wired) |
| Press / media logo strip | ⚠ | `/press` roster correct but logos null; component exists, not placed on Home |
| Gift vouchers purchasable online | ✓ | `/gifts` (tour, monthly/yearly adopt, shop credit) |
| Adopt / sponsor-an-alpaca programme | ✓ | `/adopt` — reference operator for this norm; only public adopt pricing in peer set |
| Tiered adopt packages (Bronze/Silver/Gold) | ✗ | Single tier at two billing frequencies only |
| Farm shop with real product photography | ⚠ | Alcaca has 2 real photos; woven/collection = emoji/empty |
| Wool-to-product traceability narrative | ✗ | Mentioned in copy fragments; no concrete fleece→yarn→garment chain |
| FAQ section (footwear/age/dogs/weather) | ✓ | Tours, Visit (cards), experiences, Gifts (dead), Workshops, Yoga |
| Founders' biographical origin story | ✓ | `/about` (Bart & San, 2019, Maria, Es Currals) — strong |
| Founder portrait photography | ✗ | About is text-only, no portraits |
| Map embed / interactive map | ⚠ | `/contact` has OSM/Google iframe; Visit is text-link only |
| GPS coordinates + driving directions | ✓ | Visit, Contact (38.9861 N, 1.5228 E) |
| Full postal address displayed | ✗ | Only "Ibiza, Spain"; postcode conflict (07850 vs 07819) unresolved |
| Instagram / social feed embed | ✗ | Only external links; no embed anywhere |
| Sustainability / eco-cert badges | ⚠ | `/sustainability` real prose; AwardsBadges empty, no live badges |
| Regulatory/agritourism licence number | ✗ | Balearic registration absent on all pages |
| Hero / lead photography on every page | ⚠ | Almost universally gradient/empty placeholders |
| Newsletter / email signup | ⚠ | Home has it; absent from Journal, experiences, shop |
| Corporate/group separate inquiry path | ✓ | `/experiences/corporate-team-building` (bespoke form) |
| Weddings/events as distinct product | ✓ | `/weddings` |
| Weaving/craft workshop as bookable product | ✓ | `/workshops`, `/weaving` — market differentiator |
| Structured data (JSON-LD) | ✓ | Present and above-norm site-wide |
| Multilingual site | ✓ | EN+NL real; ES/DE/FR/IT carry sentinels in places |
| Blog / journal / farm updates | ⚠ | Engine built, 1 post live |
| Video / reel content | ✗ | None anywhere |

**The "every complete peer has it, we don't" shortlist:** TripAdvisor badge, live star ratings, real photography across the board, full street address, Instagram feed embed, agritourism licence number, tiered adopt packages, wool traceability chain, and video — these are the cleanest cross-the-board gaps.

---

## 4. Per-Page Deep Dives

### 1. Media/Gallery — `/media` — 5% (owner-blocked)
**Exists:** 5-category gallery grid (farm/alpacas/weaving/events/press) with lightbox, keyboard nav, captions, and photographer-credit fields — all gated behind `hasLiveMedia()`. Empty-state with "View gallery" + Instagram CTAs. JSON-LD, OG, noindex until live.
**Buildable now:** Add a booking/experience CTA to both branches; embed the Instagram feed instead of a bare link; add category jump-links.
**Owner-blocked:** All photographs (none in `lib/data/media.ts`; `public/images/gallery/` has only `.gitkeep`), photographer credits, press spread scans (need rights clearance), FareHarbor IDs for a CTA.
**Peer comparison:** The incumbent (wishfulfillingweaving.com) has 26 named image categories, an embedded live Instagram feed, and named photographer credits, using the gallery as a primary trust/conversion surface. Ours ships a two-sentence empty state and an external link. The infrastructure is complete and well-engineered, but a gallery with no images signals an unfinished product — the single most visually impactful gap on the site. No code work needed; purely owner content.

### 2. Weaving Collection — `/weaving/collection` — 12% (owner-blocked)
**Exists:** Correct route, metadata, breadcrumbs, back-link, 6-card grid (photo slot, title, "Price on request", Enquire mailto, Commission CTA), OwnerConfirmBanner.
**Buildable now:** Wool-to-product copy, care/fibre-content blocks, cross-sell to adopt/workshops, availability/lead-time signalling.
**Owner-blocked:** All 6 product names, photos (`public/images/weaving/` doesn't exist), prices, real product count, enquiry-flow confirmation.
**Peer comparison:** The live Squarespace version this replaces is itself gallery-only/made-to-order-by-email — but it shows real photographs and named descriptions, making this redesign **strictly inferior to the page it targets**. Against broader wool-product peers it lacks every universal minimum: images, named items, price anchor, fibre copy, social proof. Scaffold is ready; nothing beyond owner content is code-buildable.

### 3. Press — `/press` — 28% (owner-blocked)
**Exists:** Accurate 6-outlet roster (Gazet van Antwerpen Metropool, Gazet van Antwerpen, HLN, HLN Kempen, Tribes & Nomads, Diario de Ibiza), failsafe dashed placeholder cards, conditional live-grid that auto-activates on first logo, Press Inquiries CTA, JSON-LD, noindex.
**Buildable now:** Conditional logic ready; nothing further until assets arrive. Could add a dedicated press-contact field structurally.
**Owner-blocked:** Logo files, article URLs, publication dates (2017/2019/2021), pull-quotes, press-kit assets, named press contact.
**Peer comparison:** Every peer with a press section — including the direct Dutch analogue — leads with outlet logos and links to articles. With all logoUrl/articleUrl null the page is functionally an empty state and is noindexed, contributing nothing to SEO. The skeleton is excellent and auto-activates the moment one logo lands; the gap is entirely owner-blocked.

### 4. Journal — `/journal` — 30% (partial)
**Exists:** Full blog engine — card grid, server-side search, per-post page with reading-progress, TOC, share buttons, related-posts, BlogPosting + Breadcrumb JSON-LD, RSS link in head, 7-category taxonomy, fail-quiet empty state. 1 live post ("Spinning the first skein", San, 2026-05-12).
**Buildable now:** Category-filter UI on index, pagination/load-more, newsletter signup in the journal flow, booking/experience cross-sell, author-bio section, confirm/build the `/journal/rss.xml` route (declared but not confirmed present).
**Owner-blocked:** Per-post hero images, additional posts (farm-life/alpacas/seasonal/recipes/press all empty), author photos/bios.
**Peer comparison:** Implementation quality is above peer norm; content depth is near-zero (1 post). Peers use the blog as a primary trust/SEO driver (cria announcements, press posts, workshop recaps). The two functional gaps vs peers — no newsletter hook and no booking cross-sell inside content — are treated as mandatory by mature operators.

### 5. Shop: Woven — `/shop/woven` — 32% (partial)
**Exists:** 6 named products (scarf, blanket, throw, cushion, wall hanging, poncho), "Contact for pricing", per-item commission-enquiry CTA, ItemList JSON-LD, keyword-rich meta, hreflang, rate-limited honeypot form behind it.
**Buildable now:** Product descriptions (material/dimensions/weave/care), wool-to-product traceability paragraph, maker statement for San, shipping/returns line, cross-sell row, lead-time text, FAQ.
**Owner-blocked:** Product photography (`media.ts` empty), pricing decision, per-item material details, maker bio copy, finished-piece gallery photos.
**Peer comparison:** Scaffold is ahead of a placeholder, but every card renders an emoji icon and no purchase-decision info exists. The enquiry-only model matches the incumbent norm, but hiding all imagery and price behind an email form is below the minimum bar — and the incumbent at least shows real textile photos. Gap is almost entirely owner-blocked.

### 6. Home — `/` — 38% (partial)
**Exists:** Hero with dual CTA (Book→FareHarbor, Shop), hardcoded trust eyebrows, ChoicePaths 4-card grid (real copy, gradient placeholders), WeavingShowcase (legacy CSS loom), 6-item features grid, 3 ExperienceCards (placeholder), 3 real Facebook reviews (named, dated), newsletter (GDPR double opt-in), LocalBusiness + WebSite JSON-LD, UTM passthrough, full metadata. AwardsBadges/AlpacaOfTheDay/AdoptersCounter/GoogleReviewsBadge all wired but render null.
**Buildable now:** Import and place the existing PressLogos component; surface at least one price; add Adopt and Gift CTAs; place FAQ (content already in translations); add a herd/named-alpaca teaser; founders' story teaser.
**Owner-blocked:** Photography for all 7 card slots, real weaving images, awards/press logo files, Google Places keys, Mollie/Stripe for adopter count, FareHarbor item IDs.
**Peer comparison:** Strong code skeleton (dual CTA, multi-path nav, real reviews, newsletter, JSON-LD) but as shipped it shows no rating badge, no press logos, no pricing, and no real photos — every visual card is a gradient. Peers lead with animal/farm imagery; that absence plus a dark trust layer keeps it at 38%.

### 7. Romantic Sunset — `/experiences/romantic-sunset` — 38% (partial)
**Exists:** Hero + FareHarbor CTA (fail-open), 3 feature cards (champagne/photos/privacy), unique proposal-upsell section, SpotsLeftBanner, AdoptCrossSell with pricing, full metadata, all `romantic.*` keys present.
**Buildable now:** Inclusions checklist, FAQ, related-experience cross-links, pass a herd photo to AdoptCrossSell.
**Owner-blocked:** `FAREHARBOR_ITEM_ROMANTIC_SUNSET`, hero photo, per-person price, duration/group-size/age data, AdoptCrossSell photo.
**Peer comparison:** More polished than a stub and the proposal upsell is a genuine differentiator, but it falls below norm on the two conversion drivers: no visible price (explicitly below norm) and no real photography (gradient hero signals an unfinished page). No logistics panel or testimonial either.

### 8. Weaving — `/weaving` — 38% (partial)
**Exists:** Hero, studio history (San 2013, Big Ben loom, 92-yr-old master weaver), 4-step process cards (natural dyes: hibiscus, avocado), two CTAs (collection, commission), yoga + workshops cross-sell, collection sub-page scaffold, OwnerConfirmBanner, metadata, breadcrumbs.
**Buildable now:** FAQ (lead times, shipping, fibre care, alpaca-vs-wool), surface the adopt 10%-weaving-discount as an upsell, named-alpaca fleece-provenance hook, seasonal workshop context, traceability copy.
**Owner-blocked:** 3 photo slots (studio/loom/scarves) all empty, 6 collection product items, enquiry-flow confirmation, weaving discount code.
**Peer comparison:** Copy matches or exceeds the incumbent's information page, and the scaffold is fully wired — but every visual element is empty (gray boxes), making it non-viable for launch despite launch-ready copy. Also lacks testimonials, star rating, social proof, FAQ, and pricing signal.

### 9. Experiences Hub — `/experiences` — 42% (partial)
**Exists:** Breadcrumbs, hero, ExperienceCompare 7-card grid (tour/yoga/workshops/romantic/family/weddings/corporate) with vibe badges, facts strips, inclusions, Learn-more CTAs. Prices from config (€30 tour/yoga) or "On request". Child deep-link pages for romantic/family. SEO complete.
**Buildable now:** **Add the 14 missing en.json keys** (`experiences.*.title`, `*.oneLiner`, `vibe.*`) — currently the page renders raw key strings, a visible regression. Add reviews/ratings, FAQ, gift cross-sell, adopt cross-sell, newsletter, vibe filter.
**Owner-blocked:** Hero + per-card imagery, FareHarbor IDs (romantic/family/corporate), Google Places keys, pricing confirmation for bespoke products.
**Peer comparison:** Ahead of peers on breadth (7 types) and booking infra, but two compounding gaps cut completeness: raw i18n key strings rendering as display text, and zero imagery/reviews/FAQ/gift cross-sell/trust signals. Reads as a bare comparison table rather than an engaging landing page.

### 10. Weddings & Photoshoots — `/weddings` — 42% (partial)
**Exists:** Real copy, 5 use-case cards, welfare trust section, 4-item FAQ + JSON-LD, dual CTA (FareHarbor + contact pre-filled), SpotsLeftBanner, AdoptCrossSell, Service + LocalBusiness + Breadcrumb JSON-LD, OG image, dev owner-input banner.
**Buildable now:** Cross-sell to yoga/tours, surface a starting-from anchor once owner supplies it, richer cancellation terms.
**Owner-blocked:** Hero photo, alpaca-count/duration/travel-radius/handler/photographer arrangement (all "Contact for details"), pricing, `FAREHARBOR_ITEM_WEDDINGS`, sample gallery, testimonials.
**Peer comparison:** Structurally complete but trails every credible peer on the three elements that convert wedding inquiries — imagery, social proof, pricing anchor. "What's Included" is four "Contact us" cards and the hero is a gradient, so couples can't visually validate the product. All blocking gaps are owner content.

### 11. Sustainability — `/sustainability` — 42% (partial)
**Exists:** Real title/subtitle, 6 thematic prose cards (welfare/weaving/dyes/zero-waste/land/sourcing), 14-name herd pill-cloud, AwardsBadges wired (category=sustainability), JSON-LD, trust-link band to about/press/contact, OwnerConfirmBanner.
**Buildable now:** Booking CTA, wool-to-product traceability chain, FAQ/practical-info, newsletter, surface years-in-operation.
**Owner-blocked:** Hero photo, eco-cert logos (awards array empty), finca size in hectares (UNMAPPED), agritourism registration, owner sign-off on 5 OWNER_REVIEW_TRANSLATION texts, alpaca bios/photos.
**Peer comparison:** Real, substantive content and correctly wired to receive badges — but in production no eco-cert badges are visible (the documented peer norm is 3 ecological badges), no booking CTA, no star rating, gradient hero. Beats the incumbent (which has no sustainability page) but ~40% of the depth of Spring Farm / alpacawalking.

### 12. Shop: Commission — `/shop/commission` — 45% (partial)
**Exists:** Best-in-class structured inquiry form (name/email/phone, 6 project-type cards, size, budget slider €100–5,000, timeline pills + date picker, up to 5 reference URLs, GDPR), Resend email backend, Turnstile + honeypot + rate limit + XSS/CRLF guards, localStorage draft, `?product=` pre-fill, success state.
**Buildable now:** **Add missing en.json keys** (budget buckets, timeline labels, projectType labels, helpers) — non-EN locales fall back to hardcoded English. Add process walkthrough, indicative price guide, lead-time line, WhatsApp fallback link, cross-sell.
**Owner-blocked:** Completed-commission photos, starting price, lead time, testimonials, deposit/revision policy.
**Peer comparison:** The form is meaningfully above the peer baseline for bespoke craft inquiries. But it's weaker than every mature commission peer on content: no portfolio images, no process narrative, no indicative pricing, no testimonials — it feels like an empty form landing. The incumbent shows gallery + process + pricing context before the form.

### 13. Shop Hub — `/shop` — 48% (partial)
**Exists:** 4 category cards (Woven, Commission, Alcaca, Skein), all 4 sub-pages exist (EN+NL real), Alcaca has real photos, Commission wired to spam-protected form, Skein fully built with Stripe checkout (€200), ItemList JSON-LD, SEO, FareHarbor category helpers in config (unused).
**Buildable now:** Wool traceability story, experience cross-sell, newsletter, gift-voucher path for woven goods, wire or remove the dead FareHarbor category IDs, sold-out/low-stock states (keys exist).
**Owner-blocked:** Woven photography, woven/commission/alcaca pricing decisions, Stripe/Mollie product IDs, discount codes.
**Peer comparison:** Engine is solid; Skein is the most complete product page on the site and Alcaca the strongest sub-page. But the woven core shows emoji + zero prices — below every peer running a shop, and even the incumbent shows product images. Lacks trust signals, traceability, and a woven gift-voucher path that are table-stakes at mature wool operators.

### 14. About — `/about` — 52% (partial)
**Exists:** Rich dated origin story (Bart & San, 5 alpacas 10 Aug 2019, growth to 14, Maria, Es Currals etymology), 4 values cards, Wishfulfilling Weaving section (Big Ben, natural dyes), Founder Person JSON-LD, AwardsBadges slot, accurate metadata, OG.
**Buildable now:** Add a conversion CTA (Book/Adopt/Meet the herd), press logo strip, testimonials, herd cross-link, milestone timeline, FAQ teaser, social links, video slot.
**Owner-blocked:** Founder portraits, award logos, OWNER_REVIEW_TRANSLATION on story/weaving/4 values, OG image.
**Peer comparison:** Narrative content is genuinely stronger than many peers — specific, dated, emotionally grounded. But the page is entirely text: no founder photos, no CTA, no press logos, no testimonials, no herd cross-link. The absence of any conversion path from a high-intent page is the sharpest gap; 5 of 6 prose blocks are unconfirmed translations.

### 15. Corporate Team-Building — `/experiences/corporate-team-building` — 52% (partial)
**Exists:** Hero + contact CTA, FareHarbor calendar (env-gated), SpotsLeftBanner, bespoke CorporateEnquiryForm (company/contact/email/size/month/message, Turnstile + honeypot), 4 "why" cards, 4-step itinerary, CTA banner, 5-item FAQ (group 5–40), AdoptCrossSell with pricing, LocalBusiness + FAQPage JSON-LD, dynamic OG.
**Buildable now:** Upsell links to yoga/weaving, weather/accessibility/dietary FAQ items, surface a starting-price once supplied.
**Owner-blocked:** 3 images (hero, team-with-alpacas, weaving-workshop), `FAREHARBOR_ITEM_BUSINESS_INCENTIVES`, pricing decision, named clients/testimonials, AdoptCrossSell photo.
**Peer comparison:** More complete than most peer corporate pages and far beyond the incumbent's single-paragraph version — dedicated calendar, bespoke form, timed itinerary, real FAQ. Gaps vs higher performers: all 3 images missing (biggest defect), no upfront pricing, no B2B-specific social proof.

### 16. Family Farm Days — `/experiences/family-farm-days` — 52% (partial)
**Exists:** Hero + Book CTA (fail-open), FareHarbor calendar, SpotsLeftBanner, education section (3 learning points), safety section (4 cards), 4-image gallery scaffold, 3-item FAQ + FAQPage JSON-LD, AdoptCrossSell, LocalBusiness JSON-LD, i18n metadata.
**Buildable now:** Static price/logistics panel, related-experience upsell row, age-banded pricing table, map embed.
**Owner-blocked:** 7 image files (all reference non-existent `.webp`), `FAREHARBOR_ITEM_FAMILY_FARM_DAYS`, per-person price, AdoptCrossSell photo, Google Places keys.
**Peer comparison:** Ahead of the incumbent (no family page) and matches mid-tier booking infra. Trails on three conversion dimensions: no static price anchor, no on-page testimonials/rating, no related-experience row. Most acute: 7 image slots reference files that don't exist, so the page renders empty image areas.

### 17. Shop: Alcaca — `/shop/alcaca` — 52% (partial)
**Exists:** Hero ("Alcaca Oro Negro"), 2 real CDN photos, detailed origin story (65-hr digestion, Bart's manual filter, odorless pellets), 3 tiers (125g/standard/bulk), per-tier Enquire CTA → commission form, 4 factual benefit statements, ItemList JSON-LD, full SEO.
**Buildable now:** Usage/application guide, FAQ (organic cert/edible-safe/shelf-life), shipping info, sustainability/manure-to-bag closed-loop copy, cross-sell.
**Owner-blocked:** Tier prices (explicit OWNER_INPUT_NEEDED), `FAREHARBOR_ITEM_ALCACA`, per-tier photos, certification details, shipping policy.
**Peer comparison:** Stronger than a placeholder — genuine differentiated copy, real photos, working enquiry path. Falls short on two product-page norms: all pricing hidden behind enquiry, and no online checkout despite a FareHarbor slot existing. The "Oro Negro" framing and closed-loop provenance are genuine differentiators.

### 18. Yoga — `/yoga` — 52% (partial)
**Exists:** Verified €30/person, 1h15m Hatha, max 6, Wed/Sat, paddock setting, fact grid, FareHarbor CTA (fail-open), private-group mailto, 4-item FAQ, AdoptCrossSell, SpotsLeftBanner, LocalBusiness + SportsActivityLocation + Event JSON-LD, breadcrumbs, OwnerConfirmBanner.
**Buildable now:** Related-experience cross-links, age minimum, accessibility guidance.
**Owner-blocked:** Hero photo, `FAREHARBOR_ITEM_YOGA`, exact start time, off-season schedule, mat provision, instructor name/bio (Elena, 10+ yrs, Hatha — known from incumbent, needs confirmation).
**Peer comparison:** Beats the incumbent on facts (price/duration/cap/schedule/cancellation all surfaced where the live site buries them) and adds schemas + FareHarbor. But unnamed instructor, no testimonials, no star rating, gradient hero, and two deferred facts (start time, mats). The aggregator listing shows 4.9/5 from 34 reviews — none surfaced here.

### 19. Tours — `/tours` — 62% (partial)
**Exists:** Hero + Book CTA, 4 tour-type cards, TourComparison with per-product Book CTAs, 5-step timeline, Plan-Your-Visit panel (hours, location, from €30), Special Events CTA, 10-item FAQ (incl. 48h cancellation), inline FareHarbor calendar (lazy + noscript), CancellationBadge, AvailabilityUrgency, 6 named multilingual reviews + translate toggle, what-to-bring checklist, Adopt cross-sell (€75/€900), TouristTrip + FAQPage JSON-LD.
**Buildable now:** Named-herd cross-link, gift-voucher CTA, yoga upsell, make WhatsApp text a real link, clearer voucher-rebooking cancellation terms.
**Owner-blocked:** Real duration/price/capacity for the comparison table (all "Contact for details"), 4 per-tour FareHarbor IDs, social-proof pool, tour photography, Google Places keys, TripAdvisor embed.
**Peer comparison:** Meaningfully ahead of a scaffold — real prose, working booking embed, 10-Q FAQ, 6 authentic reviews, adopt cross-sell. Matches/exceeds most peer tour pages structurally. Primary gap: comparison table shows "Contact for details" instead of real values (upfront pricing is near-universal). Secondary: no live rating, no herd cross-link, no map, no gift/yoga upsell.

### 20. Gifts — `/gifts` — 62% (partial)
**Exists:** Hero + voucher CTA, 4-reason why-gift, 4-step GiftFlow wizard (type/recipient/message+date/review+consent), pricing on cards (tour from €45, monthly €75, yearly €900, custom credit), FareHarbor + Stripe/Mollie routing, FareHarbor fallback embed, CancellationBadge, GDPR ConsentNotice, full i18n, SEO, breadcrumbs, fail-open fallback.
**Buildable now:** **Render the dead `gifts.faq` section** (translations exist, nothing renders), **resolve the €45-vs-€30 price conflict**, add social proof, redemption T&Cs, cross-sell, voucher preview.
**Owner-blocked:** `FAREHARBOR_ITEM_GIFT_CARD`, Stripe adopt price IDs, Mollie keys, branded voucher template, discount codes, tour-price clarification, voucher sample image.
**Peer comparison:** Above average for an early-stage operator — multi-step wizard, 4 giftable products, payment routing, upfront pricing, scheduled delivery, GDPR — absent entirely from the incumbent. Real gaps are execution-layer: dead FAQ (a code bug, not owner-blocked), no social proof, no voucher preview, and the €45/€30 inconsistency that will confuse buyers. Lacks physical gift-box option and redemption T&Cs vs UK peers.

### 21. Workshops — `/workshops` — 62% (partial)
**Exists:** Hero + "Request a Workshop Date" CTA, 4-item curriculum, 6-card facts grid (2 days, San, group/schedule/price = contact, scarf takeaway), About San (verified), how-to-book (off-season/on-request), 4-item FAQ, AdoptCrossSell, SpotsLeftBanner, LocalBusiness + Course + HowTo JSON-LD, breadcrumbs.
**Buildable now:** Related-experience + gift cross-links, surface a from-price once supplied, named-alpaca fleece reference, natural-dyeing curriculum mention, inline WhatsApp link.
**Owner-blocked:** Photography (San at loom, fleece, scarves), exact price, max group size, off-season months, lunch arrangement, `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP`, natural-dyeing confirmation.
**Peer comparison:** Structurally sound and factually honest — correctly represents the on-request artisan product without inventing detail. At/above norm on factual honesty, schema depth, FAQ. Below norm on imagery (none), pricing (hidden), and social proof (none).

### 22. Skein Sponsorship — `/skein` — 62% (partial)
**Exists:** Hero, 3-step how-it-works, AlpacaPicker (14 chips, URL-state), SkeinGiftToggle, €200 single-tier card, Stripe one-off checkout via `/api/skein-checkout`, "Pick for me" fallback, EU-shipping/October trust line, scarcity (14 slots), 4-item FAQ, cancelled-checkout banner, thank-you page, homepage callout (env-gated), shop card link, privacy coverage, metadata.
**Buildable now:** **Fix the hardcoded `/adopt` URL in alpaca-picker.tsx (line 54)** that routes skein users to adopt; add nav link; cross-sell; refund/cancellation copy; wool-spec copy; shipping detail.
**Owner-blocked:** Alpaca photos/bios (12/14 null), birth dates (10/14), `SKEIN_CALLOUT_LIVE` flag, Stripe key, Stripe Tax activation, spinning-mill name.
**Peer comparison:** A structurally complete conversion flow for a novel product with no direct peer equivalent — production-quality checkout, gift metadata, cancellation recovery. Shortfalls: emoji-only picker (shallow emotional hook vs photo-rich peer profiles), zero imagery, no social proof, undiscoverable behind an env flag, and a functional /adopt routing bug to fix before going live.

### 23. Visit — `/visit` — 72% (partial)
**Exists:** Hero, getting-here (car/airport/bus/GPS with Google + Apple deep links), on-arrival (parking/meeting point/duration/what-to-bring), accessibility (mobility/children/pets/service animals), cancellation (24h/weather/late-fee), photo policy (personal vs commercial), footer CTA strip, Place + LocalBusiness JSON-LD, breadcrumbs, all-real translations.
**Buildable now:** Embed the OSM map (MapProvider exists, no API key needed), wire an inline FareHarbor CTA instead of redirecting to /tours, surface opening hours and group-size/age cap, add a Google Reviews badge, FAQ framing.
**Owner-blocked:** Balearic agritourism registration number, session days/times, Google Places key+ID.
**Peer comparison:** Structurally solid and above stub — real content, verified GPS, credible cancellation policy, 5 distinct sections. Falls short on two conversion-critical peer elements: inline booking CTA (vs redirect) and an embedded map (vs text links). Minor gaps: no opening hours, no group-cap restatement. No placeholder text — deficit is structural, not content-pending.

### 24. Adopt-a-Paca — `/adopt` — 72% (partial)
**Exists:** Hero, upfront €75/mo + €900/yr, two-tier cards with Mollie/Stripe/mailto routing, 7-row comparison table, all 14 alpacas in picker, personality quiz, 7-item benefits, adoption timeline, certificate preview, gift flow, referral banner, campaign banner, 7-Q FAQ, trust strip, GoogleReviewsWall (fail-quiet), TestimonialsWall (seeded), adopters counter + wall, billing portal, sticky mobile CTA, EU Art 16(m) waiver, Product/Offer + AdoptAPacaService JSON-LD, GA4, thank-you with SEPA-pending state, CDN images + bilingual bios in tenant module.
**Buildable now:** Wire the existing CDN photos into the picker (currently reads from a source where image is null → emoji); add tiered packages; experience cross-sell; press strip; founder story; fill empty translation keys (comparisonSubtitle, alpacaGridSubtitle, alpacaUnmappedBio).
**Owner-blocked:** Payment credentials, Google Places keys, discount codes, **EU withdrawal-waiver legal copy (hard launch blocker)**, EN bio sign-off, real testimonials, max-adopters cap.
**Peer comparison:** The most feature-complete conversion page on the site and ahead of every peer audited — only operator with a personality quiz, gift flow, adopters wall, certificate preview, SEPA-pending state, and referral mechanism. €75/€900 is the only public adopt pricing in the entire peer set. Gaps are structural: peers use 3–4 tiers (Bronze/Silver/Gold) vs our single tier at two frequencies; peer pickers show portraits not emoji; testimonials are seeded; the EU legal placeholder blocks launch.

### 25. Alpacas Herd — `/alpacas` — 72% (partial)
**Exists:** All 14 named alpacas, bilingual bios, CDN portraits, breed (all Huacaya), personality tags, fun-facts, URL-driven filter chips with live count, AlpacaFunFactCarousel, per-card detail links, adopt-me CTA per card, breadcrumbs, LocalBusiness + TouristAttraction JSON-LD, per-alpaca OG images, individual detail pages, empty-state.
**Buildable now:** Booking CTA on the listing, origin-story hook, fix the color-filter mismatch (filter uses fawn/orange; i18n declares mixed, missing fawn/orange keys), testimonials/rating widget, cria announcement section.
**Owner-blocked:** Hero background photo, birth dates for 11/14, owner review of 14 EN bios.
**Peer comparison:** Stronger than the incumbent (Onze Alpacas) and on par with UK mid-tier on roster depth — bilingual bios, portraits, breed/personality/fun-fact data, detail pages, and an interactive filter no peer offers. Main gaps: no booking CTA on the listing, no social-proof layer, missing hero photo (visually weaker at first glance), and 11/14 birth dates null.

### 26. Alpaca Profile — `/alpacas/[slug]` — 72% (partial)
**Exists:** All 14 wired with CDN portraits, bilingual bios (NL verbatim + EN auto), personality tagline, fun-fact callout, breed badge, color badge (graceful when null), "Adopt [Name]" CTA pre-selecting the picker, back-to-herd link, Web Share (mobile), peer grid (up to 6), breadcrumbs, AboutPage + Animal JSON-LD, per-alpaca metadata.
**Buildable now:** Experience booking CTA on the profile, hyperlink family relationships to sibling/parent profiles, carry the fun-facts carousel here, build the referenced-but-missing per-alpaca `opengraph-image.tsx`.
**Owner-blocked:** Age for all 14 (badge never renders), EN bio sign-off, per-alpaca OG image, adopt discount codes.
**Peer comparison:** Ahead of the incumbent (photo + short Dutch bio, no CTA) — adds bilingual bios, badges, fun-fact callout, pre-selected adopt CTA, peer grid, Animal JSON-LD. Vs mature UK/Irish peers: no experience-booking CTA on the profile (peers always bridge animal→bookable walk), no age data, single portrait vs a small gallery, missing per-alpaca OG image.

### 27. Contact — `/contact` — 72% (partial)
**Exists:** Production-grade form (name/email/subject dropdown/phone/message, validation, Turnstile, honeypot, rate limit, GDPR), info panel (real phone +32 475 58 65 44, info@alpacasibiza.com, "Ibiza, Spain", by-appointment), TenantMap OSM/Google iframe at verified GPS, getting-here cards (PM-810), breadcrumbs, SEO, `?subject=` pre-fill, localStorage draft, accessible states, site-wide FloatingWhatsApp.
**Buildable now:** Inline WhatsApp as a named channel, social links, a Book-a-tour CTA beside contact info, per-channel response-time SLA, cross-link to /visit, FAQ snippet.
**Owner-blocked:** Google Maps Embed key, Google Places key+ID, postcode confirmation (07850 vs 07819), canonical Instagram handle, Google review shortlink.
**Peer comparison:** Substantially above a placeholder — real, production-grade form with CAPTCHA/honeypot/rate-limit/GDPR/draft persistence, plus real map and directions. Gaps are all on the contact-info side: no full street address (only "Ibiza, Spain"), WhatsApp only via floating button, no social links, no booking CTA, no rating widget. None are code problems.

---

## 5. Owner-Blocked vs Buildable Split

### (a) Buildable now — a developer can close these without owner input
1. **Experiences hub:** add the 14 missing `experiences.*.title / *.oneLiner / vibe.*` en.json keys (page currently renders raw key strings).
2. **Commission:** add missing `commission.form.*` keys (budget buckets, timeline, projectType, helpers) so non-EN locales stop falling back to hardcoded English.
3. **Gifts:** render the dead `gifts.faq` section (translations exist) and resolve the €45-vs-€30 tour-price inconsistency.
4. **Skein:** fix the hardcoded `/adopt` URL in `alpaca-picker.tsx` line 54; add a main-nav link.
5. **Adopt & Skein pickers:** wire the existing CDN photos into the picker components (photos are in the tenant module; pickers read a null-image source → emoji).
6. **Home:** import and place the existing PressLogos component; surface the FAQ (content in translations); add Adopt/Gift CTAs and a herd teaser.
7. **Visit:** embed the OSM map (MapProvider needs no API key); wire an inline FareHarbor CTA instead of redirecting to /tours.
8. **Alpacas herd:** fix the color-filter i18n mismatch (filter uses fawn/orange; keys declare mixed, missing fawn/orange).
9. **Alpaca profile:** build the referenced-but-missing per-alpaca `opengraph-image.tsx`; hyperlink family relationships.
10. **Contact:** add inline WhatsApp channel, social links, a booking CTA, and a cross-link to /visit.
11. **Journal:** category-filter UI, pagination, newsletter hook, booking cross-sell; confirm/build `/journal/rss.xml`.
12. **Cross-sell/upsell rows** missing on most experience and shop pages (yoga/tours/adopt/gift links) — all buildable from existing routes.
13. **Adopt:** fill empty keys (comparisonSubtitle, alpacaGridSubtitle, alpacaUnmappedBio).

### (b) Owner-blocked — needs the owner (no code can fix)
1. **Photography** (the dominant gap): hero images for nearly every page; product photos (woven, alcaca tiers, collection); founder portraits (About); gallery images (`/media` — entirely empty); workshop/weaving/yoga/wedding/family/corporate/romantic imagery; alpaca picker portraits.
2. **Pricing decisions:** tours comparison values, woven/commission/alcaca prices, weddings, workshops, corporate, romantic, family per-person prices.
3. **FareHarbor item IDs:** per-tour (4), yoga, weddings, corporate, romantic, family, gift card, weaving workshop, alcaca.
4. **Payment/API keys:** Mollie + Stripe (adopt, skein, gifts), Stripe Tax activation, `GOOGLE_PLACES_API_KEY` + `PLACE_ID` (every Google Reviews badge), Google Maps Embed key.
5. **Legal/compliance:** EU Art 16(m) withdrawal-waiver copy (**hard launch blocker on /adopt**), Balearic agritourism registration number, postcode confirmation (07850 vs 07819).
6. **Press assets:** outlet logos, article URLs, publication dates, press-kit, press contact.
7. **Content sign-off:** OWNER_REVIEW_TRANSLATION on all 14 EN bios and About/Sustainability prose; instructor name/bio (Elena); spinning-mill name; finca hectares.
8. **Owner data:** alpaca ages (all 14), birth dates (11/14 herd, 10/14 skein), max-adopters cap, session days/times, off-season months, mat provision, lunch arrangement.
9. **Awards/cert logos** for AwardsBadges (Home, About, Sustainability — arrays empty).
10. **Discount codes:** `ADOPT_DISCOUNT_CODE_WEAVING_10`, `ADOPT_DISCOUNT_CODE_FARMSHOP_15`.
11. **Env flag:** `SKEIN_CALLOUT_LIVE` (page undiscoverable until flipped).

---

## 6. Bottom Line

**Where we beat peers (factually):**
- **Adopt-a-Paca** is the most feature-complete adoption flow in the entire peer set — personality quiz, gift flow, adopters wall, certificate preview, SEPA-pending state, referral codes — none of which appear on any competitor, and it carries the only public adopt pricing found anywhere (€75/€900).
- **Alpacas herd + profiles**: an interactive filterable roster with bilingual bios, per-animal OG images, and detail pages that no peer offers — ahead of the incumbent and UK mid-tier.
- **Skein sponsorship**: a novel per-animal wool-sponsorship product with production-grade Stripe checkout that has no peer equivalent.
- **Structured data, i18n, and booking infrastructure** are consistently above peer norm site-wide.
- The redesign adds **Gifts, Sustainability, Workshops, Family Days, Corporate, FAQ depth, and a real journal engine** that the incumbent entirely lacks.

**Where we match peers:**
- **Tours** (FAQ, reviews, booking embed, adopt cross-sell), **Contact** (production-grade form + map), **Visit** (logistics + GPS), **About** narrative (specific, dated origin story), and **Yoga/Workshops** factual depth all sit at or near peer parity on structure and content.

**Where we genuinely lag (factually):**
- **Photography** — the single biggest deficit. Nearly every visual slot renders a CSS gradient or emoji placeholder; `/media` and `/weaving/collection` ship effectively empty. Peers lead with animal/farm imagery on every page.
- **Visible pricing** — most product/experience pages show "Contact for details"; peers display upfront or "from €X" pricing as a near-universal norm.
- **Live trust signals** — Google Reviews badges, TripAdvisor, and press logos are all wired but dark. No TripAdvisor integration exists at all. No live star rating renders anywhere.
- **Universal small gaps** — full street address, Instagram feed embed, agritourism licence number, tiered adopt packages, wool-to-product traceability chain, and any video content are absent across the board.

The verdict in one line: **the build is engineered ahead of its content.** Close the buildable list and the average jumps a few points; but the path to peer parity runs through owner-supplied photography, pricing, FareHarbor IDs, and API keys — not more code.
