---
description: End session with structured context handoff to Omni-Cortex memory
argument-hint: "[combine] [--audio]"
allowed-tools: mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_get_session_context, TodoWrite, Bash, Skill
---

# Session Handoff

Create a structured handoff memory for seamless continuation in the next terminal session.

## Purpose

Replace the manual "store everything before context runs out" prompt with a single command that:
1. Captures current work state
2. Stores it in Omni-Cortex memory with high importance
3. Ends the session properly
4. Provides a simple continuation prompt

Supports:
- Default: Create handoff for current session only
- `combine`: Merge current session with previous handoff (for multi-session workflows)

## Instructions

### Step 0: Parse Arguments

Check `$ARGUMENTS` for:
- Empty or no args → Create standalone handoff for current session
- "combine" (anywhere in args) → Retrieve most recent handoff and merge with current session context
- "--audio" (anywhere in args) → Set `audio_requested = true`; audio generation will run at Step 5.7

**Valid combinations (order does not matter):**
- `/handoff` — standalone, no audio
- `/handoff --audio` — standalone with audio
- `/handoff combine` — combined, no audio
- `/handoff combine --audio` or `/handoff --audio combine` — combined with audio

Parse by scanning all tokens in `$ARGUMENTS`. Any token matching "combine" sets combine mode; any token matching "--audio" sets audio mode. Both flags can be present simultaneously.

### Step 0.5: Calculate Session Duration

Calculate session duration for inclusion in the handoff memory:

1. **Read command history** for the most recent `/pickup` entry for this project:
   ```bash
   grep '"cmd":"pickup"' ~/.claude/stats/command-history.jsonl 2>/dev/null | tail -1 | grep -oP '"ts":"[^"]*"' | sed 's/"ts":"//;s/"//'
   ```
2. Calculate time delta between that pickup timestamp and current time (handoff time)
3. Store as `$SESSION_DURATION` in `{Xh Ym}` format (e.g., "4h 22m")
4. If no pickup entry found (session started without /pickup), use Omni-Cortex session start time
5. If neither available, set `$SESSION_DURATION` to "N/A"

### Step 0.6: Compute MST Timestamp

Convert the current time to MST/MDT for inclusion in the handoff memory:
- During US DST (March–November): MDT = UTC-6
- Outside DST: MST = UTC-7
- Store both ISO and human-readable formats:
  ```
  $HANDOFF_TIME_ISO = 2026-04-03T22:25:00-06:00
  $HANDOFF_TIME_MST = 2026-04-03 10:25 PM MST
  ```

### Step 0.7: Find Latest Task Radar Report Path

```bash
ls -1 reports/task-radar/rd-*.md 2>/dev/null | sort | tail -1
```
Store as `$LATEST_RADAR` for inclusion in the handoff memory.

### Step 1: Gather Context

Review the current conversation to identify:
- What task/feature we were working on
- What was completed
- What is still in progress
- What the next steps are
- Any blockers, errors, or important decisions
- Key files that were modified or are relevant

### Step 1.5: Detect Roadmap Progress (if applicable)

Check if the session involves a roadmap-based multi-spec project:

1. Look for `specs/roadmaps/ROADMAP-*.md` files via Glob
2. If a roadmap exists AND the session involved building specs:
   - Read the roadmap to extract all phases and their spec lists
   - Check `specs/done/` (recursively, including project subfolders) and `specs/todo/` to determine completion status per phase
   - Build a PROJECT PROGRESS block for inclusion in the handoff memory (Step 4)

**Phase status rules:**
- **Done** = ALL specs in that phase are found in `specs/done/` (or its project subfolders)
- **In Progress** = SOME specs in that phase are found in `specs/done/` (or its project subfolders), others in `specs/todo/`
- **Next** = First phase where NO specs are found in `specs/done/` (only one phase gets "Next")
- **Pending** = All remaining phases after "Next"

**Format for the memory content:**
```
PROJECT PROGRESS: [X/total specs complete]
Phase 1 (sequential): [Done|In Progress|Next|Pending] — Specs 01, 02
Phase 2 (parallel x3): [Done|In Progress|Next|Pending] — Specs 03, 04, 05
Phase 3 (parallel x3): [Done|In Progress|Next|Pending] — Specs 06, 07, 08
...
```

This section goes between BLOCKERS/NOTES and SYSTEM HEALTH in the handoff memory.

