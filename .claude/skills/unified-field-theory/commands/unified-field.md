---
description: "Analyze codebase for redundant systems solving the same problem. Find unification opportunities."
argument-hint: "[quick | deep | compare] [target-path]"
allowed-tools: Bash, Read, Grep, Glob, Task, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_recall
---

# /unified-field Command

Analyze a codebase for systems solving the same problem in different ways. Catalogs modules, maps abstract functions, and highlights unification opportunities.

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for mode and optional target path:

```
mode = "default"
target = null

words = $ARGUMENTS.split()
if words[0] in ["quick", "deep", "compare"]:
    mode = words[0]
    target = words[1:] joined, if any
else:
    target = $ARGUMENTS, if any

if target is empty: target = project root (cwd or detected root)
```

### Mode Routing

- **quick**: Run L1 only. Display inventory table. Do NOT save report.
- **default** (no mode arg): Run L1 + L2. Save numbered report.
- **deep**: Run L1 + L2 + L3 + L4 (full analysis). L3 and L4 run SEQUENTIALLY (L4 depends on L3 output). Save numbered report.
- **compare**: Read previous reports from `reports/unified-field/uft-*.md`. Require 2+ reports. Build trend dashboard showing per-layer and composite score changes across runs. Save comparison report.

## Step 1: Context Check

Before analysis, check Cortex for previous runs:

```
cortex_recall: "unified-field {target_path}"
```

If previous results exist, note them for comparison in the report.

---

## L1 Protocol -- System Inventory

### Step 1.1: Scope Determination

- If target path provided, scope to that directory
- Otherwise, scan from project root
- Identify project type by checking for:
  - `package.json` (Node.js / monorepo with workspaces)
  - `setup.py` / `pyproject.toml` (Python)
  - `go.mod` (Go)
  - `Cargo.toml` (Rust)
  - `pom.xml` / `build.gradle` (Java)
  - Multiple of the above (polyglot / monorepo)

### Step 1.2: Module Discovery

Glob for structural indicators:

```
Glob: {target}/**/package.json
Glob: {target}/**/setup.py
Glob: {target}/**/pyproject.toml
Glob: {target}/**/go.mod
Glob: {target}/**/Cargo.toml
Glob: {target}/**/pom.xml
```

Scan directory structure for logical module boundaries:
- `src/modules/`, `src/services/`, `src/lib/`, `src/utils/`
- `lib/`, `services/`, `packages/`, `apps/`
- `cmd/`, `internal/`, `pkg/` (Go conventions)
- `crates/` (Rust workspaces)

Read key entry points and index files (`index.ts`, `__init__.py`, `main.go`, `mod.rs`, `App.java`) to understand module exports.

### Step 1.3: System Cataloging

For each discovered module/system, record:

| Field | Description |
|-------|-------------|
| **Name** | Module or directory name |
| **Type** | Library, service, utility, middleware, component, plugin, CLI tool |
| **Primary Function** | One-line description of what it does |
| **Technology** | Language, framework, key dependencies |
| **Size** | Approximate file count and LOC (use `find | wc` or glob + read) |
| **Connections** | What other modules it imports from or exports to |

Output as a markdown table:

```markdown
## L1: System Inventory

| # | System | Type | Primary Function | Tech | Files/LOC | Key Connections |
|---|--------|------|-----------------|------|-----------|-----------------|
| 1 | {name} | {type} | {function} | {tech} | {files}/{loc} | {connections} |
```

### Step 1.4: L1 Scoring

Base score starts at **100**. Apply deductions:

| Condition | Deduction | Rationale |
|-----------|-----------|-----------|
| Multiple modules with similar names | -5 each | Naming overlap suggests functional overlap |
| Modules with overlapping imports | -3 each | Shared dependencies may indicate shared concerns |
| Utility/helper modules with broad, unfocused exports | -5 each | "junk drawer" modules signal unclear boundaries |
| Modules larger than 2x the project average size | -3 each | Oversized modules often absorb multiple responsibilities |

