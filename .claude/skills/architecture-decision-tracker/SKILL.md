---
name: architecture-decision-tracker
description: >-
  Track architecture decisions with context, rationale, and decay detection.
  Integrates with /crystal-ball for decision health analysis. 2-layer architecture:
  L1 (Capture & Search) records new ADRs and searches existing ones via Omni-Cortex;
  L2 (Radar & Debt) surfaces decisions needing revisiting through decay detection
  and generates decision debt reports.
  Use when: (1) Recording a new architecture decision, (2) Searching for past
  decisions on a topic, (3) Finding stale decisions that need revisiting,
  (4) Reporting on decision debt and overdue reviews, (5) Feeding decision
  data to /crystal-ball analysis.
argument-hint: "<capture|search|radar|debt> [decision-description] [--project filter]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_remember
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_link_memories
  - mcp__omni-cortex__cortex_list_memories
---

# Architecture Decision Tracker

Track architecture decisions with context, rationale, alternatives, and consequences. Integrates with `/crystal-ball` for decision health analysis. Maintains a searchable decision log in Omni-Cortex with decay detection and decision debt reporting.

## Mode Matrix

| Mode | Sub-command | Layers | Output | Sub-agents |
|------|------------|--------|--------|------------|
| Capture | `capture` | L1 | Stored ADR in cortex | No |
| Search | `search` | L1 | Formatted list of matching ADRs | No |
| Radar | `radar` | L1 + L2 | Decisions needing revisiting | No |
| Debt | `debt` | L1 + L2 | Decision debt report with status counts | No |

## Sub-Commands

| Command | Usage | What It Does |
|---------|-------|-------------|
| `capture` | `/adr capture "chose polling over WebSocket because..."` | Record new decision with full ADR format |
| `search` | `/adr search "real-time updates"` | Find past decisions by topic via cortex |
| `radar` | `/adr radar [--project name]` | Surface decisions that may need revisiting |
| `debt` | `/adr debt [--project name]` | Report on overdue reviews, high-impact decisions |

## Execution

The main command logic lives in `commands/architecture-decision-tracker.md`. The ADR format template is in `references/adr-template.md`.

To execute: parse `$ARGUMENTS`, determine sub-command, then follow `commands/architecture-decision-tracker.md`.
