---
name: time-report
description: >-
  Time investment analysis with 4-layer system, numbered reports, and trend tracking.
  Layer 1: Time Summary (active days, time breakdown). Layer 2: Work Rhythm (sprints, gaps,
  consistency). Layer 3: Productivity Pulse (velocity, deliverables, efficiency).
  Layer 4: Trend Comparison (week-over-week, burnout indicators).
  Project mode: End-to-end project lifecycle analysis from brainstorming through implementation.
  Global mode: Cross-project combined reports for any date range.
  Use when: billing/invoicing, productivity tracking, project planning, velocity analysis,
  or user says "time report", "how much time", "time spent", "hours worked", "how long did X take".
argument-hint: "[quick | deep | weekly | compare | project <roadmap-path|mem_ID|tag> | global <range>]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_get_timeline, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_export
model: opus
---

# Time Report v2

Analyze time investment in the current project using Omni-Cortex activity data. 4-layer system with numbered reports, trend tracking, composite scoring, and burnout detection.

## Arguments

Parse `$ARGUMENTS` for mode:
- **(none)** — Default mode: L1 + L2, saves report
- **quick** — L1 only, no report saved, fastest
- **deep** — All 4 layers (L3 + L4 as sub-agents), saves report
- **weekly** — L1 + L2 scoped to last 7 calendar days, no report saved
- **compare** — L4 only (requires 2+ saved reports), no report saved
- **project `<ref>`** — Project lifecycle mode. `<ref>` can be:
  - A **roadmap file path** (e.g., `specs/roadmaps/ROADMAP-skills-ecosystem.md`)
  - A **cortex memory ID** (e.g., `mem_1771038200979_493b4087`)
  - A **tag** (e.g., `skills-ecosystem`)
  Saves report. Uses dedicated project analysis workflow (see Step 8).
- **global `<range>`** — Cross-project combined report for a date range. `<range>` can be:
  - `Nd` shorthand: `1d`, `3d`, `7d`, `14d` (days ago to now)
  - `weekend` (most recent Fri 5PM - Sun 11:59PM MST)
  - `week` (most recent Mon 00:00 - Sun 11:59PM MST)
  - Explicit: `YYYY-MM-DD YYYY-MM-DD` (start and end dates, inclusive)
  - Single date: `YYYY-MM-DD` (that day only)
  Saves report. Uses cross-project workflow (see Step 9).

## Variables

```
PROJECT_DIR: Current working directory
CORTEX_DB: {PROJECT_DIR}/.omni-cortex/cortex.db
REPORTS_DIR: reports/time-reports
REPORT_PREFIX: tr
MST_OFFSET: -7 (hours, UTC to MST)
GAP_THRESHOLD_MS: 2100000 (35 minutes in ms)
BORDERLINE_MAX_MS: 3600000 (60 minutes in ms)
```

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Default | *(none)* | L1 + L2 | Yes | No (inline) |
| Deep | `deep` | L1-L4 | Yes | L3, L4 as sub-agents |
| Weekly | `weekly` | L1 + L2 (last 7 days) | No | No |
| Compare | `compare` | L4 only (needs 2+ reports) | No | No |
| Project | `project <ref>` | P1-P4 (dedicated) | Yes | P3, P4 as sub-agents |
| Global | `global <range>` | G1-G4 | Yes | G3+G4 combined |

## Composite Score Formula

```
composite = (L1 x 0.35) + (L2 x 0.30) + (L3 x 0.20) + (L4 x 0.15)
```

If a layer is N/A (skipped or insufficient data), redistribute its weight equally among available layers:
```python
available = [l for l in layers if l.score is not None]
redistributed = na_weight / len(available)
for l in available:
    l.adjusted_weight += redistributed
```

Score interpretation:
- 80-100: Excellent — high velocity, consistent rhythm, healthy patterns
- 60-79: Good — productive with some gaps or irregularities
- 40-59: Fair — inconsistent, potential burnout signals, or low velocity
- 0-39: Needs attention — long gaps, declining velocity, or burnout indicators

## Workflow

**Mode routing:** If `$ARGUMENTS` starts with `global`, skip directly to **Step 9** (global mode has its own G1-G4 workflow and does not require a Cortex DB). If `$ARGUMENTS` starts with `project`, skip to **Step 8**.

### Step 0: Load Previous Reports and Trend Context

**0a. Verify database exists**
- Check that `{PROJECT_DIR}/.omni-cortex/cortex.db` exists
- If not: display "No Omni-Cortex database found. Run `/omni-start` first." and stop

**0b. Determine report number**
- Glob for `{PROJECT_DIR}/{REPORTS_DIR}/tr-*.md`
- Extract NNN from filenames using pattern `tr-(\d+)-`
- REPORT_NUMBER = highest NNN + 1 (or 1 if none exist)
- Create `{REPORTS_DIR}/` directory if missing

**0c. Parse previous report frontmatter**
- For each `tr-*.md` file, read lines between first `---` and second `---`
- Parse each line as `key: value` (strip quotes from values)
- Build array of report objects sorted by report_number
- Keep only the most recent 10 reports for trend display
- **Backward compat:** If a report lacks layer scores, treat composite_score as the only available score

**0d. Display trend dashboard** (skip if no previous reports)
```markdown
### Time Report Trend
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
| 001 | Feb 13 | 75 | 68 | -- | -- | 72 | -- |
| **{NNN}** | **{date}** | **{l1}** | **{l2}** | **{l3}** | **{l4}** | **{comp}** | **{+/-N}** |

Trajectory: {trajectory_summary}
```

Note: Old reports or modes that skip layers show `--` for missing columns.

**0e. Trend analysis** (if 3+ reports exist):
- Composite score trend: improving/declining/stable across last 3 runs
- Active days trend: compare recent vs earlier reports
- Velocity trend: if L3 data available
- If score declining 3+ runs: warn "Declining productivity detected"
- If score improving 3+ runs: note "Sustained improvement"

### Step 1: Layer 1 — Time Summary (Always Runs)

**This layer runs in ALL modes.** For `weekly` mode, filter to last 7 calendar days only.

Write a Python script to `{PROJECT_DIR}/tmp_tr_layer1.py` that queries `{CORTEX_DB}`.

**1a. Query activities data**

```sql
-- For default/quick/deep: all activities
-- For weekly: WHERE timestamp > datetime('now', '-7 days')
SELECT timestamp, duration_ms, tool_name, success
FROM activities
ORDER BY timestamp ASC
```

**CRITICAL: Column is `timestamp` NOT `created_at` in the activities table.**

