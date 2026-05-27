---
description: Analyze tool usage patterns and performance across the project
argument-hint: "(no arguments)"
allowed-tools: Bash, mcp__omni-cortex__cortex_get_session_context
---

# Tool Stats

Analyze tool usage patterns and performance across the project.

## Instructions

Query the Omni Cortex database to provide detailed tool performance analytics.

### Queries

1. **Overall Tool Usage**
   ```sql
   SELECT
     tool_name,
     COUNT(*) as total_calls,
     SUM(duration_ms) / 1000.0 / 60.0 as total_minutes,
     AVG(duration_ms) as avg_ms,
     MIN(duration_ms) as min_ms,
     MAX(duration_ms) as max_ms,
     SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as error_count,
     ROUND(100.0 * SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) / COUNT(*), 1) as success_rate
   FROM activities
   WHERE tool_name IS NOT NULL AND event_type = 'post_tool_use'
   GROUP BY tool_name
   ORDER BY total_calls DESC
   ```

2. **Slowest Tools** (by average duration)
   ```sql
   SELECT
     tool_name,
     COUNT(*) as calls,
     AVG(duration_ms) as avg_ms,
     MAX(duration_ms) as max_ms
   FROM activities
   WHERE tool_name IS NOT NULL AND duration_ms IS NOT NULL
   GROUP BY tool_name
   HAVING COUNT(*) >= 5
   ORDER BY AVG(duration_ms) DESC
   LIMIT 10
   ```

3. **Most Time-Consuming** (by total time)
   ```sql
   SELECT
     tool_name,
     COUNT(*) as calls,
     SUM(duration_ms) / 1000.0 / 60.0 as total_minutes,
     ROUND(100.0 * SUM(duration_ms) / (SELECT SUM(duration_ms) FROM activities WHERE duration_ms IS NOT NULL), 1) as pct_of_total
   FROM activities
   WHERE tool_name IS NOT NULL AND duration_ms IS NOT NULL
   GROUP BY tool_name
   ORDER BY SUM(duration_ms) DESC
   LIMIT 10
   ```

4. **Error-Prone Tools**
   ```sql
   SELECT
     tool_name,
     COUNT(*) as total_calls,
     SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as errors,
     ROUND(100.0 * SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) / COUNT(*), 1) as error_rate
   FROM activities
   WHERE tool_name IS NOT NULL
   GROUP BY tool_name
   HAVING SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) > 0
   ORDER BY error_rate DESC
   ```

5. **MCP Tool Usage**
   ```sql
   SELECT
     mcp_server,
     COUNT(*) as calls,
     SUM(duration_ms) / 1000.0 as total_seconds
   FROM activities
   WHERE mcp_server IS NOT NULL
   GROUP BY mcp_server
   ORDER BY calls DESC
   ```

6. **Skill/Command Usage**
   ```sql
   SELECT
     skill_name,
     command_scope,
     COUNT(*) as uses
   FROM activities
   WHERE skill_name IS NOT NULL
   GROUP BY skill_name, command_scope
   ORDER BY uses DESC
   ```

### Output Format

```markdown
## Tool Performance Report

### Usage Summary
| Tool | Calls | Total Time | Avg Time | Success Rate |
|------|-------|------------|----------|--------------|
| ... | ... | ... | ... | ... |

### Slowest Tools (avg)
1. [tool] - [avg_ms]ms average
2. ...

### Most Time-Consuming (total)
1. [tool] - [X] minutes ([Y]% of total)
2. ...

### Error-Prone Tools
| Tool | Calls | Errors | Error Rate |
|------|-------|--------|------------|
| ... | ... | ... | ... |

### MCP Server Usage
| Server | Calls | Total Time |
|--------|-------|------------|
| ... | ... | ... |

### Slash Commands Used
| Command | Scope | Uses |
|---------|-------|------|
| ... | ... | ... |
```

## Report Save

After displaying the report, save it to disk following the unified report convention.

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

### Read Previous Report

Before generating the report:
1. Check for previous reports: Glob `reports/tool-stats/ts-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison
5. Also extract key metrics (total_tool_calls, unique_tools, slowest_tool) for delta comparison

Skills can use the shared utility for this:
```python
import sys; sys.path.insert(0, str(Path.home() / ".claude" / "scripts" / "lib"))
from report_utils import find_previous_report, parse_frontmatter, next_report_number, generate_filename, format_frontmatter, calculate_delta, format_delta_section, generate_trend_table
```

### Save Steps

1. Set `REPORTS_DIR = reports/tool-stats/`
2. Create directory if not exists (`mkdir -p`)
3. Glob `reports/tool-stats/ts-*.md`, extract highest NNN, increment (start at 001)
4. Generate description slug from the analysis context (e.g., `tool-usage-breakdown`, `mcp-performance-analysis`). Max 50 chars, kebab-case.
5. Construct filename: `ts-{NNN}-{YYYY-MM-DD}-{slug}.md`
6. Build YAML frontmatter:

```yaml
---
report_type: "tool-stats"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "default"
period: "{timeframe}"
total_tool_calls: {count}
unique_tools: {count}
total_time_ms: {N}
slowest_tool: "{name}"
most_used_tool: "{name}"
highest_error_rate_tool: "{name}"
mcp_servers_active: {count}
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

7. Write frontmatter + full report content (usage summary, slowest tools, most time-consuming, error-prone tools, MCP server usage, command usage) to the file
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
Compare error-prone tools, slowest tools, and MCP server usage between reports.

9. If 3+ previous reports exist, include a **Trend** section:

```markdown
## Trend (last {N} reports)

| Report | Date | Score | Total Calls | Unique Tools | Success Rate |
|--------|------|-------|-------------|-------------|--------------|
| ... | ... | ... | ... | ... | ... |

**Direction:** {first} -> {last} ({arrow}, {+/-N%})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

10. Display confirmation: `**Report saved to:** reports/tool-stats/{filename}`

## Workflow

1. Locate the Omni-Cortex database (check `.omni-cortex/cortex.db` in the project, then the global path)
2. Run the Overall Tool Usage query to get call counts, durations, and success rates
3. Run the Slowest Tools query (avg duration, min 5 calls)
4. Run the Most Time-Consuming query (total duration as % of all activity)
5. Run the Error-Prone Tools query (tools with at least one failure)
6. Run the MCP Server Usage query
7. Run the Skill/Command Usage query
8. Format all results using the Output Format template
9. Display the report in the conversation
10. Save the report to `reports/tool-stats/` following the Report Save convention
