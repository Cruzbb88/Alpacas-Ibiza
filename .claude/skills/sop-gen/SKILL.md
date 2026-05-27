---
name: sop-gen
description: >-
  Generate Standard Operating Procedures from process notes, observed workflows,
  or Omni-Cortex knowledge. 2-layer architecture: L1 (Structure) parses input and
  generates SOP skeleton with section headers; L2 (Generate) fills all 12 sections
  with RACI matrix, decision trees, exception handling, and version tracking.
  Includes audit mode for reviewing existing SOPs for gaps.
  Use when: (1) Client needs operational documentation, (2) Creating vendor
  onboarding guides, (3) Documenting repeatable processes, (4) Auditing existing
  SOPs for completeness, (5) Building training materials from project knowledge.
argument-hint: <process-description-or-file> [--audit existing-sop.md] [--format docx|md] [--mode quick|deep]
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
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_list_memories
---

# SOP Generator

Generate Standard Operating Procedures from process notes, observed workflows, or Omni-Cortex knowledge. Includes audit mode for reviewing existing SOPs.

## Mode Matrix

| Mode | Arg | Layers | Output | Sub-agents |
|------|-----|--------|--------|------------|
| Quick | `quick` or `--mode quick` | L1 | SOP skeleton with section headers and placeholders | No |
| Deep | `deep` or `--mode deep` or *(default)* | L1 + L2 | Full SOP with all 12 sections populated | No |
| Audit | `--audit <file>` | Special | Gap report against SOP template | No |

## Execution

The main command logic lives in `commands/sop-gen.md`. The SOP template reference is in `references/sop-template.md`. The layered system pattern is in `references/layered-system.md`.

To execute: parse `$ARGUMENTS`, determine mode, then follow `commands/sop-gen.md`.
