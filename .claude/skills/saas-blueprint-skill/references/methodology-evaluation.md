# Methodology Evaluation Framework

Use this framework to assess any external development methodology, AI persona framework, or coding standard against a specific project.

## Evaluation Matrix

For each aspect of the methodology, classify as:

| Rating | Meaning | Action |
|--------|---------|--------|
| ✅ Keep | Aligns with project needs | Integrate into CLAUDE.md as-is |
| ⚠️ Adapt | Good idea, wrong specifics | Modify for project context |
| ❌ Override | Conflicts with project architecture | Replace with project-appropriate rule |
| ➕ Add | Gap in methodology | Create new rule the methodology missed |

## Assessment Dimensions

### 1. Core Philosophy
Does the methodology's fundamental approach match the project?

**Evaluate:**
- Architectural minimalism vs. over-engineering
- Convention over configuration preferences
- Attitude toward complexity and abstraction

**Common conflicts:**
- Methodology demands patterns the stack doesn't need (e.g., dependency injection in Python)
- Methodology is framework-agnostic but project uses opinionated framework

### 2. Async / Concurrency Model
Does the methodology's concurrency guidance fit the stack?

**Evaluate:**
- Stack's default execution model (sync vs. async)
- Methodology's stance on async patterns
- Where sync genuinely makes sense (config, transforms)

**Common conflicts:**
- "Prefer synchronous" with async-first frameworks (FastAPI, Next.js)
- "Always async" when most operations are CPU-bound

**Adaptation pattern:**
"Prefer straightforward async/await over complex concurrency. Use synchronous for config loading, data transforms, and utilities."

### 3. File Size Discipline
Are the size limits realistic for the stack's patterns?

**Evaluate per file type:**

| Type | Why limits vary |
|------|----------------|
| ORM models | Complex relationships, RLS helpers, many columns |
| React components | JSX is verbose, Tailwind classes add length |
| API endpoints | Thin wrappers should be short |
| Schemas | Separate create/update/response adds up |
| Migrations | Generated, shouldn't be constrained |
| Tests | Thoroughness matters more than brevity |

**Adaptation pattern:** Tiered limits rather than a single number.

### 4. Styling / CSS Conventions
Does the methodology's styling approach match the chosen design system?

**Common conflicts:**
- "Separate CSS files" with Tailwind (utility-first by design)
- "CSS modules" with shadcn/ui (components ship with Tailwind classes)

**Adaptation pattern:**
For Tailwind projects: utility classes on JSX, extract patterns into `cva` variants. For non-Tailwind: separate stylesheets.

### 5. File Organisation / Colocation
Does the methodology's file structure work with the framework's conventions?

**Common conflicts:**
- Generic colocation rules vs. Next.js App Router's `page.tsx` / `layout.tsx` / `loading.tsx`
- Component-per-folder vs. flat component directories

**Adaptation pattern:**
Follow the framework's conventions for routing files. Apply colocation for shared components.

### 6. Security Coverage
Does the methodology address the project's security requirements?

**Must-have for multi-tenant SaaS:**
- [ ] Row-Level Security (RLS) enforcement rules
- [ ] Dependency scanning in CI (`pip-audit`, `npm audit`)
- [ ] Secret management rules
- [ ] OWASP Top 10 awareness
- [ ] Auth token security (hashing, expiry, single-use)
- [ ] Rate limiting
- [ ] Input validation requirements
- [ ] CORS policy

**Common gaps:** Most methodologies focus on code quality, not infrastructure security.

### 7. Multi-Tenancy Discipline
Does the methodology address tenant isolation?

**Must-have:**
- [ ] Every query includes tenant context
- [ ] New tables require tenant column + RLS policy
- [ ] No raw SQL without RLS verification
- [ ] Testing includes cross-tenant isolation verification

**Common gaps:** This is almost always missing from generic methodologies.

### 8. Internationalisation (i18n)
Does the methodology address multi-language support?

**Must-have for multi-region deployment:**
- [ ] i18n library specified
- [ ] No hardcoded user-facing strings rule
- [ ] CI enforcement (scan for raw strings)
- [ ] Translation file structure defined

**Common gaps:** i18n is expensive to retrofit — must be addressed from day one.

### 9. Data Migration
Does the methodology address importing existing data?

**Must-have if the project replaces an existing system:**
- [ ] Idempotent migration scripts
- [ ] Validation before commit
- [ ] Rollback strategy
- [ ] Seed data for dev/test
- [ ] Import logging

**Common gaps:** Most methodologies assume greenfield development.

### 10. API Stability
Does the methodology address API contract management?

**Must-have for multi-consumer APIs:**
- [ ] API versioning strategy
- [ ] Breaking change policy
- [ ] Frontend-backend schema parity checks
- [ ] Route coverage verification (every page has an API)

### 11. Environment Parity
Does the methodology address multi-region deployment?

**Must-have for global + regional deployments:**
- [ ] Infrastructure abstraction (interfaces, not direct provider calls)
- [ ] Startup config validation
- [ ] Provider-specific code isolated in adapter directories

### 12. Enforcement Automation
Can the methodology's rules be automated?

**Map each rule to a tool:**

| Rule Type | Automation |
|-----------|-----------|
| Code style | Linter (ruff, eslint) |
| Type safety | Type checker (mypy, tsc) |
| File sizes | Custom lint rule |
| Dependency direction | import-linter, eslint-plugin-import |
| Dependency vulnerabilities | pip-audit, npm audit |
| i18n compliance | Custom TSX scanner |
| RLS coverage | Custom DB schema check |
| Schema parity | Custom model-to-schema matcher |

Rules that can't be automated go into the manual PR checklist.

## Persona Framework Evaluation

If the methodology includes AI persona/roleplay frameworks, apply additional criteria:

### What to Keep
- Identity attributes that affect code output (expertise level, communication style)
- Decision frameworks that improve reasoning (task protocol, quality standards)
- Self-validation rules that map to enforcement checkpoints

### What to Discard
- Confusion engines (ask for clarification instead)
- Escalating resistance protocols (counterproductive — push back with evidence once)
- Temporal era filtering (not applicable to modern software projects)
- Social dynamics / emotional weighting (doesn't improve code quality)
- Persona switching (single-purpose agent per project)
- JSON plugin binding schemas (express in natural language)
- Activation ceremonies ("Simulate Persona") — Claude Code reads CLAUDE.md natively

### Compression Target
- Original persona frameworks: typically 5,000–15,000 tokens
- CLAUDE.md persona section: ≤ 200 tokens
- Savings: 95%+ token reduction with no loss of code-relevant behaviour

## Output Format

After evaluation, produce:

1. **Summary table:** All 12 dimensions with ✅/⚠️/❌/➕ ratings
2. **Adaptation register:** For each ⚠️/❌/➕, document original → adapted rule
3. **Updated CLAUDE.md:** Integrate all adapted rules into the project context file
4. **Token audit:** Confirm CLAUDE.md ≤ 5,000 tokens
