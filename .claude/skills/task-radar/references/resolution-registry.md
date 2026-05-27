# Resolution Registry Reference

The resolution registry is a persistent YAML file that tracks resolved items across task radar runs,
preventing "zombie items" (tasks resolved in one report that reappear in later reports).

## Location

`reports/task-radar/.resolution-registry.yaml` (per-project, checked into git)

## Schema

```yaml
# Auto-maintained by /task-radar skill. Manual edits are safe but optional.
version: "1.0"

resolved_items:
  - title: "Original item title"
    canonical: "lowercase stripped title for fuzzy matching"
    resolved_in: "rd-NNN"
    resolved_date: "YYYY-MM-DD"
    evidence: "Brief description of resolution evidence"
    permanent: true   # true = never re-add; false = re-add if new evidence found
    cortex_id: "mem_xxx"  # optional: Cortex memory ID to archive

processed_sources:
  transcripts: []      # File paths of already-mined transcripts (JSONL + user-saved)
  handoff_ids: []      # Cortex memory IDs of already-processed handoffs
  cortex_memory_ids: [] # Cortex memory IDs already surfaced and resolved
```

## How It Works

### On every task radar scan (L1-L4):

1. **Step 0.5: Load Registry** -- Read `.resolution-registry.yaml` into `$RESOLVED_REGISTRY`
2. **Source scanning** -- Before adding any item, fuzzy-match its title against `resolved_items` (>75% similarity via `difflib.SequenceMatcher`)
   - If `permanent: true` match: **SKIP** the item entirely
   - If `permanent: false` match: **flag** as `[PREVIOUSLY RESOLVED]`, require new evidence to re-add
3. **Transcript mining** -- Skip transcripts listed in `processed_sources.transcripts`
4. **Handoff scanning** -- Skip handoff IDs listed in `processed_sources.handoff_ids`

### After report generation:

1. Read the new report's "Resolved" and "Completed" sections
2. For each resolved item:
   - Normalize title to canonical form
   - Add to `resolved_items` if not already present
   - Set `permanent: true` for definitive resolutions (spec in done/, commit exists, DB verified)
   - Set `permanent: false` for soft resolutions (reclassified, deferred)
3. If the resolved item has a Cortex memory source:
   - Run `cortex update <id> --tags <existing>,resolved` to prevent re-surfacing
4. Add newly processed transcript paths and handoff IDs to `processed_sources`
5. Write updated `.resolution-registry.yaml`

## Fuzzy Matching

Uses `difflib.SequenceMatcher` (Python stdlib). Canonical form:
- Lowercase
- Strip markdown formatting (`**`, `~~`, `[NOTED]`, `[NEW]`, etc.)
- Strip leading numbers and punctuation
- Collapse whitespace

Match threshold: **75% similarity** (SequenceMatcher.ratio() >= 0.75)

## User Transcript Tracking (Agent 3b)

The `processed_sources.transcripts` list tracks BOTH Claude Code JSONL transcripts (mined by Agent 3) AND user-saved transcript files from `Docs/Transcripts/` (mined by Agent 3b).

### User Transcript Entries

User transcript paths are stored as relative paths from the project root:
```yaml
processed_sources:
  transcripts:
    # Agent 3 (JSONL session transcripts) -- full paths
    - "C:/Users/Tony/.claude/projects/.../transcript_abc.jsonl"
    # Agent 3b (user-saved transcripts) -- relative to project root
    - "Docs/Transcripts/2026-04-05-ralph-call.md"
    - "Docs/Transcripts/2026-03-27-ralph-tony-pt1.md"
```

### Lifecycle

1. During L2 Step 2.1 (Agent 3b), glob `Docs/Transcripts/*.{md,txt,json,docx}` (top-level only)
2. Check each file against `processed_sources.transcripts` -- skip if already listed
3. Read and extract actionable items from new files
4. After extraction: move file to `Docs/Transcripts/Analyzed by task radar/`
5. Add the **original** relative path to `processed_sources.transcripts`

### Skipped Subfolders

Agent 3b only reads files directly in `Docs/Transcripts/`. These subfolders are always skipped:
- `Docs/Transcripts/Analyzed by task radar/` -- already processed
- `Docs/Transcripts/Workshop meetings/` -- workshop-specific, handled separately

### Re-mining

To force re-analysis of a user transcript:
1. Remove its path from `processed_sources.transcripts`
2. Move the file back from `Analyzed by task radar/` to `Docs/Transcripts/`
3. Run `/task-radar deep` -- Agent 3b will pick it up again

## Manual Operations

- To permanently block an item: add it manually with `permanent: true`
- To allow a resolved item to re-surface: set `permanent: false`
- To force re-mining a transcript: remove its path from `processed_sources.transcripts`
- To reset: delete the file (next scan creates a fresh one)
