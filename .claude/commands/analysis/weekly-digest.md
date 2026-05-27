---
description: Generate a cross-project weekly summary of all work done across every tracked project
argument-hint: "[week N] or [YYYY-MM-DD to YYYY-MM-DD]"
allowed-tools: mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_global_stats, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_get_activities, Bash, Task, Read, Glob
---

# Weekly Digest

> **CLI-first migration (Spec 17):** Fire-and-forget operations (remember for storing digest)
> use `cortex` CLI via Bash. Interactive MCP calls (global_search, global_stats, get_activities,
> list_memories) remain since the LLM needs structured results. Estimated CLI ratio: ~75%.

Cross-project weekly summary that aggregates accomplishments, progress, blockers, and time investment from Omni-Cortex global data.

## Variables

DATE_RANGE: $ARGUMENTS

## Instructions

### Step 0: Parse Date Range

Determine the reporting period from `$ARGUMENTS`:

```python
import datetime

today = datetime.date.today()

if not DATE_RANGE or DATE_RANGE.strip() == "":
    # Default: last 7 days
    end_date = today
    start_date = today - datetime.timedelta(days=7)

elif DATE_RANGE.strip().lower().startswith("week"):
    # "week 7" or "week 07" → ISO week number for current year
    week_num = int(DATE_RANGE.strip().split()[-1])
    year = today.year
    # Monday of that ISO week
    start_date = datetime.date.fromisocalendar(year, week_num, 1)
    end_date = start_date + datetime.timedelta(days=6)  # Sunday

elif " to " in DATE_RANGE:
    # "2026-02-03 to 2026-02-09"
    parts = DATE_RANGE.split(" to ")
    start_date = datetime.date.fromisoformat(parts[0].strip())
    end_date = datetime.date.fromisoformat(parts[1].strip())

else:
    # Single date → that day only
    start_date = datetime.date.fromisoformat(DATE_RANGE.strip())
    end_date = start_date

# Calculate ISO week label for display
iso_year, iso_week, _ = start_date.isocalendar()
week_label = f"{iso_year}-W{iso_week:02d}"
date_range_display = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
```

### Step 1: Discover Projects

Use `cortex_global_stats` to get the list of all tracked projects with their paths and memory counts.

### Step 2: Parallel Data Gathering

Launch multiple Task sub-agents in parallel to gather data efficiently:

**Sub-Agent A — All Handoffs This Week:**

```
Search for all handoff memories created during the reporting period.

Use cortex_global_search with:
- query: "handoff session-summary"
- tags_filter: ["handoff"]
- limit: 50

Filter results to those with dates within {start_date} to {end_date}.

For each handoff found, extract:
- Project path
- Date
- COMPLETED section items
- IN PROGRESS section items
- NEXT STEPS section items
- BLOCKERS/NOTES section items

Return as structured text grouped by project.
```

**Sub-Agent B — All Memories This Week:**

```
Search for all memories created during the reporting period across all projects.

Use cortex_global_search with:
- query: "session work progress"
- limit: 100

Also search with:
- query: "decision architecture solution"
- limit: 50

Filter results to those with dates within {start_date} to {end_date}.

Group by project and categorize:
- Decisions made (type: "decision")
- Solutions found (type: "solution")
- Errors encountered (type: "error")
- General context (type: "context")

Return counts and key items per project.
```

**Sub-Agent C — Activity Metrics Per Project:**

```
For each project that has a local .omni-cortex/cortex.db, query activity data.

Use cortex_get_activities for the current project if available.

Also use cortex_global_search with:
- query: "activity session time"
- limit: 50

For each project, estimate:
- Number of sessions (from handoff count or session markers)
- Rough time invested (from activity data or session durations)

If direct SQLite access is available via Bash:
  sqlite3 ~/.omni-cortex/global.db "
    SELECT
      project_path,
      COUNT(*) as activity_count,
      COUNT(DISTINCT date(timestamp)) as active_days,
      SUM(duration_ms) / 1000.0 / 60.0 / 60.0 as claude_hours
    FROM activities
    WHERE timestamp >= '{start_date}T00:00:00'
      AND timestamp <= '{end_date}T23:59:59'
    GROUP BY project_path
    ORDER BY activity_count DESC
  "

Return activity counts and time estimates per project.
```

