---
description: Generate N-by-N matrix showing how each spec interacts with every other spec. Highlights conflicts, shared dependencies, and compatibility gaps.
argument-hint: "[specs-dir (default: specs/)]"
allowed-tools: Read, Write, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_remember
---

# Crystal Ball — Spec-to-Spec Coherence Matrix

Generate a compatibility matrix across all specs/features.

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

SPECS_DIR: $ARGUMENTS

## Workflow

### Step 1: Discover Specs

- Default directory: `specs/todo/` and `specs/done/` (or SPECS_DIR if provided)
- Glob for `*.md` files (use `**/*.md` for `specs/done/` to include project subfolders)
- Read each spec and extract:
  - **Name/title**
  - **Dependencies** (other specs it depends on)
  - **Technologies** used (frontend, backend, database, APIs, etc.)
  - **Tables/endpoints** it creates or modifies
  - **External systems** it interacts with

### Step 2: Build Interaction Map

For each pair of specs (A, B), determine their relationship:

- **Compatible** (no interaction) — Gray: specs are independent
- **Shared Dependency** — Yellow: both specs use the same table, endpoint, or API
- **Complementary** — Green: spec A produces something spec B consumes (aligned)
- **Conflicting** — Red: specs make conflicting assumptions about shared resources

### Step 3: Generate Matrix

```
## Spec Coherence Matrix

        | Spec 1 | Spec 2 | Spec 3 | Spec 4 | ...
--------|--------|--------|--------|--------|----
Spec 1  |   —    |   ✅   |   ⚠️   |   ⬜   |
Spec 2  |   ✅   |   —    |   ❌   |   ✅   |
Spec 3  |   ⚠️   |   ❌   |   —    |   ⬜   |
Spec 4  |   ⬜   |   ✅   |   ⬜   |   —    |

Legend:
  ✅ Green  — Compatible / Complementary
  ⚠️ Yellow — Shared dependency (needs coordination)
  ❌ Red    — Conflicting assumptions
  ⬜ Gray   — No interaction
```

### Step 4: Detail Conflicts

For each Yellow or Red cell, explain:
```
### ⚠️ Spec 1 ↔ Spec 3: Shared Dependency
Both specs modify the `submissions` table.
- Spec 1 expects column `grade` as integer
- Spec 3 expects column `grade` as float
- Resolution needed: Agree on data type before building either

### ❌ Spec 2 ↔ Spec 3: Conflict
- Spec 2 assumes webhook-based grading (instant)
- Spec 3 assumes polling-based grading (30-min delay)
- These cannot coexist without a reconciliation layer
```

### Step 5: Build Order Recommendation

Based on the matrix, suggest an optimal build order:
1. Specs with no dependencies first
2. Specs that others depend on next
3. Conflicting specs last (resolve conflicts first)

### Step 6: Save Report to Disk

> See: `~/.claude/skills/REPORT-CONVENTION.md`

#### 6.1 Determine Report Number

All Crystal Ball subcommands share a single `cb-` numbering sequence:

```bash
FOLDER="reports/crystal-ball"
mkdir -p "$FOLDER"
LAST=$(ls "$FOLDER"/cb-*.md 2>/dev/null | sed 's/.*cb-\([0-9]\{3\}\).*/\1/' | sort -n | tail -1)
NEXT=$(printf "%03d" $(( ${LAST:-0} + 1 )))
```

#### 6.2 Generate Description Slug

Format: `{project-tag}-spec-matrix` or `{specs-count}-spec-matrix`
- Use project name in kebab-case as project-tag when available
- Fall back to specs count (e.g., `12-spec-matrix`) when no project name
- Max 50 chars, lowercase, no special chars

#### 6.3 Trend Tracking

Compare to the most recent previous report **of the same type**:

1. Glob `reports/crystal-ball/cb-*.md`
2. For each match, read YAML frontmatter and check `report_type: "crystal-ball-matrix"`
3. Find the most recent one (highest report_number)
4. Extract its `compatibility_score` for `previous_composite` and compute `score_delta`
5. Determine trend: `first_run` if none exists, `improving` if delta > 0, `declining` if delta < 0, `stable` if delta = 0

#### 6.4 Write Report File

Filename: `cb-{NNN}-{YYYY-MM-DD}-{slug}.md`

```markdown
---
report_type: "crystal-ball-matrix"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "matrix"
composite_score: {compatibility_score 0-100}
previous_composite: {previous_compatibility 0-100|null}
score_delta: "{+/-N|---}"
trend: "{first_run|improving|declining|stable}"
specs_count: {N}
passing_integrations: {count}
failing_integrations: {count}
---

# Crystal Ball Spec Matrix #{NNN}

**Date**: {YYYY-MM-DD}
**Project**: {project_name}
**Specs Analyzed**: {specs_count}
**Compatibility Score**: {score}/100 ({trend_label})

## Spec Coherence Matrix

{N x N compatibility matrix}

## High-Risk Integrations

{Detail for each Yellow or Red cell}

## Dependency Chains

{Dependency chains}

## Build Order Recommendation

{Optimal build order}

## Trend

{Comparison to previous matrix if exists, or "First run - no comparison data"}
```

Write using the `Write` tool to `reports/crystal-ball/cb-{NNN}-{YYYY-MM-DD}-{slug}.md`.

Display to user: `Saved to: reports/crystal-ball/{filename}`

### Step 7: Store Results in Cortex

```
cortex_remember:
  content: "Crystal Ball Matrix — [N] specs analyzed. [X] conflicts, [Y] shared deps, [Z] compatible pairs. Report: reports/crystal-ball/{filename}"
  tags: ["crystal-ball", "matrix", "{project-name}"]
  importance: 80
```

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Discover all specs in specs/todo/ and specs/done/**/ (or SPECS_DIR if provided)
- For each pair, classify relationship: Compatible (gray), Shared Dependency (yellow), Complementary (green), Conflicting (red)
- Explain every Yellow and Red cell with specific conflicts and resolution requirements
- Always save report to reports/crystal-ball/ using the shared cb-NNN numbering sequence
- Store results in Cortex with tags ["crystal-ball", "matrix", "{project-name}"]

## Report

```
## Crystal Ball Spec Matrix #{NNN}

**Specs Analyzed:** {N}
**Compatibility Score:** {score}/100 ({trend})

### Spec Coherence Matrix
[N x N table with emoji indicators]

### High-Risk Integrations
[Detail for each Yellow/Red cell with resolution needed]

### Build Order Recommendation
1. [No-dependency specs first]
2. [Specs others depend on]
3. [Conflicting specs last — resolve first]

**Saved to:** reports/crystal-ball/cb-{NNN}-{date}-{slug}.md
```
