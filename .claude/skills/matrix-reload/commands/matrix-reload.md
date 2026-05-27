# Matrix Reload -- Execution Protocol

## Pre-Execution

### 1. Parse Arguments

Determine mode from user input:

```
Input: (none)     -> mode = "default"
Input: "quick"    -> mode = "quick"
Input: "zone X"   -> mode = "zone", target_path = X
Input: "deep"     -> mode = "deep"
Input: "swap"     -> mode = "swap"
Input: "swap N"   -> mode = "swap", report_number = N
Input: "history"  -> mode = "history"
```

### 2. Detect Project Context

Before analysis, gather project metadata:

1. **Detect primary language** -- Count file extensions in the project (most `.ts` = TypeScript, most `.py` = Python, etc.)
2. **Check for git** -- Run `git rev-parse --is-inside-work-tree`. If not a git repo, set `git_available = false` and note that churn rate dimension will be skipped.
3. **Count analyzable files** -- Glob for source files (exclude `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`, `__pycache__/`, `.venv/`, `venv/`). This is the file universe.
4. **Determine analysis scope** -- If file count > 500, analyze top-level directories first to find pain clusters, then drill into the worst directories. Document this in output.

**History mode:** Skip project context detection entirely -- jump straight to history output.

**Swap mode:** Skip project context detection -- jump straight to report loading.

---

## L1: Pain Mapping (20% weight)

**Reference:** Read `references/pain-heuristics.md` for detailed grep patterns, normalization rules, and false positive filtering.

Analyze the codebase across 5 pain dimensions. Each file gets a score per dimension, then a weighted composite.

### Dimension 1: Bug Density (25% of L1)

Search for pain markers in source files:

```bash
# Count pain markers per file
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|XXX\|TEMPORARY\|KLUDGE\|BRITTLE" --include="*.{ts,tsx,js,jsx,py,go,rs,java,rb}" . | cut -d: -f1 | sort | uniq -c | sort -rn
```

- Normalize: highest count = 100, scale others proportionally
- See `references/pain-heuristics.md` for language-specific patterns and false positive filtering

### Dimension 2: Churn Rate (25% of L1)

**Requires git.** If git is unavailable, skip this dimension.

```bash
# Count commits per file (last 6 months for relevance)
git log --since="6 months ago" --format=format: --name-only | sort | uniq -c | sort -rn | head -50
```

- Normalize: highest churn = 100, scale others proportionally
- High churn = high pain (files that keep getting touched need attention)

### Dimension 3: Complexity (20% of L1)

Measure structural complexity per file:

- **Nesting depth**: Count levels of nested if/for/while/try blocks. Flag files with depth > 4.
- **Long functions**: Count functions/methods longer than 50 lines. Flag files with > 3 long functions.
- **High parameter counts**: Count functions with > 5 parameters.
- **File length**: Files over 500 lines get a complexity bonus.

```bash
# Quick complexity proxy: count indentation depth
# For Python (spaces)
grep -c "^        " file.py  # 2+ levels deep

# For JS/TS (nesting indicators)
grep -c "if\|for\|while\|try\|switch\|catch" file.ts
```

- Normalize: combine sub-metrics, highest composite = 100

### Dimension 4: Workaround Patterns (15% of L1)

Grep for defensive coding patterns that signal underlying problems:

```bash
# Defensive patterns
grep -rn "try {" --include="*.{ts,js}" . | cut -d: -f1 | sort | uniq -c | sort -rn
grep -rn "!= null\|!== null\|!= undefined\|!== undefined\|\?\?\ \|\?\." --include="*.{ts,js}" . | cut -d: -f1 | sort | uniq -c | sort -rn
```

- High density of null checks, try/catch blocks, type assertions = code working around problems
- See `references/pain-heuristics.md` for language-specific workaround patterns

### Dimension 5: Coupling Density (15% of L1)

Count how connected each file is:

```bash
# Count imports per file (how much this file depends on)
grep -rn "^import\|^from.*import\|require(" --include="*.{ts,tsx,js,jsx,py}" . | cut -d: -f1 | sort | uniq -c | sort -rn

# Count how many files import THIS file (how much depends on it)
# For each source file, grep for its name in import statements
```

- Files with high fan-in (many dependents) AND high fan-out (many dependencies) = coupling hotspots
- Normalize: highest coupling = 100

### Composite Pain Score

For each file, compute:

```
pain_score = (bug_density x 0.25) + (churn_rate x 0.25) + (complexity x 0.20) + (workarounds x 0.15) + (coupling x 0.15)
```

If a dimension was skipped (e.g., churn on non-git repo), redistribute its weight equally among available dimensions.

### L1 Output: Pain Heat Map

Produce a ranked table:

```markdown
### Pain Heat Map

| Rank | File | Pain Score | Top Dimension | Bug | Churn | Complexity | Workarounds | Coupling |
|------|------|-----------|---------------|-----|-------|------------|-------------|----------|
| 1 | src/auth/session.ts | 87 | Churn | 72 | 100 | 65 | 88 | 91 |
| 2 | src/db/queries.ts | 81 | Bug Density | 100 | 85 | 55 | 70 | 75 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

Show top 20 files (or all files if fewer than 20).

### L1 Scoring

Start at 100. Deductions:
- `-10` for each dimension skipped (e.g., no git = -10 for churn)
- `-5` for analyzing fewer than 50% of project source files
- Floor at 0

### Quick Mode: STOP HERE

If mode is `quick`:
1. Print the Pain Heat Map to terminal
2. Print the L1 score
3. Print a summary: "Top 3 pain files: X, Y, Z. Primary pain dimension: {most common top dimension}."
4. Do NOT save a report
5. STOP execution

---

## L2: 80/20 Isolation (20% weight)

**Reference:** Read `references/isolation-patterns.md` for boundary drawing strategies and Mermaid templates.

Using the L1 pain map, identify and isolate the reload zone.

### Step 1: Rank and Find the Cut Point

1. Sort all files by pain score (descending)
2. Compute cumulative pain percentage walking down the list
3. The "cut point" is where cumulative pain reaches ~80% of total pain
4. Files above the cut = initial reload zone candidates
5. Files below the cut = OUT of zone

**Note:** The 80/20 cut is a heuristic. Look for natural cluster boundaries. If pain drops sharply at some point (e.g., from 70 to 30), that is the natural boundary even if it is 75/25 or 85/15.

### Step 2: Dependency Analysis

For each candidate file in the initial reload zone:

1. **Trace imports** -- What does this file import? Are those files also in the zone?
2. **Trace exports** -- What files import this file? Are those files outside the zone?
3. **Classify dependencies**:
   - **Internal**: Both ends inside zone -- no boundary concern
   - **Inward**: Outside file depends on zone file -- this is a boundary interface (must preserve)
   - **Outward**: Zone file depends on outside file -- zone consumes external API (acceptable)
   - **Bidirectional**: Zone file and outside file depend on each other -- boundary concern (flag it)

```bash
# For TypeScript/JavaScript: trace imports
grep -n "import.*from\|require(" src/auth/session.ts

# For Python: trace imports
grep -n "^import\|^from.*import" src/auth/session.py
```

### Step 3: Draw the Boundary

Produce the definitive zone definition:

```markdown
### Reload Zone Boundary

**Verdict:** {Isolatable | Partially Isolatable | Too Distributed}

#### IN the Reload Zone (DO NOT exceed this boundary)
| File | Pain Score | Role |
|------|-----------|------|
| src/auth/session.ts | 87 | Core auth logic |
| src/auth/tokens.ts | 76 | Token management |
| ... | ... | ... |

#### OUT of the Reload Zone (DO NOT TOUCH)
Everything not listed above is OUT. Key files near the boundary:
| File | Pain Score | Why OUT |
|------|-----------|---------|
| src/auth/types.ts | 35 | Low pain, shared types |
| src/middleware/auth.ts | 42 | Below cut point |

#### Boundary Interfaces (must preserve during rebuild)
| Interface | Direction | Zone File | External File |
|-----------|-----------|-----------|---------------|
| validateSession() | Inward | session.ts | middleware/auth.ts |
| TokenPayload type | Inward | tokens.ts | api/routes.ts |
| dbQuery() | Outward | session.ts | db/client.ts |
```

### Step 4: Isolability Check

Assess whether the zone can be cleanly rebuilt:

- **Isolatable**: Zone has clear boundaries, few cross-boundary dependencies (< 5 bidirectional), most dependencies flow inward. Verdict: "Proceed with reload."
- **Partially Isolatable**: Some bidirectional dependencies cross the boundary (5-15). Verdict: "Proceed with caution. Interface contracts strongly recommended before rebuild."
- **Too Distributed**: Pain is spread across the entire codebase with no clear cluster, OR zone exceeds 40% of project files, OR > 15 bidirectional boundary dependencies. Verdict: "Partial rebuild not recommended. Consider incremental /refactor instead."

### Step 5: Generate Mermaid Diagram

Create a dependency diagram showing the reload zone boundary:

```markdown
```mermaid
graph LR
    subgraph RELOAD_ZONE ["Reload Zone (DO NOT exceed)"]
        A[session.ts<br/>Pain: 87]
        B[tokens.ts<br/>Pain: 76]
        A --> B
    end

    subgraph OUTSIDE ["Outside Zone (DO NOT TOUCH)"]
        C[middleware/auth.ts]
        D[db/client.ts]
        E[api/routes.ts]
    end

    C -->|validateSession| A
    E -->|TokenPayload| B
    A -->|dbQuery| D

    style RELOAD_ZONE fill:#ff000020,stroke:#ff0000,stroke-width:3px
    style OUTSIDE fill:#00ff0020,stroke:#00ff00,stroke-width:2px
`` `
```

(Remove the space in the closing triple backtick above -- it is there to prevent markdown nesting issues in this document.)

### Step 6: Scope Creep Guard

Include this block in EVERY output that defines a reload zone:

```
+============================================================+
|                    SCOPE CREEP ALERT                        |
|                                                            |
|  The reload zone boundary is a HARD LINE.                  |
|                                                            |
|  IN the zone:  [N] files listed above                      |
|  OUT of zone:  EVERYTHING ELSE                             |
|                                                            |
|  If you feel the urge to modify something outside the      |
|  reload zone, STOP and reassess. Scope creep is the #1     |
|  killer of rewrites.                                       |
|                                                            |
|  The boundary exists to protect you. Respect it.           |
+============================================================+
```

### L2 Scoring

Start at 100. Deductions:
- `-15` for "Too Distributed" verdict
- `-10` if reload zone contains > 30% of project source files (zone is too big)
- `-5` for each bidirectional dependency crossing the boundary (cap deductions at -30)
- Floor at 0

### Zone Mode: Scoped L2

If mode is `zone <path>`:
1. Skip L1 entirely (no pain mapping)
2. Use `<path>` as the reload zone (all files under that path are IN)
3. Run Steps 2-6 of L2 (dependency analysis, boundary drawing, isolability check)
4. Output the zone analysis to terminal
5. Do NOT save a report
6. L2 score still applies

### Default Mode: Continue to Report Generation

If mode is `default`: After L2 completes, skip L3-L5 (not applicable in default mode) and proceed to Report Generation.

---

## L3: Interface Preservation Contracts (20% weight)

**Reference:** Read `references/interface-contracts.md` for contract extraction patterns, test stub generation, and criticality assessment.

**Runs in:** Deep mode only (after L2 completes).

L3 maps every interface crossing the reload zone boundary and defines inviolable contracts that the rebuilt zone must satisfy. The outside world must never know a reload happened.

### Step 1: Identify Exported Symbols

For each file in the reload zone (from L2), identify all exported symbols:

```bash
# JavaScript / TypeScript
grep -n "^export " {zone_file}
grep -n "^export {" {zone_file}
grep -n "^export const\|^export let\|^export var\|^export function\|^export class\|^export interface\|^export type\|^export enum\|^export default\|^export abstract" {zone_file}

