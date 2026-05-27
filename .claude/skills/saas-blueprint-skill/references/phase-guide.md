# Phase Guide — SaaS Blueprint Methodology

The complete 6-phase workflow from concept to Claude Code handoff.

## Contents

- [Phase 1: Discovery](#phase-1-discovery) — Entity discovery, stakeholder mapping, constraints
- [Phase 2: Specification](#phase-2-specification) — Blueprint document, structured questionnaires, versioning
- [Phase 3: Architecture](#phase-3-architecture) — Tech stack, multi-tenancy, data model, API design
- [Phase 4: Readiness Assessment](#phase-4-readiness-assessment) — Completeness scoring, dependency mapping, risk register
- [Phase 5: Methodology Adaptation](#phase-5-methodology-adaptation) — External methodology evaluation, persona optimisation
- [Phase 6: Handoff](#phase-6-handoff) — CLAUDE.md, project scaffold, implementation guide
- [Anti-Patterns](#anti-patterns) — Common mistakes and what to do instead

---

## Phase 1: Discovery

**Goal:** Understand the domain, users, existing data, and constraints before writing a single requirement.

### Inputs
- Stakeholder interviews or descriptions
- Existing documents (Excel, guides, SOPs, process maps)
- Domain context (industry, regulations, geography)

### Activities

**1.1 Entity Discovery**
Upload all existing documents. For each, extract:
- Entities mentioned (nouns that need to be tracked)
- Relationships between entities
- Attributes that describe each entity
- Status lifecycles (draft → active → archived)

Output: Entity inventory table with columns: Entity, Source Document, Key Attributes, Relationships.

**1.2 Stakeholder Mapping**
Identify every user type. For each, capture:
- Role name and description
- What they need to see (read access)
- What they need to do (write access)
- How often they interact with the system
- Technical sophistication level

Output: User persona table.

**1.3 Constraint Discovery**
Surface constraints early — they shape everything:
- Deployment regions (does it need to work in China, EU, etc.?)
- Regulatory requirements (GDPR, data residency, industry-specific)
- Integration requirements (ERP, CRM, existing tools)
- Performance expectations (concurrent users, data volume)
- Budget constraints (hosting, licensing, team size)

Output: Constraints register.

**1.4 Open Questions Log**
Every ambiguity becomes a numbered question. Don't assume — ask. Group questions by category (data model, UX, integration, security, scope). Track status: OPEN, ANSWERED, DEFERRED.

### Quality Gate
- [ ] All uploaded documents analysed
- [ ] Entity inventory covers all source material
- [ ] User personas identified and described
- [ ] Constraints register populated
- [ ] Open questions list has zero OPEN items (or explicitly DEFERRED with rationale)

---

## Phase 2: Specification

**Goal:** Transform discovery outputs into a complete, versioned Blueprint document.

### The Blueprint Document

A single Markdown file that serves as the specification. Sections are added incrementally, version-controlled with a changelog.

See `references/blueprint-template.md` for the section-by-section template.

### Activities

**2.1 Component Identification**
Group entities into logical feature domains (components). Each component should be:
- Cohesive (entities within it are tightly related)
- Loosely coupled (components interact through defined interfaces)
- Independently buildable (a team could work on one without blocking others)

Typically 5–10 components for a mid-size SaaS platform.

**2.2 Structured Questionnaires**
For each component, work through a comprehensive questionnaire covering:
- Data model (entities, fields, types, constraints, relationships)
- User interactions (CRUD operations, workflows, approvals)
- Business rules (validation, calculations, status transitions)
- Reporting and analytics (dashboards, exports, KPIs)
- Integration points (with other components, external systems)

The questionnaire technique works better than open-ended requirements gathering because it surfaces gaps the stakeholder wouldn't think to mention.

**2.3 Incremental Versioning**
Version the Blueprint after each significant addition:
- v0.1–v0.9: Discovery and initial requirements
- v1.0: First complete specification (all components covered)
- v1.x: Refinements, additions, gap-filling
- Changelog: Every version increment documents what was added/changed

**2.4 Cross-Component Consistency**
After every 2–3 component additions, review for:
- Entity naming consistency (same entity, same name everywhere)
- Relationship symmetry (if A references B, B acknowledges A)
- Enum value consistency (same status values across components)
- API pattern consistency (same URL structure, same pagination)

### Quality Gate
- [ ] Every component has a dedicated section
- [ ] Data model covers all entities from Phase 1
- [ ] No unresolved cross-references
- [ ] Version ≥ 1.0 with changelog
- [ ] Open questions from Phase 1 all addressed

---

## Phase 3: Architecture

**Goal:** Make technology choices and define the technical architecture that implements the Blueprint.

### Activities

**3.1 Technology Stack Selection**
For each layer, evaluate options against project constraints:

| Layer | Decision Factors |
|-------|-----------------|
| Frontend | SSR needs, component library, styling approach, i18n |
| Backend | Language, framework, sync vs async, API style |
| Database | Relational vs document, multi-tenancy approach, hosting |
| Auth | Passwordless, SSO, social login, token management |
| Storage | File types, size limits, CDN, regional compliance |
| Hosting | Global vs regional, edge, China considerations |
| LLM | Provider, fallback, moderation, cost control |

Document each decision with: choice, alternatives considered, rationale, trade-offs.

**3.2 Multi-Tenancy Architecture**
This is the highest-risk architectural decision. Choose one:
- **Row-Level Security (RLS):** Single DB, tenant column on every table, DB-enforced isolation
- **Schema-per-tenant:** Single DB, separate schemas, middleware routing
- **Database-per-tenant:** Separate databases, connection routing

For most SaaS platforms, RLS is the right choice (simplest, most scalable, lowest ops burden).

Rules that apply regardless of approach:
- Every tenant-scoped table must have the tenant identifier
- Every query must include tenant context
- No raw SQL without tenant filtering verification
- Admin/superadmin queries use service-role credentials with explicit intent

**3.3 Data Model**
Convert Blueprint entities into a concrete database schema:
- Table definitions with columns, types, constraints
- Foreign key relationships
- Indexes (at minimum: tenant_id, common query patterns)
- RLS policies
- Enums as database types or application-level constants

**3.4 API Design**
Define the API surface:
- Endpoint patterns (REST, versioned: `/api/v1/{resource}`)
- Standard response formats (pagination, errors)
- Authentication flow (token types, expiry, refresh)
- Rate limiting strategy
- CORS policy

**3.5 Infrastructure Plan**
For each deployment region, map:
- Compute (hosting for frontend and backend)
- Database (managed PostgreSQL, connection pooling)
- Storage (object storage for files/images)
- Cache (session store, rate limiting)
- LLM (provider, fallback, China-specific alternatives)

If dual-region: define the **infrastructure abstraction layer** — business logic calls interfaces, not providers.

### Quality Gate
- [ ] Every Blueprint component has a corresponding technical design
- [ ] Multi-tenancy approach chosen and documented
- [ ] Data model covers all Blueprint entities
- [ ] API design patterns established
- [ ] Infrastructure plan covers all deployment regions
- [ ] Provider abstraction defined (if multi-region)

---

## Phase 4: Readiness Assessment

**Goal:** Systematically evaluate whether the specification is complete enough to begin implementation.

### Activities

**4.1 Completeness Scoring**
Rate each Blueprint section on a 5-point scale:

| Score | Meaning |
|-------|---------|
| 5 | Implementation-ready, no ambiguity |
| 4 | Minor clarifications needed, non-blocking |
| 3 | Some gaps, need resolution before building |
| 2 | Significant gaps, would cause rework |
| 1 | Missing or fundamentally incomplete |

**4.2 Dependency Mapping**
For each component, identify:
- What it depends on (must be built first)
- What depends on it (blocks other work)
- Shared infrastructure requirements

Output: Build order / phase roadmap.

**4.3 Risk Register**
Identify implementation risks:
- Technical risks (unproven patterns, performance unknowns)
- Scope risks (components that may expand during build)
- Integration risks (external systems, third-party APIs)
- Security risks (auth flows, data isolation, compliance)

**4.4 Readiness Report**
A single document summarising:
- Overall readiness score (weighted average of section scores)
- Critical gaps that block implementation
- Recommended phase sequence
- Estimated effort per phase

### Quality Gate
- [ ] Every Blueprint section scored
- [ ] Critical gaps identified with resolution plan
- [ ] Phase sequence defined
- [ ] Overall readiness score ≥ 70% (proceed) or < 70% (return to Phase 2)

---

## Phase 5: Methodology Adaptation

**Goal:** If using an external development methodology or AI persona framework, evaluate it against the project and produce an adapted version.

### Activities

**5.1 Methodology Evaluation**
For any external methodology, assess across these dimensions:

| Dimension | Question |
|-----------|----------|
| Core philosophy | Does it align with the project's architectural choices? |
| Phase discipline | Does it support incremental, gated delivery? |
| Enforcement | Can its rules be automated in CI/CD? |
| Stack compatibility | Do its conventions work with the chosen tech stack? |
| Security coverage | Does it address multi-tenancy, auth, OWASP? |
| Deployment coverage | Does it handle multi-region, i18n, environment parity? |
| Data coverage | Does it handle migration, seed data, import quality? |
| API stability | Does it address contract testing, versioning? |

See `references/methodology-evaluation.md` for the full assessment framework.

**5.2 Adaptation**
For each conflict or gap identified:
- Document the original recommendation
- Document the project-specific reality
- Produce the adapted rule
- Classify: ✅ Keep as-is, ⚠️ Adapt, ❌ Override, ➕ Add (was missing)

**5.3 Persona Optimisation (if applicable)**
If the methodology includes AI persona/roleplay frameworks:
- Extract what affects code quality (identity, conventions, constraints)
- Discard what doesn't (confusion engines, escalation protocols, social dynamics)
- Express in natural language, not JSON plugin schemas
- Target ≤ 5,000 tokens for the complete CLAUDE.md

### Quality Gate
- [ ] Every methodology recommendation evaluated
- [ ] Conflicts have adapted alternatives
- [ ] Missing gaps have new rules
- [ ] Token budget for CLAUDE.md ≤ 5,000 tokens

---

## Phase 6: Handoff

**Goal:** Package everything into the artifacts that Claude Code needs to begin implementation.

### Outputs

**6.1 CLAUDE.md**
The single context file Claude Code reads at session start. Must include:
- Identity and working style
- Project summary and component list
- Tech stack tables
- Architectural principles (non-negotiable rules)
- Coding conventions with examples
- Enforcement checklists (automated + manual + phase gate)
- Security rules
- Data migration rules (if importing existing data)
- Environment parity rules (if multi-region)
- Task execution protocol (step-by-step)
- What NOT to do (explicit prohibitions)
- Project structure diagram
- Phase roadmap
- Component quick reference with API prefixes and Blueprint section numbers

See `references/claude-md-template.md` for the complete template.

**6.2 Project Scaffold**
Directory structure matching the CLAUDE.md project structure section:
- Monorepo with workspace configuration
- Package directories for each layer (API, web, shared)
- Configuration files (.env.example, linter configs, CI workflows)
- Empty but correctly named directories for models, schemas, endpoints, components

**6.3 Implementation Guide**
Phase-by-phase build instructions:
- Phase 0: Foundation (CI/CD, auth, database, RLS)
- Phase 1: Core CRUD (primary components)
- Phase 2: Advanced features (secondary components, integrations)
- Phase 3: Hardening (E2E tests, load tests, i18n completion, deployment)

Each phase lists: files to create, dependencies, success criteria.

### Quality Gate
- [ ] CLAUDE.md ≤ 5,000 tokens
- [ ] CLAUDE.md covers all 12 evaluation dimensions from Phase 5
- [ ] Project scaffold matches CLAUDE.md structure diagram
- [ ] Implementation guide covers all Blueprint components
- [ ] All files saved to project directory

---

## Anti-Patterns

Patterns observed during the development of this methodology that should be avoided:

| Anti-Pattern | Why It Fails | What to Do Instead |
|-------------|-------------|-------------------|
| Starting with code | No shared understanding of what to build | Start with Phase 1 Discovery |
| Monolithic specification sessions | Context window fills, quality drops | Break into 2–4 hour sessions, one component per session |
| Assuming tech stack | Stack should serve requirements, not vice versa | Complete Phase 2 before Phase 3 |
| Skipping multi-tenancy design | Retrofitting tenant isolation is extremely expensive | Make it the first architectural decision |
| Loading full methodology into Claude Code | Wastes 10K+ tokens on meta-instructions | Distil to ≤ 5K token CLAUDE.md |
| Generic CLAUDE.md | Lacks project-specific constraints | Include real code examples, real table names, real API paths |
| No enforcement checkpoints | Rules exist but aren't checked | Automate in CI; manual checklist for what can't be automated |
| Deferring i18n | Retrofitting translation keys across hundreds of components | Add translation library and convention from day one |
| Ignoring data migration | Existing data doesn't magically appear in the new system | Treat import scripts as first-class code with quality gates |
