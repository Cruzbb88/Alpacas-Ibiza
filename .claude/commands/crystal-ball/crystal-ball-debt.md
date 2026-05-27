---
description: Track deferred design decisions, what they block, and their growing cost over time. Like tech debt but for decisions.
argument-hint: "list | detail | add <description>"
allowed-tools: Read, Write, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_get_session_context
---

# Crystal Ball — Decision Debt Tracker

Track deferred decisions and their accumulating cost.

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

ACTION: $ARGUMENTS

## Workflow

### Parse Action

- `list` (default if empty) → Show debt summary
- `detail` → Show full debt ledger with cost estimates
- `add <description>` → Manually log a new deferred decision

### For "list" or "detail":

**Step 1: Gather Deferred Decisions**

Deferred decisions come from 3 sources:

1. **Handoff NEXT STEPS that repeat** — same item appearing in 2+ handoffs without completion
   - `cortex_list_memories` with tags_filter ["handoff", "session-summary"], limit 10
   - Compare NEXT STEPS sections across handoffs
   - Items that appear in 3+ handoffs = decision debt

2. **Memories with outdated/needs_review status**
   - `cortex_list_memories` with status_filter "needs_review"
   - `cortex_list_memories` with status_filter "outdated"

3. **Explicit "deferred" or "later" items** in specs and plans
   - Grep for "DEFERRED", "TODO", "later", "Phase [N+1]" in spec files

**Step 2: Calculate Growing Cost**

For each debt item:
```
Current_Cost = Base_Fix_Cost x (1 + 0.1 x sessions_since_deferred)
```

- Base_Fix_Cost: Estimated hours when first deferred (estimate if unknown)
- sessions_since_deferred: Count of sessions since the item was first logged

**Step 3: Output**

For `list`:
```
## Decision Debt Summary

Total items: [N]
Total estimated cost: [X] hours
Oldest item: [N] sessions ago

| # | Decision | Age (sessions) | Cost Now | Blocks |
|---|----------|---------------|----------|--------|
| 1 | [item]   | [N]           | [X hrs]  | [what] |
```

For `detail`:
Include full context for each item — origin session, what it blocks, dependencies, and recommended resolution.

**Step 4: Save Report to Disk** (for both `list` and `detail`)

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

Format: `{project-tag}-decision-debt`
- Use project name in kebab-case as project-tag
- Max 50 chars, lowercase, no special chars

#### 4.3 Trend Tracking

Compare to the most recent previous report **of the same type**:

1. Glob `reports/crystal-ball/cb-*.md`
2. For each match, read YAML frontmatter and check `report_type: "crystal-ball-debt"`
3. Find the most recent one (highest report_number)
4. Extract its `total_debt_items` for `previous_debt_items` and `total_current_cost_hours` for `previous_cost_hours`
5. Determine trend: `first_run` if none exists, `improving` if fewer debt items, `declining` if more, `stable` if same count

#### 4.4 Write Report File

Filename: `cb-{NNN}-{YYYY-MM-DD}-{slug}.md`

```markdown
---
report_type: "crystal-ball-debt"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "{list|detail}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "{first_run|improving|declining|stable}"
total_debt_items: {count}
total_current_cost_hours: {sum}
total_cost_at_launch_hours: {sum}
critical_blockers: {count}
previous_debt_items: {count|null}
previous_cost_hours: {sum|null}
---

# Crystal Ball Decision Debt #{NNN}

**Date**: {YYYY-MM-DD}
**Project**: {project_name}
**Mode**: {list|detail}
**Total Debt Items**: {count}
**Total Current Cost**: {sum} hours

## Decision Debt Ledger

{Decision debt table: deferred decision, sessions ago, blocks, cost now, cost at launch, confidence}

## Compound Cost Analysis

{Compound cost analysis}

## Critical Path Blockers

{Critical path blockers}

## Resolution Priority

{Resolution priority recommendation}

## Trend

{Comparison to previous debt report if exists, or "First run - no comparison data"}
```

Write using the `Write` tool to `reports/crystal-ball/cb-{NNN}-{YYYY-MM-DD}-{slug}.md`.

Display to user: `Saved to: reports/crystal-ball/{filename}`

**Step 5: Store Results in Cortex**

```
cortex_remember:
  content: "Crystal Ball Debt — [project] — [N] items, [X] hrs total cost. Report: reports/crystal-ball/{filename}"
  tags: ["crystal-ball", "decision-debt", "{project-name}"]
  importance: 80
```

### For "add":

1. Parse description from arguments after "add"
2. Store as new decision debt memory:
   ```
   cortex_remember:
     content: "DECISION DEBT: [description]. Deferred on [date]. Blocks: [TBD]. Base cost: [estimate]."
     tags: ["crystal-ball", "decision-debt", "{project-name}"]
     importance: 70
   ```
3. Confirm storage with memory ID

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Parse $ARGUMENTS for action: list (default), detail, or add <description>
- Gather deferred decisions from 3 sources: repeated handoff NEXT STEPS, outdated Cortex memories, and spec TODOs
- Calculate compound cost using the formula: Current_Cost = Base_Fix_Cost x (1 + 0.1 x sessions_since_deferred)
- Always save a report to reports/crystal-ball/ following the shared cb-NNN numbering sequence
- Store summary in Cortex with tags ["crystal-ball", "decision-debt", "{project-name}"]

## Report

```
## Crystal Ball Decision Debt #{NNN}

**Date:** {YYYY-MM-DD}
**Project:** {name}
**Total Debt Items:** {N} | **Total Cost:** {X} hours

### Decision Debt Summary
| # | Decision | Age (sessions) | Cost Now | Blocks |

### Compound Cost Analysis
[Trend vs previous report]

### Resolution Priority
[Ordered recommendations]

**Saved to:** reports/crystal-ball/cb-{NNN}-{date}-{slug}.md
```