Minimum score: 0. Compute using actual counts, not LLM estimation.

```
L1 Score = max(0, 100 - deductions)
```

The L1 score represents **structural clarity** -- how well-organized and non-redundant the module structure appears at a glance.

**If mode is `quick`**: Display the inventory table, the L1 score with deduction breakdown, and stop. Do NOT save a report.

---

## L2 Protocol -- Abstract Function Mapping

### Step 2.1: Load Function Taxonomy

Read the function taxonomy from `references/function-taxonomy.md`. This provides 14 standard abstract function categories with code signals for identification.

The taxonomy is a starting vocabulary, not a closed set. Add project-specific categories when code does not fit the standard 14.

### Step 2.2: Map Systems to Functions

For each system cataloged in L1:

1. Read representative files: entry points, main exports, key classes/functions
2. Identify the abstract function(s) the system performs
3. Match against taxonomy categories using code signals (function names, imports, patterns)
4. Record: `system_name -> [list of abstract function categories]`

Use Grep to scan for taxonomy code signals across each module:

```
Grep: pattern="validate|check|assert|schema|zod|joi" path="{module_path}"
Grep: pattern="auth|login|token|jwt|session" path="{module_path}"
Grep: pattern="log|logger|winston|pino|trace" path="{module_path}"
... (repeat for each taxonomy category)
```

### Step 2.3: Build Function Map

Create a matrix: rows = systems, columns = abstract function categories.

```markdown
## L2: Abstract Function Map

| System | Validation | Auth | AuthZ | State | Errors | Logging | Data | Transform | API | Cache | Config | Schedule | Notify | Render | Custom... |
|--------|-----------|------|-------|-------|--------|---------|------|-----------|-----|-------|--------|----------|--------|--------|-----------|
| {sys1} | X | | | X | | | | X | | | | | | | |
| {sys2} | X | | | | | | | | X | | | | | | |
```

Highlight cells that indicate potential issues:
- Any **column with 2+ marks**: potential overlap (same function served by multiple systems)
- Any **row with 3+ marks**: overloaded system (doing too much)

### Step 2.4: L2 Scoring

Base score starts at **100**. Apply deductions:

| Condition | Deduction | Rationale |
|-----------|-----------|-----------|
| Abstract function served by 2+ systems | -10 per overlap | Core signal: redundant implementations |
| System serving 3+ abstract functions | -5 per overloaded system | Violates single-responsibility |
| Function with no clear owner (scattered across 3+ modules) | -8 each | Responsibility fragmentation |

Minimum score: 0.

```
L2 Score = max(0, 100 - deductions)
```

The L2 score represents **function clarity** -- how cleanly responsibilities are separated across the codebase.

### Step 2.5: Overlap Highlights

List all detected overlaps explicitly. These become the input for L3 (Overlap Detection) in deep mode.

```markdown
## Overlap Candidates (L3 Input)

| # | Function Category | Systems Involved | Severity |
|---|-------------------|-----------------|----------|
| 1 | {category} | {sys_a}, {sys_b} | {high/medium/low} |
```

Severity:
- **High**: 3+ systems serve the same function
- **Medium**: 2 systems serve the same function with different implementations
- **Low**: 2 systems touch the same function but in clearly different contexts

---

## Step 3: Compute Composite Score

### Deep Mode (L1 + L2 + L3 + L4)

All four layers at defined weights:

```
composite = (L1_score x 0.25) + (L2_score x 0.25) + (L3_score x 0.30) + (L4_score x 0.20)
```

### Default Mode (L1 + L2)

With only L1/L2 active, redistribute weights:

```
composite = (L1_score x 0.50) + (L2_score x 0.50)
```

### Quick Mode (L1 only)

```
composite = L1_score x 1.00
```

### Score Interpretation (INVERTED -- high = good)

