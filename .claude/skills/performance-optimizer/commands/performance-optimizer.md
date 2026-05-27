---
argument-hint: "<target> [quick | deep]"
---

# Performance Optimizer

> *"Find the power core. Optimize the one thing everything depends on."*

## Parse Arguments

Extract from user input:
- **target**: file path, directory, endpoint name, function name, or "the whole app"
- **mode**: `quick`, `deep`, or default (no mode arg)

If no target provided, ask: "What should I analyze? Provide a file, directory, endpoint, or say 'the whole app'."

## Mode Routing

```
if mode == "quick":
    Run L1 only (inline)
    Display results
    Do NOT save report

elif mode == "deep":
    Run L1 inline
    Run L2 inline
    Spawn sub-agents for L3 + L4 in parallel
    Combine all scores
    Save numbered report

else (default):
    Run L1 inline
    Run L2 inline
    Save numbered report
```

### Deep Mode Sub-Agent Spawning

After L1+L2 complete inline in deep mode, spawn 2 Task sub-agents in a single message (parallel execution):

**Task 1 (L3 - Gap Closure):**
- subagent_type: "general-purpose"
- Prompt: "You are the L3 Gap Closure sub-agent for Performance Optimizer. Read `references/optimization-techniques.md` for the full optimization catalog. Using the L1 bottleneck ranking and L2 gap analysis provided below, select applicable techniques for each bottleneck, estimate impact, and produce an ordered optimization plan with cascading benefit analysis and code-level recommendations for the top 3 techniques. Score 0-100 based on gap closability. Follow the L3 protocol in `commands/performance-optimizer.md` exactly. Here is the L1+L2 data: {paste L1+L2 output}"

**Task 2 (L4 - Regression Prevention):**
- subagent_type: "general-purpose"
- Prompt: "You are the L4 Regression Prevention sub-agent for Performance Optimizer. Read `references/benchmark-patterns.md` for benchmark code templates. Using the L1 critical path and L2 theoretical minimum data provided below, generate benchmark specs for each bottleneck, produce a 9s reliability audit (estimated from code inspection), and generate a trend dashboard if previous reports exist in `reports/performance-optimizer/`. Score 0-100. Follow the L4 protocol in `commands/performance-optimizer.md` exactly. Here is the L1+L2 data: {paste L1+L2 output}"

After both sub-agents return: combine L1+L2+L3+L4 scores, compute composite, merge all sections into the final report.

---

## L1: Critical Path Identification (Weight: 35%)

Read `references/critical-path-protocol.md` for the full protocol.

### Summary

1. **Target Scoping** -- Accept target, identify entry points using Glob/Grep
2. **Operation Tracing** -- Follow call graph from entry to exit through all layers (static analysis only, v1)
3. **Time Estimation** -- Estimate time at each node using heuristic table (DB queries, network calls, I/O, CPU, memory)
4. **Bottleneck Ranking** -- Rank by Power Core Score: `direct_time_ms x downstream_count`
5. **Cascading Impact** -- Trace downstream impact of top bottleneck

### L1 Scoring

| Score | Meaning |
|-------|---------|
| 80-100 | Well-balanced, no significant bottleneck |
| 60-79 | Minor bottleneck, < 40% of path time |
| 40-59 | Moderate bottleneck, 40-70% of path time |
| 0-39 | Severe bottleneck, > 70% of path time |

Low score = severe bottleneck found (which is the point of running this).

### L1 Output

```markdown
## L1: Critical Path Analysis

### Power Core Identified
**Bottleneck:** {component/function/query name}
**Location:** {file:line}
**Estimated Time:** {N}ms of {total}ms total path ({percentage}%)
**Downstream Impact:** Affects {N}/{total} user-facing operations ({percentage}%)
**Power Core Score:** {score}

### Critical Path Map
{request} -> {layer1} ({Nms}) -> {layer2} ({Nms}) -> **{bottleneck}** ({Nms}) -> {layer3} ({Nms}) -> {response}

### Bottleneck Ranking
| Rank | Component | Est. Time | Downstream Ops | Power Core Score |
|------|-----------|-----------|----------------|-----------------|
| 1 | {name} | {N}ms | {N} | {score} |
| 2 | {name} | {N}ms | {N} | {score} |
| 3 | {name} | {N}ms | {N} | {score} |
```