**1b. Compute metrics (all in MST = UTC-7)**

1. **Project boundaries**: First/last activity timestamps (MST), calendar day span
2. **Active days vs calendar days**: Count distinct dates with activity. Format: "9 active days / 24 calendar days (38%)"
3. **Current streak**: Count consecutive active days ending at the most recent activity date. If last activity is today, streak includes today.
4. **Time breakdown** (gap-based, 35-min threshold):
   - Claude execution time: `SUM(duration_ms)` from activities (handle NULL as 0)
   - Total gap time: sum of gaps < 35 min between consecutive activities
   - User time: total gap time minus Claude execution time
   - Total active time: Claude time + User time
5. **Today's session**: Activities count, Claude time, and user time for today (MST) only
6. **Success rate**: `COUNT(success=1) / COUNT(*)` as percentage
7. **Daily breakdown table**:
   | Date | Activities | Claude | You | Total | First | Last |
   For each active day, compute per-day stats. Times in MST 12-hour format.
8. **Borderline gaps** (hybrid format):
   - Summary line: "N gaps totaling X.X hrs excluded"
   - Table of top 5 longest gaps only: date, from (MST) to (MST), duration, context (tool before/after gap)
   - If more than 5 borderline gaps exist, show count of remaining

**1c. Pause/Resume exclusion**
- Use `cortex_recall` with tags `["omni-pause"]` and `["omni-resume"]`
- Match pause/resume pairs by timestamp proximity
- Subtract excluded time from active calculations
- If no pause/resume markers found: "No /omni-pause markers found" (skip exclusion)

**1d. Layer 1 Scoring** (start at 100, deduct):
- Deduct 5 per inactive day in last 7 calendar days (max -25)
- Deduct 10 if streak is 0 (no recent activity)
- Deduct 15 if success rate < 90%
- Deduct 10 if success rate < 95% but >= 90%
- Deduct 5 per day with < 30 min total active time (max -15, indicates abandoned sessions)
- Floor at 0, cap at 100

**1e. Display Layer 1**
```markdown
## Time Investment Report (tr-{NNN})

| Metric | Value |
|--------|-------|
| Total Active Time | {N.N} hrs |
| Claude Time | {N.N} hrs ({N}%) |
| Your Time | {N.N} hrs ({N}%) |
| Active Days | {N} of {N} calendar days ({N}%) |
| Current Streak | {N} consecutive days |
| Today | {N.N} hrs ({N} activities) |
| Sessions | {N} total |
| Success Rate | {N.N}% |
| Excluded Breaks | {N} min ({detail}) |

### Layer 1: Time Summary (Score: {N}/100)
```

Then display the daily breakdown table and borderline gaps.

**If mode is `quick`, skip to Step 5 (display composite as L1 score only, no report save).**
**If mode is `compare`, skip to Step 3 (Layer 4 only).**

### Step 2: Layer 2 — Work Rhythm (Default + Deep + Weekly)

**Runs inline (no sub-agent).** Uses same activity data as L1 plus sessions table.

**2a. Sprint detection**
- Identify clusters of consecutive active days with > 2 hrs/day total active time
- A "sprint" = 2+ consecutive active days above threshold
- Name by date range: "Sprint 1: Jan 21-22 (2 days, 14.8 hrs)"
- If no multi-day sprints: "No multi-day sprints detected"

**2b. Gap analysis (day-level)**
- List gaps between active days where no work happened
- Show date range and duration in days
- Example: "Jan 30 - Feb 9 (11 days off)"
- Only show gaps > 1 day

**2c. Session statistics**
Query sessions table:
```sql
SELECT id, started_at, ended_at, summary
FROM sessions
ORDER BY started_at DESC
```
- Total sessions, average session length, longest session, shortest session
- Recent 10 sessions table: start (MST), end (MST), duration, summary (truncated to 50 chars)

**2d. Peak hours histogram**
- Group activities by hour of day (MST)
- Display as horizontal bar chart using block characters
- Use 12-hour format: "6:00 PM" not "18:00"
- Example:
  ```
   9 AM  |####                     | 124
  10 AM  |########                 | 287
  11 AM  |###########              | 401
  ...
  ```

**2e. Consistency score**
- Calculate ratio of active days to calendar days in last 14 days
- Weight recent days more: days 1-7 count 2x, days 8-14 count 1x
- Normalize to 0-100

**2f. Layer 2 Scoring** (0-100):
- Start at base = consistency score (0-100)
- Bonus +10 if currently in a sprint (consecutive active days with > 2 hrs/day)
- Deduct 10 if longest gap > 7 days
- Deduct 5 if average session length < 30 min (fragmented work)
- Deduct 5 if no work in last 3 calendar days
- Floor at 0, cap at 100

**2g. Display Layer 2**
```markdown
### Layer 2: Work Rhythm (Score: {N}/100)

#### Sprints
{sprint_table_or_message}

#### Gaps
{gap_list}

#### Sessions
{session_stats_table}

#### Peak Hours (MST)
{histogram}

**Consistency:** {score}% (last 14 days, recency-weighted)
```

**If mode is `weekly` or `default`, skip to Step 4 (assemble score and save).**

### Step 3: Launch Layers 3-4 (Deep Mode Only, Parallel Sub-Agents)

Spawn 2 Task sub-agents in a single message for parallel execution.

#### Layer 3 Sub-Agent: Productivity Pulse

Tell the sub-agent:

> Write a Python script to `{PROJECT_DIR}/tmp_tr_layer3.py` that queries `{CORTEX_DB}`:
>
> **3a. Velocity**: Activities per active hour (total activities / total active hours). Calculate per-day and overall.
>
> **3b. Error rate trend**: Calculate daily error rates (1 - success_rate) for last 7 active days. Determine if trending up/down/stable using simple linear regression or comparison of first half vs second half averages.
>
> **3c. Tool efficiency**: Top 10 tools by total time:
> ```sql
> SELECT tool_name,
>        COUNT(*) as calls,
>        SUM(duration_ms) / 1000.0 / 60.0 as total_min,
>        AVG(duration_ms) as avg_ms
> FROM activities
> WHERE duration_ms IS NOT NULL AND tool_name IS NOT NULL
> GROUP BY tool_name
> ORDER BY SUM(duration_ms) DESC
> LIMIT 10
> ```
>
> **3d. Skill usage**: Which skills were invoked:
> ```sql
> SELECT skill_name, COUNT(*) as uses
> FROM activities
> WHERE skill_name IS NOT NULL AND skill_name != ''
> GROUP BY skill_name
> ORDER BY uses DESC
> ```
>
> **3e. Deliverable tracking**:
> - Glob `{PROJECT_DIR}/specs/done/**/*.md` to get completed specs (includes project subfolders)
> - For each spec, read first 5 lines to extract title
> - Use file modification time to approximate completion date
> - Calculate: specs completed per active day, specs per 10 active hours
> - Display as table: Spec name, completion date, active hours that day
> - If no `specs/done/` directory: "No completed specs found"
>
> **3f. Layer 3 Scoring** (0-100):
> - Calculate project-average velocity (activities per active hour)
> - Base score: 50
> - If velocity above project average: +10 to +30 (proportional)
> - If velocity below project average: -10 to -20 (proportional)
> - Bonus +10 if error rate trending down
> - Deduct 10 if error rate trending up
> - Bonus +5 per spec completed in last 7 days (max +20)
> - Deduct 10 if velocity declining over last 3 active days
> - Floor at 0, cap at 100
>
> Run the script via Bash, parse JSON output, delete temp file (try/finally).
> Return structured text with score and markdown section.

