---
description: Resume work from previous session using Omni-Cortex context
argument-hint: "quick | deep | N (handoffs) | global | mem_ID | matrix"
allowed-tools: mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_get_session_context, mcp__omni-cortex__cortex_start_session, TodoWrite, Bash, Glob, Read
---

# Pick Up From Last Session

Retrieve context from the previous session and prepare to continue work seamlessly.

## Purpose

Replace manual context-gathering at the start of each session with a single command that:
1. Starts a new Omni-Cortex session with previous context
2. Retrieves the most recent handoff memory (or last N handoffs)
3. Reads the latest task radar report for priority queue
4. Displays a V9 "Planning Mode" summary with voiced game plan
5. Sets up a todo list if there are pending tasks

## Modes

| Mode | Invocation | Target Time | Use Case |
|------|-----------|------------|----------|
| **Quick** | `/pickup quick` | <30s | Fast resume, just need context + bare prompt |
| **Default** | `/pickup` | <60s | Two-column layout with radar priorities |
| **Deep** | `/pickup deep` | <2m | Full analysis with Crystal Ball + system health |

Modes combine with other arguments:
- `/pickup quick` — Quick mode
- `/pickup` — Default mode (no args = default)
- `/pickup deep` — Deep mode
- `/pickup N` — Default mode + N handoffs
- `/pickup global` — Default mode + global scope
- `/pickup matrix` — Default mode + Eisenhower matrix table (Task Radar L1)
- `/pickup mem_ID` — Default mode + specific memory
- `/pickup deep N` — Deep mode + N handoffs
- `/pickup quick global` — Quick mode + global scope

### Step Execution Matrix

| Step | Quick | Default | Deep |
|------|-------|---------|------|
| 0: Parse Arguments | Yes | Yes | Yes |
| 1: Start Session | `provide_context: false` | `provide_context: false` | `provide_context: true` |
| 2: Retrieve Handoff | Yes | Yes | Yes |
| 3: Present Summary | Minimal (single-column) | **V9 Planning Mode** | **V9 Planning Mode** |
| 3.3: Project Progress Table | Skip | Yes | Yes |
| 3.4: ADW Build Queue | Skip | Yes | Yes |
| 3.5: Crystal Ball Awareness | Skip | Skip | Yes |
| 3.7: System Health Awareness | Skip | Skip | Yes |
| 4: Create Todo List | Skip | Yes | Yes |
| 4.5: Read Task Radar Predictions | Skip | Yes | Yes |
| 4.6: Eisenhower Matrix (inline) | Only if `matrix` arg | Only if `matrix` arg | Only if `matrix` arg |
| 4.8: Breathing Brain Status | Yes (1-line) | Yes (1-line) | Yes (1-line) |
| 5: Ask for Direction | Bare prompt | Radar-aware prompt | Full dashboard prompt |

## Instructions

### Step 0: Parse Arguments

Check `$ARGUMENTS` for mode keywords first, then parse remaining args:

**Mode detection (check BEFORE other argument parsing):**
- Look for "quick" or "deep" as a token in `$ARGUMENTS`
- If found, set `MODE` to that value and remove the token from the remaining args
- If neither found, set `MODE` to "default"

**Remaining argument parsing (after mode removal):**
- Empty or no args → Pick up most recent handoff (limit: 1)
- **Memory ID** (starts with "mem_") → Retrieve that specific memory using `cortex_recall` with the ID
- Number (e.g., "2", "3") → Pick up last N handoffs
- "global" → Search across all projects using `cortex_global_search`

**Examples:**
- `/pickup` → MODE=default, no extra args
- `/pickup quick` → MODE=quick, no extra args
- `/pickup deep 2` → MODE=deep, N=2
- `/pickup quick global` → MODE=quick, scope=global
- `/pickup 3` → MODE=default, N=3
- `/pickup mem_1234` → MODE=default, specific memory

**If a memory ID is provided:**
Use `cortex_recall` with query containing the memory ID to retrieve that specific handoff. This takes priority over other argument types.

### Step 1: Start Session with Context

**CLI (fire-and-forget — Quick + Default modes):**
Run this bash command to create a session record for time tracking:
```bash
cortex --project "$(pwd)" session start 2>/dev/null || python3 -c "from omni_cortex.cli import main; main(['--project','$(pwd)','session','start'])" 2>/dev/null || echo "cortex CLI not available, skipping session start"
```
No MCP call needed — the session ID is stored internally by the CLI. The `python3 -c` fallback handles cases where `cortex` isn't on PATH but the package is installed. Note: `--project` is a global option that goes before the subcommand.