**Sub-Agent D — Health Scores (Current):**

```
For each project, get the latest health indicators.

Use cortex_global_search with:
- query: "self-heal composite score"
- tags_filter: ["self-heal"]
- limit: 20

Use cortex_global_search with:
- query: "crystal ball coherence score"
- tags_filter: ["crystal-ball"]
- limit: 20

Use cortex_global_search with:
- query: "portfolio-health dashboard"
- tags_filter: ["portfolio-health"]
- limit: 1

Extract the most recent scores per project.
Also count open specs per project using Glob for specs/todo/*.md in each project directory.

Return: project, sh_score, cb_score, open_specs_count
```

### Step 3: Aggregate By Project

For each project, compile the data from all sub-agents into a unified structure:

```python
project_digest = {
    "name": project_display_name,       # e.g., "Ralph/ESEI" from path
    "path": project_path,
    "time_invested": hours_from_activities,
    "active_days": count_of_active_days,
    "sessions": session_count,
    "completed": [],                     # from handoff COMPLETED sections
    "in_progress": [],                   # from latest handoff IN PROGRESS
    "blockers": [],                      # from handoff BLOCKERS
    "decisions": [],                     # decision-type memories this week
    "errors_encountered": count,
    "solutions_found": count,
    "specs_completed": count,            # specs moved to done/ this week
    "specs_opened": count,               # new specs in todo/ this week
    "health_score": latest_health,
    "sh_score": latest_sh,
    "cb_score": latest_cb,
    "next_priorities": [],               # from latest handoff NEXT STEPS
}
```

### Step 4: Generate Cross-Project Summary

Calculate aggregate metrics:

```python
total_hours = sum(p.time_invested for p in projects)
total_projects_active = sum(1 for p in projects if p.active_days > 0)
total_specs_completed = sum(p.specs_completed for p in projects)
total_specs_opened = sum(p.specs_opened for p in projects)
total_decisions = sum(len(p.decisions) for p in projects)
total_errors = sum(p.errors_encountered for p in projects)
total_solutions = sum(p.solutions_found for p in projects)

# Portfolio health (weighted average like portfolio-health command)
if projects:
    weights = [max(0.1, 1.0 - (7 - p.active_days) * 0.1) for p in projects]
    portfolio_health = round(
        sum(p.health_score * w for p, w in zip(projects, weights))
        / sum(weights)
    )
else:
    portfolio_health = 0
```

### Step 5: Determine Next Week Priorities

Rank priorities across all projects using this heuristic:

```python
def priority_score(item, project):
    score = 0

    # Items from unhealthy projects get priority
    if project.health_score < 60:
        score += 30

    # Blockers always get high priority
    if item.source == "blocker":
        score += 50

    # Items from active projects (recently worked on) are more urgent
    if project.active_days >= 3:
        score += 20

    # Items that are in-progress take precedence over new items
    if item.source == "in_progress":
        score += 15

    # Open specs that have been waiting longest
    if item.source == "spec":
        score += 10

    return score
```

Take the top 5 items across all projects, ordered by priority_score descending.

### Step 6: Store Digest in Cortex

Use CLI to store the digest (fire-and-forget — Spec 17):
```bash
# CLI: store weekly digest (fire-and-forget)
cortex remember "Weekly digest {week_label}: {total_hours}h across {N} projects. {summary}" \
  --tags weekly-digest,{week_label},cross-project --importance 80 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Weekly digest {week_label}: {total_hours}h across {N} projects. {summary}" \
  --tags weekly-digest,{week_label},cross-project --importance 80 2>/dev/null
```

### Step 7: Output Report

Display the following markdown report:

