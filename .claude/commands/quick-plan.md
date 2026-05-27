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

**Done Mirror Rule:** When creating a project subfolder in `specs/todo/{project-name}/`, also create the matching subfolder in `specs/done/`:
```bash
mkdir -p specs/todo/{project-name} specs/done/{project-name}
```
This pre-stages the destination so `/build` always has a target directory.

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

### Spec Numbering Rules (ALWAYS APPLY)

> **Universal Rule:** These numbering and subfolder rules apply to ALL projects — Workshop, client workspaces, and any directory with a `specs/` folder. The convention is not project-specific.

Numeric prefixes (`NN-`) are **mandatory** for ALL specs, not just splits:

**Rule 1: Multi-spec projects always get numbers.**
If 2+ specs are being generated for the same project/feature, every spec gets a `NN-` prefix.

**Rule 2: Project subfolder specs auto-number.**
When saving to a project subfolder (`specs/todo/{project-name}/`), check existing files:
1. Glob `specs/todo/{project-name}/[0-9][0-9]-*.md`
2. Extract the highest `NN` prefix (default 0 if none exist)
3. Assign the next number: `NN+1`
4. Zero-pad to 2 digits: `01`, `02`, ..., `10`, etc.

**Rule 3: Single standalone specs are the only exception.**
A single spec saved directly to `specs/todo/` (no subfolder) does NOT need a number prefix.

**Rule 4: One-offs don't need subfolders in todo/.**
Single standalone specs can remain flat in `specs/todo/`. The `/build` command will route them to `specs/done/one-offs/` when completed. No number prefix required for one-offs.

**Examples:**
```
# Single spec (no number needed):
specs/todo/fix-auth-redirect.md

# Multi-spec project (numbers mandatory):
specs/todo/unified-reports/01-unified-reports-convention.md
specs/todo/unified-reports/02-unified-reports-group-a.md
specs/todo/unified-reports/03-unified-reports-crystal-ball.md

# Adding to existing project (auto-increment):
# Existing: 01-*, 02-*, 03-* → next spec gets 04-
specs/todo/unified-reports/04-unified-reports-new-feature.md
```

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
| Acceptance Criteria | ~20-40 | Explicit definition of done: what must be true for this spec to be considered complete. Testable conditions the evaluator grades against. |
| Verification | ~10-20 | Procedural validation steps to run after build |
| Gotchas/Notes | ~20-30 | Common pitfalls, things to watch for |

**Total Target: ~370-670 lines** (leaves room for the implementing agent to work)

### What TO Include
- ✅ Interface/type definitions (the contracts)
- ✅ Architecture decisions with rationale
- ✅ Task descriptions (WHAT to build)
- ✅ Key implementation notes and gotchas
- ✅ Test criteria and acceptance conditions
- ✅ Acceptance criteria (explicit definition of done — testable conditions an evaluator grades against)
- ✅ Verification steps (procedural validation)
- ✅ Pseudocode for complex algorithms

### Verification Section (ALWAYS Include)

Every spec MUST include a `## Verification` section after Test Criteria. This section contains **procedural steps** the builder runs after implementation to validate the work. At minimum, include:

```markdown
## Verification

After implementation, run these validation steps:

1. **Quick test** (L1 static + L2 test suites):
   ```bash
   /test quick
   ```
2. **Spec-specific smoke test:**
   - [describe 1-3 manual or scripted checks specific to this spec]
3. **Regression check:**
   - [describe what existing functionality must still work]
```

**Why:** Declarative Test Criteria describe WHAT should pass. Verification describes HOW to confirm it passes — and catches issues before the next session instead of discovering regressions later.

**Rules:**
- `/test quick` (L1+L2) is the **minimum gate** for every spec — never omit it
- Add spec-specific smoke tests for anything `/test quick` can't catch (e.g., CLI commands, file outputs, visual rendering)
- For specs that modify existing functionality, include a regression check
- For specs that are purely config/docs with no runnable code, replace `/test quick` with the appropriate validation (e.g., "verify YAML parses", "confirm file renders correctly")

### Batch Operation Hint (Script-First)

When the spec involves batch operations — **5+ API calls** against any service (Airtable, Supabase,
Google Workspace, n8n, etc.) OR **complex bulk work** with structured logic, error tracking, or
multi-item processing — include this note in the Architecture or Task section:

> "Build via Python script. Check `~/.claude/scripts/templates/` for a matching template (e.g.,
> `airtable_batch.py` for Airtable Metadata API ops, `file_batch_processor.py` for bulk file work,
> `api_batch.py` for generic REST). Run `script_list` via Script Runner MCP to discover available
> templates."

Reference the specific template name if the service or operation type is known. This ensures the BUILD
phase agent uses a script instead of sequential MCP calls or ad-hoc Bash loops (10-50x fewer tokens).
**Skip this hint for simple file creation, single API calls, or Bash-pipeable text/file ops.**

### ADW Pipeline Recommendation (Only When HAS_ADW=true)

When the project has an `adws/configs/` directory (detected in Workflow step 1b), append an **ADW Pipeline** section near the end of the generated spec, before any "Next Steps" section. Use this format:

```markdown
## ADW Pipeline

**Recommended config:** `{config}.yaml` (~{time estimate})
**Command:**
\`\`\`bash
uv run adws/run_adw.py --config adws/configs/{config}.yaml --spec {this-spec-path}
\`\`\`

**Rationale:** {why this config was chosen}
```

Select the config based on the spec's nature:

| Condition | Recommended Config | Time Estimate |
|-----------|-------------------|---------------|
| Bug fix, hotfix, or small patch | `hotfix.yaml` | ~15-25 min |
| Docs, trivially safe, config-only | `minimal.yaml` | ~10-20 min |
| Normal feature spec (default) | `standard.yaml` | ~35-55 min |
| Security-sensitive changes (auth, API keys, encryption) | `security.yaml` | ~45-70 min |
| Critical/complex spec with external deps | `full.yaml` | ~65-95 min |
| Novel/experimental with lessons to capture | `full_learning.yaml` | ~100-130 min |

If `adws/configs/` does not exist in the project, omit this section entirely from the generated spec.

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

1. Setup Folders - Run `mkdir -p specs/todo specs/done specs/roadmaps` to ensure folder structure exists
1b. **Detect ADW Pipeline** - Check if `adws/configs/` exists in the project root. If yes, set HAS_ADW=true and include the ADW Pipeline section in the generated spec output. If no, skip ADW references entirely.
2. **Detect Existing Roadmaps** - Glob `specs/roadmaps/ROADMAP-*.md` to list all existing roadmaps. Read their headers to understand active workstreams. If the new specs belong to an existing workstream, plan to UPDATE that roadmap. If new workstream, plan to CREATE a new roadmap with an appropriate feature slug.
3. Analyze Requirements - THINK HARD and parse the USER_PROMPT to understand the core problem and desired outcome
4. Design Solution - Develop technical approach including architecture decisions and implementation strategy
5. **Assess Complexity** - Count phases, determine if split is needed
6. Document Plan(s) - Structure comprehensive markdown document(s) with problem statement, implementation steps, and testing approach
7. Generate Filename(s) - Create descriptive kebab-case filename(s), with numeric prefixes (see Numbering Rules below)
8. Save & Report - Write plan(s) to `PLAN_OUTPUT_DIRECTORY/` and provide a summary of key components
9. **Generate/Update Roadmap** - If multi-spec split (2+ specs), run the Roadmap Generation workflow below

## Roadmap Generation (Multi-Spec Only)

**Skip this section entirely if only 1 spec was generated.**

When 2+ specs are generated (multi-spec split), generate or update a roadmap file.

**CRITICAL: Before writing any roadmap, read `~/.claude/skills/ROADMAP-TEMPLATE.md` for the canonical section menu and format rules.** The template is the single source of truth for roadmap structure. Do NOT improvise sections or invent formats -- follow the template.

### Step 1: Detect Existing Roadmaps

1. Glob `specs/roadmaps/ROADMAP-*.md` to find all existing roadmaps
2. Read each roadmap's `# Roadmap -- [Feature Name]` header
3. Compare the current feature name/slug against existing roadmaps
4. **If match found:** UPDATE that roadmap (add new specs, preserve completed checklist items, update `updated:` frontmatter field)
5. **If no match:** CREATE new `specs/roadmaps/ROADMAP-{feature-slug}.md`

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

### Step 3: Assign Execution Tags

