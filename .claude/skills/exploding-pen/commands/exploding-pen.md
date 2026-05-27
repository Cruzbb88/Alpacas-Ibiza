# Exploding Pen -- Execution Logic (L1 + L2 + L3 + L4)

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

This file contains the step-by-step execution instructions for the Exploding Pen skill. Follow these steps exactly.

---

## Cortex Integration

Before gap analysis, recall past capability gaps for this project:
```bash
cortex recall "exploding-pen $(basename $PWD)" --limit 3 --json 2>/dev/null || true
```

## Step 0: Parse Arguments and Determine Mode

1. Check the argument passed to the skill:
   - **No argument** -> Default mode (L1 + L2, save report)
   - **`quick`** -> Quick mode (L1 only, terminal output, no report)
   - **`scan <category>`** -> Scan mode (L1 filtered to one category, terminal output, no report)
   - **`deep`** -> Deep mode (L1-L4, save report)
   - **`inject <gadget-id>`** -> Inject mode (L3 injection of a specific gadget)
   - **`inventory`** -> Inventory mode (L4 gadget inventory display)
   - **`history`** -> History mode (list past reports with score trends)
2. Record the mode for later use.

## Step 1: Discover Project Context

1. **Detect primary language** by counting file extensions in the project:
   - Use Glob to count `**/*.ts`, `**/*.js`, `**/*.py`, `**/*.go`, `**/*.rs`, `**/*.java`, `**/*.rb`, `**/*.php`
   - Exclude `node_modules/`, `venv/`, `.venv/`, `__pycache__/`, `dist/`, `build/`, `.git/`
   - The language with the most files is the primary language
   - Map: `.ts`/`.js` -> JavaScript/TypeScript, `.py` -> Python, `.go` -> Go, `.rs` -> Rust, `.java` -> Java, `.rb` -> Ruby, `.php` -> PHP

2. **Identify project root**: Use the current working directory as the scan target.

3. **Report context**: Output the detected language and file count.

**Exception**: For `inventory` and `history` modes, skip language detection -- jump directly to the relevant step.

## Step 2: L1 -- Capability Gap Scan

Read `references/gap-scanner.md` for detection heuristics. For each of the 10 gap categories (or the single category if in `scan` mode):

### Scan Process

For each category:

1. **Detect candidate locations** using the Grep/Glob patterns from `gap-scanner.md` for the detected language.
2. **Check for existing protection** -- look for existing wrappers, decorators, or patterns that already address the gap. Consult the false positive filtering rules in `gap-scanner.md`.
3. **If gap confirmed**, record it with:
   - **Category**: Which of the 10 categories
   - **Severity**: `critical` (-8 points), `important` (-5 points), or `nice-to-have` (-3 points)
   - **File path**: Where the gap exists
   - **Function/method**: The specific function or method affected
   - **Description**: One-line description of what is missing

### Severity Guidelines

- **Critical**: Security-sensitive gaps (input validation on public endpoints), data-loss risks (no error recovery on write paths), availability risks (no timeout on external calls in hot paths)
- **Important**: Operational gaps (no retry on external API calls, no circuit breaking on HTTP clients, no logging on key operations)
- **Nice-to-have**: Optimization gaps (no caching on pure functions, no connection pooling where volume is low)

### L1 Scoring

- Start at 100
- Deduct per gap: critical = -8, important = -5, nice-to-have = -3
- Floor at 0 (never go negative)
- This is the `gap_scan_score`

### L1 Output

Produce a gap table:

```markdown
| # | Category | Severity | File | Function | Gap Description |
|---|----------|----------|------|----------|-----------------|
| 1 | Retry logic | important | src/api/client.ts | fetchUser | No retry/backoff on external API call |
```

**If in `quick` or `scan` mode**: Output the gap table and L1 score to the terminal and STOP. Do not proceed to L2 or save a report.

## Step 3: L2 -- Gadget Design

