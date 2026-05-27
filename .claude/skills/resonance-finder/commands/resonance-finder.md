# Resonance Finder

> *"If you want to find the secrets of the universe, think in terms of energy, frequency, and vibration."* — Nikola Tesla

---

## Step 0: Argument Routing

Parse the argument provided by the user to determine the execution mode.

| Argument | Mode | Action |
|----------|------|--------|
| *(none)* | Default | Run L1 + L2, save report |
| `quick` | Quick | Run L1 only, no report |
| `deep` | Deep | Run L1-L4, save report, spawn sub-agents for L3 + L4 |
| `scan` | Scan | Run L1 only, save report |
| `tune <parameter>` | Tune | Run L1 (verify param exists), then L2 + L3 for that parameter, no report |

Set the following based on mode:

```
Mode: [quick | default | deep | scan | tune]
Layers: [list of layers to execute]
Save Report: [yes | no]
Use Sub-Agents: [yes (L3, L4) | no]
Target Parameter: [name, if tune mode | null]
```

Identify the project name from the current working directory (use the directory name).

---

## Step 1: L1 -- Parameter Inventory

**Applies to: ALL modes**

Read `references/parameter-inventory-guide.md` and execute the full L1 parameter inventory protocol.

### Protocol Summary

1. Scan all 6 parameter source categories in order:
   - Environment files (`.env`, `.env.*`, `docker-compose*.yml` env sections)
   - Config files (`config/`, `settings/`, `*.config.js/ts/json`, `*.yml/yaml/toml/ini`)
   - Package metadata (`package.json`, `pyproject.toml`, `Cargo.toml`)
   - Framework config (`next.config.*`, `webpack.config.*`, `vite.config.*`, `tsconfig.json`)
   - Infrastructure (`Dockerfile`, `docker-compose*.yml` resource limits, Terraform/Pulumi)
   - Application code (grep for hardcoded constants: `timeout`, `limit`, `max`, `pool`, `batch`, `retry`, `ttl`, `buffer`, `workers`, `threshold`, `interval`, `capacity`, `size`, `count`, `min`, `concurrency`)

2. For each parameter found, record:
   - `#`: Sequential number
   - `Parameter`: Name or identifier
   - `Value`: Current value
   - `Source`: File where found
   - `Type`: Data type (int, float, string, boolean, duration)
   - `Category`: Performance | Reliability | Resource | Behavior
   - `Notes`: Context (e.g., "framework default", "hardcoded", "overrides .env")

3. Flag undocumented hardcoded constants separately.

4. Compute L1 score using the rubric in the reference file:
   - Source coverage (0-30): 5 pts per source category scanned
   - Parameter count (0-25): based on total parameters found
   - Categorization (0-25): completeness of category + type + notes
   - Undocumented defaults (0-20): identification of hardcoded constants

### L1 Output

Present the Parameter Inventory Table:

```markdown
### L1: Parameter Inventory

**Sources scanned:** [N/6]
**Parameters found:** [N]
**Undocumented defaults flagged:** [N]

| # | Parameter | Value | Source | Type | Category | Notes |
|---|-----------|-------|--------|------|----------|-------|
```

**L1 Score: [N]/100**

If mode is `quick`: Display the inventory table and L1 score. Stop here. Do not save a report.

If mode is `scan`: Continue to Step 6 (skip L2-L5, save report with L1 only).

---

## Step 2: L2 -- Sensitivity Ranking

**Applies to: default, deep, tune modes**

Read `references/sensitivity-analysis-guide.md` and execute the full L2 sensitivity ranking protocol.

### Protocol Summary

For each parameter from the L1 inventory (or for the single target parameter in tune mode):

1. **Dependency chain analysis**: Count direct consumers and indirect dependents.
   - Sensitivity contribution = direct_consumers x 2 + indirect_dependents

2. **Call-frequency weighting**: Classify the parameter's usage context.
   - Per-request: weight x 3
   - Per-session: weight x 2
   - Per-startup: weight x 1
   - Per-deployment: weight x 0.5

3. **Resource-constraint proximity**: Estimate utilization relative to limits.
   - High utilization (>70%): sensitivity x 2
   - Medium utilization (30-70%): sensitivity x 1
   - Low utilization (<30%): sensitivity x 0.5

