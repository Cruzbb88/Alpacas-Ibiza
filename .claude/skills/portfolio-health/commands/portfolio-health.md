# /portfolio-health Command

Cross-project health dashboard. Aggregates data from Omni-Cortex global index and file system to produce per-project health scores, Eisenhower priority matrix, and trend tracking.

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **Mode**: `--mode quick|standard|deep` (default: `standard`)
   - `quick` = L1 only, no report saved
   - `standard` = L1 + L2, report saved
   - `deep` = L1-L4, report saved, sub-agents for L3/L4
2. **Project filter**: `--project <name>` filters output to matching project(s)

```
mode = "standard"  # default
project_filter = None

if "--mode quick" in args: mode = "quick"
if "--mode deep" in args: mode = "deep"
if "--project" in args: project_filter = value after --project
```

If `$ARGUMENTS` is just "quick", "standard", or "deep" without `--mode`, treat it as the mode.

---

## Layer 1: Quick Snapshot (ALL modes)

L1 gathers baseline data for every project and computes health scores.

### Step 1.1: Get Project List

Call `cortex_global_stats` to get the global project index from Omni-Cortex.

This returns a list of all projects with memory counts and activity data. Extract the list of project names/paths.

If `--project` filter is set, filter the list to only matching projects (case-insensitive substring match).

### Step 1.2: Per-Project Data Collection

For each project, gather these data points:

**From Omni-Cortex:**
- `cortex_get_timeline` for the project: extract last activity date and activity count
- `cortex_list_memories` for the project: get total memory count

**From File System (if project path is accessible):**
- `Glob: {project_path}/specs/done/**/*.md` -- count done specs (includes project subfolders)
- `Glob: {project_path}/specs/todo/*.md` -- count todo specs
- `Read: {project_path}/CLAUDE.md` -- check existence and line count
- `Glob: {project_path}/PLAN-OF-ATTACK*` or `{project_path}/plans/*` -- check for planning docs
- `Glob: {project_path}/specs/` -- check if specs directory exists

If a project path is not accessible or doesn't exist on the filesystem, score file-based dimensions as N/A and redistribute weight.

### Step 1.3: Compute Scores with Python

**CRITICAL: All math MUST be computed via Python script. Never use LLM arithmetic.**

Collect all project data into a JSON structure and pipe to Python:

```bash
python3 << 'PYEOF'
import json, sys
from datetime import datetime

# Project data passed as JSON
data = json.loads("""INSERT_JSON_HERE""")

weights = {"activity": 0.30, "specs": 0.25, "memory": 0.20, "blockers": 0.15, "docs": 0.10}

def compute_activity(days_since):
    return max(0, min(100, round(100 - (days_since * 100/7))))

def compute_specs(done, todo):
    total = done + todo
    return round(done / total * 100) if total > 0 else 50

def compute_memory(fresh, total):
    return round(fresh / total * 100) if total > 0 else 0

def compute_blockers(count):
    return max(0, round(100 - (count * 33)))

def compute_docs(has_cmd, cmd_lines, has_plan, has_specs):
    s = 0
    if has_cmd: s += 50 if cmd_lines >= 10 else 25
    if has_plan: s += 30
    if has_specs: s += 20
    return min(100, s)

def interpret(score):
    if score >= 80: return "Excellent"
    if score >= 60: return "Good"
    if score >= 40: return "Fair"
    return "Critical"

results = []
for p in data["projects"]:
    scores = {}
    scores["activity"] = compute_activity(p.get("days_since_active", 999))
    scores["specs"] = compute_specs(p.get("specs_done", 0), p.get("specs_todo", 0))
    scores["memory"] = compute_memory(p.get("fresh_memories", 0), p.get("total_memories", 0))
    scores["blockers"] = compute_blockers(p.get("blocker_count", 0))
    scores["docs"] = compute_docs(
        p.get("has_claude_md", False),
        p.get("claude_md_lines", 0),
        p.get("has_plan", False),
        p.get("has_specs_dir", False)
    )

    # Composite with N/A redistribution
    available = {k: v for k, v in scores.items() if v is not None}
    na_weight = sum(weights[k] for k in scores if scores[k] is None)
    redist = na_weight / len(available) if available else 0
    composite = round(sum(v * (weights[k] + redist) for k, v in available.items()))

    results.append({
        "name": p["name"],
        "composite": composite,
        "status": interpret(composite),
        "scores": scores,
        "days_since_active": p.get("days_since_active", "?"),
        "total_memories": p.get("total_memories", 0),
        "specs_done": p.get("specs_done", 0),
        "specs_todo": p.get("specs_todo", 0)
    })

# Sort by composite score ascending (worst first = needs most attention)
results.sort(key=lambda x: x["composite"])
print(json.dumps(results, indent=2))
PYEOF
```