#### Layer 4 Sub-Agent: Trend Comparison

Tell the sub-agent:

> Read all `{PROJECT_DIR}/{REPORTS_DIR}/tr-*.md` files and parse their YAML frontmatter.
>
> **4a. Trend dashboard** (if 2+ reports):
> ```markdown
> ### Score Trend
> | Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
> ```
>
> **4b. Period comparison** (current metrics vs most recent saved report):
> - Total active time delta
> - Active days delta
> - Velocity delta (if available)
> - Error rate delta (if available)
> - Sessions count delta
>
> **4c. Burnout indicators** (flag if any):
> - Sessions getting longer: avg session increased > 50% vs previous report
> - Work shifting later: peak hour shifted 2+ hours toward midnight
> - Error rate increasing across 2+ consecutive reports
> - Streak without breaks > 5 consecutive days
> - Display as warning bullets if triggered, otherwise "No burnout signals detected"
>
> **4d. Trajectory assessment**: Based on composite score trend across last 3+ reports:
> - improving: 2+ consecutive increases
> - stable: scores within +/-5 of each other
> - declining: 2+ consecutive decreases
> - first_run: no previous reports
> - insufficient_data: only 1 previous report
>
> **4e. Layer 4 Scoring** (0-100):
> - Baseline: 50
> - +20 if composite improving across last 3 reports
> - +10 if stable
> - -20 if declining
> - +10 if no burnout indicators
> - -10 per active burnout indicator (max -30)
> - If < 2 reports exist: return N/A
> - Floor at 0, cap at 100
>
> Return structured text with score and markdown section.

**Important:** If a sub-agent fails or times out, that layer scores N/A. Other layers still complete. Note the failure in the report.

### Step 4: Assemble Composite Score

Collect scores from all layers that ran:
- L1: always available
- L2: available in default, deep, weekly
- L3: available in deep only
- L4: available in deep (if 2+ reports) and compare

Calculate composite using the formula above. If any layer is N/A, redistribute its weight.

Display composite:
```markdown
## Composite Score: {N}/100 ({interpretation})

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: Time Summary | {N} | {W}% | {N.N} |
| L2: Work Rhythm | {N} | {W}% | {N.N} |
| L3: Productivity | {N_or_NA} | {W}% | {N.N_or_NA} |
| L4: Trends | {N_or_NA} | {W}% | {N.N_or_NA} |
| **Composite** | | 100% | **{N}** |
```

### Step 5: Save Report (Default and Deep Modes Only)

**Skip this step if mode is quick, weekly, or compare.**

File: `{PROJECT_DIR}/reports/time-reports/tr-{NNN:03d}-{YYYY-MM-DD}-{slug}.md`

**Description slug generation:**
- Derive from session context or mode:
  - Default mode: `"default-session"`
  - Deep mode: `"deep-analysis"`
  - If project name is known: use project slug (e.g., `"genius-toolkit-session"`)
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`: lowercase, hyphens, max 50 chars, truncate at word boundaries

Write YAML frontmatter:
```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{mode}"
total_active_hours: {N.N}
claude_hours: {N.N}
user_hours: {N.N}
active_days: {N}
calendar_days: {N}
sessions: {N}
success_rate: {N.N}
velocity: {N.N}
specs_completed: {N}
current_streak: {N}
layer_1_score: {N}
layer_2_score: {N_or_NA}
layer_3_score: {N_or_NA}
layer_4_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
burnout_flags: {N}
---
```

Body: Full formatted report output (the same markdown displayed to the user).

### Step 6: Store in Cortex

Use `cortex_remember` with:
- Content: "Time Report tr-{NNN} ({date}): Composite {score}/100 ({trend}). Active: {N.N} hrs over {N} days. L1={N} L2={N} L3={N_or_NA} L4={N_or_NA}."
- Tags: `["time-report", "tr-{NNN}", "{project_name}"]`
- Importance: 60

### Step 7: Final Display

After all steps, display a footer:
```markdown
---
Report: tr-{NNN} | Mode: {mode} | Score: {composite}/100 ({trend})
Saved to: reports/time-reports/tr-{NNN}-{date}-{slug}.md
```

If mode doesn't save (quick/weekly/compare):
```markdown
---
Mode: {mode} | Score: {composite}/100
(Report not saved — use default or deep mode to save)
```

## DB Schema Reference

Key columns for SQL queries against `.omni-cortex/cortex.db`:

```sql
-- Activities (main data source)
activities.timestamp    -- ISO 8601 UTC (NOT created_at!)
activities.duration_ms  -- Claude execution time in ms (nullable)
activities.tool_name    -- e.g., "Read", "Bash", "Edit"
activities.success      -- 1 or 0
activities.skill_name   -- e.g., "handoff", "self-heal" (nullable)
activities.event_type   -- "pre_tool_use" or "post_tool_use"

-- Sessions
sessions.id
sessions.started_at     -- ISO 8601 UTC
sessions.ended_at       -- ISO 8601 UTC (nullable if active)
sessions.summary        -- text

-- Session Summaries (if available)
session_summaries.key_learnings   -- JSON array string
session_summaries.total_activities
```

**CRITICAL: Column is `timestamp` NOT `created_at` in the activities table.** This has caused bugs before.

## Step 8: Project Lifecycle Mode (project mode only)

**This entire step replaces Steps 1-7 when mode is `project`.** Project mode has its own 4-layer system (P1-P4) focused on tracing a specific initiative from brainstorming through implementation.

### 8.0: Parse Project Reference

The `<ref>` after `project` can be one of three types. Detect and resolve:

**Type A: Roadmap file path** (contains `/` or `.md`)
```
/time-report project specs/roadmaps/ROADMAP-skills-ecosystem.md
```
- Read the file directly
- Extract project name from `# Roadmap — {name}` heading
- Extract all phases, specs, and dependency info