| Range | Interpretation |
|-------|---------------|
| 80-100 | Minimal redundancy, well-unified codebase |
| 60-79 | Some overlaps detected, unification opportunities exist |
| 40-59 | Significant duplication, multiple unification candidates |
| 0-39 | Critical redundancy, high unification potential |

---

## Step 4: Generate Report (default mode only)

### Step 4.1: Determine Report Number

```bash
# Find existing reports and determine next number
existing=$(ls reports/unified-field/uft-*.md 2>/dev/null | sort -V | tail -1)
if [ -z "$existing" ]; then
  next_num="001"
else
  last_num=$(echo "$existing" | grep -oP 'uft-\K\d+')
  next_num=$(printf "%03d" $((10#$last_num + 1)))
fi
```

Create directory if needed:
```bash
mkdir -p reports/unified-field
```

**Description slug generation for uft- reports:**
- Derive from the unification target or project scope:
  - E.g., scanning full project -> `"full-scan"`
  - Targeted at auth modules -> `"auth-modules-unification"`
  - Deep mode -> `"deep-analysis"`
  - Compare mode -> `"comparison-run"`
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

### Step 4.2: Write Report

Save to `reports/unified-field/uft-{NNN}-{YYYY-MM-DD}-{slug}.md`:

```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{mode}"
target: "{project path or scope}"
systems_cataloged: {count}
functions_mapped: {count}
overlaps_detected: {count_or_NA}
unifications_proposed: {count_or_NA}
l1_score: {N}
l2_score: {N_or_NA}
l3_score: {N_or_NA}
l4_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Unified Field Theory Report #{NNN}

**Date**: {YYYY-MM-DD}
**Mode**: {mode}
**Target**: {target}
**Composite Score**: {composite}/100 ({interpretation})

---

## L1: System Inventory (Score: {l1_score}/100)

{inventory table from Step 1.3}

### L1 Deductions
{itemized deduction list}

---

## L2: Abstract Function Map (Score: {l2_score}/100)

{function map matrix from Step 2.3}

### Overlap Candidates
{overlap table from Step 2.5}

### L2 Deductions
{itemized deduction list}

---

## Composite Score Breakdown

### Default Mode (L1 + L2)

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: System Inventory | {l1}/100 | 50% | {weighted_l1} |
| L2: Function Mapping | {l2}/100 | 50% | {weighted_l2} |
| L3: Overlap Detection | N/A | -- | -- |
| L4: Unification Proposals | N/A | -- | -- |
| **Composite** | | | **{composite}/100** |

### Deep Mode (L1 + L2 + L3 + L4)

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: System Inventory | {l1}/100 | 25% | {weighted_l1} |
| L2: Function Mapping | {l2}/100 | 25% | {weighted_l2} |
| L3: Overlap Detection | {l3}/100 | 30% | {weighted_l3} |
| L4: Unification Proposals | {l4}/100 | 20% | {weighted_l4} |
| **Composite** | | | **{composite}/100** |

---

## Recommendations

{Top 3 actionable recommendations based on overlaps and overloaded systems}

---

## Score Trend

{If previous report exists: comparison table. Otherwise: "First run -- no comparison data."}
```

### Step 4.3: Store in Cortex

After saving the report:

```
cortex_remember:
  content: "Unified Field Theory run #{NNN} on {target}: composite {composite}/100. {systems_cataloged} systems cataloged, {functions_mapped} functions mapped. {overlap_count} overlap candidates detected. Mode: {mode}."
  tags: ["unified-field-theory", "report", "architecture"]
  importance: 70
```

### Step 4.4: Display Results

Output the full report content to the user. End with the report file path.

---

---

## L3 Protocol -- Overlap Detection

**Runs in:** Deep mode only.
**Input:** L2 function map with overlap highlights from Step 2.5.
**Weight:** 30% of composite score.
**Execution:** Spawned as a Task sub-agent. Runs BEFORE L4 (L4 depends on L3 output).

