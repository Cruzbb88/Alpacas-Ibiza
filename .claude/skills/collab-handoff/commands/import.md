# Import Command -- L3 + L4

Parse handoff files from collaborators, detect conflicts with existing memories, and create new Cortex memories with full ID mapping and relationship preservation.

## Prerequisites

1. Get username: `git config user.name` -- normalize to lowercase kebab-case (e.g., "Tony Medina" -> "tony-medina")
2. If empty, use `AskUserQuestion` to ask for username
3. Determine repo root: `git rev-parse --show-toplevel` (or use `--project <path>` if provided)
4. Suggest: "Consider running `git pull` to get the latest handoff files before importing."

## Step 1: Parse Arguments

Extract from `$ARGUMENTS`:
- **--from <username>**: Optional. Filter to only import from this user's directory
- **--project <path>**: Optional. Override repo root for locating `handoffs/`
- **--analyze-conflicts**: Optional. Dry-run mode -- show conflict classifications without importing
- **--no-cortex**: Optional. Pretty-print handoff content without creating Cortex memories
- **--force**: Optional. Re-import files from `imported/` subdirectories too

## Step 2: Discover Pending Handoffs

1. Set `$HANDOFFS_DIR` to `{repo_root}/handoffs/`
2. If `--from <username>` is specified:
   - Only look in `{HANDOFFS_DIR}/{username}/`
3. Otherwise:
   - List all subdirectories in `{HANDOFFS_DIR}` (each = a collaborator)
   - Exclude the current user's own directory
4. In each target directory:
   - Glob for `ch-*.md` files
   - **Exclude** files inside `imported/` subdirectory (unless `--force` flag is set)
5. If no pending files found:
   - Display: "No pending handoffs found. Run `/collab-handoff status` for details."
   - Exit

## Step 3: Parse Handoff Files

For each discovered handoff file, parse its contents:

### 3a: Extract YAML Frontmatter

Read the file. The frontmatter is between the first `---` and the second `---`. Extract these fields:
- `report_type` -- should be `"collab-handoff"`
- `source_user` -- who exported this
- `time_range` -- original export time range
- `memory_count` -- number of memories in this file
- `project_name` -- human-readable project name
- `export_mode` -- `"cortex"` or `"manual"`
- `contains_linked` -- whether linked memories were included
- `original_ids` -- array of all memory IDs in the file

Validate `report_type == "collab-handoff"`. If not, skip the file with a warning.

### 3b: Parse Memory Sections

Parse the body (everything after frontmatter) into individual memory sections.

**For `export_mode: "cortex"` files:**

Each memory section starts with `## Memory N:` heading. For each section, extract:

1. **Title**: Text after `## Memory N:` on the heading line
2. **ID**: Line matching `**ID:** \`{id}\`` -- extract the backtick-wrapped ID
3. **Metadata line**: `**Type:** {type} | **Importance:** {importance}/100 | **Created:** {created_at}`
   - Extract type, importance (as integer), created_at
4. **Tags line**: `**Tags:** {comma-separated tags}` -- split by comma, trim whitespace
5. **Content**: Everything after the tags line until either:
   - `### Linked Memories` subsection, or
   - `---` separator, or
   - Next `## Memory` heading
6. **Linked Memories** (if `### Linked Memories` subsection exists):
   - Each line: `- \`{linked_id}\` ({relationship_type}) -- {preview}`
   - Extract `linked_id` and `relationship_type` for each

**For `export_mode: "manual"` files:**

Treat the entire body (after the header block) as a single memory:
- ID: from `original_ids[0]` in frontmatter
- Type: `"manual"`
- Importance: `50`
- Tags: any tags from frontmatter, or `["manual-handoff"]`
- Content: full body text
- No linked memories

Store all parsed memories in a list for processing.

## Step 4: Conflict Detection (L4)

**This step runs BEFORE any memories are created in Cortex.**

If `--no-cortex` flag is set, skip this entire step.

For each parsed incoming memory, run the 3-check pipeline:

### Check 1 -- Tag-Based Matching

1. From the incoming memory's tags, select the 2-3 most specific tags:
   - Exclude generic tags: `"imported"`, `"collab-handoff"`, `"manual-handoff"`, any tag starting with `"from-"`
   - Prefer tags that are project-specific, technology-specific, or decision-related
2. Call `cortex_list_memories` with `tags_filter` set to these specific tags
3. For each local result, count how many tags it shares with the incoming memory
4. If any local memory has **3 or more shared tags** with the incoming memory, mark it as a potential match and proceed to Check 2

If no potential matches found, classify as **SAFE** and skip remaining checks.

### Check 2 -- Content Similarity

For each potential match from Check 1:

1. Extract the first 200 characters of content from both the incoming memory and the local match
2. Tokenize both into keywords:
   - Lowercase, split on whitespace and punctuation
   - Remove stop words (a, an, the, is, are, was, were, to, for, in, on, of, and, or, but, with, that, this, it)
   - Remove words shorter than 3 characters
