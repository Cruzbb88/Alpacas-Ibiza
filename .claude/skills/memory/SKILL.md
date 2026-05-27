---
name: memory
description: >-
  Unified memory management — inspect, search, history, edit, prune, and audit
  Omni-Cortex memories through a single command interface. Surfaces buried MCP
  tools (cortex_get_memory, cortex_get_memory_history) through intuitive
  subcommands. L1: Quick Inspect (inspect, search, search --global). L2: History
  & Timeline (history, diff). L3: Manage (edit, link, prune, review — spec 02).
  L4: Audit & Cross-Project (audit).
  Use when: (1) Looking up a specific memory by ID, (2) Searching memories by
  keyword or tag, (3) Viewing memory version history and diffs, (4) Managing
  memory lifecycle (edit, link, prune, review), (5) Full lifecycle audit,
  (6) Cross-project memory search.
argument-hint: "inspect <id> | search <query> [--global] [--mode keyword|semantic|hybrid] | history <id> | diff <id> | edit <id> | link | prune | review | audit <id>"
model: claude-opus-4-6
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - mcp__omni-cortex__cortex_get_memory
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_get_memory_history
  - mcp__omni-cortex__cortex_list_memories
  - mcp__omni-cortex__cortex_list_tags
  - mcp__omni-cortex__cortex_update_memory
  - mcp__omni-cortex__cortex_forget
  - mcp__omni-cortex__cortex_link_memories
  - mcp__omni-cortex__cortex_review_memories
  - mcp__omni-cortex__cortex_remember
  - mcp__omni-cortex__cortex_export
---

# /memory — Unified Memory Management

A single entry point for all Omni-Cortex memory operations.

## Subcommands

| Subcommand | Layer | Description |
|-----------|-------|-------------|
| `inspect <id>` | L1 | View full memory details + metadata + version count |
| `search <query>` | L1 | Keyword search with optional filters |
| `search --global <query>` | L1 | Cross-project search grouped by project |
| `history <id>` | L2 | Version timeline with timestamps and change reasons |
| `diff <id>` | L2 | Line-by-line content diffs between versions |
| `edit <id>` | L3 | Edit memory content, tags, importance with confirmation |
| `link <src> <tgt> [type]` | L3 | Create relationships between memories |
| `prune [preview\|apply] [scope]` | L3 | 6-category memory hygiene scan |
| `review [action] [ids]` | L3 | Review memory freshness and staleness |
| `audit <id>` | L4 | Full lifecycle audit (inspect + history + relationships) |

## Shortcut

Passing a bare memory ID (e.g., `/memory mem_12345`) auto-routes to `inspect`.

## Execution

See `commands/memory.md` for full implementation logic.
Display format templates are in `references/output-formats.md`.
