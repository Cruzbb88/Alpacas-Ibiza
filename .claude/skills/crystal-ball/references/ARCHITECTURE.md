# Crystal Ball — Full Architecture Reference

## Command Map

| Command | Argument Hint | What It Does | Layers |
|---------|--------------|--------------|--------|
| `/crystal-ball` | `[spec-name \| decision \| full]` | Full coherence audit — runs all 6 layers | All |
| `/crystal-ball-premortem` | `[scope]` | "Assume failure. Top 5 reasons?" | L3 + L4 + failures |
| `/crystal-ball-debt` | `list \| detail \| add` | Decision debt ledger — deferred decisions + growing cost | L4 + memories |
| `/crystal-ball-matrix` | `[specs-dir]` | N×N spec compatibility grid | L1 + L2 + L5 |
| `/crystal-ball-delta` | `since-session \| since-commit \| today` | What changed + unaddressed downstream effects | L5 + timeline |
| `/crystal-ball-constraints` | `[tech-name \| all \| add]` | Technology limit check (self-growing database) | L6 + L2 |
| `/crystal-ball-decay` | `[regular \| deep] [days-threshold]` | Find stale decisions needing re-validation | Regular: Memories only / Deep: Full directory + report + Part 2 prompt |
| `/crystal-ball-predict` | `<decision-description>` | Evaluate one decision's revision probability | L3 + activities |

## Data Flow

```
User invokes /crystal-ball [args]
         │
         ▼
┌─────────────────────────────┐
│  Command .md                │
│  - Parses arguments         │
│  - Determines scope         │
│  - Reads SKILL.md           │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  Parallel Context Gathering (4 sub-agents via Task) │
│                                                     │
│  Agent 1: Read spec files + project plan            │
│  Agent 2: Omni-Cortex memories + tags + sessions    │
│  Agent 3: Omni-Cortex decisions + errors + history  │
│  Agent 4: Direct SQL on cortex.db                   │
└──────────┬──────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Layer Processing            │
│  (which layers depend on     │
│   which command was invoked) │
│                              │
│  L1: Outcome Alignment       │
│  L2: Cross-Tech Dependencies │
│  L3: Decision Patterns       │
│  L4: Gap Analysis            │
│  L5: Consequence Scanner     │
│  L6: Constraint Database     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Scoring Engine              │
│  (references/scoring-rubric) │
│                              │
│  Percentages, predictions,   │
│  ranked gaps, constraint     │
│  violations, debt ledger     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Report Output               │
│  (formatted with ✅ ⚠️ ❌)    │
│                              │
│  Overall Coherence Score     │
│  + Actionable recommendations│
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Post-Run Actions            │
│  - cortex_remember results   │
│  - Update tech-constraints   │
│  - Compare to previous runs  │
└─────────────────────────────┘
```

## 6 Analysis Layers — Detail

### Layer 1: Outcome Alignment Check
- **Input**: Project's stated goal/outcome + current specs
- **Process**: Map every feature back to the outcome statement
- **Flags**: GAP (no implementation path), DRIFT (feature without purpose)
- **Score**: (requirements with implementation) / (total requirements) × 100

### Layer 2: Cross-Technology Dependency Audit
- **Input**: Full tech chain (Frontend → Backend → DB → Workflows → APIs → LMS)
- **Process**: Validate each integration point for data types, field names, auth, limits
- **Score**: (passing integrations) / (total integrations) × 100
- **Cross-checks**: references/tech-constraints.md

### Layer 3: Decision Pattern Predictor
- **Input**: Current decision + Omni-Cortex historical data
- **Process**: Categorize decision, find precedents, calculate revision rate, check session stress
- **Output**: Probability-weighted warnings with confidence (n<3=Low, 3-7=Medium, >7=High)
- **Session stress**: activities table failure_rate > 20% = "stressed session" warning

### Layer 4: Gap Analysis with Severity Scoring
- **Input**: Design state from all other layers
- **Per gap**: Impact %, Discovery Stage, Fix Cost Now, Fix Cost Later, Confidence
- **Ranking**: Cost-of-delay = Impact × (Fix_Later / Fix_Now)

### Layer 5: Unintended Consequence Scanner
- **Input**: Specific decision or change
- **Process**: Walk dependency graph through specs, endpoints, tables, workflows
- **Output**: Impact map with unaddressed downstream change count

### Layer 6: Technology Constraint Database
- **Input**: Design decisions + references/tech-constraints.md
- **Process**: Cross-check against ALL known constraints
- **Self-growing**: New constraints discovered → appended with date/source

## Scoring Rubric