# Python
grep -n "^def [^_]\|^class [^_]" {zone_file}
grep -n "^__all__" {zone_file}
grep -n "^[A-Z][A-Z_]*\s*=" {zone_file}

# Go
grep -n "^func [A-Z]\|^type [A-Z]\|^var [A-Z]\|^const [A-Z]" {zone_file}
```

See `references/interface-contracts.md` for full language-specific patterns.

### Step 2: Trace Consumers

For each exported symbol, find all files that import or use it:

```bash
# Find consumers of a named export
grep -rn "import.*{symbol_name}\|{ {symbol_name}\|{symbol_name} }" --include="*.{ts,tsx,js,jsx}" .

# Filter to OUTSIDE-zone consumers only
# Internal consumers (both files in zone) are not boundary contracts
```

Classify each consumer as inside or outside the reload zone. Only outside consumers create interface contracts.

### Step 3: Classify Contracts

For each exported symbol with at least one outside consumer, create a contract entry:

| Field | How to Determine |
|-------|-----------------|
| `contract_id` | Sequential: `ic-001`, `ic-002`, etc. |
| `type` | function-signature / data-shape / api-endpoint / event-pattern / file-export |
| `name` | The exported symbol name |
| `source` | File path where the symbol is defined |
| `direction` | **inbound** (outside calls into zone) or **outbound** (zone calls outside) |
| `signature` | Full type signature: params, return type, data shape |
| `consumers` | List of outside-zone files that depend on this symbol |
| `criticality` | **high** (5+ consumers), **medium** (2-4), **low** (1 consumer) |
| `test_stub` | Pseudocode that verifies contract compliance (see below) |

**Direction rules:**
- If outside code imports/calls a zone symbol: **inbound** (most critical)
- If zone code imports/calls an outside symbol: **outbound**
- If both directions exist: **bidirectional** (flag for special attention)

### Step 4: Extract Type Signatures

For each contract, extract the full type signature:

- **Function signatures**: Parameter names and types, return type, async/Promise wrappers, thrown exceptions
- **Data shapes**: All fields with types, optional vs required, nested types
- **API endpoints**: Method, path, request body, response body, status codes
- **Event patterns**: Event name, payload shape, emitter and listener locations
- **File exports**: Re-export chains, barrel file contents

### Step 5: Generate Contract Test Stubs

For each contract, write a pseudocode test stub that verifies the rebuilt version satisfies the same contract:

```
// Contract test: {contract_name}
// {description of what to verify}
assert({condition 1})
assert({condition 2})
// ... enough assertions to verify the contract
```

Test stubs are pseudocode -- they describe WHAT to test, not provide runnable test files. The implementing developer writes the actual tests.

**Priority:** Generate test stubs for ALL high-criticality contracts. Medium and low criticality contracts should also have stubs but can be simpler.

### Step 6: Produce Contract Table

Output the full contract inventory:

```markdown
## L3: Interface Preservation Contracts

**Contracts mapped:** {N}
**High criticality:** {N} | **Medium:** {N} | **Low:** {N}
**Direction:** {N} inbound | {N} outbound | {N} bidirectional

### Contract Inventory

| ID | Type | Name | Source | Direction | Criticality | Consumers |
|----|------|------|--------|-----------|-------------|-----------|
| ic-001 | function-signature | validateSession | src/auth/session.ts | inbound | high | 5 files |
| ic-002 | data-shape | Session | src/auth/types.ts | inbound | high | 8 files |
| ic-003 | event-pattern | session:expired | src/auth/session.ts | outbound | medium | 2 files |
| ... | ... | ... | ... | ... | ... | ... |

### Contract Details

#### ic-001: validateSession (function-signature)

**Source:** src/auth/session.ts
**Direction:** inbound
**Criticality:** high (5 consumers)

**Signature:**
{full type signature}

