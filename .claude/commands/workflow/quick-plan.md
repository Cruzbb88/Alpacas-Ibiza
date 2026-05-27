---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, MultiEdit, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember
description: Creates a concise engineering implementation plan based on user requirements and saves it to specs/todo directory
argument-hint: [user prompt]
model: opus
---

# Quick Plan

Create a detailed implementation plan based on the user's requirements provided through the `USER_PROMPT` variable. Analyze the request, think through the implementation approach, and save a comprehensive specification document to `PLAN_OUTPUT_DIRECTORY/<name-of-plan>.md` that can be used as a blueprint for actual development work.

## Variables

USER_PROMPT: $ARGUMENTS
PLAN_OUTPUT_DIRECTORY: `specs/todo/`

## Folder Setup (First Step)

Before doing anything else, ensure the specs folder structure exists:
```bash
mkdir -p specs/todo specs/done
```
- `specs/todo/` = Plans waiting to be implemented (NEW plans go here)
- `specs/done/` = Completed plans (moved here by /build after implementation)

## Pre-Planning Research

Before creating the plan:
- Search for similar plans: `cortex_recall: "plan {feature_keywords}"`
- Search cross-project patterns: `cortex_global_search: "{architecture_keywords}"`
- Use recalled context to inform design decisions and avoid reinventing solutions

## CRITICAL: Multi-Spec Split Rule

**Before finalizing your plan, count the phases. Apply these rules:**

### Phase Count Rules

| Phases | Complexity | Action |
|--------|------------|--------|
| 1-3 | Any | Single spec file |
| 4+ | Simple (quick tasks, minimal code) | Single spec file OK |
| 4+ | Complex (significant code, multiple files, new features) | **SPLIT into multiple specs** |

### How to Split Complex Specs

When a plan has 4+ complex phases, split it into **sequential spec files**:

1. **Naming Convention**: `01-feature-name-part-one.md`, `02-feature-name-part-two.md`
2. **Max 3 phases per spec** for complex features
3. **Each spec should be independently buildable** - no half-finished states
4. **Clear dependencies**: Later specs reference earlier ones

### Split Example

Instead of:
```
feature-big-thing.md (5 complex phases)
```

Create:
```
01-feature-big-thing-foundation.md (Phases 1-2: Backend + Models)
02-feature-big-thing-frontend.md (Phases 3-4: UI Components)
03-feature-big-thing-integration.md (Phase 5: Wire together + Polish)
```

### What Makes a Phase "Complex"?

A phase is complex if it involves:
- Creating new database tables or models
- Building multiple new components/files
- Implementing new API endpoints with business logic
- Adding real-time features (WebSockets, polling)
- Significant refactoring of existing code
- New external integrations

A phase is simple if it involves:
- Adding a single small component
- Minor styling changes
- Configuration updates
- Simple CRUD operations
- Documentation updates

## Spec Size Guidelines

**Target: 100-700 lines per spec | Maximum: 800 lines**

If your spec exceeds 800 lines, you are overengineering. Split it or reduce detail.

### Why Size Matters
- Large specs indicate pre-written code, not specifications
- Implementers should write code FROM specs, not copy-paste
- Smaller specs = better agent focus, faster implementation cycles
- The agent implementing the spec needs room to work - bloated specs consume context

### Size Check Before Saving
Before finalizing any spec, estimate line count:
| Line Count | Assessment |
|------------|------------|
| 100-400 | ✅ Lean and focused - ideal for simple features |
| 400-600 | ✅ Good balance - ideal for moderate features |
| 600-700 | ✅ Acceptable for complex features |
| 700-800 | ⚠️ At the limit - consider trimming |
| Over 800 | ❌ MUST split or reduce implementation detail |

## Spec Content Template

Every spec should follow this structure:

| Section | Lines | Purpose |
|---------|-------|---------|
| Overview & Goals | ~30-50 | Problem statement, success criteria |
| Dependencies | ~20-30 | Prerequisites, packages, prior specs |
| Architecture | ~50-100 | Design decisions, data flow (diagrams encouraged) |
| Interface Definitions | ~50-100 | Core TypeScript types, API contracts |
| Task Breakdown | ~150-250 | WHAT to build, key implementation notes |
| Test Criteria | ~30-50 | Acceptance tests, key edge cases |
| Gotchas/Notes | ~20-30 | Common pitfalls, things to watch for |

**Total Target: ~350-610 lines** (leaves room for the implementing agent to work)

### What TO Include
- ✅ Interface/type definitions (the contracts)
- ✅ Architecture decisions with rationale
- ✅ Task descriptions (WHAT to build)
- ✅ Key implementation notes and gotchas
- ✅ Test criteria and acceptance conditions
- ✅ Pseudocode for complex algorithms

