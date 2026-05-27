# SA-003 — Atzaró Peer Analysis
**Date:** 2026-05-26
**URL:** https://atzaro.com
**Context:** Luxury Ibiza agriturismo / agroturismo. Premium benchmark for the alpaca farm redesign.

---

## Palette

Inferred from brand imagery and site tone (no raw CSS extracted): warm terracotta + dusty sage + off-white linen + dark charcoal text. No pure whites, no corporate blue. Earthy but deliberately curated — the palette says "we picked these from the estate," not "we used a template."

---

## Premium Signaling Patterns (Top 5)

**1. Sustainability is a top-level nav item, not a footer footnote.**
It sits at the same hierarchy as Bedrooms and Restaurants. The message: eco is a product feature, not a compliance checkbox. Seven operational systems (solar, well water, organic compost, etc.) are enumerated with dedicated headings — specificity is the signal, not vague "we care about the planet" copy.

**2. Dual booking split by experience type.**
"BOOK A BEDROOM" routes externally to `bookings.atzaro.com`. "BOOK A TABLE" triggers an inline popup. This separation frames dining as an equally weighted luxury experience — not an amenity. It also lets them protect room rate integrity via a dedicated booking engine while keeping restaurant feel immediate.

**3. Pricing is structurally absent across all surfaces.**
Homepage, What's On, Sustainability, Spa — no price is ever shown. Luxury pricing signals are communicated entirely through photography, copy register, and curation. The absence itself is the signal: "if you're asking the price, reconsider the category."

**4. "What's On" is a persistent calendar, not a static events list.**
Weekly yoga classes are displayed with date-stamped slots (e.g., "Saturday 23.05.26") organized chronologically. This communicates a living estate with ongoing rhythm — not a venue that fills up between weddings. It implies the property is worth returning to repeatedly, which is the engine of premium loyalty.

**5. Copy register is aspirational-experiential, not descriptive.**
Headline: "the authentic heart of Ibiza. A magical nature-connected estate with unique style and glamour." No room specs, no square footage. Sustainability framing: "harmonises luxury with ecological responsibility, setting a benchmark for eco-conscious hospitality." They position themselves as the benchmark — active competitive claim, not hedged language.

---

## Green Globe Certification

Third-party validation (Green Globe logo) on the sustainability page. This is a recognized hospitality eco-standard — it anchors the operational sustainability claims to a credible external body. Alpaca equivalent: any livestock welfare, organic feed, or small-farm certification that a non-farm visitor would recognize.

---

## Do NOT Copy (Top 2)

**1. Hidden pricing across the board.**
Works for Atzaró because they're established, internationally known, and their audience self-selects as luxury travelers with flexible budgets. For a small alpaca farm attracting families, day-visitors, and local experience-seekers, zero pricing visibility creates friction and abandonment. Alpaca needs at least experience-tier pricing ("from £X") to convert the middle-market visitor who is weighing multiple options.

**2. Navigation depth before conversion.**
Atzaró has 14+ nav items under Hotel. This works because guests are already sold on the brand and exploring. Alpaca's primary conversion goal is a first visit — the nav should funnel to one action (book a farm experience) before branching into detail. Atzaró's depth is a retention pattern; it would hurt Alpaca's acquisition.

---

## CAN'T DO WITHOUT HELP (Runtime Behavior — Static Fetch Limits)

- **Actual color values**: CSS is compiled/bundled; WebFetch returns rendered markdown, not computed styles. True hex palette requires browser DevTools / computed style extraction.
- **Booking popup behavior**: "BOOK A TABLE" triggers `#booking-popup` — cannot assess the form fields, widget provider, or friction points from a static fetch.
- **Image lazy-loading + visual hierarchy**: Most event images returned as base64 placeholder GIFs — can't assess photography style, hero framing, or golden-hour mood without a real browser render.
- **Font rendering**: No `@font-face` or Google Fonts `<link>` was exposed in fetched markup. Actual typeface (likely a display serif + geometric sans combo based on brand register) needs DevTools > Fonts panel.
- **Scroll-triggered animations / parallax**: Common on luxury hotel sites; structurally invisible to static fetch.

---

## Alpaca Design Takeaways (Synthesis)

| Atzaró Pattern | Alpaca Adaptation |
|---|---|
| Sustainability as top-nav | Give welfare / grazing standards its own nav slot — not buried in About |
| Dual split booking | Split "Visit the Farm" from "Buy Alpaca Products" as distinct CTAs with distinct flows |
| Living calendar (What's On) | Weekly feeding times, shearing season, lambing updates — makes the farm feel alive, not static |
| Experiential copy register | Lead with sensory/emotional language ("meet the herd at golden hour") before logistics |
| Third-party cert anchor | One recognizable welfare or organic cert on homepage — specificity beats vague claims |
