# Reality Check — Redesign vs. Live Site vs. Competitor Norms

**Generated:** 2026-05-26
**Method:** 3 parallel Sonnet scans (live site crawl + competitor profile + local assumption audit), Opus synthesis.
**Re-run:** Spawn the three Agent prompts in `REALITY_CHECK_PROMPTS.md` again whenever the redesign or live site changes meaningfully.

This file is the diff between what the redesign **assumes** and what reality (the live site + 10 peer/competitor sites) actually shows. Each gap is rated:

- 🔴 **Blocker** — ship-stopper, factually wrong, or contradicts the live business
- 🟡 **Decision needed** — redesign made a judgment call that diverges from live; may be intentional, may be wrong
- 🟢 **Cosmetic / nice-to-have** — gap worth noting but not urgent

---

## Tier 1 — Internal contradictions in the redesign itself

### 🔴 Tour price says €30 in copy, €20 in structured data
- `translations/en.json:169` — `"Starting at €30 per person"`
- `lib/structured-data.ts:94` — `price: '20'`
- Aggregator [farmexperiencestours.com](https://farmexperiencestours.com/spain/ibiza-alpaca-experience/) publishes **€30** as the current public price.
- **Fix:** set structured-data price to `30`, or pull from a single constant.

### 🔴 Home conversion order contradicts README priority
- README priority: Tour → Alcaca → Commission → Woven.
- `app/[locale]/page.tsx:19-48` renders: Tour → Woven → Commission → Alcaca (Alcaca last).
- **Decision:** pick one. Alcaca-second is unverified by the live site (no shop at all) and by competitors (no peer leads with manure). Woven-second is more defensible.

### 🟡 Email service: docs say SendGrid, code uses Resend
- `lib/mailer.ts:1-5` imports `Resend`.
- README/INTEGRATION_CHECKLIST still describe SendGrid as the integration target.
- **Fix:** update docs to match code (Resend), or rip Resend out.

### 🟡 README sitemap is stale
- README lists 11 routes; tree has 17 user-facing + 2 admin.
- Missing from README: `/experiences/corporate-team-building`, `/experiences/romantic-sunset`, `/experiences/family-farm-days`, `/gifts`, admin routes.

---

## Tier 2 — Redesign vs. live site: routes & content

### 🔴 Adopt-a-Paca is missing entirely from redesign
- Live site `/adopt-a-paca` is **the only page with explicit pricing**: €75/mo or €900/yr (prepaid). Real, marketed revenue stream.
- Includes: certificate, 6 farm tours, 5 kg Alcaca, calendar, keychain, framed photo, photoshoot, 10% weaving / 15% farm-shop discount.
- README mentions "adoption" in passing (line 11) but **no page exists** in the redesign.
- **Fix:** add `/adopt` route with €75/mo and €900/yr tiers, full benefit list.

### 🔴 Individual alpaca profiles missing
- Live site `/onze-alpacas` lists 14 named alpacas: Barbarella, Avalon, Bardot, Chet, Dusty, Fela, Fonda, Lewis, Marron, Mojo, Moloko, Nelson, Suki, Toots.
- Strong anthropomorphisation = trust + emotional hook. Redesign has none of this.
- **Fix:** add `/alpacas` herd page with the 14 named animals (or whatever current count is — verify with San/Bart).

### 🔴 Press / Media page missing
- Live `/wat-doen-wij-1` shows coverage in Gazet van Antwerpen (Metropool + main), HLN, HLN Kempen, Tribes & Nomads, Diario.
- Press logos above the fold is a [Finca Can Martí](https://canmarti.com/) pattern (Guardian, Telegraph, NatGeo, Elle) — peer norm for trust.
- **Fix:** add `/press` or embed logos in home / about.

### 🔴 Wedding / photoshoot page missing
- Live `/weddings-photoshoots` is a real activity ("US trend, now in Europe"). Distinct revenue line.
- Redesign mentions weddings in FAQ only; no landing page.
- **Fix:** add `/weddings` (or merge with photoshoots).

### 🟡 Workshops page missing
- Live `/alpaca-yoga-1`: 2-day weaving + spinning workshop with San. Off-season only, on-request. Takeaway: scarf.
- Redesign mentions "weaving workshop" in copy; no dedicated page or booking path.

### 🟡 Business incentives / corporate page exists, but renamed
- Live `/business-incentives-brainstormsessies` (Dutch, "brainstormsessies").
- Redesign `/experiences/corporate-team-building` covers it but loses the "brainstorm" angle that's culturally specific to Belgian/Dutch corporate market.

### 🟡 Yoga has a real price the redesign hides
- Live: **€30/person, 1 hr 15 min Hatha, max 6**, Wed/Sat.
- Redesign mentions alpaca yoga in copy but no dedicated page or pricing.
- **Fix:** if yoga is being marketed, give it a page with the real price.

### 🟢 "Family Farm Days" / "Romantic Sunset" are inventions
- Neither exists on the live site. Redesign invented them.
- Not necessarily wrong — they're plausible product expansions — but flag for San/Bart confirmation before launch.

---

## Tier 3 — E-commerce: the biggest reality gap

### 🔴 Live site has no e-commerce. Redesign ships a fake one.
- Live: weaving = made-to-order via email; Alcaca = email-only; no prices on either.
- Redesign: hardcoded prices, "Add to Cart" buttons with no handler, no checkout backend (Stripe/Supabase not wired despite docs).
- **Decision needed:** are San/Bart actually committing to running an online shop? If yes, scope Stripe + inventory. If no, replace cart UI with inquiry forms matching the live email-first model.

### 🟡 Alcaca DTC is validated — but pricing/format needs research
Competitor evidence that manure sells direct:
- [Hensting Alpacas](https://www.alpacas-hampshire.co.uk/shop/) (UK): £2.50–£10/bag, full WooCommerce category.
- [Buddy's Alpaca Farm](https://www.buddysalpacafarm.com/shop/) (US): $1 (1lb) → $20 (15lb compost), tiered weight pricing.
- [Mary's Poop+](https://www.maryspoop.com/) (US): water-soluble pod format on Squarespace, premium branding.

Pattern: sample tier under €5, NPK numbers published, branded name (Beans / Poop+ / Oro Negro). Redesign's €15 / €45 / €140 tiers (5L / 25L / 100L) are reasonable for Ibiza shipping economics but **unverified** — no live price exists to anchor against. **Flag as UNMAPPED until San/Bart confirms.**

### 🟡 Woven prices are unverified
- Redesign hardcodes 6 SKUs (€45–€180). Live site shows gallery only, "made-to-order," no prices.
- **Flag as UNMAPPED.** Don't ship public prices without owner sign-off.

---

## Tier 4 — Language strategy

### 🟡 6 languages is over-built; default language is wrong
- Configured: `en, de, it, es, nl, fr`. Default: `en`.
- Live site is **Dutch-first** (Belgian founders, Belgian press coverage, Dutch nav primary). English is a toggle.
- Competitor norms:
  - [Can Martí](https://canmarti.com/) — EN/ES/FR (WPML)
  - [Alpagas du Maquis](https://alpagasdumaquis.be/en/) — FR/EN
  - [Abolengo](https://www.abolengo-alpaka.de/en/) — DE/EN
  - No peer runs 6 langs.
- Ibiza tourist mix realistically wants: **NL, EN, DE, ES**. Italian and French are speculative.
- **Decision:** keep all 6 but mark IT/FR as "machine + uncurated" until demand justifies? Or drop to NL/EN/DE/ES? Default locale should arguably be NL (matches live) or EN (matches international SEO) — but not GB flag for English (current `🇬🇧` is wrong for an Ibiza/Spain context; use generic 🇺🇸/🇬🇧 EN or just no flag).

---

## Tier 5 — Trust signals & missing patterns

### 🟢 Trust signal mix differs from live but is defensible
- Redesign: 6 hardcoded Facebook reviews with real names/dates (Sue Rose, Verena Kaiser, Gemma Muldoon, Renate Hoofddorp, Sven Van Hees, Paul Walker). Hardcoded aggregate `ratingValue: 5, reviewCount: 127`.
- Live: Belgian press coverage. No reviews on site (only via FareHarbor).
- **Risk:** hardcoded `reviewCount: 127` will go stale and become misleading. Either wire to the live Google Reviews API (`components/google-reviews-badge.tsx` is scaffolded) or remove the number.

### 🟢 No sustainability page (peer norm)
- [Atzaró](https://atzaro.com/), Can Martí, Alpagas du Maquis all have sustainability/eco nav items.
- Redesign and live site both lack one. The redesign already has the content (animal welfare, traditional crafts, natural dyes) — needs a page to consolidate.

### 🟢 No Google Maps embed on Contact
- Both redesign and live site lack this. Standard expectation for a "private finca, appointments only" venue.

---

## Tier 6 — Integrations status (corrects stale README)

| Integration | README/Checklist says | Code reality |
|---|---|---|
| FareHarbor | "Placeholder, replace iframe" | ✅ Wired — shortname `alpacasibiza`, script in layout |
| GA4 | "Needs measurement ID" | ✅ Wired — `G-Y946QDVVQV` live |
| GTM | Not mentioned | ✅ Wired — `GTM-KR3CGLS6` live |
| Consent Mode v2 | Not mentioned | ✅ Wired — gates GA via `ai_cookie_consent_v1` localStorage |
| Email | "SendGrid / Mailgun" | ⚠️ Resend (not SendGrid) — needs `RESEND_API_KEY` |
| Stripe | "Ready, needs keys" | ❌ Not imported anywhere |
| Database | "Ready, choose Supabase/Neon" | ❌ Not imported anywhere |
| Google Reviews | Not mentioned | ⚠️ Scaffolded, needs Places API key |
| Cloudflare Turnstile | Not mentioned | ⚠️ Scaffolded |

**Action:** rewrite INTEGRATION_CHECKLIST Phase 2/4/5 to reflect actual code state. Stop telling future-self to "add GA4" — it's already there.

---

## Summary — what needs an owner decision

1. **Shop strategy** — real Stripe checkout, or email-inquiry model matching the live site? (Tier 3)
2. **Adopt-a-Paca** — confirm tiers/benefits and add `/adopt` route. (Tier 2)
3. **Languages** — keep 6 or drop to NL/EN/DE/ES; default to NL or EN? (Tier 4)
4. **Tour price source of truth** — single constant, kill the €20/€30 split. (Tier 1)
5. **Hardcoded review count** — wire Google Reviews API or remove the `127`. (Tier 5)
6. **Invented experience routes** — confirm `/experiences/romantic-sunset`, `/family-farm-days`, `/gifts` are real product lines or remove. (Tier 2)
7. **Conversion order on home** — match the README, or update the README to match the home page. (Tier 1)

---

## Re-running this audit

The diff was produced by three parallel Sonnet agents. To re-run after meaningful changes:

1. **Live site crawl** — fan-out a Sonnet agent that WebFetches every page from alpacasibiza.com and reports per-page nav/copy/CTAs/prices/booking.
2. **Competitor scan** — Sonnet agent with WebSearch + WebFetch profiles 8–12 peers (Spain/Portugal farms, international alpaca e-commerce, Ibiza agritourism, manure DTC).
3. **Local assumption audit** — Sonnet Explore agent reads README, INTEGRATION_CHECKLIST, i18n.config, every app/ page.tsx, translations/, components/. Extracts pages, languages, prices, integrations, hardcoded facts.
4. **Opus synthesizes** the three into this file.

Keep prompts in `REALITY_CHECK_PROMPTS.md` (sibling file) — they're parameterized for re-use.
