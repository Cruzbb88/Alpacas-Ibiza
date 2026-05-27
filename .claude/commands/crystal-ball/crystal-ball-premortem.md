---
description: Pre-mortem analysis — assume the project failed at launch and identify the top 5 most likely reasons, weighted by historical failure patterns
argument-hint: "[scope: full | spec-name]"
allowed-tools: Read, Write, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_get_session_context, mcp__omni-cortex__cortex_get_activities
---

# Crystal Ball — Pre-Mortem

"Assume this project failed at launch. What are the 5 most likely reasons?"

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

SCOPE: $ARGUMENTS

## Workflow

### Step 1: Gather Failure Evidence

Launch parallel sub-agents:

**Agent 1 — Historical Failures:**
- `cortex_list_memories` with tags_filter ["error-handling", "debugging", "fix"]
- `cortex_list_memories` with tags_filter ["retrospective", "lessons-learned"]
- Read `.omni-cortex/tool_failures.jsonl` for recurring patterns

**Agent 2 — Current Design State:**
- Read spec files and project plan
- Identify all integration points, external dependencies, assumptions

**Agent 3 — Cross-Project Patterns:**
- `cortex_global_search` for similar failure patterns across other projects
- Look for architecture-level failures (auth, data model, deployment, scaling)

### Step 2: Weight Failure Modes

For each potential failure mode, calculate:

```
Failure Risk = Historical Frequency × Severity × (1 / Detection Ease)
```

- **Historical Frequency**: How often this category of failure appeared in memories/retrospectives
- **Severity**: Impact on project outcome (1-10)
- **Detection Ease**: How likely to catch before production (1=easy to catch, 10=silent until prod)

### Step 3: Generate Top 5

Rank all failure modes by Failure Risk score. Present the top 5:

```
## Pre-Mortem: Top 5 Failure Reasons

Assuming this project failed at launch, here's what most likely went wrong:

### 1. [Failure Mode] — Risk Score: [X]
**What happened**: [Concrete scenario of how this failure manifests]
**Historical basis**: [Similar failures from your history — N occurrences]
**Why it wasn't caught**: [Why current design/process wouldn't detect this]
**Mitigation**: [Specific action to prevent this]

### 2. [Failure Mode] — Risk Score: [X]
...

## Pre-Mortem Summary
- Total failure modes analyzed: [N]
- Top risk category: [category]
- Immediate action items: [prioritized list]
```

### Step 4: Save Report to Disk

> See: `~/.claude/skills/REPORT-CONVENTION.md`

#### 4.1 Determine Report Number

All Crystal Ball subcommands share a single `cb-` numbering sequence:

```bash
FOLDER="reports/crystal-ball"
mkdir -p "$FOLDER"
LAST=$(ls "$FOLDER"/cb-*.md 2>/dev/null | sed 's/.*cb-\([0-9]\{3\}\).*/\1/' | sort -n | tail -1)
NEXT=$(printf "%03d" $(( ${LAST:-0} + 1 )))
```

#### 4.2 Generate Description Slug

Format: `{project-tag}-premortem`
- Use project name in kebab-case as project-tag
- Max 50 chars, lowercase, no special chars

#### 4.3 Trend Tracking

Compare to the most recent previous report **of the same type**:

1. Glob `reports/crystal-ball/cb-*.md`
2. For each match, read YAML frontmatter and check `report_type: "crystal-ball-premortem"`
3. Find the most recent one (highest report_number)
4. Extract its `failure_modes_identified` for `previous_failure_modes`
5. Determine trend: `first_run` if none exists, `improving` if fewer failure modes, `declining` if more, `stable` if same count

#### 4.4 Write Report File

Filename: `cb-{NNN}-{YYYY-MM-DD}-{slug}.md`

```markdown
---
report_type: "crystal-ball-premortem"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "premortem"
scope: "{scope description}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "{first_run|improving|declining|stable}"
failure_modes_identified: {count}
highest_probability_failure: "{short description}"
highest_probability_pct: {0-100}
critical_gaps: {count}
decision_debt_items: {count}
previous_failure_modes: {count|null}
---

# Crystal Ball Pre-Mortem #{NNN}

**Date**: {YYYY-MM-DD}
**Project**: {project_name}
**Scope**: {scope}

## Pre-Mortem: Top 5 Failure Reasons

Assuming this project failed at launch, here's what most likely went wrong:

{Top 5 failure modes with probability, precedent, and confidence}

## Critical Gaps

{Critical gaps not yet addressed}

## Decision Debt

{Decision debt items blocking progress}

## Session Stress Indicators

{Session stress indicators}

## Prevention Recommendations

{Prevention recommendations}

## Trend

{Comparison to previous premortem if exists, or "First run - no comparison data"}
```

Write using the `Write` tool to `reports/crystal-ball/cb-{NNN}-{YYYY-MM-DD}-{slug}.md`.

Display to user: `Saved to: reports/crystal-ball/{filename}`

### Step 5: Store Results in Cortex

```
cortex_remember:
  content: "Crystal Ball Pre-Mortem — [project] — Top risks: [1], [2], [3]. Report: reports/crystal-ball/{filename}"
  tags: ["crystal-ball", "premortem", "{project-name}"]
  importance: 85
```

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Parse $ARGUMENTS for scope: full (default) or a specific spec name
- Launch 3 parallel agents: historical failures (Cortex), current design state (specs/plan), cross-project patterns
- Calculate Failure Risk = Historical Frequency x Severity x (1 / Detection Ease) for each failure mode
- Rank all failure modes and present top 5 with concrete scenarios and mitigations
- Always save report to reports/crystal-ball/ using the shared cb-NNN numbering sequence
- Store results in Cortex with tags ["crystal-ball", "premortem", "{project-name}"]

## Report

```
## Crystal Ball Pre-Mortem #{NNN}

**Project:** {name} | **Scope:** {full|spec-name}

### Top 5 Failure Reasons

1. {Failure Mode} — Risk Score: {X}
   **What happened:** [concrete scenario]
   **Historical basis:** [N similar occurrences]
   **Mitigation:** [specific action]

[...repeat for 2-5...]

### Prevention Recommendations
[Prioritized action list]

**Saved to:** reports/crystal-ball/cb-{NNN}-{date}-{slug}.md
```
