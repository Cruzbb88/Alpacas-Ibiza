# Blueprint Document Template

A section-by-section template for the specification document. Adapt sections to fit the project — not every project needs every section, but every section here exists because a real project needed it.

## Contents

- [Document Structure](#document-structure) — Full section tree overview
- [§1 Executive Summary](#1-executive-summary)
- [§2 System Purpose & Scope](#2-system-purpose--scope) — Problem, boundaries, success criteria
- [§3 Core Components](#3-core-components) — Per-component template with entities, stories, rules
- [§4 Data Model](#4-data-model) — ER diagrams, table definitions, enums, RLS policies
- [§5 User Personas & Roles](#5-user-personas--roles) — RBAC, permission model
- [§6 Authentication & Authorisation](#6-authentication--authorisation) — Auth method, sessions, SSO
- [§7 API Specification](#7-api-specification) — Design patterns, endpoint inventory
- [§8 Non-Functional Requirements](#8-non-functional-requirements) — Performance, security, scalability, a11y, i18n
- [§9 LLM / AI Integration](#9-llm--ai-integration) — Use cases, providers, prompts, safety
- [§10 UI/UX Specification](#10-uiux-specification) — Design system, shell, screens, patterns
- [§11 Deployment & Infrastructure](#11-deployment--infrastructure) — Environments, CI/CD, monitoring
- [§12 Data Migration & Import](#12-data-migration--import) — Source inventory, migration rules, seed data
- [§13 Open Questions & Decisions Log](#13-open-questions--decisions-log)
- [§14 Development Readiness Status](#14-development-readiness-status)

---

## Document Structure

```
Blueprint.md
├── Header (title, version, changelog)
├── §1  Executive Summary
├── §2  System Purpose & Scope
├── §3  Core Components (one subsection per component)
├── §4  Data Model
├── §5  User Personas & Roles
├── §6  Authentication & Authorisation
├── §7  API Specification
├── §8  Non-Functional Requirements
├── §9  LLM / AI Integration (if applicable)
├── §10 UI/UX Specification
├── §11 Deployment & Infrastructure
├── §12 Data Migration & Import
├── §13 Open Questions & Decisions Log
└── §14 Development Readiness Status
```

---

## §1 Executive Summary

One page. Three paragraphs maximum.

- What the system does (one sentence)
- Who it serves (target users and organisations)
- Why it matters (business value proposition)

---

## §2 System Purpose & Scope

### 2.1 Problem Statement
What problem does this system solve? Be specific.

### 2.2 Scope Boundaries
What is IN scope (list features/components). What is OUT of scope (explicitly exclude to prevent creep).

### 2.3 Success Criteria
How will you know the system is working? Measurable outcomes.

---

## §3 Core Components

One subsection per component. For each:

### §3.x [Component Name]

**Purpose:** One sentence explaining why this component exists.

**Entities:**
| Entity | Description | Key Fields | Relationships |
|--------|-------------|------------|---------------|

**User Stories:**
- As a [role], I want to [action] so that [outcome].

**Business Rules:**
- Numbered list of validation rules, calculations, constraints.

**Status Lifecycle:**
```
draft → active → archived
       ↓
     suspended
```

**Screens / Views:**
List the UI screens this component requires.

**Integration Points:**
Which other components does this one interact with, and how?

---

## §4 Data Model

### 4.1 Entity Relationship Overview
ASCII or Mermaid diagram showing all entities and relationships.

### 4.2 Table Definitions
For each entity:

```sql
CREATE TABLE entity_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    -- domain fields --
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES "user"(id),
    updated_by UUID REFERENCES "user"(id)
);
```

### 4.3 Enumerations
All enum types used across the data model, with values and descriptions.

### 4.4 RLS Policies
Template for tenant isolation:
```sql
CREATE POLICY tenant_isolation ON entity_name
    USING (organization_id = current_setting('app.current_org')::uuid);
```

---

## §5 User Personas & Roles

### 5.1 Personas
For each user type: name, role, goals, technical level, frequency of use.

### 5.2 Role-Based Access Control
| Role | Can View | Can Edit | Can Delete | Can Admin |
|------|----------|----------|------------|-----------|

### 5.3 Permission Model
How permissions are assigned (role-based, attribute-based, or hybrid).

---

## §6 Authentication & Authorisation

### 6.1 Auth Method
Primary auth method (passwordless magic links, OAuth, SSO, etc.).

### 6.2 Session Management
Token types, expiry, refresh strategy, storage (HttpOnly cookies vs. localStorage).

### 6.3 Domain Verification
How organisations are verified (DNS TXT, email domain, manual approval).

### 6.4 Enterprise SSO
If applicable: OAuth/SAML integration requirements.

---

## §7 API Specification

### 7.1 Design Patterns
- Endpoint URL structure
- HTTP methods and their semantics
- Request/response format
- Pagination pattern
- Error response format
- Rate limiting

### 7.2 Endpoint Inventory
| Method | Endpoint | Description | Auth | Component |
|--------|----------|-------------|------|-----------|

---

## §8 Non-Functional Requirements

### 8.1 Performance
- Page load targets
- API response time targets
- Concurrent user capacity
- Data volume expectations

### 8.2 Security
- OWASP Top 10 compliance
- Data encryption (at rest, in transit)
- Audit logging requirements
- Penetration testing requirements

### 8.3 Scalability
- Horizontal scaling approach
- Database scaling strategy
- CDN / edge caching

### 8.4 Accessibility
- WCAG compliance level
- Keyboard navigation
- Screen reader support
- Colour contrast requirements

### 8.5 Internationalisation
- Supported languages
- RTL support (if needed)
- Date/time/currency formatting
- Translation management approach

---

## §9 LLM / AI Integration

(Skip if not applicable)

### 9.1 Use Cases
Where AI assists users (analysis, generation, recommendations).

### 9.2 Provider Strategy
Primary and fallback LLM providers. Regional alternatives (e.g., China).

### 9.3 Prompt Library
Template prompts with variable substitution. Categories by use case.

### 9.4 Safety & Moderation
Content filtering, token limits, cost controls, user opt-in.

---

## §10 UI/UX Specification

### 10.1 Design System
Colours, typography, spacing, component library, brand tokens.

### 10.2 Application Shell
Layout (sidebar, header, content area). Navigation structure. Responsive behaviour.

### 10.3 Screen Specifications
For each screen: wireframe description, component breakdown, data requirements, interactions.

### 10.4 Component Patterns
Standard patterns for: data tables, forms, modals, status indicators, charts.

---

## §11 Deployment & Infrastructure

### 11.1 Environments
| Environment | Purpose | URL Pattern |
|-------------|---------|-------------|

### 11.2 Infrastructure by Region
| Layer | Region 1 | Region 2 (if applicable) |
|-------|----------|--------------------------|

### 11.3 CI/CD Pipeline
Build, test, deploy stages. Quality gates between environments.

### 11.4 Monitoring & Alerting
What to monitor. Alert thresholds. Incident response.

---

## §12 Data Migration & Import

### 12.1 Source Data Inventory
| Source | Format | Records | Target Entity | Complexity |
|--------|--------|---------|---------------|------------|

### 12.2 Migration Rules
- Idempotent (re-runnable without duplicates)
- Validated (row counts, referential integrity checked)
- Reversible (rollback strategy)
- Logged (summary of each run)

### 12.3 Seed Data
What data is needed in dev/test environments. How it's generated.

---

## §13 Open Questions & Decisions Log

| # | Question | Category | Status | Answer | Date |
|---|----------|----------|--------|--------|------|
| 1 | Example question? | Data Model | ANSWERED | Decision made because... | 2026-01-15 |

Status values: OPEN, ANSWERED, DEFERRED.

---

## §14 Development Readiness Status

| Section | Score (1-5) | Status | Notes |
|---------|-------------|--------|-------|
| §3.1 Component A | 5 | READY | Implementation-ready |
| §3.2 Component B | 3 | BLOCKED | Needs [dependency] resolved |

Overall readiness: [weighted average]%

**Proceed when ≥ 70%.** Below 70%, return to Phase 2.
