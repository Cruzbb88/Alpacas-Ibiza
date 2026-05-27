---
name: error-trends
description: >-
  Analyze tool failure trends across sessions to detect recurring patterns, identify systemic issues,
  and recommend fixes. Use when: (1) Investigating why tools keep failing, (2) Looking for patterns
  in tool errors, (3) Checking error health across sessions, (4) After /retrospective flags recurring
  failures, (5) User asks about tool failures, error patterns, or systemic issues.
argument-hint: "[days N] [category <tool|error|project>] [top N]"
allowed-tools: Read, Write, Glob, Grep, Bash, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember
---

# Error Trends

Analyze `tool_failures.jsonl` files and Cortex failure digests across sessions.

## Arguments

Parse `$ARGUMENTS` for:
- **days N** - Analyze last N days (default: 7)
- **category tool|error|project** - Group by tool name, error pattern, or project (default: all)
- **top N** - Show top N results per category (default: 10)
- No args = full 7-day analysis across all categories

## Data Sources

Collect failures from two sources:

### 1. Active failure logs (current session)
Search all projects for `.omni-cortex/tool_failures.jsonl`:
```
Glob pattern: D:\Projects\**\.omni-cortex\tool_failures.jsonl
```

### 2. Archived failure logs (previous sessions)
```
Glob pattern: D:\Projects\**\.omni-cortex\tool_failures.*.jsonl
```

### 3. Cortex failure digests (session summaries)
```
cortex_list_memories with tags_filter: ["tool-failures", "session-digest"]
```

## Analysis Steps

1. **Gather** - Read all .jsonl files and Cortex digests within the date range
2. **Parse** - Each JSONL entry: `{timestamp, tool_name, error, input_summary, project_path}`
3. **Analyze** - Run the script: `uv run scripts/analyze_failures.py` with collected data piped as stdin
4. **Present** - Display the formatted report

## Running Analysis

Pipe all collected JSONL data (one entry per line) into the script:

```powershell
# Collect all failure files, concatenate, pipe to analyzer
Get-Content D:\Projects\**\.omni-cortex\tool_failures*.jsonl | uv run C:\Users\Tony\.claude\commands\error-trends\scripts\analyze_failures.py --days 7 --top 10
```

Or if no files exist yet, use Cortex digests and present a summary manually.

## Output Format

Present the report as:

```
## Error Trends Report (Last N Days)

**Period:** [start] to [end]
**Total Failures:** [count] across [N] projects
**Trend:** [increasing/decreasing/stable] vs previous period

### By Tool (Top N)
| Tool | Failures | % | Trend | Most Common Error |
|------|----------|---|-------|-------------------|
| Bash | 15 | 42% | +5 | Exit code 1 |

### By Error Pattern (Top N)
| Pattern | Count | Tools Affected | Projects |
|---------|-------|---------------|----------|
| path not found | 12 | Read, Glob | 3 |

### By Project
| Project | Failures | Top Tool | Top Error |
|---------|----------|----------|-----------|
| video-studio | 8 | Bash | missing dep |

### Recurring Patterns (3+ occurrences)
Patterns that repeat often enough to warrant systemic fixes:
- **[pattern]** ([count]x) - Recommendation: [fix]

### Recommendations
1. [Actionable recommendation based on patterns]
2. [...]

### Next Actions
- Run `/apply-learnings` to address recurring patterns
- Update CLAUDE.md with workarounds for systemic issues
```

## Report Save

After displaying the report, save it to disk following the unified report convention.

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

### Read Previous Report

Before generating the report:
1. Check for previous reports: Glob `reports/error-trends/et-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison
5. Also extract key metrics (total_failures, recurring_patterns, top_tool) for delta comparison

Skills can use the shared utility for this:
```python
import sys; sys.path.insert(0, str(Path.home() / ".claude" / "scripts" / "lib"))
from report_utils import find_previous_report, parse_frontmatter, next_report_number, generate_filename, format_frontmatter, calculate_delta, format_delta_section, generate_trend_table
```

### Save Steps

1. Set `REPORTS_DIR = reports/error-trends/`
2. Create directory if not exists (`mkdir -p`)
3. Glob `reports/error-trends/et-*.md`, extract highest NNN, increment (start at 001)
4. Generate description slug from the top error pattern (e.g., `bash-failure-trends`) or `tool-failure-analysis` if no clear pattern. Max 50 chars, kebab-case.
5. Construct filename: `et-{NNN}-{YYYY-MM-DD}-{slug}.md`
6. Build YAML frontmatter:

```yaml
---
report_type: "error-trends"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "default"
period: "{date range analyzed}"
total_failures: {count}
recurring_patterns: {count}
top_tool: "{most failing tool}"
top_tool_failures: {count}
trend_direction: "{increasing|decreasing|stable}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

7. Write frontmatter + full report content (all sections: tool rankings, error patterns, project distribution, recurring patterns, recommendations) to the file
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
Compare recurring patterns, top failing tools, and error counts between reports.

9. If 3+ previous reports exist, include a **Trend** section:

```markdown
## Trend (last {N} reports)

| Report | Date | Score | Total Failures | Recurring Patterns | Top Tool |
|--------|------|-------|---------------|-------------------|----------|
| ... | ... | ... | ... | ... | ... |

**Direction:** {first} -> {last} ({arrow}, {+/-N%})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

10. Display confirmation: `**Report saved to:** reports/error-trends/{filename}`

**Note:** Even though error-trends analyzes cross-project data, the report saves in the CURRENT project's `reports/` directory.

## When No Data Exists

If no failure files or digests are found:
```
## Error Trends Report

No tool failures recorded yet. The PostToolUseFailure hook logs failures to
`.omni-cortex/tool_failures.jsonl` in each project. Failures will appear
here after they occur in future sessions.

Status: Clean - no errors to report.
```

Even when no data exists, still save the report (with `total_failures: 0`).

## Instructions

- Parse $ARGUMENTS for days, category, and top-N filters before collecting data
- Collect from both active `.omni-cortex/tool_failures.jsonl` files and archived logs
- Group failures by tool name, error pattern, and project for multi-dimensional analysis
- Flag patterns with 3+ occurrences as "Recurring" — these are systemic issues
- Always save report even when no data exists (use total_failures: 0)
- Store findings in Cortex with tags ["error-trends", "tool-failures", "session-digest"]

## Workflow

1. Parse $ARGUMENTS for days N (default 7), category filter, and top N (default 10)
2. Glob all tool_failures.jsonl files across projects within the date range
3. Also query cortex_list_memories with tags_filter ["tool-failures", "session-digest"]
4. Parse each JSONL entry: {timestamp, tool_name, error, input_summary, project_path}
5. Run analysis script or manually aggregate by tool, error pattern, and project
6. Identify recurring patterns (3+ occurrences) and generate recommendations
7. Display the formatted Error Trends Report
8. Save report to reports/error-trends/ following REPORT-CONVENTION.md

## Report

```
## Error Trends Report (Last N Days)

**Period:** [start] to [end]
**Total Failures:** [count] across [N] projects
**Trend:** [increasing/decreasing/stable]

### By Tool | By Error Pattern | By Project
[Tables as defined in Output Format section]

### Recurring Patterns
[Patterns with 3+ occurrences and fix recommendations]

### Recommendations
[Actionable fixes for systemic issues]

**Report saved to:** reports/error-trends/{filename}
```
