# Architecture Decision Framework

A structured approach to making and documenting technology choices for multi-tenant SaaS platforms.

## Decision Record Format

For each significant architecture decision, document:

```markdown
### ADR-[number]: [Decision Title]

**Status:** Proposed | Accepted | Superseded by ADR-[N]

**Context:** What situation requires a decision?

**Options:**
| Option | Pros | Cons |
|--------|------|------|
| A | | |
| B | | |

**Decision:** [chosen option]

**Rationale:** Why this option wins given project constraints.

**Consequences:** What changes as a result. What becomes easier. What becomes harder.
```

## Decision Sequence

Architecture decisions have dependencies. Make them in this order:

### Tier 1: Foundational (decide first, hardest to change)
1. **Multi-tenancy approach** — RLS, schema-per-tenant, or DB-per-tenant
2. **Primary language(s)** — Backend and frontend languages
3. **Database engine** — PostgreSQL, MySQL, document store
4. **Authentication method** — Passwordless, OAuth, traditional

### Tier 2: Structural (decide early, expensive to change)
5. **Backend framework** — Full framework vs. micro-framework
6. **Frontend framework** — SSR vs. SPA, App Router vs. Pages
7. **API style** — REST, GraphQL, tRPC
8. **Hosting strategy** — Serverless, containers, PaaS

### Tier 3: Tactical (decide as needed, moderate to change)
9. **Component library** — Build vs. adopt (shadcn, MUI, Ant)
10. **State management** — Server state, client state, hybrid
11. **ORM approach** — Full ORM, query builder, raw SQL
12. **Styling approach** — Tailwind, CSS modules, styled-components

### Tier 4: Operational (decide before deployment, low switching cost)
13. **CI/CD platform** — GitHub Actions, GitLab CI, CircleCI
14. **Monitoring** — Datadog, Grafana, cloud-native
15. **Error tracking** — Sentry, Bugsnag, Rollbar
16. **Feature flags** — LaunchDarkly, Flagsmith, custom

## Multi-Tenancy Decision Guide

The single most impactful architectural decision for SaaS platforms.

### Row-Level Security (RLS)
**Choose when:** Standard SaaS, cost-sensitive, up to 10,000 tenants, shared schema acceptable.

- Single database, single schema
- `organization_id` column on every tenant-scoped table
- Database enforces isolation (PostgreSQL policies)
- Simplest to operate, cheapest to host
- Scales to millions of rows per table

**Risk:** A missing RLS policy exposes data across tenants. Mitigate with automated RLS audits in CI.

### Schema-per-Tenant
**Choose when:** Tenants need schema customisation, regulatory isolation, up to 500 tenants.

- Single database, one schema per tenant
- Middleware routes connections to correct schema
- More isolation than RLS, less ops than separate DBs
- Schema migrations must run per-tenant

### Database-per-Tenant
**Choose when:** Enterprise contracts require physical data isolation, up to 50 tenants, budget allows.

- Separate database per tenant
- Maximum isolation, simplest per-tenant backup/restore
- Highest operational cost

## Multi-Region Decision Guide

### When to Abstract
If the system deploys to regions with different cloud providers (e.g., AWS global + Alibaba Cloud China), abstract ALL provider-specific services:

| Service | Interface | Global Impl | Regional Impl |
|---------|-----------|-------------|---------------|
| Storage | `StorageService` | Cloudflare R2 | Alibaba OSS |
| Auth | `AuthService` | Supabase Auth | Alibaba IDaaS |
| Cache | `CacheService` | Upstash Redis | Alibaba Redis |
| LLM | `LLMService` | Anthropic Claude | Alibaba Qwen |

### When Not to Abstract
Single cloud provider across regions (e.g., AWS us-east + AWS eu-west): use the provider's SDK directly with region configuration. Abstraction adds unnecessary indirection.

## Checklist: Before Finalising Architecture

### Security
- [ ] Multi-tenancy approach chosen and RLS policies designed
- [ ] Auth flow fully specified (token types, expiry, refresh, storage)
- [ ] CORS policy defined
- [ ] Rate limiting strategy
- [ ] Secret management approach
- [ ] Audit logging scope defined

### Data
- [ ] All Blueprint entities have table definitions
- [ ] Foreign keys and indexes specified
- [ ] Enum types defined
- [ ] Migration tool chosen
- [ ] Seed data strategy
- [ ] Data import plan (if replacing existing system)

### API
- [ ] Endpoint URL pattern established
- [ ] Pagination, filtering, sorting conventions
- [ ] Standard response and error formats
- [ ] API versioning strategy
- [ ] Rate limiting tiers

### Frontend
- [ ] Component library selected
- [ ] Styling approach decided
- [ ] i18n library chosen and file structure defined
- [ ] State management approach
- [ ] Routing strategy

### Infrastructure
- [ ] All deployment regions mapped
- [ ] Provider abstraction designed (if multi-cloud)
- [ ] CI/CD pipeline defined
- [ ] Environment strategy (dev, staging, production)
- [ ] Monitoring and alerting chosen

### Performance
- [ ] Page load target (LCP < 2.5s)
- [ ] API response time target (p95 < 500ms)
- [ ] Concurrent user target
- [ ] CDN / edge caching strategy
