---
id: "003"
title: "Adopt-a-Paca page — live revenue line, zero route"
priority: P0
depends_on: []
est_size: M (4–8h)
---

## Context

The live site (`alpacasibiza.com/adopt-a-paca`) is an active revenue line: €75/month or €900/year prepaid with a confirmed benefits bundle. The redesign has zero route for it. Leaving it out means the redesign cannot replace the live site without killing this revenue line.

An earlier draft spec suggested €15/month — that figure is retracted. Verified live price is €75/mo / €900/yr (VERIFICATION_RESULTS.md, fetched 2026-05-26).

Source: REALITY_CHECK.md Tier 2, VERIFICATION_RESULTS #10, OWNER_INPUT_NEEDED.md "Adopt an Alpaca" section.

## Acceptance criteria

- [ ] Route `/[locale]/adopt` (or `/[locale]/adopt-a-paca`) exists and is reachable.
- [ ] Page displays confirmed pricing: €75/month or €900/year prepaid. No invented price.
- [ ] Page lists all confirmed benefits from the live site: adoption certificate, 6 farm tours/year (up to 4 guests), 5 kg Alcaca fibre, calendar/planner/keychain/framed photo, professional photoshoot, 10% Wishfulfilling Weaving discount, 15% farm-shop discount.
- [ ] If owner has changed pricing/benefits since the live page, owner sign-off is captured in a `TODO: OWNER_CONFIRMED` comment before values go to prod.
- [ ] Page has a primary CTA that links to FareHarbor (or a Stripe checkout if the owner confirms a different payment path).
- [ ] Route appears in sitemap and in the main nav or a dedicated "Experiences" section.
- [ ] Structured data (`Product` or `Offer`) is present with correct price.
- [ ] Page is i18n-wrapped and renders in all active locales (content can be EN-only with `TODO` for other locales).

## Implementation notes

- Files to create: `app/[locale]/adopt/page.tsx`, translation keys in `translations/en.json`.
- Check if FareHarbor handles subscription billing or if owner uses a separate Stripe/Mollie flow.
- Owner must confirm: price unchanged? migrate existing subscribers? per-alpaca cap?

## Out of scope

- Subscription management dashboard (post-launch).
- Automatic subscriber renewal emails (post-launch, depends on payment platform).