**Type B: Cortex memory ID** (starts with `mem_`)
```
/time-report project mem_1771038200979_493b4087
```
- Use `cortex_recall` with the memory ID as query
- Extract project context, spec list, and any referenced roadmap path from memory content
- If memory references a roadmap file, also read that file

**Type C: Tag** (plain string, no `/` or `mem_` prefix)
```
/time-report project skills-ecosystem
```
- Use `cortex_global_search` with query matching the tag and `tags_filter: ["{tag}"]`
- Also try `cortex_list_memories` with `tags_filter: ["{tag}"]`, sorted by `created_at` ASC
- Look for the earliest memory (project inception) and the most recent (latest progress)
- If any memory references a roadmap file, read it for structure

**Resolution output:** After parsing, you should have:
- `PROJECT_NAME`: Human-readable project name
- `PROJECT_TAG`: Tag used in cortex memories (for filtering)
- `ROADMAP_DATA`: Parsed phases/specs (if roadmap file found), or null
- `MEMORIES`: All cortex memories related to this project (sorted chronologically)

### 8.1: Layer P1 — Project Timeline (Always Runs)

Reconstruct the full project timeline by combining git history + cortex memories.

**P1a. Git archaeology** — Find the earliest and all relevant commits:

```bash
# Find all commits mentioning the project name, roadmap, or spec files
git log --all --oneline --format="%H %aI %s" --grep="{PROJECT_NAME}" -- .
git log --all --oneline --format="%H %aI %s" -- specs/todo/ specs/done/ "{roadmap_path}"
```

Parse output via Python script (`tmp_tr_project_p1.py`):
- First commit = project inception (earliest mention)
- Last commit = most recent activity
- Wall-clock duration = last - first
- Commits per day histogram

**P1b. Cortex timeline** — Reconstruct session history:

- Use `cortex_list_memories` with `tags_filter: ["{PROJECT_TAG}"]`, sorted by `created_at` ASC
- For each memory, extract timestamp, type (handoff, build-success, decision, etc.)
- Also use `cortex_get_timeline` to get session-level data with durations
- Build chronological event list

**P1c. Phase identification** — Classify events into lifecycle phases:

If `ROADMAP_DATA` is available (roadmap file was parsed):
- Map each spec to its roadmap phase
- Use git commit timestamps to determine when each phase started/ended
- Phases from roadmap: use the exact phase names and spec assignments

If no roadmap (tag-only or memory-only reference):
- Heuristic phase detection:
  - **Brainstorming**: Memories tagged with planning/brainstorming/meeting, or earliest memories before any spec files exist
  - **Planning**: Commits creating spec files in `specs/todo/`, roadmap creation, `/quick-plan` invocations
  - **Implementation**: Build-success memories, commits moving specs to `specs/done/`, `/build` invocations
  - **Review/Polish**: Crystal Ball runs, retrospectives, cleanup commits

**P1d. Active time estimation** (CRITICAL: all math via Python):

```python
# For each phase, estimate active time using:
# 1. Cortex session durations (most accurate)
# 2. Git commit clustering (commits within 35min = same session)
# 3. Memory timestamps as session boundaries

import json, datetime, sqlite3

# Query sessions that overlap with project timeframe
# Filter by sessions where project-related activities occurred
sessions = conn.execute("""
    SELECT s.started_at, s.ended_at,
           COUNT(a.id) as activity_count,
           SUM(COALESCE(a.duration_ms, 0)) as claude_ms
    FROM sessions s
    LEFT JOIN activities a ON a.session_id = s.id
    WHERE s.started_at >= ? AND s.started_at <= ?
    GROUP BY s.id
    ORDER BY s.started_at
""", (project_start, project_end)).fetchall()
```

**P1e. Display P1:**
```markdown
## Project Time Report: {PROJECT_NAME}

| Metric | Value |
|--------|-------|
| Wall-Clock Duration | {N} days ({first_date} to {last_date}) |
| Total Active Time | {N.N} hrs |
| Sessions | {N} sessions across {N} days |
| Total Commits | {N} |
| Specs Completed | {done}/{total} |
| Status | {Complete / In Progress — N of M specs done} |

### Project Timeline
{date1}  [*] Project inception (first commit/memory)
{date2}  [*] Planning complete (specs generated)
{date3}  [*] Phase 1 started
{date4}  [*] Phase 1 complete (N specs)
...
{dateN}  [*] Most recent activity
```

### 8.2: Layer P2 — Phase Breakdown (Always Runs)

Detailed time analysis per phase.

**P2a. Per-phase timing:**

For each phase (from roadmap or heuristic detection):
- Start timestamp (first commit or memory in phase)
- End timestamp (last commit or memory in phase)
- Wall-clock duration
- Active time (from session data within phase window)
- Number of specs built
- Build method: sequential (`/build`) or parallel (`/agent-teams`)

**P2b. Per-spec timing** (if roadmap available):

For each spec:
- Spec name and number
- Git commit that completed it (moved to `specs/done/`)
- Build-outcome cortex memory (if exists)
- Time from phase start to spec completion
- Agent type: solo build or team member

**P2c. Efficiency metrics** (all via Python):

```python
# Spec velocity: total specs / total active hours
spec_velocity = total_specs / total_active_hours

# Sequential vs parallel comparison
sequential_specs = [s for s in specs if s.build_method == 'sequential']
parallel_specs = [s for s in specs if s.build_method == 'parallel']
seq_avg_time = sum(s.duration for s in sequential_specs) / len(sequential_specs)
par_avg_time = sum(s.duration for s in parallel_specs) / len(parallel_specs)
parallel_speedup = seq_avg_time / par_avg_time if par_avg_time > 0 else 'N/A'

# Overhead ratio: non-build time / total time
overhead_time = total_time - sum(build_times)
overhead_ratio = overhead_time / total_time
```

