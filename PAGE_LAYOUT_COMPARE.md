# Page Layout Compare — 2026-06-06

Source: `/deep-research` workflow `wl1knks79` (live site + competitors verified) + spot-check of redesign pages (workflow noted it couldn't complete redesign-side synthesis, so I closed that locally).

## (i) Section-order comparison matrix

### Homepage

| Section | Live alpacasibiza.com | Redesign | PukkaPacas | Atzaró |
|---|---|---|---|---|
| Hero | Image + tagline → "Plan je bezoek" | Hero + AdoptersCounterBadge + trust strip | "110-acre farm, one of the first…" + stat | Image + tagline |
| Trust | NONE | Reviews + press + Google Places ✓ | Stat-led | NONE on hero |
| Primary CTA | "Plan je bezoek" → FareHarbor | Tour book CTA → FareHarbor | Experience catalogue (60-min, Cria Watch, Date Night, Donkey Walks) | "Book a bedroom" |
| Activity cards | **5: Weddings + Adopt + Yoga + Workshops + Business** | **3: Corporate + Romantic Sunset + Family** | Experience SKUs as named cards | Spa / vouchers / experiences |
| Social proof | Instagram below | Reviews + Testimonials wall ✓ | 6 individual alpaca cards | None on /bonos |
| Secondary CTA | Instagram | Adopt callout + Skein + (env-gated) Membership/Herd Family | Newsletter | Vouchers |
| Footer | Contact + minimal | Donors / Press / Info + legal | Standard | Contact + group properties |

### /adopt

| Section | Live (/adopt-a-paca) | Redesign | PukkaPacas (/adopt-an-alpaca) | Best Friends |
|---|---|---|---|---|
| Hero | Adoption photo + headline | Hero + tier comparison + CertificatePreview | Two-tier card lead | Animal grid |
| Tier model | **Single €75/mo OR €900/yr** | Monthly + Yearly + Skein + (env-gated Membership/Herd Family/Junior) | **Two tiers (£20 Standard / £45.50 Premium)** | $25+ one-time + Guardian Angel monthly |
| Perks listed | **9 bundled**: certificate, 6 farm tours, 5kg manure, calendar, keychain, framed photo, photoshoot, 10% weaving, 15% shop | Partial: certificate, 10% weaving, 15% shop, photoshoot, farm tours, fertilizer — **missing: 5kg quantity, calendar, keychain, framed photo, 6-tour quota explicit** | Bulleted deliverables | Print/digital card |
| Checkout | **NO direct online payment** — Plan je bezoek CTA + downloadable PDF certificate | Stripe + Mollie embedded/redirect checkout | Stripe checkout | Stripe checkout |
| Alpaca picker | None | AlpacaPicker (14 alpacas, deterministic-style avatar fallback) | 6 alpaca profile cards | Animal selector |
| Social proof | None | AdoptersCounterBadge + testimonials | Photo gallery | Testimonials |

### /tours

| Section | Live | Redesign | PukkaPacas | West Wight |
|---|---|---|---|---|
| Booking | FareHarbor embed | FareHarbor embed ✓ | DigiTickets storefront | DigiTickets + Stripe |
| Calendar | FareHarbor inline | FareHarbor inline ✓ | Category listing | Category listing |
| Trust | None | SocialProofStrip + waitlist form | Reviews | Press snippets |

### /shop

| Section | Live | Redesign | PukkaPacas | Spring Farm |
|---|---|---|---|---|
| Catalogue | "Wishfulfilling Weaving" external | /shop with alcaca + woven + commission sub-pages | Internal shop | WooCommerce-like |
| JSON-LD | None | Product/Offer on 5 surfaces ✓ | None | None |

### /weaving (vs /wat-doen-wij on live)

| Section | Live | Redesign |
|---|---|---|
| Position | Co-equal pillar — title "Dromen over alpaca's & weven" | Top-level nav item ✓; mega-menu category |
| Sub-pages | None | `/weaving` page (no `/weaving/collection` — removed in earlier wave; 301 to `/shop/woven`) |

## (ii) Where the redesign EXCEEDS

1. **Trust signals on homepage** — live has zero; redesign has Reviews + Press logos + Google Places + AdoptersCounterBadge. Cite: workflow finding (https://www.alpacasibiza.com/ has none).
2. **JSON-LD coverage** — live emits ~no schema; redesign emits 14 schema types across pages (verified earlier wave).
3. **Multi-locale** — live is NL/EN only; redesign supports 6 locales (en/nl real, others sentinel).
4. **Direct adoption checkout** — live has no online payment; redesign has dual-rail Stripe + Mollie.
5. **Donor portal** — live has none; redesign has /my-adoption + share-adoption.
6. **Herd Diary feed** — just shipped; live has none; pukkapacas / Atzaró / West Wight have none.

## (iii) Where the redesign LAGS (clear gap)

1. **Activity-Cards landmark divergence**. Live's homepage has 5 cards (Weddings / Adopt / Yoga / Workshops / Business Incentives). Redesign has 3 (Corporate / Romantic Sunset / Family). Returning visitors won't find Weddings or Yoga prominent on the home — they're elsewhere in nav.
2. **Adopt perks specifics**. Live lists 9 bundled perks with exact quantities: 6 farm tours, 5kg manure, alpaca calendar, keychain, framed photo. Redesign lists certificate + photoshoot + fertilizer + farm tours generically; quantities + specific items absent.
3. **No "Plan a visit instead" continuity bridge on /adopt**. Visitors who knew the old site expect "Plan je bezoek" — direct-checkout-only loses that expectation.

## (iv) Continuity divergence from live alpacasibiza.com

| Divergence | Severity | Why it matters |
|---|---|---|
| 5 → 3 activity cards on home | **HIGH** | Landmark loss; "Weddings" + "Yoga" no longer above-fold |
| Adopt is direct-checkout-only | MEDIUM | Old visitors expect "book a visit" |
| 9 specific perks → generic list | MEDIUM | Loses concreteness that drove trust on old site |
| Multi-tier adopt (with env-gated) | LOW | Hidden by default; only Monthly + Yearly visible until owner activates |

## (v) Prioritized layout changes

1. **Restore 5-card Activity Cards landmark on homepage** (S) — replace 3-card experience grid (corporate/romantic/family) with live-site mirror: Weddings / Adopt / Yoga / Workshops / Business Incentives. Each links to existing route (`/weddings`, `/adopt`, `/yoga`, `/workshops`, `/experiences/corporate-team-building` or future `/business-incentives`).
2. **Expand /adopt perk list to mirror 9 live perks** (XS) — add: 6-tour quota explicit; 5kg manure; alpaca calendar; alpaca keychain; framed photo. These are real perks the live site advertises; preserve continuity.
3. **Add "Or arrange a visit instead" secondary CTA on /adopt** (XS) — link to /tours; continuity bridge for visitors who knew the old flow.

Anti-patterns NOT to copy:
- PukkaPacas "110-acre" hero scale stat — our farm isn't that large
- PukkaPacas two-tier value-ladder — would diverge from live's single-tier identity
- Atzaró seasonal-window pricing on adopt — adoption shouldn't have seasonal pricing

## Caveats

- Workflow truncated; redesign-side synthesis was completed locally via grep, not adversarial verification. The 3 layout changes above are the cleanest cited continuity gaps.
- Spot-checks confirm: weaving IS in main nav, alpaca profiles ARE at /alpacas/[slug], home DOES use a 3-card pattern not 5.