### What NOT to Include (Overengineering Signs)
- ❌ Full function implementations (describe what the function does instead)
- ❌ Complete error handling for every edge case (list key cases only)
- ❌ Multiple provider variants written out in full (describe the abstraction pattern)
- ❌ Every possible TypeScript utility type (core interfaces only)
- ❌ Full test file implementations (describe test cases)
- ❌ Exhaustive JSDoc comments (save for implementation)

### The 50% Rule
If more than 50% of your spec is actual runnable code blocks, you've crossed from "specification" to "pre-implementation." Scale back to describe WHAT, not HOW.

## Large Project Strategy (10+ Specs)

For complex systems requiring many specs (e.g., full platforms):

### Domain Grouping
Group specs into logical domains with numeric prefixes:
```
01-03: Foundation (database, auth, core utilities)
04-06: Data Layer (APIs, services, integrations)
07-09: UI Components (nodes, editors, viewers)
10-12: Infrastructure (execution, queues, real-time)
13-15: Features (advanced capabilities)
16-17: Polish (templates, optimization)
```

### Checkpoint Batching
- **Batch size**: 3-4 specs per checkpoint
- **Checkpoint action**: Handoff memory with completed specs listed
- **Resume point**: Clear "next spec to expand/implement" marker

### Spec Dependency Tracking
Each spec should list at the top:
- **Depends on**: [spec numbers that must be complete first]
- **Blocks**: [spec numbers that depend on this one]

### When to Split Specs Further
If a single feature needs > 1000 lines to specify:
1. Split by concern (e.g., "11a-execution-core", "11b-job-queue", "11c-websocket-progress")
2. Each sub-spec should be independently implementable
3. Use letter suffixes to maintain ordering within the sequence

## Instructions

- Carefully analyze the user's requirements provided in the USER_PROMPT variable
- Think deeply about the best approach to implement the requested functionality or solve the problem
- **Count your phases and assess complexity BEFORE writing the spec**
- If splitting is required, create multiple spec files with clear sequencing
- Create a concise implementation plan that includes:
  - Clear problem statement and objectives
  - Technical approach and architecture decisions
  - Step-by-step implementation guide
  - Potential challenges and solutions
  - Testing strategy
  - Success criteria
- Generate a descriptive, kebab-case filename based on the main topic of the plan
- Save the complete implementation plan to `PLAN_OUTPUT_DIRECTORY/<descriptive-name>.md`
- Ensure the plan is detailed enough that another developer could follow it to implement the solution
- Include code examples or pseudo-code where appropriate to clarify complex concepts
- Consider edge cases, error handling, and scalability concerns
- Structure the document with clear sections and proper markdown formatting

## Workflow

1. Setup Folders - Run `mkdir -p specs/todo specs/done` to ensure folder structure exists
2. **Detect Existing Roadmaps** - Glob `specs/ROADMAP-*.md` to list all existing roadmaps. Read their headers to understand active workstreams. If the new specs belong to an existing workstream, plan to UPDATE that roadmap. If new workstream, plan to CREATE a new roadmap with an appropriate feature slug.
3. Analyze Requirements - THINK HARD and parse the USER_PROMPT to understand the core problem and desired outcome
4. Design Solution - Develop technical approach including architecture decisions and implementation strategy
5. **Assess Complexity** - Count phases, determine if split is needed
6. Document Plan(s) - Structure comprehensive markdown document(s) with problem statement, implementation steps, and testing approach
7. Generate Filename(s) - Create descriptive kebab-case filename(s), with numeric prefixes if splitting
8. Save & Report - Write plan(s) to `PLAN_OUTPUT_DIRECTORY/` and provide a summary of key components
9. **Generate/Update Roadmap** - If multi-spec split (2+ specs), run the Roadmap Generation workflow below

## Roadmap Generation (Multi-Spec Only)

**Skip this section entirely if only 1 spec was generated.**

When 2+ specs are generated (multi-spec split), generate or update a roadmap file:

### Step 1: Detect Existing Roadmaps

1. Glob `specs/ROADMAP-*.md` to find all existing roadmaps
2. Read each roadmap's `# Roadmap — [Feature Name]` header
3. Compare the current feature name/slug against existing roadmaps
4. **If match found:** UPDATE that roadmap (add new specs, preserve completed checklist items, add `Updated: {date}` to header)
5. **If no match:** CREATE new `specs/ROADMAP-{feature-slug}.md`

### Step 2: Build Dependency Graph