**P2d. Display P2:**
```markdown
### Phase Breakdown

| Phase | Duration | Active Time | Specs | Method | Avg/Spec |
|-------|----------|-------------|-------|--------|----------|
| Brainstorming | {N} days | {N.N}h | — | — | — |
| Planning | {N} days | {N.N}h | {N} created | /quick-plan | — |
| Phase 1 | {N} days | {N.N}h | {N} | Sequential | {N.N}h |
| Phase 2 | {N} days | {N.N}h | {N} | Parallel x3 | {N.N}h |
| ...   | ... | ... | ... | ... | ... |
| **Total** | **{N} days** | **{N.N}h** | **{N}/{M}** | | **{N.N}h** |

### Time Allocation
  Brainstorming/Planning  |#########          | {N.N}h ({N}%)
  Implementation          |################   | {N.N}h ({N}%)
  Coordination/Overhead   |#####              | {N.N}h ({N}%)

### Spec Completion Timeline
| Spec | Phase | Method | Commit | Date | Time |
|------|-------|--------|--------|------|------|
| 01: quick-plan | P1 | /build | 7444066 | Feb 14 | 0.9h |
| 02: meeting-to | P1 | /build | b5e9a62 | Feb 14 | 0.6h |
| 03: portfolio  | P2 | agent  | 5c6758d | Feb 14 | 0.1h |
| ...  | ... | ... | ... | ... | ... |

### Efficiency
- Spec Velocity: {N.N} specs/active hour
- Sequential Avg: {N.N}h/spec
- Parallel Avg: {N.N}h/spec (agent teams)
- Parallel Speedup: {N.N}x faster than sequential
- Overhead Ratio: {N}% of time on non-build activities
```

### 8.3: Layer P3 — Deep Analysis (Sub-Agent, optional deep flag)

Spawn as Task sub-agent for expensive analysis.

**P3a. Session reconstruction:**
- For each cortex session in the project timeframe, list:
  - Session ID, start/end, duration
  - What was accomplished (from session summary or associated handoff)
  - Tools used, activity count
- Identify "wasted" sessions (sessions with high error rates or no deliverables)

**P3b. Handoff chain analysis:**
- Retrieve all handoff memories for the project (chronological)
- Trace the COMPLETED/IN PROGRESS/NEXT STEPS evolution across handoffs
- Identify items that appeared in NEXT STEPS but were never completed (dropped items)
- Identify items that stayed IN PROGRESS across 3+ handoffs (stuck items)

**P3c. Decision archaeology:**
- Search cortex for decision-type memories related to the project
- Map decisions to timeline: when were key decisions made?
- Identify any decisions that were later reversed (contradicting memories)

**P3d. Agent team analysis** (if agent teams were used):
- For each agent team run: team name, agents spawned, tasks completed, wall-clock time
- Calculate agent utilization: actual parallel work vs coordination overhead
- Compare agent team runs against sequential builds for speedup measurement

**P3e. Layer P3 Scoring** (0-100):
- Base: 50
- +20 if all roadmap specs completed
- +10 if spec velocity above 0.5 specs/hour
- -10 per stuck item (in NEXT STEPS across 3+ handoffs)
- -10 per dropped item (appeared then vanished)
- +10 if parallel speedup > 2x
- -15 if overhead ratio > 60%
- Floor at 0, cap at 100

### 8.4: Layer P4 — Cross-Project Comparison (Sub-Agent, optional deep flag)

Spawn as Task sub-agent. Compares this project against other completed projects.

**P4a. Find comparable projects:**
- Use `cortex_global_search` for other project reports or roadmaps
- Search for other `pr-*.md` reports in `reports/time-reports/`
- If no other project reports exist: return N/A ("First project report — no comparison data")

**P4b. Cross-project metrics** (if comparable data exists):
- Compare: specs/hour, overhead ratio, wall-clock/active ratio, parallel speedup
- Rank this project against others
- Identify if this project was faster/slower than average

**P4c. Lessons learned extraction:**
- What went well? (fastest phases, highest efficiency segments)
- What could improve? (longest phases, highest overhead segments)
- Recommendations for next project of similar scope

**P4d. Layer P4 Scoring** (0-100):
- If no comparison data: N/A
- Base: 50
- +/-20 based on ranking vs other projects
- +10 if improving efficiency over time (later phases faster than earlier)
- +10 if lessons from previous projects were applied
- Floor at 0, cap at 100

### 8.5: Assemble Project Composite Score

```
project_composite = (P1 x 0.25) + (P2 x 0.35) + (P3 x 0.25) + (P4 x 0.15)
```

Weights emphasize phase breakdown (P2) as the most actionable layer.
If P3 or P4 is N/A, redistribute weight equally among available layers.

**P1 Scoring** (0-100):
- Base: 50
- +20 if project completed (all specs done)
- +15 if wall-clock < 7 days for 5+ specs
- +10 if consistent daily activity (>60% of calendar days active)
- -10 per week with zero activity mid-project
- -15 if project stalled (last activity >7 days ago, specs still in todo)
- Floor at 0, cap at 100

**P2 Scoring** (0-100):
- Base: 50
- +15 if overhead ratio < 40%
- +10 if parallel speedup > 2x (used agent teams effectively)
- +10 if spec velocity > 0.5 specs/active hour
- -10 if any phase took >3x the average phase duration (bottleneck)
- -10 if planning phase > 50% of total project time
- Floor at 0, cap at 100

### 8.6: Save Project Report

File: `{PROJECT_DIR}/reports/time-reports/pr-{NNN:03d}-{YYYY-MM-DD}-{project-slug}.md`

**Note:** Project reports use prefix `pr-` (not `tr-`) to distinguish from standard time reports.

YAML frontmatter:
```yaml
---
report_type: "project"
report_number: {NNN}
date: "{YYYY-MM-DD}"
project_name: "{PROJECT_NAME}"
project_tag: "{PROJECT_TAG}"
roadmap_path: "{path_or_null}"
wall_clock_days: {N}
total_active_hours: {N.N}
total_sessions: {N}
total_commits: {N}
specs_completed: {N}
specs_total: {N}
spec_velocity: {N.N}
parallel_speedup: "{N.N_or_NA}"
overhead_ratio: {N.N}
layer_p1_score: {N}
layer_p2_score: {N}
layer_p3_score: {N_or_NA}
layer_p4_score: {N_or_NA}
composite_score: {N}
trend: "{first_project|improving|stable|declining}"
---
```

Body: Full formatted project report output.

### 8.7: Store in Cortex

Use `cortex_remember` with:
- Content: "Project Time Report pr-{NNN} ({PROJECT_NAME}): {specs_done}/{specs_total} specs in {wall_clock} days ({active_hours}h active). Composite: {score}/100. Velocity: {velocity} specs/hr. Parallel speedup: {speedup}x."
- Tags: `["time-report", "project-report", "pr-{NNN}", "{PROJECT_TAG}"]`
- Importance: 75

### 8.8: Final Display