```markdown
## Weekly Digest: {date_range_display}

Week {week_label} | Generated: {today} MST

---

### {Client/Project 1 Name}

**Time Invested:** {N} hours across {N} days ({N} sessions)

**Completed:**
- {item from handoff COMPLETED — include date if multiple handoffs}
- {item}

**In Progress:**
- {item from latest handoff IN PROGRESS}
- {item}

**Key Decisions:**
- {decision memory content, abbreviated}

**Blockers:**
- {item from handoff BLOCKERS, or "None" if clear}

**Next Week:**
- {priority item from handoff NEXT STEPS}
- {priority item}

---

### {Client/Project 2 Name}

{Same structure as above}

---

### Cross-Project Summary

| Metric | Value |
|--------|-------|
| Total Time | {N} hours across {N} projects |
| Active Days | {N} days with recorded activity |
| Specs Completed | {N} |
| Specs Opened | {N} |
| Decisions Made | {N} |
| Errors Hit | {N} |
| Solutions Found | {N} |
| Portfolio Health | {score}/100 |

### Project Health Snapshot

| Project | Health | Time | Completed | In Progress | Blockers |
|---------|--------|------|-----------|-------------|----------|
| {name} | {score}/100 | {hours}h | {count} | {count} | {count} |
| ... | ... | ... | ... | ... | ... |

### Next Week Priorities

{Numbered list of top 5 cross-project priorities, highest first:}

1. **[{Project}]** {priority item} — {reason for urgency}
2. **[{Project}]** {priority item} — {reason}
3. **[{Project}]** {priority item} — {reason}
4. **[{Project}]** {priority item} — {reason}
5. **[{Project}]** {priority item} — {reason}

### Narrative Summary

{2-3 paragraph natural language summary of the week:}
- What was the main focus this week?
- What were the biggest wins?
- What challenges came up?
- How does this week compare to the project's overall trajectory?
- Any patterns worth noting (e.g., lots of errors in one project, high decision velocity, etc.)?
```

## Edge Cases

- **No data for the period**: Report "No activity recorded for {date_range_display}. Either no sessions were tracked or Omni-Cortex was not active during this period."
- **Single project only**: Skip the Cross-Project Summary table (redundant), but still show the Narrative Summary
- **No handoffs found**: Use memory search results to reconstruct what was worked on; note that handoffs were not created
- **SQLite not accessible**: Fall back entirely to cortex_global_search and cortex_get_activities MCP tools; note that time estimates are approximate
- **Future date range**: Warn "The requested date range extends into the future. Showing data through today only."
- **Very old date range**: If start_date is more than 90 days ago, warn "Data older than 90 days may be incomplete due to memory archival."

## Comparison with Related Commands

| Command | Scope | Focus |
|---------|-------|-------|
| `/weekly-digest` | All projects, 1 week | Accomplishments, blockers, priorities |
| `/portfolio-health` | All projects, current snapshot | Health scores, Eisenhower matrix |
| `/activity-report` | Current project, N hours | Tool usage, error rates, time |
| `/time-report` | Current project, all time | Detailed time investment analysis |
| `/handoff` | Current project, current session | Session context for continuation |

## Notes

- Run this every Friday or Monday to maintain a weekly cadence
- The digest is stored in cortex with the ISO week label for easy retrieval
- Use `/global-search weekly-digest` to find past digests
- Pairs well with `/portfolio-health` for a complete operational picture
- Time estimates depend on Omni-Cortex activity tracking being active during work sessions
- If a project has no activity but has open specs, it still appears in the report as a reminder

## Workflow

1. Parse date range from arguments (default: last 7 days)
2. Discover all tracked projects via `cortex_global_stats`
3. Launch parallel sub-agents to gather handoffs, memories, activities, and health scores
4. Aggregate data by project into unified digest structure
5. Calculate cross-project summary metrics
6. Rank next-week priorities across all projects
7. Store digest in Cortex with week label tag
8. Render and display the full markdown report

## Report

Display the full weekly digest with per-project sections, cross-project summary table, health snapshot, next-week priorities, and narrative summary. Format as described in Step 7 above.
