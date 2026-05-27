# Probability Storm -- Multi-Strategy Monte Carlo Simulation Engine

> **Status:** Active (Spec 05 — v2 rewrite)

## Overview

Multi-strategy Monte Carlo simulation engine that runs independent simulations on multiple strategies in parallel within a single Python script. Each strategy gets its own parameter set with 6 strategic variables. Uses stdlib only (no pip dependencies). Designed to run as a subprocess via bash.

## Strategic Variables (v2)

| Variable | Distribution | What It Measures |
|----------|-------------|-----------------|
| `value_score` | Normal(mu, sigma) | Strategic value — does it solve the real problem? |
| `cost` | LogNormal(mu, sigma) | Effort required — time, complexity, dependencies |
| `uniqueness` | Beta(alpha, beta) | How different from existing tools (1.0 = novel, 0.0 = exact duplicate) |
| `maintenance_burden` | Uniform(lo, hi) | Ongoing cost to maintain after building |
| `opportunity_cost` | Exponential(lambda) | What else could this time be spent on |
| `integration_risk` | Beta(alpha, beta) | Difficulty connecting to existing ecosystem |

## Composite Score Per Strategy

```
strategy_score = weighted_sum(
    value_score × 0.30,
    (1 - cost) × 0.20,
    uniqueness × 0.15,
    (1 - maintenance) × 0.15,
    (1 - opportunity_cost) × 0.10,
    (1 - integration_risk) × 0.10
)
```

Score is 0-100 (multiplied by 100 from 0-1 range).

## Outcome Classification (v2)

| Outcome | Threshold | Meaning |
|---------|-----------|---------|
| **Optimal** | score >= 65 | Best use of time, solves the problem well |
| **Viable** | score 40-64 | Works but not the best option |
| **Suboptimal** | score 20-39 | Significant tradeoffs, other options clearly better |
| **Wasteful** | score < 20 | Duplicates existing capability or cost far exceeds value |

## Python Script Template

The following script is written to a temp file and executed. Accepts a JSON file with an array of strategies.

