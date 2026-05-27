---
description: Full design coherence audit — runs all 6 analysis layers to evaluate outcome alignment, tech dependencies, decision patterns, gaps, constraints, and predictions
argument-hint: "[spec-name | decision | full]"
allowed-tools: Read, Write, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_get_session_context, mcp__omni-cortex__cortex_list_tags, mcp__omni-cortex__cortex_get_activities
---

# Crystal Ball — Full Coherence Audit

Run a complete design coherence analysis across all 6 layers. Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine instructions.

## Variables

SCOPE: $ARGUMENTS

## Workflow

### Step 1: Determine Scope

- Empty or "full" → Audit entire project (all specs, plan, architecture)
- Spec name (e.g., "spec-17") → Audit that specific spec and its dependencies
- Quoted decision → Audit a specific decision and its downstream effects

### Step 2: Parallel Context Gathering

Launch 4 parallel Task agents (subagent_type: Explore or Bash):

**Agent 1 — Specs & Plan:**
- Glob for `specs/todo/*.md`, `specs/done/**/*.md` (or project-specific paths)
- Read PLAN-OF-ATTACK.md, TODO.md, or equivalent project plan
- Extract: features, dependencies, stated outcomes

**Agent 2 — Omni-Cortex Memories:**
- `cortex_list_memories` — recent 30, sorted by created_at desc
- `cortex_list_tags` — all tags with counts
- `cortex_get_session_context` — last 5 sessions

**Agent 3 — Decisions & Errors:**
- `cortex_list_memories` with tags_filter ["architecture", "planning"]
- `cortex_list_memories` with tags_filter ["error-handling", "debugging"]
- `cortex_list_memories` with tags_filter ["crystal-ball"] (previous audits)

**Agent 4 — SQLite Direct Queries:**
- Read `references/sql-queries.md` from skill directory for queries
- Run session stress detection query
- Run decision revision rate query
- Run contradicting decisions query
- Run stale decisions query

**Probability Storm Cross-Reference (within Agent 3 or Agent 4):**
- Glob `reports/probability-storm/ps-*.md`
- If any reports exist:
  - Read YAML frontmatter (composite_score, decision, date, confidence)
  - For reports with decision keywords matching the current audit scope:
    - Include their composite scores in the Decision Patterns analysis
    - Note consistency or divergence between crystal-ball and probability-storm assessments
    - If scores diverge by > 20 points: flag as "Prediction divergence detected" in the report
  - If no reports match the current scope: note "No probability-storm reports found for this scope"
- If no reports directory exists: skip silently

### Step 3: Run All 6 Layers

With gathered context, execute each layer per SKILL.md:

1. **Outcome Alignment** — Map features to outcomes, find gaps and drift
2. **Cross-Tech Dependencies** — Validate integration points, check constraints
3. **Decision Patterns** — Calculate revision rates, detect session stress, find precedents, cross-reference probability-storm reports
4. **Gap Analysis** — Score each gap by impact, discovery stage, fix cost
5. **Consequence Scanner** — Trace ripple effects of recent decisions
6. **Constraint Database** — Cross-check against `references/tech-constraints.md`

### Step 4: Calculate Scores

Use `references/scoring-rubric.md` for methodology:
- Outcome Alignment (25%)
- Cross-Tech Health (25%)
- Decision Stability (20%)
- Gap Coverage (15%)
- Constraint Compliance (15%)
- Overall Coherence = weighted average

### Step 5: Generate Report

Use the output template from `references/ARCHITECTURE.md`. Include:
- All section scores with emoji indicators (checkmark, warning, x)
- Gap table ranked by cost-of-delay
- Predictions with confidence levels (balanced: flag >40%)
- Actionable recommendations (top 3)

### Step 6: Save Report to Disk

> See: `~/.claude/skills/REPORT-CONVENTION.md`

**IMPORTANT:** This step runs AFTER all 4 parallel agents complete and output is assembled.

#### 6.1 Determine Report Number

All Crystal Ball subcommands share a single `cb-` numbering sequence:

```bash
FOLDER="reports/crystal-ball"
mkdir -p "$FOLDER"
LAST=$(ls "$FOLDER"/cb-*.md 2>/dev/null | sed 's/.*cb-\([0-9]\{3\}\).*/\1/' | sort -n | tail -1)
NEXT=$(printf "%03d" $(( ${LAST:-0} + 1 )))
```

#### 6.2 Generate Description Slug

Format: `{project-tag}-coherence-audit`
- Use project name in kebab-case as project-tag
- Max 50 chars, lowercase, no special chars

#### 6.3 Trend Tracking

Compare to the most recent previous report **of the same type**:

1. Glob `reports/crystal-ball/cb-*.md`
2. For each match, read YAML frontmatter and check `report_type: "crystal-ball-full"`
3. Find the most recent one (highest report_number)
4. Extract its `composite_score` (mapped from `overall_score`) for `previous_composite` and compute `score_delta`
5. Determine trend: `first_run` if none exists, `improving` if delta > 0, `declining` if delta < 0, `stable` if delta = 0

#### 6.4 Write Report File

Filename: `cb-{NNN}-{YYYY-MM-DD}-{slug}.md`

```markdown
---
report_type: "crystal-ball-full"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "full"
scope: "{full|spec-name|decision}"
composite_score: {overall_score 0-100}
previous_composite: {previous_overall 0-100|null}
score_delta: "{+/-N|---}"
trend: "{first_run|improving|declining|stable}"
layer_scores:
  l1_outcome_alignment: {0-100}
  l2_cross_tech_health: {0-100}
  l3_decision_stability: {0-100}
  l4_gap_coverage: {0-100}
  l5_consequences: {0-100}
  l6_constraint_compliance: {0-100}
---

# Crystal Ball Full Audit #{NNN}

**Date**: {YYYY-MM-DD}
**Project**: {project_name}
**Scope**: {scope}
**Overall Coherence Score**: {score}/100 ({trend_label})

{Executive summary}

{All 6 layer analyses with scores}

{Gap table ranked by cost-of-delay}

{Predictions with confidence levels}

## Recommendations

{Actionable recommendations ranked by priority}

## Trend

{Comparison to previous audit if exists, or "First run - no comparison data"}
```

Write using the `Write` tool to `reports/crystal-ball/cb-{NNN}-{YYYY-MM-DD}-{slug}.md`.

Display to user: `Saved to: reports/crystal-ball/{filename}`

### Step 7: Store Results in Cortex

```
cortex_remember:
  content: "Crystal Ball Full Audit — [project] — Score: [X]/100. Report: reports/crystal-ball/{filename}. [brief findings summary]"
  tags: ["crystal-ball", "full-audit", "{project-name}"]
  importance: 85
```

Update `references/tech-constraints.md` if new constraints were discovered.

## Instructions

- Read `~/.claude/skills/crystal-ball/SKILL.md` before executing — it contains the core scoring engine
- Scope defaults to "full" (entire project) if `$ARGUMENTS` is empty; otherwise scope to the named spec or quoted decision
- Always run all 4 parallel Task agents before assembling the report — no partial audits
- Cross-reference `reports/probability-storm/` if it exists; flag divergences > 20 points
- Use the scoring rubric in `references/scoring-rubric.md` exactly — do not estimate scores
- All 6 crystal-ball subcommands share a single `cb-` numbering sequence
- Store results in Cortex after every run (step 7 is mandatory, not optional)

## Report

- Open with an executive summary: overall coherence score, trend indicator, and top 3 risks
- Present all 6 layer scores in a table with emoji indicators (pass/warn/fail)
- Include the gap table ranked by cost-of-delay (highest cost first)
- List predictions with confidence percentages; bold any prediction above 40% likelihood
- Close with exactly 3 actionable recommendations, ranked by priority
- If a previous audit exists, show the score delta and trend label (improving/declining/stable)
- Save to `reports/crystal-ball/cb-{NNN}-{YYYY-MM-DD}-{slug}.md` and confirm the path to the user