```markdown
---
Project Report: pr-{NNN} | {PROJECT_NAME} | Score: {composite}/100
{specs_done}/{specs_total} specs | {active_hours}h active | {wall_clock} days
Saved to: reports/time-reports/pr-{NNN}-{date}-{slug}.md
```

## Step 9: Global Cross-Project Mode (global mode only)

**This entire step replaces Steps 1-7 when mode is `global`.** Global mode has its own 4-layer system (G1-G4) focused on synthesizing cross-project activity within a date range.

### 9.0: Parse Date Range

When `$ARGUMENTS` starts with `global`, strip the `global` prefix and parse the remaining tokens as a date range.

**Range resolution table:**

| Input | Start (UTC) | End (UTC) |
|-------|------------|----------|
| `1d` | Yesterday 00:00 MST → UTC | Now |
| `3d` | 3 days ago 00:00 MST → UTC | Now |
| `7d` | 7 days ago 00:00 MST → UTC | Now |
| `14d` | 14 days ago 00:00 MST → UTC | Now |
| `weekend` | Most recent Friday 5:00 PM MST → UTC | Most recent Sunday 11:59 PM MST → UTC |
| `week` | Most recent Monday 00:00 MST → UTC | Most recent Sunday 11:59 PM MST → UTC |
| `YYYY-MM-DD YYYY-MM-DD` | Start date 00:00 MST → UTC | End date 23:59 MST → UTC |
| `YYYY-MM-DD` | That date 00:00 MST → UTC | That date 23:59 MST → UTC |

**Weekend shortcut logic:** Find the most recent Friday. If today IS Friday-Sunday, use the current weekend. If Monday-Thursday, use the previous weekend. Friday start = 5:00 PM MST (typical work end), Sunday end = 11:59 PM MST.

**Week shortcut logic:** Most recent Monday 00:00 to Sunday 11:59 PM MST. If today is mid-week, use the current in-progress week.

**All times stored internally as UTC** for comparison against command history timestamps (MST_OFFSET = -7).

**Period label generation:**

| Range | Label |
|-------|-------|
| `weekend` | "Weekend Sprint (Fri-Sun)" |
| `week` | "Weekly Report (Mon-Sun)" |
| `1d` | "Daily Report ({day_name})" |
| `3d` | "3-Day Report ({start_day}-{end_day})" |
| `7d` | "7-Day Report ({start}-{end})" |
| `14d` | "2-Week Report ({start}-{end})" |
| Explicit dates | "{N}-Day Report ({start}-{end})" |

### 9.1: Layer G1 — Project Discovery (inline, no sub-agent)

**Data source:** `~/.claude/stats/command-history.jsonl`

**Steps:**

1. Read the command history file. Each line is JSON: `{"cmd":"...","args":"...","project":"...","ts":"..."}`.
2. Filter entries where `ts` falls within the resolved date range (compare as ISO 8601 strings or parsed datetime).
3. Extract distinct `project` values. Normalize paths: backslash → forward slash, case-insensitive on Windows.
4. For each project, collect:
   - First and last command timestamp (MST)
   - Command count
   - List of unique commands used
   - Whether any `/build`, `/agent-teams`, or `/quick-plan` commands appear (indicates spec work)
5. Sort projects by command count descending.
6. Calculate total commands across all projects.

**Output:** A project registry map used by G2-G4:

```
{
  "C:/Users/Tony/.claude": { first: "...", last: "...", count: 45, commands: [...], has_builds: true },
  "D:/Workshop": { first: "...", last: "...", count: 30, commands: [...], has_builds: true },
  ...
}
```

**Cold start:** If command history has fewer than 5 entries in the range, warn: "Limited command history for this period. Report may be incomplete."

**If command history file doesn't exist:** Display "Command history not found at ~/.claude/stats/command-history.jsonl" and stop.

**If no entries found in range:** Display "No activity found for this period ({period_label})." and stop.

**Display G1:**
```markdown
## Global Time Report: {period_label}

**Period:** {start_date} to {end_date}
**Projects Discovered:** {N}

| # | Project | Commands | First | Last | Has Builds |
|---|---------|----------|-------|------|------------|
| 1 | {project_name} | {count} | {time MST} | {time MST} | Yes/No |
| ... | ... | ... | ... | ... | ... |
| **Total** | | **{total}** | | | |
```

### 9.2: Layer G2 — Per-Project Data Collection (inline, no sub-agent)

For each project discovered in G1:

**Step 1: Check for existing project reports.**

Glob `{project_path}/reports/time-reports/pr-*.md` for each project. For each report found:
- Read only the YAML frontmatter (lines between first `---` and second `---`)
- Parse each line as `key: value`
- Check if the report's `date` falls within the global date range
- If yes: extract all frontmatter metrics (composite_score, specs_completed, total_active_hours, wall_clock_days, parallel_speedup, overhead_ratio, etc.)
- Mark this project as `has_report: true` with the extracted metrics

**Important:** If a project directory no longer exists on disk, skip the report glob — use command history data only.

**Step 2: For projects WITHOUT a matching report**, estimate from command history:
- **Active time:** Sum gaps between consecutive commands where gap < 35 min (GAP_THRESHOLD_MS). Commands within 35 minutes of each other = same session. Sum session durations.
- **Command count and breakdown:** From G1 data
- **Specs:** Count `/build` and `/agent-teams` invocations as proxy for specs completed
- **Score:** null (no formal report to score)

**Step 3: Query Cortex for supplementary data.**

Use `cortex_list_memories` with:
- `tags_filter: ["handoff", "session-summary"]`
- `sort_by: "created_at"`, `sort_order: "desc"`
- `limit: 20`

Filter results where `created_at` falls within the date range.

Extract from matching handoffs:
- COMPLETED sections (deliverables list)
- Skills/MCPs mentioned
- Project progress data
- IN PROGRESS items

**Output:** Per-project data objects ready for aggregation:

```
{
  "project_path": {
    name: "human-readable-name",
    has_report: true/false,
    report_path: "path/to/pr-*.md" or null,
    score: N or null,
    specs: N,
    active_hours: N.N,
    wall_clock_hours: N.N,
    commands: [...],
    deliverables: [...],
    skills_created: N,
    skills_updated: N,
    mcps_created: N,
    source: "report" or "estimated"
  }
}
```

### 9.3: Layer G3 — Gap Work Detection (sub-agent via Task tool)

**Purpose:** Identify work done during the date range that is NOT covered by any existing project report.

Spawn a Task sub-agent that does both G3 (gap detection) AND G4 (report generation) together. This minimizes context transfer between agents.

**G3 Steps:**

