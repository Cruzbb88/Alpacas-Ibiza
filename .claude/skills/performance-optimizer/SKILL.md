---
name: performance-optimizer
description: >-
  Surgical performance analysis that finds the critical path bottleneck in any
  application and calculates how close to theoretical maximum it could run.
  Combines critical path identification (Arc Reactor) with theoretical minimum
  calculation (Raptor Engine) to produce a Power Core Report showing exactly
  where performance is lost and how much is recoverable. Use when: (1) An
  application is slow and you need to find THE bottleneck, (2) You want to know
  how fast something COULD theoretically run, (3) You need data-driven
  optimization priorities, (4) You want performance regression prevention.
argument-hint: "<target> [quick | deep]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Task, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_recall
---

# Performance Optimizer

> *"Find the power core. Optimize the one thing everything depends on."*

Surgical bottleneck analysis merging Arc Reactor (critical path identification) with Raptor Engine (theoretical minimum calculation). Finds THE one thing everything depends on and measures how fast it COULD run.

## Modes

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Default | *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1-L4 | Yes | L3, L4 |

## Layer Architecture

| Layer | Name | Weight | What It Does |
|-------|------|--------|-------------|
| L1 | Critical Path Identification | 35% | Trace operations input-to-output, rank bottlenecks by Power Core Score |
| L2 | Theoretical Minimum | 30% | Calculate theoretical minimum for each bottleneck, measure gap |
| L3 | Gap Closure Optimization | 20% | Apply optimization techniques to close actual-vs-theoretical gap |
| L4 | Regression Prevention | 15% | Generate benchmarks, audit, trend tracking |

Composite: `(L1 x 0.35) + (L2 x 0.30) + (L3 x 0.20) + (L4 x 0.15)`

If a layer is N/A (e.g., quick mode skips L2-L4), redistribute weight equally among available layers.

Score interpretation: 80-100 Excellent, 60-79 Good, 40-59 Fair, 0-39 Critical.

## Reports

Reports save to `reports/performance-optimizer/po-NNN-YYYY-MM-DD.md` with sequential numbering. Glob existing reports, extract highest NNN, increment. YAML frontmatter includes layer scores, composite, trend, and power core identification.

## Differentiation from /improve

This is NOT `/improve`. The boundary is clear:

| Concern | /improve | Performance Optimizer |
|---------|----------|----------------------|
| Scope | Entire codebase, all optimization areas | Single critical path bottleneck |
| Depth | Tiered recommendations (quick/medium/difficult) | Theoretical minimum calculation + gap analysis |
| Output | Optimization menu across all areas | Power Core Report with one deep analysis |
| Philosophy | "What's suboptimal?" | "What's THE bottleneck and how fast COULD it be?" |

Use `/improve` for broad codebase health. Use `/performance-optimizer` when you need to find and fix THE critical bottleneck with theoretical backing.

## Execution

Read `commands/performance-optimizer.md` for the full analysis protocol covering all four layers, mode routing, report generation, and scoring.
