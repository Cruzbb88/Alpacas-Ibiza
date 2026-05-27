# Gigafactory — Execution Logic

> *"Don't build the product. Build the machine that builds the product."*

This file contains the full execution protocol for all Gigafactory layers: L1 (Generator Detection), L2 (Factory Design), L3 (Scale Test Validation), and L4 (Documentation & Packaging).

---

## Pre-Execution Setup

1. **Determine mode** from arguments:
   - No args or user request context → Default mode (L1 + L2)
   - `quick` → Quick mode (L1 only)
   - `full` → Full mode (L1 → L2 → L3 → L4)
   - `generate <config>` → Generate mode (L2 → L3, using existing generator blueprint)
   - `roast [section]` or `audit [section]` → Roast mode (S0 → Roast Protocol)

2. **Detect project language** by scanning the working directory:
   ```
   Count file extensions: .ts/.tsx, .js/.jsx, .py, .go, .rs, .java, etc.
   Primary language = most common extension family
   ```
   Use Glob to count. Keep it simple — just the top language.

3. **Identify the target** — what the user wants to build. If not clear from context or the user's message, ask them directly:
   > "What are you looking to build? Describe the thing you need, and I'll assess whether it should be a one-off build or a generator."

---

## Mode Routing

### Default Mode (no args)
Run L1 + L2, then generate report. Same as 07a behavior.

