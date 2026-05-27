# Export Command -- L1 + L2

Extract memories from Omni-Cortex, package into handoff files, stage for Git.

## Prerequisites

1. Get username: `git config user.name` -- normalize to lowercase kebab-case (e.g., "Tony Medina" -> "tony-medina")
2. If empty, use `AskUserQuestion` to ask for username
3. Determine repo root: `git rev-parse --show-toplevel`

## Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- **time-range**: First positional arg after `export`. Default `24h`.
- **--project**: Optional project path filter
- **--dest**: Optional output directory override
- **--no-cortex**: If present, skip to Non-Cortex Mode (Step 7)

## Step 2: Time-Range Resolution

Convert time-range argument to an ISO 8601 `since` timestamp.

**Numeric shorthand:**
- `Nh` -> N hours ago (e.g., `5h` -> 5 hours before now)
- `Nd` -> N days ago (e.g., `3d` -> 3 days before now)
- `Nw` -> N*7 days ago (e.g., `1w` -> 7 days before now)

**Natural language:**
- `"since Tuesday"` -> resolve to most recent Tuesday at 00:00 local time
- `"since YYYY-MM-DD"` -> parse as ISO date at 00:00

**Default:** `24h` if no range specified.

Use bash `date` command for computation:
```bash
# Example: 24 hours ago
date -u -d "24 hours ago" +%Y-%m-%dT%H:%M:%SZ
```

On Windows Git Bash, `date -d` works. Store result as `$SINCE_TIMESTAMP`.

## Step 3: Memory Extraction (L1)

Query Omni-Cortex for recent memories:

1. Call `cortex_list_memories` with:
   - `sort_by: "created_at"`
   - `sort_order: "desc"`
   - `limit: 100` (fetch in batches if needed)

2. **Post-query filter**: For each memory, compare `created_at` against `$SINCE_TIMESTAMP`. Keep only memories where `created_at >= $SINCE_TIMESTAMP`.

3. **Project filter** (if `--project` specified): Additionally filter memories whose content references the project path or whose tags match the project slug.

4. Include ALL memory types -- do not filter by type or tags at this stage.

## Step 4: Relationship Traversal

For each extracted memory:

1. Use `cortex_get_memory` with the memory ID to get full details including relationships
2. For each linked memory ID found, fetch it via `cortex_get_memory`
3. Follow links **ONE level deep only** -- do not recursively traverse
4. Add linked memories to the extraction set
5. **Deduplicate by ID** -- a memory may appear both in the time-range query and as a linked memory
6. Track relationship types between pairs: `related_to`, `supersedes`, `derived_from`, `contradicts`

## Step 5: Project Grouping

Group extracted memories by project:

1. Parse `project_path` from memory content -- look for path patterns like `D:\Clients\...`, `D:\Workshop\...`, `C:\Users\...`
2. Fall back to project-related tags if no path found (e.g., tag "surity" -> project "Surity")
3. Memories without a detectable project go into an **"unscoped"** group
4. Each group becomes a separate export file (or set of files)

## Step 6: Export Packaging (L2)

### 6a: Adaptive File Bundling

For each project group:
- Count total memories
- Estimate ~25 lines per memory (content + metadata + linked refs)
- Split logic:
  - 1-8 memories -> 1 file
  - 9-16 memories -> 2 files (split evenly)
  - 17-24 memories -> 3 files
  - 25+ -> `ceil(count / 8)` files
- Split at memory boundaries (never mid-memory)
- Sort memories chronologically (oldest first) within each file

### 6b: File Generation

For each output file, generate content per the format in `references/memory-format.md`:
- YAML frontmatter with all required fields
- Each memory rendered with ID, type, importance, tags, content, linked refs
- Original memory IDs preserved in frontmatter `original_ids` array and inline

### 6c: Convention Naming

Follow unified report convention (see `~/.claude/skills/REPORT-CONVENTION.md`):
- Prefix: `ch-`
- Directory: `handoffs/{username}/`
- Numbering: sequential per directory (glob `ch-*.md`, find max NNN, increment)
- Pattern: `ch-{NNN}-{YYYY-MM-DD}-{project-slug}-handoff.md`
- Multi-file split: `ch-{NNN}-{YYYY-MM-DD}-{slug}-part-1.md`, `ch-{NNN+1}-...-part-2.md`

### 6d: Output Directory

- Default: `{repo_root}/handoffs/{username}/`
- `--dest <path>` overrides repo root
- Create directory: `mkdir -p {output_dir}`
- Username from Step 0 (lowercase, hyphenated)

### 6e: Git Staging

1. Check for dirty working tree: `git status --porcelain`
   - If dirty, warn user: "Working tree has uncommitted changes. Proceed? (y/n)"
2. Write all handoff files to disk
3. Stage only newly created files: `git add handoffs/{username}/ch-*.md`
4. Display summary:
   ```
   Staged N files (M memories) for {project}.
   Review with: git diff --staged
   ```
5. Ask user: "Push now? (y/n)"
   - If yes: `git push`
   - If no: leave staged
   - **NEVER auto-push without explicit approval**

## Step 7: Non-Cortex Mode (`--no-cortex`)

When `--no-cortex` flag is present:

1. Skip Steps 3-5 entirely
2. Prompt user: "Describe what you worked on, decisions made, and what's next. (Paste or type your handoff notes)"
3. Accept freeform text via `AskUserQuestion`
4. Package into single handoff file using same format:
   - Set `export_mode: "manual"` in frontmatter
   - Set `contains_linked: false`
   - Generate synthetic ID: `manual-{YYYY-MM-DD}-{random-4-hex}`
   - No splitting needed (single file)
5. Follow Steps 6c-6e for naming, writing, and staging

## Output Summary

After completion, display:
```
## Collab Handoff Export Complete

**From:** {username}
**Time range:** {time_range}
**Memories exported:** {count}
**Files created:** {file_count}
**Location:** {output_dir}

Files:
- ch-{NNN}-{date}-{slug}.md ({N} memories)
- ...

Status: Staged for commit. Run `git diff --staged` to review.
```
