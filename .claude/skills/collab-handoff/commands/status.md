# Status Command -- Pending Handoff Overview

Scan the `handoffs/` directory and display a summary of pending handoff files awaiting import, grouped by collaborator.

## Prerequisites

1. Determine repo root: `git rev-parse --show-toplevel` (or use `--project <path>` if provided)
2. Set `$HANDOFFS_DIR` to `{repo_root}/handoffs/`
3. If `handoffs/` directory does not exist: "No handoffs directory found. Nothing to report."

## Step 1: Scan User Directories

1. List all subdirectories in `{HANDOFFS_DIR}` -- each one represents a collaborator
2. For each user directory, count:
   - **Pending files**: `ch-*.md` files directly in the user directory (NOT in `imported/`)
   - **Imported files**: `ch-*.md` files in the `imported/` subdirectory

## Step 2: Read Frontmatter for Pending Files

For each pending handoff file:

1. Read the YAML frontmatter (between first `---` and second `---`)
2. Extract:
   - `memory_count` -- number of memories in this file
   - `date` -- export date
   - `project_name` -- project this handoff covers
   - `source_user` -- who exported it
   - `export_mode` -- "cortex" or "manual"

## Step 3: Check Last Import

1. For each user directory, check if `imported/.id-mapping.json` exists
2. If it exists, read `last_updated` for the most recent import timestamp
3. Count total mappings to get the number of previously imported memories

## Step 4: Display Summary

```
## Pending Collab Handoffs

### From {username}/ ({pending_count} files, {total_memories} memories):

| File | Date | Project | Memories | Mode |
|------|------|---------|----------|------|
| ch-001-2026-02-17-surity-handoff.md | 2026-02-17 | Surity Project | 8 | cortex |
| ch-002-2026-02-17-workshop-handoff.md | 2026-02-17 | Workshop | 5 | cortex |

### From {other_user}/ (0 files):
All caught up!

---

**Last import:** {date} from {user} ({count} memories)
**Total previously imported:** {total_mappings} memories across all users

To import: `/collab-handoff import`
To import from a specific user: `/collab-handoff import --from {username}`
To preview conflicts first: `/collab-handoff import --analyze-conflicts`
```

### Edge Cases

- **No user directories**: "No collaborator directories found in `handoffs/`. Handoff files appear when a collaborator runs `/collab-handoff export` and pushes."
- **All files imported**: Show the user directory with "All caught up!" and the last import date
- **No imported/ directory**: User has never imported -- show pending count only, skip "Last import" line
- **Mixed states**: Some users have pending files, others are all caught up -- show both
