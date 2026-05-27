# Crystal Ball Scoring Rubric

## Overall Coherence Score

Weighted average of 5 sub-scores:

| Metric | Weight | Calculation |
|--------|--------|-------------|
| Outcome Alignment | 25% | (requirements with implementation path) / (total requirements) × 100 |
| Cross-Tech Health | 25% | (passing integration points) / (total integration points) × 100 |
| Decision Stability | 20% | 100% − (weighted revision rate for decision categories in scope) |
| Gap Coverage | 15% | (addressed gaps) / (total identified gaps) × 100 |
| Constraint Compliance | 15% | (constraints within bounds) / (total constraints checked) × 100 |

**Formula**: `Score = (OA × 0.25) + (CT × 0.25) + (DS × 0.20) + (GC × 0.15) + (CC × 0.15)`

## Score Interpretation

| Range | Assessment | Action |
|-------|-----------|--------|
| 90-100 | Excellent — design is highly coherent | Proceed with confidence |
| 75-89 | Good — minor gaps, low risk | Address flagged items before build |
| 60-74 | Fair — notable gaps or risks | Resolve medium+ severity gaps first |
| 40-59 | Concerning — significant coherence issues | Major design review needed |
| 0-39 | Critical — design has fundamental problems | Stop and redesign before building |

## Prediction Confidence Levels

Based on sample size of similar historical decisions:

| Sample Size (n) | Level | Label | Guidance |
|-----------------|-------|-------|----------|
| n < 3 | Low | "Speculative" | Insufficient data — flag but don't weight heavily |
| n = 3-7 | Medium | "Reasonable basis" | Worth considering — patterns emerging |
| n > 7 | High | "Strong basis" | Statistically significant — take seriously |

## Prediction Aggressiveness (Balanced Mode)

- **Flag threshold**: Decisions with >40% predicted revision rate
- **Speculative label**: Any prediction with Low confidence is marked "speculative"
- **Display**: Always show confidence level alongside probability
- **Format**: "[P]% chance [prediction] — based on [N] similar decisions, confidence: [level]"

## Session Stress Detection

| Failure Rate | Status | Impact on Predictions |
|-------------|--------|----------------------|
| 0-10% | Normal | No adjustment |
| 11-20% | Elevated | Note in report, no score adjustment |
| 21-40% | Stressed | ⚠️ Warning — decisions may need re-validation |
| 41%+ | High Stress | ❌ Strong warning — recommend deferring major decisions |

## Gap Severity Ranking

Gaps are ranked by **cost-of-delay** formula:

```
Cost_of_Delay = Impact% × (Fix_Cost_Later / Fix_Cost_Now)
```

Example:
- Gap with 80% impact, fix now: 2hrs, fix later: 16hrs → CoD = 80 × (16/2) = 640
- Gap with 40% impact, fix now: 1hr, fix later: 4hrs → CoD = 40 × (4/1) = 160
- Higher CoD = fix it sooner

## Retrospective Weight Adjustment

When retrospectives repeatedly flag the same category:

| Retro Count | Adjustment |
|-------------|------------|
| 1 occurrence | No change |
| 2 occurrences | Note in report |
| 3+ occurrences | 1.5x scrutiny weight for that category |
| 5+ occurrences | 2.0x scrutiny weight — systemic issue |

This means if "environment variable issues" appear in 3+ retrospectives, Crystal Ball scores that category 1.5x more strictly (effectively lowering the constraint compliance score for env-var related checks).

## Decision Debt Scoring

Each deferred decision accumulates cost over time:

```
Current_Cost = Base_Fix_Cost × (1 + 0.1 × sessions_since_deferred)
```

A decision that costs 2hrs to fix today costs approximately:
- 5 sessions later: 2 × 1.5 = 3hrs
- 10 sessions later: 2 × 2.0 = 4hrs
- 20 sessions later: 2 × 3.0 = 6hrs

This is an estimate — actual cost varies. The formula models the general principle that deferred decisions become more expensive as more things depend on them.