```python
#!/usr/bin/env python3
"""Probability Storm v2 Multi-Strategy Monte Carlo Simulation Engine.

Reads an array of strategy parameter sets from a JSON file (argv[1]).
Simulates each strategy independently.
Outputs a JSON array of results to stdout.
Uses only Python stdlib.
"""
import json
import math
import random
import sys


def beta_variate(alpha, beta_param):
    """Sample from Beta distribution using stdlib random."""
    x = random.gammavariate(alpha, 1.0)
    y = random.gammavariate(beta_param, 1.0)
    return x / (x + y) if (x + y) > 0 else 0.5


def clamp(val, lo=0.0, hi=1.0):
    return max(lo, min(hi, val))


def simulate_strategy(strategy):
    """Run Monte Carlo simulation for a single strategy."""
    name = strategy.get("strategy_name", "Unknown")
    source = strategy.get("strategy_source", "unknown")
    n_sims = strategy.get("n_sims", 1000)
    seed = strategy.get("seed", 42)
    p = strategy.get("params", {})

    # Extract distribution parameters with defaults
    value_mu = p.get("value_mu", 0.6)
    value_sigma = p.get("value_sigma", 0.15)
    cost_mu = p.get("cost_mu", -0.8)
    cost_sigma = p.get("cost_sigma", 0.4)
    uniqueness_alpha = p.get("uniqueness_alpha", 3.0)
    uniqueness_beta = p.get("uniqueness_beta", 3.0)
    maintenance_lo = p.get("maintenance_lo", 0.1)
    maintenance_hi = p.get("maintenance_hi", 0.4)
    opportunity_lambda = p.get("opportunity_lambda", 2.0)
    integration_alpha = p.get("integration_alpha", 2.0)
    integration_beta = p.get("integration_beta", 4.0)

    random.seed(seed)

    outcomes = {"optimal": 0, "viable": 0, "suboptimal": 0, "wasteful": 0}
    scores = []
    var_accum = {
        "value_score": 0.0,
        "cost": 0.0,
        "uniqueness": 0.0,
        "maintenance_burden": 0.0,
        "opportunity_cost": 0.0,
        "integration_risk": 0.0,
    }

    for _ in range(n_sims):
        # Sample from distributions
        value = clamp(random.gauss(value_mu, value_sigma))
        raw_cost = math.exp(random.gauss(cost_mu, cost_sigma))
        cost = clamp(raw_cost / (1 + raw_cost))  # sigmoid to 0-1
        uniqueness = clamp(beta_variate(uniqueness_alpha, uniqueness_beta))
        maintenance = clamp(random.uniform(maintenance_lo, maintenance_hi))
        opp_raw = random.expovariate(opportunity_lambda)
        opportunity = clamp(opp_raw)
        integration = clamp(beta_variate(integration_alpha, integration_beta))

        # Composite score (0-1)
        composite = (
            value * 0.30
            + (1 - cost) * 0.20
            + uniqueness * 0.15
            + (1 - maintenance) * 0.15
            + (1 - opportunity) * 0.10
            + (1 - integration) * 0.10
        )
        score = composite * 100
        scores.append(score)

        # Track variance contributions (squared deviations)
        var_accum["value_score"] += (value - value_mu) ** 2
        var_accum["cost"] += (cost - 0.5) ** 2
        var_accum["uniqueness"] += (uniqueness - 0.5) ** 2
        var_accum["maintenance_burden"] += (maintenance - (maintenance_lo + maintenance_hi) / 2) ** 2
        var_accum["opportunity_cost"] += (opportunity - 0.5) ** 2
        var_accum["integration_risk"] += (integration - 0.5) ** 2

        # Classify outcome
        if score >= 65:
            outcomes["optimal"] += 1
        elif score >= 40:
            outcomes["viable"] += 1
        elif score >= 20:
            outcomes["suboptimal"] += 1
        else:
            outcomes["wasteful"] += 1

    # Statistics
    scores.sort()
    total = len(scores)

    def percentile(pct):
        idx = max(0, int(total * pct / 100) - 1)
        return round(scores[idx], 1)

    p5 = percentile(5)
    p25 = percentile(25)
    p50 = percentile(50)
    p75 = percentile(75)
    p95 = percentile(95)

    # Variance decomposition (normalize to percentages)
    total_var = sum(var_accum.values()) or 1.0
    variance_pct = {
        k: round(v / total_var * 100, 1)
        for k, v in sorted(var_accum.items(), key=lambda x: -x[1])
    }

    # Outcome percentages
    total_outcomes = sum(outcomes.values()) or 1
    outcome_pct = {
        k: round(v / total_outcomes, 4) for k, v in outcomes.items()
    }

    return {
        "strategy_name": name,
        "strategy_source": source,
        "composite_score": round(p50, 1),
        "mean_score": round(sum(scores) / total, 1),
        "percentiles": {
            "p5": p5, "p25": p25, "p50": p50, "p75": p75, "p95": p95
        },
        "outcomes": outcome_pct,
        "variance_contributions": variance_pct,
        "iterations": n_sims,
    }


def find_top_risk(variance_contributions):
    """Return the variable contributing most to variance."""
    return max(variance_contributions.items(), key=lambda x: x[1])


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python ps_simulation.py <strategies.json>"}))
        sys.exit(1)

    with open(sys.argv[1], "r") as f:
        data = json.load(f)

    # Accept either a list of strategies or a single strategy
    strategies = data if isinstance(data, list) else [data]

    results = []
    for strategy in strategies:
        result = simulate_strategy(strategy)
        results.append(result)

    # Sort by composite score descending
    results.sort(key=lambda r: r["composite_score"], reverse=True)

    # Add rank
    for i, r in enumerate(results):
        r["rank"] = i + 1

    print(json.dumps(results, indent=2))
```

## Batch Input JSON Format

Written to temp file before execution. Array of strategy objects:

```json
[
  {
    "strategy_name": "Extend time-report skill",
    "strategy_source": "existing_tool",
    "n_sims": 1000,
    "seed": 42001,
    "params": {
      "value_mu": 0.7, "value_sigma": 0.15,
      "cost_mu": -1.2, "cost_sigma": 0.4,
      "uniqueness_alpha": 2, "uniqueness_beta": 8,
      "maintenance_lo": 0.05, "maintenance_hi": 0.25,
      "opportunity_lambda": 2.0,
      "integration_alpha": 2, "integration_beta": 2
    }
  },
  {
    "strategy_name": "Build from scratch",
    "strategy_source": "ai_proposed",
    "n_sims": 1000,
    "seed": 52001,
    "params": {
      "value_mu": 0.8, "value_sigma": 0.20,
      "cost_mu": 0.2, "cost_sigma": 0.5,
      "uniqueness_alpha": 7, "uniqueness_beta": 2,
      "maintenance_lo": 0.2, "maintenance_hi": 0.6,
      "opportunity_lambda": 1.0,
      "integration_alpha": 3, "integration_beta": 3
    }
  }
]
```

## Parameter Mapping from L2 Strategy Attributes

### Source-Based Default Parameters

| Source | value_mu | value_sigma | cost_mu | cost_sigma | uniqueness_alpha | uniqueness_beta | maintenance_lo | maintenance_hi | opportunity_lambda | integration_alpha | integration_beta |
|--------|----------|-------------|---------|------------|------------------|-----------------|----------------|----------------|-------------------|-------------------|------------------|
| `existing_tool` | 0.70 | 0.10 | -1.5 | 0.3 | 2 | 8 | 0.05 | 0.20 | 3.0 | 2 | 8 |
| `web_discovery` | 0.55 | 0.15 | -0.5 | 0.5 | 4 | 4 | 0.15 | 0.40 | 1.5 | 4 | 3 |
| `ai_proposed` | 0.60 | 0.20 | -0.3 | 0.6 | 6 | 3 | 0.10 | 0.50 | 1.0 | 3 | 3 |

**Reading the table:**
- `existing_tool`: High value (0.70), low cost (cost_mu=-1.5 means very low after sigmoid), low uniqueness (alpha=2, beta=8 skews toward 0), low maintenance, low integration risk (alpha=2, beta=8 skews toward 0)
- `web_discovery`: Medium value, medium cost, balanced uniqueness, medium maintenance, higher integration risk
- `ai_proposed`: Variable value (high sigma=0.20), variable cost, high uniqueness (alpha=6, beta=3 skews toward 1), unknown maintenance (wide range), variable integration

### L1 Context Adjustments

Apply these adjustments AFTER setting source-based defaults:

| L1 Signal | Parameter Adjustment | Reason |
|-----------|---------------------|--------|
| duplicate_overlap > 60% | existing_tool strategies: value_mu += 0.10 | Solution already exists, extending it is high-value |
| duplicate_overlap > 60% | ai_proposed strategies: uniqueness_alpha -= 2 (min 1) | New builds have less unique contribution |
| L1 category = "infrastructure" | ALL strategies: cost_mu += 0.3 | Infrastructure decisions are inherently costly |
| L1 category = "architecture" | ALL strategies: cost_mu += 0.2 | Architecture decisions have high setup cost |
| L1 category = "integration" | ALL strategies: integration_alpha += 1 | More integration points = higher risk |
| Strategy description mentions "API" | That strategy: integration_alpha += 1 | API integrations carry inherent risk |
| Strategy effort = "High" | That strategy: cost_mu += 0.4 | L2 already assessed this as high effort |
| Strategy effort = "Low" | That strategy: cost_mu -= 0.3 | L2 already assessed this as low effort |
| Strategy risk = "High" | That strategy: value_sigma += 0.05, cost_sigma += 0.1 | High risk = wider uncertainty |
| Strategy risk = "Low" | That strategy: value_sigma -= 0.05 (min 0.05) | Low risk = tighter outcomes |

### Contrarian Strategy Parameters

