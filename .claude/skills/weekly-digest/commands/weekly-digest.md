# /weekly-digest Command

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md
>
> **CLI-first migration (Spec 17):** Fire-and-forget operations (remember for storing digest)
> use `cortex` CLI via Bash. Interactive MCP calls (global_search, global_stats, get_activities,
> list_memories, get_timeline) remain since the LLM needs structured results for aggregation.
> Estimated CLI ratio: ~75%.

Generate a cross-project weekly summary with time tracking, accomplishments, billable analysis, and trends.

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for these flags:

```
--week YYYY-MM-DD    Target week containing this date (default: today)
--mode quick|standard|deep    Layer depth (default: standard)
--project <name>     Filter to a specific project (substring match)
```

Determine ISO week boundaries (Monday 00:00 to Sunday 23:59) for the target date:

```bash
python3 << 'PYEOF'
import datetime, sys

target = "$WEEK_DATE"  # Replace with parsed date or "today"
if target == "today" or not target:
    d = datetime.date.today()
else:
    d = datetime.date.fromisoformat(target)

# ISO week: Monday = 0
monday = d - datetime.timedelta(days=d.weekday())
sunday = monday + datetime.timedelta(days=6)
print(f"WEEK_START={monday.isoformat()}")
print(f"WEEK_END={sunday.isoformat()}")
print(f"WEEK_LABEL=Week of {monday.strftime('%b %d')} - {sunday.strftime('%b %d, %Y')}")
PYEOF
```

Store: `WEEK_START`, `WEEK_END`, `WEEK_LABEL`, `MODE`, `PROJECT_FILTER`.

---

## Layer 1: Time Summary (always runs)

### Step 1.1: Gather Timeline Data

Query Omni-Cortex for all activity in the target week:

```
cortex_get_timeline with date range WEEK_START to WEEK_END
```

If `--project` filter is set, filter results to matching project names (case-insensitive substring match).

Also check for existing time-report data:

```
Glob: ~/.claude/reports/time-report/tr-*.md
```

If recent time-report exists for the target week, read and extract per-project hours from it as a cross-reference.

### Step 1.2: Compute Time Allocation (BASH ONLY)

ALL computation MUST happen in a Python script via Bash. Feed the gathered data as JSON:

```bash
python3 << 'PYEOF'
import json

# Raw session/activity data from cortex (paste as JSON literal)
raw_data = '''$TIMELINE_JSON'''
data = json.loads(raw_data)

per_project = {}
total_sessions = 0
for entry in data:
    proj = entry.get('project', 'Unknown')
    hours = entry.get('duration_minutes', 0) / 60
    per_project.setdefault(proj, {'hours': 0, 'sessions': 0})
    per_project[proj]['hours'] += hours
    per_project[proj]['sessions'] += 1
    total_sessions += 1

total_hours = sum(v['hours'] for v in per_project.values())

# Sort by hours descending, cap at top 10
sorted_projects = sorted(per_project.items(), key=lambda x: -x[1]['hours'])
top_10 = sorted_projects[:10]
other = sorted_projects[10:]

print("| Project | Sessions | Hours | % of Week |")
print("|---------|----------|-------|-----------|")
for proj, stats in top_10:
    pct = (stats['hours'] / total_hours * 100) if total_hours > 0 else 0
    print(f"| {proj} | {stats['sessions']} | {stats['hours']:.1f}h | {pct:.0f}% |")

if other:
    other_hours = sum(v['hours'] for _, v in other)
    other_sessions = sum(v['sessions'] for _, v in other)
    other_pct = (other_hours / total_hours * 100) if total_hours > 0 else 0
    print(f"| Other ({len(other)} projects) | {other_sessions} | {other_hours:.1f}h | {other_pct:.0f}% |")

print(f"| **Total** | **{total_sessions}** | **{total_hours:.1f}h** | **100%** |")

# Output JSON summary for downstream layers
summary = {
    'total_hours': round(total_hours, 1),
    'total_sessions': total_sessions,
    'projects': {p: {'hours': round(s['hours'], 1), 'sessions': s['sessions']}
                 for p, s in sorted_projects}
}
print(f"\n__JSON_SUMMARY__")
print(json.dumps(summary))
PYEOF
```

### Step 1.3: Format L1 Output

```markdown
## L1: Time Summary
### $WEEK_LABEL

| Project | Sessions | Hours | % of Week |
|---------|----------|-------|-----------|
| ... (from computation above) |

**Total: {N}h across {N} sessions in {N} projects**
```

**If mode is `quick`**: Output L1 table and stop. Do NOT save a report.

---