### Step 1.7: Detect ADW Build Queue

Check if the project has ADW infrastructure and pending specs that can be built via ADW pipelines.

**Gate:** If `adws/configs/` does NOT exist in the project root, skip this step entirely.

**Detection procedure:**

1. **Find pending specs:** Glob `specs/todo/**/*.md` (recursively, including project subfolders)
2. **Extract ADW config per spec:** For each pending spec, grep for `## ADW Pipeline` section. If found, extract:
   - `recommended_config`: the YAML filename (e.g., `standard.yaml`)
   - `command`: the full `uv run adws/run_adw.py ...` command
   - If no `## ADW Pipeline` section exists in a spec, default to `standard.yaml` and construct the command
3. **Cross-reference with roadmap:** If Step 1.5 detected a roadmap:
   - Map each spec to its phase in the roadmap
   - Determine which phase is "Next" (first phase with unbuilt specs)
   - Carry over execution tags (SEQUENTIAL / PARALLEL) from the roadmap
   - For PARALLEL phases, assign `--port-offset` values (0, 1, 2...) to each spec
4. **Standalone specs** (not in any roadmap): Group separately as "Unphased" — can run immediately, default SEQUENTIAL
5. **Build the ADW BUILD QUEUE block** for inclusion in the handoff memory (Step 4)

**Format for the memory content:**

```
ADW BUILD QUEUE: {N} specs ready
Next Phase: {phase name} ({SEQUENTIAL|PARALLEL xN})
  uv run adws/run_adw.py --config adws/configs/{config}.yaml --spec {spec-path} [--port-offset N]
  uv run adws/run_adw.py --config adws/configs/{config}.yaml --spec {spec-path} [--port-offset N]
Blocked:
  Phase {N}: {spec list} (blocked by Phase {N-1})
  Phase {N+1}: {spec list} (blocked by Phase {N})
```

**Rules:**
- Only include specs from `specs/todo/` (not `specs/done/`)
- "Next Phase" = the first phase with actionable specs (no unresolved dependencies)
- "Blocked" = phases that depend on incomplete earlier phases
- For specs in the Next Phase with PARALLEL execution tag, include `--port-offset` for each
- If ALL specs are in one phase (no dependencies), skip the "Blocked" section
- If a roadmap has multiple workstreams (multiple `ROADMAP-*.md` files with pending specs), show queues for each workstream

**Display (in handoff output):** Also render the queue as a visible section in the handoff output (Step 6 area):

```
### ADW Build Queue

**{N} specs ready** | Pipeline: adws/run_adw.py

**Run now** (Phase 1 — PARALLEL x2):
```bash
uv run adws/run_adw.py --config adws/configs/standard.yaml --spec specs/todo/project/01-feature.md --port-offset 0
uv run adws/run_adw.py --config adws/configs/standard.yaml --spec specs/todo/project/04-other.md --port-offset 1
```
Or: `/agent-teams specs/roadmaps/ROADMAP-project.md phase-1`

**After Phase 1** (Phase 2 — SEQUENTIAL):
```bash
uv run adws/run_adw.py --config adws/configs/standard.yaml --spec specs/todo/project/02-next.md
```

**After Phase 2** (Phase 3 — PARALLEL x2):
```bash
uv run adws/run_adw.py --config adws/configs/standard.yaml --spec specs/todo/project/03-output.md --port-offset 0
uv run adws/run_adw.py --config adws/configs/standard.yaml --spec specs/todo/project/05-tracking.md --port-offset 1
```
```

This gives the next session copy-pasteable commands for the entire build queue.

### Step 2: Retrieve Previous Handoff (if combining)

If `$ARGUMENTS` contains "combine":

Use `cortex_list_memories` with:
- `tags_filter`: ["handoff"]
- `sort_by`: "created_at"
- `sort_order`: "desc"
- `limit`: 1

This gets the most recent handoff to merge context from.

### Step 3: Check for Existing Handoffs (for format consistency)

**CLI pre-fetch** — retrieve format reference without consuming MCP context:
```bash
(cortex recall "handoff session-summary" --limit 1 --json 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- recall "handoff session-summary" --limit 1 --json 2>/dev/null) | head -c 500
```
Read the CLI output briefly to match the format of previous handoffs. If both CLI invocations fail, fall back to `cortex_recall` MCP.

### Step 3.5: Gather System Health Data

