# ADR-008: /api/availability ISR cache set to 1800s (30 min)

**Date**: 2026-05-26
**Status**: Accepted

## Context

`/api/availability` hits the FareHarbor API to return the next 8 available tour slots. Two competing concerns:

1. **Booking freshness**: slots can sell out between page loads; stale data risks showing sold-out dates as bookable.
2. **FareHarbor API rate limits**: FareHarbor's external API enforces rate limits; per-user-request fetches would exhaust limits quickly during traffic spikes.

Next.js ISR (`export const revalidate`) allows a per-route server-side cache that serves stale data while revalidating in the background.

## Options considered

| TTL | Freshness risk | API cost |
|---|---|---|
| 0 (no cache) | None | Every page view = 1 API call; rate-limit failure at modest traffic |
| 900s (15 min) | Low | 4 calls/hour per route; safe headroom |
| **1800s (30 min)** | Medium — slot could sell out within window | 2 calls/hour; comfortable buffer |
| 7200s (2 hr) | High — 2h of stale sold-out slots shown | 0.5 calls/hour |

## Decision

**`export const revalidate = 1800`** (`app/api/availability/route.ts:115`).

30 minutes is the documented sweet spot: FareHarbor tours are not high-frequency sell-outs (small farm, max ~6 guests/session). The comment in the route file explains: "tour slots can sell out fast; 2h cache risks showing sold-out dates as available." 2h (7200s) was explicitly rejected on those grounds. 15 min would also be safe but provides no material benefit over 30 min for this volume.

## Consequences

**Positive**
- FareHarbor API rate limit pressure kept minimal.
- ISR background revalidation means users rarely wait for a fresh fetch.

**Negative / trade-offs**
- A slot that sells out within the 30-min window may still appear available on the widget. FareHarbor's own booking flow will reject the sold-out slot — the risk is disappointment, not double-booking.
- ISR is per-region on Vercel; global deployments may have slightly longer effective staleness.

## Revisit if

- Tour capacity increases significantly and sell-outs within 30 min become common
- FareHarbor raises or publishes explicit rate-limit documentation that changes the safe TTL
- Vercel edge caching or SWR server components replace the ISR model
