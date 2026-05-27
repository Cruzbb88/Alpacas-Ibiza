---
description: Generate a summary of recent Omni-Cortex activities with timeline and tool distribution
argument-hint: "number of hours to look back (default: 24)"
allowed-tools: mcp__omni-cortex__cortex_get_timeline, mcp__omni-cortex__cortex_global_stats, Bash, Glob
model: sonnet
---

# Activity Report

Generate a summary of recent activities with timeline view.

## Usage

```
/activity-report [hours]
```

Default: Last 24 hours

## Instructions

Query the Omni Cortex database to show activity patterns.

### Parse Arguments

If user provides a number, use that as hours lookback. Default to 24.

### Queries

1. **Activity Summary**
   ```sql
   SELECT
     COUNT(*) as total_activities,
     COUNT(DISTINCT tool_name) as unique_tools,
     COUNT(DISTINCT session_id) as sessions,
     SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
     SUM(duration_ms) / 1000.0 / 60.0 as total_minutes
   FROM activities
   WHERE timestamp >= datetime('now', '-{hours} hours')
   ```

2. **Hourly Distribution**
   ```sql
   SELECT
     strftime('%Y-%m-%d %H:00', timestamp) as hour,
     COUNT(*) as activity_count,
     COUNT(DISTINCT tool_name) as tools_used
   FROM activities
   WHERE timestamp >= datetime('now', '-{hours} hours')
   GROUP BY strftime('%Y-%m-%d %H:00', timestamp)
   ORDER BY hour
   ```

3. **Tool Distribution**
   ```sql
   SELECT
     tool_name,
     COUNT(*) as count,
     ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM activities WHERE timestamp >= datetime('now', '-{hours} hours')), 1) as pct
   FROM activities
   WHERE timestamp >= datetime('now', '-{hours} hours') AND tool_name IS NOT NULL
   GROUP BY tool_name
   ORDER BY count DESC
   LIMIT 10
   ```

4. **Error Timeline**
   ```sql
   SELECT
     timestamp,
     tool_name,
     error_message
   FROM activities
   WHERE timestamp >= datetime('now', '-{hours} hours')
     AND success = 0
     AND error_message IS NOT NULL
   ORDER BY timestamp DESC
   LIMIT 20
   ```

5. **Activity Text Density** (simple heatmap)
   ```sql
   SELECT
     strftime('%H', timestamp) as hour_of_day,
     COUNT(*) as count
   FROM activities
   WHERE timestamp >= datetime('now', '-7 days')
   GROUP BY strftime('%H', timestamp)
   ORDER BY hour_of_day
   ```

### Output Format

```markdown
## Activity Report (Last [X] Hours)

### Summary
- Total Activities: [count]
- Unique Tools: [count]
- Sessions: [count]
- Errors: [count]
- Total Active Time: [X] minutes

### Hourly Timeline
| Hour | Activities | Tools |
|------|------------|-------|
| ... | ... | ... |

### Activity Heatmap (by hour of day)
```
00: ████████ (120)
01: ██████ (90)
02: ██ (30)
...
```

### Tool Distribution
| Tool | Count | % |
|------|-------|---|
| ... | ... | ... |

### Recent Errors
- [timestamp] [tool]: [error]
- ...
```

## Report Save

After displaying the report, save it to disk following the unified report convention.

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

### Read Previous Report

Before generating the report:
1. Check for previous reports: Glob `reports/activity-reports/ar-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison
5. Also extract key metrics (total_activities, errors, peak_hour) for delta comparison

Skills can use the shared utility for this:
```python
import sys; sys.path.insert(0, str(Path.home() / ".claude" / "scripts" / "lib"))
from report_utils import find_previous_report, parse_frontmatter, next_report_number, generate_filename, format_frontmatter, calculate_delta, format_delta_section, generate_trend_table
```

### Save Steps

1. Set `REPORTS_DIR = reports/activity-reports/`
2. Create directory if not exists (`mkdir -p`)
3. Glob `reports/activity-reports/ar-*.md`, extract highest NNN, increment (start at 001)
4. Generate description slug from the period label (e.g., `24h-activity-summary`, `48h-activity-summary`) or `daily-activity-summary` if default 24h. Max 50 chars, kebab-case.
5. Construct filename: `ar-{NNN}-{YYYY-MM-DD}-{slug}.md`
6. Build YAML frontmatter:

```yaml
---
report_type: "activity-report"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "default"
period: "{timeframe analyzed, e.g. 'Last 24 hours'}"
total_activities: {count}
unique_tools: {count}
sessions: {count}
errors: {count}
active_minutes: {N}
peak_hour: "{HH:00}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

7. Write frontmatter + full report content (summary, hourly timeline, heatmap, tool distribution, recent errors) to the file
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
Compare activity levels, error counts, and peak hours between reports.

9. If 3+ previous reports exist, include a **Trend** section:

```markdown
## Trend (last {N} reports)

| Report | Date | Score | Activities | Errors | Peak Hour |
|--------|------|-------|-----------|--------|-----------|
| ... | ... | ... | ... | ... | ... |

**Direction:** {first} -> {last} ({arrow}, {+/-N%})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

10. Display confirmation: `**Report saved to:** reports/activity-reports/{filename}`

## Workflow

1. Parse `$ARGUMENTS` — extract hours lookback value (default: 24)
2. Run the 5 queries (Activity Summary, Hourly Distribution, Tool Distribution, Error Timeline, Heatmap) against the Omni-Cortex database, substituting `{hours}` with the parsed value
3. Build the formatted markdown report (summary, hourly timeline, heatmap, tool distribution, recent errors)
4. Display the report to the user
5. Save the report to `reports/activity-reports/` following the unified report convention (numbered filename, YAML frontmatter)