If `reports/self-heal/` exists and contains `sh-*.md` reports:
- Read the most recent `sh-*.md` report (by filename sort, highest NNN)
- Extract from YAML frontmatter: `composite_score` (or `health_score` for old reports), `trend`, `date`, `report_number`, `top_patterns`
- Store for inclusion in Step 4's handoff memo (SYSTEM HEALTH section)
- If no reports exist, skip this section entirely

### Step 4: Create Handoff Memory

**CLI (fire-and-forget storage)** — use `cortex remember` via Bash instead of MCP `cortex_remember`. This saves ~3-5KB context per call since the LLM doesn't need the memory ID in-context for reasoning.

```bash
cortex remember "HANDOFF_CONTENT_HERE" --tags handoff,session-summary,continuation,PROJECT_NAME --importance 90 --json 2>/dev/null || \
python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- remember "HANDOFF_CONTENT_HERE" --tags handoff,session-summary,continuation,PROJECT_NAME --importance 90 --json 2>/dev/null
```

Capture the memory ID from the CLI output for use in Step 4.5 (linking):
```bash
HANDOFF_ID=$( (cortex remember "HANDOFF_CONTENT_HERE" --tags handoff,session-summary,continuation,PROJECT_NAME --importance 90 --json 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- remember "HANDOFF_CONTENT_HERE" --tags handoff,session-summary,continuation,PROJECT_NAME --importance 90 --json 2>/dev/null) | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))")
```

If both CLI invocations fail (package not installed), fall back to MCP `cortex_remember` as last resort.

**Content structure (standalone):**
```
[Project/Feature Name] Session Handoff - [YYYY-MM-DD]

SESSION_DURATION: {Xh Ym}
HANDOFF_TIME: {ISO 8601 with timezone offset, e.g., 2026-04-03T22:25:00-06:00}
HANDOFF_TIME_MST: {YYYY-MM-DD h:mm PM MST}
LATEST_RADAR: {path to latest task radar report, e.g., reports/task-radar/rd-018-2026-04-02-surity-deep.md}

CONTEXT:
[1-2 sentences: What we were working on and why]

COMPLETED:
- [Item 1]
- [Item 2]
- ...

IN PROGRESS:
- [Item with current state/status]
- ...

NEXT STEPS:
[See rd-{NNN} Predicted Actions for full priority queue]
- [Session-specific items NOT already in the task radar report]
- [Items that emerged this session but haven't been captured in a radar report yet]

KEY FILES:
- [path/to/file1] - [brief description]
- [path/to/file2] - [brief description]

BLOCKERS/NOTES:
- [Any issues, decisions, or context the next session needs]

NEW_ITEMS_NOT_IN_RADAR: (include only if session produced items not yet in a task radar report)
- {item title} -> {runnable command or "manual code fix in {repo}"} [{effort estimate}]
- {item title} -> {command mapping} [{effort estimate}]

PROJECT PROGRESS: (include only if roadmap detected from Step 1.5)
[X/total] specs complete
Phase 1 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
Phase 2 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
...

ADW BUILD QUEUE: (include only if ADW detected from Step 1.7)
{N} specs ready
Next Phase: {phase name} ({SEQUENTIAL|PARALLEL xN})
  {uv run commands with --config and --spec and --port-offset}
Blocked:
  {blocked phase commands}

SYSTEM HEALTH: (include only if self-heal reports exist from Step 3.5)
- Self-Heal Score: {composite_score}/100 ({trend})
- Last run: {date} (Report: sh-{NNN})
- Top issue: {first item from top_patterns}

BRAIN SUMMARY: (include only if brain was available from Step 4.55b)
- Session pulses: {pulse_count}
- Actions taken: {actions_taken}
- Recommendations queued: {recommendations_queued}
- Journal: {journal filename}

SIBLING TERMINALS: (include only if more than 1 terminal registered, from Step 4.55b)
{terminal_id} | PID {pid} | {project_path} | {owner/active}
```

