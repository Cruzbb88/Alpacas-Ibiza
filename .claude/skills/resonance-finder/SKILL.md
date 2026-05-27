---
name: resonance-finder
description: >-
  Parameter tuning optimization skill that finds the optimal values for every
  configurable knob in a system. Inventories all tunable parameters (timeouts,
  pool sizes, batch sizes, TTLs, retry intervals, buffer sizes, rate limits,
  worker counts), ranks them by sensitivity to system behavior, calculates
  optimal values using mathematical models, and analyzes parameter interactions
  to find resonance points where the system operates at peak efficiency.
  Use when: (1) Auditing what parameters exist in a project, (2) Determining
  which parameters matter most, (3) Finding optimal values for database pools,
  cache TTLs, batch sizes, worker counts, (4) Understanding how parameters
  interact, (5) Generating a tuning config with recommended values.
  Inspired by Nikola Tesla: every system has a natural resonant frequency.
argument-hint: "[quick | deep | scan | tune <parameter>]"
model: opus
---

> *"If you want to find the secrets of the universe, think in terms of energy, frequency, and vibration."* — Nikola Tesla

## Layer Architecture

| Layer | Name | Weight | What It Does |
|-------|------|--------|-------------|
| L1 | Parameter Inventory | 30% | Find all tunable values: config files, env vars, thresholds, magic numbers |
| L2 | Sensitivity Ranking | 30% | Rank parameters by impact on system behavior/performance |
| L3 | Optimal Value Determination | 25% | Calculate recommended values using math models + best practices |
| L4 | Harmonic Analysis | 15% | Analyze parameter interactions, find coupled parameters and resonance points |

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Default | *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1-L4 | Yes | L3, L4 |
| Scan | `scan` | L1 only | Yes | No |
| Tune | `tune <parameter>` | L2 + L3 for single param | No | No |

## Argument Routing (Step 0)

Parse the user's argument to determine mode:

| Argument | Mode | Layers to Execute |
|----------|------|-------------------|
| *(none)* | Default | L1 + L2 |
| `quick` | Quick | L1 only |
| `deep` | Deep | L1 + L2 + L3 + L4 |
| `scan` | Scan | L1 only |
| `tune <parameter>` | Tune | L1 (verify param exists) + L2 + L3 for that parameter |

## Layer Execution Flow

- **L1**: Always inline. Read `references/parameter-inventory-guide.md` and execute the inventory protocol.
- **L2**: Inline for default, deep, and tune modes. Read `references/sensitivity-analysis-guide.md` and execute the ranking protocol.
- **L3**: Sub-agent in deep mode, inline in tune mode. Read `references/optimization-formulas.md` and apply optimization methods (Theoretical Bounds > Best Practice Lookup > Empirical Pattern Analysis).
- **L4**: Sub-agent in deep mode only. Read `references/harmonic-analysis-guide.md` and execute the 5-step harmonic protocol (identify pairs, interaction graph, harmonic groups, anti-patterns, resonance points).

## Composite Scoring

```
composite = (L1 x 0.30) + (L2 x 0.30) + (L3 x 0.25) + (L4 x 0.15)
```

**Weight redistribution** when layers are unavailable:

| Mode | L1 Weight | L2 Weight | L3 Weight | L4 Weight |
|------|-----------|-----------|-----------|-----------|
| Quick | 100% | -- | -- | -- |
| Default | 50% | 50% | -- | -- |
| Scan | 100% | -- | -- | -- |
| Deep | 30% | 30% | 25% | 15% |
| Tune | -- | 55% | 45% | -- |
| Deep (L3/L4 N/A) | 50% | 50% | -- | -- |

**Score interpretation:**
- 80-100: Excellent -- parameters well-understood and tuned
- 60-79: Good -- most parameters identified, key sensitivities known
- 40-59: Fair -- gaps in parameter coverage or sensitivity analysis
- 0-39: Critical -- major parameters missing or unanalyzed

## References

| Layer | Reference File | Read When |
|-------|---------------|-----------|
| L1 | `references/parameter-inventory-guide.md` | Always (all modes execute L1) |
| L2 | `references/sensitivity-analysis-guide.md` | Default, deep, and tune modes |
| L3 | `references/optimization-formulas.md` | Deep and tune modes |
| L4 | `references/harmonic-analysis-guide.md` | Deep mode only |

## Reports

Reports saved to: `reports/resonance-finder/rf-NNN-YYYY-MM-DD.md`
Tuning configs saved to: `reports/resonance-finder/tuning-config-NNN.md` (deep mode only)

- Sequential numbering: glob existing reports, extract NNN, increment
- YAML frontmatter with layer scores, composite score, trend data
- Trend dashboard generated when 2+ prior reports exist
- Quick mode and tune mode do NOT save reports
- Deep mode generates tuning config with recommended values, tuning order, and resonance test plan

## Edge Cases

- **No config files**: Scan application code for hardcoded constants; score reflects limited sources
- **Only .env file**: Inventory limited sources, note coverage gaps in report
- **Parameter in multiple sources**: Record both occurrences, flag potential conflict
- **Monorepo**: Scope scan to current working directory, not entire repo
- **tune with unknown param**: Run L1 first to verify parameter exists, report if not found
- **No coupled parameters**: L4 reports all independent, score = 80 (healthy state)
