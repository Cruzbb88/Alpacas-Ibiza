---
name: crystal-ball
description: >
  Design coherence auditor and prediction engine grounded in real execution data.
  Evaluates designs against project outcomes, cross-checks technology dependencies,
  predicts future issues from historical decision patterns, and surfaces gaps before
  they become problems. Uses Omni-Cortex memories, activities, relationships, tool
  failures, and session data for evidence-based analysis.
  Use when: (1) Reviewing a design or spec before building, (2) After brainstorming
  to check downstream effects, (3) Before committing to architectural decisions,
  (4) Checking if old decisions are still valid, (5) Auditing spec-to-spec compatibility,
  (6) Running a pre-mortem on a project, (7) Tracking decision debt.
  Invoked via /crystal-ball commands. See references/ARCHITECTURE.md for the full
  command map, data flow diagrams, and scoring methodology.
argument-hint: "<subcommand: full | predict | matrix | delta | decay | debt | constraints | premortem>"
model: opus
---

# Crystal Ball — Design Coherence Auditor

> **CLI-first migration (Spec 17):** Fire-and-forget operations (remember for storing results,
> link for connecting predictions to evidence) use `cortex` CLI via Bash. Batch pre-fetch queries
> (recall for predictions, project-status, historical decisions) use CLI with `--json` in a single
> bash block. Interactive MCP calls (list_memories, get_session_context, list_tags, get_activities)
> remain since the LLM needs structured results for analysis. Estimated CLI ratio: ~75%.

Evaluate design completeness against project outcomes. Predict issues before they happen using your actual execution history.

## Quick Start

| Command | Purpose | Saves Report? |
|---------|---------|---------------|
| `/crystal-ball` | Full coherence audit (all 6 layers) | `cb-NNN-DATE-slug.md` |
| `/crystal-ball-premortem` | "Assume failure — top 5 reasons?" | `cb-NNN-DATE-slug.md` |
| `/crystal-ball-debt` | Decision debt ledger | `cb-NNN-DATE-slug.md` |
| `/crystal-ball-matrix` | Spec-to-spec compatibility grid | `cb-NNN-DATE-slug.md` |
| `/crystal-ball-delta` | What changed + unaddressed effects | Display only |
| `/crystal-ball-constraints` | Technology limit violations | Display only |
| `/crystal-ball-decay` | Find stale decisions needing re-validation | Display (regular) / `cb-NNN` (deep) |
| `/crystal-ball-predict` | Evaluate one decision's revision probability | Display only |

For full architecture, data flow, and scoring: read `references/ARCHITECTURE.md`.

## Data Sources

Crystal Ball is grounded in **real execution data**, not hypothetical analysis:

1. **Omni-Cortex MCP tools** — `cortex_list_memories`, `cortex_recall`, `cortex_global_search`, `cortex_get_session_context`, `cortex_list_tags`, `cortex_get_activities`
2. **Direct SQLite queries on cortex.db** — `activities`, `memories`, `relationships`, `sessions` tables. See `references/sql-queries.md` for pre-built queries.
3. **Spec files** — `specs/todo/*.md` and `specs/done/**/*.md` (includes project subfolders; or project-specific locations)
4. **Project plan** — `PLAN-OF-ATTACK.md`, `TODO.md`, or equivalent
5. **Tool failures** — `.omni-cortex/tool_failures.jsonl`
6. **Technology constraints** — `references/tech-constraints.md` (self-growing)

### Locating cortex.db

Check in order:
1. `{project_root}/.omni-cortex/cortex.db`
2. Global: `~/.omni-cortex/global.db` (cross-project)

Use Python with sqlite3 for direct queries. Always check table existence first:
```sql
SELECT name FROM sqlite_master WHERE type='table';
```

## Parallel Context Gathering

**IMPORTANT:** When running any Crystal Ball command, launch parallel sub-agents to gather context efficiently. Do NOT gather context sequentially.

```
Launch 4 parallel Task agents:

Agent 1 (Explore): Read all spec files + project plan
  - Glob for specs/todo/*.md, specs/done/**/*.md
  - Read PLAN-OF-ATTACK.md or similar

Agent 2 (Explore): Query Omni-Cortex memories + tags
  - cortex_list_memories (recent 30, sorted by created_at desc)
  - cortex_list_tags (all tags with counts)
  - cortex_get_session_context (last 5 sessions)

Agent 3 (Explore): Query Omni-Cortex for decisions + errors
  - cortex_list_memories with tags_filter ["architecture", "planning"]
  - cortex_list_memories with tags_filter ["error-handling", "debugging"]
  - cortex_list_memories with tags_filter ["crystal-ball"] (previous audits)

Agent 4 (Bash): Direct SQLite queries on cortex.db
  - Session stress detection (see references/sql-queries.md)
  - Decision revision rate by category
  - Contradicting decisions from relationships table
  - Stale decisions (high importance, low access)
```

Wait for all agents to complete before running analysis layers.

### Parallel Layer Execution (Full Audit / Deep Mode)

After context gathering, the 6 analysis layers can also be parallelized. Layers are independent and produce their own scores, so expensive layers should run as sub-agents:

**Inline layers (always run, fast):**
- **L1** (Outcome Alignment) — Simple mapping, no external queries needed
- **L2** (Cross-Tech Dependencies) — Uses context already gathered above

**Parallel sub-agent layers (full/deep mode only):**
Spawn 3 Task sub-agents in a single message:

