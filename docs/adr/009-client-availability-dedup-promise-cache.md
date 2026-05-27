# ADR-009: Client-side /api/availability dedup via module-level promise cache

**Date**: 2026-05-26
**Status**: Accepted

## Context

Two components on the same page (`BookingSection` and `AvailabilityUrgency`) both need availability data. Without coordination, each mounts independently and fires a separate `fetch('/api/availability')` — two requests hitting the ISR cache simultaneously on every page load.

Standard solutions are SWR or react-query, which provide request deduplication, shared state, and cache invalidation out of the box.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Each component fetches independently | No shared state complexity | N requests per page per component count; wasteful |
| **Module-level promise cache (60s TTL)** | Zero new dependency; deduplicates across all consumers on the same page | Manual TTL management; no stale-while-revalidate invalidation; resets on page reload |
| SWR / react-query | Industry standard; SWR + ISR pair well | New dependency; migration cost; heavier than the problem warrants at this scale |
| React Context provider wrapping layout | Shared state, no extra dep | Forces a Context boundary; over-engineering for 2 consumers |

## Decision

**Module-level promise cache with 60s client TTL** (`lib/use-availability.ts:19-31`).

A module-level `cachedPromise` and `cachedAt` timestamp dedup the fetch: all consumers on the same page get the same in-flight promise or the cached result within 60s. This was chosen as an explicit short-term workaround, accepted because the site currently has exactly two consumers and traffic is low.

The 60s TTL is shorter than the 1800s ISR TTL deliberately: client state can be slightly fresher without adding API pressure (ISR still gates actual FareHarbor calls).

## Consequences

**Positive**
- No additional dependencies (no SWR, no react-query).
- Eliminates duplicate requests from co-resident components.

**Negative / trade-offs**
- Manual and brittle: a third consumer added to a different page won't share the same module instance unless the cache is elevated to a provider.
- No stale-while-revalidate: after 60s, the next consumer triggers a fresh fetch (not a background refresh).
- Cache is invisible to React DevTools — harder to debug.

## Revisit if

- A third page or a layout-level consumer needs availability data — at that point, SWR or react-query pays for itself
- The team adds SWR/react-query for other data needs — then migrate this hook to match