Read `references/gadget-patterns.md` for pre-built patterns. For each gap found in L1, design a gadget:

### Design Process

1. **Match gap to pattern**: Look in `gadget-patterns.md` for a pre-built pattern matching the gap category and the project's primary language.
2. **If pattern found**: Adapt it to the specific gap context (rename variables to match the codebase conventions if needed).
3. **If no pattern found**: Design a new gadget from scratch following these constraints.

### Design Constraints (STRICT -- No Exceptions)

1. Every gadget MUST be under 20 lines of code -- count only non-empty, non-comment lines
2. Zero external dependencies -- stdlib/builtins only
3. Self-contained -- works as standalone decorator, wrapper, middleware, or utility
4. Language-aware -- design in the project's primary language
5. Self-documenting -- clear naming + one-line docstring
6. Removable -- wraps existing code without modifying internals

### Gadget Schema

Each gadget must include:

- **ID**: `gd-NNN` (sequential within the report)
- **Name**: Descriptive function name (e.g., `withRetry`, `circuitBreaker`)
- **Category**: Which gap category it addresses
- **Pattern type**: decorator / wrapper / middleware / utility
- **Code block**: The full implementation
- **Line count**: Must be < 20
- **Docstring**: One-line description of what it does

### L2 Scoring

- Start at 100
- For each gadget, deduct:
  - -15 if it exceeds 20 lines (this should never happen -- redesign instead)
  - -10 if it requires external dependencies
  - -5 if naming is unclear or docstring is missing
- Average the per-gadget scores
- This is the `gadget_design_score`

**If a gadget exceeds 20 lines**: Do NOT accept it. Split it into smaller gadgets or simplify until it fits. The 20-line limit is the defining constraint of this skill.

### L2 Output

For each gadget, output:

```markdown
### gd-001: withRetry
- **Category**: Retry logic
- **Type**: wrapper
- **Lines**: 12
- **For gap**: #1 in src/api/client.ts:fetchUser

> Wraps an async function with exponential backoff retry logic.

\```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 2 ** i * 100));
    }
  }
  throw new Error("unreachable");
}
\```
```

**If in default mode**: Continue to Step 4 (composite scoring with L1+L2 only).
**If in deep mode**: Continue to Step 4a (L3 Injection Planning).

## Step 4: Composite Scoring (Default Mode)

For **default mode** only (L1 + L2, no L3/L4):

Calculate the composite score using the full 4-weight formula. When L3/L4 are not run, score them as N/A and use only the layers that were executed:

```
composite = (gap_scan_score x 0.35) + (gadget_design_score x 0.30)
```

Then normalize to a 100-point scale by dividing by the sum of active weights (0.65):

```
composite = ((gap_scan_score x 0.35) + (gadget_design_score x 0.30)) / 0.65
```

Round to the nearest integer.

**Then skip to Step 6 (Report Generation).**

## Step 4a: L3 -- Injection Plan (Deep Mode and Inject Mode)

Read `references/injection-strategies.md` for placement strategies.

### Deep Mode: Injection Planning

In **deep mode**, after L1 + L2 complete, spawn a sub-agent (Task tool) for L3 injection planning. Pass the L1 gap table and L2 gadget designs as context.

The sub-agent performs:

1. **For each gadget designed in L2**, identify all injection points:
   - Use the detection patterns from `references/injection-strategies.md` for the detected language
   - Find the exact files and functions where the gadget should be applied
   - Prefer injection at service boundaries (entry/exit points)

2. **Rank injection points by impact**:
   - Count how many downstream code paths each injection point protects
   - Use the Impact Ranking table from `references/injection-strategies.md`

3. **Plan injection order**:
   - Inject gadgets protecting the most code paths first
   - Group by file when possible to minimize context switching

4. **Assess disruption risk** for each injection:
   - Check against the Disruption Risk Checklist in `references/injection-strategies.md`
   - Flag any injections that modify function signatures or may break tests