```
Task 1 (L3 - Decision Pattern Predictor):
- Query historical decisions from gathered context
- Calculate revision rates by category
- Find similar precedents and outcomes
- Return: L3 score, revision probabilities, confidence levels

Task 2 (L5 - Consequence Scanner):
- Trace ripple effects through dependency graph
- Identify unaddressed downstream changes
- Return: L5 score, impact map, unaddressed count

Task 3 (L6 - Constraint Database):
- Cross-check decisions against tech-constraints.md
- Flag violations and near-limit warnings
- Return: L6 score, violations list, new constraints discovered
```

**L4 (Gap Analysis)** runs inline after L1+L2 complete (it uses their findings to identify gaps).

After all sub-agents return, combine scores using composite formula. If any sub-agent fails or times out, score that layer as N/A and redistribute its weight to available layers.

## 6 Analysis Layers

### Layer 1: Outcome Alignment

Map every feature/decision to the project's stated outcome.
- **Gap**: Outcome requirement with no implementation path
- **Drift**: Feature that doesn't serve any stated outcome (scope creep)
- **Score**: (requirements with implementation) / (total requirements) × 100

### Layer 2: Cross-Technology Dependencies

Map the full integration chain. For each connection point, validate:
- Data types match (sender produces what receiver expects)
- Field names align (no silent mismatches)
- Auth methods compatible (JWT vs API key vs session)
- Rate limits respected (concurrent calls vs limits)
- Character/size limits not exceeded
- Timeout constraints compatible (e.g., Vercel 60s vs webhook 63s total)

Cross-check against `references/tech-constraints.md`.

### Layer 3: Decision Pattern Predictor

Query historical decisions from Omni-Cortex:
1. Categorize the current decision (data model, auth, workflow, integration, UI, etc.)
2. Find past decisions in the same category
3. Calculate revision rate: (decisions that were superseded) / (total decisions in category)
4. Check session stress: query activities table for current session's failure rate
5. Find similar precedents and their outcomes

**Confidence levels**: n<3 = Low, n=3-7 = Medium, n>7 = High

**Prediction aggressiveness**: Balanced — flag decisions with >40% predicted revision rate. Label speculative predictions (confidence: Low) clearly.

### Layer 4: Gap Analysis with Severity

For each identified gap:
| Field | Description |
|-------|-------------|
| Impact % | How much this gap affects the outcome (0-100%) |
| Discovery Stage | When this would typically be found: design, build, test, production |
| Fix Cost Now | Estimated hours to fix at current stage |
| Fix Cost Later | Estimated hours if discovered later |
| Confidence | How certain (Low/Medium/High based on data density) |

Rank by **cost-of-delay**: Impact × (Fix_Later / Fix_Now)

### Layer 5: Unintended Consequence Scanner

Input: A specific decision or change.
1. Identify all specs, endpoints, tables, and workflows that reference affected components
2. Trace ripple effects through the dependency graph
3. Flag downstream changes that haven't been addressed yet
4. Output: impact map with count of unaddressed changes

### Layer 6: Technology Constraint Database

Self-growing database at `references/tech-constraints.md`.
- Cross-check ALL current design decisions against known constraints
- After each Crystal Ball run, check if new constraints were discovered during the session
- If yes, append them to tech-constraints.md with date and source

## Output Format

Use the report template from `references/ARCHITECTURE.md` (section: Output Format Template).

Key formatting rules:
- ✅ for passing checks
- ⚠️ for warnings (near limits or medium risk)
- ❌ for failures (violations or high risk)
- Always include Overall Coherence Score at the end
- Always include actionable recommendations

## Report Output

> See: `~/.claude/skills/REPORT-CONVENTION.md` for full convention.

4 subcommands save reports to `reports/crystal-ball/`:

| Command | report_type | Slug Pattern |
|---------|-------------|--------------|
| `/crystal-ball` | `crystal-ball-full` | `{project}-coherence-audit` |
| `/crystal-ball-premortem` | `crystal-ball-premortem` | `{project}-premortem` |
| `/crystal-ball-matrix` | `crystal-ball-matrix` | `{project}-spec-matrix` |
| `/crystal-ball-debt` | `crystal-ball-debt` | `{project}-decision-debt` |

**Key rules:**
- All 4 share the `cb-` prefix and a **single numbering sequence** (e.g., cb-001, cb-002, cb-003...)
- Differentiated by `report_type` in YAML frontmatter
- Trend tracking filters by `report_type` when comparing to previous runs
- The other 4 subcommands (predict, decay, delta, constraints) remain display-only

## Post-Run Actions

After every Crystal Ball command:

1. **Save report** (for full, premortem, matrix, debt only):
   - Determine next `cb-NNN` number from all existing `cb-*.md` reports
   - Write report with YAML frontmatter + full analysis content
   - Display save path to user

2. **Store results** via CLI (fire-and-forget — Spec 17):
   ```bash
   # CLI: store crystal-ball results (fire-and-forget)
   cortex remember "Crystal Ball {command-mode}: Score {score}/100. {summary}. Report: {report_path}" \
     --tags crystal-ball,{command-mode},{project-name} --importance 85 2>/dev/null || \
     python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
     remember "Crystal Ball {command-mode}: Score {score}/100. {summary}. Report: {report_path}" \
     --tags crystal-ball,{command-mode},{project-name} --importance 85 2>/dev/null
   ```

3. **Update tech constraints** if new ones were discovered:
   - Read current references/tech-constraints.md
   - Append new constraints with date stamp
   - Use Edit tool to update the file

4. **Track audit history** for trend analysis:
   - Compare current scores to previous Crystal Ball runs of the same `report_type`
   - If score dropped significantly, flag as "design regression"

## References

- **Full architecture + command map + data flow**: `references/ARCHITECTURE.md`
- **Technology constraint database**: `references/tech-constraints.md`
- **Scoring methodology**: `references/scoring-rubric.md`
- **Pre-built SQL queries**: `references/sql-queries.md`
