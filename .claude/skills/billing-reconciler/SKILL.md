---
name: billing-reconciler
description: >-
  Reconcile time tracking data against project budgets and generate invoice-ready
  billing reports. 3-layer architecture: L1 (Quick Snapshot) shows hours per project
  with unbilled session count, L2 (Reconciliation) cross-references against scopes
  and flags overruns/rate discrepancies, L3 (Invoice Report) generates client-ready
  billing report with pre-invoice audit.
  Use when: (1) Reviewing billable hours, (2) Checking budget overruns,
  (3) Generating client invoices, (4) Detecting unbilled or misallocated time.
argument-hint: [--client name] [--period week|month|custom] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--mode quick|standard|deep]
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
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_get_timeline
  - mcp__omni-cortex__cortex_export
---

# Billing Reconciler

Reconcile time tracking data against project budgets and generate invoice-ready billing reports.

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Standard | `standard` or *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1 + L2 + L3 | Yes | No |

## Configuration

Billing rates are read from `~/.claude/config/billing-rates.json`. If the file does not exist, the skill will create a template and prompt the user to fill in their rates.

## Reports

Reports are saved to `~/.claude/reports/billing/` with naming: `br-NNN-YYYY-MM-DD.md`

## Execution

See `commands/billing-reconciler.md` for full implementation.
