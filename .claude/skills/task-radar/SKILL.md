---
name: task-radar
description: |
  Surface unfinished work, classify on Eisenhower matrix, and track sticky notes.
  4-layer architecture: L1 Quick, L2 Deep, L3 Pipeline Audit, L4 Global.
  
  Use when: (1) User wants to scan for unfinished work or track progress,
  (2) User says "task radar note", "save as task radar note", "add as a task radar note",
  "that's a task radar note", "do a task radar note", "make a task radar note",
  "note this for task radar", "store as task radar note", "turn into task radar note",
  "add that to task radar", "save that for task radar",
  "update the task radar note", "update that note", "modify the note about" — these ALL route to the noted feature,
  (3) Running /pickup with matrix flag, (4) Session housekeeping or maintenance checks.
  
  IMPORTANT: When user says any variation of "task radar note" via voice (Wispr Flow),
  ALWAYS invoke this skill's `note` subcommand — do NOT save a raw Cortex memory instead.
  "note" mode (alias: "noted"): Quick sticky-note brain dumps into Cortex that auto-surface in reports.
  Use when: (1) Starting a work session and want to see what's been forgotten,
  (2) After pivoting to check nothing fell through cracks, (3) Periodic review of
  all unfinished work with priority ranking, (4) Cross-project sweep to see everything
  at once, (5) Cleaning up stale Q4 items from Cortex, (6) Quick brain dump of ideas/tasks
  without derailing current workflow.
  
  IMPORTANT: When user says any variation of "task radar note" via voice (Wispr Flow),
  ALWAYS invoke this skill's `note` subcommand — do NOT save a raw Cortex memory instead.
argument-hint: "quick | deep | global | report | prune | verify | update | note <text> | note list | note clear | note recap | note promote <id> | note update <keyword>"
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Agent
  - AskUserQuestion
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_list_memories
  - mcp__omni-cortex__cortex_get_session_context
  - mcp__omni-cortex__cortex_get_timeline
  - mcp__omni-cortex__cortex_review_memories
  - mcp__omni-cortex__cortex_update_memory
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_list_tags
  - mcp__brain-mcp__brain_status
  - mcp__brain-mcp__brain_journal_export
  - mcp__brain-mcp__brain_pulse
---

# Task Radar

Surfaces ALL unfinished work, classifies on the Eisenhower matrix, estimates completion %,
and recommends next actions per item. Generates incremental reports that build on previous scans.

## Architecture

| Layer | Name | Speed | Trigger |
|-------|------|-------|---------|
| **L1** | Quick Scan | <15s | `quick` or `/pickup matrix` |
| **L2** | Deep Radar | ~60s | *(default)* or `deep` |
| **L3** | Pipeline Audit | ~90s | `deep` (runs with L2) |
| **L4** | Global Sweep | ~120s+ | `global` |
| **Noted** | Sticky Notes | <5s | `note` (or `noted`) / `note extract` / `note list` / `note clear` / `note recap` / `note promote` |

## Argument Routing

| Argument | Action |
|----------|--------|
| *(empty)* | Run L2 Deep Radar for current directory |
| `quick` | L1 Quick Scan only -- compact Eisenhower table |
| `deep` | L2 Deep Radar + L3 Pipeline Audit |
| `global` | L4 Cross-project sweep (asks which dirs first) |
| `report` | Show last report without re-scanning |
| `prune` | Run Q4 traffic light cleanup only |
| `verify` | Re-verify last report's items against current state |
| `update` | Interactively mark items as completed in the latest report |
| `note <text>` | Quick sticky note -- store brain dump to Cortex (alias: `noted`) |
| `note extract <text>` | Extract actionable items from longer text/transcript |
| `note list` | Show all pending noted items in Eisenhower format |
| `note clear` | Clear noted items that have been completed |
| `note recap` | Summarize all noted items into cohesive narrative |
| `note promote <id or keyword>` | Promote a noted item to a full task |

## Reports