5. **Generate injection instructions** for each gadget:
   - Exact target file and line range
   - Before/after code showing the wrapping change
   - Where to place the gadget code (utility file or inline)
   - Import statement to add (if needed)

6. **Generate rollback instructions** for each injection:
   - Use the Rollback Templates from `references/injection-strategies.md`
   - Each rollback must be specific enough to reverse with a single Edit operation

### Injection Plan Output

For each gadget, produce:

```markdown
### Injection Plan: gd-001 (withRetry)

**Impact**: High (protects 7 code paths)
**Disruption Risk**: Low
**Injection Order**: 1 of N

**Target**: `src/api/client.ts` lines 42-45
**Pattern**: Call site wrapper

**Before**:
\```typescript
const data = await fetchUser(userId);
\```

**After**:
\```typescript
const data = await withRetry(() => fetchUser(userId));
\```

**Gadget Placement**: Add `withRetry` to `src/utils/gadgets.ts`
**Import**: Add `import { withRetry } from '../utils/gadgets';` to `src/api/client.ts`

**Rollback**:
\```
Replace: const data = await withRetry(() => fetchUser(userId));
With: const data = await fetchUser(userId);
Remove import { withRetry } from '../utils/gadgets'; if unused.
\```
```

### L3 Scoring

- Start at 100
- For each planned injection, deduct:
  - -10 if the injection requires modifying internal code (not wrapping)
  - -15 if the injection breaks a function signature
  - -5 if rollback instructions are missing
  - -5 if injection instructions are unclear or ambiguous
- Average across all planned injections
- This is the `injection_plan_score`

### Inject Mode: Execute a Specific Gadget Injection

When the mode is **`inject <gadget-id>`**:

1. **Find the gadget**: Read the most recent report from `reports/exploding-pen/ep-*.md`. Search for the gadget ID (e.g., `gd-001`) in the report body. If not found, check the gadget inventory file.

2. **Read the injection plan**: Find the injection plan for that gadget in the report. If no injection plan exists (report was from default mode, not deep mode), output: "No injection plan found for {gadget-id}. Run `deep` mode first to generate injection plans."

3. **Show the user what will change**: Display the before/after diff and the files that will be modified. Ask: "Proceed with injection? (The change can be rolled back.)"

4. **Execute the injection**:
   - If the gadget code needs to be placed in a utility file, create or append to it first
   - Add the import statement to the target file
   - Apply the wrapping change using the Edit tool
   - Show the completed diff

5. **Update the gadget inventory**:
   - Read the inventory file at `reports/exploding-pen/gadget-inventory.md`
   - Find the gadget entry by ID
   - Update: `status` -> `injected`, set `injection_date` to today, set `target_files` to the files modified
   - Write the updated inventory file

6. **Output**: Show the before/after diff and confirm the injection was applied. Include rollback instructions.

## Step 4b: L4 -- Gadget Inventory (Deep Mode and Inventory Mode)

### Deep Mode: Inventory Update

In **deep mode**, after L1 + L2 complete, spawn a sub-agent (Task tool) for L4 inventory management. This runs in parallel with the L3 sub-agent.

The sub-agent performs:

1. **Read the existing inventory** from `reports/exploding-pen/gadget-inventory.md`. If the file does not exist, initialize an empty inventory.

2. **Merge new gadgets from L2**:
   - For each gadget designed in L2, check if a gadget with the same ID already exists in the inventory
   - If the ID exists and the gadget design has changed: set the old entry's status to `superseded`, add the new entry with status `designed`
   - If the ID does not exist: add it with status `designed`
   - If the ID exists and the design is unchanged: leave it as-is

3. **Write the updated inventory** to `reports/exploding-pen/gadget-inventory.md`

### Inventory File Format

