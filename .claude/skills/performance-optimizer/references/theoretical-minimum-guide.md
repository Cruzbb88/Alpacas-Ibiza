# L2: Theoretical Minimum Guide

For each identified bottleneck, calculate the theoretical minimum -- the fastest it could possibly run given the laws of physics, algorithm theory, and infrastructure constraints. Then measure the gap between actual and theoretical.

## Step 1: Classify the Bottleneck

Determine what type of operation the bottleneck performs:

| Category | Theoretical Minimum Basis |
|----------|--------------------------|
| Database query | Index-only scan time for minimum required data. Single B-tree traversal for point lookups, index range scan for ranges. |
| Network call | Round-trip latency (distance/speed-of-light + TCP overhead) + minimum payload transfer time |
| Algorithm/computation | Time complexity lower bound for the problem class (e.g., comparison sort cannot beat O(n log n)) |
| File I/O | Sequential read at disk bandwidth for minimum required bytes |
| Serialization | Minimum bytes to represent the data x serialization throughput |
| Memory allocation | Size of required data structures at optimal packing |

## Step 2: Calculate Theoretical Minimum

For the top 3 bottlenecks from L1, compute the theoretical minimum time. Document every assumption.

### Calculation Template

```markdown
### Theoretical Minimum: {bottleneck_name}

**Current:** {N}ms
**Theoretical minimum:** {N}ms
**Basis:** {explanation of how theoretical minimum was calculated}
**Assumptions:** {list of assumptions, e.g., "indexed lookup, SSD storage, local network"}
**Gap:** {current - theoretical}ms ({gap_percentage}% above theoretical)
```

### Calculation Examples by Category

**Database query example:**
- Current: 150ms (full table scan on 1M rows)
- Theoretical: 0.5ms (B-tree index lookup, 3 levels deep, SSD seek ~0.1ms)
- Basis: Point lookup on indexed column requires O(log n) = ~20 comparisons, each at ~0.025ms on SSD
- Gap: 149.5ms (29,900% above theoretical)

**Network call example:**
- Current: 350ms (external API call with serialization)
- Theoretical: 85ms (40ms RTT to region + 45ms minimum response processing)
- Basis: Speed of light latency to us-east-1 from current region, plus minimum TCP handshake
- Gap: 265ms (312% above theoretical)

**Algorithm example:**
- Current: 800ms (nested loop search over 100K items)
- Theoretical: 2ms (hash table lookup O(1) amortized)
- Basis: Problem is a membership check, reducible to O(1) with proper data structure
- Gap: 798ms (39,900% above theoretical)

## Step 3: Gap Ranking

Rank bottlenecks by gap size (actual - theoretical), NOT by absolute time.

A function taking 500ms with a theoretical minimum of 490ms has a 10ms gap.
A function taking 50ms with a theoretical minimum of 2ms has a 48ms gap.
The 48ms gap is more actionable even though the absolute time is lower.

Sort by: gap_ms descending, then by gap_percentage descending as tiebreaker.

## Step 4: Recoverability Assessment

For each gap, estimate how much is recoverable:

| Recoverability | Range | Meaning | Examples |
|---------------|-------|---------|----------|
| High | 80-100% | Known optimization techniques close most of the gap | Add index, enable caching, batch queries |
| Medium | 40-79% | Optimization helps significantly but some gap remains | Algorithm improvement, connection pooling |
| Low | 0-39% | Fundamental constraint limits improvement | Network latency to external API, hardware limits |

Consider:
- Is the solution a known pattern (add an index, use a cache)? -> High
- Does it require algorithmic redesign but the better algorithm exists? -> Medium
- Is it constrained by physics or third-party systems? -> Low

## L2 Scoring

| Score Range | Meaning |
|-------------|---------|
| 80-100 | Operations running within 20% of theoretical minimum -- near-optimal |
| 60-79 | Moderate gaps -- 20-50% above theoretical minimum, optimization worthwhile |
| 40-59 | Large gaps -- 50-200% above theoretical minimum, significant room for improvement |
| 0-39 | Extreme gaps -- 200%+ above theoretical minimum, critical optimization needed |

## L2 Output Format

```markdown
## L2: Theoretical Minimum Analysis

### Gap Summary
| Bottleneck | Current | Theoretical Min | Gap | Gap % | Recoverability |
|-----------|---------|----------------|-----|-------|---------------|
| {name} | {N}ms | {N}ms | {N}ms | {N}% | High/Med/Low |

### Detailed Analysis: {top_bottleneck}
**Current performance:** {N}ms
**Theoretical minimum:** {N}ms
**Calculation basis:** {detailed explanation}
**Assumptions:** {numbered list}
**Gap:** {N}ms ({N}% above theoretical)
**Recoverability:** {High/Med/Low} -- {explanation}
**Key insight:** {one-sentence summary of why the gap exists}
```