### Step 3.1: Overlap Pair Extraction

From the L2 function map, extract every pair of systems that share at least one abstract function category.

For each pair, record:

| Field | Description |
|-------|-------------|
| **System A** | First system in the overlap pair |
| **System B** | Second system in the overlap pair |
| **Shared Categories** | Abstract function categories both systems perform |
| **Non-Shared Categories** | Categories unique to each system |

Example output:
```markdown
### Overlap Pairs

| # | System A | System B | Shared Functions | Unique to A | Unique to B |
|---|----------|----------|-----------------|-------------|-------------|
| 1 | Auth Middleware | Form Validator | Validation | Auth | Rendering |
| 2 | Redux Store | Context Provider | State Mgmt | Cache | Config |
```

### Step 3.2: Deep Comparison

For each overlap pair, read both systems' code to compare HOW they solve the shared problem. Focus on:
- Input/output signatures
- Core algorithm or approach
- Edge case handling
- Consumer patterns (who calls each system)

Classify each overlap:

| Classification | Definition | Signal |
|----------------|-----------|--------|
| **Full Duplication** | Both systems solve the exact same problem the same way | >80% similar logic, same inputs/outputs, one could replace the other |
| **Partial Overlap** | Shared core with divergent specializations | 40-80% similar, different edge cases or consumers |
| **Conceptual Similarity** | Same abstract function but genuinely different implementations for different contexts | <40% similar, shared category but different problem domains |
| **False Positive** | L2 flagged overlap but deeper analysis reveals distinct purposes | Different inputs, outputs, or problem domains despite shared vocabulary |

For each pair, provide:
- **Evidence**: Specific code patterns, function signatures, or logic that supports the classification
- **Similarity estimate**: Rough percentage based on shared logic, interfaces, and behavior
- **Impact**: How much codebase is affected by this overlap

### Step 3.3: Overlap Map (Mermaid)

Generate a Mermaid diagram showing all systems as nodes and overlaps as edges.

**Node rules:**
- Each system from the overlap pairs becomes a node
- Node labels should be concise (abbreviate if needed)
- If >20 systems, group related systems into Mermaid subgraphs/clusters

**Edge rules by classification:**
- **Full Duplication**: Solid thick line, red. Format: `A ---|"shared fn"| B`
- **Partial Overlap**: Dashed line, orange/yellow. Format: `A -.-|"shared fn"| B`
- **Conceptual Similarity**: Dotted thin line, gray. Format: `A -.-|"shared fn"| B`
- **False Positive**: Omit from diagram (logged in table only)

**Styling:**
```
graph LR
    A[System A] ---|"validation"| B[System B]
    C[System C] -.-|"state mgmt"| D[System D]

    linkStyle 0 stroke:red,stroke-width:3px
    linkStyle 1 stroke:#cc0,stroke-width:2px,stroke-dasharray:5
    linkStyle 2 stroke:gray,stroke-width:1px,stroke-dasharray:3
```

Color key to include above diagram:
- Red solid (thick) = Full Duplication
- Yellow/orange dashed = Partial Overlap
- Gray dotted (thin) = Conceptual Similarity

**Validation:** Ensure the Mermaid syntax is valid `graph LR`. Count edges and verify `linkStyle` indices match (0-indexed, one per edge in order of definition).

### Step 3.4: L3 Scoring

Base score starts at **100**. Apply deductions per overlap pair:

| Classification | Deduction | Rationale |
|----------------|-----------|-----------|
| Full Duplication | -15 per pair | Clear redundancy, strong unification candidate |
| Partial Overlap | -8 per pair | Some redundancy, may benefit from shared base |
| Conceptual Similarity | -3 per pair | Minor concern, may be acceptable |
| False Positive | 0 (no deduction) | Not a real overlap, but log for transparency |

**Bonus:** +5 for each overlap pair where the codebase already has a shared abstraction (evidence of prior unification effort).