```markdown
# Exploding Pen -- Gadget Inventory

> Cumulative tracker of all designed and deployed gadgets for this project.
> Auto-updated by the Exploding Pen skill. Do not edit manually.

**Last updated**: {YYYY-MM-DD}
**Total gadgets**: {N}
**Deployed**: {N} | **Designed**: {N} | **Removed**: {N} | **Superseded**: {N}

| ID | Name | Category | Pattern | Lines | Status | Target Files | Injected | Impact | Origin |
|----|------|----------|---------|-------|--------|-------------|----------|--------|--------|
| gd-001 | withRetry | Retry logic | wrapper | 11 | designed | -- | -- | Protects 7 code paths | ep-001 |
| gd-002 | circuitBreaker | Circuit breaking | wrapper | 18 | injected | src/api/client.ts | 2026-02-15 | Protects 3 code paths | ep-001 |
```

### L4 Scoring

Based on deployment coverage across the inventory:

- **100**: All designed gadgets are deployed (status = `injected`)
- **75**: >75% of gadgets deployed
- **50**: 50-75% deployed
- **25**: <50% deployed
- **0**: No gadgets deployed (first run, or all still in `designed` status)

This is the `inventory_score`.

### Inventory Mode

When the mode is **`inventory`**:

1. Read the inventory file at `reports/exploding-pen/gadget-inventory.md`
2. If the file does not exist, output: "No gadget inventory found. Run the skill in default or deep mode first to create an inventory."
3. If it exists, display the inventory table with summary statistics:
   - Total gadgets, deployed count, designed count, removed count, superseded count
   - Deployment coverage percentage
4. STOP. Do not run any other layers.

## Step 5: Composite Scoring (Deep Mode)

For **deep mode** (all 4 layers):

Calculate the composite score using the full 4-weight formula:

```
composite = (gap_scan_score x 0.35) + (gadget_design_score x 0.30) + (injection_plan_score x 0.20) + (inventory_score x 0.15)
```

Round to the nearest integer.

## Step 6: Report Generation (Default and Deep Modes)

Only generate a report in **default mode** or **deep mode**. Skip for `quick`, `scan`, `inject`, `inventory`, and `history` modes.

### Report Numbering

1. Check for existing reports: Glob for `reports/exploding-pen/ep-*.md` in the project directory
2. If reports exist, find the highest number and increment by 1
3. If no reports exist, start at `ep-001`
4. Create the report directory if it does not exist: `mkdir -p reports/exploding-pen`

### Report Structure

**Description slug generation for ep- reports:**
- Derive from the scan target or primary module scanned:
  - E.g., scanning `src/api/` -> `"api-gap-scan"`
  - Full project scan -> `"full-project-scan"`
  - Deep mode -> `"deep-analysis"`
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

**Read Previous Report:**

Before generating the report:
1. Check for previous reports: Glob `reports/exploding-pen/ep-*.md` (exclude `gadget-inventory.md`)
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison
5. Also extract key metrics (gaps_found, gadgets_designed, composite_score) for delta comparison

Skills can use the shared utility for this:
```python
import sys; sys.path.insert(0, str(Path.home() / ".claude" / "scripts" / "lib"))
from report_utils import find_previous_report, parse_frontmatter, next_report_number, generate_filename, format_frontmatter, calculate_delta, format_delta_section, generate_trend_table
```

Write the report to `reports/exploding-pen/ep-NNN-YYYY-MM-DD-{slug}.md`:

```markdown
---
report_type: "exploding-pen"
report_number: {NNN}
date: "{YYYY-MM-DD}"
project_name: "{name}"
project_tag: "{slug}"
mode: "{default|deep}"
target_path: "{scanned path}"
language: "{primary language detected}"
gaps_found: {N}
gadgets_designed: {N}
gadgets_injected: {N_or_0}
gap_scan_score: {score}
gadget_design_score: {score}
injection_plan_score: {score_or_NA}
inventory_score: {score_or_NA}
composite_score: {score}
previous_composite: {previous score or null}
score_delta: "{+/-N or dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Exploding Pen Report #{NNN}

**Date**: {YYYY-MM-DD}
**Target**: {project path}
**Language**: {detected language}
**Mode**: {default|deep}
**Composite Score**: {score}/100

## Executive Summary

{1-2 paragraph summary of findings: how many gaps found, most critical ones, how many gadgets designed, injection readiness (if deep mode), overall health assessment}

## L1: Capability Gap Scan (Score: {score}/100)

| # | Category | Severity | File | Function | Gap Description |
|---|----------|----------|------|----------|-----------------|
{gap rows}

## L2: Gadget Designs (Score: {score}/100)

{gadget blocks as described in Step 3 output}

## L3: Injection Plan (Score: {score_or_NA}/100)

{If deep mode: injection plan blocks as described in Step 4a output}
{If default mode: "Injection planning requires `deep` mode."}

## L4: Gadget Inventory (Score: {score_or_NA}/100)

{If deep mode: inventory summary table + deployment coverage}
{If default mode: "Inventory tracking requires `deep` mode."}

## Scoring

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1: Gap Scan | {score} | 35% | {weighted} |
| L2: Gadget Design | {score} | 30% | {weighted} |
| L3: Injection Plan | {score_or_NA} | 20% | {weighted_or_NA} |
| L4: Gadget Inventory | {score_or_NA} | 15% | {weighted_or_NA} |
| **Composite** | | | **{composite}** |

{If previous report exists, include delta section:}

## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {item description}

**RESOLVED** ({count} items):
- [RESOLVED] {item description}

**MOVED** ({count} items):
- [MOVED] {item}: {previous_category} -> {current_category}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous_%}% -> {current_%}%

Rules: Omit categories with 0 items. First report = omit delta section entirely.
Compare gap categories, gadget counts, and injection status between reports.

{If 3+ reports exist, add trend section:}

## Trend (last {N} reports)

| Report | Date | Score | Gaps | Gadgets | L1 | L2 | L3 | L4 |
|--------|------|-------|------|---------|----|----|----|----|
| ep-001 | {date} | {N} | {N} | {N} | {N} | {N} | N/A | N/A |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Direction:** {first} -> {last} ({arrow}, {+/-N%})

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`
```

### Trend Calculation

- **first_run**: Only 1 report exists
- **insufficient_data**: Fewer than 2 reports
- **improving**: Current composite > previous composite
- **declining**: Current composite < previous composite
- **stable**: Current composite == previous composite (within +/-2 points)

## Step 7: History Mode

When the mode is **`history`**:

1. Glob for `reports/exploding-pen/ep-*.md` in the project directory (exclude `gadget-inventory.md`)
2. If no reports found, output: "No reports found. Run the skill first to generate a report."
3. For each report found:
   - Read the YAML frontmatter
   - Extract: report_number, date, mode, gaps_found, gadgets_designed, gap_scan_score, gadget_design_score, injection_plan_score, inventory_score, composite_score
4. Display a summary table sorted by report number:

```markdown
# Exploding Pen -- Report History

| # | Date | Mode | Gaps | Gadgets | L1 | L2 | L3 | L4 | Composite | Delta |
|---|------|------|------|---------|----|----|----|----|-----------|-------|
| 001 | 2026-02-15 | default | 5 | 5 | 72 | 95 | N/A | N/A | 82 | -- |
| 002 | 2026-02-16 | deep | 3 | 3 | 85 | 90 | 88 | 25 | 78 | -4 |
```

5. If 2+ reports exist, show trend direction: "Trend: {improving|declining|stable}"
6. STOP. Do not run any other layers.

## Step 8: Terminal Output

Regardless of mode, always output a summary to the terminal:

- For **quick** mode: Gap table + L1 score
- For **scan** mode: Filtered gap table + L1 score for that category
- For **default** mode: Executive summary + composite score + report file path
- For **deep** mode: Executive summary + all 4 layer scores + composite score + report file path
- For **inject** mode: Before/after diff + injection confirmation + rollback instructions
- For **inventory** mode: Inventory table + deployment coverage
- For **history** mode: Report history table + trend