**Content structure (combined with previous handoff):**
```
[Project/Feature Name] Combined Session Handoff - [YYYY-MM-DD]

SESSION_DURATION: {Xh Ym}
HANDOFF_TIME: {ISO 8601 with timezone offset}
HANDOFF_TIME_MST: {YYYY-MM-DD h:mm PM MST}
LATEST_RADAR: {path to latest task radar report}

CONTEXT:
[Merge context from previous handoff AND current session - explain the full arc of work]

COMPLETED (Sessions 1-2):
Session 1:
- [Items from previous handoff's COMPLETED]

Session 2 (Current):
- [Items completed in this session]

IN PROGRESS:
- [Merge IN PROGRESS from previous handoff with current work]
- [Note which items carried over vs. new items]

NEXT STEPS:
1. [Prioritized list combining both sessions' next steps]
2. [Remove duplicates, update based on progress]

KEY FILES:
- [Combined list from both sessions, removing duplicates]

BLOCKERS/NOTES:
- [Any unresolved blockers from Session 1]
- [New blockers/notes from Session 2]

PROJECT PROGRESS: (include only if roadmap detected from Step 1.5)
[X/total] specs complete
Phase 1 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
Phase 2 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
...

ADW BUILD QUEUE: (include only if ADW detected from Step 1.7)
{N} specs ready
Next Phase: {phase name} ({SEQUENTIAL|PARALLEL xN})
  {uv run commands with --config and --spec and --port-offset}
Blocked:
  {blocked phase commands}

SYSTEM HEALTH: (include only if self-heal reports exist from Step 3.5)
- Self-Heal Score: {composite_score}/100 ({trend})
- Last run: {date} (Report: sh-{NNN})
- Top issue: {first item from top_patterns}

BRAIN SUMMARY: (include only if brain was available from Step 4.55b)
- Session pulses: {pulse_count}
- Actions taken: {actions_taken}
- Recommendations queued: {recommendations_queued}
- Journal: {journal filename}

SIBLING TERMINALS: (include only if more than 1 terminal registered, from Step 4.55b)
{terminal_id} | PID {pid} | {project_path} | {owner/active}
```

**Parameters:**
- `importance`: 90-95 (high priority for recall)
- `tags`: ["handoff", "session-summary", "continuation", "<project-name>"]
- `type`: "context"

### Step 4.5: Auto-Link Knowledge Graph

After creating the handoff memory, automatically link it to related memories:

1. Use `cortex_list_memories` with `tags_filter: ["handoff"]`, `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 2` to find the previous handoff for this project (the second result is the previous handoff, since the first is the one just created)
2. **CLI (fire-and-forget linking):** If a previous handoff is found (i.e., 2 results returned):
   ```bash
   (cortex link "$HANDOFF_ID" "$PREV_HANDOFF_ID" 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- link "$HANDOFF_ID" "$PREV_HANDOFF_ID" 2>/dev/null) || true
   ```
3. **CLI:** Search for related spec memories and link them:
   ```bash
   # Find related specs via CLI pre-fetch
   RELATED=$(cortex recall "TASK_OR_FEATURE_NAME" --limit 3 --json 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- recall "TASK_OR_FEATURE_NAME" --limit 3 --json 2>/dev/null)
   ```
   Then link individually if IDs are known:
   ```bash
   (cortex link "$HANDOFF_ID" "$SPEC_MEM_ID" 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- link "$HANDOFF_ID" "$SPEC_MEM_ID" 2>/dev/null) || true
   ```
5. **Handle linking failures gracefully:**
   - If `cortex_link_memories` returns a "not found" error, include in the handoff output which links failed and why (e.g., "Failed to link to mem_xxx: not found in current project database")
   - Cross-project linking is not yet supported — if the previous handoff was created in a different project context, linking will fail with a "not found" error. This is expected until Spec 07 (Cross-Project Relationships) is implemented.
   - Do NOT treat linking failures as blocking errors — the handoff memory itself is already created and valid

### Step 4.5b: Archive Previous Handoff (Zombie Prevention)

**Purpose:** Prevent old handoff NEXT STEPS from being re-mined by /task-radar and /pickup, which causes "zombie items" (resolved tasks reappearing in later reports).

If a previous handoff was found in Step 4.5 (i.e., `$PREV_HANDOFF_ID` is set):

1. **Archive the previous handoff:**
   ```bash
   cortex update "$PREV_HANDOFF_ID" --status archived 2>/dev/null || true
   ```
   This transitions the old handoff from `fresh` to `archived`, signaling to task-radar and pickup that its NEXT STEPS have been superseded by the new handoff.