1. For each project with an existing `pr-*` report, note the report's timeline (wall-clock start/end from frontmatter or derived from timestamps).
2. Find command history entries that fall OUTSIDE all report timelines — these are "gap" entries.
3. Also: projects that have commands but NO matching project report are entirely "gap work."
4. Group gap entries by project directory.
5. For each gap group, estimate:
   - Active time (from command timestamp gaps, 35-min threshold)
   - What was done (list commands and args)
   - Deliverables (extract from cortex handoffs if available)
6. Check for collab kit syncs: scan for commands with args containing "collab-kit" or "collab" or "sync".
7. Check for emails: scan for `/write-like-me` commands.

**Output:** Gap work summary with per-project breakdown and estimated active time.

### 9.4: Layer G4 — Report Aggregation + Generation (combined with G3 sub-agent)

**Purpose:** Combine all data from G1-G3 into a single `wr-NNN` report.

**9.4a. Determine report number:**
- Glob `{PROJECT_DIR}/reports/time-reports/wr-*.md`
- Extract NNN from filenames using pattern `wr-(\d+)-`
- REPORT_NUMBER = highest NNN + 1 (or 1 if none exist)
- Create `reports/time-reports/` directory if missing

**9.4b. Report filename:**

`reports/time-reports/wr-{NNN:03d}-{YYYY-MM-DD}-{slug}.md`

**Description slug generation for wr- reports:**
- Derive from the range label:
  - `weekend` -> `"weekend-combined"`
  - `week` -> `"week-combined"`
  - `7d` -> `"7day-combined"`
  - `3d` -> `"3day-combined"`
  - `1d` -> `"1day-combined"`
  - `14d` -> `"14day-combined"`
  - Explicit dates -> `"{MM-DD}-to-{MM-DD}"`
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

Where `{slug}` is derived from the range:
- `weekend` → `weekend`
- `week` → `week`
- `7d` → `7day`
- `3d` → `3day`
- `1d` → `1day`
- `14d` → `14day`
- Explicit dates → `{MM-DD}-to-{MM-DD}`

**9.4c. YAML frontmatter:**

```yaml
---
report_type: "combined-global"
report_number: {NNN}
date: "{YYYY-MM-DD}"
period: "{start_date} to {end_date}"
period_label: "{label}"
working_days: {N}
projects_touched: {N}
total_active_hours: {sum}
total_wall_clock_span_hours: {span}
project_reports:
  - name: "{project_name}"
    report: "{path_to_pr_report}"
    score: {N}
    specs: {N}
    active_hours: {N.N}
  - name: "{project_name}"
    report: null
    score: null
    specs: {N}
    active_hours: {N.N}
total_specs_completed: {sum}
total_skills_created: {N}
total_skills_updated: {N}
total_mcps_created: {N}
total_agents_spawned: {N}
total_activities: {sum}
total_commits: {sum}
weighted_composite_score: {weighted_avg}
---
```

**9.4d. Report body sections** (generate each, matching wr-001 format):

1. **Executive Summary** — 2-3 sentence overview of the period. What was the main focus? What was accomplished?

2. **Combined Metrics Table** — Per-project columns + total column:
   ```markdown
   | Metric | {Project1} | {Project2} | Gap Work | **Total** |
   |--------|-----------|-----------|----------|-----------|
   | Active Time | {N.N}h | {N.N}h | {N.N}h | **{N.N}h** |
   | Specs Completed | {N} | {N} | {N} | **{N}** |
   | New Skills | {N} | {N} | {N} | **{N}** |
   | Score | {N}/100 | {N}/100 | -- | **{N}/100** |
   ```

3. **Velocity Comparison** — If 2+ projects have reports, compare:
   - Spec velocity (specs/hour)
   - Parallel speedup (if applicable)
   - Overhead ratio
   - Success rate

4. **Per-Project Summaries** — For each project with a `pr-*` report:
   - Key stats (active time, wall-clock, specs)
   - Deliverables list (from cortex handoffs)
   - Link to full report: `*Full report: {path}*`
   For gap-only projects:
   - Estimated stats from command history
   - Command list and deliverables from cortex

5. **Gap Work Section** — Activities not covered by any project report, grouped by project directory:
   ```markdown
   ## Gap Work: Everything Else

   ### {Project/Directory Name} (~{N}h active)
   | Time (MST) | Activity | Output |
   |------------|----------|--------|
   | {time} | {command} | {description from args or cortex} |
   ```

6. **Combined Peak Hours** — Aggregate hour-of-day histogram across all projects:
   ```
    9 AM  |####                     | {N}
   10 AM  |########                 | {N}
   ...
   ```
   Use MST, 12-hour format. Build from command history timestamps.

7. **Combined Command Usage** — Command frequency table across all projects:
   ```markdown
   | Command | Invocations | Notes |
   |---------|-------------|-------|
   | /handoff | {N} | {note} |
   | /build | {N} | {note} |
   ```

8. **Total Skill Inventory** — All skills created/updated during the period:
   ```markdown
   | # | Skill | Project | Category |
   |---|-------|---------|----------|
   ```
   Source from cortex handoff COMPLETED sections.

9. **Collab Kit Impact** — If collab kit syncs detected:
   - Before/after counts (from cortex memories)
   - Files changed, lines added
   - Sync commits

10. **Composite Score** — Weighted average of project scores by spec count:
    ```markdown
    | Project | Score | Weight (by specs) | Weighted |
    |---------|-------|-------------------|----------|
    ```
    Projects without formal scores are excluded from weighting.

11. **What Went Well / What Could Improve** — Synthesized from individual project reports and cortex handoffs.

12. **Deferred Items** — Merged from all handoff NEXT STEPS that remain open at the end of the period.

**9.4e. Write the report file.**

**9.4f. Display report footer:**
```markdown
---
Weekend Report: wr-{NNN} | {period_label} | Score: {composite}/100
{total_specs} specs | {total_skills} skills | {total_active}h active | {span}h span
Saved to: reports/time-reports/wr-{NNN}-{date}-{slug}.md
```

### 9.5: Store in Cortex

Use `cortex_remember` with:
- Content: "Global Time Report wr-{NNN}: {period_label}. {N} projects, {total_active}h active, {total_specs} specs, score {composite}/100. Report: {report_path}"
- Tags: `["time-report", "global-report", "wr-{NNN}", ...project_tags]`
- Importance: 70

### 9.6: Execution Flow

