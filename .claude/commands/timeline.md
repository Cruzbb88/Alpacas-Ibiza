---
description: View a chronological timeline of activities and memories from Omni Cortex
argument-hint: "[hours] [group_by: hour|day|session]"
allowed-tools: Bash, mcp__omni-cortex__cortex_get_timeline
---

# Timeline

View a chronological timeline of activities and memories from Omni Cortex.

## Usage

```
/timeline [hours] [group_by]
```

**Arguments:**
- `hours` - How far back to look (default: 24, max: 168)
- `group_by` - Grouping: `hour`, `day`, or `session` (default: hour)

**Examples:**
```
/timeline              # Last 24 hours, grouped by hour
/timeline 48           # Last 48 hours
/timeline 72 day       # Last 3 days, grouped by day
/timeline 24 session   # Last 24 hours, grouped by session
```

## Instructions

Use the `cortex_get_timeline` MCP tool to fetch timeline data.

### Parse Arguments

1. First argument (if numeric): hours lookback (default: 24)
2. Second argument (if provided): group_by option (hour/day/session)

### Call the Tool

```python
cortex_get_timeline(params={
    "hours": <parsed_hours>,
    "group_by": "<parsed_group_by>",
    "include_activities": True,
    "include_memories": True
})
```

### Format Output

Present the timeline in a clear, scannable format:

```markdown
## Timeline (Last [X] Hours)

**Period:** [start_time] → [end_time]
**Grouping:** by [hour/day/session]

---

### [Group Label 1]

**Activities:**
- [HH:MM] [tool_name]: [brief description or input summary]
- [HH:MM] [tool_name]: [brief description]

**Memories Created:**
- [HH:MM] [memory_type]: [content preview...]

---

### [Group Label 2]
...
```

### Display Guidelines

1. **Timestamps**: Show times in local format (HH:MM for hourly, date for daily)
2. **Activities**: Show tool name and truncated input/description (max 60 chars)
3. **Memories**: Show type and content preview (max 80 chars)
4. **Errors**: Highlight failed activities with indicator
5. **Empty periods**: Skip groups with no activity (don't show empty sections)

### Summary Footer

End with a quick summary:

```markdown
---
**Summary:** [X] activities, [Y] memories across [Z] [hours/days/sessions]
```

## Report Save

After displaying the report, save it to disk following the unified report convention.
See: `~/.claude/skills/REPORT-CONVENTION.md`

1. Set `REPORTS_DIR = reports/timeline/`
2. Create directory if not exists (`mkdir -p`)
3. Glob `reports/timeline/tl-*.md`, extract highest NNN, increment (start at 001)
4. Generate description slug from period and grouping (e.g., `24h-hourly-timeline`, `72h-daily-timeline`, `48h-session-timeline`). Max 50 chars, kebab-case.
5. Construct filename: `tl-{NNN}-{YYYY-MM-DD}-{slug}.md`
6. Build YAML frontmatter:

```yaml
---
report_type: "timeline"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "default"
period_hours: {N}
grouping: "{hour|day|session}"
total_activities: {count}
total_memories: {count}
time_span: "{start_time to end_time}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

7. Write frontmatter + full report content (chronological timeline entries, memory events, error indicators, summary) to the file
8. Display confirmation: `**Report saved to:** reports/timeline/{filename}`

## Workflow

1. Parse `$ARGUMENTS`: first token as hours (default 24), second token as group_by (default `hour`)
2. Validate hours is numeric and within range (1–168); validate group_by is one of `hour`, `day`, `session`
3. Call `cortex_get_timeline` with parsed params, `include_activities: true`, `include_memories: true`
4. Group results by the requested unit; skip empty groups
5. Format each group with timestamped activities and memory previews per the Output Format template
6. Append the summary footer with total activity and memory counts
7. Display the formatted timeline in the conversation
8. Save the report to `reports/timeline/` following the Report Save convention
