# Output Format Templates

Reference file for consistent display formatting across all /memory subcommands.

## Inspect Output

```
## Memory: {id}

**Type:** {type} | **Status:** {status} | **Importance:** {importance}/100
**Created:** {relative_time} ({absolute_date})
**Last Accessed:** {relative_time}
**Versions:** {version_count} changes tracked

### Tags
{tag1}, {tag2}, {tag3}

### Content
{memory content — render as-is, do not double-wrap in markdown}

### Relationships
- [{relationship_type}] {target_id}: {first 80 chars of target content}...
```

If no relationships exist, omit the Relationships section entirely.
If version count is 0 or history returns empty, show "No version history (memory predates versioning)".

## Search Output

```
## Search Results: "{query}" ({count} matches)

| # | ID | Type | Tags | Imp | Preview |
|---|------|------|------|-----|---------|
| 1 | mem_abc | decision | tag1, tag2 | 85 | First 60 chars... |
| 2 | mem_def | context | tag3 | 70 | First 60 chars... |
```

Keep the table compact. Truncate tags to max 3 visible, append "+N" if more.
Truncate preview to 60 characters with "..." suffix.

## Global Search Output

```
## Global Search: "{query}" ({count} matches across {N} projects)

### Project: {project_path_1}
| # | ID | Type | Tags | Imp | Preview |
|---|------|------|------|-----|---------|
| 1 | mem_abc | decision | tag1 | 85 | First 60 chars... |

### Project: {project_path_2}
| # | ID | Type | Tags | Imp | Preview |
|---|------|------|------|-----|---------|
| 2 | mem_def | context | tag2 | 70 | First 60 chars... |
```

Group results under project headers. If all results are from one project, still show the header.
If no results found, suggest: "No results. Ensure `global_sync_enabled` is true in project configs, or run `cortex_sync_to_global` to sync."

## History Output

```
## Version History: {id}

**Current State** (v{N}) — {importance}/100
{first 3 lines of current content}...

### Timeline

| Version | Date | Changed By | Reason |
|---------|------|-----------|--------|
| v{N} (current) | {date} | — | — |
| v{N-1} | {date} | {changed_by} | {change_reason} |
| v{N-2} | {date} | {changed_by} | {change_reason} |

Full content diffs available via `/memory diff {id}`
```

If no versions exist, show: "No version history available. This memory was created before versioning was enabled (v2-03), or has never been modified."

## Diff Output

```
## Diff: {id}

### v{N-1} -> v{N} ({date}, by {changed_by})
Reason: {change_reason}

```diff
- removed line
+ added line
  unchanged context line
```

### v{N-2} -> v{N-1} ({date}, by {changed_by})
...
```

Use fenced diff blocks for syntax highlighting.
Show max 5 context lines around each change (skip large unchanged blocks with "... {N} unchanged lines ...").
If `--version N` is specified, show only that single version's diff.

## Edit Preview Output

```
### Proposed Changes to {id}

| Field | Current | New |
|-------|---------|-----|
| content | {first 60 chars}... | {first 60 chars of new}... |
| tags | tag1, tag2 | tag1, tag2, tag3 |
| importance | 70 | 85 |

Apply these changes?
```

Only show rows for fields that are being changed. Omit unchanged fields.

## Link Output

```
### Create Link?

Source: {source_id} ({type}: {first 40 chars}...)
Target: {target_id} ({type}: {first 40 chars}...)
Relationship: {relationship_type}

{source_id} --[{relationship_type}]--> {target_id}
```

## Prune Report Output

```
## Memory Hygiene Report

**Scope:** {project|global}
**Mode:** {preview|apply}
**Date:** {YYYY-MM-DD}

---

### Stale Memories (60+ days, low/no access)
| ID | Content Preview | Created | Last Access | Importance | Action |
|------|----------------|---------|-------------|------------|--------|
| mem_xxx | "Old handoff from..." | Jan 10 | Never | 25 | Archive |

### Orphaned Memories (no tags)
| ID | Content Preview | Created | Importance | Action |
|------|----------------|---------|------------|--------|
| mem_aaa | "Some context..." | Jan 15 | 50 | Needs Tags |

### Low-Value Memories (importance < 30, stale)
| ID | Content Preview | Created | Importance | Action |
|------|----------------|---------|------------|--------|
| mem_bbb | "Client switch..." | Jan 02 | 20 | Delete |

### Duplicate Handoffs (older superseded)
| Keep | Remove | Project | Reason |
|------|--------|---------|--------|
| mem_new | mem_old | Ralph | Newer handoff exists |

### Content Duplicates
| Survivor | Duplicate | Shared Content | Reason |
|----------|-----------|---------------|--------|
| mem_ccc | mem_ddd | "SCORM grading..." | Higher importance |

### Needs Review (flagged by system)
| ID | Content Preview | Created | Status | Action |
|------|----------------|---------|--------|--------|
| mem_eee | "Architecture..." | Feb 01 | needs_review | User Decision |

---

### Summary
- **Total reviewed:** {N} memories
- **Stale (archive):** {N}
- **Orphaned (needs tags):** {N}
- **Low-value (delete):** {N}
- **Duplicate handoffs (archive):** {N}
- **Content duplicates (delete + link):** {N}
- **Needs review:** {N}
- **Skipped (healthy):** {N}
```

Omit any category section where count is 0 (no candidates found). Always show Summary.
Mark memories with importance >= 80 with a shield indicator: "(protected)" next to the Action column.

## Review Output

```
## Memories Needing Review ({count} found)

### Freshness Decay System
- Decay: 0.5 points/day since last access
- Fresh -> Needs Review (30 days) -> Outdated (60 days)

| # | ID | Type | Importance | Last Accessed | Staleness | Preview |
|---|------|------|-----------|---------------|-----------|---------|
| 1 | mem_xxx | decision | 45 | 35 days ago | Needs Review | First 50 chars... |
| 2 | mem_yyy | context | 32 | 48 days ago | Needs Review | First 50 chars... |

Actions: mark_fresh | mark_outdated | mark_archived
```

## Audit Output

```
## Full Audit: {id}

### Identity
Type: {type} | Status: {status} | Importance: {importance}/100
Created: {date} | Last Accessed: {date} | Versions: {count}

### Tags
{tag1}, {tag2}, {tag3}

### Content
{full content — render as-is, do not double-wrap in markdown}

### Version Timeline
| Version | Date | Changed By | Reason |
|---------|------|-----------|--------|
| v{N} (current) | {date} | — | — |
| v{N-1} | {date} | {changed_by} | {change_reason} |

### Relationships ({count})
- [{relationship_type}] {target_id}: {first 80 chars of target}...

### Activity Profile
Access frequency: {high/medium/low} — based on access count vs age
Staleness: {fresh/aging/stale} — last accessed {N} days ago
Origin: {detected from tags — e.g., "Created by /handoff"}
```

If no relationships: "No relationships found. Use `/memory link {id} <target> [type]` to create one."
If no version history: "No version history. Memory predates versioning or has not been modified."