```
L3 Score = max(0, min(100, 100 - deductions + bonuses))
```

**Edge case:** If no overlaps detected, L3 score = 100 with message: "No overlaps detected. Codebase appears well-unified at the implementation level."

### Step 3.5: L3 Output

Produce:

1. **Overlap Classification Table:**

```markdown
## L3: Overlap Detection (Score: {l3_score}/100)

### Overlap Classifications

| # | System A | System B | Shared Functions | Classification | Similarity | Evidence Summary |
|---|----------|----------|-----------------|----------------|------------|------------------|
| 1 | {sys_a} | {sys_b} | {functions} | {class} | {pct}% | {brief evidence} |
```

2. **Mermaid Overlap Map** (as defined in Step 3.3)

3. **L3 Score Breakdown:**

```markdown
### L3 Score Breakdown
- Base: 100
- Full Duplications: {count} x -15 = {deduction}
- Partial Overlaps: {count} x -8 = {deduction}
- Conceptual Similarities: {count} x -3 = {deduction}
- Existing Shared Abstractions: {count} x +5 = {bonus}
- **L3 Score: {score}/100**
```

4. **Pass to L4:** The overlap classification table and Mermaid diagram are provided as input to L4.

---

## L4 Protocol -- Unification Proposals

**Runs in:** Deep mode only.
**Input:** L3's overlap classifications, Mermaid diagram, and original L2 function map.
**Weight:** 20% of composite score.
**Execution:** Spawned as a Task sub-agent AFTER L3 completes. Receives L3 output as input.

### Step 4A.1: Unification Feasibility Assessment

For each overlap classified as **Full Duplication** or **Partial Overlap** (skip Conceptual Similarity and False Positive), assess five feasibility factors:

| Factor | Question | Assessment |
|--------|----------|------------|
| **Consumer Count** | How many places consume each overlapping system? | Count call sites / import references for each system. High count = higher migration cost. |
| **Interface Compatibility** | Do the overlapping systems have compatible interfaces? | Compare function signatures, input/output types, error contracts. Incompatible = harder unification. |
| **Test Coverage** | Are both systems well-tested? | Check for test files, test patterns. Low coverage = risky migration. |
| **Coupling Depth** | How deeply is each system coupled to its consumers? | Shallow (imported, called) vs. Deep (extended, inherited, monkey-patched). Deep = harder extraction. |
| **Team Ownership** | Are the systems owned by different teams? | Check directory structure, CODEOWNERS, git blame patterns. Cross-team = coordination overhead. |

**Classify each overlap's unification feasibility:**

- **Unify** -- Clear benefit, manageable risk. All factors favorable or mitigatable. Propose a unified abstraction.
- **Partially Unify** -- Share a core but keep specialized extensions. Some factors unfavorable but core unification is worthwhile. Propose shared base + variants.
- **Do Not Unify** -- The systems look similar but serve genuinely different purposes, or unification would create harmful coupling. **Say so explicitly with clear reasoning.** This is a first-class output, not a failure.

### Step 4A.2: Unified Abstraction Design

For each **"Unify"** or **"Partially Unify"** verdict, propose a concrete design:

```markdown
### Proposal {N}: {Verdict} — {System A} + {System B}

**Verdict:** UNIFY | PARTIALLY UNIFY

**Unified Interface:**
- Name: {proposed_name}
- Type: {function | class | module | service}
- Signature/API: {key function signatures or module exports}

**What happens to each system's features:**
| Feature | Source | Action |
|---------|--------|--------|
| {feature_1} | System A | Preserved (core) |
| {feature_2} | System B | Merged into core |
| {feature_3} | System A | Dropped (unused) |
| {feature_4} | System B | Kept as variant/extension |

**Unification Score:** {X}% of codebase benefits
- Calculation: {files_benefiting} / {total_project_files} = {percentage}%
- Files benefiting: {list key directories/modules that would use the unified system}
```

### Step 4A.3: Risk Assessment

