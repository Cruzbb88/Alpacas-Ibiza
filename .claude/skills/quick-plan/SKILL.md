---
name: "quick-plan"
description: >-
  Create engineering implementation plans from requirements with multi-spec
  splitting, roadmap generation, and dependency graphs. Saves specs to
  specs/todo/. 3-layer architecture: L1 Quick (outline only, no file write),
  L2 Standard (full spec generation with roadmap), L3 Deep (spec + roadmap +
  dependency graph + sub-agent analysis). Enforces page template system for
  UI specs. Includes 4-factor utility guardrails and The Big 3 rules.
  Dual backbone: Cortex CLI for storing, MCP for recalling prior specs.
  Use when: (1) Planning a new feature or fix, (2) Breaking down complex
  requirements into buildable specs, (3) Creating roadmaps for multi-spec
  projects, (4) Quick-sketching an approach before committing to a build.
argument-hint: "<description-or-topic> [quick | deep]"
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_remember
---

# Quick Plan

Create a detailed implementation plan based on the user's requirements provided through the `USER_PROMPT` variable. Analyze the request, think through the implementation approach, and save a comprehensive specification document to `PLAN_OUTPUT_DIRECTORY/<name-of-plan>.md` that can be used as a blueprint for actual development work.

## Guardrails -- 4-Factor Utility Check (APPLY TO EVERY ACTION)

Before every significant action, evaluate:
1. **Estimated Gain** -- marginal value of this action. Skip if near zero.
2. **Step Cost** -- token/time cost. Prefer cheaper alternatives.
3. **Uncertainty** -- confidence level. If < 50%, investigate first.
4. **Redundancy** -- already done something similar? STOP and move on.

**Hard stops:** 3+ repeated tool call patterns = loop. Exploring unrelated code = refocus. Error persists after 3 fix attempts = message user.

Source: adws/references/research-integration.md Paper #2 (Utility-Guided Agent Orchestration)

---

## Mode Matrix

| Mode | Arg | Layers | Saves Spec | Sub-agents |
|------|-----|--------|-----------|------------|
| Quick | `quick` | L1 | No | No |
| Standard | *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1 + L2 + L3 | Yes | L3 |

## Argument Routing

| Input | Action |
|-------|--------|
| `/quick-plan <description>` | Standard mode: full spec generation |
| `/quick-plan <description> quick` | Quick mode: outline only, printed inline, no file written |
| `/quick-plan <description> deep` | Deep mode: spec + roadmap + dependency graph + sub-agent analysis |
| `/quick-plan` (no args) | Prompt user for description |

---

## The Big 3 Rules (CRITICAL -- baked from session learnings)

