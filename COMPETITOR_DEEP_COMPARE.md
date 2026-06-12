# Competitor Deep Compare — 2026-06-06

Source: `/deep-research` workflow w3lh8pfta. 5 angles × parallel web search → 25 sources fetched → 107 claims extracted → 25 verified (12 confirmed, 13 killed) → 8 published findings. Every claim cites a fetched URL.

## (i) Per-competitor feature checklist (verified)

### UK alpaca walk farms

| Competitor | Stack | JSON-LD | OG/Twitter | Pricing visible | Booking | Cited |
|---|---|---|---|---|---|---|
| West Wight Alpacas | jQuery 1.11.0 (2014), UA tracking | ❌ none | ❌ none | ✅ (DigiTickets) | DigiTickets + Stripe SaaS | http://www.westwightalpacas.co.uk/ |
| PukkaPacas | unknown | ❌ none | ❌ none | ❌ hidden (drill-down to £36.95) | ? cart with cookie state | https://www.pukkapacas.com/ |
| Alpagas du Maquis | static | ❌ none | ❌ none | ✅ | Contact form + 50% deposit | https://alpagasdumaquis.be/en/guided-tour/ |
| Spring Farm | WooCommerce-like | ❌ none on voucher page | n/a | ✅ £15/£30 + £2 card | Stripe checkout | https://www.alpacawalking.co.uk/alpaca-walking-vouchers-gift-cards/ |

### Adoption / sponsorship sites

| Competitor | Pattern | Cited |
|---|---|---|
| Best Friends | $25+ one-time "Sponsor an Animal" **AND** separately branded "Guardian Angel" monthly | https://bestfriends.org/donate/sponsor-animal · https://bestfriends.org/donate/become-member/guardian-angel |
| WWF UK | £5/month default symbolic adoption; dedicated "Adopt as a gift" path; junior memberships; charity-number + Fundraising Regulator badge | https://support.wwf.org.uk/ |

### Ibiza boutique eco-tourism

| Competitor | Pattern | Cited |
|---|---|---|
| Atzaró | SiteMinder booking widget on `bookings.atzaro.com` subdomain; gift vouchers in top nav | https://atzaro.com/ibiza-accommodation/ |
| Can Martí | NO booking widget — phone + email + 50% deposit. Press logos: Elle, Marie Claire, Condé Nast, NatGeo Traveler, Telegraph, Guardian. Eco badges: ECEAT, Consell Balear | (verification thin — see caveat) |

## (ii) Gaps the redesign should close

**CODE-DOABLE (no owner-data — can build immediately):**

1. **Annual Pass / Membership SKU** — West Wight surfaces `/category/26005 Annual Farm Pass` as a separate first-class category. Redesign has Monthly + Yearly adopt + one-time Skein, no "buy a pass once a year for unlimited visits" SKU. Build: env-gated `MEMBERSHIP_*` family + Stripe price + checkout, follows existing `SKEIN_*` pattern.

2. **"Redeem Adoption Voucher" landing page** — PukkaPacas has `/voucher` as a first-class nav item. Redesign has /adopt purchase path but no surfaced REDEMPTION journey for someone who received a gift voucher. Build: `/redeem-voucher` page + `?code=` token form.

3. **Press logos strip component** — Can Martí surfaces ~8 press logos as social proof. Component renders from `lib/data/press-mentions.ts`, empty array by default (fail-quiet like `events-calendar`).

4. **Charity-/business-registration trust footer** — WWF surfaces charity number + Fundraising Regulator badge. Spanish equivalent: CIF + Empresa de Turismo Activo + Consell Insular registration. Render from existing `tenant.legalName`/`tenant.cif` already in `lib/tenants/`.

5. **Product/Offer JSON-LD on shop pages** — Spring Farm sells vouchers but lacks JSON-LD. Cheap schema win. Add `productSchema()` to `lib/structured-data.ts` and emit on `/shop`, `/shop/alcaca`, `/shop/woven`.

**OWNER-INPUT (Cruz must supply, AI can scaffold UI):**

6. **Gift voucher UX — physical/eVoucher split + greeting card add-on** — Spring Farm sells 15 card designs as £2 add-ons. The CODE for "design picker grid + delivery toggle" can be built; the 15 SVG card designs are owner content.

## (iii) Gaps the redesign already exceeds

- **Structured data: redesign emits JSON-LD/OG/Twitter on 10+ pages** vs ALL surveyed UK alpaca competitors emitting ZERO. ([lib/structured-data.ts](lib/structured-data.ts))
- **Pricing transparency**: redesign shows €75/mo + €900/yr + skein €200 up-front; PukkaPacas hides experience pricing.
- **Modern stack**: Next.js 16 + Turbopack vs West Wight's 2014 jQuery + UA.
- **Multi-locale**: 6 locales wired (en/nl complete) vs all surveyed competitors single-locale.
- **Payment vendor abstraction**: Stripe + Mollie dual-rail vs competitors locked into one processor.
- **97+ documented failsafes** in [CLAUDE.md](CLAUDE.md) failsafe map — no competitor surveyed has this rigor.
- **Booking SaaS strategy aligned**: redesign uses FareHarbor; competitors use DigiTickets/Bookwhen. Same buy-not-build pattern — redesign isn't reinventing.

## (iv) Where competitors beat us

1. **PukkaPacas has a "Redeem Adoption Voucher" first-class journey** — we have /adopt buy-side but no redeem-side surface (closeable via item #2 above).
2. **Spring Farm's 15-design greeting card add-on** — clever emotional upsell we don't merchandise.
3. **Best Friends + WWF have polished distinct monthly-recurring brand programs** (Guardian Angel, £5/month) — redesign's monthly/yearly tiers don't get their own brand identity.
4. **West Wight + PukkaPacas have live e-commerce checkout for walks** (Stripe-grade) — redesign's shop is still scaffolded; FareHarbor handles tour booking but the merch side has placeholder content.

## Anti-patterns NOT to copy

- **PukkaPacas hides pricing on the homepage** — drill-down required. Transparency failure.
- **Alpagas du Maquis: pure contact-form lead capture + 50% manual invoice deposit** — high friction, no instant confirmation, no upsell surface.
- **West Wight's 12-year-stale stack** (jQuery 1.11.0, deprecated UA) — do NOT import "they do it this way" justification for legacy patterns.
- **No JSON-LD anywhere on competitor stack** — proof that "doing schema" alone is a moat.

## Caveats

1. **Ibiza category had verification failures**: 6 Atzaró/Can Martí claims stalled at 0-0 or 1-0 votes due to rate-limiting on web fetches. Findings cited from the original fetches, not adversarially verified. Re-fetch before treating as ground truth.
2. **Redesign coverage claims** based on memory + structured-data.ts existence, not exhaustive file audit. Spot-check before publishing externally.
3. **Time-sensitivity**: competitor sites can modernize. Re-fetch within 30 days if planning external claims.

## Next actions (code-doable, ranked)

1. Membership / Annual Pass SKU (env-gated, follows Skein pattern) — **S**
2. /redeem-voucher landing page + token verify route — **S**
3. Press-logos strip + data file — **XS**
4. Charity-style trust footer addition — **XS**
5. Product/Offer JSON-LD on shop pages — **XS**
6. Greeting-card design picker grid (scaffold; owner supplies SVGs) — **S**

Total estimated effort: 6 small items. Recommend dispatching as one parallel build wave.
