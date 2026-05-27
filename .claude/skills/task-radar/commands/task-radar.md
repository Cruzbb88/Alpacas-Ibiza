---
description: Surface unfinished work and classify on Eisenhower matrix with completion scoring
argument-hint: "quick | deep | global | report | prune | verify | update | defer <#> | note <text> | note list | note clear | note recap | note promote <id>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_get_session_context, mcp__omni-cortex__cortex_get_timeline, mcp__omni-cortex__cortex_review_memories, mcp__omni-cortex__cortex_update_memory, mcp__omni-cortex__cortex_global_search
---

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

# Task Radar

> **CLI-first migration (Spec 17):** Pre-fetch queries (recall for handoffs/progress/brainstorms)
> use `cortex` CLI with `--json` for batch context gathering. Interactive operations (list_memories
> for browsing, review_memories, update_memory for prune actions) remain as MCP since the LLM needs
> to reason about results. Estimated CLI ratio: ~60%.

Surface ALL unfinished work, classify on Eisenhower matrix, estimate completion %, and recommend next actions.

## Variables

- `$ARGUMENTS`: The argument passed by the user (quick | deep | global | report | prune | verify | update | defer <#> | note | note extract | note list | note clear | note recap | note promote | noted [alias for note] | empty)
- `$PROJECT_PATH`: Current working directory
- `$PROJECT_NAME`: Basename of current working directory

## Step 0: Parse Arguments & Route

Parse `$ARGUMENTS` to determine execution layer:

| Argument | Route To |
|----------|----------|
| *(empty)* | Step 2: L2 Deep Radar |
| `quick` | Step 1: L1 Quick Scan |
| `deep` | Step 2 + Step 3: L2 Deep Radar + L3 Pipeline Audit |
| `global` | Step 4: L4 Global Sweep |
| `report` | Step 5.1: Show Last Report |
| `prune` | Step 6: Q4 Prune Mode |
| `defer <#>` | Step 11: Defer Item (bump down in quadrant) |
| `verify` | Step 2.5: Verify Last Report |
| `update` | Step 9: Update Report |
| `note <text>` | Step 10.1: Quick Sticky Note |
| `note extract <text>` | Step 10.2: Extract Actionable Items |
| `note list` | Step 10.3: Show Pending Notes |
| `note clear` | Step 10.4: Clear Completed Notes |
| `note recap` | Step 10.5: Summarize Themes |
| `note promote <id or keyword>` | Step 10.6: Promote to Full Task |
| `noted <text>` | (alias) Same as `note <text>` — routes to Step 10.1 |
| `noted extract/list/clear/recap/promote` | (alias) Same as `note` variants — routes to Step 10.x |

Set `$LAYER` variable based on route (L1, L2, L2+L3, L4).
If argument starts with `note` (catches both "note" and "noted"), route to Step 10 (Noted Mode) instead of any layer.

## Step 0.5: Load Resolution Registry (ALL layers)

**Purpose:** Prevent zombie items (resolved tasks reappearing in later reports).

1. Check if `reports/task-radar/.resolution-registry.yaml` exists in `$PROJECT_PATH`
2. If yes: parse it into `$RESOLVED_REGISTRY` with two data structures:
   - `resolved_items`: list of resolved item objects (title, canonical, resolved_in, evidence, permanent)
   - `processed_sources`: dict with transcripts, handoff_ids, cortex_memory_ids lists
3. If no: set `$RESOLVED_REGISTRY` to empty (first run, no history)

**Fuzzy match function** (used throughout all subsequent steps):
```python
from difflib import SequenceMatcher
def is_resolved(title, registry):
    canonical = title.lower().strip("*~[]#. ")  # strip markdown
    for item in registry.get("resolved_items", []):
        if SequenceMatcher(None, canonical, item["canonical"]).ratio() >= 0.75:
            if item.get("permanent", False):
                return "SKIP"       # never re-add
            return "FLAG"           # flag as previously resolved
    return "OK"                     # new item, add normally
```

**All subsequent steps** (1.2, 2.1, 2.2, etc.) MUST call `is_resolved()` before adding any item:
- `SKIP` → silently drop the item
- `FLAG` → only add if NEW evidence exists (new transcript, new commit, regression)
- `OK` → add normally

See `references/resolution-registry.md` for full schema and lifecycle documentation.

## Step 1: L1 Quick Scan

**Goal:** Fast inventory (<15 seconds) of specs folder + last report + recent handoffs.

### Step 1.1: Gather Spec Inventory

Run these globs in parallel:
```
Glob: specs/todo/**/*.md      → $PENDING_SPECS
Glob: specs/deferred/**/*.md  → $DEFERRED_SPECS
Glob: specs/done/**/*.md      → $DONE_SPECS
```

**Exclusions:** Filter OUT any specs matching `specs/todo/dormant/**/*.md` from `$PENDING_SPECS`. Dormant folders contain empty/placeholder project directories and must not inflate the pending count.

**Categorization:** When grouping specs, classify root-level `.md` files in `specs/todo/` (not inside any subfolder) as **one-off specs**. Also classify any specs inside `specs/todo/one-offs/` as one-offs. Report them in a distinct "Standalone / One-Off Specs" group in the inventory table.

**Counting rule (CRITICAL):** The spec count in the report MUST match the output of:
```bash
find specs/todo -name "*.md" ! -path "*/dormant/*" | wc -l
```
Do NOT manually count from the inventory table — always use the glob/find result as the authoritative number. If the inventory table subtotals don't sum to the glob count, recount before publishing.

For each pending spec:
- Extract title from first `#` heading
- Get file modification date
- Calculate staleness (days since modified)

### Step 1.2: Recent Handoffs (Lightweight)

Query Cortex for recent handoffs (last 14 days only) via CLI pre-fetch (Spec 17):
```bash
# CLI: pre-fetch handoff context (batch, no MCP round-trip needed)
HANDOFFS=$(cortex recall "handoff session-summary" --tags handoff --limit 5 --json 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- recall "handoff session-summary" --tags handoff --limit 5 --json 2>/dev/null)
```

From each handoff, extract:
- "Next Steps" items that haven't been addressed
- "Blockers" that are still open
- Cross-reference against $DONE_SPECS — if a Next Step references a now-done spec, skip it

**Resolution registry check (Step 0.5):**
- For each extracted item, call `is_resolved(title, $RESOLVED_REGISTRY)`
- SKIP items that match `permanent: true` resolved entries
- FLAG items that match `permanent: false` — only include with new evidence
- Skip handoffs whose memory ID is in `$RESOLVED_REGISTRY.processed_sources.handoff_ids`

### Step 1.3: Previous Report Carry-Forward

```
Glob: reports/task-radar/rd-*.md → find latest by filename sort
```

If a previous report exists:
1. Read it (first 200 lines for the item tables)
2. Parse existing items from the Eisenhower Matrix tables
3. Carry forward items that are still relevant (not in $DONE_SPECS)
4. Recalculate staleness for each carried item
5. **Merge conflict resolution:** When the same item appears in both the fresh scan and the previous report:
   - Keep the entry with richer metadata (more fields populated)
   - Use the more recent `last_touched` date from either source
   - Take the higher importance score
   - Preserve any completion % or verification status from the previous report
   - If both have notes/context, concatenate with the newer one first

If no previous report: skip carry-forward, build from scratch.

### Step 1.4: Classify Items

For each item, apply the classification rules from `references/eisenhower-classification.md`:

1. **Importance score:**
   - If from Cortex memory: use memory importance score
   - If from spec file: default 60
   - If from handoff next-step: default 45

2. **Urgency score:**
   - Base: staleness bracket (0-3d=20, 3-7d=40, 7-14d=70, 14+d=90)
   - +20 if item mentions "NEXT STEPS" or "blocker"
   - +10 if item appears in multiple handoffs
   - +25 if item is post-build validation with <50% completion (E2E, test, verify keywords)
   - +30 if item is blocking user acceptance testing
   - Cap at 100

3. **Defer penalty** (from `.item-ledger.yaml`):
   - Read `defer_count` for this item from the ledger
   - Apply: -20 (1 defer), -35 (2 defers), -50 (3+ defers, floor at 10)
   - Check defer decay: if `last_deferred_date` is 7+ days ago, reduce `defer_count` by 1

4. **Quadrant:**
   - Q1: importance >= 50 AND urgency >= 50
   - Q2: importance >= 50 AND urgency < 50
   - Q3: importance < 50 AND urgency >= 50
   - Q4: importance < 50 AND urgency < 50

5. **Sort within quadrants:**
   - Primary: defer-adjusted urgency descending
   - Secondary: age descending (oldest items first — from `first_seen_date` in ledger)
   - Tertiary: importance descending

### Step 1.4.1: Item Ledger Update

After classification, update `reports/task-radar/.item-ledger.yaml`:

1. **Read existing ledger** (or create empty if missing)
2. **For each current item**, fuzzy-match against ledger entries (>80% title similarity):
   - If match found: update `last_seen_report`, `last_seen_date`, `current_quadrant`, increment `reports_seen_count`
   - If no match: create new entry with `first_seen_date: today`, `first_seen_report: rd-NNN`, `defer_count: 0`
3. **Defer decay**: For entries where `defer_count > 0` and `last_deferred_date` is 7+ days ago, decrement `defer_count` by 1 (min 0)
4. **Write updated ledger**


### Step 1.4.3: Owner Resolution

For each item, determine its owner:

1. **Check spec frontmatter** (if item has a filepath to a spec):
   - Read the first 2000 bytes of the file
   - Look for `owner:` field in YAML frontmatter
   - If found, use that value (mapped through name normalization)

2. **Fall back to git authorship** (if no frontmatter owner):
   ```bash
   git log --diff-filter=A --format="%an" -- "{filepath}" | head -1
   ```
   This returns the original author who created the file.

3. **Name mapping:**
   - "AllCytes" or "Tony" -> "Tony"
   - "behnker" or "Ralph" or "Ralph Behnke" -> "Ralph"  
   - "Cruz" or "cruzbb88" -> "Cruz"
   - Anything else -> use the git username as-is

4. **For non-file items** (Cortex memories, conversation intents): owner defaults to "—" (em-dash)

The `report_builder.py` script handles this via `resolve_owner()` and `_map_owner_name()` functions.

### Step 1.4.2: Post-Build Verification Scan

Scan `specs/done/` for specs with unverified test plans:

1. For each spec in `specs/done/` modified in the last 30 days:
   - Grep for `## Verification`, `## Test Criteria`, `## Test Plan`, or `## Acceptance Criteria`
   - If found, check if a corresponding E2E test exists in `apps/*/build/packages/web/e2e/`
   - Also check if the spec title appears in any recent E2E test report
2. For specs with test plans but no E2E evidence:
   - Create a radar item: title = `E2E: {spec_name}`, type = `validation`, importance = 65, source = `post-build-scan`
   - These get the +25 validation urgency modifier automatically
3. These items appear in the Eisenhower matrix alongside regular items, tagged `[VERIFY]`

### Step 1.5: Generate Report

**MANDATORY:** All reports MUST include a `generated_at` field in YAML frontmatter with the exact MST/MDT timestamp (e.g., `generated_at: "2026-04-03 11:25 PM MDT"`).

**Getting the accurate timestamp:** ALWAYS run this bash command to get the exact local time BEFORE writing the report. NEVER estimate or guess the time:
```bash
powershell -c "Get-Date -Format 'yyyy-MM-dd h:mm tt'"
```
This reads the system clock directly — no timezone math needed. The system is configured for MDT (UTC-6) during US DST (March-November) and MST (UTC-7) outside DST. Append "MDT" or "MST" based on the current DST state (check: `powershell -c "(Get-Date).IsDaylightSavingTime()"` — True = MDT, False = MST).

Use the output directly in the frontmatter. Do NOT use Python datetime with hardcoded UTC offsets — that approach has caused incorrect timestamps in past reports (rd-034 was 4 hours off).

The `report_builder.py` script should also use system time: `datetime.now().strftime('%Y-%m-%d %#I:%M %p')` (no UTC conversion).

If invoked as `/task-radar quick` (not from pickup):

1. Determine next report number:
   ```
   Glob: reports/task-radar/rd-*.md → extract NNN from filenames → max + 1 → zero-pad to 3
   ```
2. Create report directory: `mkdir -p reports/task-radar/`
3. Write report to `reports/task-radar/rd-{NNN}-{YYYY-MM-DD}-{project-slug}.md`
4. Follow the report template from SKILL.md Architecture section
5. Include "Changes Since Last Report" section if previous report existed
6. Update `cache/last-run.json`

### Step 1.6: Compact Table Output

Display the Eisenhower matrix as a compact terminal table:

```
+----------------------------------+----------------------------------+
|  Q1: DO NOW ({count})            |  Q2: SCHEDULE ({count})          |
|  - {item1 title}    [{score}u]   |  - {item1 title}    [{score}i]   |
|  - {item2 title}    [{score}u]   |  - {item2 title}    [{score}i]   |
|  - {item3 title}    [{score}u]   |  - {item3 title}    [{score}i]   |
+----------------------------------+----------------------------------+
|  Q3: AUTOMATE ({count})          |  Q4: REVIEW ({count})            |
|  - {item1 title}    [{score}u]   |  - {item1 title}    [{score}i]   |
|  - {item2 title}    [{score}u]   |  - {item2 title}    [{score}i]   |
+----------------------------------+----------------------------------+
```

- Max 5 items per quadrant in the compact view
- If more items exist, show "+ N more" at the bottom of the quadrant
- Suffix `[Xu]` = urgency score, `[Xi]` = importance score, `[Xd]` = age in days (from item ledger `first_seen_date`)
- Format: `- {title}    [{score}u] [{age}d]`
- After the table: `Run /task-radar for full report | /task-radar prune for Q4 cleanup | /task-radar defer {item#} to bump down`

If invoked from `/pickup matrix`: output ONLY the compact table (no report file).

### Step 1.7: Deferred Specs Section

If $DEFERRED_SPECS is not empty, add a "Paused" section below the matrix:

```
### Paused (Deferred)
| # | Spec | Last Modified | Notes |
|---|------|-------------|-------|
| 1 | specs/deferred/old-feature.md | 2026-02-10 | Intentionally shelved |
```

These are NOT classified in the Eisenhower matrix — they are paused by choice.

---

## Step 2: L2 Deep Radar

**Triggered by:** no argument (default) or `deep` argument.

L2 includes all L1 items plus deep Cortex scanning and user prompt mining.

### Step 2.0: Run L1 First

Execute Step 1 (L1 Quick Scan) to gather the baseline spec inventory and recent handoffs. Store these items as `$L1_ITEMS`.

### Step 2.0.5: Brain Data Gathering

Query the Breathing Brain for session health and activity data:

```bash
# Get brain status (terminal state, pulse count, edits since commit)
BRAIN_STATUS=$(brain --json status 2>/dev/null || echo '{"error":"brain unavailable"}')

# Get recent journals (last 7 days) for trend data
BRAIN_JOURNALS=$(brain --json journal list --days 7 2>/dev/null || echo '[]')

# Get active terminals for multi-agent awareness
BRAIN_TERMINALS=$(brain --json terminals list 2>/dev/null || echo '[]')
```

Extract from brain status:
- `edits_since_commit` — if > 20, flag "Heavy uncommitted changes — consider /commit"
- `pulse_count_session` — session activity level
- `terminal_count` — number of active terminals

Extract from journals (last 3-5 entries):
- `actions_taken` per journal — session productivity indicator
- `recommendations_queued` — pending brain recommendations
- `trend` — stable/improving/declining

Include this data in the report as a "Session Health" section after the Eisenhower matrix.
If brain is unavailable, skip gracefully — brain integration is additive, not blocking.

### Step 2.1: Parallel Sub-Agent Scanning

Spawn 3 parallel sub-agents to scan different data sources simultaneously:

**Agent 1 — Handoff + Progress Memory Scanner:**
```bash
# CLI: batch pre-fetch handoff and progress context (Spec 17)
HANDOFF_CTX=$(cortex recall "handoff session-summary next steps blockers" --tags handoff --limit 20 --json 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- recall "handoff session-summary next steps blockers" --tags handoff --limit 20 --json 2>/dev/null)

PROGRESS_CTX=$(cortex recall "progress build in-progress" --limit 15 --json 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- recall "progress build in-progress" --limit 15 --json 2>/dev/null)
```
For each handoff memory:
- Extract "Next Steps" bullet points as individual items
- Extract "Blockers" as separate items (importance +10)
- For progress memories: look for items without a matching "build SUCCESS" memory
- Cross-reference against specs/done/ — skip completed items
- Each item gets: title, source_id (memory ID), type ("handoff-next-step" or "progress"), importance (from Cortex score), last_touched (memory date)

**Agent 2 — Brainstorm + Decision Memory Scanner:**
```
cortex_recall: query="brainstorm active idea"
  tags_filter: ["brainstorm"]
  limit: 15

cortex_recall: query="decision pending TODO"
  type_filter: "decision"
  limit: 10
```
For brainstorm memories:
- Check if `STATUS: active` or `STATUS: completed` but no matching spec exists in specs/todo/ or specs/done/
- These are ideas brainstormed but never built — flag them
For decision memories:
- Look for text containing "TODO", "pending", "after X is done", "need to", "should"
- These are decisions with unfinished action items

**Agent 3 — Prompt Miner (User Intent Extraction):**
```bash
python ~/.claude/skills/task-radar/scripts/prompt_miner.py \
  --project-path "$PROJECT_PATH" \
  --days 30 \
  --max-intents 30
```
Parse JSON output → convert each intent to a radar item with:
- title: intent text (truncated to 80 chars)
- type: "conversation-intent"
- importance: 35 (low — unstructured)
- urgency: based on transcript date staleness
- source: transcript filename + line number

**Agent 3b -- User Transcript Scanner (Meeting Notes, Calls, WhatsApp):**

Scans user-saved transcripts in `$PROJECT_PATH/Docs/Transcripts/` for actionable items.

1. **Glob top-level files only** (no subdirectories):
   ```
   Glob: $PROJECT_PATH/Docs/Transcripts/*.md
   Glob: $PROJECT_PATH/Docs/Transcripts/*.txt
   Glob: $PROJECT_PATH/Docs/Transcripts/*.json
   Glob: $PROJECT_PATH/Docs/Transcripts/*.docx
   ```
   **Skip subfolders entirely** -- do NOT recurse into `Analyzed by task radar/`, `Workshop meetings/`, or any other subdirectory.

2. **Deduplication check:** For each file found, check its relative path (e.g. `Docs/Transcripts/2026-04-05-ralph-call.md`) against `$RESOLVED_REGISTRY.processed_sources.transcripts`. If already listed, **skip** the file.

3. **If no new transcript files exist:** Skip Agent 3b silently. Do not error or add any section to the report.

4. **For each new transcript file:**
   - Read the file content
   - Extract actionable items: decisions made, action items assigned, explicit requests, complaints, feature asks, commitments ("I'll do X", "we need to", "let's", "TODO", "remind me")
   - For each extracted item, create a radar item with:
     - title: actionable text (truncated to 80 chars)
     - type: "user-transcript"
     - importance: 40 (slightly above conversation-intent -- these are deliberate user-saved transcripts)
     - urgency: based on file date or content date references
     - source: filename (e.g. `Docs/Transcripts/2026-04-05-ralph-call.md`)
   - Tag each extracted item with the source filename for traceability

5. **After extraction -- move and register:**
   - Ensure `$PROJECT_PATH/Docs/Transcripts/Analyzed by task radar/` directory exists (create if needed)
   - Move the analyzed file: `mv "$PROJECT_PATH/Docs/Transcripts/{file}" "$PROJECT_PATH/Docs/Transcripts/Analyzed by task radar/{file}"`
   - Append the original relative path (e.g. `Docs/Transcripts/2026-04-05-ralph-call.md`) to `$RESOLVED_REGISTRY.processed_sources.transcripts`
   - Write the updated resolution registry back to `reports/task-radar/.resolution-registry.yaml`


### Step 2.2: Merge and Deduplicate

After all agents return:

1. Combine: $L1_ITEMS + Agent 1 results + Agent 2 results + Agent 3 results + Agent 3b results
2. Deduplicate by:
   - Same spec file path → keep the one with richer metadata
   - Same Cortex memory ID → keep once
   - High text similarity in title (>80% overlap) → keep the higher-importance one
3. Each item gets its Eisenhower classification (Step 1.4 logic)
4. Run Step 2.5 (Verification Pass) to filter resolved items before report generation

### Step 2.2.5: Carry-Forward Audit (MANDATORY)

**Purpose:** Prevent silent item loss between reports. This audit catches items that existed in the previous report but are absent from the current scan.

1. Read the previous report file (from `previous_report` in frontmatter, resolve to `reports/task-radar/rd-{NNN}-*.md`)
2. Extract ALL items from Q1, Q2, Q3, Q4 tables (parse the markdown tables)
3. For each item in the previous report:
   a. Check if it appears in the current scan's item list (fuzzy match title, >70% similarity)
   b. Check if it's in the resolution registry (resolved permanently)
   c. Check if it was in the "Completed Since" section of the current scan
4. Any item that is NOT found in (a), (b), or (c) → flag as `[CARRY]` and add to the appropriate quadrant with its original scores
5. Include a "Carry-Forward Audit" section in the report:

```markdown
## Carry-Forward Audit

| Item | Previous Report | Status |
|------|----------------|--------|
| PO upload test with Eva | rd-016 Q1#1 | [CARRY] -> Q1#10 |
| Cruz onboarding | rd-016 Q1#2 | [CARRY] -> Q2#28 |
| ArtFlow PDF E2E | rd-016 Q2#11 | [RESOLVED] — in resolution registry |
| Fix CDN cache | rd-016 Q1#3 | [FOUND] — matched in current scan Q1#2 |
```

**Rule:** NEVER silently drop items. Every item from the previous report must be accounted for (carried, resolved, found in current scan, or explicitly dropped with evidence).

If no previous report exists, skip this step.

### Step 2.2.6: Pending Specs Inventory

**Purpose:** Surface all pending specs and cross-reference against noted items.

1. Glob `specs/todo/**/*.md` to find all pending specs
   - **Exclude** `specs/todo/dormant/**/*.md` from the count (these are empty/placeholder folders)
   - **Exclude** `specs/todo/one-offs/**/*.md` from project groups (list separately)
2. Group by parent directory, listing EVERY folder and EVERY standalone file:
   ```
   Pending Specs (N total, verified by find):
   
   Projects:
     visibility-gates/: 01, 02 (2 specs) [Tony]
     surity-agentic-functions/: 01-09 (9 specs, blocked) [Ralph]
     ...

   Standalone / One-Off Specs:
     adw-pre-commit-lint-gate.md [Tony]
     fix-agent-task-tenant-scoping.md [Tony]
     erp-template-re-export.md [Ralph]
     ...
   
   Dormant (excluded from count): 14 empty folders
   Deferred: N specs in specs/deferred/
   ```
3. **Counting verification (MANDATORY):** After building the table, sum all subtotals. If the sum
   does not match `find specs/todo -name "*.md" ! -path "*/dormant/*" | wc -l`, recount. The
   find result is authoritative. This prevents the miscount bug from rd-033 (reported 62, actual 70).
4. Cross-reference noted items against specs:
   - If a note mentions a topic covered by a pending spec, annotate: `Covered by: specs/todo/{path}`
   - If a spec exists in `specs/done/`, skip it entirely
5. Include as a "Pending Specs" section in the report, after the quadrants
6. Include owner tag `[Tony]` or `[Ralph]` per the Step 1.4.3 owner resolution logic
7. **Update OWNERS.md (MANDATORY):** After building the Eisenhower matrix (Q1-Q4) with owner tags,
   regenerate `specs/todo/OWNERS.md` using the classified items. This file mirrors the Eisenhower
   prioritization from the report but organized by owner for quick browsing.

   **Format:** Group by owner, then within each owner sort by quadrant (Q1 first → Q4 last),
   then by staleness (oldest first within each quadrant). Include quadrant tag, spec count,
   staleness, and a one-line description.

   ```markdown
   # Spec Ownership — Quick Reference
   *Auto-generated by /task-radar. Last updated: {timestamp}*

   ## Tony's Specs (N total)

   ### Q1 — Do Now
   | Project / Spec | Specs | Age | Description |
   |----------------|-------|-----|-------------|
   | `visibility-gates/` | 2 | 1d | Visibility engine + per-user overrides |
   | `fix-agent-task-tenant-scoping.md` | 1 | 8d | Add org_id + RLS (security fix) |

   ### Q2 — Schedule
   | Project / Spec | Specs | Age | Description |
   |----------------|-------|-----|-------------|
   | `sidebar-personalization/` | 1 | 2d | Preset auto-assign gaps |
   | ...

   ### Q3 — Delegate / Automate
   ...

   ### Q4 — Review / Eliminate
   ...

   ## Ralph's Specs (N total)

   ### Q1 — Do Now
   ...
   (same table format)

   ### Q2 — Schedule
   ...
   ```

   **Rules:**
   - Exclude `OWNERS.md` itself, `dormant/` contents, and deferred specs from the listing
   - Use the same Eisenhower classification from the report's Q1-Q4 tables — do NOT reclassify
   - Age = days since spec was created (from git log or frontmatter date)
   - For multi-spec project folders, show the folder name + spec count + age of oldest spec
   - For standalone specs, show the filename + age
   - Description = first-line title from the spec (truncated to ~50 chars if needed)
   - If a project has specs in multiple quadrants, list it under its highest-priority quadrant
     with a note like "(1 spec in Q1, 2 in Q2)"

### Step 2.3: Surfaced from Conversations Section

If Agent 3 or Agent 3b returned items, add a special section to the report:

```markdown
## Surfaced from Conversations

Items extracted from your session transcripts and user-saved transcripts (meetings, calls, WhatsApp) that may have been forgotten:

| # | Intent | Confidence | Source | Date |
|---|--------|-----------|--------|------|
| 1 | "I also need to run self-heal on workshop" | 0.85 | transcript-abc.jsonl:4521 | 2026-03-10 |
| 2 | "we should circle back to the SCORM skill" | 0.72 | transcript-def.jsonl:1203 | 2026-03-08 |
| 3 | "Ralph wants PO upload tested with real Bunnings data" | 0.90 | Docs/Transcripts/2026-04-05-ralph-call.md | 2026-04-05 |
```

These items are classified as Q3 (urgency from staleness, low importance since unstructured) unless they match a known spec or brainstorm (then inherit that item's importance).

### Step 2.5: Verification Pass

**Triggered by:** `deep` (auto, after item merge), `global` (auto, after per-project scan), or `verify` (standalone)

**Mode gate:** Skip entirely if MODE = L1 quick.

#### Step 2.5.1: Load Items to Verify

- If running as part of `deep`/`global`: use the merged item list from Step 2.2 (or Step 4.3)
- If running standalone (`verify`): read the latest report from `reports/task-radar/rd-*.md`, parse all items from the Eisenhower Matrix tables

#### Step 2.5.1.5: Load Previous Report Blocklist

Load the previous report's "Resolved", "Completed", and strikethrough items as a blocklist:

1. Read the previous report (not the current one being generated)
2. Extract all items from "Resolved" and "Completed This Session" sections
3. Build a blocklist of canonical titles
4. For every candidate item in the merged list:
   - If it matches a blocklist entry (fuzzy >75%): it must provide **NEW evidence** to stay active
   - NEW evidence means: a new commit since the resolution date, a new transcript mention after the resolution date, or a detected regression
   - Without new evidence: auto-resolve with status "Previously resolved in rd-{NNN}, no new evidence found"
5. Also check against `$RESOLVED_REGISTRY` from Step 0.5 (belt and suspenders)

#### Step 2.5.2: Run Verification Checks

For each item, run the applicable verification check from `references/verification-patterns.md`. Spawn a sub-agent for batch efficiency (groups of 8-10 items per agent, max 3 parallel agents).

Each check returns one of:
- **ACTIVE** — Item is genuinely still open (keep in radar)
- **RESOLVED** — Item is done/no longer relevant (remove from radar)
- **STALE** — Source memory is outdated but item may still be valid (flag for review)

Verification evidence is attached to each item:
```
verification: {
  status: "ACTIVE" | "RESOLVED" | "STALE",
  method: "spec-check" | "mcp-check" | "skill-check" | "git-check" | "config-check" | "cortex-superseded",
  evidence: "specs/done/v2/v2-04-auto-entity-extraction.md exists" | "darkhold found in .claude.json",
  checked_at: "2026-03-14T18:30:00Z"
}
```

#### Step 2.5.3: Git History Verification

For items that can't be verified by file existence alone, check git history:

```bash
# Check if an item was addressed in recent commits
git log --oneline --since="2026-01-01" --all --grep="{item_keyword}" -- .

# Check if a file was moved to done/
git log --oneline --diff-filter=R -- "specs/done/**"

# Check collab-kit repo for synced items
git -C "D:/Projects/claude-collab-kit" log --oneline --since="2026-01-01" --grep="{item_keyword}"
```

Also check the remote repo if available:
```bash
# Check if item appears in pushed commits
git log --oneline origin/master --since="2026-01-01" --grep="{item_keyword}" 2>/dev/null
```

#### Step 2.5.4: Cortex Supersession Check

For items sourced from Cortex memories, check if a newer memory supersedes the source:

```
cortex_recall: query="{item_title}", limit=3, sort by created_at desc
```

If a newer memory with higher importance exists AND it marks the item as complete/done/resolved, mark the radar item as RESOLVED with evidence pointing to the superseding memory.

#### Step 2.5.5: Filter and Report

1. Remove all RESOLVED items from the active radar
2. Move them to a "Resolved (verified)" section in the report
3. Flag STALE items with a ⚠ marker in the report tables
4. Recalculate quadrant counts after filtering
5. Log verification stats: `Verified: {total} | Active: {n} | Resolved: {n} | Stale: {n}`

#### Step 2.5.6: Standalone Verify Mode

When triggered by `verify` argument:
1. Read latest report (Step 5.1 logic)
2. Parse all items from the report tables
3. Run Step 2.5.2-2.5.5 on parsed items
4. Write updated report (same filename, updated frontmatter with `verified_at` field)
5. Display summary:
```
Task Radar — Verification Complete
Checked: {total} items | Active: {n} | Resolved: {n} | Stale: {n}
Report updated: reports/task-radar/rd-{NNN}-{date}-{slug}.md
```

### Step 2.4: Generate Full Report

Use the same report generation logic as Step 1.5, but with:
- Layer field: "L2" (or "L2+L3" if `deep` argument)
- All items from the merged set
- Include "Surfaced from Conversations" section
- Include "Changes Since Last Report" section

### Step 2.6: Generate Predicted Actions Section (L2+ only)

**Purpose:** Compute actionable predictions from the Eisenhower items so `/pickup` can read them instantly without re-computing. This section is appended to the report AFTER the main Eisenhower matrix.

#### Step 2.6.1: Map Q1/Q2 Items to Runnable Commands

For each Q1 item (max 5), determine the best runnable command:

| Item Pattern | Command Mapping |
|-------------|----------------|
| References a spec path in `specs/todo/` | `/build {spec-path}` |
| Manual code fix (mentions "fix", "rewire", "refactor", code file) | `manual code fix in {repo}` with effort estimate |
| Railway/deploy task (mentions "deploy", "railway", "alembic") | Show the actual CLI command (e.g., `railway run bash -c '...'`) |
| Email/communication task (mentions "send", "email", "reply") | `manual — send via GWS CLI` |
| Test task (mentions "E2E", "test", "verify") | `/e2e-test` or `manual test` |
| Spec planning task (mentions "plan", "spec", "brainstorm") | `/quick-plan {description}` |

For each Q2 item (max 5), apply the same mapping.

Include effort estimate from the item's effort tag: `[15m]`, `[1h]`, `[2-3h]`, followed by owner tag `[Tony]` or `[Ralph]`. If no effort tag, estimate from keywords:
- fix/check/verify/update → `[30m]`
- build/implement/migrate → `[2-3h]`
- spec/plan/brainstorm → `[1h]`

#### Step 2.6.2: Maintenance Staleness Check

Grep `~/.claude/stats/command-history.jsonl` for the last run of each maintenance command:

```bash
# Last run of each maintenance command (use grep, no inline python backslashes)
for CMD in self-heal crystal-ball retrospective weekly-digest; do
  LAST=$(grep "\"cmd\":\"$CMD\"" ~/.claude/stats/command-history.jsonl 2>/dev/null | tail -1 | grep -oP '"ts":"[^"]*"' | sed 's/"ts":"//;s/"//')
  echo "$CMD=$LAST"
done
```

For session-count thresholds (crystal-ball, retrospective), count `/pickup` entries after the last command run:
```bash
grep '"cmd":"pickup"\|"cmd":"crystal-ball"' ~/.claude/stats/command-history.jsonl 2>/dev/null | tail -30
```
Count pickup entries after the last crystal-ball entry = sessions since last run.

**Thresholds:**

| Command | Threshold | Type | Overdue Symbol |
|---------|-----------|------|---------------|
| `/self-heal` | 3 days | calendar | ⚠️ |
| `/task-radar` | This report is current | — | ✓ |
| `/crystal-ball` | 5 sessions | session-count | ⚠️ |
| `/retrospective` | 5 sessions | session-count | ⚠️ |
| `/weekly-digest` | 7 days | calendar | ⚠️ |
| `voice-profile` | 30 days | file-mtime | ⚠️ |

For `voice-profile`, check the mtime of `~/.claude/commands/pickup-references/voice-profile.yaml`:
```bash
# Voice profile staleness (30-day threshold)
VP_FILE="$HOME/.claude/commands/pickup-references/voice-profile.yaml"
if [ -f "$VP_FILE" ]; then
  VP_AGE=$(python3 -c "import os,time; print(int((time.time()-os.path.getmtime('$VP_FILE'))/86400))")
  echo "voice-profile=${VP_AGE}d"
else
  echo "voice-profile=never"
fi
```
Refresh command: `python3 python-scripts/refresh-voice-profile.py --project "$(pwd)"`

#### Step 2.6.3: Quick Wins Filter

Filter Q1+Q2 items where:
- Effort tag = `effort:quick` (or estimated `[15m]`/`[30m]`)
- Item does NOT block other Q1 items (no dependency chain)
- Item can run in a background agent or parallel terminal

Max 3 quick wins.

#### Step 2.6.4: Write Predicted Actions to Report

Append this section to the report markdown file:

```markdown
## Predicted Actions (auto-generated)

### From Q1 Items
1. `/build specs/todo/surity-analytics/01a-admin-panel-backend.md` — Admin Panel Backend [2-3h] [Tony]
2. Product Master tab rewire — manual code fix in process-catalogue [2-3h] [Ralph]
3. `railway run bash -c 'cd packages/api && alembic upgrade head'` — pending migration [15m] [Tony]

### From Q2 Items
1. `/e2e-test` — YAML amendment mode test [1h] [Tony]
2. E2E preexisting fixes — CORS on 500, rangeview 500 [2h] [Tony]

### Maintenance Due
- `/self-heal` — last run: 2026-04-02 (1 day ago, threshold: 3 days) ✓
- `/task-radar` — this report is current ✓
- `/crystal-ball` — last run: 6 sessions ago (threshold: 5) ⚠️
- `/retrospective` — last run: 8 sessions ago (threshold: 5) ⚠️
- `/weekly-digest` — last run: 2026-03-28 (6 days ago, threshold: 7 days) ✓

### Quick Wins (parallel-safe)
⚡ Alembic upgrade head [15m] [Tony]
⚡ Send 3 held Ralph emails [10m] [Tony]
```

#### Step 2.6.4.1: Ownership Summary Section

Append an "Ownership Summary" section to the report, immediately after the Q4 table and before the "Surfaced from Conversations" section:

```markdown
## Ownership Summary

| Owner | Q1 | Q2 | Q3 | Q4 | Total |
|-------|----|----|----|----|-------|
| Tony  | 3  | 5  | 1  | 2  | 11    |
| Ralph | 2  | 3  | 0  | 1  | 6     |
```

This is auto-generated by `report_builder.py` from each item's resolved owner.
The table is sorted alphabetically by owner name. Items with no resolved owner show as "—".

#### Step 2.6.5: Update YAML Frontmatter

Add these fields to the report's YAML frontmatter so `/pickup` can parse without reading the full report body:

```yaml
predicted_actions_count: 5
maintenance_overdue: ["crystal-ball", "retrospective"]
quick_wins_count: 2
quick_wins_total_time: "25m"
```

---

## Step 3: L3 Pipeline & Skills Audit

**Triggered by:** `deep` argument (runs after L2).

### Step 3.1: Load or Build Skill Mapping Cache

Check `~/.claude/skills/task-radar/cache/skill-map.json`:

1. If file exists: read `last_cortex_check` timestamp
2. Query `cortex_recall` for memories tagged `skill-update`, `skill-create`, or `build` since that timestamp
3. If new skill-related memories found OR cache doesn't exist:
   ```bash
   python ~/.claude/skills/task-radar/scripts/skill_scanner.py > /tmp/skill_scan.json
   ```
   Parse output, merge with predefined task_types mapping, write to `cache/skill-map.json`
4. If no changes detected: use cached mapping as-is (skip scanner)

**Predefined task_types mapping** (see `references/completion-heuristics.md` for full table):
- `app-build` → /e2e-test, /self-heal, /adw-analyze, /security, /spec-review
- `skill-build` → /self-heal, /test, /crystal-ball
- `brainstorm` → /probability-storm, /crystal-ball, /quick-plan
- `pipeline-config` → /adw-analyze, /adw-improve, /resonance-finder
- `infrastructure` → /self-heal, /security, /performance-optimizer

### Step 3.2: Completion % Scoring

For each item from L2, walk the evidence hierarchy:

1. **Detect evidence level** using batched Cortex queries:
   - `cortex_recall: "build SUCCESS {project_name}"` → find build completion memories
   - `cortex_recall: "e2e-test {project_name}"` → find test memories
   - `cortex_recall: "self-heal {project_name}"` → find post-build skill runs
   - `cortex_recall: "deploy {project_name}"` → find deployment memories
   - Cross-reference with specs/done/ for merged items

2. **Assign completion %** using the heuristic ranges from `references/completion-heuristics.md`:
   - Just an idea/memory → 5-10%
   - Brainstorm brief exists → 15-20%
   - Spec in specs/todo/ → 25-30%
   - Work sessions started → 35-60% (based on memory count)
   - Core build complete → 65-70%
   - Post-build skills run → 75-80%
   - E2E passing → 85-90%
   - Merged + deployed → 95-100%

3. **ADW pipeline items**: assume complete unless Cortex shows failure (no commit, error, corruption). Flag only if broken.

Use parallel sub-agents: batch items into groups of 5-8, each agent scores a batch.

### Step 3.3: Overdue Skill Detection

For each item:

1. **Infer task type** using heuristics:
   - Has "spec" in source + in an app project → `app-build`
   - Has "spec" in source + in skills/ directory → `skill-build`
   - Tagged `brainstorm` → `brainstorm`
   - Contains "pipeline"/"config"/"yaml" → `pipeline-config`
   - Default → `infrastructure`

2. **Look up applicable skills** from cached skill mapping

3. **Check last execution** for each applicable skill:
   - `cortex_recall: "{skill_name} {item_title_or_project}"` → find last execution
   - Compare date against recommended cadence:
     - `7d` → flag if > 7 days since last run
     - `14d` → flag if > 14 days
     - `per-build` → flag if no execution since last build memory
     - `per-adw-run` → flag if no execution since last ADW memory
     - `once` → flag only if never executed
     - `30d` → flag if > 30 days

4. **Generate next action recommendations** per item:
   ```
   Next: /self-heal (last run: 12 days ago, recommended: every 7 days)
   Next: /e2e-test (never run on this spec)
   ```

Store overdue_skills as a list on each item for the report builder.

### Step 3.4: Enrich Items

Update each item with:
- `completion`: percentage (0-100)
- `completion_evidence`: highest evidence level found
- `overdue_skills`: list of overdue skill recommendations
- `task_type`: inferred type

---

## Step 4: L4 Global Sweep

**Triggered by:** `global` argument.

### Step 4.1: Discover Project Directories

1. Glob `D:/Projects/*/` for project directories
2. Include `D:/Workshop/` (current workspace)
3. Query `cortex_global_search` for project paths mentioned in memories
4. For each discovered directory:
   - Check if it has a `specs/` folder or `.claude/` folder (confirms it's a project)
   - Query Cortex for last session date: `cortex_recall: "handoff {dir_name}" limit=1`
   - Record last session date for display

### Step 4.2: Interactive Project Selection

Present discovered projects sorted by last session date (most recent first):

```
Select projects to scan (enter numbers, comma-separated, or "all"):
[1] D:/Projects/surity-workspace (last session: 2 days ago)
[2] D:/Workshop (current directory)
[3] D:/Projects/video-studio (last session: 5 days ago)
[4] D:/Projects/claude-collab-kit (last session: 1 week ago)
[5] D:/Projects/ai-strategy-factory (last session: 3 weeks ago)
>
```

Use `AskUserQuestion` to get selection. Parse comma-separated numbers or "all".

Store selection in `cache/last-run.json` under `global_selections` for reuse hint on next run.

### Step 4.3: Parallel Per-Project Scanning

Spawn sub-agents for each selected project (max 4 parallel, queue remainder):

Each sub-agent runs:
1. `cd` to the project directory context
2. Execute L2 Deep Radar (Step 2) for that project
3. If `deep` was also passed: execute L3 Pipeline Audit (Step 3)
4. Return items as structured data

**Agent prompt template:**
```
Run Task Radar L2 Deep Radar for project at {project_path}.
Scan Cortex memories with tags handoff, brainstorm, decision, progress filtered to this project.
Scan specs/todo/, specs/done/, specs/deferred/ in this directory.
Classify all items on Eisenhower matrix.
Return results as a structured list of items with: title, type, source, importance, urgency, quadrant, last_touched, completion.
```

### Step 4.4: Cross-Project Report Generation

After all agents return:

1. Merge all project results into unified item list
2. Deduplicate cross-project items by memory ID
3. Run Step 2.5 (Verification Pass) on the merged cross-project item list
4. Calculate per-project summary stats:
   ```json
   {
     "name": "Surity",
     "q1": 3, "q2": 5, "q3": 2, "q4": 4,
     "total": 14,
     "avg_completion": 45
   }
   ```
5. Build input JSON with `project_summaries` for report builder
6. Run report builder:
   ```bash
   python ~/.claude/skills/task-radar/scripts/report_builder.py \
     --input /tmp/task-radar-global-items.json \
     --project-path "$PROJECT_PATH" \
     --global-report
   ```
6. Global reports use `gtr-` prefix: `reports/task-radar/gtr-NNN-YYYY-MM-DD-global.md`

### Step 4.5: Display Global Summary

```
Task Radar — Global Sweep
Projects: {n} scanned | Items: {total} (Q1: {n}, Q2: {n}, Q3: {n}, Q4: {n})
Report: reports/task-radar/gtr-{NNN}-{date}-global.md

## Cross-Project Summary
| Project | Q1 | Q2 | Q3 | Q4 | Total | Avg Completion |
|---------|----|----|----|----|-------|---------------|
| Surity  | 3  | 5  | 2  | 4  | 14    | 45%           |
| Workshop| 1  | 3  | 0  | 2  | 6     | 35%           |

Run /task-radar deep for single-project analysis | /task-radar prune for Q4 cleanup
```

---

## Step 5: Report Utilities

### Step 5.1: Show Last Report (`report` argument)

```
Glob: reports/task-radar/rd-*.md → find latest
Read: display the report content
```

If no reports exist: "No task-radar reports found. Run `/task-radar quick` to generate one."

---

## Step 6: Q4 Prune Mode (Traffic Light Cleanup)

**Triggered by:** `prune` argument, or appended after `deep` scan.

### Step 6.1: Collect Q4 Items

If a scan was just run (default/deep), use Q4 items from that scan.
Otherwise, read the latest report and extract Q4 items.

### Step 6.2: Traffic Light Classification

For each Q4 item, classify as green/yellow/red:

**GREEN (auto-archive)** — must match 2+ of these criteria:
1. Importance < 40
2. Last touched > 30 days ago
3. Superseded by a newer Cortex memory (same tags, higher importance, more recent)
4. No references in any active spec (specs/todo/) or roadmap (specs/roadmaps/)

**Safety override:** Never green-light items with importance >= 60. Force to yellow minimum.

**YELLOW (confirm with user):**
- Stale (14+ days) but unclear relevance
- Brainstorm that was never developed further
- Active project but this specific task went cold
- Anything that doesn't qualify for green OR red

**RED (keep):**
- Referenced by an active spec in specs/todo/
- Referenced in a roadmap that's still IN PROGRESS
- High importance (>= 70) regardless of age
- Touched within the last 7 days

Sort: green first, then yellow, then red.

### Step 6.3: Green Auto-Archive

For each green item:
- If source is a Cortex memory: `cortex_update_memory` with params `{"memory_id": "{id}", "updates": {"status": "archived"}}`
- If source is a spec file: recommend `mv specs/todo/{file} specs/archive/` (don't auto-move files — print the command)
- Log action in the report

Display summary:
```
### Auto-Archived (Green) — {count} items
- [ARCHIVED] "Old brainstorm about X" (mem_123, importance: 25, 45 days stale)
- [ARCHIVED] "Decision about Y" (mem_456, superseded by mem_789)
```

### Step 6.4: Yellow Interactive Review

Present each yellow item for user decision:

```
### Needs Review (Yellow) — {count} items

[1] "SCORM skill brainstorm" (brainstorm, 28 days stale, importance: 40)
    Source: mem_1771437204877 | Last touched: 2026-02-14
    Context: Initial brainstorm for Ralph's SCORM platform, no spec generated
    → [A]rchive | [K]eep | [R]eclassify to Q2

[2] "Update collab kit sync" (progress, 21 days stale, importance: 35)
    Source: mem_1771489491919 | Last touched: 2026-02-19
    Context: Spec folder consistency sync, may be outdated
    → [A]rchive | [K]eep | [R]eclassify to Q2

Enter choices (e.g., "1A 2K" or "all-archive" or "skip"):
```

Wait for user input. Process choices:
- Archive: `cortex_update_memory` → status: archived
- Keep: leave in radar, no action
- Reclassify: move to Q2 by adjusting importance to 55 in the report

### Step 6.5: Red Items Display

Show red items with explanation (no action taken):

```
### Kept (Red) — {count} items
- [KEEP] "Fix S05 AWCL imports" — referenced in ROADMAP-surity.md
- [KEEP] "E2E test S03" — importance: 80, last touched 5 days ago
```

### Step 6.6: Prune Summary

```
Q4 Cleanup Complete
  Green (auto-archived): {n}
  Yellow (reviewed): {n} ({archived} archived, {kept} kept, {reclassified} reclassified)
  Red (kept): {n}
  Total Q4 items: {total} → {remaining} remaining
```

---

## Step 7: Generate Report via report_builder.py

After any scan completes (L1, L2, L2+L3), assemble all items into a JSON file and run the report builder:

1. Write items to temp file:
   ```bash
   # Write JSON with items, project info, and metadata to a temp file
   python -c "import json, tempfile; ..." > /tmp/task-radar-items.json
   ```

2. Run report builder:
   ```bash
   python ~/.claude/skills/task-radar/scripts/report_builder.py \
     --input /tmp/task-radar-items.json \
     --project-path "$PROJECT_PATH"
   ```

3. Parse JSON output for report path and stats
4. Display report path and summary to terminal

The report builder handles:
- Finding and parsing the previous report for delta calculation
- Numbering the new report (rd-NNN or gtr-NNN)
- Writing the markdown report with YAML frontmatter
- Updating `cache/last-run.json`
- Calculating [NEW], [RESOLVED], [MOVED], [PROGRESS] deltas

For L1 `quick` mode: still use inline report generation (Step 1.5) for speed — skip the Python script.
For L2+ modes: always use report_builder.py.

### Step 7.1: Update Resolution Registry (ALL layers, after report is written)

**Purpose:** Persist resolved items so they don't reappear in future scans (prevents zombie items).

1. Read the new report's "Resolved" and "Completed This Session" sections
2. For each resolved/completed item:
   a. Normalize title to canonical form (lowercase, strip markdown formatting)
   b. Check if already in `$RESOLVED_REGISTRY.resolved_items` — if yes, skip
   c. Add to registry:
      ```yaml
      - title: "{original title}"
        canonical: "{normalized}"
        resolved_in: "rd-{NNN}"
        resolved_date: "{YYYY-MM-DD}"
        evidence: "{brief resolution evidence}"
        permanent: true  # or false for soft resolutions
      ```
   d. Determine `permanent` flag:
      - `true` if: spec exists in `specs/done/`, commit hash cited, DB change verified, or explicit "DECISION" recorded
      - `false` if: reclassified, deferred, "no longer relevant", or soft resolution
3. For each resolved item with a Cortex memory source (`cortex_id` or `source_id`):
   ```bash
   cortex update <memory_id> --tags <existing-tags>,resolved
   ```
   This prevents `cortex_recall` from surfacing resolved items in future scans.
4. Add all newly processed transcript paths to `processed_sources.transcripts`
5. Add all newly processed handoff memory IDs to `processed_sources.handoff_ids`
6. Write updated `.resolution-registry.yaml` to `$PROJECT_PATH/reports/task-radar/`

**Failure handling:** If the registry file can't be written, log a warning but don't fail the report. The registry is additive — missing updates will be caught on the next run.

## Step 7.5: Trend Tracking (3+ reports required)

After generating the current report, check how many previous reports exist:

```
Glob: reports/task-radar/rd-*.md → count files
```

**If fewer than 3 reports:** Skip trend tracking. Add a note at the bottom of the report:
```
> Trend tracking available after 3+ reports.
```

**If 3+ reports exist:**

1. Read the YAML frontmatter from the last 5 reports (or all if fewer than 5)
2. Extract from each: `date`, `items_total`, `q1_count`, `q2_count`, `q3_count`, `q4_count`, `items_resolved`, `completed_this_session`
3. Generate a trend section in the report:

```markdown
## Trend (last {N} reports)

| Report | Date | Total | Q1 | Q2 | Q3 | Q4 | Resolved | Completed |
|--------|------|-------|----|----|----|----|----------|-----------|
| rd-005 | 2026-03-20 | 15 | 2 | 1 | 4 | 8 | 3 | 2 |
| rd-004 | 2026-03-18 | 18 | 2 | 0 | 3 | 8 | 5 | 4 |
| rd-003 | 2026-03-16 | 22 | 3 | 1 | 5 | 10 | 2 | 1 |
| rd-002 | 2026-03-15 | 24 | 4 | 0 | 6 | 12 | 1 | 0 |
| rd-001 | 2026-03-14 | 26 | 5 | 0 | 7 | 14 | 0 | 0 |

**Direction:** Total items ↓ (26 → 15, -42%), Q1 ↓ (5 → 2, -60%)
**Velocity:** Avg {n} items resolved per scan
**Health:** {assessment based on Q1 trend — decreasing Q1 = healthy, increasing = falling behind}
```

4. Calculate direction indicators:
   - Compare first and last report in the window
   - ↓ = decreasing (good for total/Q1), ↑ = increasing
   - Calculate % change
5. Calculate velocity: total resolved + completed across all reports / number of reports
6. Health assessment:
   - Q1 decreasing AND total decreasing → "Healthy — clearing backlog"
   - Q1 stable AND total stable → "Steady — maintaining"
   - Q1 increasing OR total increasing → "Falling behind — items accumulating faster than resolution"

The report_builder.py handles the actual trend section generation and frontmatter fields. When 3+ reports exist, it adds `trend`, `trend_window`, and `velocity` to the YAML frontmatter.

---

## Step 8: Update Cache

After any scan (L1-L4), update `~/.claude/skills/task-radar/cache/last-run.json`:

```json
{
  "last_run": "{ISO timestamp}",
  "last_report": "reports/task-radar/rd-{NNN}-{date}-{slug}.md",
  "layer": "{L1|L2|L2+L3|L4}",
  "project_path": "{$PROJECT_PATH}",
  "items_count": {total},
  "q1_count": {n},
  "q2_count": {n},
  "q3_count": {n},
  "q4_count": {n}
}
```

## Step 9: Interactive Report Update

**Triggered by:** `update` argument.

Quick workflow for marking radar items as completed after a work session, without running a full rescan.

### Step 9.1: Load Latest Report

Read the most recent report:
```
Glob: reports/task-radar/rd-*.md → find latest by filename sort
```

If no report exists: "No task-radar report found. Run `/task-radar deep` first."

Parse all active items from the Eisenhower Matrix tables (Q1-Q4). Each item gets an index number for selection.

### Step 9.2: Display Items for Update

Present all active items grouped by quadrant with selection numbers:

```
### Task Radar — Update Mode
Report: reports/task-radar/rd-{NNN}-{date}-{slug}.md

Active items ({total}):

Q1: DO NOW
  [1] Living-docs: 8 specs unbuilt (25% → ?)
  [2] Multiverse Navigator brainstorm (15% → ?)

Q3: AUTOMATE
  [3] Smoke-test web-extract (5% → ?)
  [4] Test /memory skill (70% → ?)
  [5] Social Media Auto-Post Brainstorm (10% → ?)

Q4: REVIEW
  [6] Ship companion modes (65% → ?)
  [7] Multiple companion agents (0% → ?)
  ...

Actions:
  done <numbers>     — Mark items as completed (e.g., "done 3 4 7")
  progress <n> <%%>  — Update completion % (e.g., "progress 1 50")
  resolve <numbers>  — Mark as resolved/no longer relevant
  drop <numbers>     — Remove from radar entirely
  quit               — Save and exit
```

Use `AskUserQuestion` to get user input. Support multiple commands in one response (e.g., "done 3 4, progress 1 50").

### Step 9.3: Process Updates

For each action:

**done:** Move item from its quadrant table to the "Completed This Session" section. Set completion to 100%.

**progress:** Update the completion % in the item's row. If completion >= 95%, suggest marking as done.

**resolve:** Move item to the "Resolved" section with reason "Manually resolved via /task-radar update". Different from "done" — resolved means no longer relevant, not completed.

**drop:** Remove item from the report entirely. Add to a "Dropped" section with timestamp. Use sparingly — prefer "resolve" for audit trail.

Allow multiple rounds of input until user types "quit" or "done" (with no numbers = save and exit).

### Step 9.4: Update Report File

1. Rewrite the report file with:
   - Updated frontmatter counts (total_items, q1_count, etc.)
   - Add `updated_at: "{ISO timestamp}"` to frontmatter
   - Increment `completed_this_session` count
   - Move completed/resolved/dropped items to their respective sections
   - Recalculate quadrant tables (remove moved items, renumber)

2. Update `cache/last-run.json` with new counts.

3. Display summary:
```
Task Radar — Updated
  Completed: {n} items
  Progress updated: {n} items
  Resolved: {n} items
  Dropped: {n} items
  Remaining: {total} active items (Q1: {n}, Q2: {n}, Q3: {n}, Q4: {n})
Report: reports/task-radar/rd-{NNN}-{date}-{slug}.md
```

### Step 9.5: Optional Verify After Update

After processing all updates, offer:
```
Run verification on remaining items? (y/n)
```

If yes: run Step 2.5 (Verification Pass) on the remaining active items to catch any other items that may have been resolved by the work that completed the "done" items.

---

## Step 10: Noted Mode (Sticky Notes)

**Triggered by:** any argument starting with `note` (catches both `note` and `noted`).

The "note" system (formerly "noted", alias still works) is a quick-capture mechanism for brain dumps, ideas, tasks, and transcript excerpts.
Items are stored in Omni-Cortex with tags `task-radar-noted,noted,task-radar,sticky-note` and automatically surface in L1-L4 reports.

**Design principle:** Keep it FAST. The user is in the middle of something and doesn't want to derail.
One-line confirmation, then back to work.

### Step 10.0: Parse Note Sub-Command

Parse `$ARGUMENTS` after removing "note" or "noted" prefix:
- Remaining text starts with "extract" → Step 10.2
- Remaining text is "list" → Step 10.3
- Remaining text is "clear" → Step 10.4
- Remaining text is "recap" → Step 10.5
- Remaining text starts with "promote" → Step 10.6
- Remaining text starts with "update" → Step 10.8 (Update Existing Note)
- Anything else (or just text) → Step 10.1 (Quick Sticky Note)

**Natural language detection for updates:** If the user says "update the task radar note about X" or "update that note" or "modify the note regarding X", route to Step 10.8 even without the explicit "update" keyword. Look for patterns: "update the note", "update that note", "modify the note", "change the note", "edit the note".

### Step 10.1: Quick Sticky Note (`note <text>`)

1. **Cross-reference check** — search Cortex for duplicates:
   ```bash
   cortex recall "<first 80 chars of text>" --limit 3 --json 2>/dev/null
   ```
   Parse JSON output. If any result has >80% content similarity to the input text, tell user:
   ```
   Already tracked in mem_XXX: "<title snippet>"
   ```
   And stop. Do NOT store a duplicate.

2. **Store the note** (with ALL normalized tags for triple-tag search compatibility):
   ```bash
   cortex remember "<full text>" --tags task-radar-noted,noted,task-radar,sticky-note --importance 60
   ```
   Capture the returned memory ID.

3. **Quick Eisenhower classification** — keyword heuristics:
   - Urgency keywords (urgent, asap, today, blocking, fix, broken, bug) → urgency +30
   - Importance keywords (architecture, security, client, Ralph, demo, production) → importance +20
   - Default: importance 50, urgency 30 → Q2 (Schedule)
   - Apply quadrant rules from `references/eisenhower-classification.md`

4. **Effort estimation** — scan the note text for keywords:
   - `fix`, `check`, `verify`, `cleanup`, `update`, `confirm`, `delete`, `remove`, `test` → `effort:quick` (< 30 min)
   - `brainstorm`, `spec`, `redesign`, `build`, `rewrite`, `implement`, `migrate`, `architecture`, `refactor` → `effort:heavy` (2+ hrs)
   - Everything else → `effort:medium` (30 min - 2 hrs)

   Append the effort tag to the tags list. For example, if effort is quick, the final cortex command becomes:
   ```bash
   cortex remember "<full text>" --tags task-radar-noted,noted,task-radar,sticky-note,effort:quick --importance 60
   ```

5. **One-line confirmation:**
   ```
   [NOTED] Stored as mem_XXX (Q2: Schedule, effort:quick ~15min) — "first 60 chars of text..."
   ```

### Step 10.2: Extract Actionable Items (`noted extract <text or filepath>`)

1. **Input detection:**
   - If input ends in `.md`, `.txt`, `.json`, `.log`, or starts with a path separator: Read the file first
   - Otherwise: treat as inline text

2. **Parse for actionable items** — look for:
   - Imperative sentences ("Build X", "Fix Y", "Add Z")
   - "Need to", "should", "want to", "have to", "must"
   - Numbered/bulleted lists
   - Phrases after "TODO", "NEXT", "ACTION"
   - Quoted talking points with action implications

3. **For each extracted item:**
   ```bash
   # Cross-reference
   cortex recall "<item summary>" --limit 2 --json 2>/dev/null
   ```
   If already tracked → mark as "EXISTING" (don't re-store)
   If new → store (with ALL normalized tags):
   ```bash
   cortex remember "<item text>" --tags task-radar-noted,noted,task-radar,sticky-note,extracted --importance 60
   ```

4. **Summary table:**
   ```
   ## Extracted Items

   | # | Item | Status | Memory ID |
   |---|------|--------|-----------|
   | 1 | Build department selector for PO flow | NEW | mem_xxx |
   | 2 | Fix Vercel CDN cache | EXISTING | mem_yyy |
   | 3 | Seed Maxeda brand data | EXISTING | mem_zzz |
   | 4 | Add reference data lookup tables | NEW | mem_aaa |

   Extracted: 4 items | Already tracked: 2 | New items stored: 2
   ```

### Step 10.3: Show Pending Notes (`note list`)

1. **Query Cortex (TRIPLE-TAG SEARCH — CRITICAL):**
   Query Cortex THREE times using `cortex_list_memories` MCP to catch all tag formats:
   ```
   Query 1: tags_filter: ["task-radar-noted"], sort_by: "created_at", sort_order: "desc", limit: 50
   Query 2: tags_filter: ["noted", "task-radar"], sort_by: "created_at", sort_order: "desc", limit: 50
   Query 3: tags_filter: ["sticky-note"], sort_by: "created_at", sort_order: "desc", limit: 50
   ```
   Merge results. Deduplicate by memory ID. This is required because notes are stored with different tag combinations depending on whether the user invoked `/task-radar note` directly or said "save as a task radar note" via voice.

2. **Filter out resolved:** Exclude memories that ALSO have tag `resolved`

3. **Classify each** using Step 10.1's keyword heuristics (including effort estimation)

4. **Display in Eisenhower format** (same compact table as L1 Step 1.6):
   ```
   ## Noted Items ({count} pending)

   +----------------------------------+----------------------------------+
   |  Q1: DO NOW ({count})            |  Q2: SCHEDULE ({count})          |
   |  [NOTED] Fix CDN cache  [85u]    |  [NOTED] Ref data tables [60i]   |
   +----------------------------------+----------------------------------+
   |  Q3: DELEGATE ({count})          |  Q4: REVIEW ({count})            |
   |  [NOTED] Print specs   [55u]     |  [NOTED] Old idea X     [30i]   |
   +----------------------------------+----------------------------------+

   /task-radar note clear — remove completed | /task-radar note promote <keyword> — promote to spec
   ```

5. **Session Planning** — group items by effort tag and recommend session types:

   ```
   ### Session Planning

   **Housekeeping** (N quick items, ~X hrs total)
   - Item 1 (~15 min)
   - Item 2 (~20 min)
   -> Knock these out between builds or during housekeeping terminal sessions

   **Build Session** (N heavy items, ~X hrs total)
   - Item 3 (~3 hrs)
   - Item 4 (~2 hrs)
   -> Dedicate a focused build session for these

   **Fix Session** (N medium items, ~X hrs total)
   - Item 5 (~45 min)
   -> Targeted bug fix or improvement session
   ```

   Effort time estimates: `effort:quick` = 15 min, `effort:medium` = 1 hr, `effort:heavy` = 3 hrs.
   For items without an effort tag, classify using the keyword heuristics from Step 10.1.

### Step 10.4: Clear Completed Notes (`noted clear`)

1. **Query all noted items:**
   ```
   cortex_list_memories: tags_filter ["task-radar-noted"], limit 100
   ```

2. **Cross-reference against completion signals:**
   - `specs/done/**/*.md` — if note matches a completed spec title
   - Recent git commits — `git log --oneline -50` — if note matches commit message
   - Handoff COMPLETED sections — recent handoff memories
   - Items also tagged `resolved` already

3. **For matched items:**
   ```bash
   cortex update <id> --tags task-radar-noted,resolved
   ```

4. **Report:**
   ```
   Noted Items Cleanup
     Cleared: {n} items (matched completed work)
     Remaining: {k} items still pending
   ```
   List each cleared item with what it matched against.

### Step 10.5: Summarize Themes (`noted recap`)

1. **Query all pending noted items** (same as Step 10.3)

2. **Group by theme** — cluster related notes by keywords/topics:
   - PO-related notes
   - AWCL/artwork-related notes
   - Infrastructure notes
   - Analytics notes
   - UI/UX notes
   - etc.

3. **Identify patterns:**
   - "3 notes about reference data management"
   - "2 notes about Maxeda integration"

4. **Recommend next action per theme:**
   - Theme has 3+ related notes → suggest `/brainstorm` session
   - Theme has 1-2 clear actionable items → suggest `/quick-plan`
   - Theme is a single small task → suggest "just do it" (immediate action)

5. **Output as narrative:**
   ```
   ## Noted Items Recap ({total} items, {themes} themes)

   ### Theme 1: Reference Data Management (3 notes)
   - Supplier code lookup tables
   - Port/DC code mappings
   - Department field missing from Product Master
   Recommendation: /brainstorm — these form a cohesive feature set

   ### Theme 2: PO Dashboard Fixes (2 notes)
   - Console error on dashboard tab
   - Field name mismatches
   Recommendation: Just fix it — both are quick bug fixes

   ### Uncategorized (1 note)
   - Random idea about voice agent
   Recommendation: /task-radar noted promote "voice agent" if still relevant
   ```

### Step 10.6: Promote to Full Task (`noted promote <id or keyword>`)

1. **Find the note:**
   - If input looks like a memory ID (starts with `mem_`): `cortex get <id>`
   - Otherwise: `cortex recall "<keyword>" --tags task-radar-noted --limit 3 --json`
   - If multiple matches: show options and ask user to pick

2. **Full Eisenhower classification:**
   - Apply the complete scoring from `references/eisenhower-classification.md` (not just keyword heuristics)
   - Calculate importance (0-100) and urgency (0-100)
   - Assign quadrant

3. **Complexity assessment:**
   - If importance > 70 AND estimated effort > 4 hours → suggest `/brainstorm`
   - If importance > 50 AND clear scope → suggest `/quick-plan "<note text>"`
   - If importance < 50 → suggest keeping as-is or archiving

4. **Update Cortex memory:**
   ```bash
   cortex update <id> --tags task-radar-noted,promoted --importance <new_score>
   ```

5. **Output:**
   ```
   Promoted: "Reference data lookup tables"
     Quadrant: Q1 (Do Now) — Importance: 75, Urgency: 80
     Recommendation: /quick-plan "Reference data management — admin CRUD for supplier codes, port/DC codes, department mapping. Blocks Maxeda PO conversion."
   ```

---

### Step 10.8: Update Existing Note (`note update <keyword or id> <new info>`)

**Also triggered by natural language:** "update the task radar note about X", "update that note regarding X", "modify the note about X", "the note about X — add this: Y"

1. **Find the note to update:**
   - If input contains a memory ID (starts with `mem_`): `cortex get <id>`
   - Otherwise: extract the topic keyword and search:
     ```bash
     cortex recall "<keyword>" --tags task-radar-noted --limit 5 --json
     ```
   - If multiple matches: show options and ask user to pick
   - If single match: confirm with user ("Updating note: '<title snippet>' — correct?")

2. **Determine update type:**
   - **Append:** User is adding new info to existing note → append to content
   - **Status change:** User says "resolved", "done", "completed" → add `resolved` tag
   - **Replace:** User provides entirely new content → replace content
   - **Priority change:** User says "this is now urgent" or "deprioritize this" → adjust importance

3. **Apply update via CLI:**
   ```bash
   # For content updates:
   cortex update <id> --content "<original content>\n\n[UPDATE {date}]: <new info>"
   
   # For status changes:
   cortex update <id> --tags task-radar-noted,noted,task-radar,sticky-note,resolved
   
   # For importance changes:
   cortex update <id> --importance <new_score>
   ```

4. **Output:**
   ```
   Updated: "Reference data lookup tables" (mem_XXX)
     Change: Appended update — "Eva confirmed port codes are correct"
     Status: active | Importance: 65 | Quadrant: Q2
   ```

5. **If the update resolves the note:** Also suggest running `/task-radar note clear` to clean up.

---

## Step 10.7: Noted Items Integration with L1-L4

**IMPORTANT:** When ANY layer (L1, L2, L3, L4) runs, it MUST also gather noted items.

Add this step to **Step 1.2** (L1), **Step 2.1** (L2), and **Step 4.3** (L4) — right after gathering other items:

**CRITICAL: Triple-tag search for noted items.** Query Cortex THREE times to catch all tag formats:

```bash
# Query 1: composite tag
NOTED_1=$(cortex list --tags task-radar-noted --json 2>/dev/null)
# Query 2: separate tags (Tony's voice pattern)
NOTED_2=$(cortex list --tags noted,task-radar --json 2>/dev/null)
# Query 3: sticky-note tag
NOTED_3=$(cortex list --tags sticky-note --json 2>/dev/null)

# Merge + deduplicate by memory ID, filter out resolved
NOTED_ITEMS=$(python3 -c "
import sys, json
all_items = []
for raw in ['''$NOTED_1''', '''$NOTED_2''', '''$NOTED_3''']:
    try: all_items.extend(json.loads(raw))
    except: pass
seen = set()
pending = []
for i in all_items:
    if i['id'] not in seen and 'resolved' not in i.get('tags', []):
        seen.add(i['id'])
        pending.append(i)
for i in pending:
    print(json.dumps({'title': '[NOTED] ' + i['content'][:80], 'source': i['id'], 'type': 'noted', 'importance': i.get('importance_score', 60), 'tags': i.get('tags', [])}))
" 2>/dev/null)
```

This is required because notes are stored with different tag combinations depending on whether the user invoked `/task-radar note` directly or said "save as a task radar note" via voice.

- Add these to the item collection with `[NOTED]` prefix in the title
- Classify using the same Eisenhower rules as other items
- They appear in the matrix alongside specs, handoff items, and brainstorms
- In the report, noted items are distinctly marked so the user can see what came from brain dumps vs structured sources

---

## Step 11: Defer Item (`defer <#>`)

**Purpose:** Bump an item down within its quadrant so it doesn't keep showing up at the top of the list when the user wants to focus on other priorities.

**Usage:** `/task-radar defer 3` (defers item #3 from the latest report's Q1 table)

### Step 11.1: Identify the Item

1. Read the latest report (`reports/task-radar/rd-*.md`, highest number)
2. Parse the Q1-Q4 tables to find item number `<#>` (numbering is sequential across all quadrants: Q1 items first, then Q2, Q3, Q4)
3. If `<#>` doesn't match any item, show error: "Item #X not found. Run `/task-radar quick` to see current items."

### Step 11.2: Update Item Ledger

1. Read `reports/task-radar/.item-ledger.yaml`
2. Find the matching entry (fuzzy match on title, >80% similarity)
3. Increment `defer_count` by 1
4. Set `last_deferred_date` to today's date
5. Write updated ledger

### Step 11.3: Confirm and Show Effect

Display:
```
Deferred: "{item title}" (defer count: {N})
Effect: urgency penalty -{penalty} → item moves down in {quadrant}
{If penalty drops item to lower quadrant: "Item will move from Q1 to Q2 on next report"}
Decay: defer resets after 7 days of no further defers
```

**Note:** The defer only takes effect on the NEXT report generation. It does not modify the existing report file. The item ledger persists the defer count, and Step 1.4 reads it during classification.

---

## Report Format

Display a summary after scan completion:

```
Task Radar — {Project Name}
Layer: {$LAYER} | Items: {total} (Q1: {n}, Q2: {n}, Q3: {n}, Q4: {n})
Report: reports/task-radar/rd-{NNN}-{date}-{slug}.md

[Compact Eisenhower table]

Run /task-radar deep for full analysis | /task-radar prune for Q4 cleanup
```