If mode is `quick`, stop here. Display L1 results and exit.

---

## L2: Theoretical Minimum Calculation (Weight: 30%)

Read `references/theoretical-minimum-guide.md` for the full protocol.

### Summary

1. **Classify** -- Determine bottleneck type (DB, network, algorithm, I/O, serialization, memory)
2. **Calculate** -- Compute theoretical minimum for top 3 bottlenecks with documented assumptions
3. **Gap Rank** -- Rank by gap size (actual - theoretical), not absolute time
4. **Recoverability** -- Assess each gap: High (80-100%), Medium (40-79%), Low (0-39%)

### L2 Scoring

| Score | Meaning |
|-------|---------|
| 80-100 | Within 20% of theoretical minimum, near-optimal |
| 60-79 | 20-50% above theoretical, optimization worthwhile |
| 40-59 | 50-200% above theoretical, significant room |
| 0-39 | 200%+ above theoretical, critical |

### L2 Output

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

---

## L3: Gap Closure Optimization (Weight: 20%)

> Deep mode only. Runs as a parallel sub-agent after L1+L2 complete inline.

Take the bottlenecks identified in L1 and the gaps measured in L2, and produce concrete, implementable optimization recommendations that push performance toward the theoretical minimum. This is not "make it a bit faster" -- it is "close the gap between actual and theoretical by applying every known technique."

**Input:** L1 bottleneck ranking and L2 gap analysis (passed from inline L1+L2 results -- do NOT re-run L1 or L2).

### Step 1: Technique Selection

Read `references/optimization-techniques.md` for the full catalog.

For each bottleneck from L1/L2, select applicable optimization techniques by bottleneck type:

| Bottleneck Type | Primary Techniques |
|----------------|-------------------|
| Database query | Index optimization, query rewriting, materialized views, connection pooling, read replicas, query caching |
| Network/API call | Request batching, parallel fetching, response caching, connection keep-alive, payload compression |
| Algorithm/computation | Algorithm replacement (lower Big-O), memoization, lazy evaluation, parallelization, pre-computation |
| File I/O | Buffered I/O, memory-mapped files, async I/O, caching layer, streaming, compression |
| Serialization | Schema-based formats (protobuf, msgpack), streaming serialization, partial deserialization |
| Rendering/UI | Virtual scrolling, lazy loading, code splitting, render memoization, worker offloading |

For each bottleneck, list all techniques that could apply. Consult the catalog for applicability conditions -- only include a technique if the bottleneck matches its "Applicable when" criteria based on actual code inspection.

### Step 2: Impact Estimation

For each selected technique, estimate the performance improvement:

```markdown
### Technique: {name}
**Applies to:** {bottleneck name}
**Current:** {N}ms
**Estimated after:** {N}ms
**Gap closed:** {N}ms ({percentage}% of total gap)
**Effort:** {Low/Medium/High}
**Risk:** {Low/Medium/High} -- {what could go wrong}
**Implementation:** {2-3 sentence description of what to change}
```

Use the "Typical improvement" ranges from the catalog as a starting point, then adjust based on the specific codebase context. Be conservative -- estimate the low end of improvement ranges unless code inspection clearly supports a higher estimate.

### Step 3: Optimization Plan

Produce an ordered optimization plan. Order by: `gap_closed / effort` (maximize improvement per unit of work). Assign effort a numeric proxy: Low=1, Medium=3, High=9. Sort descending by `gap_closed_ms / effort_value`.

Group into tiers:

- **Tier 1 (Quick Wins):** Low effort, meaningful gap closure. Do these first. Typically: adding indexes, enabling caching, parallelizing independent calls, enabling compression.
- **Tier 2 (Targeted Improvements):** Medium effort, significant gap closure. Planned sprint work. Typically: query rewriting, algorithm replacement, connection pooling, code splitting.
- **Tier 3 (Deep Optimizations):** High effort, pushes toward theoretical limit. Strategic investment. Typically: architectural changes, denormalization, data structure redesign, pre-computation pipelines.

### Step 4: Cascading Benefit Analysis

After listing all techniques, compute the cascading impact. If each tier's optimizations are applied in order, recalculate the total critical path time and the percentage of user-facing operations that improve:

```markdown
### Cascading Impact
**Before optimization:** Total critical path = {N}ms
**After Tier 1:** {N}ms (improvement: {N}ms, {percentage}%)
**After Tier 1+2:** {N}ms (improvement: {N}ms, {percentage}%)
**After all tiers:** {N}ms (improvement: {N}ms, {percentage}%)
**Theoretical minimum:** {N}ms (remaining gap: {N}ms)
**User-facing operations improved:** {N}/{total} ({percentage}%)
```

When computing cascading impact, account for the fact that some techniques affect the same bottleneck (improvements do not simply add -- the second technique operates on the already-improved time).

### Step 5: Code-Level Recommendations

For the top 3 techniques (by gap_closed/effort), provide specific code-level guidance:

```markdown
### Recommendation {N}: {technique name}
**Target:** {bottleneck name} at {file:line}
**What to change:** {specific description of the code modification}
**Pseudocode/approach:**
{pseudocode or structured description -- not a full implementation, but enough to start coding}
**Tests to add/modify:** {what tests verify the optimization works and does not break existing behavior}
**Watch for:** {potential regressions in other areas, e.g., "increased memory usage from caching", "stale data risk"}
```

### L3 Scoring

| Score Range | Meaning |
|-------------|---------|
| 80-100 | Optimization plan can close 80%+ of the theoretical gap with known techniques |
| 60-79 | Can close 50-79% of gap -- some fundamental constraints remain |
| 40-59 | Can close 25-49% of gap -- significant architectural barriers |
| 0-39 | Less than 25% of gap closable -- requires fundamental redesign |

Compute the score based on: `(total_recoverable_gap / total_gap) * 100`, where `total_recoverable_gap` is the sum of estimated gap closure across all tiers.

### L3 Output Format

```markdown
## L3: Gap Closure Optimization Plan

### Optimization Summary
**Total gap:** {N}ms (across top {N} bottlenecks)
**Recoverable:** {N}ms ({percentage}%) with known techniques
**Optimization plan:** {N} techniques across {N} tiers

### Tier 1: Quick Wins
| # | Technique | Target | Gap Closed | Effort | Risk |
|---|-----------|--------|-----------|--------|------|
| 1 | {name} | {bottleneck} | {N}ms | Low | Low |

### Tier 2: Targeted Improvements
| # | Technique | Target | Gap Closed | Effort | Risk |
|---|-----------|--------|-----------|--------|------|

### Tier 3: Deep Optimizations
| # | Technique | Target | Gap Closed | Effort | Risk |
|---|-----------|--------|-----------|--------|------|

### Cascading Impact
{cascading benefit analysis from Step 4}

### Top Recommendations (Code-Level)
{detailed guidance for top 3 techniques from Step 5}
```

---

## L4: Regression Prevention (Weight: 15%)

> Deep mode only. Runs as a parallel sub-agent after L1+L2 complete inline.

Generate performance benchmarks that enforce the current (or optimized) baselines, so performance never silently degrades. Also produce a 9s reliability audit (estimated, not measured) and trend tracking across Performance Optimizer runs.

**Input:** L1 critical path data and L2 theoretical minimum data (passed from inline L1+L2 results -- do NOT re-run L1 or L2).

