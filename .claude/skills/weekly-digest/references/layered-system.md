# Layered Skill System Pattern

The layered system is the standard architecture for non-trivial skills. Every skill created through skill-creator should use this pattern unless the skill is genuinely simple (single-purpose, no modes, no scoring).

## Architecture Overview

A layered skill has:
1. **Multiple analysis layers** — each computes independent metrics and a score (0-100)
2. **Modes** — control which layers run (quick = L1 only, default = L1+L2, deep = all)
3. **Composite scoring** — weighted combination of layer scores
4. **Numbered reports** — persistent output files with YAML frontmatter for trend tracking
5. **Trend dashboard** — cross-run comparison when 2+ reports exist

## Layer Design Principles

### How Many Layers?

| Skill Complexity | Layers | Example |
|-----------------|--------|---------|
| Simple utility | 2 | L1: core analysis, L2: context/patterns |
| Standard tool | 3 | L1: core, L2: patterns, L3: trends |
| Complex system | 4 | L1: core, L2: patterns, L3: deep analysis, L4: trends |

### Layer Ordering

- **L1**: Always runs. Fast, essential metrics. The "quick glance."
- **L2**: Runs by default. Pattern analysis, context. Adds depth without sub-agents.
- **L3**: Deep mode only. Expensive analysis, sub-agents allowed. The "deep dive."
- **L4**: Comparison/trend layer. Requires historical data (2+ saved reports).

### Layer Independence

Each layer should:
- Produce a score (0-100) independently
- Be skippable without breaking other layers
- Have clear data sources documented
- Degrade gracefully if data is unavailable (score = N/A, weight redistributed)

## Mode Matrix Template

Every layered skill needs a mode matrix in its SKILL.md:

```markdown
| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Default | *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1-L4 | Yes | L3, L4 |
| [Custom] | `[arg]` | [subset] | [Yes/No] | [Yes/No] |
```

The `argument-hint` in frontmatter MUST list all modes:
```yaml
argument-hint: "[quick | deep | custom-mode]"
```

## Composite Scoring Formula

Standard pattern — weights must sum to 1.0:
```
composite = (L1 × W1) + (L2 × W2) + (L3 × W3) + (L4 × W4)
```

If a layer is N/A, redistribute its weight equally among available layers:
```python
available = [l for l in layers if l.score is not None]
redistributed_weight = na_layer.weight / len(available)
for l in available:
    l.adjusted_weight = l.weight + redistributed_weight
```

Score interpretation (universal):
- 80-100: Excellent
- 60-79: Good
- 40-59: Fair — needs attention
- 0-39: Critical — action required

## Numbered Reports Pattern

### Directory Convention
```
reports/{skill-name}/{prefix}-NNN-YYYY-MM-DD.md
```

Examples:
- `reports/self-heal/sh-001-2026-02-10.md`
- `reports/time-reports/tr-001-2026-02-13.md`

### Report Numbering
```python
# Glob for existing reports
files = glob(f"{REPORTS_DIR}/{PREFIX}-*.md")
# Extract NNN from filenames
numbers = [int(re.search(r'-(\d+)-', f).group(1)) for f in files]
# Next number (zero-padded to 3 digits)
next_num = max(numbers, default=0) + 1
filename = f"{PREFIX}-{next_num:03d}-{date}.md"
```

### YAML Frontmatter Template
```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{mode}"
# Skill-specific metrics go here
layer_1_score: {N}
layer_2_score: {N_or_NA}
layer_3_score: {N_or_NA}
layer_4_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---
```

### Trend Dashboard Format
```markdown
### Score Trend
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
| 001 | Feb 10 | 85 | 72 | — | — | 79 | — |
| 002 | Feb 11 | 88 | 75 | 68 | — | 78 | -1 |
| **003** | **Feb 13** | **90** | **80** | **71** | **65** | **80** | **+2** |

Trajectory: Improving (3 consecutive runs with rising composite)
```

## Gap Analysis Questions

When designing layers for a new skill, ask these questions to identify gaps:

### Layer Coverage
- What is the ONE metric users need most? (→ L1)
- What patterns or context add depth? (→ L2)
- What expensive analysis would be valuable but not always needed? (→ L3)
- Is there historical data worth comparing over time? (→ L4)

### Mode Gaps
- Does the user need a fast "just the headline" mode? (→ quick)
- Is there a scoped view (e.g., last 7 days)? (→ weekly/scoped mode)
- Would comparing runs be useful? (→ compare mode)

### Data Source Gaps
- What data does each layer need? Is it available?
- What happens if data is missing? (graceful degradation plan)
- Are there external data sources that could enrich analysis?