3. Compute keyword overlap score:
   ```
   shared_keywords = intersection(incoming_keywords, local_keywords)
   total_unique = union(incoming_keywords, local_keywords)
   similarity_score = (len(shared_keywords) / len(total_unique)) * 100
   ```
4. If `similarity_score > 60`, proceed to Check 3
5. If `similarity_score <= 30`, classify as **SAFE**
6. If `30 < similarity_score <= 60`, classify as **REVIEW**

### Check 3 -- Contradiction Detection

For potential matches with similarity > 60:

1. Define decision-language patterns:
   - `"decided to"`, `"chose"`, `"went with"`, `"using"`, `"switched to"`,
   - `"will use"`, `"picked"`, `"settled on"`, `"moving to"`, `"replacing"`,
   - `"instead of"`, `"rather than"`, `"not using"`, `"dropped"`, `"removed"`
2. Check if BOTH the incoming memory AND the local match contain at least one decision-language pattern
3. If both contain decision language AND they share 3+ tags (same topic area):
   - Classify as **CONFLICT**
4. If only one or neither contains decision language:
   - Classify as **REVIEW** (similar content but no detected contradiction)

### Classification Summary

| Condition | Classification |
|-----------|---------------|
| No local matches OR similarity < 30 | **SAFE** -- auto-import |
| Similarity 30-60 OR 3+ shared tags, no contradiction | **REVIEW** -- prompt user |
| Similarity > 60 AND both have decision language on same topic | **CONFLICT** -- require resolution |

Store the classification result for each incoming memory along with:
- The local match (if any): its ID, content preview, tags
- The classification reason (e.g., "4 shared tags: auth, decision, surity, api")
- The similarity score
- Shared tags list

## Step 5: Handle Dry-Run Mode

If `--analyze-conflicts` flag is set:

1. Display conflict analysis results:
   ```
   ## Conflict Analysis (Dry Run)

   File: {filename}
   Source: {source_user}

   | # | Memory ID | Classification | Reason | Score |
   |---|-----------|---------------|--------|-------|
   | 1 | mem_xxx   | SAFE          | No local matches | -- |
   | 2 | mem_yyy   | REVIEW        | 3 shared tags: auth, api, surity | 45 |
   | 3 | mem_zzz   | CONFLICT      | Decision contradiction on auth strategy | 72 |

   Summary: {N} SAFE, {M} REVIEW, {P} CONFLICT

   Dry run complete. Run `/collab-handoff import` to proceed with import.
   ```

2. Do NOT import anything. Exit after displaying results.

## Step 6: User Resolution for REVIEW/CONFLICT

For each memory classified as REVIEW or CONFLICT, present a comparison to the user:

```
### Potential {classification} Detected

| Aspect | Your Memory | Incoming Memory |
|--------|-------------|-----------------|
| ID     | {local_id}  | {original_id}   |
| Content| {first 100 chars of local} | {first 100 chars of incoming} |
| Date   | {local date} | {incoming date} |
| Tags   | {local tags} | {incoming tags} |

**Status:** {classification} -- {reason}

Options:
1. Accept incoming (supersedes your local memory)
2. Keep local (skip this incoming memory)
3. Keep both (import and link with 'contradicts' relationship)
4. Merge (provide your own merged version)
```

Use `AskUserQuestion` with this prompt and the 4 options.

Handle each response:

- **Option 1 (Accept incoming):**
  - Import the incoming memory (proceed to Step 7)
  - After import, call `cortex_link_memories` with `source_id: {new_local_id}`, `target_id: {existing_local_id}`, `relationship_type: "supersedes"`
  - Record resolution as "accepted-incoming"

- **Option 2 (Keep local):**
  - Skip this memory entirely -- do not import
  - Record resolution as "kept-local" in the import summary

- **Option 3 (Keep both):**
  - Import the incoming memory (proceed to Step 7)
  - After import, call `cortex_link_memories` with `source_id: {new_local_id}`, `target_id: {existing_local_id}`, `relationship_type: "contradicts"`
  - Record resolution as "kept-both"

- **Option 4 (Merge):**
  - Use `AskUserQuestion` to prompt: "Provide your merged version of these two memories:"
  - Create a single memory with the user's merged content via `cortex_remember`
  - Call `cortex_link_memories` from the merged memory to both the local and incoming originals with `relationship_type: "derived_from"`
  - Record resolution as "merged"

## Step 7: Create Cortex Memories (L3)

If `--no-cortex` flag is set, skip to Step 7x (Non-Cortex Mode).

For each memory classified as **SAFE**, or resolved by the user (Option 1, 3, or 4):

