---
name: collab-handoff
description: >-
  Collaborative handoff system for transferring Omni-Cortex session context,
  decisions, and learnings between collaborators on shared Git repos. Extracts
  memories from Cortex (or accepts freeform input), packages them into
  convention-compliant handoff files, and stages for Git. Use when: (1) Handing
  off work to a collaborator, (2) Exporting session context before switching
  tasks, (3) Checking pending handoffs from teammates, (4) Importing a
  collaborator's handoff with conflict detection.
argument-hint: "export [time-range] [--project <path>] [--dest <path>] [--no-cortex] | import [--from <user>] | status"
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - mcp__omni-cortex__cortex_remember
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_list_memories
  - mcp__omni-cortex__cortex_get_memory
  - mcp__omni-cortex__cortex_link_memories
---

# Collab Handoff -- Collaborative Context Transfer

Transfer Omni-Cortex session context between collaborators on shared Git repos. Export memories as structured handoff files; import them on the receiving end.

## Architecture

4-layer skill:
- **L1 (Memory Extraction Engine):** Time-range query + relationship traversal + project grouping
- **L2 (Export Packaging):** Adaptive bundling + convention naming + Git staging
- **L3 (Import Engine):** Parse handoff files + create Cortex memories + ID mapping + relationship preservation
- **L4 (Conflict Detection):** Tag matching + content similarity + contradiction detection + human-in-the-loop resolution

## Argument Routing

| Argument | Action | Layers |
|----------|--------|--------|
| `export [time-range]` | Extract memories and package handoff files | L1 + L2 |
| `export --no-cortex` | Manual freeform handoff (skip Cortex) | L2 only |
| `import [--from <user>] [--analyze-conflicts] [--no-cortex] [--force]` | Import handoff files into local Cortex | L3 + L4 |
| `status` | Show pending handoffs awaiting import | Read-only |

### Time-range formats
`5h`, `24h`, `3d`, `7d`, `1w`, `2w`, `"since Tuesday"`, `"since 2026-02-14"`

Default: `24h` if no range specified.

### Flags
- `--project <path>` -- Scope export to a specific project
- `--dest <path>` -- Override output directory (default: `{repo_root}/handoffs/{username}/`)
- `--no-cortex` -- Skip Cortex extraction, accept freeform text input
- `--from <user>` -- Filter imports to a specific collaborator
- `--analyze-conflicts` -- Dry-run: show conflict classifications without importing
- `--force` -- Re-import already-processed files from `imported/` subdirectory

## Execution

- **Export command:** `commands/export.md` -- L1 extraction engine + L2 packaging pipeline
- **Import command:** `commands/import.md` -- L3 import engine + L4 conflict detection
- **Status command:** `commands/status.md` -- Pending handoff overview
- **File format reference:** `references/memory-format.md` -- Handoff file schema
- **ID mapping reference:** `references/id-mapping-format.md` -- Cross-reference mapping schema
- **Convention bridge:** `references/convention-bridge.md` -- Links to REPORT-CONVENTION.md

To execute: parse `$ARGUMENTS`, determine sub-command, then follow the matching command file.

### Convention Compliance

Handoff files follow the unified report convention:
- **Prefix:** `ch-`
- **Directory:** `handoffs/{username}/` (per-user subdirectories)
- **Pattern:** `ch-{NNN}-{YYYY-MM-DD}-{project-slug}-handoff.md`
- See: `~/.claude/skills/REPORT-CONVENTION.md`
