---
id: "006"
title: "Structured data integrity — remove hardcoded fake review count and rating"
priority: P0
depends_on: ["001"]
est_size: S (1h)
---

## Context

`lib/structured-data.ts` emits `reviewCount: '127'` and `ratingValue: '5'` as hardcoded literals. Neither value is sourced from real data. Google's structured data validator cross-checks Schema.org `aggregateRating` against actual Google Business reviews. A mismatch risks a manual action or rich-result revocation.

Source: PLAN.md A6, REALITY_CHECK.md Tier 5, VERIFICATION_RESULTS #2, task-radar Q1.

## Acceptance criteria

- [ ] `reviewCount` and `ratingValue` in `lib/structured-data.ts` are NOT hardcoded literals.
- [ ] If the Google Reviews API is configured (`GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` set), structured data uses the live values from the API response.
- [ ] If the API is NOT configured, the `aggregateRating` block is omitted entirely from the JSON-LD output (not emitted with fake values).
- [ ] Google Rich Results Test on the deployed site shows no `aggregateRating` block when API keys are absent.
- [ ] Unit test (or inline assertion) confirms that `buildStructuredData({ reviewCount: undefined })` omits the `aggregateRating` key.

## Implementation notes

- Files to touch: `lib/structured-data.ts` (remove hardcoded values, accept optional `reviewData` param), `app/[locale]/tours/page.tsx` or wherever structured data is injected (pass real data from Google Reviews API response or omit param).
- The `GoogleReviewsBadge` component already handles the unconfigured case gracefully (`{configured:false}`) — structured data should follow the same pattern.

## Out of scope

- Setting up Google Places API keys (owner action, not code).
- Pulling review data from any source other than the existing `app/api/google-reviews/route.ts`.