| Metric | Weight | How Calculated |
|--------|--------|----------------|
| Outcome Alignment | 25% | (reqs with implementation) / (total reqs) × 100 |
| Cross-Tech Health | 25% | (passing integrations) / (total integrations) × 100 |
| Decision Stability | 20% | 100% − (weighted revision rate by category) |
| Gap Coverage | 15% | (addressed gaps) / (total gaps) × 100 |
| Constraint Compliance | 15% | (constraints in bounds) / (total checked) × 100 |
| **Overall Coherence** | **100%** | **Weighted average of above** |

### Prediction Confidence
| Sample Size (n) | Confidence Level |
|-----------------|-----------------|
| n < 3 | Low — insufficient data, speculative |
| n = 3-7 | Medium — reasonable basis |
| n > 7 | High — strong statistical basis |

### Session Stress Detection
```sql
SELECT COUNT(*) as total,
  SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) as failures,
  ROUND(SUM(CASE WHEN success=0 THEN 1 ELSE 0 END)*100.0/COUNT(*),1) as failure_rate
FROM activities WHERE session_id='{current_session}'
```
- failure_rate > 20% = "stressed session" → decisions may need re-validation

## Output Format Template

```
## Crystal Ball Report
**Project**: [name]  |  **Scope**: [full/spec/decision]  |  **Date**: [timestamp]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Outcome Alignment: XX%
- ✅ [N] requirements with implementation path
- ❌ GAP: [requirement] has no implementation path
- ⚠️ DRIFT: [feature] doesn't serve stated outcome

### Cross-Tech Integration Health: XX%
- ✅ [N] integration points pass
- ❌ MISMATCH: [System A] sends [X], [System B] expects [Y]
- ⚠️ CONSTRAINT: [Tech] limit [N] — design uses [M] ([P]% of limit)

### Decision Pattern Warnings
| Decision Area | Historical Revision Rate | Risk Level | Confidence |
|---------------|------------------------|------------|------------|
| [area] | [X]% revised | HIGH/MED/LOW | [level] (n=[N]) |

⚠️ Session stress: [N] tool failures — decisions from similar sessions revised [X/Y] times

### Gap Analysis (ranked by cost-of-delay)
| # | Gap | Impact | Discovery Stage | Fix Now | Fix Later | Confidence |
|---|-----|--------|-----------------|---------|-----------|------------|
| 1 | [gap] | [X]% | [stage] | [hrs] | [hrs] | [level] |

### Unintended Consequences
Decision: [description]
→ Affects: [Spec/System] — [change needed] (not yet addressed)
→ Net downstream changes: [N] files, [N] workflows, [N] tables

### Technology Constraints
- ✅ [constraint]: within bounds
- ⚠️ [constraint]: at [P]% of limit
- ❌ [constraint]: VIOLATED — [detail]

### Decision Debt: [N] items
| Deferred Decision | Sessions Ago | Blocks | Cost Now | Cost at Launch |
|-------------------|-------------|--------|----------|----------------|
| [item] | [N] | [what] | [hrs] | [hrs/days] |

### Predictions (Balanced — >40% flagged)
- [P]% chance [prediction] — based on [N] similar decisions, confidence: [level]

### Overall Coherence Score: XX/100
Outcome(25%) + Tech(25%) + Stability(20%) + Gaps(15%) + Constraints(15%)

### Recommendations
1. [Prioritized action — highest impact gap or constraint violation]
2. [Second priority]
3. [Third priority]
```

## Integration Points

### /handoff Integration
After creating handoff memory, analyzes session for design decisions. If found, appends a Crystal Ball nudge:
```
Crystal Ball Suggestion:
- `/crystal-ball-delta today` — Check downstream effects
- `/crystal-ball-predict "<decision>"` — Evaluate riskiest decision
```

### /pickup Integration
Displays any Crystal Ball suggestions from the handoff. Also checks if last Crystal Ball audit was >5 sessions ago and suggests a health check.

### /retrospective Integration
Feeds retrospective findings into Crystal Ball:
1. Preventable errors → tech-constraints.md or gap-pattern memories
2. Recurring patterns (3+ retrospectives) → weight adjustment (1.5x scrutiny)
3. Suggests relevant Crystal Ball command in retrospective report

## Installation

Copy to global (all projects):
```bash
# Skills
cp -r skills/crystal-ball/ ~/.claude/skills/crystal-ball/

# Commands
cp -r commands/crystal-ball/ ~/.claude/commands/crystal-ball/
```

Or use `/install` to interactively select what to install.

**Requires**: Omni-Cortex MCP server installed and running.
