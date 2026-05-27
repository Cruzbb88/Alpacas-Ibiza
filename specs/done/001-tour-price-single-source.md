---
id: "001"
title: "Tour price single source of truth"
priority: P0
depends_on: []
est_size: S (1–2h)
---

## Context

`translations/en.json` shows €30 on tour cards; `lib/structured-data.ts:94` emits `lowPrice: 20`. Schema.org validators and search aggregators surface the conflict live. Additionally the 4 tour cards display no price anchor at all (OWNER_INPUT_NEEDED.md:44–51), which hurts conversion — peers show "from €X/person". Requires owner confirmation of real prices first, then a single constant drives both display and structured data.

Source: PLAN.md A1, REALITY_CHECK.md Tier 1, VERIFICATION_RESULTS #1, OWNER_INPUT_NEEDED.md "Pricing to display".

## Acceptance criteria

- [ ] One price constant per tour lives in `lib/config.ts` (or `lib/tour-prices.ts`); no other file declares a numeric price for a tour.
- [ ] `lib/structured-data.ts` `lowPrice` reads from that constant — not a hardcoded literal.
- [ ] Each of the 4 tour cards renders "from €X/person" (or "€X/person") using the same constant.
- [ ] If owner has not yet confirmed prices, a clear `TODO: OWNER_INPUT_NEEDED` comment marks the placeholder value; no mismatched values remain in the codebase.
- [ ] `en.json` translation key for tour price references the constant or matches it exactly.

## Implementation notes

- Files to touch: `lib/config.ts` (or new `lib/tour-prices.ts`), `lib/structured-data.ts:94`, `components/tour-card.tsx` (or wherever card price is rendered), `translations/en.json`.
- Owner must supply confirmed prices before this can ship without placeholder; spec can be coded to accept a placeholder cleanly until then.

## Out of scope

- Peak vs off-peak pricing tiers (owner input needed — no spec until confirmed).
- FareHarbor item-ID wiring (separate spec 004).
