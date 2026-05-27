---
description: Aggregate health dashboard across ALL projects using Omni-Cortex global data
argument-hint: "[project-filter] or [--verbose]"
allowed-tools: mcp__omni-cortex__cortex_global_stats, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_list_memories, Glob, Bash, Task, Read
---

# Portfolio Health Dashboard

Cross-project health aggregation using Omni-Cortex global index data, self-heal reports, and crystal-ball audits.

## Variables

FILTER: $ARGUMENTS

## Instructions

### Step 0: Parse Arguments

- Empty → Show all tracked projects
- Project name (e.g., "ralph") → Show detailed view for that project only
- `--verbose` → Show all projects with expanded detail (all Eisenhower matrix items listed)

### Step 1: Discover All Tracked Projects

Use `cortex_global_stats` to get the global index overview — this returns project paths, memory counts, and activity summaries.

Extract the list of all project paths from the response. These are the projects to analyze.

If FILTER is a project name, filter the list to matching projects only.

### Step 2: Parallel Project Analysis

For each discovered project, launch parallel Task sub-agents to gather data concurrently. Each sub-agent should gather ALL data for ONE project.

**Per-project sub-agent instructions:**

```
Project: {project_path}

Gather the following 5 data points and return them as structured text:

1. SELF-HEAL SCORE:
   - Use cortex_global_search with query "self-heal composite score", project_filter "{project_path}", tags_filter ["self-heal"], limit 1
   - Extract the composite_score number (0-100) from the most recent result
   - If no results, report "N/A"

2. CRYSTAL-BALL COHERENCE SCORE:
   - Use cortex_global_search with query "crystal ball coherence audit score", project_filter "{project_path}", tags_filter ["crystal-ball"], limit 1
   - Extract the coherence score (0-100) from the most recent result
   - If no results, report "N/A"

3. OPEN SPECS COUNT:
   - Use Glob to search for specs/todo/*.md in the project directory
   - If that path does not exist, try common alternatives: TODO.md, docs/specs/*.md
   - Count the number of matching files
   - Return the count (0 if none found)

4. LAST HANDOFF:
   - Use cortex_global_search with query "handoff session-summary", project_filter "{project_path}", tags_filter ["handoff"], limit 1
   - Extract the date from the most recent handoff
   - Calculate days since that handoff (relative to today)
   - If no handoff found, report "N/A"

5. RECENT ACTIVITY:
   - Use cortex_global_search with query "session activity", project_filter "{project_path}", limit 5
   - Determine the most recent activity date
   - Calculate days since last activity
   - Summarize what the latest activity was about (1 sentence)

Return format:
PROJECT: {project_path}
SELF_HEAL_SCORE: {number or N/A}
CRYSTAL_BALL_SCORE: {number or N/A}
OPEN_SPECS: {count}
LAST_HANDOFF_DAYS: {number or N/A}
LAST_ACTIVE_DAYS: {number}
LAST_ACTIVITY_SUMMARY: {1 sentence}
```

### Step 3: Calculate Per-Project Health Score

For each project, compute a health score (0-100):

```python
# Scoring formula
def project_health(sh_score, cb_score, open_specs, days_since_handoff, days_since_active):
    # Component scores (each 0-100)

    # Self-heal score (direct, or 50 if N/A)
    sh = sh_score if sh_score is not None else 50

    # Crystal-ball score (direct, or 50 if N/A)
    cb = cb_score if cb_score is not None else 50

    # Freshness score: decays over time since last activity
    # 100 if today, -5 per day, floor at 0
    freshness = max(0, 100 - (days_since_active * 5))

    # Handoff score: penalize if no recent handoff
    # 100 if handoff within 1 day, -10 per day, floor at 0
    handoff = max(0, 100 - (days_since_handoff * 10)) if days_since_handoff is not None else 30

    # Spec burden: more open specs = more work remaining (not necessarily bad)
    # This is informational, not penalized in health

    # Weighted health score
    health = (
        sh * 0.25 +         # 25% self-heal
        cb * 0.25 +         # 25% crystal-ball coherence
        freshness * 0.30 +  # 30% recency of activity
        handoff * 0.20      # 20% handoff recency
    )

    return round(health)
```

### Step 4: Calculate Portfolio-Level Score

```python
def portfolio_score(projects):
    # Weight each project by recency and engagement
    total_weight = 0
    weighted_sum = 0

    for p in projects:
        # Recency weight: active projects matter more
        recency_weight = max(0.1, 1.0 - (p.days_since_active * 0.05))

        # Spec engagement weight: projects with open specs need attention
        spec_weight = 1.0 + (min(p.open_specs, 10) * 0.1)  # up to 2.0x

        weight = recency_weight * spec_weight
        weighted_sum += p.health * weight
        total_weight += weight

    return round(weighted_sum / total_weight) if total_weight > 0 else 0
```

### Step 5: Classify into Eisenhower Matrix

Categorize each project into one of four quadrants:

```python
def classify(project):
    is_unhealthy = project.health < 60
    is_active = project.days_since_active <= 3
    has_open_specs = project.open_specs > 0

    if is_unhealthy and is_active:
        # Low health + recent activity = something is wrong and we're working on it
        return "URGENT_IMPORTANT"  # Needs fixing NOW

    elif not is_unhealthy and has_open_specs:
        # Healthy + open specs = steady progress, keep going
        return "IMPORTANT_NOT_URGENT"  # Steady progress

    elif is_unhealthy and not is_active:
        # Low health + no recent activity = stale problem
        return "URGENT_NOT_IMPORTANT"  # Needs decision: fix or archive?

    else:
        # Healthy + no open specs (or healthy + no activity)
        return "NEITHER"  # Maintenance mode
```