### Scoring Gaps
- What makes a "good" score for each layer?
- Are the weights appropriate? (most actionable layer = highest weight)
- What deductions make sense? What bonuses?

## Parallel Execution Pattern

Layered skills should use **parallel Task sub-agents** for expensive layers in deep mode. This is a core architectural decision.

### When to Spawn Sub-Agents

| Layer Position | Inline or Sub-Agent? | Rationale |
|---------------|---------------------|-----------|
| L1 (quick glance) | **Inline** | Fast, essential, always runs. No overhead justified. |
| L2 (pattern analysis) | **Inline** | Moderate cost, runs by default. Sub-agent overhead not worth it. |
| L3 (deep analysis) | **Sub-Agent** | Expensive computation, only in deep mode. Benefits from parallel execution. |
| L4 (trends/comparison) | **Sub-Agent** | Reads historical reports, independent of L3. Run simultaneously. |

### Sub-Agent Spawning Template

In deep mode, spawn sub-agents for L3+ layers in a **single message** (parallel execution):

```markdown
### Deep Mode Execution

Spawn [N] Task sub-agents in a single message (parallel execution):

**Task 1 (L3 - [Layer Name]):**
- subagent_type: "general-purpose"
- prompt: "[Complete L3 analysis instructions with data sources]"

**Task 2 (L4 - [Layer Name]):**
- subagent_type: "general-purpose"
- prompt: "[Complete L4 analysis instructions with data sources]"

Each sub-agent:
1. Gathers its own data (queries, file reads, MCP calls)
2. Computes its layer score (0-100)
3. Returns: score, key findings, and raw data summary

After all sub-agents complete:
- Combine scores using composite formula
- Merge findings into unified report
- If a sub-agent fails/timeouts: score = N/A, redistribute weight
```

### Sub-Agents vs Agent-Teams

**Use Task sub-agents (fire-and-forget)** for layer execution:
- Layers are independent, no inter-layer communication needed
- Each layer produces a score and findings, then done
- Lower overhead, lower token cost
- This is the standard for ALL layered skills

**Use Agent-Teams** only for multi-file builds:
- When agents need to share findings and coordinate changes
- When one agent's output affects another agent's work
- When real-time discussion/negotiation is needed
- Example: building 3 specs in parallel where agents discover shared dependencies

**Rule of thumb:** If the work is "gather data, analyze, return score" with no coordination, use sub-agents. If the work requires collaboration, use agent-teams.

### Skills That Combine Sub-Agents, Slash Commands, and Tools

In deep mode, a layered skill effectively orchestrates multiple Claude Code capabilities simultaneously:

- **Sub-agents** run expensive layers (L3, L4) in parallel
- Each sub-agent can invoke **slash commands** and **skills** internally (e.g., a sub-agent might call `/prime` to understand a codebase before analyzing it)
- Each sub-agent has access to **all tools** (Bash, Read, Grep, MCP tools, etc.)
- The parent skill coordinates results and produces the composite score

This means a single `/crystal-ball` invocation might spawn 4 context-gathering agents + 3 layer-execution agents, each using different tools and data sources, all running in parallel. The layered architecture makes this orchestration structured and predictable.

## Proven Examples

### Self-Heal Skill (4 layers)
- L1 (40%): Tool failures — reads tool_failures.jsonl
- L2 (30%): Tool reliability — queries activities table for fail rates
- L3 (15%): Session health — queries sessions table for graceful exits
- L4 (15%): Memory freshness — queries memories table for staleness
- Modes: quick, deep, report-only, quick-embed
- Reports: `sh-NNN-YYYY-MM-DD.md`

### Crystal Ball Skill (6 layers)
- L1 (25%): Outcome alignment — maps features to goals
- L2 (25%): Cross-tech dependencies — validates integration points
- L3 (20%): Decision patterns — revision rates, similar precedents
- L4 (15%): Gap analysis — unaddressed design gaps
- L5+L6 (15%): Consequence scanner + constraint DB
- Modes: full, per-spec, per-decision, plus 6 sub-skills
- Reports: numbered audits with constraint DB

### Time Report Skill (4 layers)
- L1 (35%): Time summary — active days, time breakdown, success rate
- L2 (30%): Work rhythm — sprints, gaps, consistency
- L3 (20%): Productivity pulse — velocity, deliverables, error trends
- L4 (15%): Trend comparison — cross-report deltas, burnout indicators
- Modes: quick, default, deep, weekly, compare
- Reports: `tr-NNN-YYYY-MM-DD.md`