2. **Update resolution registry** (if `reports/task-radar/.resolution-registry.yaml` exists):
   - Add `$PREV_HANDOFF_ID` to `processed_sources.handoff_ids` to prevent re-mining
   - For any NEXT STEPS from the previous handoff that are now in the new handoff's COMPLETED section, add them to `resolved_items` with `permanent: false`

3. **Handle gracefully:** If the update fails (Cortex unavailable, memory not found), log a warning but do not block the handoff.

**Why this matters:** Without archival, all handoffs stay `status: "fresh"` indefinitely. Task radar mines up to 20 fresh handoffs for NEXT STEPS, re-surfacing items that were completed sessions ago.

### Step 4.55: Version Awareness

After storing the handoff memory, check if any memories updated during this session have version history:

1. **CLI (fire-and-forget version check):** For the handoff memory just created and any linked memories:
   ```bash
   (cortex get "$HANDOFF_ID" --json 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- get "$HANDOFF_ID" --json 2>/dev/null) | python3 -c "import sys,json; d=json.load(sys.stdin); v=d.get('version_count',0); print(f'Versions: {v}') if v>1 else None"
   ```
2. If any have version count > 1, add a line to the handoff output:
   ```
   Memories with version history: {id1} ({N} versions), {id2} ({N} versions)
   Run `/memory history <id>` to see how they evolved.
   ```
3. If no version history exists on any, skip this output silently.

### Step 4.55b: Finalize Breathing Brain

Deregister the terminal from the brain and finalize the brain journal. This step is fail-open — if the brain is not running or not installed, skip gracefully.

1. **Finalize brain journal:**
   ```bash
   python3 -c "
import sys, os, json
sys.path.insert(0, os.path.expanduser('~/.claude/scripts/lib'))
try:
    from brain_journal import BrainJournal, save_journal_dual, get_previous_journal, GLOBAL_DIR
    from brain_state import BrainState
    bs = BrainState()
    acc = bs.get_accumulator()
    owner = bs.get_brain_owner()
    terminals = bs.list_terminals()
    prev_path, prev_fm = get_previous_journal(GLOBAL_DIR)
    journal = BrainJournal(
        project=os.path.basename(os.getcwd()),
        session_id='handoff',
        terminals_active=len(terminals),
        brain_owner=owner.get('terminal_id','') if owner else '',
    )
    journal.close()
    paths = save_journal_dual(journal, os.getcwd())
    print(json.dumps({
        'journal': paths.get('global', paths.get('project', '')),
        'pulse_count': acc.get('pulse_count_session', '0'),
        'actions_taken': str(len(journal.actions)),
        'recommendations_queued': str(len(journal.recommendations)),
    }, default=str))
except Exception as e:
    print(json.dumps({'error': str(e)}))
" 2>/dev/null || echo '{"error":"brain not available"}'
   ```

2. **Deregister terminal:**
   ```bash
   python3 -c "
import sys, os
sys.path.insert(0, os.path.expanduser('~/.claude/scripts/lib'))
from brain_state import BrainState
tid_file = os.path.expanduser('~/.claude/breathing-brain/terminal-id.txt')
if os.path.exists(tid_file):
    tid = open(tid_file).read().strip()
    BrainState.deregister_terminal(tid)
    BrainState.clear_event_buffer(tid)
    print('DEREGISTERED: ' + tid)
else:
    print('NO_TERMINAL_ID')
" 2>/dev/null || echo "BRAIN_UNAVAILABLE"
   ```

3. **Gather sibling terminal info** for recording in the handoff:
   ```bash
   python3 -c "
import sys, os, json
sys.path.insert(0, os.path.expanduser('~/.claude/scripts/lib'))
from brain_state import BrainState
siblings = BrainState.list_sibling_terminals()
print(json.dumps(siblings))
" 2>/dev/null || echo '[]'
   ```

4. **Include BRAIN SUMMARY in handoff memory content** (add after SYSTEM HEALTH section in Step 4):

   ```
   BRAIN SUMMARY:
   - Session pulses: {pulse_count}
   - Actions taken: {actions_taken}
   - Recommendations queued: {recommendations_queued}
   - Journal: {journal filename}
   ```

   If sibling terminals exist (more than 1), add a SIBLING TERMINALS section after BRAIN SUMMARY:
   ```
   SIBLING TERMINALS:
   {terminal_id} | PID {pid} | {project_path} | {owner/active}
   {terminal_id} | PID {pid} | {project_path} | {owner/active}
   ```

   If brain was unavailable, omit both sections entirely.

