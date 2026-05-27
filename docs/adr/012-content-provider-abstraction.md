# ADR 012 — Content lives in per-tenant TypeScript modules behind a `ContentProvider`

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Superseded by:** none

## Context

The alpaca site was built single-tenant, with `lib/data/alpacas.ts` exporting a hardcoded array of 14 alpacas. The multi-tenant pivot requires every page that consumes content (animals, experiences, products, team, reviews) to read from a per-tenant source so tenant N can serve 12 horses, 8 vineyards, or 50 surf-lesson packages without forking code.

Three options were considered:

1. **Headless CMS** (Sanity, Contentful, Payload) — full editorial UI but requires a third-party account per tenant and an API key in the runtime path
2. **Per-tenant JSON files** — git-tracked, no DB, simple but no type safety
3. **Per-tenant TypeScript modules** — git-tracked, fully typed, but content edits require a code deploy

Phase 1 has zero paying tenants and zero CMS budget. The owner can't be expected to edit JSON or hire a CMS account on day 0.

## Decision

Content for each tenant lives in a TypeScript module at `lib/tenants/<slug>-content.ts` that exports the 5 entity arrays (animals, experiences, products, team, reviews). All entities follow `lib/integrations/content-types.ts` with UNMAPPED-friendly nullable fields (`bio: string | null`, `image: string | null`, etc.).

Pages consume content via `getProviders(tenant).content.listAnimals()` — never via direct import. The `ContentProvider` interface guarantees `list*` methods always return a `ReadonlyArray` (never null, never throw).

When CMS becomes warranted (tenant 10+, or a tenant who wants self-service editing), a `cms-stub` adapter slots in beside `static-typescript` with no consumer changes.

## Consequences

**Positive:**
- Zero new infrastructure, zero new dependencies, zero per-tenant cost
- Full TypeScript safety — bad shapes caught at build time
- UNMAPPED contract enforced via types: a tenant with no team CAN'T accidentally render fake team members
- Adding a CMS later is a new adapter, not a rewrite

**Negative / Trade-offs:**
- Every content edit requires a deploy. Acceptable while Cruz approves all changes; awkward when tenants want self-service.
- The `getProviders` switch on `tenant.slug` is O(N) of registered tenants — fine to 100 tenants, refactor if it grows.

## Upgrade triggers (when to add a CMS adapter)

- First tenant explicitly asks to self-edit copy
- Volume crosses ~20 tenants such that the slug-switch in `getProviders` becomes noisy
- A tenant needs editorial workflow (draft / preview / publish)

## References

- `lib/integrations/content.ts` — interface
- `lib/integrations/content-types.ts` — entity shapes
- `lib/integrations/content-static-typescript.ts` — current adapter
- `lib/tenants/alpacasibiza-content.ts` — first concrete content module
- `lib/tenants/example-content.ts` — second concrete content module (Vineyard Acres demo)
- `specs/saas-framework/004-theming-content.md` §3 — original 5-entity recommendation
