# /memory — Unified Memory Command

## Variables

ARGUMENTS: $ARGUMENTS

## Argument Router

Parse `ARGUMENTS` to determine which subcommand to execute.

### Step 1: Parse First Token

Extract the first token from ARGUMENTS (split on whitespace). Set REMAINING to everything after the first token.

**Routing rules (check in order):**

1. **Empty or "help"** → Go to [Help Display](#help-display)
2. **Starts with `mem_` and contains underscore + hex pattern** → Auto-route to [Inspect](#l1-inspect) with the token as memory ID (user typed `/memory mem_12345` without "inspect")
3. **"inspect"** → Go to [Inspect](#l1-inspect) with REMAINING as memory ID
4. **"search"** → Check if REMAINING contains `--global` flag:
   - If yes: strip `--global`, go to [Global Search](#l1-global-search) with cleaned REMAINING
   - If no: go to [Search](#l1-search) with REMAINING
5. **"history"** → Go to [History](#l2-history) with REMAINING as memory ID + optional flags
6. **"diff"** → Go to [Diff](#l2-diff) with REMAINING as memory ID + optional flags
7. **"edit"** → Go to [Edit](#l3-edit) with REMAINING as memory ID
8. **"link"** → Go to [Link](#l3-link) with REMAINING as source_id target_id [type]
9. **"prune"** → Go to [Prune](#l3-prune) with REMAINING as mode + scope
10. **"review"** → Go to [Review](#l3-review) with REMAINING as optional action + IDs
11. **"audit"** → Go to [Audit](#l4-audit) with REMAINING as memory ID
12. **Anything else** → Show: "Unknown subcommand: `{token}`. Run `/memory help` for available commands."

---

## Help Display

Show this reference table:

```
## /memory — Unified Memory Management

| Command | Description |
|---------|-------------|
| `/memory inspect <id>` | View full memory details, metadata, version count |
| `/memory <id>` | Shortcut for inspect (auto-detects mem_ IDs) |
| `/memory search <query>` | Keyword search with optional filters |
| `/memory search --global <query>` | Cross-project search grouped by project |
| `/memory history <id>` | Version timeline with timestamps and changes |
| `/memory diff <id>` | Line-by-line content diffs between versions |
| `/memory edit <id>` | Edit memory content, tags, importance with confirmation |
| `/memory link <src> <tgt> [type]` | Create relationships (related_to, supersedes, derived_from, contradicts) |
| `/memory prune [preview\|apply] [scope]` | 6-category memory hygiene scan with safety rules |
| `/memory review [action] [ids]` | Review memory freshness and manage staleness |
| `/memory audit <id>` | Full lifecycle audit (inspect + history + relationships + activity) |

**Filters** (for search): `--type <type>`, `--tags <tag1,tag2>`, `--limit N`
**Filters** (for history/diff): `--limit N`, `--version N` (diff only)
```

Stop after displaying help. Do not execute anything else.

---

## L1: Inspect

**Input:** Memory ID from ARGUMENTS (required).

### Validation

- If no memory ID provided: show "Usage: `/memory inspect <id>` — provide a memory ID starting with `mem_`"
- If ID does not start with `mem_`: show "Expected a memory ID starting with `mem_`. Got: `{id}`. Usage: `/memory inspect mem_12345`"

### Execution

1. **Call `cortex_get_memory`** with the memory ID. If it returns an error or "not found":
   - Show: "Memory `{id}` not found. It may belong to another project. Try `/memory search --global {id}`"
   - Stop.

2. **Call `cortex_get_memory_history`** with `memory_id: {id}`, `include_content: false`, `limit: 1`.
   - Extract version count from the response. If empty or error, version_count = 0.

3. **Display using Inspect format** (read `references/output-formats.md` for template):

Parse the cortex_get_memory response to extract these fields:
- **id**: The memory ID
- **type**: Memory type (in square brackets in the header, e.g., `[decision]`)
- **content**: The main body text
- **tags**: Listed after `**Tags:**`
- **importance**: Listed after `**Importance:**`
- **status**: Listed after `**Status:**`
- **created**: Listed after `**Created:**`
- **last_accessed**: Listed after `**Last accessed:**`
- **relationships**: Listed under `**Related:**` section

Render the Inspect Output format with all extracted fields. Include version count from step 2.

If the `**Related:**` section exists and has entries, show each relationship. Otherwise omit the Relationships section.

---

## L1: Search

**Input:** Query string from ARGUMENTS after "search" keyword.

### Parse Filters

Extract optional flags from the query string before passing to the MCP tool:
- `--type <type>` → set `type_filter`
- `--tags <tag1,tag2>` → split by comma, set `tags_filter` array
- `--limit N` → set `limit` (default: 10, max: 50)
- `--mode <keyword|semantic|hybrid>` → set `search_mode` (default: "keyword")

The remaining text after removing flags is the actual query.

### Validation

- If query is empty after removing flags: show "Usage: `/memory search <query>` — provide a search term"

### Execution

1. **Call `cortex_recall`** with:
   - `query`: the cleaned query text
   - `type_filter`: if --type was provided
   - `tags_filter`: if --tags was provided
   - `limit`: from --limit or default 10
   - `search_mode`: from --mode or default "keyword"

2. **Parse the response** to extract individual memory entries. Each entry typically has:
   - ID (in header like `## [type] mem_xxx`)
   - Type (in brackets)
   - Content preview (first ~60 chars of the body)
   - Tags (after `**Tags:**`)
   - Importance (after `**Importance:**`)

3. **Display as compact table** (read `references/output-formats.md` for template):
   - Number each result
   - Truncate tags to max 3 visible, show "+N" if more
   - Truncate content preview to 60 chars with "..." suffix
   - Show total match count in header

If no results found: show "No memories found for `{query}`. Try broader terms or check `/memory search --global {query}` for cross-project results."

---

## L1: Global Search

**Input:** Query string from ARGUMENTS after removing "search" and "--global".

### Parse Filters

Same filters as local search, plus:
- `--project <path-substring>` → set `project_filter`

### Validation

- If query is empty: show "Usage: `/memory search --global <query>` — provide a search term for cross-project search"

### Execution

1. **Call `cortex_global_search`** with:
   - `query`: the cleaned query text
   - `type_filter`: if --type was provided
   - `tags_filter`: if --tags was provided
   - `limit`: from --limit or default 20
   - `project_filter`: if --project was provided

2. **Parse and group results by project path.** Each global search result includes a project path.

3. **Display using Global Search format** (read `references/output-formats.md`):
   - Group results under project headers
   - Number results sequentially across all projects
   - Show total count and project count in header

If no results found: show "No results found across projects. Ensure `global_sync_enabled` is true in project configs, or run `cortex_sync_to_global` to sync project memories to the global index."

---

## L2: History

**Input:** Memory ID from ARGUMENTS after "history" keyword, plus optional flags.

### Parse Flags

- `--limit N` → set version limit (default: 20, max: 50)

The first non-flag token is the memory ID.

### Validation

- If no memory ID: show "Usage: `/memory history <id>` — provide a memory ID"
- If ID does not start with `mem_`: show "Expected a memory ID starting with `mem_`."

### Execution

1. **Call `cortex_get_memory`** with the memory ID to get current state.
   - If not found: show "Memory `{id}` not found." and stop.

2. **Call `cortex_get_memory_history`** with:
   - `memory_id`: the ID
   - `include_content`: true
   - `limit`: from --limit or default 20

3. **Parse the history response.** It returns version entries with:
   - `version_number`
   - `created_at` (timestamp of the version snapshot)
   - `changed_by` (who/what triggered the change: user, dedup_merge, conflict_resolve)
   - `change_reason` (text description of why)
   - `content` (the content at that point in time)

4. **Display using History format** (read `references/output-formats.md`):
   - Current state at the top with first 3 lines of content
   - Timeline table in reverse chronological order
   - Each row: version number, date, changed_by, reason
   - Footer pointing to `/memory diff {id}` for full content diffs

If history is empty (no versions returned): show "No version history available. This memory was created before versioning was enabled (v2-03), or has never been modified since versioning was added."

---

## L2: Diff

**Input:** Memory ID from ARGUMENTS after "diff" keyword, plus optional flags.

### Parse Flags

- `--version N` → show diff for only version N (instead of all versions)
- `--limit N` → max versions to diff (default: 10)

The first non-flag token is the memory ID.

### Validation

- If no memory ID: show "Usage: `/memory diff <id>` — provide a memory ID"
- If ID does not start with `mem_`: show "Expected a memory ID starting with `mem_`."

### Execution

1. **Call `cortex_get_memory`** to get current state content.
   - If not found: show error and stop.

2. **Call `cortex_get_memory_history`** with:
   - `memory_id`: the ID
   - `include_content`: true
   - `limit`: from --version (if single) or --limit or default 10

3. **Build version chain.** Arrange versions in chronological order (oldest first). Append current state as the latest entry.

4. **Compute diffs between consecutive pairs:**

   For each pair (version_old, version_new):
   a. Split both contents by newline into arrays
   b. Compare line by line:
      - Lines present in old but not new → prefix with `- ` (removed)
      - Lines present in new but not old → prefix with `+ ` (added)
      - Lines present in both → prefix with `  ` (context)
   c. Collapse large unchanged sections (>5 consecutive unchanged lines) into "... {N} unchanged lines ..."

   **Diff algorithm:** Simple line-based comparison. For each pair of consecutive versions:
   - Create two sets of lines (old_lines, new_lines)
   - Walk through both arrays simultaneously
   - Use longest common subsequence (LCS) approach: find matching lines to anchor the diff, then mark insertions and deletions around them
   - If content is short (<30 lines), show full context (no collapsing)

5. **If `--version N` specified:** Only show the diff for version N (compare version N-1 to version N, or version N to current if it's the latest).

6. **Display using Diff format** (read `references/output-formats.md`):
   - Each version transition gets a header with version numbers, date, changed_by, reason
   - Diff content in fenced diff block for syntax highlighting
   - Most recent transition shown first (reverse chronological)

If no versions exist: show "No version history available for diffing. The memory has not been modified since versioning was enabled."

If only 1 version exists: show "Only one version recorded. This represents the state before the most recent edit. Current content is the live state."

---

## L3: Edit

**Input:** Memory ID from ARGUMENTS after "edit" keyword (required).

### Validation

- If no memory ID: show "Usage: `/memory edit <id>` — provide a memory ID to edit"
- If ID does not start with `mem_`: show "Expected a memory ID starting with `mem_`."

### Execution

1. **Call `cortex_get_memory`** with the memory ID.
   - If not found: show "Memory `{id}` not found." and stop.

2. **Display current state** using the Inspect format (same as L1 inspect output — read `references/output-formats.md`).

3. **Ask user what to change** using `AskUserQuestion`:
   - Offer options: "Edit content", "Modify tags", "Change importance", "Change status", "Multiple changes"
   - User can also provide free-text description of changes

4. **Build the update based on user response:**
   - **Content edit:** Show current content, accept replacement text from user
   - **Tag operations:** Support add-tags and remove-tags:
     - Parse `--add-tags tag1,tag2` and `--remove-tags tag3` from user input
     - Or accept interactive tag selection
   - **Importance:** Accept new integer 1-100
   - **Status:** Accept "fresh", "outdated", "archived"

5. **Show preview of proposed changes:**
   ```
   ### Proposed Changes to {id}

   | Field | Current | New |
   |-------|---------|-----|
   | content | {first 60 chars}... | {first 60 chars of new}... |
   | tags | tag1, tag2 | tag1, tag2, tag3 |
   | importance | 70 | 85 |
   ```

6. **Confirm with user** via `AskUserQuestion`:
   - "Apply these changes to `{id}`?"
   - Options: "Yes, apply", "No, cancel", "Edit again"

7. **If confirmed:** Call `cortex_update_memory` with:
   - `id`: the memory ID
   - `content`: new content (if changed)
   - `add_tags`: tags to add (if any)
   - `remove_tags`: tags to remove (if any)
   - `importance`: new value (if changed)
   - `status`: new value (if changed)
   - `change_reason`: "Edited via /memory edit" + user's description of why (if provided)

8. **Show result:** "Memory `{id}` updated successfully. Run `/memory inspect {id}` to verify, or `/memory history {id}` to see the version."

---

## L3: Link

**Input:** REMAINING parsed as `<source_id> <target_id> [relationship_type]`

### Parse Arguments

Split REMAINING by whitespace:
- Token 1: `source_id` (memory ID)
- Token 2: `target_id` (memory ID)
- Token 3 (optional): `relationship_type` — one of: `related_to` (default), `supersedes`, `derived_from`, `contradicts`

### Validation

- Valid relationship types: `related_to`, `supersedes`, `derived_from`, `contradicts`
- If an invalid type is provided: show "Invalid relationship type: `{type}`. Valid types: related_to, supersedes, derived_from, contradicts"

### Interactive Mode (no arguments)

If no arguments provided:
1. **Call `cortex_list_memories`** with `sort_by: "last_accessed"`, `sort_order: "desc"`, `limit: 5`
2. **Display recent memories:**
   ```
   ## Recent Memories

   | # | ID | Type | Preview |
   |---|------|------|---------|
   | 1 | mem_abc | decision | First 60 chars... |
   | 2 | mem_def | context | First 60 chars... |
   ...
   ```
3. **Ask user** via `AskUserQuestion` to pick source and target IDs
4. **Ask for relationship type** via `AskUserQuestion`:
   - Options: "related_to (general association)", "supersedes (replaces older)", "derived_from (based on older)", "contradicts (conflicting info)"

### Execution (with arguments or after interactive selection)

1. **Verify both memories exist:** Call `cortex_get_memory` for both source and target.
   - If either not found: show "Memory `{id}` not found." and stop.

2. **Show confirmation:**
   ```
   ### Create Link?

   Source: {source_id} ({type}: {first 40 chars}...)
   Target: {target_id} ({type}: {first 40 chars}...)
   Relationship: {relationship_type}

   {source_id} --[{relationship_type}]--> {target_id}
   ```

3. **Confirm with user** via `AskUserQuestion`: "Create this link?"
   - Options: "Yes, create link", "No, cancel"

4. **If confirmed:** Call `cortex_link_memories` with:
   - `source_id`: source memory ID
   - `target_id`: target memory ID
   - `relationship_type`: the type
   - `strength`: 1.0

5. **Show result:** "Link created: `{source_id}` --[{relationship_type}]--> `{target_id}`"

---

## L3: Prune

**Input:** REMAINING parsed as `[mode] [scope]`

### Parse Arguments

1. **Mode** (first word):
   - `preview` (default if omitted) — List what would be pruned without making changes
   - `apply` — Actually archive/delete/link memories

2. **Scope** (second word):
   - `project` (default if omitted) — Only memories in the current project
   - `global` — All memories across all projects
   - `all` — Alias for `global`

### Execution

#### Step 1: Collect Stale Memories (60+ days, never accessed)

Call `cortex_review_memories` with `action: "list"`, `days_threshold: 60`.

Record each memory's ID, content preview (first 80 chars), created date, last access date, importance, tags. Mark as **candidates for archiving**.

#### Step 2: Collect Orphaned Memories (no tags)

Call `cortex_list_memories` with `sort_by: "created_at"`, `sort_order: "asc"`, `limit: 50`.

Filter results for memories where tags are empty or null. If scope is `global`, also call `cortex_global_search` with `query: "*"`, `limit: 50` and filter for tagless entries.

Mark as **candidates for tagging or archiving**.

#### Step 3: Collect Low-Value Memories

Call `cortex_list_memories` with `sort_by: "importance_score"`, `sort_order: "asc"`, `limit: 30`.

Filter for memories where importance < 30 AND last accessed > 30 days ago (or never).

Mark as **candidates for deletion**.

#### Step 4: Collect Duplicate Handoffs

Call `cortex_list_memories` with `tags_filter: ["handoff", "session-summary"]`, `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 20`.

Group handoffs by project. For each project, keep only the most recent handoff. Mark older handoffs as **candidates for archiving**. Exception: handoffs with importance >= 95 are kept regardless.

#### Step 5: Collect Memories Needing Review

Call `cortex_review_memories` with `action: "list"`, `days_threshold: 30`.

Filter for memories with status "needs_review". Mark as **candidates for review** (display only, no auto-action).

#### Step 6: Find Content Duplicates

Call `cortex_list_memories` with `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 50`.

Compare pairwise: if two memories share the same first 50 characters of content, they are duplicates. Determine **survivor**: higher importance > more tags > more recent. Mark the other as **candidate for deletion** with a supersedes link planned.

#### Step 7: Generate Report

Display using the Prune Report format (read `references/output-formats.md`):
- Section per category with table of candidates
- Summary totals at the bottom
- Safety indicators for high-importance memories

#### Step 8: Execute Actions (Apply Mode Only)

**ONLY if mode is `apply`:**

For EACH category, confirm separately via `AskUserQuestion` before executing:
- "Archive {N} stale memories?" → Options: "Yes, archive all", "Skip this category", "Review individually"
- "Delete {N} low-value memories?" → Same pattern
- "Archive {N} duplicate handoffs?" → Same pattern
- "Delete {N} content duplicates and create supersedes links?" → Same pattern

**Safety rules (CRITICAL — never bypass):**
- Memories with importance >= 80: NEVER auto-deleted (only archived if stale)
- Handoffs with importance >= 95: NEVER pruned
- `needs_review` memories: reported but NEVER auto-actioned
- Orphaned memories: reported but not automatically deleted (user should add tags)
- When in doubt, archive rather than delete (archived memories can be restored)

Execute confirmed actions:
1. **Archive:** `cortex_update_memory` with `status: "archived"`
2. **Delete:** `cortex_forget` (link BEFORE delete for duplicates)
3. **Link:** `cortex_link_memories` with `relationship_type: "supersedes"` (create before deleting duplicate)

Show each action as it executes:
```
Applied: Archived mem_xxx (stale, 65 days old)
Applied: Linked mem_ccc -> mem_ddd (supersedes)
Applied: Deleted mem_ddd (duplicate of mem_ccc)
Skipped: mem_eee (needs user review)
```

#### Step 9: Store Hygiene Report

Call `cortex_remember` with:
- Content: "Memory Hygiene Run - {date}. Scope: {scope}. Mode: {mode}. Reviewed: {N}. Archived: {N}. Deleted: {N}. Linked: {N}. Skipped: {N}."
- Tags: `["memory-prune", "hygiene", "maintenance"]`
- Importance: 40

#### Step 10: Recommendations

```
### Recommendations

1. **Orphaned memories** ({N} found): Run `/memory review` to add tags
2. **Needs-review** ({N} found): Review manually and decide to keep or archive
3. **Stale handoffs**: Consider running `/handoff` more frequently
4. **Next prune**: Schedule in ~30 days
```

---

## L3: Review

**Input:** REMAINING parsed as optional `[action] [id1 id2 ...]`

### Parse Arguments

- No args or "list": List memories needing review (default)
- `fresh <id> [id2...]`: Mark specified memories as fresh
- `outdated <id> [id2...]`: Mark as outdated
- `archive <id> [id2...]`: Archive specified memories

### List Mode (default)

1. **Call `cortex_review_memories`** with `action: "list"`, `days_threshold: 30`, `limit: 20`.

2. **Display using Review format** (read `references/output-formats.md`):
   - Each memory with staleness info
   - Decay calculation: 0.5 points/day since last access, access boost for frequently used
   - Status transitions: Fresh -> Needs Review (30 days) -> Outdated (60 days)

3. **Interactive workflow** via `AskUserQuestion`:
   - For each memory shown, offer: "Mark fresh", "Mark outdated", "Archive", "Skip"
   - Collect all decisions before executing

4. **Confirm batch actions:** Show summary of all planned changes, confirm before executing.

5. **Execute:** Call `cortex_review_memories` with the appropriate action and memory_ids array.

### Direct Action Mode (fresh/outdated/archive + IDs)

1. **Parse memory IDs** from remaining arguments.

2. **Show what will be changed:**
   ```
   ### Mark as {action}: {N} memories
   - {id1}: {preview}...
   - {id2}: {preview}...
   ```

3. **Confirm with user** via `AskUserQuestion`: "Apply {action} to {N} memories?"

4. **Execute:** Call `cortex_review_memories` with:
   - `action`: "mark_fresh" | "mark_outdated" | "mark_archived"
   - `memory_ids`: array of IDs

5. **Show result:** "Updated {N} memories to {status}."

---

## L4: Audit

**Input:** Memory ID from ARGUMENTS after "audit" keyword (required).

### Validation

- If no memory ID: show "Usage: `/memory audit <id>` — provide a memory ID for full lifecycle audit"
- If ID does not start with `mem_`: show "Expected a memory ID starting with `mem_`."

### Execution

1. **Call `cortex_get_memory`** with the memory ID.
   - If not found: show "Memory `{id}` not found." and stop.
   - Extract: type, status, importance, created date, last accessed, content, tags, relationships.

2. **Call `cortex_get_memory_history`** with `memory_id: {id}`, `include_content: true`.
   - Extract: version count, version list with dates, changed_by, change_reasons.

3. **For each relationship** found in step 1:
   - Call `cortex_get_memory` on the target ID to get a brief preview (first 80 chars).
   - Collect: target_id, relationship_type, target preview.

4. **Compute activity profile:**
   - Access frequency: Compare access count to age in days. High (>1 access/day avg), Medium (>1/week), Low (<1/week).
   - Staleness: Fresh (<30 days since access), Aging (30-60 days), Stale (>60 days).
   - Origin: Detect from tags — "handoff" → "Created by /handoff", "brainstorm" → "Created by /brainstorm", etc.

5. **Display using Audit format** (read `references/output-formats.md`):

```
## Full Audit: {id}

### Identity
Type: {type} | Status: {status} | Importance: {importance}/100
Created: {date} | Last Accessed: {date} | Versions: {count}

### Tags
{tag list}

### Content
{full content — render as-is}

### Version Timeline
{reuse L2 history format — table with version, date, changed_by, reason}
{if versions exist, show inline diffs between consecutive versions}

### Relationships ({count})
- [{relationship_type}] {target_id}: {first 80 chars of target}...
- [{relationship_type}] {target_id}: {first 80 chars of target}...

### Activity Profile
Access frequency: {high/medium/low} — based on access count vs age
Staleness: {fresh/aging/stale} — last accessed {N} days ago
Origin: {detected from tags}
```

If no relationships exist, show "No relationships found. Use `/memory link {id} <target> [type]` to create one."
If no version history, show "No version history. Memory predates versioning or has not been modified."
