# Ibiza / Mediterranean Competitor Compare — Wave 2 — 2026-06-06

Source: `/deep-research` workflow `wohbo3tff`. 5 angles × parallel fan-out → 25 sources → adversarial 3-vote verification → 6 published findings (high confidence), 1 explicit REFUTATION of a prior claim.

This wave was scoped specifically to fill the Ibiza/Balearic gap from wave 1 (`w3lh8pfta`) where Atzaró / Can Martí / La Granja yielded zero verified claims. Outcome: 6 Atzaró claims verified; remaining competitors (Can Martí, La Granja, Cas Gasi, Sabina, Casa Pacha, Six Senses, Reschio, Borgo Pignano, Castello di Postignano) mostly fell to **rate-limiting on the verifier votes** (40+ failures visible in run telemetry), not refutation.

## (i) Per-competitor verified feature checklist

### Atzaró — atzaro.com — 6 verified claims, 1 refutation

| Feature | Pattern | Vote | Cite |
|---|---|---|---|
| Voucher placement in main nav | "Vouchers" = nav item 20 → `/vouchers/` | 3-0 | https://atzaro.com/vouchers/ |
| Voucher denominations | **Only 2 fixed amounts** (€100, €200) — no custom, no eVoucher/physical toggle, no design picker | 3-0 | https://atzaro.com/vouchers/, https://atzaro.com/bonos/ |
| Conversion-page JSON-LD | **NONE** emitted on /bonos/ | 3-0 | https://atzaro.com/bonos/ |
| Conversion-page trust signals | **NONE** on /bonos/ (no press logos, no Travelife/Green Key, no SLH/Relais marks) — Atzaró has press elsewhere but deliberately not on conversion pages | 3-0 | https://atzaro.com/bonos/ |
| Day-experience booking | Routes to **external CoverManager OTA** (`covermanager.com/reservation/module_restaurant/restaurante-atzarohotelbubbles/english`) — not SiteMinder, not Mews, not inline | 2-0 | https://atzaro.com/spa-ibiza/day-experiences/ |
| Experience pricing UI | Cards with **seasonal dual/triple pricing** in "€ pp" — e.g. Deluxe Spa Day `210€ pp (14.03.26–29.05.26 & 05.10.26–01.11.26)` vs `240€ pp (30.05.26–04.10.26)`; ~8-bullet benefit list per card | 3-0 | https://atzaro.com/spa-ibiza/day-experiences/ |
| **REFUTED** prior wave-1 claim | `bookings.atzaro.com → SiteMinder` did NOT survive verification (0-3 across 3 phrasings, 0-0 on Mews fallback). Bedroom booking engine remains UNKNOWN. | 0-3 | https://atzaro.com/vouchers/, /bonos/, /spa-ibiza/membership/ |

### Other competitors

| Competitor | Status |
|---|---|
| Can Martí | No verified claims survived (rate-limiting dropped most votes) — wave-1 anecdotes about press logos / eco certs remain unverified |
| La Granja Ibiza | Same as Can Martí — research gap persists |
| Cas Gasi | Not reached |
| Sabina Estates | Not reached |
| Casa Pacha Formentera | Not reached |
| Six Senses Ibiza | Not reached |
| Castello di Reschio (Umbria) | Multiple claims about GiftPro voucher engine + 4-method delivery + experience-denominated vouchers — all FAILED verification due to rate limits |
| Borgo Pignano (Tuscany) | 26-experience claim + inline "Check availability" widget — rate-limited out |
| Castello di Postignano | Not reached |

Honest disclosure: this is a research-tooling gap (rate limits), not a coverage gap in the competitor set.

## (ii) Gaps the redesign still has vs Mediterranean boutique norms

**1. Seasonal dual/triple pricing on experience cards** — Atzaró confirmed pattern: `€X pp (date1–date2) / €Y pp (date3–date4)`. The redesign's experience and bundle cards render single prices. Owner-supplied data; code scaffolding can be built.

Proposed implementation:
- Extend `BundleCta` (or a new `SeasonalPriceList` component) with optional `seasonalPriceWindows?: Array<{ startDate: string; endDate: string; priceEur: number; label?: string }>`
- When provided, render as a small label list under the headline price
- Owner sets via env vars or `lib/data/experiences.ts` per-experience
- Fail-quiet to single price when empty

Risk: lock-in to specific date windows requires owner-confirmed seasonal calendars. Build the picker; owner activates per-experience.

## (iii) Gaps the redesign already EXCEEDS

1. **Greeting card design picker** (just shipped) — Atzaró has NO design selection, NO physical/eVoucher toggle, NO custom amount. Two flat denominations. Verified absent.
2. **Product/Offer JSON-LD on conversion pages** — Atzaró /bonos/ emits zero JSON-LD; the redesign emits `productSchema()` on /shop/, /shop/alcaca, /shop/woven, /skein, /gifts.
3. **Press-logos strip on conversion pages** — Atzaró deliberately keeps trust signals off /bonos/. Redesign mounts `PressLogos` on homepage AND press page.
4. **Top-nav voucher placement** — redesign matches Atzaró's pattern (validated, not exceeded).
5. **Charity-style trust footer** (just shipped) — Atzaró doesn't surface Travelife/Green Key/SLH/Relais marks; redesign scaffolds the slot.

## (iv) Anti-patterns to NOT copy

- **Atzaró /bonos/ ships ZERO JSON-LD** despite high-traffic conversion intent. Don't follow their lead — keep our schema coverage.
- **Atzaró voucher UX is denomination-only with no customization** — minimum-viable. Spring Farm (wave 1) and Best Friends (wave 1) both do more. The redesign's greeting-card scaffold positions to exceed Atzaró without copying their floor.
- **External CoverManager OTA for spa bookings** — works for Atzaró because their spa is restaurant-shared; for a single-tour operator, FareHarbor (our pattern) is cleaner. Don't fragment booking surfaces just to mirror Atzaró.

## Caveats

1. **Verification budget was rate-limit constrained** — 40+ verifier votes failed mid-flight, killing claims about Can Martí, La Granja, Reschio, Borgo Pignano, etc. The unverified findings from wave 1 about Can Martí press logos (Elle/Marie Claire/Condé Nast/NatGeo) and ECEAT/Consell Balear certifications remain plausible but unconfirmed.
2. **Wave-1 SiteMinder claim corrected** — `bookings.atzaro.com → SiteMinder` is now explicitly REFUTED. Bedroom booking engine for Atzaró remains unknown.
3. **No conversion claim against Six Senses / Reschio / Borgo Pignano** survived verification — those high-end peers' patterns remain uncharacterized.

## Next actions (code-doable)

1. **Seasonal-window pricing scaffold** (S) — `components/seasonal-price-list.tsx` + optional field in experience/bundle data. Renders nothing when empty. Owner activates per-experience.

That's the only code item from this wave. The other findings are proof-of-coverage (we already exceed) or unverified (research-tooling failure, not code work).