4. **Failure mode analysis**: Assess impact of incorrect values.
   - Catastrophic (crash, data loss): sensitivity x 3
   - Degraded (timeout, slowdown): sensitivity x 2
   - Minor (cosmetic, logging): sensitivity x 1

5. Compute composite sensitivity score for each parameter.

6. Classify parameters:
   - **HIGH**: Top 20% of scored parameters
   - **MEDIUM**: Middle 40%
   - **LOW**: Bottom 40%

7. For HIGH sensitivity parameters, document current risk assessment.

8. Compute L2 score using the rubric in the reference file:
   - Coverage (0-30): percentage of L1 params ranked
   - Evidence (0-30): specific dependency counts, call frequency, failure mode cited
   - Classification (0-20): clear HIGH/MEDIUM/LOW with threshold justification
   - Risk identification (0-20): current risk noted for HIGH sensitivity params

### L2 Output

Present the Sensitivity Ranking Table:

```markdown
### L2: Sensitivity Ranking

**Parameters ranked:** [N]/[total from L1]
**HIGH sensitivity:** [N]
**MEDIUM sensitivity:** [N]
**LOW sensitivity:** [N]

| Rank | Parameter | Sensitivity | Classification | Key Factor | Current Risk |
|------|-----------|-------------|---------------|------------|-------------|
```

**L2 Score: [N]/100**

---

## Step 3: L3 -- Optimal Value Determination

**Applies to: deep, tune modes**

Read `references/optimization-formulas.md` and execute the L3 protocol.

### Deep Mode Execution

In deep mode, spawn L3 as a Task sub-agent (parallel with L4):

**Task: L3 - Optimal Value Determination**
- subagent_type: "general-purpose"
- prompt: Read `references/optimization-formulas.md`. Using the L1 parameter inventory and L2 sensitivity ranking provided below, calculate optimal values for all HIGH-sensitivity parameters (or top 3 MEDIUM if no HIGH exist). For each parameter, apply optimization methods in priority order: (1) Theoretical Bounds, (2) Best Practice Lookup, (3) Empirical Pattern Analysis. Return the full recommendation table with columns: #, Parameter, Current, Recommended, Confidence, Method, Expected Impact, Reasoning. Also return the L3 score (0-100) computed from the 4-criterion rubric (coverage, method quality, confidence calibration, impact estimation).

Provide the sub-agent with:
- The full L1 parameter inventory table
- The full L2 sensitivity ranking table (with classifications)
- The project's technology stack (detected from L1 source scan)

### Tune Mode Execution

In tune mode, execute L3 inline for the single target parameter only:

1. Verify the target parameter exists in the L1 inventory. If not found, output: "Parameter `{name}` not found in inventory. Run `/resonance-finder` first to build the parameter inventory." and stop.
2. Read `references/optimization-formulas.md`
3. Apply the optimization methods to the single target parameter:
   - Try Method 1 (Theoretical Bounds) first
   - Fall back to Method 2 (Best Practice Lookup) if no formula applies
   - Fall back to Method 3 (Empirical Pattern Analysis) as last resort
4. Output the recommendation directly (no report saved)

**Tune mode weight redistribution:** L2 = 55%, L3 = 45%

### L3 Output

```markdown
### L3: Optimal Value Determination

**Parameters analyzed:** [N] (HIGH-sensitivity from L2)
**Recommendations generated:** [N]
**Methods used:** [Theoretical: N, Best Practice: N, Empirical: N]

| # | Parameter | Current | Recommended | Confidence | Method | Expected Impact | Reasoning |
|---|-----------|---------|-------------|-----------|--------|----------------|-----------|
```

**L3 Score: [N]/100**

### L3 Edge Cases

- **No HIGH-sensitivity parameters:** Apply L3 to top 3 MEDIUM-sensitivity parameters. Note in output: "No HIGH-sensitivity parameters found. Analyzing top 3 MEDIUM parameters."
- **Conflicting optimization:** When a recommendation conflicts with a system constraint (memory, CPU, license), provide a constrained recommendation and flag the conflict. Include both the unconstrained optimal and the constrained practical value.
- **Current value already optimal:** Record with Recommended = "Current OK" and explain why the current value is appropriate.

---

## Step 4: L4 -- Harmonic Analysis

**Applies to: deep mode only**

Read `references/harmonic-analysis-guide.md` and execute the L4 protocol.

### Deep Mode Execution