### Step 1: Benchmark Generation

Read `references/benchmark-patterns.md` for code templates.

For each bottleneck analyzed in L1/L2, generate a performance benchmark specification:

```markdown
### Benchmark: {bottleneck_name}

**What it tests:** {description of the operation being benchmarked}
**Baseline:** {current_time}ms (measured/estimated in L1)
**Target (after optimization):** {estimated_after}ms (from L3 if available, else current baseline)
**Failure threshold:** {target * 1.2}ms (20% tolerance above target)
**Framework:** {detected test framework or recommend one based on stack}
```

After the spec, provide a benchmark code template appropriate to the detected language/framework. Select the template from `references/benchmark-patterns.md`:

| Detected Stack | Template |
|---------------|----------|
| Node.js/TypeScript with vitest | vitest bench pattern |
| Node.js/TypeScript without vitest | Standalone timing pattern |
| Python with pytest | pytest-benchmark pattern |
| Python without pytest | Manual timing pattern |
| Go | testing.B pattern |
| Rust | criterion pattern |
| Other / mixed | Generic timing wrapper |

Fill in the template placeholders with actual values from L1/L2:
- Replace `{CURRENT_TIME}` with the L1 estimated time
- Replace `{TARGET_TIME}` with L3 estimated-after time (or current baseline if L3 not available)
- Replace `{bottleneck_name}` with the actual component name
- Add comments pointing to the specific file/function being benchmarked

These are starting points, not production-ready code. Include a note: "Fill in the actual function call and test data setup for your specific implementation."

### Step 2: Performance Test Suite Layout

Recommend where benchmark files should live and how they integrate with the existing test pipeline:

```markdown
### Benchmark Integration Plan

**Location:** {recommended directory based on project structure}
  - If `tests/` exists: `tests/benchmarks/` or `tests/__benchmarks__/`
  - If `__tests__/` exists: `__tests__/benchmarks/`
  - If no test directory: `benchmarks/` at project root

**Runner:** {recommended benchmark runner}
  - Node.js: `vitest bench` (preferred) or standalone `tsx` scripts
  - Python: `pytest --benchmark-only` (preferred) or standalone scripts
  - Go: `go test -bench=.`
  - Rust: `cargo bench`

**CI integration:**
  - Run benchmarks on PR: compare against main branch baseline
  - Run on schedule (weekly): track trends without blocking PRs
  - Store results as CI artifacts for trend analysis

**Failure behavior:**
  - PR benchmarks: Warn on regression > 10%, fail on regression > 20%
  - Scheduled benchmarks: Log results, alert on sustained regression across 3+ runs
  - Never fail builds on first-time regression (could be environmental noise)
```

### Step 3: 9s Reliability Audit (Estimated)

**IMPORTANT: This is an estimated analysis based on code inspection, NOT measured production data. All reliability figures are estimated based on error handling coverage, timeout configuration, and retry logic presence. Label clearly as "Estimated Reliability."**

Assess reliability of the critical path using the nines framework. This is about operation success rate, not uptime:

| Nines Level | Success Rate | Failures Per Million Ops | Meaning |
|-------------|-------------|------------------------|---------|
| 99% (2 nines) | 99.0% | 10,000 | Unreliable |
| 99.9% (3 nines) | 99.9% | 1,000 | Acceptable for internal tools |
| 99.99% (4 nines) | 99.99% | 100 | Production-grade |
| 99.999% (5 nines) | 99.999% | 10 | Mission-critical |

Analyze the critical path for failure modes by inspecting the code:

1. **Identify failure modes:** For each node on the critical path, identify what can cause the operation to fail:
   - Network timeout / connection refused
   - Database connection loss / query timeout
   - Out of memory / resource exhaustion
   - Race condition / deadlock
   - Unhandled exception / type error
   - External dependency unavailability