### Step 6: Determine Status Label

```python
def status_label(project):
    if project.days_since_active == 0:
        return "Active"
    elif project.days_since_active <= 3:
        return "Recent"
    elif project.days_since_active <= 7:
        return "This Week"
    elif project.days_since_active <= 14:
        return "Stale"
    elif project.days_since_active <= 30:
        return "Dormant"
    else:
        return "Inactive"
```

### Step 7: Generate Attention Items

For each project that needs attention (health < 70 OR urgent quadrant), generate a reason:

```python
def attention_reason(project):
    reasons = []
    if project.sh_score is not None and project.sh_score < 50:
        reasons.append(f"Self-heal score critically low ({project.sh_score}/100)")
    if project.cb_score is not None and project.cb_score < 50:
        reasons.append(f"Crystal-ball coherence low ({project.cb_score}/100)")
    if project.days_since_handoff is not None and project.days_since_handoff > 7:
        reasons.append(f"No handoff in {project.days_since_handoff} days — context may be lost")
    if project.days_since_active > 14:
        reasons.append(f"Inactive for {project.days_since_active} days — archive or resume?")
    if project.open_specs > 5:
        reasons.append(f"{project.open_specs} open specs — prioritization needed")
    if not reasons:
        reasons.append("Health score below threshold")
    return "; ".join(reasons)
```

### Step 8: Store Results in Cortex

Store results via CLI (fire-and-forget):
```bash
cortex remember "Portfolio health: [scores, matrix classification, attention items summary]" \
  --tags portfolio-health,cross-project,dashboard --importance 75 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Portfolio health: [summary]" --tags portfolio-health,cross-project,dashboard --importance 75
```

### Step 9: Output Report

Display the following markdown report:

```markdown
## Portfolio Health Dashboard

Generated: {YYYY-MM-DD HH:MM} MST

| Project | Health | CB Score | SH Score | Open Specs | Last Active | Last Handoff | Status |
|---------|--------|----------|----------|------------|-------------|--------------|--------|
| {name} | {health}/100 | {cb}/100 | {sh}/100 | {count} | {N days ago} | {N days ago} | {status} |
| ... | ... | ... | ... | ... | ... | ... | ... |

**Portfolio Score: {N}/100**

---

### Eisenhower Matrix

#### Urgent + Important (Needs Fixing)
{For each project in this quadrant:}
- **{Project}** ({health}/100): {attention_reason}

#### Important + Not Urgent (Steady Progress)
{For each project in this quadrant:}
- **{Project}** ({health}/100): {open_specs} open specs, last active {N} days ago

#### Urgent + Not Important (Needs Decision)
{For each project in this quadrant:}
- **{Project}** ({health}/100): {attention_reason} — Consider archiving or scheduling work

#### Maintenance Mode
{For each project in this quadrant:}
- **{Project}** ({health}/100): All specs complete, healthy

---

### Attention Needed
{Numbered list of projects with health < 70, ordered by health ascending:}
1. **{Project}**: {attention_reason}
2. **{Project}**: {attention_reason}

### Healthy Projects
{Bullet list of projects with health >= 70:}
- **{Project}**: {status}, {brief summary of last activity}

---

### Recommendations
1. {Highest priority recommendation based on matrix analysis}
2. {Second priority recommendation}
3. {Third priority recommendation}
```

If `--verbose` was passed, also include under each project row:
- Last activity summary (1 sentence)
- Last handoff context (if available)
- Score breakdown (sh, cb, freshness, handoff components)

## Workflow

1. Parse `$ARGUMENTS` — empty shows all projects, a name filters to one project, `--verbose` expands detail
2. Use `cortex_global_stats` to discover all tracked project paths
3. Launch parallel Task sub-agents (one per project) to gather self-heal score, crystal-ball score, open specs count, last handoff date, and recent activity
4. Compute per-project health score using the weighted formula (SH 25%, CB 25%, freshness 30%, handoff 20%)
5. Compute portfolio-level weighted score across all projects
6. Classify each project into the Eisenhower matrix quadrant
7. Generate attention items for any project with health < 70
8. Store the full dashboard in Cortex (importance: 75)
9. Display the markdown report with tables, matrix, and recommendations

## Edge Cases

- **No projects found**: Report "No projects tracked in Omni-Cortex. Use /omni-start in a project to begin tracking."
- **All N/A scores**: Use 50 as default; note in report that self-heal/crystal-ball haven't been run for those projects
- **Single project**: Skip Eisenhower matrix, show detailed single-project view instead
- **cortex_global_stats returns error**: Fall back to cortex_global_search with broad query to discover projects

## Report

```
## Portfolio Health Dashboard
Generated: {YYYY-MM-DD HH:MM}

| Project | Health | CB | SH | Open Specs | Last Active | Status |
|---------|--------|----|----|------------|-------------|--------|
| {name} | {N}/100 | {N} | {N} | {N} | {N} days ago | {label} |

**Portfolio Score: {N}/100**

### Eisenhower Matrix
- Urgent + Important: {projects needing immediate attention}
- Important + Not Urgent: {steady-progress projects}
- Urgent + Not Important: {stale/decision-needed projects}
- Maintenance Mode: {healthy, no open specs}

### Recommendations
1. {highest priority action}
2. {second priority}
```

## Notes

- This command is read-only except for storing the dashboard result in cortex
- Health scores are relative — a score of 50 means "needs attention," not "failing"
- The Eisenhower matrix is a suggestion, not a mandate — user decides priorities
- Run this weekly or before planning sessions for best results
- Pairs well with `/weekly-digest` for a complete operational picture
