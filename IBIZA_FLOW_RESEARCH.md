# User-Flow Research — 2026-06-06

Source: `/deep-research` workflow `wibvrn0e2`. 5 angles × parallel fan-out → 27 sources → 120 claims extracted → 25 adversarially verified → 11 published findings (all primary-source cited, no opinion-blog).

## (i) Verified patterns to ADOPT

### Hero / landing

1. **Hero CTAs must be SPECIFIC and intent-matching, not generic** (NN/g) — replace `Get Started` / `Learn More` / `Submit` with action+object: `Book a Farm Tour`, `Adopt Lola`, `Redeem My Voucher`. Generic CTAs erode information scent.
   Source: https://www.nngroup.com/articles/get-started/
   Evidence: NN/g states verbatim "The phrase Get Started is ambiguous and can apply to almost any goal." A/B tests show 15-202% lift from specific CTAs.

2. **Match commitment ask to user's current trust level** (NN/g Hierarchy of Trust, 5 levels). Reassurance elements (tagline + social proof + representative imagery) FIRST; financial/recurring asks (Level 4-5) MUST NOT appear above the fold without satisfying Levels 1-2.
   Source: https://www.nngroup.com/articles/commitment-levels/
   Implication for Ibiza: monthly-adopt / Annual Pass / junior-tier CTAs are Level-5 asks. The homepage callouts must come AFTER the trust-building hero, not in the hero.

### Navigation

3. **Top-rail visible nav with mega menu beats desktop hamburger** for 30+ page sites (NN/g, 179-participant study). Visible nav usage 43-48% vs hidden hamburger 17-27% (1.6-1.8× lift). Tasks 39% slower on desktop hamburger.
   Sources: https://www.nngroup.com/articles/mega-menus-work-well/ + https://www.nngroup.com/articles/find-navigation-desktop-not-hamburger/

4. **Highlight user's CURRENT SCOPE in nav on every page** (Baymard 2025) — 95% of e-commerce sites fail this. Cheap differentiator on a 6-locale, multi-section IA.
   Source: https://baymard.com/blog/ecommerce-navigation-best-practice