1. Call `cortex_remember` with:
   - `content`: Prefix the original content:
     ```
     [Imported from {source_user} -- original ID: {original_id}]

     {original_content}
     ```
   - `tags`: Combine original tags with import metadata:
     ```
     original_tags + ["imported", "collab-handoff", "from-{source_user}"]
     ```
     Where `{source_user}` is lowercase kebab-case (e.g., `"from-tony-medina"`)
   - `importance`: Same as the original memory's importance value

2. Capture the new local memory ID from the `cortex_remember` response

3. Store the mapping: `{original_id} -> {new_local_id}` for later use

### Step 7x: Non-Cortex Mode (`--no-cortex`)

When `--no-cortex` is set, skip all Cortex operations. Instead, pretty-print the handoff content:

```
## Collab Handoff Import (Read-Only Mode)

**From:** {source_user}
**File:** {filename}
**Date:** {date}
**Project:** {project_name}
**Memories:** {memory_count}

---

### Memory 1: {title}
**Type:** {type} | **Importance:** {importance}/100
**Tags:** {tags}

{content}

---

### Memory 2: {title}
...
```

Display all memories from all pending files in this readable format. Do not move files to `imported/` since nothing was actually imported.

End with: "Displayed {N} memories from {M} files. To import into Cortex, run without `--no-cortex`."

## Step 8: Preserve Relationships

After ALL memories in a single handoff file have been imported:

1. For each imported memory that had entries in its `### Linked Memories` section:
   - Get the `linked_id` and `relationship_type` from the parsed data
   - Look up `linked_id` in the ID mapping built during Step 7:
     - If the linked memory was also imported in this session (has a `new_local_id`), call `cortex_link_memories`:
       - `source_id`: the current memory's `new_local_id`
       - `target_id`: the linked memory's `new_local_id`
       - `relationship_type`: same as the original (e.g., `"related_to"`, `"supersedes"`, `"derived_from"`, `"contradicts"`)
     - If the linked memory was NOT imported (its `original_id` is not in the mapping), skip the link and note it in the summary: "Skipped link to {linked_id} (not in import set)"

2. Also create any resolution-related links from Step 6 (supersedes, contradicts, derived_from) if not already created.

## Step 9: Update ID Mapping File

After each handoff file is fully processed:

1. Set mapping file path: `{HANDOFFS_DIR}/{source_user}/imported/.id-mapping.json`
2. Create the `imported/` directory if it does not exist: `mkdir -p {path}`
3. Read existing `.id-mapping.json` if it exists, otherwise start with:
   ```json
   {
     "mappings": [],
     "last_updated": ""
   }
   ```
4. For each imported memory, append to the `mappings` array:
   ```json
   {
     "original_id": "{original_id}",
     "local_id": "{new_local_id}",
     "source_user": "{source_user}",
     "imported_at": "{ISO 8601 timestamp}",
     "source_file": "{filename without path}"
   }
   ```
5. Update `last_updated` to current ISO 8601 timestamp
6. Write the file back. See `references/id-mapping-format.md` for the full schema.

## Step 10: Mark Files as Processed

After successful import of a handoff file (all memories created, links established, mapping updated):

1. Move the processed file to the `imported/` subdirectory:
   ```bash
   mv "{HANDOFFS_DIR}/{source_user}/{filename}" "{HANDOFFS_DIR}/{source_user}/imported/{filename}"
   ```
2. This prevents re-import on subsequent runs
3. The `imported/` directory was already created in Step 9

If `--force` flag was used and a file was re-imported from `imported/`:
- The file is already in `imported/`, so no move is needed
- Update the ID mapping with new entries (append, do not overwrite existing mappings)

## Step 11: Import Summary

After processing all files, display:

```
## Collab Handoff Import Complete

**From:** {source_user}
**Files processed:** {file_count}
**Memories imported:** {total_imported}
  - SAFE (auto-imported): {safe_count}
  - REVIEW (user-resolved): {review_count}
  - CONFLICT (user-resolved): {conflict_count}
  - Skipped (kept local): {skipped_count}

**ID mappings saved to:** handoffs/{source_user}/imported/.id-mapping.json
**Relationships preserved:** {link_count}
**Skipped links:** {skipped_links} (targets not in import set)

### New Memory IDs

| Original ID | Local ID | Resolution |
|-------------|----------|------------|
| mem_remote_xxx | mem_local_xxx | SAFE |
| mem_remote_yyy | mem_local_yyy | accepted-incoming |
| mem_remote_zzz | -- | kept-local |
```

If multiple source users were processed, repeat the summary block for each user.

## Error Handling

- **File parse error**: If a handoff file cannot be parsed (malformed YAML, missing required fields), skip it with a warning and continue with remaining files
- **Cortex API error**: If `cortex_remember` fails for a specific memory, log the error, skip that memory, and continue. Do NOT move the source file to `imported/` if any memory in it failed
- **Partial import**: If some memories in a file succeed and others fail, report which ones failed and leave the source file in place (not moved to `imported/`) so the user can retry
- **Empty handoff file**: If a file has frontmatter but no memory sections, warn and skip