For each proposed unification, assess five risk categories:

| Risk Category | Assessment |
|---------------|-----------|
| **Breaking Changes** | What consumer code must change? How many call sites? List specific breaking changes. |
| **Behavioral Regression** | Edge cases handled differently between the two systems. What behavior might change? |
| **Performance Impact** | Does unification add overhead (extra abstraction layer, broader interface)? |
| **Coupling Risk** | Does unification create a single point of failure? Would a bug affect more consumers? |
| **Rollback Plan** | How to revert if unification causes issues? Can old systems be restored? |

**Assign overall risk level:**
- **LOW**: Minor breaking changes, good test coverage, easy rollback
- **MEDIUM**: Some breaking changes, adequate test coverage, rollback possible with effort
- **HIGH**: Significant breaking changes, low test coverage, or deep coupling concerns
- **CRITICAL**: Would require major architectural changes, cross-team coordination, or risks data integrity

### Step 4A.4: Migration Plan

**Generate ONLY for LOW and MEDIUM risk unifications.** HIGH and CRITICAL risk proposals receive: "Risk level too high for migration plan. Recommendation: Investigate further — reduce risk factors before attempting unification."

For approved unifications, produce a 4-phase plan:

```markdown
**Migration Plan:**

| Phase | Action | Effort | Validation |
|-------|--------|--------|------------|
| 1. Create | Build unified abstraction alongside existing systems. No consumer changes. | {estimate} | Unit tests pass for new abstraction |
| 2. Migrate | Move consumers one at a time. Validate after each migration. | {estimate} | Integration tests pass after each consumer switch |
| 3. Deprecate | Mark old systems as deprecated. Add deprecation warnings. | {estimate} | No new imports of old systems |
| 4. Remove | Delete old systems after deprecation period. | {estimate} | All references removed, tests pass |

**Total estimated effort:** {sum of phases}
**Recommended deprecation period:** {timeframe}
```

### Step 4A.5: Honest "No Unification" Report

For each **"Do Not Unify"** verdict, produce an explicit report:

```markdown
### Proposal {N}: DO NOT UNIFY — {System A} + {System B}

**Verdict:** DO NOT UNIFY

**Why these systems should remain separate:**
{Clear, specific reasoning — not vague hand-waving}

**What makes them seem similar but actually different:**
{Explain the surface-level similarity and the deep-level divergence}

**Alternative recommendation:**
{One of:}
- "Consider a shared interface/protocol without shared implementation (trait/protocol pattern)"
- "These systems are correctly separated. No action needed."
- "Monitor for future convergence — if {condition}, revisit unification."
```

**This is a FEATURE, not a failure.** "These systems are correctly separated" is a valuable architectural finding. The skill's credibility depends on knowing when NOT to unify.

### Step 4A.6: L4 Scoring

Base score starts at **100**. Apply deductions and bonuses:

**Deductions:**

| Condition | Deduction | Rationale |
|-----------|-----------|-----------|
| "Unify" verdict with HIGH or CRITICAL risk | -10 each | Risky unification ahead — architectural concern |
| "Do not unify" where overlap is Full Duplication | -15 each | Can't unify despite clear duplication = deep architectural issue |
| Unification with >50 consumer call sites to migrate | -5 each | High migration cost |

**Bonuses:**

| Condition | Bonus | Rationale |
|-----------|-------|-----------|
| "Unify" verdict with LOW risk | +5 each | Easy win, clear improvement path |
| Honest "Do not unify" with clear reasoning | +3 each | Good architectural judgment, Einstein honesty |

```
L4 Score = max(0, min(100, 100 - deductions + bonuses))
```

### Step 4A.7: L4 Output

Produce:

1. **Feasibility Summary Table:**

```markdown
## L4: Unification Proposals (Score: {l4_score}/100)

### Feasibility Summary

| # | System A | System B | Classification | Verdict | Risk | Unification Score |
|---|----------|----------|---------------|---------|------|-------------------|
| 1 | {sys_a} | {sys_b} | {L3 class} | {verdict} | {risk} | {pct}% |
```