For each wave/phase, determine the execution method using the flowchart from ROADMAP-TEMPLATE.md:

1. **Check dependencies within the wave:**
   - If specs must run in specific order (A's output feeds B) → `SEQUENTIAL`
   - If all specs in this wave are independent → candidate for `PARALLEL`

2. **Check spec weight (for parallel candidates):**
   - Moderate-context spec builds (file artifacts, 1-5 files each) → `PARALLEL (agent-teams xN)`
   - Heavy/interactive skills (crystal-ball full, unified-field-theory deep, performance-optimizer deep) → `PARALLEL (terminal xN)`
   - Mix of heavy + light in the same wave → `PARALLEL (mixed)`

3. **Single spec in wave** → `SEQUENTIAL` (no parallelism needed)

Every wave in the checklist and per-wave sections MUST have one of these tags. No wave should be left without an explicit execution method.

### Step 4: Set Checklist Status

1. Scan `specs/done/` for all `.md` files (recursively, including project subfolders)
2. Scan `specs/todo/` for all `.md` files
3. For each spec listed in the roadmap:
   - Found in `specs/done/` → `[x]` with file modification date as completion date
   - Found in `specs/todo/` → `[ ]`
   - Not found in either → `[?] (spec file not found)`
4. Mark phase status: if ALL specs in a phase are `[x]` → phase = DONE

### Step 5: Determine Detail Level

Count total specs across all phases:

| Project Size | Detail Level | What to Include |
|-------------|-------------|-----------------|
| Small (<5 specs) | Medium | Frontmatter, Title, Strategy, Status Counter, Checklist, Per-Wave (table + How to Run, no rationale), Key Files, Getting Started |
| Large (5+ specs) | Full | ALL sections from the template: adds Execution Rules, Quick Reference, Execution Timeline, Agent Teams Config, per-wave Rationale + Expected Artifacts |

### Step 6: Write Roadmap

**Follow the section menu and format from `~/.claude/skills/ROADMAP-TEMPLATE.md` exactly.** Key sections to always include:

1. **YAML Frontmatter** -- with project, type, created, updated, status fields
2. **Title** -- `# Roadmap -- {Project Name}`
3. **Strategy** -- blockquote explaining approach and parallelism
4. **Status Counter** -- `## Total Specs: N | Completed: X | Remaining: N-X`
5. **Checklist** -- nested checkboxes with execution tags per wave:
   ```markdown
   - [ ] Phase 2: Core Build (3 steps, PARALLEL x3 via agent-teams)
     - [ ] `02` Group A Skills
     - [ ] `03` Crystal Ball Report Output
     - [ ] `04` Group B Commands
   ```
6. **Per-Wave Sections** -- table + How to Run block with copy-pasteable commands
7. **Key Files** -- reference table
8. **Getting Started** -- the single most important first command:
   ```markdown
   ## Getting Started

   **Right now, run this:**

   ```
   /build specs/todo/{project}/{first-spec}.md
   ```

   This is the highest-leverage first move because {brief reason}.
   ```

For 5+ specs, also include: Execution Rules, Quick Reference Table, Execution Timeline (ASCII), Agent Teams Config (if applicable).

### Step 7: Generate Build Manifest (5+ Specs Only)

**Skip if fewer than 5 specs.**

After writing the roadmap, auto-generate a companion build manifest at `specs/roadmaps/{project-name}-build-manifest.md`. Follow the Build Manifest format from ROADMAP-TEMPLATE.md:

- Keep under 100 lines
- One table per wave with columns: #, Spec/Step, Action, Target, Status
- Include: Reference Files, Build Queue (wave tables), Key Decisions (top 3-5), Notes
- Action column uses: BUILD (new code), RUN (execute skill), ADD (modify existing)
- Status is TODO or DONE

### Roadmap Naming Convention

- Roadmap: `specs/roadmaps/ROADMAP-{feature-slug}.md`
- Build manifest: `specs/roadmaps/{feature-slug}-build-manifest.md`
- Slug: kebab-case descriptor (e.g., `skills-ecosystem`, `auth-system`, `surity-pilots`)
- Location: `specs/roadmaps/` — NOT inside `specs/todo/` or `specs/done/`
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

Roadmap: specs/roadmaps/ROADMAP-<feature>.md [CREATED|UPDATED]
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