## Layer 2: Accomplishments (standard + deep modes)

### Step 2.1: Gather Handoff Memories

Search cortex for handoff memories in the target week:

```
cortex_global_search with:
  - tags: ["handoff"]
  - date filter: WEEK_START to WEEK_END
```

Also search for activity memories:

```
cortex_list_memories with date range
```

If `--project` filter is set, filter to matching project names.

### Step 2.2: Parse Handoff Content

For each handoff memory, extract:

1. **Project name**: From memory metadata or content header
2. **COMPLETED sections**: Look for lines starting with `COMPLETED:`, `## Completed`, `- [x]`, or `Done:` patterns
3. **BLOCKERS sections**: Look for lines starting with `BLOCKERS:`, `## Blockers`, `Blocked by:`, or `Open:` patterns
4. **General accomplishments**: Bullet points describing what was done

### Step 2.3: Identify Undocumented Time

Compare L1 project list against projects that have handoff memories:

- Projects with sessions but NO handoffs = "Undocumented time"
- Flag these with hours and note: "No handoff found for this project"
- This is important for billing accuracy

### Step 2.4: Format L2 Output

Group by project, sorted by hours (from L1):

```markdown
## L2: Accomplishments & Blockers

### {Project Name} ({N}h this week)

**Completed:**
- {accomplishment 1}
- {accomplishment 2}

**Blockers:**
- {blocker 1} (from handoff on {date})

---

### Undocumented Time
| Project | Hours | Note |
|---------|-------|------|
| {project} | {N}h | No handoff found |
```

**If mode is `standard`**: Output L1 + L2, save report, and stop.

---

## Layer 3: Billable Analysis (deep mode only)

### Deep Mode Execution

Spawn 2 Task sub-agents in a single message (parallel execution):

**Task 1 (L3 - Billable Analysis):**
- subagent_type: "general-purpose"
- Prompt: Complete L3 analysis with billing rates and project data

**Task 2 (L4 - Trend Comparison):**
- subagent_type: "general-purpose"
- Prompt: Complete L4 analysis with previous digest reports

### L3 Sub-Agent Instructions

#### Step 3.1: Load Billing Rates

```
Read: ~/.claude/config/billing-rates.json
```

If file does not exist:
- Note: "No billing configuration found at ~/.claude/config/billing-rates.json"
- Show expected format (from SKILL.md documentation)
- Use $0/hr placeholder and skip monetary calculations
- Still report raw hours per project

Expected `billing-rates.json` format:
```json
{
  "default_rate": 150,
  "currency": "USD",
  "projects": {
    "project-name": {
      "rate": 175,
      "budget": 5000,
      "billing_type": "hourly"
    }
  }
}
```

#### Step 3.2: Calculate Billable Amounts (BASH ONLY)

```bash
python3 << 'PYEOF'
import json

# Per-project hours from L1 (passed as JSON)
hours_data = '''$L1_HOURS_JSON'''
rates_data = '''$RATES_JSON'''

hours = json.loads(hours_data)
rates = json.loads(rates_data)

default_rate = rates.get('default_rate', 0)
currency = rates.get('currency', 'USD')
project_rates = rates.get('projects', {})

print(f"| Project | Hours | Rate ({currency}/hr) | Amount | Budget | Remaining |")
print(f"|---------|-------|------|--------|--------|-----------|")

total_billable = 0
for proj, stats in sorted(hours['projects'].items(), key=lambda x: -x[1]['hours']):
    h = stats['hours']
    proj_config = project_rates.get(proj, {})
    rate = proj_config.get('rate', default_rate)
    budget = proj_config.get('budget', None)
    amount = h * rate
    total_billable += amount

    budget_str = f"${budget:,.0f}" if budget else "N/A"
    remaining_str = f"${budget - amount:,.0f}" if budget else "N/A"
    print(f"| {proj} | {h:.1f}h | ${rate:,.0f} | ${amount:,.2f} | {budget_str} | {remaining_str} |")

print(f"| **Total** | **{hours['total_hours']:.1f}h** | | **${total_billable:,.2f}** | | |")
PYEOF
```

#### Step 3.3: Flag Unbilled Time

Cross-reference session data with handoff data:
- Sessions WITHOUT handoffs = potentially unbilled
- Report: "{N}h of undocumented time across {N} projects"
- List each unbilled project with hours

#### Step 3.4: Format L3 Output

```markdown
## L3: Billable Analysis

### Invoiceable Summary
| Project | Hours | Rate | Amount | Budget | Remaining |
|---------|-------|------|--------|--------|-----------|
| ... (from computation above) |

### Unbilled Time Warning
{N}h across {N} projects had no handoff documentation:
- {project}: {N}h

### Budget Status
- {project}: ${amount} of ${budget} used ({pct}%)
- ...
```