**MCP (Deep mode only — LLM needs context):**
Use `cortex_start_session` with `provide_context: true`, `context_depth: 3` (returns full "Last time you were working on..." summary). Deep mode needs this context for Crystal Ball awareness and system health checks.

The session is always created regardless of mode — this is required for `/time-report` to track session start times.

### Step 2: Retrieve Handoff Memory

**CRITICAL: Use cortex_list_memories (NOT cortex_recall) to get handoffs sorted by creation time**

**IMPORTANT: Do NOT use type_filter** - Omni-Cortex auto-categorizes memories and often overrides the specified type (handoffs get categorized as "error", "concept", etc. based on content). Rely on tags only.

For current project:
```
cortex_list_memories with:
- tags_filter: ["handoff", "session-summary"]
- sort_by: "created_at"
- sort_order: "desc"
- limit: 1 (or N from arguments)
```

CRITICAL: Filter by tags ["handoff", "session-summary"] ONLY. Do NOT use type_filter as it's unreliable due to auto-categorization.

For global (cross-project) — **CLI pre-fetch**:
```bash
cortex search query "handoff session-summary" --global --limit 1 --json
```
Read the CLI output to get the handoff content. The CLI returns the same data as `cortex_global_search` MCP but costs ~200 tokens instead of ~2-5KB. Note: `search query` is a subcommand, `--global` is a flag on `query`.

This ensures you get the MOST RECENT handoff first, not the most "relevant" one, and filters out any non-handoff memories that mention handoffs.

### Step 3: Present Context Summary — V9 "Planning Mode"

**Voice profile:** Read `~/.claude/commands/pickup-references/voice-profile.yaml` ONCE at the start of Step 3. Use the openers, transitions, imperatives, and formatting rules from this file to voice the game plan. If the file doesn't exist, fall back to neutral professional tone.

**Timestamp format (MANDATORY for all modes):**
Convert handoff creation time to MST/MDT. During US DST (March-November): MDT = UTC-6. Outside DST: MST = UTC-7.
Always show: `{YYYY-MM-DD} {h:mm PM} MST ({time ago})`
- If less than 1 hour ago: show minutes — e.g., `(23m ago)`
- If 1+ hours ago: show hours and minutes — e.g., `(2h 15m ago)`
- If 24+ hours ago: show days — e.g., `(2d ago)`

**Session duration:** Read from handoff memory's `SESSION_DURATION:` field. If not present, show "N/A".

#### Quick Mode — Compact V9

```
## Session Pickup — {project name}

  {YYYY-MM-DD} {h:mm PM} MST ({time ago}) | {Xh Ym} session
  Score: {N}/100 ({trend}) | Specs: {done}/{total} ({%})
  Brain: {Active|Paused} | Terminal: {terminal_id}

  {DEADLINE line if any deadline in handoff BLOCKERS/NOTES}

### What happened last session
  {CONTEXT from handoff — 2-3 sentences, use "essentially" to summarize}

  Open: {comma-separated list of IN PROGRESS items}

### Next steps
  {Numbered list from handoff NEXT STEPS, max 5 items}
```

Skip: game plan, spec pipeline, maintenance. Jump to Step 5 (bare prompt).

#### Default + Deep Mode — Full V9 Planning Mode

**Structure (in this order):**