**Consumers:**
- src/middleware/auth.ts (line 42)
- src/api/routes/user.ts (line 18)
- ...

**Contract Test Stub:**
{pseudocode test}

---

{Repeat for each contract}
```

### Contract Principles

These principles MUST be followed:

1. **Contracts are INVIOLABLE** -- The outside world must never know a reload happened
2. **Inbound contracts are most critical** -- External code calling into the zone MUST continue to work identically
3. **Outbound contracts must maintain expectations** -- The zone's calls to external code must use the same signatures
4. **Data shape contracts must maintain shape** -- Any data structures passed across the boundary must maintain their structure
5. **Event contracts must maintain names and payloads** -- Events emitted/consumed across the boundary must keep their names and payload shapes

### L3 Scoring

Start at 100. Deductions:
- `-10` for each exported symbol without a mapped contract
- `-5` for each contract missing a test stub
- `-15` for each high-criticality contract without a full type signature
- `-5` for each contract without consumer tracing (empty consumers list)
- Floor at 0

---

## L4: Clean Rebuild Design (20% weight)

**Runs in:** Deep mode only (after L3 completes).

L4 designs the replacement architecture for the reload zone. The design addresses root causes from L1, satisfies all L3 contracts, and uses current best practices -- with NO legacy constraints inside the zone.

### Step 1: Review Root Causes

From the L1 Pain Heat Map, identify the root causes for each high-pain file in the reload zone:

```markdown
### Root Cause Analysis

| Pain Source | Root Cause | Files Affected | Severity |
|-------------|-----------|----------------|----------|
| High complexity in session.ts | God-object pattern: one file handles auth, session management, and token refresh | session.ts | Critical |
| High churn in tokens.ts | Frequent bug fixes due to unclear token lifecycle | tokens.ts | High |
| High coupling in auth/index.ts | Barrel file re-exports everything, creating hidden dependencies | index.ts | Medium |
```

Every root cause identified here MUST be addressed by the rebuild design. If the design does not address a root cause, it is not solving the problem.

### Step 2: Propose Architecture Pattern

Choose an architecture pattern appropriate to the zone's purpose. Do NOT use a one-size-fits-all template.

Consider:
- **Service layer pattern** -- When the zone handles business logic with clear input/output
- **Repository pattern** -- When the zone manages data access
- **Event-driven pattern** -- When the zone coordinates between many consumers
- **Pipeline/middleware pattern** -- When the zone processes requests through stages
- **Strategy pattern** -- When the zone has multiple implementations of the same interface

**Rationale requirement:** Explain WHY this pattern was chosen for THIS zone, tied to the specific pain sources found in L1.

### Step 3: Design New Module Structure

Design a new file/module layout for the rebuilt zone:

```markdown
### Proposed Module Structure

{zone_root}/
+-- {module_1}.{ext}        # {responsibility}
+-- {module_2}.{ext}        # {responsibility}
+-- {module_3}.{ext}        # {responsibility}
+-- {subdir}/
    +-- {module_4}.{ext}    # {responsibility}
    +-- {module_5}.{ext}    # {responsibility}
```

**Design rules:**
- NO legacy baggage inside the zone -- design as if starting fresh
- The ONLY constraints are the L3 interface contracts
- Address root causes, not symptoms (if L1 found high complexity, reduce complexity, do not just format it better)
- Prefer simplicity -- the rebuild should be easier to understand than the original
- Each module has ONE clear responsibility
- Aim for fewer files with clear boundaries rather than many small files

### Step 4: Map Contract Compliance

For EVERY L3 contract, show explicitly how the new design satisfies it:

```markdown
### Interface Compliance Matrix

| Contract ID | Contract Name | Satisfied By | How |
|-------------|--------------|-------------|-----|
| ic-001 | validateSession | auth-service.ts:validateSession() | Same signature, returns Session or null |
| ic-002 | Session type | types.ts:Session | Identical interface exported |
| ic-003 | session:expired | session-manager.ts | Same event name and payload shape |
| ... | ... | ... | ... |
```

**Every contract must appear in this table.** If a contract cannot be satisfied by the new design, the design must be revised -- NOT the contract.

### Step 5: Document Key Design Decisions

For each significant design decision, provide rationale tied to a specific pain source:

```markdown
### Key Design Decisions

#### Decision 1: Split session.ts into AuthService and SessionManager

**Pain source:** L1 found session.ts has pain score 87, driven by complexity (god-object pattern)
**Decision:** Separate authentication logic (validate, refresh) from session lifecycle management (create, expire, cleanup)
**Rationale:** Single Responsibility Principle. Each module is independently testable and has clear boundaries.
**Contract impact:** ic-001 (validateSession) moves to AuthService; ic-003 (session:expired) moves to SessionManager. Both contracts preserved with identical signatures.

#### Decision 2: Replace barrel re-exports with explicit imports

