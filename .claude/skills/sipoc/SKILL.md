---
name: sipoc
description: >-
  Map end-to-end processes using SIPOC methodology with Transformation and Handoff tracking.
  Extracts Suppliers, Inputs, Process steps, Outputs, and Customers from process descriptions
  or files. Generates two output formats: SIPOC Matrix (enhanced table with Transformation and
  Handoff columns) and Hierarchy SIPOC (multi-level Mermaid flowchart with color-coded nodes
  and variance paths). 3-layer architecture: L1 (Extract & Map) parses input and extracts all
  SIPOC elements with hierarchy levels and variances; L2 (Visualize & Connect) generates full
  SIPOC Matrix table and Hierarchy SIPOC Mermaid diagram; L3 (Publish & Persist) creates PPTX
  via file-factory and stores analysis in Cortex.
  Variances are treated as first-class sub-SIPOC chains with their own S-I-P-O-C elements,
  branching from parent steps and either rejoining or terminating.
  Use when: (1) Mapping a business process end-to-end, (2) Documenting data transformation
  at each process step, (3) Identifying handoff points between teams or systems, (4) Mapping
  exception/variance paths alongside the main flow, (5) Creating process hierarchy
  decompositions (L1/L2/L3), (6) Generating process diagrams for client presentations.
argument-hint: <process-description-or-file> [--format matrix|hierarchy|both] [--output md|pptx|mermaid] [--mode quick|default|deep] [--level 1|2|3]
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_remember
  - mcp__omni-cortex__cortex_link_memories
  - mcp__mermaid__mermaid_preview
  - mcp__mermaid__mermaid_save
---

# SIPOC Process Mapping

Map end-to-end processes using SIPOC methodology. Extracts Suppliers, Inputs, Process steps, Outputs, and Customers — enhanced with Transformation tracking (what changes at each step) and Handoff linkage (how outputs flow between steps). Variances are mapped as full sub-SIPOC chains.

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Default | *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1 + L2 + L3 | Yes | No |

## Graceful Degradation

- **Mermaid MCP unavailable**: Skip diagram preview/export, output raw Mermaid code block only
- **file-factory unavailable**: Skip PPTX generation, note in output, save markdown report only
- **Cortex offline**: Skip persistence step, note in output, all other layers still produce scores

## Execution

The main command logic lives in `commands/sipoc.md`. SIPOC domain knowledge is in `references/sipoc-elements.md`. Mermaid diagram templates are in `references/hierarchy-patterns.md`.

To execute: parse `$ARGUMENTS`, determine mode, then follow `commands/sipoc.md`.
