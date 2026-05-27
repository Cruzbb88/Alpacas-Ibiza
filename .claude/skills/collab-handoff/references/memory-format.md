# Handoff File Format Reference

Definitive schema for collab-handoff export files. Used by both export (Spec 07) and import (Spec 08).

## YAML Frontmatter

```yaml
---
report_type: "collab-handoff"
report_number: 3
date: "2026-02-17"
source_user: "Tony"
time_range: "24h"
memory_count: 8
project_name: "Surity Project"
project_tag: "surity"
export_mode: "cortex"          # "cortex" | "manual"
contains_linked: true          # Whether linked memories are included
original_ids:                  # List of all original memory IDs in this file
  - "mem_1771304364329_92bd754f"
  - "mem_1771282361434_a43ac4d3"
---
```

### Field Details

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `report_type` | string | Yes | Always `"collab-handoff"` |
| `report_number` | integer | Yes | Unpadded. Matches NNN in filename |
| `date` | string | Yes | ISO 8601 date |
| `source_user` | string | Yes | From `git config user.name` |
| `time_range` | string | Yes | Original time-range arg (e.g., "24h", "3d") |
| `memory_count` | integer | Yes | Number of memories in this file |
| `project_name` | string | Yes | Human-readable project name |
| `project_tag` | string | Yes | Kebab-case slug |
| `export_mode` | string | Yes | `"cortex"` or `"manual"` |
| `contains_linked` | boolean | Yes | Whether linked memories were traversed |
| `original_ids` | string[] | Yes | All memory IDs in this file (for cross-ref) |

### Additional Standard Fields

These fields from `REPORT-CONVENTION.md` are also included when applicable:

| Field | Value |
|-------|-------|
| `mode` | `"export"` or `"manual"` |
| `composite_score` | `null` (handoffs are not scored) |
| `previous_composite` | `null` |
| `score_delta` | `"---"` |
| `trend` | `"first_run"` |

## Body Format

```markdown
# Collab Handoff: {project_name}

**From:** {source_user}
**Date:** {date}
**Time Range:** {time_range}
**Memories:** {count}

---

## Memory 1: {brief title from first line of content}

**ID:** `{original_id}`
**Type:** {type} | **Importance:** {importance}/100 | **Created:** {created_at}
**Tags:** {comma-separated tags}

{full memory content}

### Linked Memories
- `{linked_id}` ({relationship_type}) -- {first 80 chars of linked memory}

---

## Memory 2: ...
```

### Title Generation

The `{brief title}` for each memory section heading is derived from the first line of the memory content, truncated to 60 characters at a word boundary.

### Linked Memory Format

Each linked memory entry shows:
- The original memory ID (backtick-wrapped)
- The relationship type in parentheses
- A preview of the linked memory's content (first 80 chars, truncated at word boundary)

If a memory has no linked memories, omit the "Linked Memories" subsection entirely.

## Manual Mode Differences

When `export_mode: "manual"`:
- `original_ids` contains a synthetic ID: `manual-{YYYY-MM-DD}-{random-4-hex}`
- `contains_linked` is always `false`
- Memory type is `"manual"` with importance `50`
- No linked memories section
- Single memory entry containing the user's freeform text

## Naming Convention

See `~/.claude/skills/REPORT-CONVENTION.md` for full convention.

- **Prefix:** `ch-`
- **Directory:** `handoffs/{username}/`
- **Pattern:** `ch-{NNN}-{YYYY-MM-DD}-{project-slug}-handoff.md`
- **Multi-file:** `ch-{NNN}-{YYYY-MM-DD}-{slug}-part-1.md`, `ch-{NNN+1}-...-part-2.md`

Numbering is scoped per `handoffs/{username}/` directory.