For the "Don't build" / contrarian strategy from L2:
```json
{
  "value_mu": 0.40, "value_sigma": 0.25,
  "cost_mu": -3.0, "cost_sigma": 0.2,
  "uniqueness_alpha": 1, "uniqueness_beta": 1,
  "maintenance_lo": 0.0, "maintenance_hi": 0.05,
  "opportunity_lambda": 5.0,
  "integration_alpha": 1, "integration_beta": 10
}
```
Near-zero cost, near-zero maintenance, no integration risk — but lower and more uncertain value.

## Seed Strategy (v2)

- **Per-strategy seed:** `base_seed + strategy_index * 10000`
  - `base_seed = report_number * 1000 + day_of_year`
  - `strategy_index` = 0-based position in the strategy list
- This ensures each strategy gets its own reproducible random sequence
- Re-running with same parameters + same seed = same results

## Stress Test Mode

When `--stress-test` is specified:

1. Take the winning strategy's parameters (rank #1 from normal run)
2. Override n_sims to 100,000
3. Seed: `base_seed + 999999` (distinct from normal run)
4. Focus analysis on tail risks:
   - **p1**: worst 1% of outcomes (bottom 1,000 of 100,000)
   - **p5**: worst 5% of outcomes
   - Mean of bottom 5% ("Conditional Value at Risk")
5. Identify which variable contributes most to worst-case scenarios:
   - Run 100,000 more iterations, but track which variable deviation correlated with bottom-5% outcomes
   - Report: "If this strategy fails, it will most likely be because of {variable}"
6. Output appended to simulation results with `stress_test` key