1. Read each generated spec's `Depends on:` and `Blocks:` headers
2. Build a directed acyclic graph of dependencies
3. Topologically sort specs into phases:
   - Specs with NO dependencies → Phase 1
   - Specs depending only on Phase 1 specs → Phase 2
   - Continue until all specs are phased
4. Within each phase, classify specs:
   - **No cross-dependencies within phase** → PARALLEL (use `/agent-teams`)
   - **Cross-dependencies within phase** → SEQUENTIAL (use `/build` one at a time)

### Step 3: Set Checklist Status

1. Scan `specs/done/` for all `.md` files
2. Scan `specs/todo/` for all `.md` files
3. For each spec listed in the roadmap:
   - Found in `specs/done/` → `[x]` with file modification date as completion date
   - Found in `specs/todo/` → `[ ]`
   - Not found in either → `[?] (spec file not found)`
4. Mark phase status: if ALL specs in a phase are `[x]` → phase = DONE

### Step 4: Write Roadmap

Use this template:

```markdown
# Roadmap — [Feature Name]

## Created: [date]
## Updated: [date]
## Total Specs: [N] | Completed: [M] | Remaining: [N-M]

---

## Checklist

- [x] Phase 1: [description] (completed [date])
- [ ] Phase 2: [description]
  - [x] `01-spec-name.md` — [brief] (DONE 2026-02-14)
  - [ ] `02-spec-name.md` — [brief]
- [ ] Phase 3: [description]
  - [ ] `03-spec-name.md` — [brief]
  - [ ] `04-spec-name.md` — [brief]

---

## Phase [N]: [Description] ([SEQUENTIAL|PARALLEL x N]) [DONE|PENDING]

> [Why this phase exists / what it unlocks]

| Order | Spec File | What It Builds | Depends On | Status |
|-------|-----------|---------------|------------|--------|
| N.1 | `spec-name.md` | Description | None / Spec X | [ ] / [x] |

### How to Build Phase [N]

**Sequential (has dependencies):**
/build specs/todo/[spec-name].md

**Parallel (independent specs):**
/agent-teams specs/ROADMAP-[feature].md phase-[N]

---

## Execution Timeline

TIME ---------------------------------------------------------------->
Phase 1   [DONE]        spec-a → spec-b
Phase 2   [PARALLEL x3] spec-c | spec-d | spec-e
Phase 3   [SEQUENTIAL]  spec-f (depends on Phase 2)
```

### Roadmap Naming Convention

- File: `specs/ROADMAP-{feature-slug}.md`
- Slug: kebab-case descriptor (e.g., `skills-ecosystem`, `auth-system`, `surity-pilots`)
- Location: `specs/` root — NOT inside `specs/todo/` or `specs/done/`
- Multiple roadmaps per project are expected (one per workstream)

## Report

After creating and saving the implementation plan(s), provide a concise report with the following format:

### Single Spec Report
```
Implementation Plan Created

File: specs/todo/<filename>.md
Topic: <brief description of what the plan covers>
Phases: <count> (Complexity: <simple/moderate/complex>)
Key Components:
- <main component 1>
- <main component 2>
- <main component 3>

Next: Run `/build specs/todo/<filename>.md` to implement this plan
```

### Multi-Spec Report (when split)
```
Implementation Plan Created (Split into <N> specs)

Spec 1: specs/todo/01-<name>.md
  Phases: <count>
  Focus: <what this spec covers>

Spec 2: specs/todo/02-<name>.md
  Phases: <count>
  Focus: <what this spec covers>
  Depends on: Spec 1

[Additional specs if any]

Roadmap: specs/ROADMAP-<feature>.md [CREATED|UPDATED]
  Phases: <count> (<completed>/<total>)
  Max Parallelism: <N> agents
  Build Order: Phase 1 (sequential) → Phase 2 (parallel x3) → ...

Key Components (Overall):
- <main component 1>
- <main component 2>
- <main component 3>

Next: Run `/build specs/todo/01-<name>.md` first (see roadmap for full build order)
```

## Post-Plan Memory Storage

Store plan reference: `cortex_remember`
- Content: Plan summary including:
  - File path(s) to plan(s)
  - Key objectives
  - Major architectural decisions
  - Technologies/patterns chosen
  - **Whether spec was split and why (if applicable)**
  - **Roadmap file path** (if generated/updated)
  - **Phase count and parallelism summary** (if roadmap generated)
  - **Dependency chain summary** (if roadmap generated)
- Tags: ["plan", "todo", "{project_name}", "{feature_area}"] (add "roadmap" and "dependencies" tags if roadmap was generated)
- Type: "decision"
- Importance: 70 (plans are valuable for future reference)
