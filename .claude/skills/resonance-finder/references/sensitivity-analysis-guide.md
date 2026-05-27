# L2: Sensitivity Analysis Guide

This reference defines the protocol for ranking parameters by their sensitivity -- how much system behavior changes when a parameter is adjusted. A parameter with high sensitivity is a critical tuning knob; a parameter with low sensitivity can safely be left at its default.

---

## Sensitivity Analysis Techniques

For each parameter from the L1 inventory, compute a composite sensitivity score using all four techniques below, applied in priority order.

### Technique 1: Dependency Chain Analysis

**Question:** How many components read or depend on this parameter?

**Method:**
1. Search the codebase for references to the parameter name (env var reads, config lookups, constant usage)
2. Count **direct consumers**: files or functions that read the value directly
3. Count **indirect dependents**: components that depend on those direct consumers (e.g., if a database module reads `DB_POOL_SIZE` and 15 API routes use that database module, the indirect dependents = 15)

**Formula:**
```
dependency_score = (direct_consumers x 2) + indirect_dependents
```

**Examples:**
- `DB_POOL_SIZE`: Read by `db.ts` (1 direct), used by 20 route handlers (20 indirect) = 22
- `LOG_LEVEL`: Read by `logger.ts` (1 direct), imported everywhere (30 indirect) = 32 -- but see failure mode analysis below
- `BATCH_SIZE`: Read by `processor.ts` (1 direct), called by 2 cron jobs (2 indirect) = 4

### Technique 2: Call-Frequency Weighting

**Question:** How often is this parameter's value used in runtime?

**Classification:**

| Frequency | Weight Multiplier | Examples |
|-----------|------------------|---------|
| Per-request | x 3 | Connection pool size, API timeout, rate limit |
| Per-session | x 2 | Session TTL, auth token expiry, WebSocket keepalive |
| Per-startup | x 1 | Worker count, port number, log level |
| Per-deployment | x 0.5 | Build optimization level, compiler flags |

**Method:**
1. Determine the parameter's usage context by reading how it is consumed
2. A parameter read once at startup but whose value is used on every request counts as per-request
3. Apply the multiplier to the dependency_score

```
frequency_adjusted = dependency_score x frequency_multiplier
```

### Technique 3: Resource-Constraint Proximity

**Question:** How close is this parameter to a resource limit?

**Method:**
1. Estimate current utilization if possible:
   - From explicit config (e.g., pool size = 10, max connections documented as 100 = 10% utilization)
   - From code comments or documentation
   - From infrastructure limits (e.g., container memory limit vs configured buffer sizes)
2. If utilization cannot be estimated, use x 1 (neutral)

**Multipliers:**

| Utilization | Multiplier | Signal |
|-------------|-----------|--------|
| High (>70%) | x 2 | Near resource ceiling, small changes have big impact |
| Medium (30-70%) | x 1 | Moderate headroom |
| Low (<30%) | x 0.5 | Plenty of headroom, less sensitive to changes |
| Unknown | x 1 | Cannot estimate, use neutral weight |

```
resource_adjusted = frequency_adjusted x resource_multiplier
```

### Technique 4: Failure Mode Analysis

**Question:** What happens if this parameter is set to the wrong value?

**Classification:**

| Failure Mode | Multiplier | Description | Examples |
|-------------|-----------|-------------|---------|
| **Catastrophic** | x 3 | System crash, data loss, security breach | Pool exhaustion causing deadlock, buffer overflow, auth timeout = 0 |
| **Degraded** | x 2 | Timeouts, slow responses, partial failures | API timeout too low causes cascading failures, small batch size starves throughput |
| **Minor** | x 1 | Cosmetic issues, excessive logging, slight inefficiency | Log level too verbose, pagination size slightly off |

**Method:**
1. Consider what happens if the value is doubled. What if halved? What if set to 0?
2. The worst realistic failure mode determines the classification
3. Consider cascading effects: a timeout that causes retries that cause more timeouts = catastrophic

```
final_sensitivity = resource_adjusted x failure_multiplier
```

---

## Composite Sensitivity Score

The final sensitivity score for each parameter:

```
sensitivity = dependency_score x frequency_multiplier x resource_multiplier x failure_multiplier
```

This produces a raw score. Normalize all scores to a 0-100 scale:

```
normalized_score = (raw_score / max_raw_score_in_project) x 100
```

The highest-sensitivity parameter in the project always scores 100. All others are relative.

---

## Sensitivity Classification

After computing normalized scores for all parameters, classify them:

| Classification | Range | Description |
|----------------|-------|-------------|
| **HIGH** | Top 20% of scored parameters | System behavior changes dramatically when adjusted. These are the critical tuning knobs. |
| **MEDIUM** | Middle 40% (21st-60th percentile) | Noticeable effect on performance or reliability. Worth tuning but not urgent. |
| **LOW** | Bottom 40% (below 41st percentile) | Minimal impact, safe to leave at defaults. Tune only if optimizing aggressively. |

### Classification Rules

- If fewer than 5 parameters: classify top 1 as HIGH, rest split between MEDIUM and LOW
- If 5-10 parameters: top 20% HIGH, middle 40% MEDIUM, bottom 40% LOW
- If 10+ parameters: strict percentile boundaries apply
- Parameters with failure mode = Catastrophic are always at least MEDIUM, regardless of other scores

---

## Output Format

Present results as the Sensitivity Ranking Table:

```markdown
### L2: Sensitivity Ranking

**Parameters ranked:** [N]/[total from L1]
**HIGH sensitivity:** [N]
**MEDIUM sensitivity:** [N]
**LOW sensitivity:** [N]

| Rank | Parameter | Sensitivity | Classification | Key Factor | Current Risk |
|------|-----------|-------------|---------------|------------|-------------|
| 1 | DB_POOL_SIZE | 87 | HIGH | 23 consumers, per-request, 85% utilization | Over-saturated under load |
| 2 | API_TIMEOUT | 72 | HIGH | 15 consumers, per-request, catastrophic failure | Cascade risk on timeout |
| 3 | CACHE_TTL | 45 | MEDIUM | 8 consumers, per-request, low utilization | Stale data possible |
| 4 | MAX_RETRIES | 38 | MEDIUM | 5 consumers, per-request, degraded failure | Retry storm risk |
| 5 | LOG_LEVEL | 12 | LOW | 30 consumers, per-startup, minor failure | Verbose logging cost |
```

### Column Definitions

- **Rank**: Ordered by sensitivity score, highest first
- **Parameter**: Name from L1 inventory
- **Sensitivity**: Normalized score (0-100)
- **Classification**: HIGH, MEDIUM, or LOW
- **Key Factor**: Brief summary of why this parameter scored where it did. Include the most impactful factors (e.g., consumer count, frequency, failure mode)
- **Current Risk**: For HIGH and MEDIUM parameters only. Describe the current risk if this parameter is suboptimal. For LOW parameters, use "--" or leave blank.

---

## Detailed Analysis for HIGH Sensitivity Parameters

For each HIGH sensitivity parameter, provide a brief analysis block:

```markdown
#### [Parameter Name] -- HIGH Sensitivity (Score: [N])

- **Dependency chain:** [N] direct consumers, [N] indirect dependents
- **Call frequency:** Per-[request/session/startup/deployment]
- **Resource proximity:** [High/Medium/Low/Unknown] ([detail])
- **Failure mode:** [Catastrophic/Degraded/Minor] -- [what happens]
- **Current risk:** [Assessment of whether current value is appropriate]
- **Tuning priority:** [1-N ranking among HIGH params]
```

---

## L2 Scoring Rubric

| Criterion | Points | How to Score |
|-----------|--------|-------------|
| **Coverage** | 0-30 | Percentage of L1 parameters ranked: (ranked / total) x 30 |
| **Evidence** | 0-30 | Each ranking cites specific dependency counts, call frequency, or failure mode (0 = no evidence, 15 = some evidence, 30 = all rankings have evidence) |
| **Classification** | 0-20 | Clear HIGH/MEDIUM/LOW with percentile thresholds documented (0 = no classification, 10 = classification without thresholds, 20 = full classification with thresholds) |
| **Risk identification** | 0-20 | Current risk noted for HIGH sensitivity params (0 = no risk notes, 10 = some risk notes, 20 = all HIGH params have risk assessment) |

**Total: 0-100**

---

## Edge Cases

- **Single parameter project**: That parameter is automatically HIGH sensitivity (score = 100).
- **All parameters similar sensitivity**: Use failure mode as the tiebreaker for classification.
- **Parameters with no code references**: These may be dead configuration. Classify as LOW and note "possibly unused" in Current Risk.
- **Tune mode (single parameter)**: Run the full analysis for just the target parameter. Compare its score against the full inventory to determine classification.
- **Dynamic parameters**: Parameters that can be changed at runtime (e.g., feature flags) vs. those requiring restart. Note this in the Key Factor column as it affects operational sensitivity.
