---
name: portfolio-health
description: >-
  Aggregate health dashboard across ALL projects using Omni-Cortex global data.
  Produces per-project health scores (0-100) with composite weighting, Eisenhower
  priority matrix, stale project detection, burnout indicators, and trend tracking.
  Use when: (1) You need a "command center" view across all projects, (2) Checking
  which project needs attention, (3) Detecting overconcentration or staleness,
  (4) Weekly portfolio review.
argument-hint: [--mode quick|standard|deep] [--project filter]
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - Task
  - mcp__omni-cortex__cortex_global_stats
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_list_memories
  - mcp__omni-cortex__cortex_get_timeline
---

# Portfolio Health

Cross-project health dashboard using Omni-Cortex global data. Scans all known projects, computes health scores, and produces an actionable priority matrix.

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Standard | `standard` or *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1-L4 | Yes | L3, L4 |

## Composite Scoring

Per-project health is a weighted average of 5 dimensions:

| Dimension | Weight | Source | Scoring |
|-----------|--------|--------|---------|
| Activity Recency | 30% | cortex_get_timeline | <1 day = 100, >7 days = 0 (linear) |
| Spec Completion | 25% | Glob specs/done vs specs/todo | all done = 100, all todo = 0 |
| Memory Freshness | 20% | cortex_list_memories | % of memories < 7 days old |
| Blocker Count | 15% | cortex_global_search "blocker" | 0 blockers = 100, 3+ = 0 |
| Documentation Health | 10% | Read CLAUDE.md, Glob PLAN-OF-ATTACK | exists + has content = 100 |

**ALL scoring math MUST use bash/Python scripts. Never use LLM arithmetic.**

## Reports

**Description slug generation for ph- reports:**
- Derive from the portfolio context:
  - Cross-project health check -> `"cross-project-health"`
  - Filtered to one project -> use project name slug (e.g., `"workshop-health"`)
  - Deep mode -> `"deep-portfolio-analysis"`
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

Numbered reports saved to BOTH locations (dual save):
1. **Global:** `~/.claude/reports/portfolio-health/ph-{NNN}-{YYYY-MM-DD}-{slug}.md`
2. **Per-project:** `reports/portfolio-health/ph-{NNN}-{YYYY-MM-DD}-{slug}.md`

Both directories are created with `mkdir -p` if they don't exist. Same report content is written to both locations.

Each report includes YAML frontmatter for trend tracking across runs. When reading previous reports for trends, search BOTH locations (global reports + per-project reports).

## Layers

### L1: Quick Snapshot (always runs)
- Call `cortex_global_stats` to get project list
- For each project: get last activity date, memory count, spec counts
- Compute per-project scores using Python
- Output single table: Project | Score | Last Active | Memories | Specs (done/todo) | Status

### L2: Attention Matrix (standard + deep)
- Eisenhower quadrant classification based on score + urgency signals
- Stale detection: projects with no cortex activity in 7+ days
- Burnout indicator: if >80% of recent memories are from 1 project
- Output: Eisenhower matrix table + warnings

### L3: Deep Dive (deep mode only, sub-agent)
- Per-project spec status breakdown
- Handoff analysis from cortex memories
- Blocker identification from handoff content
- Output: per-project detail sections

### L4: Trend Comparison (deep mode only, sub-agent)
- Read previous report(s) from `~/.claude/reports/portfolio-health/` AND `reports/portfolio-health/`
- Compare current scores to previous run
- Calculate trajectory: improving / declining / stable
- Output: trend table with ASCII arrows

## Invocation

```
/portfolio-health                     # standard mode (L1+L2)
/portfolio-health --mode quick        # quick snapshot (L1 only)
/portfolio-health --mode deep         # full analysis (L1-L4)
/portfolio-health --project ralph     # filter to one project
```