5. **IA depth calibration: subdivide ~10 subcategories** (Baymard / Hick's Law). 38% of mobile sites have hierarchies too deep, too shallow, or overlapping. 82% non-compliant on 10-subcategory rule.
   For Ibiza: Adoption tiers (monthly + yearly + skein + Annual Pass + junior) should be SIBLINGS under one Adopt parent — not scattered across nav.

### Mobile

6. **Mobile "See All" / "View All" microcopy on category headers** — only 24% of sites do this correctly. Bare category names aren't perceived as tappable.
   For Ibiza: mobile Adopt drawer needs `See all adoption options`, Tours needs `See all tours`, Shop needs `See all products`.
   Source: https://baymard.com/blog/ecommerce-navigation-best-practice

7. **Mobile is the highest-leverage surface** — Baymard 138-site mobile benchmark: 62% mediocre or worse, 0% rated "good". Weakest areas: Main Navigation, Search Autocomplete, Forms, Sitewide Features.
   For a small experiential brand, thoughtful mobile execution can outperform sector incumbents.

### Conversion funnel

8. **~70.22% cart abandonment baseline** (Baymard, 19-year aggregate). Top fixable drivers: unexpected extra costs (39%), forced account creation (19%), lengthy process (18%).
   Source: https://baymard.com/lists/cart-abandonment-rate

9. **Up to 35% conversion lift from checkout UX redesign** (Baymard, scoped to large e-commerce — directional, not guaranteed for small brands). 110+ checkout guidelines available.

10. **Guest checkout must be the visually MOST PROMINENT option** — 62% of sites fail. Pairs with 19% forced-account-creation abandonment driver.
    For Ibiza: tour booking and one-off voucher purchase must offer guest path matching or outweighing sign-in. Account creation only after payment confirmation for subscription tiers.

### Refuted (don't follow these)

- "Reduce mobile navigation depth" — Baymard REFUTED this. Mobile users want the same depth as desktop. Don't truncate hierarchy on mobile.

## (ii) Gap matrix vs current redesign

| # | Pattern | Current state in redesign | Gap | Severity |
|---|---|---|---|---|
| 1 | Specific hero CTAs | Header has tour + adopt CTAs (check labels) | Verify wording matches "Book a Farm Tour" not generic | M |
| 2 | Hierarchy of trust | Hero has hero block, then social-proof strip + experience cards | Verify above-fold has NO Level-5 ask (monthly subscription button at top) | M |
| 3 | Mega menu vs hamburger | Header is flat 11-item top nav with mobile drawer | Items grouped by category? Mega menu for sub-sections? | M |
| 4 | Current-scope highlight | Likely none | Add aria-current + visual treatment to active section in header | **H** (95% sites fail — easy win) |
| 5 | IA depth (10-rule) | Footer has Donors / Press / Info sections, but adopt tiers may be siblings already | Verify monthly/yearly/skein/Annual Pass/junior all under one "Support" or "Adopt" parent | M |
| 6 | Mobile "See All" | Probably absent | Add explicit `See all X` link in mobile drawer category headers | H |
| 7 | Mobile main nav quality | Just rebuilt | Run Baymard's 138-site benchmark heuristics against ours | M |
| 8 | Unexpected costs | FareHarbor shows price up front; Stripe shows price at checkout | Audit whether VAT, processing fees surfaced BEFORE final step | M |
| 9 | Checkout UX | Stripe + Mollie embeds | Run Baymard's 110-guideline list against the embedded checkout (limited control over Stripe Checkout) | L (vendor-owned) |
| 10 | Guest checkout prominence | Tour booking via FareHarbor (guest-friendly); adopt via Stripe Checkout (guest-friendly) | Verify no "create account" gate on tour booking flow | M |

## (iii) Prioritized layout/IA changes (closes measurable gaps)

Ranked by `(impact × ease) ÷ risk`:

1. **Add `aria-current` + active-section visual to header nav** — pattern #4, 95% of sites fail. ~15-line change to `components/header.tsx`. **H impact, XS effort.**

2. **Mobile drawer "See all X" microcopy** — pattern #6. Add explicit links to category headers in mobile drawer. **H impact, S effort.**

3. **Hero CTA label audit** — pattern #1. Grep current hero CTAs, swap any generic verbs for specific intent ("Book a Farm Tour", "Meet Lola"). **M impact, XS effort.**

4. **Above-fold trust-level audit** — pattern #2. Confirm homepage Level-5 asks (monthly adopt callouts) do NOT appear in the hero block. Move to after social-proof strip if they do. **M impact, S effort.**

5. **Group adopt tiers under one parent** — pattern #5. Verify nav structure groups (monthly, yearly, skein, Annual Pass, junior) under a single section. **M impact, S effort.**

6. **VAT / fee transparency audit on tour booking** — pattern #8. Confirm FareHarbor's embed shows tax/fee BEFORE confirmation. **L impact, XS effort (vendor-owned).**

7. **Guest path prominence on /adopt + /membership** — pattern #10. Confirm CTAs route to checkout WITHOUT account-creation gate. **L impact, XS effort.**

## (iv) Anti-patterns to avoid (cited)

- **Desktop hamburger menu** (NN/g 179-participant study): drops usage from 43-48% to 17-27% AND slows tasks 39%. If our header has any hamburger on desktop, REMOVE.
- **Truncating mobile category depth** (Baymard, refuted): mobile users want the same depth as desktop. Keep parity.
- **Hero level-5 asks** (NN/g Hierarchy of Trust): never put monthly-commitment CTAs above the fold without social-proof reassurance preceding.
- **Generic CTAs**: "Get Started", "Learn More", "Submit" — replace site-wide with action+object.
- **Forced account creation before payment** (Baymard 19% abandonment driver): subscription tiers should create the account POST-payment.

## Caveats (from the synthesis)

- Baymard figures scoped to large e-commerce; directional only for a small experiential brand.
- NN/g findings are 9-11 years old; cognitive principles (recognition, information scent) remain valid, but specific usage % may shift with broader hamburger familiarity in 2026.
- Not researched in this pass (open questions for a follow-up): gift-flow psychology, certificate-as-reward mechanics, anniversary email cadence, Patreon framing, GDS Service Manual booking patterns, WCAG 2.2 specifically for booking checkout, sticky-CTA bar conversion deltas.
- The workflow did NOT inspect the actual redesign code — the gap matrix above is from my code knowledge, not adversarially verified by the workflow. A code-level audit pass should follow.

## Next action

Dispatch one targeted build wave to close the top 4 changes (current-scope highlight, mobile See-All, hero CTA labels, trust-level audit). Items 5-7 to be verified inline.