**Pain source:** L1 found auth/index.ts creates hidden coupling (coupling score: 91)
**Decision:** Remove barrel file. Consumers import directly from the specific module.
**Rationale:** Eliminates hidden dependency chains. Makes dependency graph explicit and auditable.
**Contract impact:** ic-005 (barrel exports) -- external consumers will need import path updates. This is an interface change that must be handled in L5 swap plan.
```

### Step 6: Generate Design Diagram

Create a Mermaid diagram showing the new module structure and how it maps to contracts:

```markdown
```mermaid
graph TB
    subgraph NEW_ZONE ["Rebuilt Zone"]
        AS[auth-service.ts<br/>validates + refreshes]
        SM[session-manager.ts<br/>lifecycle management]
        T[types.ts<br/>shared types]
        AS --> T
        SM --> T
    end

    subgraph OUTSIDE ["Outside Zone (unchanged)"]
        MW[middleware/auth.ts]
        API[api/routes.ts]
        DB[db/client.ts]
        NOTIF[notifications/handler.ts]
    end

    MW -->|"ic-001: validateSession()"| AS
    API -->|"ic-002: Session type"| T
    SM -->|"ic-003: session:expired"| NOTIF
    AS -->|"outbound: dbQuery()"| DB

    style NEW_ZONE fill:#0000ff20,stroke:#0000ff,stroke-width:3px
    style OUTSIDE fill:#00ff0020,stroke:#00ff00,stroke-width:2px
`` `
```

(Remove the space in the closing triple backtick above.)

### L4 Scoring

Start at 100. Deductions:
- `-15` for each L1 root cause not addressed by the design
- `-10` for each L3 contract not mapped to the new design in the compliance matrix
- `-5` for each design decision without rationale tied to a pain source
- Floor at 0

---

## L5: Hot Swap Plan with Rollback (20% weight)

**Reference:** Read `references/hot-swap-strategies.md` for transition strategies, feature flag patterns, rollback templates, and scope enforcement.

**Runs in:** Deep mode (after L4 completes) and Swap mode (standalone from existing report).

L5 generates a step-by-step transition plan to replace the old zone with the new design. Every step is independently reversible. No big-bang cutover.

### Step 1: Pre-Swap Preparation

Define the preparation steps before any code changes:

```markdown
### Pre-Swap Preparation

1. **Feature flag setup**: Create environment variable or config flag for toggling between old and new implementations
2. **Test baseline**: Run existing tests and record pass/fail baseline. All tests must pass before starting swap.
3. **Monitoring**: Set up logging/monitoring to compare old vs new behavior during transition
4. **Rollback verification**: Verify that the rollback for each step works BEFORE starting the swap
```

### Step 2: Incremental Build Plan

Break the rebuild into small, deployable increments. NEVER build the entire zone at once.

Choose a build strategy from `references/hot-swap-strategies.md`:
- **Bottom-up** (leaf modules first)
- **Contract-in** (highest-criticality interfaces first)
- **Pain-out** (worst pain files first)

Each increment must:
- Be independently deployable behind a feature flag
- Satisfy at least one L3 contract
- Have its own verification step

### Step 3: Generate Swap Steps

For each increment, produce a swap step using this template:

```markdown
### Step {N}: {Action Title}

**Action:** {What to do -- specific and actionable}

**Files Modified:**
- {file path} -- {what changes}

**Scope Check:**
- [ ] All modified files are INSIDE the reload zone
- [ ] No external interfaces are changed (L3 contracts preserved)
- [ ] No external dependencies are added or removed

**Risk Level:** {low | medium | high}

**Verification:**
1. {Specific check to verify this step succeeded}
2. {Test or assertion to run}

**Rollback:**
1. {Exact action to reverse this step}
2. {How to verify rollback succeeded}
**Rollback time:** {estimated time -- must be faster than the forward step}

**Proceed to Step {N+1} only after verification passes.**
```

### Step 4: Parallel Running Strategy

Define how old and new code run simultaneously during transition:

- **Shadow mode**: Run both, use old results, log differences
- **Canary**: Route a percentage of traffic to new code
- **Strangler fig**: Route one endpoint/feature at a time

Include progression milestones: 0% -> 1% -> 5% -> 25% -> 50% -> 100%

### Step 5: Verification Gates

After each swap step, define what must be verified before proceeding:

```markdown
### Verification Gates

| Gate | After Step | Criteria | Action if Failed |
|------|-----------|----------|-----------------|
| G1 | Step 1 | Feature flag toggles correctly | Rollback Step 1 |
| G2 | Step 2 | New module passes contract tests for ic-001 | Rollback Step 2 |
| G3 | Step 3 | Shadow mode shows 0 divergence for 24h | Rollback Step 3 |
| ... | ... | ... | ... |
```

### Step 6: Full Rollback Plan

Compile the rollback actions from all steps into a reverse-order rollback plan:

```markdown
### Full Rollback Plan (Emergency)

If the swap must be completely reversed:

1. Set feature flag to OLD (immediate -- all traffic returns to old code)
2. Rollback Step {N}: {action}
3. Rollback Step {N-1}: {action}
4. ...
5. Rollback Step 1: {action}
6. Verify system is in pre-swap state
7. Document what failed and at which step