Stress test Python extension (added after the main script's simulate_strategy function):

```python
def stress_test_strategy(strategy, n_sims=100000):
    """Deep stress test on a single strategy. Returns tail risk analysis."""
    result = simulate_strategy({**strategy, "n_sims": n_sims})

    # Re-run to track per-variable correlation with worst outcomes
    p = strategy.get("params", {})
    seed = strategy.get("seed", 42)
    random.seed(seed)

    variable_when_bad = {
        "value_score": [], "cost": [], "uniqueness": [],
        "maintenance_burden": [], "opportunity_cost": [], "integration_risk": []
    }
    all_scores_with_vars = []

    for _ in range(n_sims):
        value = clamp(random.gauss(p.get("value_mu", 0.6), p.get("value_sigma", 0.15)))
        raw_cost = math.exp(random.gauss(p.get("cost_mu", -0.8), p.get("cost_sigma", 0.4)))
        cost = clamp(raw_cost / (1 + raw_cost))
        uniqueness = clamp(beta_variate(p.get("uniqueness_alpha", 3), p.get("uniqueness_beta", 3)))
        maintenance = clamp(random.uniform(p.get("maintenance_lo", 0.1), p.get("maintenance_hi", 0.4)))
        opp_raw = random.expovariate(p.get("opportunity_lambda", 2.0))
        opportunity = clamp(opp_raw)
        integration = clamp(beta_variate(p.get("integration_alpha", 2), p.get("integration_beta", 4)))

        score = (
            value * 0.30 + (1 - cost) * 0.20 + uniqueness * 0.15
            + (1 - maintenance) * 0.15 + (1 - opportunity) * 0.10
            + (1 - integration) * 0.10
        ) * 100

        all_scores_with_vars.append({
            "score": score,
            "vars": {
                "value_score": value, "cost": cost, "uniqueness": uniqueness,
                "maintenance_burden": maintenance, "opportunity_cost": opportunity,
                "integration_risk": integration
            }
        })

    # Sort by score, get bottom 5%
    all_scores_with_vars.sort(key=lambda x: x["score"])
    cutoff = max(1, int(n_sims * 0.05))
    bottom_5pct = all_scores_with_vars[:cutoff]
    all_entries = all_scores_with_vars

    # Mean of bottom 5% scores
    cvar_5 = round(sum(e["score"] for e in bottom_5pct) / len(bottom_5pct), 1)

    # Compare means of each variable in bottom 5% vs overall
    risk_drivers = {}
    for var_name in variable_when_bad:
        bottom_mean = sum(e["vars"][var_name] for e in bottom_5pct) / len(bottom_5pct)
        overall_mean = sum(e["vars"][var_name] for e in all_entries) / len(all_entries)
        # For "positive" vars (value, uniqueness), low is bad
        # For "negative" vars (cost, maintenance, opportunity, integration), high is bad
        if var_name in ("value_score", "uniqueness"):
            deviation = overall_mean - bottom_mean  # positive = worse when low
        else:
            deviation = bottom_mean - overall_mean  # positive = worse when high
        risk_drivers[var_name] = round(deviation, 4)

    # Sort by deviation (biggest driver first)
    sorted_drivers = sorted(risk_drivers.items(), key=lambda x: -x[1])
    top_risk = sorted_drivers[0][0] if sorted_drivers else "unknown"

    scores_only = [e["score"] for e in all_scores_with_vars]
    scores_only.sort()
    p1 = round(scores_only[max(0, int(n_sims * 0.01) - 1)], 1)
    p5 = round(scores_only[max(0, int(n_sims * 0.05) - 1)], 1)

    return {
        "strategy_name": strategy.get("strategy_name", "Unknown"),
        "iterations": n_sims,
        "p1": p1,
        "p5": p5,
        "cvar_5": cvar_5,
        "top_risk_variable": top_risk,
        "risk_drivers": {k: round(v, 4) for k, v in sorted_drivers},
        "composite_score": result["composite_score"],
        "percentiles": result["percentiles"],
    }
```

## Execution Pattern

```bash
# Write params to temp file (array of strategies)
# Execute batch simulation
python /tmp/ps_simulation.py /tmp/ps_strategies.json > /tmp/ps_results.json 2>/tmp/ps_errors.log

# For stress test (separate script with stress_test_strategy function)
python /tmp/ps_stress_test.py /tmp/ps_stress_params.json > /tmp/ps_stress_results.json 2>/tmp/ps_stress_errors.log

# Cleanup
rm -f /tmp/ps_simulation.py /tmp/ps_strategies.json /tmp/ps_results.json /tmp/ps_errors.log
rm -f /tmp/ps_stress_test.py /tmp/ps_stress_params.json /tmp/ps_stress_results.json /tmp/ps_stress_errors.log
```

**IMPORTANT:** Write to temp files. Do NOT use inline `python -c "..."` -- nested quotes cause errors on Windows.

**Windows note:** Use `/tmp/` paths in git bash (maps to temp directory). Clean up after execution.

## Output JSON Format

Array of strategy results, sorted by composite_score descending:

```json
[
  {
    "rank": 1,
    "strategy_name": "Extend time-report",
    "strategy_source": "existing_tool",
    "composite_score": 72.3,
    "mean_score": 71.8,
    "percentiles": {"p5": 58.1, "p25": 66.4, "p50": 72.3, "p75": 78.1, "p95": 85.2},
    "outcomes": {"optimal": 0.45, "viable": 0.38, "suboptimal": 0.14, "wasteful": 0.03},
    "variance_contributions": {
      "value_score": 28.1, "cost": 24.3, "uniqueness": 18.2,
      "maintenance_burden": 15.1, "opportunity_cost": 8.7, "integration_risk": 5.6
    },
    "iterations": 1000
  },
  {
    "rank": 2,
    "strategy_name": "Build from scratch",
    "strategy_source": "ai_proposed",
    "composite_score": 58.2,
    "...": "..."
  }
]
```

## L3 Layer Score

The L3 layer score = **winner's composite score** (rank #1 strategy's p50).

This represents the best available strategic outcome for the decision.

## Performance Targets

- 10 strategies x 1,000 iterations: < 3 seconds
- 50 strategies x 10,000 iterations: < 15 seconds
- 1 strategy x 100,000 iterations (stress test): < 10 seconds

All targets easily met by Python stdlib — random number generation + arithmetic is fast.