- **Per-project:** `reports/task-radar/rd-NNN-YYYY-MM-DD-{slug}.md`
- **Global:** `reports/task-radar/gtr-NNN-YYYY-MM-DD-global.md`
- Reports are incremental -- each run builds on the previous one
- **L2+ reports include a "Predicted Actions" section** — maps Q1/Q2 items to runnable commands,
  checks maintenance staleness, and filters quick wins. This section is consumed by `/pickup`
  to display the Priority Queue without re-computing predictions. YAML frontmatter includes
  `predicted_actions_count`, `maintenance_overdue`, `quick_wins_count`, `quick_wins_total_time`
  for fast parsing.

## Noted Items in Reports

When any Task Radar layer (L1-L4) runs, it MUST also:
1. Query Cortex for noted items using triple-tag search (see commands/task-radar.md Step 10.7 for details):
   - Query 1: `tags_filter: ["task-radar-noted"]`
   - Query 2: `tags_filter: ["noted", "task-radar"]`
   - Query 3: `tags_filter: ["sticky-note"]`
   - Merge + deduplicate by memory ID. Exclude any with tag `resolved`.
2. Include them in the appropriate Eisenhower quadrant based on their classification
3. Mark them distinctly with `[NOTED]` prefix in the item title
4. This ensures brain dumps surface in regular reports automatically

## Cortex & Brain Integration

### Omni-Cortex (memory/knowledge layer)
**CLI (fire-and-forget):**
- `cortex remember "..." --tags task-radar-noted --importance 60` — store noted items
- `cortex recall "query" --limit N --json` — batch pre-fetch handoffs, brainstorms, decisions
- `cortex list --tags task-radar-noted --json` — list pending noted items
- `cortex update <id> --tags task-radar-noted,resolved` — mark noted items done

**MCP (interactive reasoning):**
- `cortex_recall` — recall memories when LLM needs results for classification
- `cortex_list_memories` — browse/filter memories for display
- `cortex_update_memory` — archive Q4 items during prune
- `cortex_global_search` — cross-project sweep (L4)

### Breathing Brain (coordination/executive layer)
**CLI (fire-and-forget):**
- `brain --json status` — get terminal state, pulse count, edits since commit, session activity
- `brain --json journal list --days 7` — read recent session journals for actions/recommendations
- `brain --json terminals list` — check active terminals (multi-agent awareness)

**MCP (interactive reasoning):**
- `brain_status` — get brain state when LLM needs to factor session health into scoring
- `brain_journal_export` — export journals for trend analysis in L3
- `brain_pulse` — process accumulated signals during deep scans

### When to Use What

| Need | Use |
|------|-----|
| Store/recall memories, handoffs, brainstorms | **Cortex** |
| Track terminal coordination, multi-agent state | **Brain** |
| Detect session health, breaks, edit counts | **Brain** |
| Search across projects | **Cortex** (global search) |
| Access pulse/heartbeat signals | **Brain** |
| Noted items (store, list, clear, promote) | **Cortex** |
| Session activity trends for report enrichment | **Brain** (journals) |

> Cortex = what was decided/learned. Brain = what happened between decisions.

### Brain Data in Reports

When L2 or L2+L3 runs, include a **Session Health** section in the report:
1. Query `brain --json status` for current terminal state
2. Query `brain --json journal list --days 7` for recent journals
3. Extract: pulse count, edits since commit, actions taken, recommendations queued
4. If edits_since_commit > 20: flag "Heavy uncommitted changes — consider /commit"
5. If multiple terminals active: show terminal count + project assignments
6. Include journal trend (actions/recommendations over last 3-5 journals)

## Execution

The main command logic lives in `commands/task-radar.md`.
Classification rules are in `references/eisenhower-classification.md`.
Completion heuristics are in `references/completion-heuristics.md`.
Verification patterns are in `references/verification-patterns.md`.

Parse `$ARGUMENTS`, determine layer, then follow `commands/task-radar.md`.
