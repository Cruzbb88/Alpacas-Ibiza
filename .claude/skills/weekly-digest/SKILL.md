---
name: weekly-digest
description: >-
  Generate a cross-project weekly summary of all work done across every tracked
  project. Aggregates handoffs, cortex activity, and time data to produce
  accomplishments, blockers, billable analysis, and week-over-week trends.
  Use when: (1) End-of-week status review, (2) Client billing preparation,
  (3) Tracking accomplishments across multiple projects, (4) Week-over-week
  productivity analysis.
argument-hint: [--week YYYY-MM-DD] [--mode quick|standard|deep] [--project filter]
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - Task
  - mcp__omni-cortex__cortex_global_search
  - mcp__omni-cortex__cortex_recall
  - mcp__omni-cortex__cortex_get_timeline
  - mcp__omni-cortex__cortex_list_memories
---

# Weekly Digest

Generate a cross-project weekly summary with time tracking, accomplishments, billable analysis, and trends.

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Standard | `standard` or *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1-L4 | Yes | L3, L4 |

## Layer Architecture

| Layer | Name | Weight | What It Computes |
|-------|------|--------|-----------------|
| L1 | Time Summary | 35% | Hours per project, session counts, time allocation table |
| L2 | Accomplishments | 30% | What was done + blockers from handoff memories, grouped by project |
| L3 | Billable Analysis | 20% | Rate calculations, invoiceable items, budget tracking |
| L4 | Trend Comparison | 15% | Week-over-week comparison, trajectory analysis |

## Arguments

Parse `$ARGUMENTS` for:

1. **--week YYYY-MM-DD**: Target week containing this date. Defaults to current week.
   - Week boundaries use ISO weeks (Monday 00:00 to Sunday 23:59)
   - The date can be any day within the target week
2. **--mode quick|standard|deep**: Controls which layers run. Default: `standard`
3. **--project filter**: Limit to a specific project name (substring match)

## Data Sources

| Data Point | Source | Method |
|-----------|--------|--------|
| Session durations | Omni-Cortex timeline | `cortex_get_timeline` for each project |
| Handoff summaries | Cortex memories | `cortex_global_search` tags: ["handoff"], date filter |
| Time report data | `/time-report` output | Read `~/.claude/reports/time-report/` if exists |
| Accomplishments | Handoff "COMPLETED:" sections | Parse from cortex memories |
| Blockers | Handoff "BLOCKERS:" sections | Parse from cortex memories |
| Previous digests | Report files | Read `~/.claude/reports/weekly-digest/wd-*.md` |

## CRITICAL: Math via Bash Only

ALL time calculations, billing math, and percentage computations MUST use Python/bash scripts executed via the Bash tool. NEVER perform arithmetic via LLM reasoning. This is a hard requirement per the bash-first philosophy.

Example pattern:
```bash
python3 << 'PYEOF'
import json
data = json.loads('''...''')
total = sum(d['hours'] for d in data)
for d in sorted(data, key=lambda x: -x['hours']):
    pct = (d['hours'] / total * 100) if total > 0 else 0
    print(f"{d['project']}: {d['hours']:.1f}h ({pct:.0f}%)")
print(f"Total: {total:.1f}h")
PYEOF
```

## Billing Rates Configuration

L3 billable analysis reads rates from `~/.claude/config/billing-rates.json`.

Expected format:
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

If the file does not exist, L3 will:
1. Note that no billing config was found
2. Use a placeholder rate of $0/hr (effectively skip billing calculations)
3. Still report raw hours per project
4. Suggest creating `~/.claude/config/billing-rates.json` with the format above

## Report Output

Reports are saved to: `~/.claude/reports/weekly-digest/wd-{NNN}-{YYYY-MM-DD}.md`

- NNN = sequential number (zero-padded to 3 digits)
- Date = Monday of the target week
- Reports include YAML frontmatter for trend tracking

## Output Limits

- Cap at top 10 projects by hours; aggregate remaining as "Other ({N} projects)"
- Undocumented time (sessions without handoffs) is flagged separately
- First run notes "First weekly digest, no trend data yet" in L4 section

## Execution

See `commands/weekly-digest.md` for the full command orchestration.