### Step 4.6: End Session (Optional)

**CLI (fire-and-forget):** End the session via CLI instead of MCP:
```bash
cortex session end "$SESSION_ID" 2>/dev/null || python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- session end "$SESSION_ID" 2>/dev/null || true
```
If the session ID is not available (e.g., session was started in a previous conversation turn), this is a no-op — the session will auto-expire. The `python -m` fallback handles cases where `cortex` isn't on PATH.

### Step 4.7: Clear Middleware Cache

Clear the middleware cache for the current terminal session to prevent stale cached results from carrying over.

Run via Bash:
```bash
python hooks/clear_cache.py
```

**Important notes:**
- Run this from the project root directory (where `hooks/` lives)
- If the project has no `.omni-cortex/cortex.db` or no `middleware_cache` table, the script exits gracefully with `{"cleared": 0}`
- This is a fail-open operation — if it errors, log the error but continue the handoff
- Report the result briefly in the handoff output (e.g., "Middleware cache cleared (12 entries removed)")

### Step 5: Crystal Ball Nudge

After creating the handoff, analyze the session for Crystal Ball relevance:

1. Check if the session involved design decisions, architecture changes, or brainstorming:
   - Spec creation or updates
   - PLAN changes or phase restructuring
   - Architecture discussions or technology decisions
   - New integration points or dependency changes

2. If design-relevant activity detected, append a Crystal Ball recommendation to the output:
   ```
   Crystal Ball Suggestion:
   This session involved [design decisions / architecture changes / brainstorming].
   Consider running:
   - `/crystal-ball-delta today` — Check downstream effects of today's changes
   - `/crystal-ball-predict "<most significant decision>"` — Evaluate revision risk
   - `/crystal-ball-constraints` — Verify tech limits aren't violated
   ```

   Only include commands relevant to the session. Do not include all 3 every time:
   - If new specs created → suggest `/crystal-ball-matrix`
   - If decisions deferred → suggest `/crystal-ball-debt`
   - If old assumptions revisited → suggest `/crystal-ball-decay`

### Step 5.7: Audio Generation (Optional)

**Gate:** If `audio_requested` is false (no `--audio` flag in Step 0), skip this step entirely — no output, no log.

If `audio_requested` is true:

1. **Skill existence check:** Verify `~/.claude/skills/audio-message/SKILL.md` exists (Glob or Read).
   - If NOT found: display this warning and skip to Step 5.5:
     ```
     Warning: --audio flag passed but audio-message skill is not installed at
     ~/.claude/skills/audio-message/. Skipping audio generation.
     Run /build on spec 01-audio-message-skill.md to install it first.
     ```

2. **Prepare summary for audio:** Extract the CONTEXT, COMPLETED, IN PROGRESS, NEXT STEPS, and KEY FILES sections from the handoff content created in Step 4. Exclude SYSTEM HEALTH and PROJECT PROGRESS sections (metadata, not suitable for audio).

3. **Announce to user:**
   ```
   Handing off to audio-message skill to generate a voice briefing from this session summary...
   ```

4. **Invoke audio-message skill** via the `Skill` tool with `skill: "audio-message"`. The summary text from step 2 is present in the conversation context — the skill's L1 ingestion will pick it up as "current session" content.

5. **After audio-message completes** (or is cancelled by user): continue to Step 5.5.

**Design notes:**
- The handoff itself is already fully stored before this step runs. Audio is a bonus — if it fails or the user cancels, no data is lost.
- Do NOT implement any transcript review or TTS logic here. That is owned entirely by the audio-message skill.
- The `Skill` tool invocation passes control to audio-message for the full L1→L4 pipeline (or L1→L3 if user cancels before approval).

### Step 5.5: Quick Resume Prediction

Predict the single most likely next action for the next session. Uses the task radar report as the primary source instead of computing from scratch.