2. **Estimate failure frequency:** Based on code inspection:
   - Does the code have timeout configuration? (Missing timeout = higher failure rate)
   - Does the code have retry logic? (Missing retry = single-failure sensitivity)
   - Does the code have error handling / try-catch? (Missing = crash on first error)
   - Are connections pooled and health-checked? (Missing = connection rot)
   - Is there circuit breaker logic for external calls? (Missing = cascade failure risk)

3. **Estimate nines level:** Based on failure mode count and mitigation coverage:
   - 5+ nines: All failure modes identified AND mitigated (retries, timeouts, circuit breakers, fallbacks)
   - 4 nines: Most failure modes mitigated, minor gaps
   - 3 nines: Basic error handling exists, some missing retry/timeout/fallback
   - 2 nines: Minimal error handling, several unmitigated failure modes
   - <2 nines: No meaningful error handling on critical path

Output for each failure mode:

```markdown
| Failure Mode | Est. Frequency | Severity | Mitigation |
|-------------|---------------|----------|------------|
| {mode} | 1 in {N} ops | {High/Med/Low} | {Exists: description / Missing: what to add} |
```

### Step 4: Trend Tracking

Check for previous performance optimizer reports:

```bash
ls reports/performance-optimizer/po-*.md 2>/dev/null
```

**If 2+ reports exist:** Parse YAML frontmatter from each report and generate a trend dashboard:

```markdown
### Performance Trend
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta | Power Core |
|-----|------|----|----|----|-----|-----------|-------|------------|
| 001 | {date} | {N} | {N} | -- | -- | {N} | -- | {name} |
| **002** | **{date}** | **{N}** | **{N}** | **{N}** | **{N}** | **{N}** | **{+/-N}** | **{name}** |

**Trajectory:** {Improving|Declining|Stable} ({explanation})
```

Determine trend from the last 3+ runs:
- **Improving:** Composite score rising for 2+ consecutive runs
- **Declining:** Composite score falling for 2+ consecutive runs
- **Stable:** Composite within +/-3 points for 2+ runs
- **Insufficient data:** Fewer than 2 runs

Also analyze bottleneck persistence:
- **Same Power Core across runs:** Persistent bottleneck -- previous optimization attempts may not have addressed it, or it is a fundamental constraint
- **Different Power Core:** Previous bottleneck was resolved, new one emerged -- this is healthy progression
- **Power Core oscillating:** Multiple bottlenecks competing for dominance -- may indicate load-dependent behavior

**If fewer than 2 reports exist:**

```markdown
### Trend Dashboard
First run -- trend data will appear after the next analysis.
```

### L4 Scoring

| Score Range | Meaning |
|-------------|---------|
| 80-100 | Comprehensive benchmarks for all bottlenecks, 4+ nines estimated reliability, positive trend (or strong first run) |
| 60-79 | Good benchmarks for top bottlenecks, 3+ nines, stable trend |
| 40-59 | Partial benchmarks, 2-3 nines, declining or insufficient trend data |
| 0-39 | No benchmarks possible, < 2 nines estimated, or severe regression detected |

Compute score as: `(benchmark_coverage * 0.40) + (nines_score * 0.35) + (trend_score * 0.25)`

Where:
- `benchmark_coverage`: percentage of analyzed bottlenecks with benchmark specs (0-100)
- `nines_score`: 2 nines=30, 3 nines=60, 4 nines=85, 5 nines=100
- `trend_score`: Improving=100, Stable=75, First run=60, Insufficient=50, Declining=25

### L4 Output Format