### Step 1.4: Output L1 Table

Format the Python output as a markdown table:

```markdown
## Portfolio Health Snapshot

| # | Project | Score | Status | Last Active | Memories | Specs (D/T) |
|---|---------|-------|--------|-------------|----------|-------------|
| 1 | {name} | {composite}/100 | {status} | {days} days ago | {count} | {done}/{todo} |
```

Sort by score ascending so projects needing attention appear first.

**If mode is `quick`**: Output the table and stop. Do NOT save a report.

---

## Layer 2: Attention Matrix (standard + deep modes)

### Step 2.1: Eisenhower Classification

Using the L1 scores and data, classify each project into quadrants:

| Quadrant | Criteria |
|----------|----------|
| DO FIRST | Score < 60 AND blocker_count > 0 |
| SCHEDULE | Score 40-79 AND specs_todo > 0 |
| DELEGATE | Score < 40 AND days_since_active > 7 |
| MONITOR | Score >= 60 AND specs_todo == 0 |

Projects may appear in multiple quadrants -- use the highest-priority one.

Priority order: DO FIRST > SCHEDULE > DELEGATE > MONITOR

Output:

```markdown
## Attention Matrix

### DO FIRST (Urgent + Important)
| Project | Score | Reason |
|---------|-------|--------|
| {name} | {score} | {blocker_count} blockers, score below 60 |

### SCHEDULE (Important, Plan Next)
| Project | Score | Reason |
|---------|-------|--------|
| {name} | {score} | {specs_todo} specs in todo |

### DELEGATE (Needs Triage)
| Project | Score | Reason |
|---------|-------|--------|
| {name} | {score} | No activity in {days} days |

### MONITOR (On Track)
| Project | Score | Reason |
|---------|-------|--------|
| {name} | {score} | Healthy, no pending work |
```

### Step 2.2: Stale Detection

Flag projects with no cortex activity in 7+ days:

```markdown
## Stale Projects (7+ days inactive)
| Project | Days Inactive | Last Known Activity |
|---------|--------------|-------------------|
| {name} | {days} | {last_activity_description} |
```

If no projects are stale, output: "No stale projects detected."

### Step 2.3: Burnout Indicator

Analyze memory distribution across projects (last 14 days):

Use `cortex_global_search` or aggregate memory counts to determine what percentage of recent activity is concentrated in a single project.

```bash
python3 << 'PYEOF'
import json
data = json.loads("""INSERT_JSON_HERE""")
total = sum(p["recent_memories"] for p in data)
if total > 0:
    for p in data:
        pct = p["recent_memories"] / total * 100
        if pct > 80:
            print(f"WARNING: {p['name']} has {pct:.0f}% of recent activity - burnout risk")
    max_p = max(data, key=lambda x: x["recent_memories"])
    print(f"Most active: {max_p['name']} ({max_p['recent_memories']}/{total} = {max_p['recent_memories']/total*100:.0f}%)")
else:
    print("No recent activity data available")
PYEOF
```

If burnout detected:
```markdown
## Burnout Warning
**{project_name}** accounts for {pct}% of all recent activity.
Consider distributing focus across other projects.
```

---

## Layer 3: Deep Dive (deep mode only -- Sub-Agent)

Spawn a Task sub-agent for L3 analysis:

**Task (L3 - Per-Project Deep Dive):**
- subagent_type: "general-purpose"
- Prompt: For each project, perform a deep analysis:
  1. Read all specs in `specs/todo/` and `specs/done/` -- summarize status
  2. Use `cortex_global_search` with tags ["handoff"] to find recent handoffs
  3. Extract blocker mentions from handoff content (search for "BLOCKER", "blocked", "blocking")
  4. Summarize: what is each project working on, what is stuck, what is next
  5. Return per-project breakdown with L3 score (based on spec progress and blocker severity)

Output format per project:
```markdown
### {Project Name} - Deep Dive
- **Active Specs**: {list}
- **Completed Specs**: {list}
- **Blockers**: {list or "None"}
- **Last Handoff Summary**: {brief}
- **L3 Score**: {0-100}
```

---

## Layer 4: Trend Comparison (deep mode only -- Sub-Agent)

Spawn a Task sub-agent for L4 analysis (runs in parallel with L3):

**Task (L4 - Trend Comparison):**
- subagent_type: "general-purpose"
- Prompt: Compare current run to previous reports:
  1. `Glob: ~/.claude/reports/portfolio-health/ph-*.md` to find previous reports
  2. Read the most recent report's YAML frontmatter
  3. Extract previous per-project scores
  4. Compare each project: current vs previous composite
  5. Determine trajectory: improving (>+5), declining (>-5), or stable (within 5)
  6. If no previous report exists, note "First run - no comparison data"
  7. Return trend table and L4 score (based on portfolio-wide trajectory)

Output format:
```markdown
### Score Trend
| Project | Previous | Current | Delta | Trajectory |
|---------|----------|---------|-------|------------|
| {name} | {prev} | {curr} | {+/-N} | {^/v/=} |

Portfolio Trajectory: {Improving/Declining/Stable/First Run}
L4 Score: {0-100}
```

---

## Step 5: Combine Results and Generate Report (standard + deep)

After all layers complete, combine results.

### Step 5.1: Compute Final Composite

For standard mode (L1+L2): composite is the L1 per-project scores (L2 adds classification but not a separate score).

For deep mode (L1-L4): combine all layer scores. L3 and L4 provide portfolio-level adjustment scores.

### Step 5.2: Determine Report Number

```bash
python3 << 'PYEOF'
import glob, re, os
report_dir = os.path.expanduser("~/.claude/reports/portfolio-health")
files = glob.glob(os.path.join(report_dir, "ph-*.md"))
numbers = []
for f in files:
    match = re.search(r'ph-(\d+)-', os.path.basename(f))
    if match:
        numbers.append(int(match.group(1)))
next_num = max(numbers, default=0) + 1
print(f"{next_num:03d}")
PYEOF
```

### Step 5.3: Save Report

Write report to `~/.claude/reports/portfolio-health/ph-{NNN}-{YYYY-MM-DD}.md`:

```markdown
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{mode}"
project_count: {N}
portfolio_composite: {N}
previous_composite: {N or null}
score_delta: "{+/-N or -}"
trend: "{improving|declining|stable|first_run}"
per_project:
  - name: "{project}"
    composite: {N}
    activity: {N}
    specs: {N}
    memory: {N}
    blockers: {N}
    docs: {N}
---

# Portfolio Health Report #{NNN}

**Date**: {YYYY-MM-DD}
**Mode**: {mode}
**Portfolio Score**: {composite}/100 ({interpretation})

{L1 table}

{L2 matrix if standard/deep}

{L3 deep dives if deep}

{L4 trends if deep}

## Recommendations

{Top 3 actionable recommendations based on findings}
```

### Step 5.4: Store in Cortex

Store via CLI (fire-and-forget):
```bash
cortex remember "Portfolio health run #{NNN}: {portfolio_composite}/100. {N} projects scanned. Top concern: {lowest_scoring_project}. Mode: {mode}." --tags portfolio-health,report,dashboard --importance 60 2>/dev/null
```

### Step 5.5: Final Output

Display the full report content to the user. Include:
1. L1 table (always)
2. L2 matrix + warnings (standard/deep)
3. L3 per-project breakdowns (deep)
4. L4 trend comparison (deep)
5. Report file path
6. Recommendations