**Total rollback time:** {sum of individual rollback times}
```

### Step 7: Scope Enforcement

For EVERY swap step, verify scope:

1. **File scope**: List every file the step touches. Cross-reference with L2 zone boundary. If ANY file is outside the zone: STOP and redesign the step.
2. **Interface scope**: Cross-reference with L3 contract list. If ANY contract signature changes: STOP.
3. **Dependency scope**: New imports from outside are acceptable. New exports consumed by outside code are NOT (changing the contract).
4. **Data scope**: Database/file/cache format changes must be backwards-compatible.

### Hot Swap Principles

These principles are NON-NEGOTIABLE:

1. **NEVER big-bang cutover** -- Always incremental transition
2. **Every step has a rollback** -- If a step has no obvious rollback, redesign the step to be reversible. Flag it rather than skip the rollback.
3. **Rollback must be faster than forward** -- If deploying takes 1 hour, rollback should take 5 minutes
4. **Feature flags preferred** -- Allow instant rollback without redeployment
5. **Scope check on every step** -- "Does this step modify anything outside the reload zone? If yes, STOP."

### L5 Scoring

Start at 100. Deductions:
- `-15` for each step without a rollback action
- `-10` for big-bang cutover (no incremental path)
- `-10` for missing verification gates
- `-5` for each step without a scope check
- Floor at 0

---

## Swap Mode: Standalone L5

If mode is `swap`:

1. **Load existing report:**
   - If a report number was specified (`swap N`), load `reports/matrix-reload/mr-{NNN}-*.md`
   - If no number specified, load the most recent report (highest NNN)
   - If no reports exist, print error: "No Matrix Reload reports found. Run `/matrix-reload` or `/matrix-reload deep` first to generate a baseline report." STOP.

2. **Extract contracts from report:**
   - Parse the L3 Interface Preservation Contracts section from the report
   - If the report has no L3 section (default-mode report without contracts), print error: "Report mr-{NNN} does not contain interface contracts. Run `/matrix-reload deep` to generate a report with L3-L5 analysis." STOP.

3. **Extract L4 design from report:**
   - Parse the L4 Clean Rebuild Design section
   - If no L4 section exists, use L2 zone boundary and L3 contracts as the basis for the swap plan

4. **Run L5 only:**
   - Generate a hot swap plan using the extracted contracts and design
   - Follow all L5 steps above

5. **Output to terminal:**
   - Print the full swap plan with all steps, rollbacks, and scope checks
   - Do NOT save a new report
   - Include the Scope Creep Alert

---

## History Mode

If mode is `history`:

1. **Glob for reports:**
   ```bash
   ls reports/matrix-reload/mr-*.md 2>/dev/null | sort
   ```

2. **If no reports exist:**
   Print: "No Matrix Reload reports found. Run `/matrix-reload` to generate your first analysis." STOP.

3. **Extract frontmatter from each report:**
   Parse YAML frontmatter for: report_number, date, mode, pain_map_score, isolation_score, interface_score, rebuild_score, hot_swap_score, composite_score

4. **Display score trend table:**
   ```
   === Matrix Reload History ===

   | Run | Date       | Mode    | L1  | L2  | L3  | L4  | L5  | Composite | Delta |
   |-----|------------|---------|-----|-----|-----|-----|-----|-----------|-------|
   | 001 | 2026-02-10 | default | 85  | 72  | --  | --  | --  | 79        | --    |
   | 002 | 2026-02-12 | deep    | 88  | 75  | 82  | 79  | 71  | 79        | +0    |
   | 003 | 2026-02-15 | default | 90  | 80  | --  | --  | --  | 85        | +6    |

   Reports: 3
   Trajectory: Improving
   Best composite: 85 (Run 003)
   Worst composite: 79 (Run 001)

   Reports directory: reports/matrix-reload/
   ```

5. **Trajectory calculation:**
   - Based on last 3 composite scores
   - All rising or flat = "Improving"
   - All declining or flat = "Declining"
   - Mixed = "Stable"
   - Fewer than 3 runs = "Insufficient Data"

---

## Report Generation

### Default Mode Report

After L1 + L2 complete in default mode, generate a numbered report.

### Deep Mode Report

After L1 + L2 + L3 + L4 + L5 complete in deep mode, generate a numbered report with all 5 layers.

### 1. Determine Report Number

```bash
# Glob for existing reports
ls reports/matrix-reload/mr-*.md 2>/dev/null | sort
```

Extract the highest NNN from existing filenames. Next report = max + 1, zero-padded to 3 digits. If no reports exist, start at 001.

### 2. Create Report Directory

```bash
mkdir -p reports/matrix-reload
```

**Description slug generation for mr- reports:**
- Derive from the reload zone or primary module:
  - E.g., analyzing auth module -> `"auth-module-reload"`
  - Full project scan -> `"full-project-pain-map"`
  - Deep mode -> `"deep-reload-plan"`
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

### 3. Write Report

Filename: `reports/matrix-reload/mr-{NNN}-{YYYY-MM-DD}-{slug}.md`

**Default mode report structure:**

```markdown
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "default"
target_path: "{analyzed path}"
language: "{primary language detected}"
files_analyzed: {N}
pain_hotspots: {N}
reload_zone_files: {N}
reload_zone_pct: "{N}%"
pain_map_score: {L1_score}
isolation_score: {L2_score}
interface_score: "N/A"
rebuild_score: "N/A"
hot_swap_score: "N/A"
composite_score: {composite}
previous_composite: {prev_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Matrix Reload Report #{NNN}

**Date:** {YYYY-MM-DD}
**Mode:** default
**Target:** {project path}
**Language:** {primary language}
**Files Analyzed:** {N}

## Executive Summary

{1-3 sentence summary: top pain areas, reload zone size, isolability verdict, and recommendation}

## L1: Pain Heat Map

{Full pain heat map table from L1}

**L1 Score:** {score}/100
**Dimensions analyzed:** {list}
**Dimensions skipped:** {list or "none"}

## L2: Reload Zone

### Zone Boundary
{IN/OUT tables from L2}

### Boundary Interfaces
{Interface table from L2}

### Isolability Verdict
**{Isolatable | Partially Isolatable | Too Distributed}**
{Explanation}

### Zone Dependency Diagram
{Mermaid diagram from L2}

**L2 Score:** {score}/100

## Composite Score

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Pain Mapping | {score} | 0.50* | {weighted} |
| L2 80/20 Isolation | {score} | 0.50* | {weighted} |
| L3 Interface Contracts | N/A | -- | -- |
| L4 Rebuild Design | N/A | -- | -- |
| L5 Hot Swap Plan | N/A | -- | -- |

*Weights redistributed from unavailable L3-L5 layers.

**Composite Score: {score}/100**

+============================================================+
|                    SCOPE CREEP ALERT                        |
|                                                            |
|  The reload zone boundary is a HARD LINE.                  |
|                                                            |
|  IN the zone:  {N} files listed above                      |
|  OUT of zone:  EVERYTHING ELSE                             |
|                                                            |
|  If you feel the urge to modify something outside the      |
|  reload zone, STOP and reassess. Scope creep is the #1     |
|  killer of rewrites.                                       |
|                                                            |
|  The boundary exists to protect you. Respect it.           |
+============================================================+

## Score Trend
{Only if 2+ reports exist -- see trend table format below}
```

**Deep mode report structure:**

```markdown
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "deep"
target_path: "{analyzed path}"
language: "{primary language detected}"
files_analyzed: {N}
pain_hotspots: {N}
reload_zone_files: {N}
reload_zone_pct: "{N}%"
pain_map_score: {L1_score}
isolation_score: {L2_score}
contracts_mapped: {N}
contracts_high_criticality: {N}
interface_score: {L3_score}
rebuild_score: {L4_score}
hot_swap_score: {L5_score}
swap_steps: {N}
rollback_coverage: "{N}%"
composite_score: {composite}
previous_composite: {prev_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Matrix Reload Report #{NNN} (Deep Analysis)

**Date:** {YYYY-MM-DD}
**Mode:** deep
**Target:** {project path}
**Language:** {primary language}
**Files Analyzed:** {N}

## Executive Summary

{1-3 sentence summary covering all 5 layers: pain areas, zone boundary, contract count, rebuild approach, swap plan readiness}

## L1: Pain Heat Map

{Full pain heat map table from L1}

**L1 Score:** {score}/100
**Dimensions analyzed:** {list}
**Dimensions skipped:** {list or "none"}

## L2: Reload Zone

### Zone Boundary
{IN/OUT tables from L2}

### Boundary Interfaces
{Interface table from L2}

### Isolability Verdict
**{Isolatable | Partially Isolatable | Too Distributed}**
{Explanation}

### Zone Dependency Diagram
{Mermaid diagram from L2}

**L2 Score:** {score}/100

## L3: Interface Preservation Contracts

**Contracts mapped:** {N}
**High criticality:** {N} | **Medium:** {N} | **Low:** {N}
**Direction:** {N} inbound | {N} outbound | {N} bidirectional

### Contract Inventory
{Contract table from L3}

### Contract Details
{Detailed contract entries from L3 -- signature, consumers, test stub for each}

**L3 Score:** {score}/100

## L4: Clean Rebuild Design

### Root Cause Analysis
{Root causes table from L4}

### Architecture Pattern
**Pattern:** {chosen pattern}
**Rationale:** {why this pattern for this zone}

### Proposed Module Structure
{New file layout from L4}

### Interface Compliance Matrix
{Contract compliance table from L4}

### Key Design Decisions
{Design decisions with rationale from L4}

### Rebuild Design Diagram
{Mermaid diagram from L4}

**L4 Score:** {score}/100

## L5: Hot Swap Plan

### Pre-Swap Preparation
{Preparation steps from L5}

### Build Strategy
**Strategy:** {bottom-up | contract-in | pain-out}
**Rationale:** {why this strategy}

### Swap Steps
{All swap steps from L5 with actions, scope checks, verifications, and rollbacks}

### Verification Gates
{Gate table from L5}

### Full Rollback Plan
{Reverse-order rollback from L5}

**L5 Score:** {score}/100
**Swap steps:** {N}
**Rollback coverage:** {N}% (steps with rollback / total steps)

## Composite Score

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Pain Mapping | {score} | 0.20 | {weighted} |
| L2 80/20 Isolation | {score} | 0.20 | {weighted} |
| L3 Interface Contracts | {score} | 0.20 | {weighted} |
| L4 Rebuild Design | {score} | 0.20 | {weighted} |
| L5 Hot Swap Plan | {score} | 0.20 | {weighted} |

**Composite Score: {score}/100**

+============================================================+
|                    SCOPE CREEP ALERT                        |
|                                                            |
|  The reload zone boundary is a HARD LINE.                  |
|                                                            |
|  IN the zone:  {N} files listed above                      |
|  OUT of zone:  EVERYTHING ELSE                             |
|                                                            |
|  If you feel the urge to modify something outside the      |
|  reload zone, STOP and reassess. Scope creep is the #1     |
|  killer of rewrites.                                       |
|                                                            |
|  The boundary exists to protect you. Respect it.           |
+============================================================+

## Full Reload Plan Diagram

{Mermaid diagram showing the complete reload plan: zone boundary + contracts + new design + swap flow}

```mermaid
graph TB
    subgraph L1_L2 ["Analysis (L1-L2)"]
        PAIN[Pain Map<br/>Top: {file}]
        ZONE[Reload Zone<br/>{N} files]
        PAIN --> ZONE
    end

    subgraph L3 ["Contracts (L3)"]
        CONTRACTS[{N} contracts<br/>{N} high-crit]
    end

    subgraph L4 ["Design (L4)"]
        DESIGN[{pattern} pattern<br/>{N} new modules]
    end

    subgraph L5 ["Swap (L5)"]
        SWAP[{N} steps<br/>{N}% rollback coverage]
    end

    ZONE --> CONTRACTS
    CONTRACTS --> DESIGN
    DESIGN --> SWAP

    style L1_L2 fill:#ff000020,stroke:#ff0000
    style L3 fill:#ffaa0020,stroke:#ffaa00
    style L4 fill:#0000ff20,stroke:#0000ff
    style L5 fill:#00ff0020,stroke:#00ff00
`` `

## Score Trend
{Only if 2+ reports exist -- see trend table format}
```

(Remove the space in the closing triple backtick above.)

### 4. Score Trend Table (when 2+ reports exist)

Read previous reports from `reports/matrix-reload/mr-*.md`, extract YAML frontmatter scores, and produce:

```markdown
## Score Trend

| Run | Date | L1 | L2 | L3 | L4 | L5 | Composite | Delta |
|-----|------|----|----|----|----|----|-----------|-------|
| 001 | Feb 10 | 85 | 72 | -- | -- | -- | 79 | -- |
| **002** | **Feb 15** | **88** | **75** | **82** | **79** | **71** | **79** | **+0** |

Trajectory: {Improving | Declining | Stable | Insufficient Data}
```

Bold the current run. Trajectory is based on the last 3 runs:
- All rising or flat = "Improving"
- All declining or flat = "Declining"
- Mixed = "Stable"
- Fewer than 3 runs = "Insufficient Data"

### 5. Compute Composite Score

**Full formula (all layers available):**
```
composite = (L1 x 0.20) + (L2 x 0.20) + (L3 x 0.20) + (L4 x 0.20) + (L5 x 0.20)
```

**When some layers are N/A (default mode):**
Redistribute weight equally among available layers. For default mode (L1 + L2 only):
```
composite = (L1 x 0.50) + (L2 x 0.50)
```

---

## Terminal Output Summary

After report generation (or instead of it for quick/zone modes), print a concise summary:

### Quick / Zone Mode Output

```
=== Matrix Reload ===

Mode: {mode}
Target: {path}
Language: {language}
Files analyzed: {N}

Top 3 Pain Files:
  1. {file} (pain: {score}, top: {dimension})
  2. {file} (pain: {score}, top: {dimension})
  3. {file} (pain: {score}, top: {dimension})

{For zone mode:}
Zone: {path}
Isolability: {verdict}
L2 Score: {score}/100

+============================================================+
|  SCOPE CREEP ALERT: The reload zone boundary is a HARD     |
|  LINE. Do NOT modify files outside the zone.               |
+============================================================+
```

### Default Mode Output

```
=== Matrix Reload ===

Mode: default
Target: {path}
Language: {language}
Files analyzed: {N}

Top 3 Pain Files:
  1. {file} (pain: {score}, top: {dimension})
  2. {file} (pain: {score}, top: {dimension})
  3. {file} (pain: {score}, top: {dimension})

Reload Zone: {N} files ({pct}% of codebase)
Isolability: {verdict}
Composite Score: {score}/100

Report saved: reports/matrix-reload/mr-{NNN}-{YYYY-MM-DD}.md

+============================================================+
|  SCOPE CREEP ALERT: The reload zone boundary is a HARD     |
|  LINE. Do NOT modify files outside the zone.               |
+============================================================+
```

### Deep Mode Output

```
=== Matrix Reload (Deep Analysis) ===

Mode: deep
Target: {path}
Language: {language}
Files analyzed: {N}

Top 3 Pain Files:
  1. {file} (pain: {score}, top: {dimension})
  2. {file} (pain: {score}, top: {dimension})
  3. {file} (pain: {score}, top: {dimension})

Reload Zone: {N} files ({pct}% of codebase)
Isolability: {verdict}
Contracts: {N} mapped ({N} high-criticality)
Rebuild: {architecture pattern} pattern, {N} new modules
Swap Plan: {N} steps, {N}% rollback coverage

Scores:
  L1 Pain Mapping:          {score}/100
  L2 80/20 Isolation:       {score}/100
  L3 Interface Contracts:   {score}/100
  L4 Rebuild Design:        {score}/100
  L5 Hot Swap Plan:         {score}/100
  ----------------------------------
  Composite:                {score}/100

Report saved: reports/matrix-reload/mr-{NNN}-{YYYY-MM-DD}.md

+============================================================+
|  SCOPE CREEP ALERT: The reload zone boundary is a HARD     |
|  LINE. Do NOT modify files outside the zone.               |
+============================================================+
```