```markdown
## L4: Regression Prevention

### Performance Benchmarks
{benchmark specs and code templates for each analyzed bottleneck}

### Benchmark Integration Plan
**Location:** {directory}
**Runner:** {tool/command}
**CI integration:** {how to add to pipeline}
**Failure behavior:** {fail/warn thresholds}

### 9s Reliability Audit (Estimated)
**Critical path estimated reliability:** {N} nines ({N.NNN}%)
**Failure modes identified:** {count}
**Note:** Reliability is estimated from code inspection, not production metrics.

| Failure Mode | Est. Frequency | Severity | Mitigation |
|-------------|---------------|----------|------------|
| {mode} | 1 in {N} ops | {High/Med/Low} | {Exists/Missing: description} |

**Recommendations to improve reliability:**
1. {specific recommendation}
2. {specific recommendation}

### Trend Dashboard
{trend table if 2+ reports exist}
{or: "First run -- trend data will appear after the next analysis."}
```

---

## Composite Scoring

```
composite = (L1 x 0.35) + (L2 x 0.30) + (L3 x 0.20) + (L4 x 0.15)
```

If a layer is N/A, redistribute its weight equally among available layers:
- Quick mode (L1 only): L1 gets 100% weight
- Default mode (L1+L2): L1 gets 54% (0.35 + 0.35/2), L2 gets 46% (0.30 + 0.35/2)
- Deep mode (all layers): Full weights apply -- L1=35%, L2=30%, L3=20%, L4=15%

Score interpretation:
- 80-100: Excellent -- performance is near-optimal
- 60-79: Good -- moderate optimization opportunities
- 40-59: Fair -- significant bottlenecks, action recommended
- 0-39: Critical -- severe performance issues, immediate action needed

---

## Report Generation

Skip for `quick` mode. For default and deep modes:

### 1. Determine Report Number

```bash
# Glob existing reports in workspace
ls reports/performance-optimizer/po-*.md 2>/dev/null
# Extract highest NNN, increment by 1
# If no reports exist, start at 001
```

### 2. Create Report Directory

```bash
mkdir -p reports/performance-optimizer
```

### 3. Write Report

**Description slug generation for po- reports:**
- Derive from the bottleneck target or module analyzed:
  - E.g., analyzing `fetchUser` endpoint -> `"fetch-user-bottleneck"`
  - Analyzing "the whole app" -> `"full-app-analysis"`
  - Deep mode on specific target -> target name slugified
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

Save to `reports/performance-optimizer/po-NNN-YYYY-MM-DD-{slug}.md`

#### YAML Frontmatter

```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{quick|default|deep}"
target: "{what was analyzed}"
layer_1_score: {N}
layer_2_score: {N_or_NA}
layer_3_score: {N_or_NA}
layer_4_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
power_core: "{name of identified bottleneck}"
theoretical_gap_percent: {N_or_NA}
---
```

#### Report Body

1. Opening quote and mode/target summary
2. L1: Critical Path Analysis (always present)
3. L2: Theoretical Minimum Analysis (default + deep modes)
4. L3: Gap Closure Recommendations (deep mode only)
5. L4: Regression Prevention Plan (deep mode only)
6. Composite Score summary
7. Trend Dashboard (if 2+ reports exist for this target)

### 4. Trend Dashboard

If 2+ reports exist, include:

```markdown
### Score Trend
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
| 001 | {date} | {N} | {N} | -- | -- | {N} | -- |
| **002** | **{date}** | **{N}** | **{N}** | **--** | **--** | **{N}** | **{+/-N}** |

Trajectory: {Improving|Declining|Stable} ({explanation})
```

Determine trend from last 3+ runs:
- **Improving**: composite rising for 2+ consecutive runs
- **Declining**: composite falling for 2+ consecutive runs
- **Stable**: composite within +/-3 points for 2+ runs
- **Insufficient data**: fewer than 2 runs

---

## Memory Integration

After completing analysis, store key findings:

```
cortex_remember: Performance analysis of {target}
- Power core: {bottleneck name} at {location}
- Power Core Score: {score}
- Theoretical gap: {N}% above minimum
- Recoverability: {High/Med/Low}
- Composite score: {N}/100
Tags: ["performance-optimizer", "{target}"]
```

Before running, check for prior analysis:
```
cortex_recall: "performance-optimizer {target}"
```
Reference previous findings to track progress across sessions.
