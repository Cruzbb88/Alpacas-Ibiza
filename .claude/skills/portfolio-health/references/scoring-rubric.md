# Portfolio Health Scoring Rubric

## Composite Formula

Per-project health score is a weighted average of 5 dimensions. All calculations MUST use the Python script below -- never LLM arithmetic.

### Weights

| Dimension | Weight | Key |
|-----------|--------|-----|
| Activity Recency | 0.30 | `activity` |
| Spec Completion Rate | 0.25 | `specs` |
| Memory Freshness | 0.20 | `memory` |
| Blocker Count | 0.15 | `blockers` |
| Documentation Health | 0.10 | `docs` |

**Weights sum to 1.0.**

### Per-Dimension Scoring (0-100)

#### Activity Recency (30%)
How recently did this project have cortex activity?

```
days_since = (today - last_activity_date).days
score = max(0, min(100, 100 - (days_since * (100/7))))
```

| Days Since Last Activity | Score |
|--------------------------|-------|
| 0 (today) | 100 |
| 1 | 86 |
| 2 | 71 |
| 3 | 57 |
| 4 | 43 |
| 5 | 29 |
| 6 | 14 |
| 7+ | 0 |

#### Spec Completion Rate (25%)
What percentage of specs are in `done/` vs `todo/`?

```
total = done_count + todo_count
score = (done_count / total * 100) if total > 0 else 50  # no specs = neutral
```

| Completion % | Score |
|-------------|-------|
| 100% done | 100 |
| 75% done | 75 |
| 50% done | 50 |
| 25% done | 25 |
| 0% done | 0 |
| No specs at all | 50 (neutral) |

#### Memory Freshness (20%)
What percentage of project memories are less than 7 days old?

```
fresh = count of memories with age < 7 days
total = total memory count
score = (fresh / total * 100) if total > 0 else 0
```

#### Blocker Count (15%)
How many unresolved blockers appear in handoff/memory content?

```
score = max(0, 100 - (blocker_count * 33))
```

| Blockers | Score |
|----------|-------|
| 0 | 100 |
| 1 | 67 |
| 2 | 34 |
| 3+ | 0 |

#### Documentation Health (10%)
Does the project have CLAUDE.md and planning docs?

| Condition | Points |
|-----------|--------|
| CLAUDE.md exists and has content (>10 lines) | 50 |
| CLAUDE.md exists but sparse (<10 lines) | 25 |
| PLAN-OF-ATTACK or similar planning doc exists | 30 |
| specs/ directory exists | 20 |
| No docs at all | 0 |

Max score: 100 (capped).

## Python Computation Script

This is the canonical script for computing composite scores. MUST be used via `Bash: python3 << 'EOF'` -- never compute scores via LLM reasoning.

```python
import json
import sys
from datetime import datetime, timedelta

def compute_activity_score(days_since):
    """Activity Recency: 0 days = 100, 7+ days = 0, linear."""
    return max(0, min(100, round(100 - (days_since * (100/7)))))

def compute_spec_score(done_count, todo_count):
    """Spec Completion: done/(done+todo) * 100. No specs = 50 (neutral)."""
    total = done_count + todo_count
    if total == 0:
        return 50
    return round(done_count / total * 100)

def compute_memory_score(fresh_count, total_count):
    """Memory Freshness: % of memories < 7 days old."""
    if total_count == 0:
        return 0
    return round(fresh_count / total_count * 100)

def compute_blocker_score(blocker_count):
    """Blocker Count: 0 = 100, 3+ = 0."""
    return max(0, round(100 - (blocker_count * 33)))

def compute_docs_score(has_claude_md, claude_md_lines, has_plan, has_specs_dir):
    """Documentation Health: composite of doc presence."""
    score = 0
    if has_claude_md:
        score += 50 if claude_md_lines >= 10 else 25
    if has_plan:
        score += 30
    if has_specs_dir:
        score += 20
    return min(100, score)

def compute_composite(scores):
    """Weighted average using standard weights."""
    weights = {
        "activity": 0.30,
        "specs": 0.25,
        "memory": 0.20,
        "blockers": 0.15,
        "docs": 0.10
    }
    # Handle N/A scores by redistributing weight
    available = {k: v for k, v in scores.items() if v is not None}
    na_keys = [k for k, v in scores.items() if v is None]

    if not available:
        return 0

    total_na_weight = sum(weights[k] for k in na_keys)
    redistribution = total_na_weight / len(available) if available else 0

    composite = sum(
        available[k] * (weights[k] + redistribution)
        for k in available
    )
    return round(composite)

def interpret_score(score):
    """Score interpretation ranges."""
    if score >= 80:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Fair"
    else:
        return "Critical"

# Usage example:
# scores = {"activity": 85, "specs": 70, "memory": 90, "blockers": 100, "docs": 80}
# composite = compute_composite(scores)
# print(f"Composite: {composite}/100 ({interpret_score(composite)})")
```

## Score Interpretation Ranges

| Range | Label | Action |
|-------|-------|--------|
| 80-100 | Excellent | Maintain current pace |
| 60-79 | Good | Monitor, no urgent action |
| 40-59 | Fair | Needs attention soon |
| 0-39 | Critical | Action required immediately |

## Eisenhower Classification (L2)

Projects are placed into quadrants based on score and urgency signals:

| Quadrant | Criteria | Action |
|----------|----------|--------|
| DO FIRST (Urgent + Important) | Score < 60 AND has recent blocker mentions | Fix immediately |
| SCHEDULE (Important, Not Urgent) | Score 40-79 AND has active specs in todo/ | Plan next session |
| DELEGATE (Urgent, Not Important) | Score < 40 AND no recent handoff | Needs triage |
| MONITOR (Not Urgent, Not Important) | Score >= 60 AND no pending work | Keep watching |

## Stale Detection Threshold

A project is "stale" if:
- No cortex activity in 7+ days
- No file changes in 7+ days
- Activity score = 0

## Burnout Indicator

Burnout risk is flagged when:
- More than 80% of recent memories (last 14 days) belong to a single project
- Indicates overconcentration and neglect of other projects

## Trend Arrows (L4)

| Symbol | Meaning | Condition |
|--------|---------|-----------|
| ^ | Improving | Current composite > previous by 5+ points |
| v | Declining | Current composite < previous by 5+ points |
| = | Stable | Within 5 points of previous |
| - | First run | No previous data |
