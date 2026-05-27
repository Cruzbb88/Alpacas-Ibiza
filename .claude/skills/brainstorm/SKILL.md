---
name: brainstorm
description: >-
  Interactive idea-to-spec pipeline that captures raw brain dumps, refines them
  through adaptive follow-up questions, and synthesizes structured Brainstorm Briefs
  with pain points, goals, and feature breakdowns. Supports multi-session persistence
  via Omni-Cortex. Chains into /quick-plan for automatic spec generation.
  Use when: (1) Starting a new project idea, (2) Fleshing out a vague concept,
  (3) Decomposing a complex idea into buildable specs, (4) Resuming a previous
  brainstorm, (5) Listing active brainstorms across sessions, (6) Stripping an
  idea to fundamental truths via first-principles decomposition.
argument-hint: "<resume <name> | list | done | generate | branch <N> | backtrack | merge <N,N> | regenerate [guidance] | --mode rapid-fire | --mode expansion | --mode first-principles>"
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - Skill
  - AskUserQuestion
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_list_memories
  - mcp__omni-cortex__cortex_update_memory
  - mcp__omni-cortex__cortex_get_memory_history
  - mcp__brain-mcp__brain_status
  - mcp__brain-mcp__brain_journal_export
---

# Brainstorm — Interactive Idea-to-Spec Pipeline

Capture raw brain dumps, refine through adaptive questions, synthesize a Brainstorm Brief, and pipe into `/quick-plan` for automatic spec generation. Multi-session persistence via Omni-Cortex.

## Architecture

3-layer skill:
- **L1 (Capture & Clarify):** Interactive brain dump + adaptive follow-up Q&A
- **L2 (Synthesize & Structure):** Consolidate into Brainstorm Brief
- **L3 (Spec Pipeline):** Auto-generate specs via `/quick-plan` + ROADMAP

## Argument Routing

| Argument | Action |
|----------|--------|
| *(empty)* | Start new brainstorm — ask for project name, enter L1 |
| `resume <name>` | Recall brainstorm by project name from cortex, continue L1 |
| `list` | List all active/completed brainstorms from cortex |
| `done` | Trigger L2 synthesis on most recent active brainstorm |
| `generate` | Trigger L2 synthesis + L3 spec pipeline |
| `--mode rapid-fire` | Set mode to rapid-fire for new or resumed brainstorm |
| `--mode expansion` | Set mode to expansion for new or resumed brainstorm |
| `--mode first-principles` | Set mode to first-principles for new or resumed brainstorm |
| `branch <number>` | Go deeper on option N from the most recent expansion |
| `backtrack` | Return to the previous branch point in expansion mode |
| `merge <N,N,...>` | Merge specified expansion options into a combined working dump |
| `regenerate [guidance]` | Re-run expansion with optional directional guidance |

## Execution

The main command logic lives in `commands/brainstorm.md`. The question bank reference is in `references/question-bank.md`. The first-principles decomposition protocol is in `references/first-principles-protocol.md`.

To execute: parse `$ARGUMENTS`, determine sub-command and mode, then follow `commands/brainstorm.md`.

## Dual Backbone Integration

Brainstorm uses both backbones automatically:

**Omni-Cortex** (memory layer): Store/recall brainstorm sessions, persist ideas across conversations, search prior brainstorms by topic, link related brainstorms.

**Breathing Brain** (coordination layer): When synthesizing a Brainstorm Brief (L2), check Brain journal for recent context — active terminals, session health, and any actions/recommendations that inform the brainstorm scope. Brain data helps ground brainstorms in what's actually happening across the ecosystem.

When generating specs from a brainstorm (L3/`generate`), proactively recommend Cortex + Brain integration for the resulting spec:
> "Added Cortex integration for [storing decisions/findings] and Brain integration for [session tracking/terminal coordination] to this spec. Let me know if you want to modify this."

**CLI operations** (fire-and-forget): `cortex remember` for storing brainstorm state, `brain --json status` for session context.
**MCP operations** (interactive): `cortex_recall` for finding prior brainstorms, `brain_journal_export` for recent action context.