```
/time-report global <range>
  |
  +-- Parse range argument -> resolve to UTC start/end timestamps + period label
  |
  +-- G1: Project Discovery (inline)
  |   +-- Read command-history.jsonl
  |   +-- Filter by date range
  |   +-- Build project registry map
  |
  +-- G2: Per-Project Data Collection (inline)
  |   +-- Glob pr-*.md reports in each project's reports/time-reports/
  |   +-- Extract YAML frontmatter from matching reports
  |   +-- Estimate metrics for projects without reports
  |   +-- Query cortex for handoff data
  |
  +-- G3+G4: Gap Detection + Report Generation (sub-agent via Task)
  |   +-- Find activities outside all report timelines
  |   +-- Combine G1+G2+G3 -> wr-NNN report file
  |   +-- Write report to reports/time-reports/
  |
  +-- Store report summary in Cortex
```

**Note on parallelism:** G3 depends on G2 output and G4 depends on G3 output. Spawn ONE sub-agent that does both G3+G4 together with all G1+G2 data passed in. This minimizes context transfer.

## Edge Cases

- **No `.omni-cortex/cortex.db`**: Display "No Omni-Cortex database found. Run `/omni-start` first." and stop
- **Empty activities table**: Display "No activity data found." and stop
- **`duration_ms` is NULL for many records**: Note in output: "Duration tracking was recently added; some activities lack timing data."
- **No `specs/done/` directory**: L3 deliverable section says "No completed specs found"
- **Previous reports with missing frontmatter keys**: Use defaults for missing keys (score=0, trend="unknown")
- **Pause/resume memories not found**: "No /omni-pause markers found" (skip exclusion math)
- **Single active day**: streak = 1, sprint section says "No multi-day sprints detected"
- **No previous reports (first run)**: L4 = N/A, trend = "first_run", no trend dashboard
- **Compare mode with < 2 reports**: Display "Need 2+ saved reports to compare. Run `/time-report` (default or deep) first."
- **Weekly mode with no activity in last 7 days**: Display "No activity in the last 7 days."
- **14k+ activities**: Use SQL aggregation in Python scripts, never load all rows into Claude context
- **Project mode — no roadmap file**: Fall back to tag/memory-based heuristic phase detection
- **Project mode — tag matches zero memories**: Display "No memories found for tag '{tag}'. Check tag spelling or use a roadmap file path instead."
- **Project mode — project still in progress**: Mark status as "In Progress" and note which specs remain. Still generates a valid report for completed work so far.
- **Project mode — no git history for specs**: Fall back to cortex memory timestamps only. Note: "Git history unavailable for some specs — using cortex timestamps."
- **Project mode — brainstorming happened in different project directory**: If memories reference another project path, note it but only analyze git history from current project. Cortex memories span all projects via `cortex_global_search`.
- **Project mode — first project report**: P4 = N/A, trend = "first_project", no comparison data
- **Global mode — no command history file**: Display "Command history not found at ~/.claude/stats/command-history.jsonl" and stop
- **Global mode — no entries in range**: Display "No activity found for this period ({period_label})." and stop
- **Global mode — single project in range**: Still produces wr-* report with one project row
- **Global mode — all gap work, no project reports**: Report shows only gap work section, composite score = null
- **Global mode — project directory no longer exists**: Skip report glob, use command history data only
- **Global mode — limited history (< 5 entries)**: Warn "Limited command history for this period. Report may be incomplete."

## Gotchas

- **activities.timestamp NOT created_at** — verified from schema, has caused bugs before
- **MST = UTC-7** — hardcoded, no DST handling (user preference)
- **Gap threshold 35 min** — proven to work well for this user's workflow
- **Report prefix `tr-`** — distinct from self-heal's `sh-` prefix
- **Report directory: `reports/time-reports/`** — see `~/.claude/skills/REPORT-CONVENTION.md`
- **model: opus** — user explicitly requested this on all skills
- **Windows paths in Bash**: Always quote paths, use forward slashes in git bash
- **Large DB queries**: 14k+ rows in activities table. Use Python scripts with SQL aggregation, not inline queries
- **Python temp scripts**: Write to `{PROJECT_DIR}/tmp_tr_layer{N}.py`, always delete after (try/finally)
- **Null duration_ms**: Many records have NULL duration. Use `COALESCE(duration_ms, 0)` or filter with `IS NOT NULL` as appropriate
- **MST 12-hour format**: Use `strftime('%I:%M %p')` for display. "06:30 PM" not "18:30"
- **Project report prefix `pr-`** — distinct from standard `tr-` prefix. Both live in `reports/time-reports/`
- **Project ref detection**: Contains `/` or `.md` = file path. Starts with `mem_` = memory ID. Otherwise = tag.
- **Parallel speedup math**: Only meaningful if both sequential AND parallel builds occurred. If all specs were sequential, report "N/A (no parallel builds)"
- **Cross-project comparison (P4)**: Requires 2+ `pr-*.md` reports to compare. First project always returns N/A for P4.
- **Global report prefix `wr-`** — distinct from `tr-` (standard) and `pr-` (project). All live in `reports/time-reports/`
- **Global mode data source**: Command history JSONL is the backbone — no Cortex DB required (unlike standard/project modes)
- **Global mode path normalization**: Command history stores Windows paths with backslashes. Normalize to forward slashes, case-insensitive matching
- **Global report reuses pr-* data**: YAML frontmatter extraction from existing reports, never recalculates their metrics
- **Gap work = command history entries outside all report timelines**: Group by project, estimate active time with 35-min gap threshold
- **Weighted composite**: Average project scores weighted by spec count. Projects without formal scores excluded from weighting

## Instructions

- Parse $ARGUMENTS for mode (quick/deep/weekly/compare/project/global) before any analysis
- Default mode runs L1 + L2 and saves a report; quick mode runs L1 only without saving
- All time calculations use MST (UTC-7); gaps >35 min are session boundaries
- Track composite score trend against previous reports of the same type
- In global mode, query cortex_export or cortex_global_search across all projects
- Store results in Cortex with tags ["time-report", "{project-name}", "{mode}"]
- Never extrapolate session durations beyond logged activity timestamps

## Report

```
## Time Report — {YYYY-MM-DD}

**Mode:** {mode} | **Period:** {start} to {end}
**Active Days:** {N} | **Total Time:** {Xh Ym}
**Composite Score:** {N}/100 ({trend})

### Layer 1: Time Summary
[Active days, total sessions, time breakdown by session]

### Layer 2: Work Rhythm (default/deep only)
[Sprint patterns, gap analysis, consistency score]

### Layer 3: Productivity Pulse (deep only)
[Velocity metrics, deliverable rate, efficiency score]

### Layer 4: Trend Comparison (deep only)
[Week-over-week delta, burnout risk indicators]

**Report saved to:** reports/time-reports/{filename}
```