Spawn L4 as a Task sub-agent (parallel with L3):

**Task: L4 - Harmonic Analysis**
- subagent_type: "general-purpose"
- prompt: Read `references/harmonic-analysis-guide.md`. Using the L1 parameter inventory and L2 sensitivity ranking provided below, execute the full 5-step harmonic analysis protocol: (1) Identify coupled parameter pairs using the 5 coupling types, (2) Build the interaction graph with direction, interaction type, and status, (3) Form harmonic groups from coupled parameters, (4) Detect anti-patterns (timeout inversion, pool starvation, buffer overflow chain, cache thrashing, rate limit bypass), (5) Calculate resonance points per harmonic group. Return: coupled pairs table, interaction graph, harmonic groups, anti-patterns detected, resonance points, Mermaid interaction diagram, and L4 score (0-100) computed from the 5-criterion rubric.

Provide the sub-agent with:
- The full L1 parameter inventory table
- The full L2 sensitivity ranking table (with classifications)
- L3 recommendations (if L3 sub-agent has completed; otherwise note L3 pending)

### L4 Output

```markdown
### L4: Harmonic Analysis

**Coupled parameter pairs found:** [N]
**Harmonic groups formed:** [N]
**Anti-patterns detected:** [N]
**Resonance points identified:** [N]

#### Coupled Parameter Pairs
| # | Param A | Param B | Coupling Type | Detection Basis |
|---|---------|---------|---------------|-----------------|

#### Parameter Interactions
| Param A | Param B | Coupling | Direction | Interaction | Status |
|---------|---------|----------|-----------|-------------|--------|

#### Harmonic Groups
[Group descriptions with members, couplings, constraints, current state]

#### Anti-Patterns Detected
| # | Anti-Pattern | Parameters | Current Values | Severity | Impact | Fix |
|---|-------------|------------|----------------|----------|--------|-----|

#### Resonance Points
[Per-group resonance analysis with current state, resonant state, expected improvement, tuning order]

#### Parameter Interaction Diagram
[Mermaid flowchart]
```

**L4 Score: [N]/100**

### L4 Edge Cases

- **Single parameter in project:** Return "No interactions possible -- single parameter cannot form pairs." L4 score = N/A.
- **All parameters independent:** Return "No harmonic groups -- all parameters can be tuned independently." L4 score = 80.

---

## Step 5: Tuning Config Generation

**Applies to: deep mode only (after L3 and L4 complete)**

After both L3 and L4 sub-agents return their results, generate a tuning configuration file.

### Tuning Config File

**Directory:** `reports/resonance-finder/`
**Filename:** `tuning-config-NNN.md` (same NNN as the report number)

**Content:**

```markdown
# Resonance Finder -- Tuning Configuration
# Generated: YYYY-MM-DD | Report: rf-NNN
# Project: {project-name}

## Recommended Values

| Parameter | Current | Recommended | Confidence | Harmonic Group |
|-----------|---------|-------------|-----------|----------------|
[All L3 recommendations, with harmonic group from L4 added as a column]
[Parameters not in any group: Harmonic Group = "Independent"]

## Tuning Order (respect harmonic groups)

[Numbered list of tuning steps, grouped by harmonic group]
1. Tune Group "{name}" together: [param1] -> [value1], [param2] -> [value2], ...
2. Tune Group "{name}" together: [param1] -> [value1], ...
3. Tune independent params individually (no coupling risk)

**Important:** Change all parameters within a harmonic group in a single deployment.
Changing one without the others may create transient conflicts.

## Resonance Test Plan

For each recommended change:
1. **Baseline:** Measure current performance metrics (latency P50/P95/P99, throughput, error rate, resource utilization)
2. **Apply change:** One harmonic group at a time
3. **Measure:** Same metrics as baseline, under equivalent load
4. **Compare:** Calculate delta for each metric
5. **Rollback criteria:** Revert if degradation > 10% on any metric
6. **Stabilize:** Wait for at least 2 full load cycles before proceeding to next group

### Metrics to Track

| Metric | Baseline | After Group 1 | After Group 2 | After Independent |
|--------|----------|---------------|---------------|-------------------|
| Latency P50 | | | | |
| Latency P95 | | | | |
| Latency P99 | | | | |
| Throughput (RPS) | | | | |
| Error rate (%) | | | | |
| CPU utilization | | | | |
| Memory utilization | | | | |
| DB connection usage | | | | |
```