2. **Individual Proposals** (one per overlap, using templates from Steps 4A.2-4A.5)

3. **L4 Score Breakdown:**

```markdown
### L4 Score Breakdown
- Base: 100
- High/Critical risk unifications: {count} x -10 = {deduction}
- Un-unifiable full duplications: {count} x -15 = {deduction}
- High-migration unifications (>50 call sites): {count} x -5 = {deduction}
- Low-risk easy wins: {count} x +5 = {bonus}
- Honest "do not unify" verdicts: {count} x +3 = {bonus}
- **L4 Score: {score}/100**
```

---

## Deep Mode Orchestration

When mode is `deep`, execute all four layers:

### Execution Order

1. **L1 (System Inventory)** -- Run inline (Step 1)
2. **L2 (Abstract Function Mapping)** -- Run inline (Step 2). Produces overlap candidates.
3. **L3 (Overlap Detection)** -- Spawn as Task sub-agent:
   - Pass L2 overlap candidates and function map as input
   - Sub-agent executes Steps 3.1-3.5
   - Returns: overlap classification table, Mermaid diagram, L3 score
4. **L4 (Unification Proposals)** -- Spawn as Task sub-agent AFTER L3 completes:
   - Pass L3 output (overlap classifications + Mermaid diagram) AND L2 function map as input
   - Sub-agent executes Steps 4A.1-4A.7
   - Returns: feasibility table, proposals, L4 score

**IMPORTANT:** L3 and L4 are SEQUENTIAL. L4 depends on L3's overlap classifications. Do NOT run them in parallel.

### Deep Mode Report Format

Save to `reports/unified-field/uft-{NNN}-{YYYY-MM-DD}-{slug}.md`:

```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "deep"
target: "{project path}"
systems_cataloged: {count}
functions_mapped: {count}
overlaps_detected: {count}
full_duplications: {count}
partial_overlaps: {count}
conceptual_similarities: {count}
false_positives: {count}
unifications_proposed: {count}
unify_verdicts: {count}
partial_unify_verdicts: {count}
do_not_unify_verdicts: {count}
l1_score: {N}
l2_score: {N}
l3_score: {N}
l4_score: {N}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Unified Field Theory -- Deep Analysis

> "If two systems solve the same problem, there's a unification hiding underneath."

**Date**: {YYYY-MM-DD}
**Mode**: Deep (L1-L4)
**Target**: {target}
**Composite Score**: {composite}/100 ({interpretation})

---

## L1: System Inventory (Score: {l1_score}/100)

{inventory table}

### L1 Deductions
{itemized list}

---

## L2: Abstract Function Map (Score: {l2_score}/100)

{function map matrix}

### Overlap Candidates
{overlap table}

### L2 Deductions
{itemized list}

---

## L3: Overlap Detection (Score: {l3_score}/100)

### Overlap Map

**Legend:** Red solid = Full Duplication | Yellow dashed = Partial Overlap | Gray dotted = Conceptual Similarity

```mermaid
{Mermaid diagram from Step 3.3}
```

### Overlap Classifications
{classification table from Step 3.5}

### L3 Score Breakdown
{breakdown from Step 3.5}

---

## L4: Unification Proposals (Score: {l4_score}/100)

### Feasibility Summary
{summary table from Step 4A.7}

{Individual proposals from Steps 4A.2-4A.5, one section per overlap}

### L4 Score Breakdown
{breakdown from Step 4A.7}

---

## Composite Score Breakdown

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: System Inventory | {l1}/100 | 25% | {l1 x 0.25} |
| L2: Function Mapping | {l2}/100 | 25% | {l2 x 0.25} |
| L3: Overlap Detection | {l3}/100 | 30% | {l3 x 0.30} |
| L4: Unification Proposals | {l4}/100 | 20% | {l4 x 0.20} |
| **Composite** | | | **{composite}/100** |

---

## Recommendations

{Top 3-5 actionable recommendations based on L3 overlap findings and L4 unification proposals}

---

## Score Trend

{If previous report exists: comparison. Otherwise: "First run -- no comparison data."}
```

