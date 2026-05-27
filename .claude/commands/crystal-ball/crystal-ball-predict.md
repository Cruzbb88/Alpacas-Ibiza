---
description: Evaluate a specific decision against your historical patterns. Calculates revision probability, finds similar precedents, and checks session stress.
argument-hint: "<decision-description>"
allowed-tools: Read, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_get_session_context, mcp__omni-cortex__cortex_get_activities
---

# Crystal Ball — Decision Pattern Predictor

Evaluate a specific decision's revision probability.

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

DECISION: $ARGUMENTS

## Workflow

### Step 1: Categorize the Decision

Analyze the decision description and categorize it:
- **Data model** — table schemas, field types, relationships
- **Auth/security** — authentication, authorization, API keys, JWT
- **Workflow/pipeline** — n8n, automation, data flow
- **Integration** — connecting two systems, API contracts
- **Frontend/UI** — component structure, UX patterns
- **Deployment/infra** — hosting, CI/CD, environment config
- **Architecture** — system-level patterns, service boundaries

### Step 2: Find Historical Precedents

Launch parallel queries:

**Omni-Cortex search:**
- `cortex_list_memories` with tags matching the decision category
- `cortex_recall` with the decision description as query
- `cortex_global_search` for cross-project precedents

**Direct SQL:**
- Decision revision rate for this category (see `references/sql-queries.md`)
- Count of decisions in this category that were superseded

### Step 3: Calculate Revision Probability

```
Base_Rate = (superseded decisions in category) / (total decisions in category) × 100
```

Adjustments:
- **Session stress**: If current session failure_rate > 20%, add +15% to revision probability
- **Complexity**: If decision involves 3+ systems, add +10%
- **Precedent match**: If a very similar past decision was revised, add +20%

Cap at 95% (nothing is certain).

### Step 4: Check Session Stress

Query activities table for current session:
```sql
SELECT failure_rate FROM (
  SELECT ROUND(SUM(CASE WHEN success=0 THEN 1 ELSE 0 END)*100.0/COUNT(*),1) as failure_rate
  FROM activities WHERE session_id='{current_session}'
)
```

If > 20%: warn that decisions from stressed sessions have higher revision rates.

### Step 5: Generate Prediction Report

```
## Crystal Ball Prediction

**Decision**: "[DECISION]"
**Category**: [category]

### Revision Probability: [X]%
**Confidence**: [Low/Medium/High] (based on [N] similar decisions)

### Basis
- Historical revision rate for [category]: [X]%
- Similar past decisions: [N] found, [M] were revised
- Session stress level: [Normal/Elevated/Stressed] ([X]% failure rate)

### Similar Precedents
1. **[Past decision summary]** — [Revised/Stuck] after [N] sessions
   - What happened: [brief outcome]
2. **[Past decision summary]** — [Revised/Stuck]
   ...

### Risk Factors
- [Factor 1]: [adds +X% to revision probability]
- [Factor 2]: [adds +X% to revision probability]

### Recommendation
[Based on the probability and precedents, specific advice:
 - If >70%: "Strongly consider pressure-testing this before committing"
 - If 40-70%: "Worth a second look — similar decisions needed revision"
 - If <40%: "Reasonable confidence — this pattern tends to stick"]
```

### Step 6: Store Results

```
cortex_remember:
  content: "Crystal Ball Predict — Decision: [brief]. Category: [cat]. Revision probability: [X]%. Confidence: [level]."
  tags: ["crystal-ball", "predict", "{category}", "{project-name}"]
  importance: 75
```

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Categorize the decision from $ARGUMENTS (data model, auth, workflow, integration, UI, deployment, architecture)
- Query Cortex for historical precedents in the same category; check for direct SQL via references/sql-queries.md
- Apply stress modifiers: +15% if current session failure rate > 20%, +10% for 3+ systems, +20% for similar revised decision
- Cap revision probability at 95%; provide confidence level based on sample size
- Store results in Cortex with tags ["crystal-ball", "predict", "{category}", "{project-name}"]

## Report

```
## Crystal Ball Prediction

**Decision:** "[DECISION]"
**Category:** [category]

### Revision Probability: [X]%
**Confidence:** [Low/Medium/High] (based on [N] similar decisions)

### Basis
- Historical revision rate for [category]: [X]%
- Similar past decisions: [N] found, [M] were revised
- Session stress: [Normal/Elevated/Stressed]

### Risk Factors
- [Factor]: [+X% to revision probability]

### Recommendation
[Specific advice based on probability range]
```