Save this file to `reports/resonance-finder/tuning-config-NNN.md`.

---

## Step 6: Composite Scoring & Report

### Composite Score Calculation

Apply weights based on which layers executed:

| Mode | L1 Weight | L2 Weight | L3 Weight | L4 Weight |
|------|-----------|-----------|-----------|-----------|
| Quick | 100% | -- | -- | -- |
| Default | 50% | 50% | -- | -- |
| Scan | 100% | -- | -- | -- |
| Deep (all layers) | 30% | 30% | 25% | 15% |
| Deep (L3/L4 = N/A) | 50% | 50% | -- | -- |
| Tune | -- | 55% | 45% | -- |
| Tune (L3 = N/A) | -- | 100% | -- | -- |

```
composite_score = sum(layer_score * layer_weight for each active layer)
```

### Score Interpretation

- 80-100: Excellent -- parameters well-understood and tuned
- 60-79: Good -- most parameters identified, key sensitivities known
- 40-59: Fair -- gaps in parameter coverage or sensitivity analysis
- 0-39: Critical -- major parameters missing or unanalyzed

### Report Generation

**Skip report if:** mode is `quick` or `tune`.

**Report directory:** `reports/resonance-finder/`

**Report numbering:**
1. Glob for existing reports: `reports/resonance-finder/rf-*.md`
2. Extract NNN from filenames
3. Next number = max(existing) + 1, zero-padded to 3 digits
4. **Description slug generation for rf- reports:**
   - Derive from the config/parameter being tuned or scan scope:
     - E.g., tuning database pool size -> `"db-pool-tuning"`
     - Full parameter scan -> `"full-param-scan"`
     - Deep mode -> `"deep-harmonic-analysis"`
   - Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`
5. Filename: `rf-NNN-YYYY-MM-DD-{slug}.md`

If the report directory does not exist, create it.

**YAML Frontmatter:**

```yaml
---
report_number: NNN
date: "YYYY-MM-DD"
mode: "default|scan|deep"
project: "project-name"
parameters_found: N
high_sensitivity: N
medium_sensitivity: N
low_sensitivity: N
layer_1_score: N
layer_2_score: N_or_NA
layer_3_score: N_or_NA
layer_4_score: N_or_NA
composite_score: N
previous_composite: N_or_null
score_delta: "+/-N_or_dash"
trend: "improving|declining|stable|first_run|insufficient_data"
---
```

**Report Body:**

1. Header with opening Tesla quote
2. Executive summary: one paragraph summarizing total parameters found, top 3 high-sensitivity parameters, key risks
3. **Section 1: L1 Parameter Inventory** -- Full inventory table (from Step 1 output)
4. **Section 2: L2 Sensitivity Ranking** -- Ranking table with classifications (from Step 2 output, if applicable)
5. **Section 3: Recommended Values** (L3, deep mode only) -- Full recommendation table with all HIGH-sensitivity params, method used, confidence levels with justification, expected impact with quantitative reasoning
6. **Section 4: Harmonic Analysis** (L4, deep mode only) -- Parameter interaction table, harmonic groups with resonance points, anti-patterns detected, parameter interaction diagram (Mermaid flowchart showing coupling relationships)
7. **Section 5: Composite Score** -- Breakdown showing each layer's score and weight
8. **Section 6: Tuning Config Reference** (deep mode only) -- Link to generated `tuning-config-NNN.md` file, tuning order summary (respect harmonic groups), resonance test plan summary
9. **Section 7: Trend Dashboard** (if 2+ prior reports exist in the reports directory)

### Trend Dashboard

If 2+ prior reports exist, read their YAML frontmatter and build a trend table:

```markdown
### Score Trend

| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
```

Trajectory assessment:
- **Improving**: 2+ consecutive runs with rising composite
- **Declining**: 2+ consecutive runs with falling composite
- **Stable**: Composite within +/- 2 points across last 3 runs
- **First run**: Only one report exists
- **Insufficient data**: Cannot determine trend

### Final Output

Display the composite score and (if saved) the report file path:

```
Resonance Finder -- [Mode] Mode Complete

Composite Score: [N]/100 ([interpretation])
Report saved: [path] (or "No report saved" for quick/tune modes)
Tuning config: [path] (deep mode only, omit for other modes)
```
