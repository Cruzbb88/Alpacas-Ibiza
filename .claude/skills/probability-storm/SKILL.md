---
name: probability-storm
description: >-
  Probability field scanner inspired by Rick's detector from "Final DeSmithation" (Rick & Morty S6E5).
  Assesses the strategic viability of any decision, idea, or plan before committing to a build.
  4-layer architecture: L1 Field Scan (strategic viability assessment), L2 Strategy Explorer
  (multi-source alternative discovery via internal tools, web search, and AI-proposed options),
  L3 Multi-Strategy Simulator (parallel Monte Carlo comparison), L4 Portfolio Comparator
  (tool overlap and decision analysis). Includes duplicate detection against existing skills/commands.
  Use when: (1) Evaluating whether to build something, (2) Before committing to an architecture
  decision, (3) After /brainstorm as a workflow gate before /quick-plan, (4) Checking if an idea
  overlaps with existing capabilities, (5) Running what-if simulations on decisions,
  (6) Comparing existing tools for overlap/merge/scrap decisions.
argument-hint: "<decision text> | --deep | --gate | --simulate | --strategies N | --stress-test | compare <A> <B> [C...] | history | --sims N | --global"
model: opus
---

# Probability Storm -- Probability Field Scanner

> "Sim it." -- Rick's probability field detector, reimagined for Claude Code.

Scan the probability field around any decision before committing. Advisory only -- never blocks workflow, never auto-decides.

## Architecture

| Layer | Name | Weight | Mode | Status |
|-------|------|--------|------|--------|
| L1 | Field Scan — Strategic viability assessment | 30% | Always inline | Active |
| L2 | Strategy Explorer — Multi-source alternative discovery | 25% | Always inline | Active |
| L3 | Multi-Strategy Simulator — Parallel Monte Carlo comparison | 25% | Sub-agent (deep) / inline (simulate) | Active |
| L4 | Portfolio Comparator — Tool overlap and decision analysis | 20% | Sub-agent (deep) / inline (calibrate) | Active |

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Default | *(default)* | L1 + L2 | Yes | No |
| Deep | `--deep` | L1-L4 | Yes | L3, L4 |
| Simulate | `--simulate` | L3 only | Yes | L3 |
| Gate | `--gate` | L1 + L2 | Yes | No |
| Compare | `compare <items>` | L4 only | Yes (cmp-*) | No |

## Argument Routing

| Input | Action |
|-------|--------|
| `<decision text>` | L1 + L2 scan (default mode) |
| `--deep <decision>` | All 4 layers |
| `--simulate <scenario>` | Jump to L3 simulation |
| `--strategies N` | Modifier: set strategy count for L2 (default: adaptive ~10) |
| `--sims N` | Modifier: set iterations per strategy (default: 1000) |
| `--stress-test` | Modifier: run 100K iterations on winner for edge case discovery |
| `--gate` | Workflow gate: reads last /brainstorm context from Cortex |
| `compare <item1> <item2> [item3...]` | L4 portfolio comparison (keep/merge/scrap) |
| `history` | List past reports with scores |
| `--global` | Modifier: cross-project scope |

## Execution

Read and follow `commands/probability-storm.md` for all execution logic.

## References

| File | Purpose | When to Read |
|------|---------|-------------|
| `references/catchphrases.md` | Rotating verdict phrases by tier | During report generation |
| `references/duplicate-detection.md` | Skill/command scanning patterns | During L1 duplicate check |
| `references/strategy-explorer.md` | Multi-source search patterns for L2 | When running L2 Strategy Explorer |
| `references/simulation-engine.md` | Monte Carlo patterns for L3 | When running L3 Simulation |
| `references/portfolio-comparator.md` | Overlap analysis, scoring, recommendations for L4 | When running L4 Compare or deep mode |

## Reports

- **Probability scans:** `reports/probability-storm/ps-NNN-YYYY-MM-DD.md`
- **Portfolio comparisons:** `reports/probability-storm/cmp-NNN-YYYY-MM-DD.md`

Scan reports include YAML frontmatter with layer scores, composite score, confidence level, verdict catchphrase, and trend data. Comparison reports include items compared, overlap matrix, and keep/merge/scrap recommendations.
