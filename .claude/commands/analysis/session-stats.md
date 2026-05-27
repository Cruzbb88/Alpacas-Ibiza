---
description: Show detailed tool usage, duration, and error statistics for the current or recent Omni-Cortex sessions
argument-hint: "(no arguments)"
allowed-tools: Bash, mcp__omni-cortex__cortex_get_session_context, Glob
model: sonnet
---

# Session Stats

Show detailed statistics for the current or recent sessions.

## Instructions

Query the Omni Cortex database to show session statistics with concrete durations.

### Current Session Detection

Check for active session in `.omni-cortex/current_session.json`:
```python
import json
from pathlib import Path

session_file = Path(".omni-cortex/current_session.json")
if session_file.exists():
    current = json.loads(session_file.read_text())
    session_id = current.get("session_id")
```

### Queries

1. **Session Info**
   ```sql
   SELECT
     s.id,
     s.started_at,
     s.ended_at,
     s.duration_ms / 1000.0 / 60.0 as duration_minutes,
     ss.total_activities,
     ss.total_memories_created,
     ss.tool_duration_breakdown
   FROM sessions s
   LEFT JOIN session_summaries ss ON s.id = ss.session_id
   ORDER BY s.started_at DESC
   LIMIT 5
   ```

2. **Tool Usage for Session**
   ```sql
   SELECT
     tool_name,
     COUNT(*) as count,
     SUM(duration_ms) / 1000.0 as total_seconds,
     AVG(duration_ms) as avg_ms,
     SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors
   FROM activities
   WHERE session_id = ?
   GROUP BY tool_name
   ORDER BY COUNT(*) DESC
   ```

3. **Files Modified**
   ```sql
   SELECT DISTINCT file_path
   FROM activities
   WHERE session_id = ? AND file_path IS NOT NULL
   ```

4. **Errors Encountered**
   ```sql
   SELECT tool_name, error_message, timestamp
   FROM activities
   WHERE session_id = ? AND success = 0 AND error_message IS NOT NULL
   ORDER BY timestamp DESC
   LIMIT 10
   ```

### Output Format

```markdown
## Session: [session_id]
- Started: [timestamp]
- Duration: [X hours Y minutes] (concrete)
- Activities: [count]
- Memories Created: [count]

### Tool Usage
| Tool | Calls | Total Time | Avg Time | Errors |
|------|-------|------------|----------|--------|
| ... | ... | ... | ... | ... |

### Files Modified
- file1.py
- file2.ts
- ...

### Errors (if any)
- [timestamp] [tool]: [error]
```

## Report Save

After displaying the report, save it to disk following the unified report convention.

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

### Read Previous Report

Before generating the report:
1. Check for previous reports: Glob `reports/session-stats/ss-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison
5. Also extract key metrics (total_activities, errors, top_tool) for delta comparison

Skills can use the shared utility for this:
```python
import sys; sys.path.insert(0, str(Path.home() / ".claude" / "scripts" / "lib"))
from report_utils import find_previous_report, parse_frontmatter, next_report_number, generate_filename, format_frontmatter, calculate_delta, format_delta_section, generate_trend_table
```

### Save Steps

1. Set `REPORTS_DIR = reports/session-stats/`
2. Create directory if not exists (`mkdir -p`)
3. Glob `reports/session-stats/ss-*.md`, extract highest NNN, increment (start at 001)
4. Generate description slug from session context (e.g., `workshop-session`, `genius-toolkit-session`) or `session-summary` if no clear context. Max 50 chars, kebab-case.
5. Construct filename: `ss-{NNN}-{YYYY-MM-DD}-{slug}.md`
6. Build YAML frontmatter:

```yaml
---
report_type: "session-stats"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "default"
session_id: "{id}"
session_duration: "{hours:minutes}"
total_activities: {count}
memories_created: {count}
files_modified: {count}
errors: {count}
top_tool: "{most used tool}"
top_tool_calls: {count}
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

7. Write frontmatter + full report content (session metadata, tool usage table, files modified, errors) to the file
8. If a previous report exists, include the **Changes Since Last Report** delta section:

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {item description}

**RESOLVED** ({count} items):
- [RESOLVED] {item description}

**MOVED** ({count} items):
- [MOVED] {item}: {previous_category} -> {current_category}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous_%}% -> {current_%}%
```

Rules: Omit categories with 0 items. First report = omit delta section entirely.
Compare error-prone tools, top tools, and activity counts between reports.

9. If 3+ previous reports exist, include a **Trend** section:

```markdown
## Trend (last {N} reports)

| Report | Date | Score | Activities | Errors | Top Tool |
|--------|------|-------|-----------|--------|----------|
| ... | ... | ... | ... | ... | ... |

**Direction:** {first} -> {last} ({arrow}, {+/-N%})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

10. Display confirmation: `**Report saved to:** reports/session-stats/{filename}`

## Workflow

1. Check `.omni-cortex/current_session.json` for the active session ID
2. If no active session, query the 5 most recent sessions from the database
3. Run the Session Info query to get duration, activity counts, and memory counts
4. Run the Tool Usage query for the target session
5. Run the Files Modified query for the target session
6. Run the Errors query for the target session
7. Format results using the Output Format template
8. Display the report in the conversation
9. Save the report to `reports/session-stats/` following the Report Save convention