---

## Layer 4: Trend Comparison (deep mode only)

### L4 Sub-Agent Instructions

#### Step 4.1: Load Previous Digests

```
Glob: ~/.claude/reports/weekly-digest/wd-*.md
```

Read the most recent 4 reports (if they exist). Extract YAML frontmatter for:
- `total_hours`, `total_sessions`, `total_projects`
- Per-project hours breakdown
- Composite scores

If no previous digests exist:
- Output: "First weekly digest -- no trend data yet"
- Skip trend calculations
- Set L4 score to N/A

#### Step 4.2: Calculate Trends (BASH ONLY)

```bash
python3 << 'PYEOF'
import json

# Current week data
current = '''$CURRENT_WEEK_JSON'''
# Previous weeks data (list of weekly summaries)
previous = '''$PREVIOUS_WEEKS_JSON'''

curr = json.loads(current)
prev_weeks = json.loads(previous)

if not prev_weeks:
    print("First weekly digest -- no trend data yet")
else:
    last = prev_weeks[-1]
    hours_delta = curr['total_hours'] - last['total_hours']
    sessions_delta = curr['total_sessions'] - last['total_sessions']
    sign = '+' if hours_delta >= 0 else ''
    print(f"Hours: {curr['total_hours']:.1f}h ({sign}{hours_delta:.1f}h vs last week)")
    print(f"Sessions: {curr['total_sessions']} ({sign}{sessions_delta} vs last week)")

    # Per-project trends
    print("\n| Project | This Week | Last Week | Delta | Trend |")
    print("|---------|-----------|-----------|-------|-------|")
    all_projects = set(list(curr.get('projects', {}).keys()) + list(last.get('projects', {}).keys()))
    for proj in sorted(all_projects):
        curr_h = curr.get('projects', {}).get(proj, {}).get('hours', 0)
        last_h = last.get('projects', {}).get(proj, {}).get('hours', 0)
        delta = curr_h - last_h
        if delta > 0.5:
            trend = "Up"
        elif delta < -0.5:
            trend = "Down"
        else:
            trend = "Stable"
        sign = '+' if delta >= 0 else ''
        print(f"| {proj} | {curr_h:.1f}h | {last_h:.1f}h | {sign}{delta:.1f}h | {trend} |")
PYEOF
```

#### Step 4.3: Format L4 Output

```markdown
## L4: Trend Comparison

### Week-over-Week
- Total hours: {N}h ({+/-N}h vs last week)
- Total sessions: {N} ({+/-N} vs last week)
- Active projects: {N} ({+/-N} vs last week)

### Per-Project Trends
| Project | This Week | Last Week | Delta | Trend |
|---------|-----------|-----------|-------|-------|
| ... (from computation above) |

### Trajectory
{Describe overall trend: increasing workload, shifting focus, etc.}

### Score Trend (if 2+ reports exist)
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
| ... |
```

---

## Step 5: Composite Scoring

After all active layers complete, compute composite score via bash:

```bash
python3 << 'PYEOF'
import json

# Layer scores (None if layer was skipped)
scores = {
    'L1': $L1_SCORE,  # 0-100
    'L2': $L2_SCORE,  # 0-100 or None
    'L3': $L3_SCORE,  # 0-100 or None
    'L4': $L4_SCORE,  # 0-100 or None
}

weights = {'L1': 0.35, 'L2': 0.30, 'L3': 0.20, 'L4': 0.15}

available = {k: v for k, v in scores.items() if v is not None}
na_layers = {k: v for k, v in weights.items() if k not in available}

# Redistribute N/A weights
if na_layers:
    extra = sum(na_layers.values()) / len(available)
    adj_weights = {k: weights[k] + extra for k in available}
else:
    adj_weights = {k: weights[k] for k in available}

composite = sum(scores[k] * adj_weights[k] for k in available)
print(f"Composite: {composite:.0f}")
print(json.dumps({
    'composite': round(composite),
    'layers': {k: v for k, v in scores.items()},
    'weights_used': {k: round(v, 2) for k, v in adj_weights.items()}
}))
PYEOF
```

### Scoring Rubric

**L1 (Time Summary):**
- 80-100: Data complete, all projects accounted for, time-report cross-reference matches
- 60-79: Minor gaps, some sessions missing project tags
- 40-59: Significant gaps in timeline data
- 0-39: Very little data available

