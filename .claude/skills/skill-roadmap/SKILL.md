---
name: "skill-roadmap"
description: "Discover all available skills, commands, and MCP tools, then classify each against a target project as essential, recommended, or optional. Use when onboarding a new project, planning which tools to apply, or generating a skill-execution roadmap."
argument-hint: "scan | quick | deep | update | --domain <name>"
model: "opus"
---

# Skill Roadmap

> Systematic capability discovery and project-fit analysis. Know what you have before you plan what to do.

Scans all available skills, commands, and MCP tools across universal and project-level directories, then classifies each against the current project context. Produces a structured capability inventory (L1), project-fit analysis (L2), and a wave-sequenced skill-execution roadmap (L3) following ROADMAP-TEMPLATE.md. L4 adds business domain filtering when `--domain` is specified.

## Architecture

| Layer | Name | Weight | Status |
|-------|------|--------|--------|
| L1 | Capability Discovery | 40% | Active |
| L2 | Project Analysis | 35% | Active |
| L3 | Roadmap Generation | 15% | Active |
| L4 | Domain Templates | 10% | Active |

**Composite scoring:** `composite = (L1 x 0.40) + (L2 x 0.35) + (L3 x 0.15) + (L4 x 0.10)`

When running L1+L2+L3 (no domain): `composite = ((L1 x 0.40) + (L2 x 0.35) + (L3 x 0.15)) / 0.90`
When running L1 only (scan): no composite calculated.

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Saves Roadmap | Sub-agents |
|------|-----|--------|-------------|--------------|------------|
| Scan | `scan` | L1 | No | No | No |
| Quick | `quick` | L1 + L2 + L3 (no rationale) | No | Yes (medium-detail) | No |
| Default | *(none)* | L1 + L2 + L3 | Yes | Yes (full-detail) | No |
| Deep | `deep` | L1 + L2 + L3 | Yes | Yes (full-detail) | No |
| Update | `update` | L1 + L2 + L3 | Yes | Yes (merge) | No |

## Argument Routing

| Input Pattern | Action |
|---------------|--------|
| *(no args)* | Default mode: L1 + L2 + L3 with rationale, save report + roadmap |
| `scan` | Scan mode: L1 inventory only, terminal output, no report |
| `quick` | Quick mode: L1 + L2 + L3 without rationale, medium-detail roadmap |
| `deep` | Deep mode: L1 + L2 + L3 with full rationale, full-detail roadmap |
| `update` | Update mode: L1 + L2 + L3, re-scan and merge with existing roadmap |
| `--domain <name>` | Add L4 domain filtering to any mode |
| `--domain <n1>,<n2>` | Combine multiple domains |

Domain flag combines with any mode: `quick --domain security`, `deep --domain etl,reporting`.

## References

| File | Purpose | When to Read |
|------|---------|-------------|
| `references/weight-heuristics.md` | Context consumption estimates per skill/command | During L1 weight classification |
| `references/purpose-taxonomy.md` | Purpose grouping definitions and classification signals | During L2 purpose assignment |
| `references/wave-sequencing.md` | Wave assignment algorithm and execution method decisions | During L3 wave assignment |
| `references/domain-discovery.md` | Domain detection heuristics and reclassification rules | During L4 domain filtering |

## Execution

Follow the instructions in `commands/skill-roadmap.md` for full execution logic covering L1, L2, L3, and L4.

## Report Format

Reports saved to `reports/skill-roadmap/sr-NNN-YYYY-MM-DD.md` in the project where the skill is run.

```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{scan|quick|default|deep}"
project: "{project-name}"
domain_filter: "{domain or null}"
capabilities_discovered: {N}
skills_count: {N}
commands_count: {N}
mcp_tools_count: {N}
essential_count: {N}
recommended_count: {N}
optional_count: {N}
discovery_score: {N}
analysis_score: {N_or_NA}
generation_score: {N_or_NA}
domain_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---
```