1. **Header block** — status bar with timestamp, score, specs, brain terminal ID
2. **Deadline callout** — if any deadline found in handoff (bold, standalone line)
3. **"What we were working on"** — 3-5 sentence summary from handoff CONTEXT + COMPLETED (voiced with "essentially", summarize don't list)
4. **"Still open" + "Context"** — IN PROGRESS as comma-separated run, people/constraint context from BLOCKERS/NOTES
5. **"Game plan"** — the core: numbered queue items grouped by timing, each with 2-3 lines of context (see Game Plan Rules below)
6. **Spec Pipeline table** — ASCII table showing buildable vs blocked by project
7. **Close line** — conversational, invites adjustment

```
## Session Pickup — {project name}

  Last session: {date} {time} MST ({time ago}) | {duration} session
  Score: {N}/100 ({trend}) | Specs: {done}/{total} ({%})
  Brain: {Active|Paused} | Terminal: {terminal_id}

  {DEADLINE if present}

### What we were working on

  {Voiced 3-5 sentence summary. Use voice profile openers/transitions.
   Mention what was shipped, key decisions, people involved.
   Use "essentially" for the high-level summary.}

  Still open: {comma-separated IN PROGRESS items}

  {People/constraint context: "Eva will try X next week", "Ralph building Y
   independently", "Branch protection active — PRs required with CI."}
  {Blockers as inline notes with backticks for commands}

### Here's what I'm thinking for the game plan

  SEQUENTIAL — {context from deadline or Q1 theme} (in this order)

  1. {Q1 item title} [{effort}]
     {2-3 lines of voiced context: what to do, why it matters, who it
      affects, dependencies. Use "Go ahead and" for first item. Use
      "make sure" for verification steps. Use "also" for additions.
      Reference people by name. Include copy-paste commands if applicable.}

  2. {Q1 item title} [{effort}] — after #1
     {Context with dependency note and sequencing}

  ...continue Q1 items...

  VALIDATE — test what's built before building more

  {N}. {E2E test or verification item} [{effort}] [{age}d]
      {2 lines: what spec it validates, why it matters before next build wave}

  PARALLEL — knock out whenever, any terminal

  {N}. {Quick win or parallel-safe item} [{effort}] [{age}d]
      {1-2 lines context}

  {N}. {Maintenance command}
      {1 line: how long overdue, current score/status}

  NEXT WAVE — after {milestone} and VALIDATE items, or spin up another terminal

  {N}. {/build command with full spec path}
      {2 lines: what the spec does, blockers, who's in the area,
       whether ADW works for it}

  MAINTENANCE — when there's a gap or end of session

  {N}. {Overdue maintenance commands, 1 line each}

### Spec Pipeline

  +-----------+---------+--------------------------------------------+
  | Project   | Status  | Specs                                      |
  +-----------+---------+--------------------------------------------+
  | {project} | {status}| {spec list}                                |
  ...
  +-----------+---------+--------------------------------------------+
  {N} buildable | {N} blocked | {done}/{total} done ({%})

---
That's the game plan based on the radar{" and the " + deadline if present}.
Want to go with this, adjust anything, or do something different?
```

**If retrieving N handoffs (e.g., `/pickup 2`):**

Show each handoff briefly, then present the game plan from the most recent:

```
## Session Pickup — Last {N} Handoffs

### Handoff #1 (Most Recent - {date} {time} MST)
{1-2 sentence summary}

### Handoff #2 ({date} {time} MST)
{1-2 sentence summary}

{Then present the full V9 layout using the most recent handoff + merged next steps}
```

#### Game Plan Rules

1. **Read voice profile** from `~/.claude/commands/pickup-references/voice-profile.yaml`
2. **Use openers.primary** for the first item in each group ("Go ahead and...")
3. **Use openers.secondary** for subsequent items ("After that,", "Also", "And then")
4. **Use "make sure"** when adding a verification or safety step
5. **Use "or whatever makes sense"** when there are multiple valid approaches
6. **Reference people by name** when the item involves external stakeholders
7. **Include dependency tags** inline: "after #1", "parallel with #2", "blocks #3"
8. **Each item gets 2-3 lines of context** — enough that Claude can execute it without Tony adding more. Include: what, why, who, dependencies, caveats.
9. **Copy-paste commands on their own line** when applicable (slash commands, CLI commands)
10. **Group items by timing**: SEQUENTIAL (must be in order) / VALIDATE (test what's built) / PARALLEL (any terminal) / NEXT WAVE (future) / MAINTENANCE (gap-filler)
11. **Quick wins are baked into PARALLEL** — not a separate section
12. **Max items per group**: SEQUENTIAL 5, VALIDATE 3, PARALLEL 4, NEXT WAVE 3, MAINTENANCE 3
13. **If no radar report exists**, build the game plan from handoff NEXT STEPS instead, with the same voicing rules
14. **Age suffix**: Every game plan item shows `[Xd]` age from the task radar report's Age column (read from `.item-ledger.yaml` via the report). Format: `[3d]`, `[14d]`, `[45d]`. Items with no age data show no suffix.
15. **VALIDATE tier**: Insert between SEQUENTIAL and NEXT WAVE. Populated with items that are post-build verification (E2E tests, validation, [VERIFY] tagged items) from Q1/Q2. These MUST come before any NEXT WAVE build items. Header: `VALIDATE -- test what's built before building more`
16. **Defer indicator**: If an item has been deferred (from `/task-radar defer`), show `(deferred Nx)` after the age suffix. Deferred items sort lower within their group.

### Step 3.3: Project Progress Table

**Mode gate:** Skip this step if MODE = quick.

If the handoff memory contains a `PROJECT PROGRESS:` section:

1. Parse the phase list and completion counts from the handoff
2. Render an ASCII table showing phase-by-phase status (below the two-column box):

```
### Project Progress: [X/total] specs complete

  +─────────+────────────+───────────────────────────+
  │  Phase  │   Status   │          Specs             │
  +─────────+────────────+───────────────────────────+
  │ Phase 1 │ Done       │ 01, 02 (sequential)        │
  │ Phase 2 │ Done       │ 03, 04, 05 (parallel x3)   │
  │ Phase 3 │ Done       │ 06, 07, 08 (parallel x3)   │
  │ Phase 4 │ Next       │ 09, 10 (parallel x2)        │
  │ Phase 5 │ Pending    │ 11, 12 (sequential)         │
  +─────────+────────────+───────────────────────────+
```

**Status display rules:**
- **Done** = all specs in phase are complete
- **In Progress** = mixed completion within the phase
- **Next** = the immediate next phase to work on
- **Pending** = future phases not yet started

If no PROJECT PROGRESS section exists in the handoff, skip this step entirely.

### Step 3.4: ADW Build Queue

**Mode gate:** Skip this step if MODE = quick.

If the handoff memory contains an `ADW BUILD QUEUE:` section:

1. Parse the queue to extract total specs ready, "Next Phase" commands, "Blocked" phases
2. **Live validation:** Glob `specs/todo/**/*.md` — confirm listed specs still exist in todo
   - If any moved to `specs/done/`, remove from queue and recalculate
   - If ALL specs built, skip this section entirely
3. Display as a section below the progress table with copy-pasteable commands

If no ADW BUILD QUEUE section exists but `adws/configs/` exists AND pending specs have `## ADW Pipeline` sections, construct the queue dynamically.

### Step 3.5: Crystal Ball Awareness

**Mode gate:** Skip this step if MODE = quick or MODE = default. Deep mode only.

1. Check handoff for Crystal Ball suggestions — display if present
2. Check audit recency via `cortex_list_memories` with `tags_filter: ["crystal-ball"]`
   - Never run: suggest `/crystal-ball`
   - 5+ sessions ago: suggest refresh
   - Recent: show score briefly

### Step 3.7: System Health Awareness

**Mode gate:** Skip this step if MODE = quick or MODE = default. Deep mode only.

If `reports/self-heal/` exists with `sh-*.md` reports:
1. Read most recent report, extract `composite_score`, `trend`, `date`
2. Display: `System Health: {score}/100 ({trend}) — Last: {date}`
3. If score < 40: suggest `/self-heal`
4. If report > 3 days old: suggest `/self-heal`

### Step 4: Create Todo List (if applicable)

**Mode gate:** Skip this step if MODE = quick.

If there are clear next steps from the handoff, use `TodoWrite` to create a todo list so progress can be tracked.

### Step 4.5: Read Task Radar Predictions

**Mode gate:** Skip this step if MODE = quick.

**Purpose:** Read the latest task radar report's "Predicted Actions" section instead of computing predictions from scratch. This replaces the old prediction engine (Steps 4.5.1-4.5.5 removed).

#### Step 4.5.1: Find Latest Radar Report

1. Check handoff memory for `LATEST_RADAR:` field — use that path if present
2. If not present: Glob `reports/task-radar/rd-*.md` → get latest by filename sort (highest NNN)
3. If no report exists at all: set `$RADAR_AVAILABLE = false`, skip to Step 4.5.4

#### Step 4.5.2: Read Predicted Actions

1. Read the report file, search for `## Predicted Actions (auto-generated)` section
2. Parse four sub-sections:
   - **From Q1 Items** — runnable commands with effort estimates
   - **From Q2 Items** — scheduled items with effort estimates
   - **Maintenance Due** — staleness status for maintenance commands
   - **Quick Wins** — parallel-safe quick items
3. Also read YAML frontmatter for: `predicted_actions_count`, `maintenance_overdue`, `quick_wins_count`, `quick_wins_total_time`

#### Step 4.5.3: Freshness Check

Compare the report date (from frontmatter `date:` field) against today:
- If report is older than 2 days: set `$RADAR_STALE = true`
- If report is current (<=2 days): set `$RADAR_STALE = false`

#### Step 4.5.3.5: Delta Staleness Check

Even if the report is current, do 3 quick greps of `~/.claude/stats/command-history.jsonl` to check if any maintenance commands have become newly overdue SINCE the report was written:

```bash
# Check self-heal, crystal-ball, retrospective last run dates
for CMD in self-heal crystal-ball retrospective; do
  grep "\"cmd\":\"$CMD\"" ~/.claude/stats/command-history.jsonl 2>/dev/null | tail -1
done
```

Compare each last-run date against thresholds. If any are newly overdue (weren't overdue in the report), append them to the Maintenance Due display with a `[NEW]` marker.

#### Step 4.5.4: Populate Right Column

Use the parsed data to populate the right column of the two-column layout:
- Q1 items → "Q1 DO NOW" section (max 5)
- Q2 items → "Q2 SCHEDULE" section (max 5)
- Maintenance Due → "MAINTENANCE DUE" section
- Quick Wins → "QUICK WINS" section (max 3)

If `$RADAR_AVAILABLE = false`: right column shows "No task radar report. Run `/task-radar deep`."
If `$RADAR_STALE = true`: add stale warning at top of right column header: `(rd-{NNN}) STALE — {N}d old`

If the report has no "Predicted Actions" section (older report format), fall back to reading Q1/Q2 items directly from the Eisenhower matrix tables in the report.

### Step 4.6: Eisenhower Matrix (matrix argument only)

**Condition:** Only execute this step if `$ARGUMENTS` contains `matrix`.

Run a Task Radar L1 Quick Scan inline — no report file, just terminal output.

1. **Gather specs:**
   - Glob `specs/todo/**/*.md` → pending specs
   - Glob `specs/deferred/**/*.md` → deferred specs
   - Glob `specs/done/**/*.md` → recently completed

2. **Query recent handoffs:**
   - `cortex_list_memories` with:
     - `tags_filter`: ["handoff", "session-summary"]
     - `sort_by`: "created_at"
     - `sort_order`: "desc"
     - `limit`: 5
   - Extract unfinished "Next Steps" and "Blockers"

3. **Classify items** using Eisenhower rules (see `~/.claude/skills/task-radar/references/eisenhower-classification.md`)

4. **Deduplicate:** Exclude items already shown in the two-column layout.

5. **Display compact table** (same format as task-radar L1).

### Step 4.8: Breathing Brain Status (Compressed)

**Mode gate:** Runs in ALL modes (quick, default, deep).

Register the current terminal with the brain and capture status — but display as a **single line** in the left column of the two-column layout (or in the quick mode summary).

1. **Register terminal:**
   ```bash
   python3 -c "
import sys, os
sys.path.insert(0, os.path.expanduser('~/.claude/scripts/lib'))
from brain_state import BrainState
tid = BrainState.register_terminal(os.getcwd())
print(tid if tid else 'REGISTER_FAILED')
" 2>/dev/null || echo "BRAIN_UNAVAILABLE"
   ```
   Store the returned terminal ID for use in `/handoff`.

2. **Get brain status:**
   ```bash
   python3 -c "
import sys, os, json
sys.path.insert(0, os.path.expanduser('~/.claude/scripts/lib'))
from brain_state import BrainState
try:
    bs = BrainState()
    owner = bs.get_brain_owner()
    terminals = bs.list_terminals()
    paused = bs.is_paused()
    print(json.dumps({
        'owner': owner.get('terminal_id','unknown') if owner else 'none',
        'terminal_count': len(terminals),
        'paused': paused
    }))
except Exception as e:
    print(json.dumps({'error': str(e)}))
" 2>/dev/null || echo '{"error":"brain db not found"}'
   ```

3. **Display as single line:**
   - Normal: `BRAIN: Active ({N} terminals)`
   - Paused: `BRAIN: Paused ({N} terminals)`
   - Unavailable: `BRAIN: Unavailable`
   - If >1 terminal: add sibling line below: `Siblings: {id_truncated} PID {pid} {project_name}, ...`

### Step 5: Close with Direction Prompt

**V9 close line:** The game plan section already ends with the conversational close. No separate numbered options are needed for default/deep modes. The close is part of Step 3's output.

#### Quick Mode

```
What do you want to work on?
```

#### Default + Deep Mode

The close line is built into the game plan (Step 3). Use the voice profile's `formatting.close_line` template:

```
That's the game plan based on the radar and the {deadline}.
Want to go with this, adjust anything, or do something different?
```

If no deadline exists, use `formatting.close_line_no_deadline`:
```
That's the game plan based on the radar.
Want to go with this, adjust anything, or do something different?
```

**Do NOT use numbered options.** Tony overrides suggestions 12% of the time and chains tasks 43% of the time. An open-ended close matches his planning style better than a multiple-choice menu.

**After user picks a direction:**
```bash
cortex update "$HANDOFF_ID" --status reviewed 2>/dev/null || true
```

## Workflow

1. Parse `$ARGUMENTS` for mode (`quick` | `deep` | default) and remaining args (N, `global`, `mem_ID`)
2. Start a new Omni-Cortex session (`provide_context: false` for quick/default, `true` for deep)
3. Retrieve the most recent handoff memory using `cortex_list_memories` filtered by tags ["handoff", "session-summary"]
4. Read latest task radar report for Predicted Actions (skip in quick mode)
5. Register terminal with Breathing Brain (terminal ID for header)
6. Read voice profile from `~/.claude/commands/pickup-references/voice-profile.yaml`
7. Present V9 Planning Mode summary — header, context, voiced game plan, spec pipeline table
8. Create a todo list from game plan items (skip in quick mode)
9. Deep mode only: check Crystal Ball audit recency and system health
10. Close with conversational direction prompt (built into game plan)

## Fallback Behavior

If no handoff memory is found:
1. Check `cortex_get_session_context` for any previous session info
2. Use `cortex_recall` with broader queries like the project name
3. If still nothing, inform user: "No previous handoff found. What would you like to work on?"

## Report

```
┌─ SESSION CONTEXT ─────────────────────┬─ PRIORITY QUEUE (rd-{NNN}) ───────────┐
│ Last: {date} {time} MST ({time ago})   │ Q1 DO NOW              [{count}]      │
│ Duration: {Xh Ym}                     │ ■ {item}                    [{time}]   │
│ ...                                   │ ...                                   │
└───────────────────────────────────────┴───────────────────────────────────────┘

Ready to continue. {direction prompt based on mode}
```

## Example Usage

**Basic usage** (most recent handoff, default mode):
```
/pickup
```

**Quick resume** (minimal context, fastest):
```
/pickup quick
```

**Deep resume** (full analysis, maintenance checks):
```
/pickup deep
```

**Pick up last 2 handoffs** (combine context from 2 sessions):
```
/pickup 2
```

**Deep mode with 2 handoffs**:
```
/pickup deep 2
```

**Quick pick up from any project** (cross-project, minimal):
```
/pickup quick global
```

**Pick up from any project** (cross-project handoff):
```
/pickup global
```

**Pick up last 3 global handoffs** (combine cross-project context):
```
/pickup global 3
```

**Pick up a specific handoff by memory ID**:
```
/pickup mem_1768876884942_e67a2384
```

**Pick up with inline Eisenhower matrix**:
```
/pickup matrix
```

Claude responds with the context summary and is ready to continue exactly where the last session(s) ended.

## Notes

- Pairs with `/handoff` which creates the handoff memories
- Works across all projects (universal)
- Uses session management for proper tracking
- Falls back gracefully if no handoff exists
- **ALWAYS sorts by creation time** (most recent first), not relevance
- Supports combining multiple handoffs for complex multi-session workflows
- **Mode detection happens before all other argument parsing** — "quick" and "deep" cannot conflict with numbers or mem_IDs
- **Predictions are read from the task radar report**, not computed at pickup time. This cuts ~80% of the old prediction computation time.
- **Timestamps always include MST/MDT** — during US DST (March–November) use MDT (UTC-6), otherwise MST (UTC-7)
- **Brain status is a single line**, not a full section — keeps the output compact