1. **Check latest task radar report** (from Step 0.7's `$LATEST_RADAR`):
   - If report exists and has a "Predicted Actions" section: use the #1 Q1 item as the prediction
   - If report exists but no Predicted Actions section: use the #1 Q1 item from the Eisenhower matrix
   - If no report exists: fall back to the first item in NEXT STEPS

2. **Analyze session-specific items** from NEXT STEPS and NEW_ITEMS_NOT_IN_RADAR (Step 4). If any session-specific item is higher priority than the radar's #1 Q1 item (e.g., a time-sensitive deadline), use that instead.

3. **Quick maintenance staleness check** (3 greps, ~1s):
   ```bash
   for CMD in self-heal crystal-ball retrospective; do
     grep "\"cmd\":\"$CMD\"" ~/.claude/stats/command-history.jsonl 2>/dev/null | tail -1
   done
   ```
   If any maintenance command is overdue AND more urgent than the #1 item, use it as the prediction.

3.5. **Resolve arguments for the #1 candidate**:
   - **Pass-through check:** If the candidate already has arguments (space after command name), skip.
   - **Registry lookup:** Find the command's `argument-hint`. If not found, skip.
   - **Gather context signals:** `roadmap_files` (Glob `specs/roadmaps/ROADMAP-*.md`), `next_steps_text` (from Step 4), `spec_files_todo` (Glob `specs/todo/*.md`), `project_tags` (from handoff tags), `last_command` (last history entry).
   - **Pattern matching on hint:** Apply the same resolution table as `/pickup` Step 4.5.3.5 (see Argument Resolution Reference at the bottom of this file).
   - **Compose:** Concatenate command + resolved args. If no match, keep bare command.

4. **Display as Quick Resume** at the bottom of the handoff output:

```
### Quick Resume
Next session, run:
  /time-report project specs/roadmaps/ROADMAP-scorm-skill.md
```

Arguments are resolved from session context using the registry (step 1.5) and the resolution table (step 3.5). If no arguments could be resolved, display the bare command:

```
### Quick Resume
Next session, run:
  /crystal-ball
```

If no command can be predicted (no NEXT STEPS, no history), skip this section.

### Step 6: Provide Continuation Prompt

Give the user this exact text to paste in their next terminal session:

```
Use /pickup to continue from the last session.
```

Or if they prefer manual control:

```
Use cortex_start_session with provide_context: true, then cortex_recall "handoff" to get the full context from last session.
```

## Example Usage

**Basic handoff** (current session only):
```
/handoff
```

**Combined handoff** (merge with previous session):
```
/handoff combine
```

**Handoff with voice briefing** (generates an MP3 from the session summary):
```
/handoff --audio
```

**Combined handoff with voice briefing:**
```
/handoff combine --audio
```

Use the "combine" option when:
- You worked on the same feature across multiple sessions
- You want to create a comprehensive handoff that spans multiple days
- You need to merge context from an incomplete previous handoff

## Example Output

After running `/handoff`, the user should see:

1. Confirmation that handoff memory was created (with memory ID)
2. The continuation prompt to copy
3. Any session end confirmation if applicable

## Notes

- This skill works across all projects (universal)
- Handoff memories are tagged for easy filtering
- High importance (90-95) ensures they surface in recall
- Use `/pickup` in the next session to retrieve this context
- **ALWAYS retrieves most recent handoff** when combining (sorted by creation time)
- `--audio` requires the `audio-message` skill installed at `~/.claude/skills/audio-message/`
- Audio generation is interactive — you review and approve the transcript before TTS runs
- The handoff itself always completes and is stored regardless of audio outcome (fail-open)

## Argument Resolution Reference

This section documents the shared resolution logic used by both `/handoff` (Step 5.5, step 3.5) and `/pickup` (Step 4.5.3.5).

### Discovery Paths

| Priority | Path | Type |
|----------|------|------|
| 1 (highest) | `{cwd}/.claude/skills/*/SKILL.md` | project-skill |
| 2 | `~/.claude/skills/*/SKILL.md` | global-skill |
| 3 | `~/.claude/commands/*.md` | global-command |
| 4 | `customSlashCommands` in settings.json files | settings-registered |

### Pattern Matching Table

| Hint Pattern | Context Signal | Resolution |
|-------------|---------------|------------|
| `<roadmap-path>` or `<roadmap-file>` | `roadmap_files` has entries | Most relevant roadmap path |
| `<path-to-plan>` or `[path-to-plan]` | `spec_files_todo` has entries | First/most relevant spec in todo/ |
| `<mem_ID>` or `mem_ID` | `handoff_memory_id` exists | The handoff memory ID |
| `<tag>` | `project_tags` has entries | Most specific project tag |
| `<error>` or `<query>` | `next_steps_text` has quoted text | Extracted quoted error/topic |
| `project` (mode keyword) | `roadmap_files` has entries | `project <roadmap-path>` |
| `quick \| deep \| weekly` (modes) | NEXT STEPS description | Mode matching description text |
| `<phase-number>` | `next_steps_text` mentions phase N | Extracted phase number |
| Pipe-separated sub-commands | `next_steps_text` mentions sub-command | The mentioned sub-command |

### Resolution Examples

| Command | Context | Resolved |
|---------|---------|----------|
| `/time-report` | Roadmap exists, NEXT STEPS says "time report on project" | `/time-report project specs/roadmaps/ROADMAP-scorm-skill.md` |
| `/build` | Spec `specs/todo/03-next-feature.md` exists | `/build specs/todo/03-next-feature.md` |
| `/scorm` | NEXT STEPS says "validate" | `/scorm validate` |
| `/agent-teams` | Roadmap exists, NEXT STEPS says "phase 4" | `/agent-teams specs/roadmaps/ROADMAP-feature.md phase-4` |
| `/crystal-ball` | No specific context signals | `/crystal-ball` (bare, no resolution) |
| `/build specs/todo/02-foo.md` | Already has args (pass-through) | `/build specs/todo/02-foo.md` (unchanged) |

### Rules

1. **Pass-through first:** If the candidate already has arguments, skip resolution entirely
2. **Best-effort only:** Never fabricate arguments — if no signal matches, display bare command
3. **Multiple roadmaps:** Pick the one most relevant to handoff context (match by tags or NEXT STEPS keywords). If ambiguous, use most recently modified
4. **YAML hint quoting:** Hints MUST be quoted strings in frontmatter. If parsing fails, skip that entry gracefully
5. **Scoring unchanged:** Resolution is display-only enrichment applied AFTER the 5-factor scoring formula

## Workflow

1. Parse `$ARGUMENTS` for `combine` and `--audio` flags (Step 0)
1.5. Calculate session duration from last /pickup timestamp (Step 0.5)
1.6. Compute MST timestamp for the handoff (Step 0.6)
1.7. Find latest task radar report path (Step 0.7)
2. Gather current session context — completed work, in-progress items, next steps, key files (Step 1)
3. Detect roadmap progress if a `specs/roadmaps/ROADMAP-*.md` exists (Step 1.5)
4. Detect ADW build queue if `adws/configs/` exists (Step 1.7)
5. Retrieve previous handoff if `combine` flag set (Step 2)
6. Check for existing handoff format (Step 3) and gather system health data (Step 3.5)
7. Create handoff memory in Omni-Cortex with SESSION_DURATION, HANDOFF_TIME_MST, LATEST_RADAR, and NEW_ITEMS_NOT_IN_RADAR fields (Step 4)
8. Auto-link to previous handoffs and related spec memories (Step 4.5)
8.5. Finalize Breathing Brain — close journal, deregister terminal, include BRAIN SUMMARY (Step 4.55b)
9. End session and clear middleware cache (Steps 4.6–4.7)
10. Generate Crystal Ball nudge if design decisions were made (Step 5)
11. Run audio generation if `--audio` flag set (Step 5.7)
12. Predict next session's top action using radar report + staleness check (Step 5.5)
13. Display ADW Build Queue with copy-pasteable commands (from Step 1.7)
14. Provide continuation prompt for the next session (Step 6)

## Report

```
## Handoff Complete

**Memory ID:** {mem_id}
**Project:** {project_name}
**Date:** {YYYY-MM-DD}
**Mode:** {standalone | combined}

### Stored
- Handoff memory created (importance: {90-95})
- Linked to: {previous handoff ID} (supersedes) + {N} related specs
- Middleware cache: {N entries cleared | skipped}

### ADW Build Queue (only if detected in Step 1.7)

**{N} specs ready** | Pipeline: adws/run_adw.py

**Run now** (Phase 1 — {SEQUENTIAL|PARALLEL xN}):
  {copy-pasteable uv run commands}
  Or: /agent-teams {roadmap} phase-1

**After Phase 1** (Phase 2 — {SEQUENTIAL|PARALLEL xN}):
  {commands}

**After Phase 2** (Phase 3 — {SEQUENTIAL|PARALLEL xN}):
  {commands}

### Quick Resume
Next session, run:
  {predicted command with args}

### Continuation Prompt
Use /pickup to continue from the last session.
```