1. **API client:** `api.get()` returns JSON directly. Import: `import { api } from "@/lib/api-client"`. NEVER use `useApiClient` (doesn't exist). NEVER use `resp.data` (no wrapper). Use `api.postForm()` for file uploads.
2. **Backend port:** Always **8002** (matches .env.local). Override `DATABASE_URL` to local Docker -- build/.env has PRODUCTION URL.
3. **No hardcoded URLs:** Use relative paths (`/api/v1/...`) with Next.js rewrites. Hardcoded localhost URLs cause CORS failures.

---

## Page Template System (MANDATORY for UI specs)

When a spec describes new pages, include acceptance criteria requiring ALL new pages to use the page template system. Read `references/template-requirements.md` for the full acceptance criteria template.

**Quick rules:**
- ALL new pages MUST use PageShell + PageHeader + appropriate template type
- NEVER create raw `<div className="p-6">` layouts
- Auto-generate `config/modules/{name}.yaml` for each new page
- Check `config/page-template-audit.yaml` for existing page inventory
- Supported page_type: `data-table`, `dashboard`, `canvas` (live), `detail-view`, `form` (TODO)

---

## Dual Backbone Integration (Cortex CLI + MCP)

| Phase | Tool | Operation |
|-------|------|-----------|
| Pre-planning recall | MCP `cortex_recall` | Search for similar prior specs and decisions |
| Pre-planning search | MCP `cortex_global_search` | Cross-project pattern discovery |
| Post-plan storage | CLI `cortex remember` | Store spec metadata (fire-and-forget, no result needed) |
| Post-plan linking | CLI `cortex link` | Link related specs if multi-spec split |

**Rule:** MCP for recall (LLM needs results to reason). CLI for storage (fire-and-forget).

---

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

**Owner Prefix Rule:** When creating a NEW project subfolder, prefix the folder name with the owner's short name:
- Tony (AllCytes) → `tony-{project-name}/`
- Ralph (behnker) → `ralph-{project-name}/`
- Example: `specs/todo/tony-payment-gateway/`, `specs/todo/ralph-supplier-scoring/`

This gives instant visual ownership when browsing `specs/todo/`. Existing unprefixed folders are grandfathered in — see `specs/todo/OWNERS.md` for their ownership.

**Done Mirror Rule:** When creating a project subfolder in `specs/todo/{owner-project-name}/`, also create the matching subfolder in `specs/done/`:
```bash
mkdir -p specs/todo/{owner-project-name} specs/done/{owner-project-name}
```
This pre-stages the destination so `/build` always has a target directory.

**Directory Dedup Check:** Before creating a new project subdirectory, check if it already exists (with OR without owner prefix):
1. Glob `specs/todo/*/` to list existing project folders
2. Compare your intended folder name against existing ones (case-insensitive, slug-normalized, ignoring `tony-`/`ralph-` prefix)
3. If a match exists, reuse the existing directory — do NOT create a duplicate with a slightly different name
4. Common duplicates to watch for: singular vs plural (`visibility-gate` vs `visibility-gates`), abbreviations, hyphen vs underscore, prefixed vs unprefixed (`tony-chat-fixes` vs `chat-fixes`)

## Spec Placement Routing

**Before saving a spec, determine whether it is a one-off or part of a multi-spec project:**

| Spec Type | Placement | Subdirectory |
|-----------|-----------|-------------|
| Standalone one-off (single spec, not part of a project/roadmap) |  | None -- save directly in  root |
| Part of a multi-spec project (2+ related specs, shared roadmap) |  | Create or reuse project subdirectory |

**How to decide:** If the user's request will produce only 1 spec AND it is not explicitly part of an existing project/roadmap, treat it as a one-off. If it produces 2+ specs OR the user references an existing project subfolder, use the project subdirectory.

---

## Layer Execution

### L1: Quick Outline (always runs)

1. Parse the USER_PROMPT to identify core problem and desired outcome
2. Determine phase count and complexity assessment
3. Generate a structured outline:
   - Problem statement (1-2 sentences)
   - Proposed approach (bullet points)
   - Phase breakdown (names + 1-line descriptions)
   - Key risks or unknowns
4. **If mode = quick:** Print the outline inline and STOP. No file is written.
5. **If mode = standard or deep:** Continue to L2.

### L2: Full Spec Generation (standard + deep)

This is the core spec generation layer -- the original `/quick-plan` behavior.

1. **Pre-Planning Research**
   - Search for similar plans: `cortex_recall: "plan {feature_keywords}"`
   - Search cross-project patterns: `cortex_global_search: "{architecture_keywords}"`
   - Use recalled context to inform design decisions and avoid reinventing solutions

2. **Detect ADW Pipeline** -- Check if `adws/configs/` exists in the project root. If yes, set HAS_ADW=true and include the ADW Pipeline section in the generated spec output. If no, skip ADW references entirely.

3. **Detect Existing Roadmaps** -- Glob `specs/roadmaps/ROADMAP-*.md` to list all existing roadmaps. Read their headers to understand active workstreams. If the new specs belong to an existing workstream, plan to UPDATE that roadmap. If new workstream, plan to CREATE a new roadmap with an appropriate feature slug.

4. **Design Solution** -- Develop technical approach including architecture decisions and implementation strategy

5. **Assess Complexity** -- Count phases, determine if split is needed (see Multi-Spec Split Rule below)

6. **Page Template Gate** -- If spec creates new pages, include the acceptance criteria from `references/template-requirements.md`

7. **Document Plan(s)** -- Structure comprehensive markdown document(s) following the Spec Content Template

8. **Generate Filename(s)** -- Create descriptive kebab-case filename(s) with numeric prefixes per Numbering Rules

9. **Save & Report** -- Write plan(s) to `PLAN_OUTPUT_DIRECTORY/` and provide a summary

10. **Generate/Update Roadmap** -- If multi-spec split (2+ specs), run the Roadmap Generation workflow

11. **Post-Plan Memory Storage** -- Store via CLI:
    ```bash
    cortex remember "Plan: {summary}" --tags plan,todo,{project},{feature} --type decision --importance 70
    ```

### L3: Deep Analysis (deep mode only)

Spawn sub-agents for additional analysis beyond standard spec generation:

**Task 1 (Dependency Graph):**
- Build a full directed acyclic graph of all specs
- Identify critical path (longest chain)
- Flag circular or hidden dependencies
- Output: Mermaid diagram + critical path annotation

**Task 2 (Risk & Precedent Analysis):**
- `cortex_recall` for similar past specs and their outcomes
- Identify specs that required rework or caused regressions
- Score risk per spec (0-100) based on historical patterns
- Output: Risk matrix with mitigation suggestions

**Task 3 (Effort Estimation):**
- Estimate build time per spec based on phase complexity
- Compare against historical build durations from Cortex
- Flag specs likely to exceed budget
- Output: Time estimate table with confidence intervals

After all sub-agents complete, merge findings into the roadmap and update the report.

---

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
# Existing: 01-*, 02-*, 03-* -> next spec gets 04-
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
| 100-400 | Lean and focused - ideal for simple features |
| 400-600 | Good balance - ideal for moderate features |
| 600-700 | Acceptable for complex features |
| 700-800 | At the limit - consider trimming |
| Over 800 | MUST split or reduce implementation detail |

## Spec Content Template

Every spec MUST include YAML frontmatter with an `owner:` field:

```yaml
---
owner: tony  # determined from git config user.name
# ... other frontmatter fields
---
```

**Owner Resolution:** Run `git config user.name` and map:
- `AllCytes` -> `tony`
- `behnker` -> `ralph`
- Any other value -> lowercase the git username as-is

Then follow this structure:

| Section | Lines | Purpose |
|---------|-------|---------|
| Overview & Goals | ~30-50 | Problem statement, success criteria |
| Dependencies | ~20-30 | Prerequisites, packages, prior specs |
| Architecture | ~50-100 | Design decisions, data flow (diagrams encouraged) |
| Interface Definitions | ~50-100 | Core TypeScript types, API contracts |
| Task Breakdown | ~150-250 | WHAT to build, key implementation notes |
| Test Criteria | ~30-50 | Acceptance tests, key edge cases |
| Acceptance Criteria | ~20-40 | Explicit definition of done: testable conditions |
| Verification | ~10-20 | Procedural validation steps to run after build |
| Gotchas/Notes | ~20-30 | Common pitfalls, things to watch for |

**Total Target: ~370-670 lines** (leaves room for the implementing agent to work)

### What TO Include
- Interface/type definitions (the contracts)
- Architecture decisions with rationale
- Task descriptions (WHAT to build)
- Key implementation notes and gotchas
- Test criteria and acceptance conditions
- Acceptance criteria (explicit definition of done -- testable conditions an evaluator grades against)
- Verification steps (procedural validation)
- Pseudocode for complex algorithms

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

**Why:** Declarative Test Criteria describe WHAT should pass. Verification describes HOW to confirm it passes.

**Rules:**
- `/test quick` (L1+L2) is the **minimum gate** for every spec -- never omit it
- Add spec-specific smoke tests for anything `/test quick` can't catch
- For specs that modify existing functionality, include a regression check
- For specs that are purely config/docs with no runnable code, replace `/test quick` with the appropriate validation

### Batch Operation Hint (Script-First)

When the spec involves batch operations -- **5+ API calls** against any service OR **complex bulk work** with structured logic, error tracking, or multi-item processing -- include this note in the Architecture or Task section:

> "Build via Python script. Check `~/.claude/scripts/templates/` for a matching template. Run `script_list` via Script Runner MCP to discover available templates."

**Skip this hint for simple file creation, single API calls, or Bash-pipeable text/file ops.**

### ADW Pipeline Recommendation (Only When HAS_ADW=true)

When the project has an `adws/configs/` directory, append an **ADW Pipeline** section:

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
| Security-sensitive changes | `security.yaml` | ~45-70 min |
| Critical/complex spec with external deps | `full.yaml` | ~65-95 min |
| Novel/experimental with lessons to capture | `full_learning.yaml` | ~100-130 min |

If `adws/configs/` does not exist, omit this section entirely.

### What NOT to Include (Overengineering Signs)
- Full function implementations (describe what the function does instead)
- Complete error handling for every edge case (list key cases only)
- Multiple provider variants written out in full (describe the abstraction pattern)
- Every possible TypeScript utility type (core interfaces only)
- Full test file implementations (describe test cases)
- Exhaustive JSDoc comments (save for implementation)

### The 50% Rule
If more than 50% of your spec is actual runnable code blocks, you've crossed from "specification" to "pre-implementation." Scale back to describe WHAT, not HOW.

## Large Project Strategy (10+ Specs)

For complex systems requiring many specs:

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
   - Specs with NO dependencies -> Phase 1
   - Specs depending only on Phase 1 specs -> Phase 2
   - Continue until all specs are phased
4. Within each phase, classify specs:
   - **No cross-dependencies within phase** -> PARALLEL (use `/agent-teams`)
   - **Cross-dependencies within phase** -> SEQUENTIAL (use `/build` one at a time)

### Step 3: Assign Execution Tags

For each wave/phase, determine the execution method using the flowchart from ROADMAP-TEMPLATE.md:

1. **Check dependencies within the wave:**
   - If specs must run in specific order -> `SEQUENTIAL`
   - If all specs in this wave are independent -> candidate for `PARALLEL`

2. **Check spec weight (for parallel candidates):**
   - Moderate-context spec builds -> `PARALLEL (agent-teams xN)`
   - Heavy/interactive skills -> `PARALLEL (terminal xN)`
   - Mix of heavy + light -> `PARALLEL (mixed)`

3. **Single spec in wave** -> `SEQUENTIAL` (no parallelism needed)

Every wave in the checklist and per-wave sections MUST have one of these tags.

### Step 3b: Add Execution Strategy Metadata

For each phase/wave, include an `execution_strategy` field and a `reason`:

| Strategy | When to use |
|----------|------------|
| `sequential` | Default. Specs depend on each other. |
| `background-agents` | 2-3 truly independent specs with ZERO shared files. |
| `agent-teams` | 3+ specs that share files, need merge coordination. |
| `terminal-worktrees` | Large independent projects in separate git worktrees. |

### Step 4: Set Checklist Status

1. Scan `specs/done/` for all `.md` files (recursively)
2. Scan `specs/todo/` for all `.md` files
3. For each spec: done -> `[x]`, todo -> `[ ]`, missing -> `[?]`
4. Mark phase status: if ALL specs in a phase are `[x]` -> phase = DONE

### Step 5: Determine Detail Level

| Project Size | Detail Level | What to Include |
|-------------|-------------|-----------------|
| Small (< 5 specs) | Medium | Frontmatter, Title, Strategy, Status, Checklist, Per-Wave, Key Files, Getting Started |
| Large (5+ specs) | Full | ALL sections from template including Execution Rules, Quick Reference, Timeline, Agent Teams Config |

### Step 6: Write Roadmap

Follow the section menu and format from `~/.claude/skills/ROADMAP-TEMPLATE.md` exactly.

### Step 7: Generate Build Manifest (5+ Specs Only)

**Skip if fewer than 5 specs.**

Auto-generate a companion build manifest at `specs/roadmaps/{project-name}-build-manifest.md`:
- Keep under 100 lines
- One table per wave
- Action column uses: BUILD, RUN, ADD
- Status is TODO or DONE

### Roadmap Naming Convention

- Roadmap: `specs/roadmaps/ROADMAP-{feature-slug}.md`
- Build manifest: `specs/roadmaps/{feature-slug}-build-manifest.md`
- Location: `specs/roadmaps/` -- NOT inside `specs/todo/` or `specs/done/`

## Workflow

1. **Setup Folders** - Run `mkdir -p specs/todo specs/done specs/roadmaps`
1b. **Detect ADW Pipeline** - Check if `adws/configs/` exists. Set HAS_ADW flag.
2. **Detect Existing Roadmaps** - Glob `specs/roadmaps/ROADMAP-*.md`
3. **L1: Analyze Requirements** - Parse USER_PROMPT, generate outline
4. **Mode Check** - If `quick`: print outline and STOP
5. **L2: Design Solution** - Full spec generation (pre-planning research, design, complexity assessment, page template gate, document, save)
6. **Roadmap** - If multi-spec, generate/update roadmap
7. **Memory** - Store spec metadata via Cortex CLI
8. **Mode Check** - If `deep`: continue to L3
9. **L3: Deep Analysis** - Spawn sub-agents for dependency graph, risk analysis, effort estimation
10. **Report** - Print summary

## Report

After creating and saving the implementation plan(s), provide a concise report:

### Single Spec Report
```
Implementation Plan Created

File: specs/todo/<filename>.md
Topic: <brief description>
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
  Build Order: Phase 1 (sequential) -> Phase 2 (parallel x3) -> ...

Key Components (Overall):
- <main component 1>
- <main component 2>
- <main component 3>

Next: Run `/build specs/todo/01-<name>.md` first (see roadmap for full build order)
```

## Post-Plan Memory Storage

Store plan reference via Cortex CLI (fire-and-forget):
```bash
cortex remember "Plan: {summary} | Path: {file_paths} | Phases: {count} | Arch: {key_decisions}" --tags plan,todo,{project_name},{feature_area} --type decision --importance 70
```

Include in stored content:
- File path(s) to plan(s)
- Key objectives
- Major architectural decisions
- Technologies/patterns chosen
- Whether spec was split and why (if applicable)
- Roadmap file path (if generated/updated)
- Phase count and parallelism summary (if roadmap generated)
- Dependency chain summary (if roadmap generated)