**L2 (Accomplishments):**
- 80-100: Handoffs found for >80% of active projects, COMPLETED/BLOCKERS parsed
- 60-79: Handoffs for 50-80% of projects
- 40-59: Handoffs for 25-50% of projects (lots of undocumented time)
- 0-39: Very few handoffs found

**L3 (Billable Analysis):**
- 80-100: Billing config exists, all projects have rates, budgets tracked
- 60-79: Billing config exists but incomplete
- 40-59: No billing config, using defaults
- 0-39: Cannot compute billing (no data)

**L4 (Trend Comparison):**
- 80-100: 4+ previous reports, clear trends visible
- 60-79: 2-3 previous reports, some trends
- 40-59: 1 previous report, limited comparison
- 0-39: First run, no historical data (N/A)

---

## Step 6: Save Report (standard + deep modes only)

### Step 6.0: Read Previous Report for Delta/Trend

Before generating the report:
1. Glob `~/.claude/reports/weekly-digest/wd-*.md` to find existing reports
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison:
   - `score_delta`: `"+N"` or `"-N"` or `"---"` (if no previous)
   - `trend`: `"first_run"` (no previous), `"improving"` (delta > 0), `"declining"` (delta < 0), `"stable"` (delta == 0)
5. Also extract `total_hours`, `total_projects` from the previous report for the delta section

### Step 6.1: Determine Report Number

```bash
python3 << 'PYEOF'
import glob, re, os

reports_dir = os.path.expanduser("~/.claude/reports/weekly-digest")
files = glob.glob(os.path.join(reports_dir, "wd-*.md"))
numbers = []
for f in files:
    m = re.search(r'wd-(\d+)-', os.path.basename(f))
    if m:
        numbers.append(int(m.group(1)))
next_num = max(numbers, default=0) + 1
print(f"{next_num:03d}")
PYEOF
```

### Step 6.2: Write Report

Write to `~/.claude/reports/weekly-digest/wd-{NNN}-{WEEK_START}.md`:

```markdown
---
report_type: "weekly-digest"
report_number: {NNN}
date: "{WEEK_START}"
project_name: "Cross-Project"
project_tag: "weekly-digest"
week_label: "{WEEK_LABEL}"
mode: "{MODE}"
total_hours: {N}
total_sessions: {N}
total_projects: {N}
layer_1_score: {N}
layer_2_score: {N_or_NA}
layer_3_score: {N_or_NA}
layer_4_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Weekly Digest: {WEEK_LABEL}

Report #{NNN} | Mode: {MODE} | Generated: {TODAY}

## Changes Since Last Report

(Only include if a previous report exists. Omit categories with 0 items. First report = omit this section entirely.)

**NEW** ({count} items):
- [NEW] {new project not in previous week}

**RESOLVED** ({count} items):
- [RESOLVED] {blocker resolved since last week}

**MOVED** ({count} items):
- [MOVED] {project}: {previous hours}h -> {current hours}h

**PROGRESS** ({count} items):
- [PROGRESS] {project}: {previous status} -> {current status}

## Trend (last {N} reports)

(Only include if 3+ reports exist. Otherwise show: `> Trend tracking available after 3+ reports ({N} exist).`)

| Report | Date | Score | Hours | Projects |
|--------|------|-------|-------|----------|
| wd-{NNN} | {date} | {score} | {hours} | {projects} |
| ... | ... | ... | ... | ... |

**Direction:** {first_score} -> {last_score} ({arrow}, {+/-N%})

{L1 output}

{L2 output if standard/deep}

{L3 output if deep}

{L4 output if deep}

## Composite Score: {N}/100
{Score interpretation}
```

---

## Step 7: Store in Cortex

After report is saved, use CLI (fire-and-forget — Spec 17):

```bash
# CLI: store weekly digest summary (fire-and-forget)
cortex remember "Weekly digest {WEEK_LABEL}: {total_hours}h across {N} projects. Top projects: {top 3 by hours}. Key accomplishments: {top 3 items}. Blockers: {count} active. Composite score: {N}/100." \
  --tags weekly-digest,report,{WEEK_START} --importance 80 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Weekly digest {WEEK_LABEL}: {total_hours}h across {N} projects. Top projects: {top 3 by hours}. Key accomplishments: {top 3 items}. Blockers: {count} active. Composite score: {N}/100." \
  --tags weekly-digest,report,{WEEK_START} --importance 80 2>/dev/null
```

---

## Step 8: Final Output

Display the complete digest to the user, formatted as a clean markdown document.

For standard/deep modes, note the saved report path:
```
Report saved: ~/.claude/reports/weekly-digest/wd-{NNN}-{WEEK_START}.md
```