### Quick Mode (`quick`)
Run L1 only. See [Quick Mode Specifics](#quick-mode-specifics) below.

### Full Mode (`full`)
Run all 4 layers sequentially:
1. **L1** — Generator Detection (assess replication potential)
2. **L2** — Factory/Generator Design (design config schema, templates, example output)
3. **L3** — Scale Test Validation (generate 3 variations, validate them)
4. **L4** — Documentation & Packaging (produce README, examples, self-contained package)

If L1 returns a "one-off" verdict, exit early — do not proceed to L2-L4.

Generate a full report including all 4 layer scores and the composite.

### Generate Mode (`generate <config-path>`)
For running an **existing** generator blueprint with a new config. Skips L1 entirely.

1. **Load existing generator blueprint** — Locate the most recent Gigafactory report in the project's reports directory (`reports/gigafactory/gf-*.md`). Extract the L2 design (config schema, template structure, output directory). If no report exists, error: "No existing generator design found. Run `/gigafactory` or `/gigafactory full` first to create one."

2. **Load the config file** — Read the user-provided config at `<config-path>`. Validate it against the generator's config schema. If validation fails, report the errors and stop.

3. **Run L2 (Apply Config)** — Using the existing generator blueprint, apply the provided config to produce the full set of output files. Score L2 based on how cleanly the config maps to the existing design.

4. **Run L3 (Validate Output)** — Run the standard L3 validation protocol against the generated output. For generate mode, L3 still creates 3 variations (minimal/typical/maximal) but uses the provided config as the "typical" variation, then derives minimal and maximal from it.

5. **Generate report** — Save report with `mode: "generate"`, including L2 and L3 scores. L1 and L4 are marked as "N/A — generate mode". Composite uses only L2 and L3 weights, normalized: `composite = (L2 x 0.636) + (L3 x 0.364)`.

---

## Step 0: Config Discovery (runs in ALL modes)

**Core question: "What config-driven architecture already exists in this project?"**

Before assessing replication potential or designing generators, inventory the project's existing YAML config ecosystem. This prevents designing patterns that already exist and ensures new generators extend established architecture.

### 0.1: Discover Existing Configs

Glob for YAML configs in common locations (stop after first hit per pattern):

```
{project}/config/**/*.yaml
{project}/packages/*/config/**/*.yaml
{project}/src/config/**/*.yaml
{project}/**/*.yaml (max depth 2, exclude node_modules, .next, dist)
```

For each config found, read the first 30 lines to extract: version, top-level keys, any YAML anchors/aliases.

### 0.2: Discover Config Loaders

Glob for TypeScript/JavaScript config consumers:

```
{project}/src/lib/*config*.ts
{project}/src/lib/load-*.ts
{project}/packages/*/src/lib/*config*.ts
```

For each loader found, read the first 50 lines to identify: which YAML files it imports, the loading pattern (webpack require, dynamic import, fs.readFileSync), and memoization approach.

### 0.3: Categorize by Pattern Type

Classify each config into one of these pattern types (see `references/config-discovery-patterns.md`):

| Pattern | Signals | Extension Method |
|---------|---------|-----------------|
| **Navigation** | `items[]`, `sections[]`, `visible_to`, `feature_flag` | Add entries to existing nav YAML |
| **Module-as-Config** | `schema_version`, `module`, `data_source`, `data_table.columns[]` | Drop new `modules/{name}.yaml` file |
| **Template/Variant** | `templates/`, `audiences/`, per-entity YAML files | Add new YAML file following existing schema |
| **Feature Flags** | `published`, `wip`, `target_release` | Add entries to existing flags YAML |
| **Standalone** | Unique structure, dedicated loader | Assess if it should be generalized |

### 0.4: Output Config Landscape

Produce a "Config Landscape" section for the report (or print to terminal in quick mode):

```
### Config Landscape ({N} configs, {M} loaders, {P} patterns)

| Category | Files | Pattern | Loader | Extensible? |
|----------|-------|---------|--------|-------------|
| Navigation | 8 | Multi-file merge + defaults | nav-config.ts | Yes -- add YAML |
| Module | 5 | Universal data table renderer | load-module-config.ts | Yes -- drop YAML |
| ... | ... | ... | ... | ... |
```

### 0.5: Page Template System Check

**This step runs automatically when the project has a page template system.**

1. **Detect template system:** Glob for `**/UniversalPageRenderer.tsx` or `**/PageShell.tsx`. If found, the project has a page template system.

2. **Load audit data:** Check for `config/page-template-audit.yaml`. If it exists, read the `summary` section:
   - How many pages use templates vs raw layouts?
   - What template types exist vs are needed?
   - What's the migration status?

3. **Template coverage assessment:** Add a "Page Template Coverage" line to the Config Landscape:
   ```
   Page Templates: X/Y pages template-powered | Types: data-table, dashboard, canvas | TODO: detail-view, form
   ```

4. **Generator design gate:** For ANY generator being designed in L2 that creates new pages or UI:
   - REQUIRE `page_type` in the module YAML config schema
   - REQUIRE the generated page to use `UniversalPageRenderer` or the appropriate template component
   - If the needed `page_type` doesn't exist yet, include designing the new template as a generator deliverable
   - FLAG any design that creates raw `<div>` layouts as a violation

5. **Cross-reference with Module-as-Config:** If the project has module YAML configs (`config/modules/*.yaml`), new pages should get both:
   - A module YAML config (data source, columns, permissions)
   - A page using UniversalPageRenderer with `moduleId` pointing to that config

### 0.6: Cross-Reference Rule

In ALL subsequent layers (L1-L4), apply this rule before recommending any new config:

> **EXTEND FIRST:** If an existing config pattern can serve the need, recommend extending it (add entries, add a new YAML file following the existing schema). Only design a NEW pattern if existing patterns are genuinely insufficient. Justify the "NEW" decision.

> **TEMPLATE FIRST:** If the generator creates pages, all pages MUST use the project's page template system. No raw div layouts. No manual breadcrumbs. No hand-rolled page headers. Use PageShell + PageHeader + the appropriate template type.

---

## L1: Generator Detection (Weight: 30%)

**Core question: "Will you ever need another one of these?"**

### Step 1: Request Analysis

Parse the user's request and restate it as a pattern:
- **Original request:** What the user asked for verbatim
- **Restated as pattern:** The generalized version (e.g., "a REST endpoint for users" becomes "a REST CRUD endpoint for any entity")
- **Domain:** The area of the codebase this touches (API, UI, data, infra, etc.)

### Step 2: Pattern Recognition

Classify against known replicable patterns. Consult `references/generator-patterns.md` for the full catalog.

| Pattern Type | Signal Words | Typical Replication Potential |
|-------------|-------------|------------------------------|
| CRUD endpoint | "API endpoint", "REST", "route", "resource" | High |
| UI component | "component", "widget", "page", "view" | High |
| Service/module | "service", "microservice", "worker", "handler" | High |
| Migration | "migration", "schema change", "table", "alter" | High |
| Config file | "config", "environment", "settings", ".env" | Medium |
| Utility function | "helper", "util", "wrapper", "adapter" | Medium |
| CLI command | "command", "subcommand", "CLI", "flag" | Medium |
| Infrastructure | "terraform", "docker", "deploy", "k8s" | Medium |
| One-off script | "script", "one-time", "migration script", "seed" | Low |
| Unique logic | "algorithm", "specific calculation", "custom" | One-off |

If the request doesn't clearly match a pattern, look at the project for existing similar files. If there are 2+ files that follow the same structure, that's evidence of replication potential even without signal words.

### Step 3: Dimension Extraction

For replicable patterns, identify **parameterizable dimensions** — what changes between instances:

**CRUD endpoint example:**
- Entity name (User, Product, Order)
- Fields (name, type, validation rules for each)
- Relationships (belongsTo, hasMany)
- Authentication requirements (public, auth, admin)
- Pagination (yes/no, page size)

**UI component example:**
- Component name
- Props (name, type, required/optional, default)
- Styling variants (size, color, theme)
- Event handlers (onClick, onChange, etc.)
- Child slots/composition patterns

**Service example:**
- Service name
- Dependencies (injected services)
- Interface methods (name, params, return type)
- Error handling strategy
- Logging/telemetry hooks

Output these as a structured list under "Parameterizable Dimensions."

### Step 4: YAML Config Identification (Cross-Reference Config Landscape)

**FIRST:** Check the Config Landscape from Step 0. For each potential config need below, check if an existing config pattern already serves it. If yes, recommend EXTENDING the existing config (add entries/files) rather than creating new ones.

Scan the target project and the generator design for data that should live in YAML config files rather than being hardcoded. Apply the YAML-Config-First escalation triggers:

| Trigger | What to Look For |
|---------|-----------------|
| **3+ repeated data items** | Arrays of similar objects (nav items, seed records, alert thresholds, category lists, feature flags) |
| **Non-dev editors** | Settings that a product owner, designer, or ops person would need to change without touching code |
| **Shared across 2+ scripts/generators** | Port configs, health check URLs, auth settings, API base URLs, environment names |
| **Environment-dependent** | Values that differ between localhost, staging, and production (URLs, feature flags, rate limits) |

For each identified opportunity, record:
1. **Config name** — What the YAML file would be called (e.g., `categories.yaml`, `alerts.yaml`, `deploy-targets.yaml`)
2. **Data it holds** — What repeated/shared/env-dependent data moves into this config
3. **Consumers** — Which generators, scripts, or features would read from this config
4. **Schema validation** — Whether this config needs a pydantic model for validation (yes if: complex nested structure, strict type constraints, or consumed by multiple systems)

**Integration with generator design:** If a generator's config schema includes data that meets YAML escalation triggers, note that the generator should read from a shared YAML config rather than embedding that data in each instance's config. This is the data layer that feeds the generator.

### Step 5: Replication Verdict

Based on pattern type, dimension count, and project evidence, classify:

| Verdict | Criteria | Action |
|---------|----------|--------|
| **One-off** | Unique logic, no similar files exist, <2 dimensions | Exit Gigafactory. Offer to build directly. |
| **Low** | Some pattern match but few dimensions, 1-2 future instances likely | Suggest generator but offer direct build as alternative. |
| **Medium** | Clear pattern match, 3-5 dimensions, 3-5 future instances likely | Recommend generator. Explain ROI. |
| **High** | Strong pattern match, 5+ dimensions, 5+ future instances likely | Strongly recommend generator. Quantify time savings. |

**One-off exit path:**
If the verdict is "one-off," output the assessment and exit:
> "This looks like a one-off build — I don't see strong replication potential. Want me to just build it directly?"

Do NOT proceed to L2 for one-off verdicts. Do NOT save a report for one-off quick assessments.

### L1 Scoring

Start at **100**. Deductions:
| Issue | Deduction |
|-------|-----------|
| Replication potential misclassified (e.g., clearly replicable pattern called "one-off") | -30 |
| Parameterizable dimensions incomplete (missed obvious dimensions) | -20 |
| Pattern type unrecognized when it should be obvious | -15 |
| Replication verdict doesn't match the evidence | -10 |
| YAML config opportunities missed (obvious repeated data or shared configs not identified) | -10 |

Self-assess honestly. The score reflects the quality of the detection, not the replication potential itself.

---

## L2: Factory/Generator Design (Weight: 35%)

**Only runs if L1 verdict is low, medium, or high.**

For low verdicts, proceed but note that a direct build may be equally appropriate. For medium/high, proceed with full generator design.

### Step 1: Config Schema Design

Consult `references/config-schema-guide.md` before designing the schema.

Design the input configuration that drives generation:
- **Format:** JSON or YAML (match project conventions; default to YAML for readability)
- **Required fields:** All parameterizable dimensions from L1 that have no sensible default
- **Optional fields:** Dimensions with sensible defaults (include the defaults)
- **Naming:** camelCase for JS/TS projects, snake_case for Python projects
- **Validation:** Note which fields have constraints (e.g., entity name must be PascalCase)
- **Nested config:** Use sub-objects for complex dimensions (e.g., field definitions with type/validation)

Present the config schema as either a JSON Schema or TypeScript interface (match project language), followed by one filled-in example.

### Step 2: Template Structure Design

Define what files the generator produces. For each output file:

```
File: {path pattern with variables}
Approach: template | AST | hybrid
Constant sections: [list what stays the same]
Variable sections: [list what changes per config]
```

Example for a CRUD endpoint generator:
```
File: src/routes/{entityName}.ts
Approach: template
Constant: Express router setup, error handling middleware
Variable: Route paths, handler logic, validation schema

File: src/models/{entityName}.ts
Approach: hybrid (template structure + AST for field definitions)
Constant: Base model class, common methods
Variable: Field definitions, relationships, indices

File: src/tests/{entityName}.test.ts
Approach: template
Constant: Test setup/teardown, describe blocks
Variable: Test cases for each endpoint, fixture data
```

### Step 3: Output Directory Structure

Define where the generator and its output live:

```
Generator location:  {project_root}/generators/{generator_name}/
  +-- config-schema.json    (JSON Schema for validation)
  +-- templates/             (template files)
  +-- README.md              (generated by L4)
  +-- examples/              (populated by L4)
  +-- output-sample/         (populated by L4)

Generated output:    {project-appropriate directories}
  e.g., src/routes/, src/models/, src/tests/
```

Adapt to project conventions. If the project already has a `scripts/` or `tools/` directory, place the generator there instead.

### Step 4: Generation Approach Selection

Choose based on output complexity:

| Approach | Best For | Use When |
|----------|----------|----------|
| **Template-based** (string interpolation) | Config files, simple CRUD, boilerplate | Output structure is predictable, minimal conditional logic |
| **AST-based** (code construction) | Complex logic, type-safe generation | Output has significant conditional branching, needs type safety |
| **Hybrid** | Most generators | Template for structure, AST for logic-heavy sections |

Justify your choice based on the specific generator being designed.

### Step 5: Example Output

**This step is non-negotiable.** A generator design without a concrete example is untestable.

1. Create a realistic sample config (not trivial — use a real-world-ish entity)
2. Show the complete output the generator would produce from that config
3. For each generated file, show the full content (not snippets)

This proves the design works and gives the user a concrete preview.

### Step 6: YAML Config Integration (EXTEND vs NEW)

**For each config need, explicitly classify as EXTEND or NEW:**

- **EXTEND**: An existing config pattern from the Config Landscape (Step 0) can serve this need. Show the exact YAML entries to add to the existing file. No new loader needed.
- **NEW**: No existing pattern is sufficient. Justify why, then design a new config file + loader.

Revisit the YAML config opportunities identified in L1 Step 4 and integrate them into the generator design:

1. **Externalize shared data** — For each YAML config opportunity, show how the generator would read from the config file instead of hardcoding. Example: if the generator creates alert rules, the thresholds should come from `alerts.yaml` rather than being baked into each generated file.

2. **Config file templates** — For each identified YAML config, produce a sample file showing the structure:
   ```yaml
   # categories.yaml — consumed by {generator-name}
   # Schema: config/schemas/categories.py (pydantic v2)
   version: "1.0"
   categories:
     - name: "..."
       slug: "..."
       icon: "..."
   ```

3. **Generator config vs. shared YAML config** — Clarify the boundary:
   - **Generator config** (per-instance): Entity name, fields, relationships — things unique to each generated instance
   - **Shared YAML config** (project-wide): Categories, feature flags, environment URLs, alert thresholds — things consumed by multiple generated instances or other parts of the codebase

If no YAML config opportunities were identified in L1, note "No YAML config opportunities identified — all data is instance-specific" and skip this step.

### L2 Scoring

Start at **100**. Deductions:
| Issue | Deduction |
|-------|-----------|
| Config schema incomplete (missing dimensions from L1) | -25 |
| No example output provided | -20 |
| Template structure unclear or inconsistent | -15 |
| Generation approach inappropriate for complexity level | -10 |
| Output directory structure doesn't follow project conventions | -10 |

---

## L3: Scale Test Validation (Weight: 20%)

**Only runs in `full` mode or `generate` mode.**

Consult `references/validation-protocol.md` for detailed variation strategies and hardcoding detection patterns.

**Core question: "Does this generator actually work at scale, or is it secretly hardcoded?"**

### Step 1: Config Variation Generation

Create exactly **3** distinct config files that exercise different dimensions of the generator. Each variation must test a different failure mode:

#### Variation 1: Minimal
- Only required fields, all defaults accepted
- Tests: Does the generator handle missing optional fields gracefully? Are defaults applied correctly?
- Example: A CRUD endpoint with just an entity name and one field — no optional auth, no pagination, no relationships.

#### Variation 2: Typical
- A realistic, mid-complexity config representing the most common use case
- Tests: Does the generator handle the primary value proposition correctly?
- Example: A CRUD endpoint with 4-6 fields, one relationship, auth enabled, standard pagination.
- In `generate` mode, the user-provided config IS the typical variation.

#### Variation 3: Maximal
- All optional fields populated, edge-case values, unusual combinations
- Tests: Does the generator handle full complexity without breaking?
- Example: A CRUD endpoint with 10+ fields, multiple relationships, admin+user auth, custom pagination, soft deletes, audit logging.

**Requirements for all 3 variations:**
- Each must be a valid, complete JSON config file
- Each must be meaningfully distinct (not just renamed variables — see `references/validation-protocol.md` for "meaningfully distinct" guidance)
- Each must exercise different code paths in the generator

### Step 2: Generation Execution

Run the L2 generator design against each config variation:

1. For each variation (minimal, typical, maximal):
   a. Apply the config to the template structure from L2
   b. Produce the complete set of output files as specified in the generator blueprint
   c. Save the output to a labeled directory: `{generator}/output-{variation}/`

2. Track what was generated:
   - List all files produced per variation
   - Note any files that failed to generate or were skipped

### Step 3: Validation Checks

For each generated variation, verify the following. Consult `references/validation-protocol.md` for the detailed checklist.

#### Completeness
- All files specified in the L2 blueprint were produced for each variation
- No extra unexpected files were generated
- File paths match the expected patterns (config values correctly interpolated into paths)

#### Distinctness
- Compare each pair of variations (minimal vs typical, typical vs maximal, minimal vs maximal)
- At least 3 meaningful differences must exist between each pair (not just variable name changes)
- "Meaningful" = different code paths, different file counts, different structural elements, different validation rules
- If two variations produce nearly identical output, the generator is likely hardcoded

#### Parameterization
- Grep all generated outputs for literal values from each config
- No config value should appear as a hardcoded string in another variation's output
- Example: If minimal config has `entity_name: "Task"`, the word "Task" should NOT appear in the typical or maximal outputs

#### Syntax Validity
- Check generated code for syntax correctness:
  - JS/TS: Look for unclosed braces, missing semicolons, invalid imports, template literal artifacts (`${...}` that weren't resolved)
  - Python: Look for indentation errors, unclosed parentheses, invalid f-string syntax, unresolved placeholders
  - Generic: Look for `undefined`, `null` appearing where real values should be, placeholder text like `TODO` or `FIXME`

#### Consistency
- Naming conventions are uniform across all 3 variations (all camelCase or all snake_case, not mixed)
- File structure follows the same pattern in each variation
- Code style is consistent (same indentation, same import ordering approach)

### Step 4: Hardcoding Audit

This is the most critical validation step. Specifically scan all generated outputs for:

1. **Literal string matches** — Grep each variation's output for config values from OTHER variations. If "Task" (from minimal) appears in typical output, that's hardcoded.

2. **Magic numbers** — Scan for numeric literals that should be configurable:
   - Port numbers (3000, 8080, 5432)
   - Page sizes (10, 20, 50)
   - Timeouts (30, 60, 300)
   - Array sizes, limits, thresholds

3. **Unparameterized paths** — Look for:
   - Hardcoded file paths (`/src/models/User.ts` instead of `/src/models/{entity}.ts`)
   - Hardcoded import paths that assume a specific project structure
   - Hardcoded URLs or API endpoints

4. **Language-specific patterns** — See `references/validation-protocol.md` for JS/TS and Python detection patterns.

Record every hardcoded value found with:
- The file and line where it appears
- What config field should drive it
- Severity (critical if it would break another variation, minor if cosmetic)

### L3 Scoring

Start at **100**. Deductions:

| Issue | Deduction |
|-------|-----------|
| Any variation fails to produce all expected files | -25 |
| Variations are not meaningfully distinct | -20 |
| Hardcoded value found that should be parameterized | -15 each |
| Syntax errors in generated code | -10 |
| Naming inconsistencies across variations | -5 |

**Score floor:** 0 (do not go negative).

Report all deductions with specific evidence (file, line, what was found).

---

## L4: Documentation & Packaging (Weight: 15%)

**Only runs in `full` mode.**

**Core question: "Could someone else use this generator without asking me how?"**

### Step 1: Generator README

Produce a `README.md` for the generator. This should be **auto-generated** from the L2 blueprint and L3 validation results — not hand-written.

The README must include:

1. **Title and Summary** — What the generator creates (one sentence)
2. **Config Schema Documentation** — All fields with:
   - Field name
   - Type (string, number, boolean, array, object)
   - Required or optional
   - Default value (if optional)
   - Description of what it controls
   - Constraints/validation rules
3. **Usage Instructions** — How to run the generator with a new config:
   - Step-by-step process
   - Where to place the config file
   - What command or process to invoke
   - Where output appears
4. **Example Configs** — Reference all 3 variations from L3:
   - Brief description of each (minimal/typical/maximal and what they demonstrate)
   - Point to the `examples/` directory
5. **Output File Descriptions** — For each file the generator produces:
   - File path pattern
   - What the file does / its purpose
   - Key sections that change per config

### Step 2: Example Config Files

Save the 3 L3 variation configs as example files alongside the generator:

```
generators/{generator-name}/examples/
  +-- minimal.json
  +-- typical.json
  +-- maximal.json
```

Each file should be a valid, ready-to-use config. Add a brief JSON comment at the top (using a `_comment` field) explaining what the variation demonstrates:

```json
{
  "_comment": "Minimal config — required fields only, all defaults",
  "entity_name": "Task",
  "fields": [...]
}
```

### Step 3: Config Schema File

Save the config schema as actual JSON Schema for programmatic validation:

```
generators/{generator-name}/config-schema.json
```

This schema should:
- Define all required and optional fields
- Include type constraints, enums, patterns
- Include `description` for each field
- Include `default` values for optional fields
- Be usable by `generate` mode for config validation

### Step 4: Generator Packaging

Organize the generator's files into a self-contained directory structure. The directory must be **copyable to another project** without external dependencies.

```
generators/{generator-name}/
  +-- README.md                   # From Step 1
  +-- config-schema.json          # From Step 3
  +-- templates/                  # Template files from L2
  |   +-- {template-1}
  |   +-- {template-2}
  |   +-- ...
  +-- examples/                   # From Step 2
  |   +-- minimal.json
  |   +-- typical.json
  |   +-- maximal.json
  +-- output-sample/              # One complete example output (typical variation from L3)
      +-- {generated-file-1}
      +-- {generated-file-2}
      +-- ...
```

**Self-containment checklist:**
- No references to files outside the generator directory
- No dependencies on specific project structure
- README explains everything needed to use the generator
- Example configs are valid and runnable
- Output sample shows what to expect

### L4 Scoring

Start at **100**. Deductions:

| Issue | Deduction |
|-------|-----------|
| README is missing or incomplete (missing sections) | -25 |
| No example configs provided | -20 |
| Config schema documentation missing field descriptions | -15 |
| Output directory structure is not self-contained | -10 |
| Generated README has incorrect or outdated information | -10 |

---

## Composite Scoring

Calculate the composite score based on the mode:

### Full Mode (L1-L4)

```
composite = (L1_score x 0.30) + (L2_score x 0.35) + (L3_score x 0.20) + (L4_score x 0.15)
```

### Default Mode (L1-L2 only)

```
composite = (L1_score x 0.4615) + (L2_score x 0.5385)
```

L1+L2 weights are the full weights redistributed proportionally when L3/L4 are not run.

### Generate Mode (L2-L3 only)

```
composite = (L2_score x 0.636) + (L3_score x 0.364)
```

L2+L3 weights are the full weights redistributed proportionally when L1/L4 are not run.

Round all composites to the nearest integer.

---

## Report Generation

Reports are saved to the **workspace where Gigafactory was invoked** (not the skill installation directory).

Reports are generated for: **default**, **full**, and **generate** modes. NOT for quick mode with one-off verdicts.

### Step 1: Determine Report Number

```
Glob: reports/gigafactory/gf-*.md
```

If no reports exist, use `001`. Otherwise, increment the highest existing number.

### Step 2: Write Report

**File path:** `reports/gigafactory/gf-{NNN}-{YYYY-MM-DD}.md`

**Structure:**

```markdown
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{quick|default|full|generate}"
target_path: "{project path}"
language: "{primary language detected}"
replication_potential: "{one-off|low|medium|high|N/A}"
generator_type: "{endpoint|component|service|migration|cli|config|infra|custom}"
detection_score: {N_or_NA}
design_score: {N_or_NA}
validation_score: {N_or_NA}
documentation_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# Gigafactory Report #{NNN}

## Executive Summary

{One paragraph summarizing: what was analyzed, the replication verdict,
the generator type designed, validation results, and the composite score.}

## L1: Generator Detection

### Request Analysis
- **Original request:** {verbatim}
- **Restated as pattern:** {generalized}
- **Domain:** {area}

### Pattern Recognition
- **Pattern type:** {type}
- **Confidence:** {how certain is the classification}

### Parameterizable Dimensions
{Structured list of all dimensions identified}

### YAML Config Opportunities
{Table of identified YAML config extraction opportunities, or "None identified" if all data is instance-specific}

| Config File | Data It Holds | Consumers | Needs Schema |
|-------------|--------------|-----------|--------------|
| {name}.yaml | {description} | {generators/features} | Yes/No |

### Replication Verdict: {ONE-OFF | LOW | MEDIUM | HIGH}
{Justification for the verdict}

**L1 Score: {N}/100**
{Note any deductions and why}

## L2: Factory Design

### Config Schema
{JSON Schema or TypeScript interface}

### Sample Config
{One filled-in example}

### Template Structure
{File-by-file breakdown}

### Output Directory
{Directory tree}

### Generation Approach: {Template | AST | Hybrid}
{Justification}

### Example Output
{Complete generated files from sample config}

### YAML Config Integration
{How shared YAML configs feed into the generator, or "No shared configs — all data is instance-specific"}

| Config File | Sample Structure | Boundary |
|-------------|-----------------|----------|
| {name}.yaml | {key fields shown} | Shared (project-wide) |
| generator config | {per-instance fields} | Per-instance |

{For each shared config: sample YAML content, which generated files consume it, and whether it needs pydantic validation}

**L2 Score: {N}/100**
{Note any deductions and why}

## L3: Scale Test Validation

### Config Variations
{Show all 3 configs: minimal, typical, maximal}

### Generation Results
{Files produced per variation, any failures}

### Validation Results
- **Completeness:** {pass/fail with details}
- **Distinctness:** {pass/fail with evidence of differences}
- **Parameterization:** {pass/fail with any hardcoded values found}
- **Syntax validity:** {pass/fail with any errors}
- **Consistency:** {pass/fail with any inconsistencies}

### Hardcoding Audit
{List all hardcoded values found with file, line, and severity}

**L3 Score: {N}/100**
{Note all deductions with evidence}

## L4: Documentation & Packaging

### README Status
{Summary of what the generated README contains}

### Example Configs
{List of saved example files with descriptions}

### Config Schema
{Confirmation that JSON Schema was saved, key fields documented}

### Package Structure
{Directory tree of the self-contained generator package}

### Self-Containment Check
{Pass/fail — can this be copied to another project?}

**L4 Score: {N}/100**
{Note any deductions and why}

## Composite Score

| Layer | Score | Weight | Weighted |
|-------|-------|--------|----------|
| L1 Detection | {N} | 0.30 | {N} |
| L2 Design | {N} | 0.35 | {N} |
| L3 Validation | {N} | 0.20 | {N} |
| L4 Documentation | {N} | 0.15 | {N} |
| **Composite** | | | **{N}** |

{If 2+ reports exist, add score trend table:}

## Score Trend

| Report | Date | Composite | Delta | Trend |
|--------|------|-----------|-------|-------|
| gf-001 | ... | ... | - | first_run |
| gf-002 | ... | ... | +/-N | improving/declining/stable |
```

For **default mode** reports, omit L3 and L4 sections and use the 2-layer composite table.

For **generate mode** reports, omit L1 and L4 sections. Mark them as "N/A — generate mode" in frontmatter. Use the 2-layer (L2+L3) composite table.

### Step 3: Output Summary

After saving the report, print a brief summary to the terminal:
- Mode executed
- Replication verdict (if applicable)
- Generator type
- Per-layer scores
- Composite score
- Report file path
- Generator package path (if full mode)

---

## Quick Mode Specifics

When running in quick mode (`/gigafactory quick`):

1. Run L1 only (Steps 1-5 of Generator Detection)
2. Output the assessment directly to terminal — do NOT save a report for one-off verdicts
3. For non-one-off verdicts, still save a report but with `design_score: "N/A"` and composite based on L1 only
4. End with a recommendation: build directly, consider a generator, or strongly recommend a generator

---

## Roast Mode (UX/UI Audit)

When running in roast mode (`/gigafactory roast [section]` or `/gigafactory audit [section]`):

**This mode does NOT generate generators.** It produces a brutal UX/UI findings report by screenshotting and scoring every page in the platform. Channel the energy of a senior UX designer doing a teardown. Be specific about what sucks and what's good. Don't be nice, be helpful.

### Pre-Roast: Parse Section Argument

- If `[section]` is provided (e.g., `roast commercial`), filter to only that sidebar section's pages
- If no section, audit ALL sidebar pages (full platform roast)
- Section names match sidebar YAML config IDs (e.g., `supplyChain`, `quality`, `packagingArtwork`, `sourcingJourney`, `intelligence`, `knowledge`, `platformDev`, `admin`)
- Also accept kebab-case aliases: `supply-chain`, `packaging-artwork`, `sourcing-journey`

### Step S0: Config Discovery (same as other modes)

Run the standard Config Discovery (Step 0) to inventory existing YAML configs. The roast findings will reference these configs when recommending fixes (e.g., "This issue could be fixed via sidebar-nav.yaml" or "Add a layout config field to the module YAML").

### Step R1: Page Discovery

1. Read sidebar YAML configs from `config/navigation/*.yaml` (or equivalent project path)
2. Extract all navigable pages: `[{route, label, section, icon}]`
3. If `[section]` was specified, filter to only that section's pages
4. Sort by section order, then by item order within section
5. Report: "Found {N} pages to audit across {M} sections"

### Step R2: Screenshot Capture

**CRITICAL: Read `~/.claude/config/browser-automation.yaml` BEFORE any browser work.**

1. Load browser config: auth profile, viewport, wait strategies
2. Use **Playwright CLI** (NOT Chrome MCP) per project rules
3. Auth via Dev Login (Admin) using the auth profile from browser-automation.yaml
4. For each page in the page list:
   a. Navigate to the route (timeout from config, default 90s)
   b. Wait for content ready (skeleton/spinner selectors from e2e-config.yaml if available)
   c. Wait additional `post_ready_buffer` (500ms default)
   d. Take a full-page screenshot at desktop viewport (1920x1080 from config)
   e. Save to `reports/gigafactory/{report-slug}/screenshots/{NNN}-{page-slug}.png`
5. Track pages that failed to load (timeout, error, stuck on login)

### Step R3: Page Scoring

Score each page against 5 criteria, 20 points each (total 0-100 per page):

| Code | Criteria | What to Evaluate (20 points) |
|------|----------|------------------------------|
| **C** | Consistency | Does this page match the platform's visual patterns? Same header structure, same spacing/padding, same card/table styling as other pages? Same font sizes? Same button styles? Same empty state pattern? Deduct for any deviation from the majority pattern. |
| **N** | Navigation | Breadcrumbs present? Page title clear and descriptive? User knows where they are in the app? Back navigation obvious? Sidebar highlights current page? Tab/pill navigation works if present? |
| **D** | Design | Professional B2B enterprise look? Appropriate use of whitespace (not too cramped, not too spread)? Typography hierarchy clear (h1 > h2 > body)? Color usage intentional? Dark mode AND light mode both look good? Empty states look polished, not broken? |
| **A** | Accessibility | Contrast ratios adequate (text readable on background)? Interactive elements visually distinct? Loading/skeleton states present? Error states handled? Focus indicators visible? Text not clipped or overflowing? |
| **P** | Performance | Page loads in reasonable time? Skeleton/loading states shown during load? No layout shifts after content arrives? Images/charts render without delay? No console errors visible in UI? |

**Scoring guidelines:**
- 20/20: Exemplary, nothing to improve
- 15-19: Good with minor polish items
- 10-14: Acceptable but noticeable issues
- 5-9: Significant problems that hurt the experience
- 0-4: Broken or unusable

**Platform Score** = average of all page scores (0-100)

### Step R4: Generate Findings

For each issue identified during scoring, create a finding:

```
#### {CATEGORY}{NUMBER}: {Title}

**Severity:** CRITICAL | MAJOR | MINOR
**Affected Pages:** {list of pages with this issue}
**Description:** {What's wrong, be specific and direct}
**Fix:** {Recommended solution}
**Effort:** {30min | 1h | 2h | 4h | 8h}
**YAML Ref:** {If a YAML config controls this, reference it. If not, note "hardcoded"}
```

**Severity definitions:**
- **CRITICAL**: Blocks production use or client demos. Broken functionality, data not showing, page crashes, security-visible issues.
- **MAJOR**: Significant UX issue that makes the platform feel unfinished. Inconsistent layouts, missing navigation, poor contrast, jarring visual bugs.
- **MINOR**: Polish item. Spacing tweaks, icon choices, minor color adjustments, alignment issues.

**Finding categories:**
- **C** = Consistency (header patterns, spacing, component usage, styling uniformity)
- **N** = Navigation (breadcrumbs, page titles, sidebar state, location awareness)
- **D** = Design (visual quality, whitespace, typography, color, empty states, dark/light mode)
- **A** = Accessibility (contrast, focus, labels, keyboard navigation, loading states)
- **P** = Performance (load time, layout shifts, skeleton states, console errors)

Number findings sequentially within each category: C1, C2, C3, D1, D2, N1, etc.

### Step R5: Report Generation

**Report path:** `reports/gigafactory/gf-{NNN}-{YYYY-MM-DD}-{slug}-roast.md`

Determine `{NNN}` by globbing `reports/gigafactory/gf-*.md` and incrementing the highest number.

**Slug:** `platform-roast` for full platform, `{section}-roast` for targeted (e.g., `commercial-roast`)

**Report structure:**

```markdown
---
report_number: "{NNN}"
date: "{YYYY-MM-DD}"
mode: "roast"
target_path: "{project path}"
section: "{section or 'full-platform'}"
pages_audited: {N}
platform_score: {N}
findings_critical: {N}
findings_major: {N}
findings_minor: {N}
previous_roast: "{previous gf roast report number or null}"
score_delta: "{+/-N or dash}"
trend: "{improving|declining|stable|first_roast}"
---

# Gigafactory Roast #{NNN}

## Executive Summary

**Platform Score: {XX}/100**
{One brutal paragraph: what's good, what sucks, and the overall verdict.}

Pages Audited: {N} | Findings: {X} CRITICAL, {Y} MAJOR, {Z} MINOR

## Page Scores

| Page | Route | C | N | D | A | P | Total | Grade |
|------|-------|---|---|---|---|---|-------|-------|
| Dashboard | /dashboard | 18 | 12 | 16 | 15 | 17 | 78 | Good |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

**Grade scale:** 80-100 Excellent | 60-79 Good | 40-59 Fair | 0-39 Critical

## What's Actually Good

{List 3-5 things the platform does well. Be genuine, not patronizing.}

## Findings

### CRITICAL

{Findings sorted by severity, each with the full finding format from R4}

### MAJOR

{...}

### MINOR

{...}

## Recommended Fix Priority

### P0 — Fix Before Demo ({effort estimate})
{Top 3-5 critical findings with effort}

### P1 — Fix Within 2 Sprints ({effort estimate})
{Major findings grouped by theme}

### P2 — Backlog ({effort estimate})
{Minor findings, grouped}

## Config Landscape Cross-Reference

{Reference the Config Discovery from S0. For each finding that could be fixed via config:}
| Finding | Current Control | Recommended Config |
|---------|-----------------|-------------------|
| C1 | Hardcoded in page.tsx | Add `layout.max_width` to module YAML |
| ... | ... | ... |

## Screenshots

All screenshots saved to: `reports/gigafactory/{report-slug}/screenshots/`

{List screenshots with their page names}
```

### Step R6: Cortex Integration

After report generation:

```bash
cortex remember "Gigafactory Roast #{NNN}: Platform score {XX}/100. {N} pages audited. {X} CRITICAL, {Y} MAJOR, {Z} MINOR findings. Top issues: {top 3 finding titles}. Report: reports/gigafactory/gf-{NNN}-{date}-{slug}-roast.md" \
  --tags gigafactory,roast,ux-audit --importance 70
```

### Roast Mode Scoring (separate from L1-L4)

Roast mode does NOT use the L1-L4 composite scoring system. Its score IS the Platform Score (average of all page scores, 0-100). This is reported in the frontmatter as `platform_score` (not `composite_score`).

### Roast Trend Tracking

If a previous roast report exists (detected by searching for `mode: "roast"` in gf report frontmatter):

1. Compare page scores between reports (which pages improved, which declined)
2. Compare finding counts by severity
3. Note which previous findings were fixed vs still present
4. Calculate `score_delta` and set `trend`

This enables tracking UX quality over time across multiple roast runs.