### Deep Mode Cortex Storage

After saving the deep report:

```
cortex_remember:
  content: "Unified Field Theory DEEP run #{NNN} on {target}: composite {composite}/100. L1={l1}, L2={l2}, L3={l3}, L4={l4}. {overlaps_detected} overlaps: {full_dup} full duplications, {partial} partial, {conceptual} conceptual. {unify_count} unify, {partial_unify_count} partial unify, {do_not_count} do not unify verdicts."
  tags: ["unified-field-theory", "deep-analysis", "report", "architecture"]
  importance: 80
```

---

## Compare Mode

When invoked with `compare` argument:

### Step C.1: Find Existing Reports

```bash
ls reports/unified-field/uft-*.md 2>/dev/null | sort -V
```

If fewer than 2 reports exist, display:
> "Need 2+ Unified Field Theory reports for comparison. Run `/unified-field` or `/unified-field deep` first to generate reports."

Then stop. Do not save a compare report.

### Step C.2: Parse Report Frontmatter

For each existing report, extract YAML frontmatter values:
- report_number, date, mode
- l1_score, l2_score, l3_score, l4_score, composite_score
- overlaps_detected, full_duplications, partial_overlaps
- unifications_proposed, unify_verdicts, do_not_unify_verdicts

### Step C.3: Build Trend Dashboard

```markdown
# Unified Field Theory -- Comparison Report

> Tracking codebase unification progress across runs.

**Date**: {YYYY-MM-DD}
**Reports compared**: {count}
**Date range**: {earliest_date} to {latest_date}

---

## Score Trend

| Run | Date | Mode | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|------|----|----|----|-----|-----------|-------|
| {NNN} | {date} | {mode} | {l1} | {l2} | {l3_or_--} | {l4_or_--} | {composite} | {delta_or_--} |

**Trajectory:** {Improving | Declining | Stable | Mixed}
{One sentence explanation of the trajectory}
```

Use `--` for scores that were N/A (e.g., L3/L4 in default-mode reports).
Delta is computed as current composite minus previous composite.

### Step C.4: Overlap Resolution Tracking

If 2+ deep-mode reports exist, compare overlap classifications between runs:

```markdown
## Overlap Resolution

### Resolved Overlaps (present in earlier runs, absent in latest)
| Systems | Previous Classification | Resolution |
|---------|----------------------|------------|
| {sys_a} + {sys_b} | Full Duplication | Unified (no longer overlapping) |

### Persistent Overlaps (present across multiple runs)
| Systems | Classification | Runs Present | Trend |
|---------|---------------|-------------|-------|
| {sys_a} + {sys_b} | Partial Overlap | #001, #002, #003 | Unchanged |

### New Overlaps (first appeared in latest run)
| Systems | Classification | Source |
|---------|---------------|--------|
| {sys_a} + {sys_b} | Conceptual Similarity | New code added |
```

If no deep-mode reports exist for comparison, display:
> "No deep-mode reports available for overlap tracking. Run `/unified-field deep` to generate overlap data."

### Step C.5: Save Comparison Report

Save to `reports/unified-field/uft-{NNN}-{YYYY-MM-DD}-{slug}.md` with mode "compare" in frontmatter.

### Step C.6: Store in Cortex

```
cortex_remember:
  content: "Unified Field Theory COMPARE run #{NNN}: {report_count} reports compared. Trajectory: {trajectory}. Latest composite: {latest_composite}/100. {resolved_count} overlaps resolved, {persistent_count} persistent, {new_count} new."
  tags: ["unified-field-theory", "comparison", "trend", "architecture"]
  importance: 70
```
