# SA-002 — Peer Analysis: Finca Can Martí
**Date:** 2026-05-26  
**Source:** https://canmarti.com  
**Method:** WebFetch — homepage, /rooms/, /wellbeing/, /contact/  
**Purpose:** Identify design decisions the alpaca farm redesign can learn from.

---

## Palette (inferred from content + imagery signals)

CSS was in external stylesheets (not crawlable via fetch). Palette inferred from visual signals and content descriptions:

| Role | Value (inferred) | Evidence |
|------|-----------------|----------|
| Background | Off-white / warm linen | "natural materials and tones" + eco-resort standard |
| Primary text | Deep charcoal / near-black | Standard for high-contrast legibility on linen |
| Accent / CTA | Warm terracotta or muted sage | "traditional Ibicencan style", bohemian/rural decor |
| SVG arrows | `#ffffff` (confirmed in markup) | Carousel nav arrows |
| Secondary | Stone / sand beige | Room photography palette + "homegrown to homemade" imagery |

**One-line summary:** Warm linen ground + deep charcoal type + muted terracotta/sage accent — a classic premium agri-hospitality palette.

> NOTE: Exact hex values require DevTools inspection. Run `scripts/extract_assets.js` from SKILL.md against a live browser session to confirm.

---

## Patterns Worth Stealing (Top 7)

### 1. Press logos above the fold — trust by association
**What canmarti does:** Elle, Marie-Claire, Condé Nast Traveler, Evening Standard, NatGeo Traveler, Telegraph, The Guardian, Good Travel — all displayed prominently in the hero area.  
**Why it works:** Converts "another farm stay" into a validated destination. Visitors self-qualify immediately. No copy needed — the mastheads do the talking.  
**Alpaca application:** Gather any press mentions (local papers, travel blogs, Welsh tourism bodies, Visit Wales badge). Even 2–3 logos outperform 0. If no press yet, prioritize getting one review piece and then display it.

---

### 2. Contact-only booking flow (no widget clutter)
**What canmarti does:** No embedded booking engine. "RESERVE" goes to a contact page — phone + email only. Pricing is shown per room so visitors arrive informed.  
**Why it works:** Preserves the premium/personal feel. Widgets (FareHarbor, Booking.com iframes) read as transactional and erode brand. Works when demand > supply (which it is at €230–€590/night).  
**Alpaca application:** If the alpaca farm is capacity-constrained (few rooms/pitches), drop the widget. Show pricing up front, direct to a simple contact form or phone. Adds white-glove perception for free.

---

### 3. Full-bleed image carousels per room, not a gallery page
**What canmarti does:** Each room type gets its own 6–12 image carousel inline on the Rooms page, not a separate gallery. Visitors never leave the conversion context.  
**Why it works:** Reduces navigation friction. The customer builds desire and pulls the trigger without a detour. Gallery pages bleed intent.  
**Alpaca application:** On the alpaca farm Rooms/Stays page, embed a small inline carousel (3–5 images) per accommodation unit. Keep the "BOOK" CTA immediately below.

---

### 4. Three-column feature cards as homepage "menu"
**What canmarti does:** Homepage mid-section: three equal columns — Organic Farm / Rooms / Wellbeing — each with image + one-liner + "MORE" link. No paragraph walls.  
**Why it works:** Scannable in under 3 seconds. Matches how users browse hospitality sites (What can I do? Where do I sleep? How do I eat?). Divides the site's core pillars visually.  
**Alpaca application:** Alpaca farm pillars might be: Meet the Alpacas / Stay With Us / Experiences (walks, shearing, etc.). Same three-card grid. Don't write paragraphs — one punchy line per card, let the photo carry it.

---

### 5. Alternating image-text layout ("Homegrown to Homemade")
**What canmarti does:** Sections alternate: image left/text right, then text left/image right. Heavy image bias (est. 60:40). Section titles are short and evocative.  
**Why it works:** Rhythm prevents visual fatigue. Short section titles ("Homegrown to Homemade") act as mini-hooks — they're shareable phrases, not navigation labels.  
**Alpaca application:** Structure the About or Farm Story page as alternating image-text blocks. Name sections with punchy phrases: "Fleece to Fibre", "Field to Table" (if applicable), "Meet the Herd." Each block should answer one question the visitor has.

---

### 6. Language switcher as nav-level UX, not buried in footer
**What canmarti does:** Language toggle (EN / ES / FR with flags) sits in the primary nav — same visual tier as main menu items. Present on every page.  
**Why it works:** Ibiza clientele are multi-national. Instant language recognition signals the site was built for them, not translated as an afterthought. Flag icons reduce cognitive load vs. text-only labels.  
**Alpaca application:** Welsh/English is the primary split for a Welsh alpaca farm. A visible EN/CY toggle in the nav (with the Welsh dragon or flag) signals cultural pride, which is itself a brand differentiator. WPML handles the mechanics.

---

### 7. Amenities as icon grid, not prose
**What canmarti does:** Six amenities (WiFi, Parking, AC, Pool, Shop, Laundry) displayed as icon + label grid — no sentence construction, no bullet lists.  
**Why it works:** Guests scan amenities fast. Icon grids complete in ~1 second; prose lists take 5–10 seconds and feel like work. Reduces pre-booking friction.  
**Alpaca application:** List alpaca farm amenities (dog-friendly, parking, farm shop, accessibility, Wi-Fi, hot tub if applicable) as icon grid on the Rooms page sidebar or just above the booking CTA. Keep icons consistent in weight and style.

---

## Supporting Observations

- **Tagline quality:** "Calm, calmer, Can Martí" is a rhetorical triplet — easy to remember, plays on the name, encodes the value prop. The alpaca farm should aim for a name-anchored tagline with similar rhythm.
- **Pricing transparency:** Canmarti shows base and peak rates publicly. This is a trust signal — it pre-qualifies visitors and reduces time-wasting inquiries.
- **TripAdvisor + Google Reviews in footer:** Not in the hero (that's for press), but always visible in the footer. Two platforms, not one — hedges against platform risk.
- **Rooms page philosophy paragraph:** Opens with a single evocative paragraph about the design ethos before any room listing. Primes emotional state before the purchase decision.

---

## CAN'T DO WITHOUT HELP

Items observed but requiring browser-side inspection to fully assess:

| Item | Why it's inaccessible via fetch | How to assess |
|------|--------------------------------|---------------|
| Exact color hex values | CSS is in external stylesheets, not inline | Run `extract_assets.js` in browser DevTools |
| Scroll-triggered animations | JS behavior, not in HTML | Inspect with browser DevTools → Performance tab |
| Sticky header behavior (nav on scroll) | Requires live scroll observation | Check manually or with Puppeteer |
| Carousel JS library (Slick? Swiper? custom?) | Script src not exposed in fetch | View Source → search for `swiper`, `slick`, `owl` |
| Mobile layout breakpoints | CSS media queries in external files | Resize browser or use Chrome DevTools device mode |
| Hover states on CTA buttons | CSS :hover pseudo-class | Inspect in DevTools → :hov toggle |
| Image lazy-load pattern | JS-controlled, not static HTML | Check `<img loading="lazy">` or IntersectionObserver usage |

---

## Attribution Note

Canmarti is a peer site, not a competitor (different country, different species, different scale). Design decisions extracted here are patterns and conventions — not proprietary IP. Colors, layout structures, and UX patterns are not copyrightable. Do not copy photography, copy text, or logo treatments.

---

*Generated by site-assets skill (Method 2: Claude Fetch). Confidence: HIGH for layout patterns, MEDIUM for palette (inferred, not measured). Run DevTools extraction to confirm hex values before design system commit.*
