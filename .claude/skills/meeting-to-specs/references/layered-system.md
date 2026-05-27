# Layered Skill System Pattern

The layered system is the standard architecture for non-trivial skills. Every skill created through skill-creator should use this pattern unless the skill is genuinely simple (single-purpose, no modes, no scoring).

## Architecture Overview

A layered skill has:
1. **Multiple analysis layers** -- each computes independent metrics and a score (0-100)
2. **Modes** -- control which layers run (quick = L1 only, default = L1+L2, deep = all)
3. **Composite scoring** -- weighted combination of layer scores
4. **Numbered reports** -- persistent output files with YAML frontmatter for trend tracking
5. **Trend dashboard** -- cross-run comparison when 2+ reports exist

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

## Parallel Execution Pattern

Layered skills should use **parallel Task sub-agents** for expensive layers in deep mode.

### When to Spawn Sub-Agents

| Layer Position | Inline or Sub-Agent? | Rationale |
|---------------|---------------------|-----------|
| L1 (quick glance) | **Inline** | Fast, essential, always runs. No overhead justified. |
| L2 (pattern analysis) | **Inline** | Moderate cost, runs by default. Sub-agent overhead not worth it. |
| L3 (deep analysis) | **Sub-Agent** | Expensive computation, only in deep mode. Benefits from parallel execution. |
| L4 (trends/comparison) | **Sub-Agent** | Reads historical reports, independent of L3. Run simultaneously. |
