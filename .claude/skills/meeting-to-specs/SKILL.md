---
name: meeting-to-specs
description: >-
  Transform meeting notes, diagnostic documents, or transcripts into actionable
  spec files for the /build pipeline. Extracts work items, classifies types,
  scores priorities, and generates one spec per item with dependency graph and
  ROADMAP.md.
  Use when: (1) After client diagnostic meetings, (2) Converting meeting notes
  to implementation specs, (3) User has a document of issues/opportunities to
  turn into buildable work items.
argument-hint: <file-path> [--output-dir specs/todo] [--mode quick|deep]
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - mcp__omni-cortex__cortex_recall
---

# Meeting to Specs

Transform unstructured meeting notes, diagnostics, or transcripts into structured, buildable spec files.

## Mode Matrix

| Mode | Arg | Layers | Output | Sub-agents |
|------|-----|--------|--------|------------|
| Quick | `quick` | L1 only | Summary table | No |
| Default | *(none)* or `deep` | L1 + L2 | Specs + ROADMAP + summary | No |

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **File path**: The document to process (required unless searching)
2. **Mode**: `--mode quick` runs L1 only (extract + classify). Default runs both layers.
3. **Output dir**: `--output-dir <path>` overrides default `specs/todo/`

If no file path provided:
- Search for recent meeting notes: `Glob: docs/**/*.md, docs/**/*.txt, notes/**/*.md`
- Also check: `cortex_recall "meeting notes transcript"` for remembered file paths
- Present candidates sorted by modification time. Ask user to confirm.

---

## Layer 1: Extract & Classify

L1 reads the document, identifies discrete work items, classifies them, and outputs a summary table.

### Step 1.1: Read Document

Determine input size and read strategy:

```
Bash: wc -l <file-path>
```

| Document Size | Strategy |
|--------------|----------|
| < 200 lines | Read entire file at once |
| 200-500 lines | Read in 2 chunks, process sequentially |
| > 500 lines | Progressive disclosure: scan headings first, then dive into sections |

For large documents (>500 lines):
1. First pass: `Grep` for headings (`^#{1,3} `) to build section map
2. Second pass: Read each section individually, extract items per section
3. Final: Merge items across sections, deduplicate

For transcripts with timestamps/speaker labels:
- Strip timestamps, filler words ("um", "uh", "you know")
- Preserve speaker attribution only if it indicates who owns the action item

### Step 1.2: Extract Work Items

Scan the document for actionable items using these heuristics:

**Action Verbs** (strong signal):
- "build", "create", "automate", "integrate", "migrate", "fix", "replace"
- "set up", "configure", "deploy", "implement", "develop", "design"

**Pain Points** (problem -> solution = work item):
- "manual process", "takes too long", "error-prone", "no visibility"
- "breaks when", "doesn't scale", "workaround", "hack", "brittle"

**Systems Mentioned** (scope indicators):
- Specific software: ERP, CRM, Excel, Salesforce, QuickBooks, etc.
- APIs, databases, webhooks, integrations
- Platforms: Shopify, WordPress, Stripe, AWS, etc.

**Quantifiers** (complexity signals):
- "30-50 fields", "8 workshops", "3PL reports", "12 locations"
- Numbers indicate scope — higher numbers = higher complexity estimate

**Priority Signals**:
- High: "highest volume", "critical", "blocking", "urgent", "broken"
- Medium: "important", "needed", "should", "want to"
- Low: "nice to have", "eventually", "explore", "consider"

Each extracted item must have a clear deliverable (code, config, integration, UI, data model). Exclude pure discussion points, questions, or FYI items.

### Step 1.3: Classify Each Item

For each extracted work item, assign:

**Type** (one of):
| Type | When to Use |
|------|------------|
| `feature` | New capability or user-facing functionality |
| `integration` | Connecting to third-party APIs or systems |
| `migration` | Moving data, upgrading schemas, platform changes |
| `automation` | Replacing manual process with automated workflow |
| `documentation` | Guides, SOPs, runbooks, API docs |
| `infrastructure` | DevOps, hosting, CI/CD, monitoring |

**Effort**:
| Size | Time | Indicators |
|------|------|-----------|
| S | < 4h | Config change, simple script, single endpoint |
| M | 4h-2d | Small feature, basic integration, 2-3 files |
| L | 2d-1w | Full feature, complex integration, 5+ files |
| XL | > 1w | Platform migration, major new system, multi-phase |

**Priority**:
| Level | Criteria |
|-------|----------|
| P0 | Blocking/critical, system broken, revenue at risk |
| P1 | High impact, needed soon, unblocks other work |
| P2 | Medium, nice to have, improves efficiency |
| P3 | Low, backlog, exploratory |

Priority modifiers:
- Items that unblock 2+ other items: raise priority by one level
- Items described as "eventually" or "explore": cap at P2
- Items with existing workarounds: lower priority unless workaround is fragile

### Step 1.4: Deduplicate

Before finalizing the item list:

1. Group items that reference the same system/process
2. If two items are clearly part of the same feature, merge them into one
3. If one merged item would exceed 800 lines as a spec, split it back
4. Mark shared dependencies across items (same database, API, schema)

### Step 1.5: Score & Rank

For each item, compute a composite priority score:

```
Score = Impact(1-5) x Urgency(1-5) x Feasibility(1-5)
```

- **Impact**: How many users/processes benefit? (1=few, 5=everyone)
- **Urgency**: How soon is it needed? (1=someday, 5=now)
- **Feasibility**: How ready are we to build it? (1=major unknowns, 5=clear path)

Sort items by composite score (descending).

### Step 1.6: Summary Table Output

Output a summary table:

```markdown
## Extraction Summary: {source_document}

| # | Title | Type | Effort | Priority | Score | Systems | Dependencies |
|---|-------|------|--------|----------|-------|---------|-------------|
| 1 | {title} | {type} | {S/M/L/XL} | {P0-P3} | {N} | {systems} | {deps or --} |
```

**If mode is `quick`**: Stop here. Output the table and a brief analysis paragraph. Do NOT generate spec files.

**If mode is `deep` (default)**: Continue to Layer 2.

---

## Layer 2: Generate & Map

L2 generates full spec files for each item, builds a dependency graph, and creates a ROADMAP.md.

### Step 2.1: Check Existing Context

Before generating specs:

1. **Check existing specs**: `Glob: specs/**/*.md` — find highest existing spec number
2. **Check Cortex**: `cortex_recall` with keywords from each item to find related work
3. **Check CLAUDE.md**: Read for architecture decisions, completed specs, constraints

If an item overlaps with existing work:
- Note it in the summary as "Enhancement of existing spec NN"
- Frame the new spec as an extension, not a duplicate

### Step 2.2: Generate Spec Files

For each extracted item:

1. **Determine next spec number**: Start after highest existing number in `specs/todo/`
2. **Generate filename**: `{NN}-{kebab-case-title}.md` (max 5 words in slug)
3. **Read template**: `Read` the template at `references/spec-template.md` (relative to this skill)
4. **Fill template** with extracted content:

| Section | Source | Target Lines |
|---------|--------|-------------|
| Overview | Meeting notes context + item description | 30-50 |
| Background | Direct quotes from source document | 20-30 |
| Requirements | Derived from item details | 30-50 |
| Technical Approach | Based on project CLAUDE.md + systems mentioned | 50-100 |
| Task Breakdown | Phases derived from effort/complexity | 100-200 |
| Acceptance Criteria | Testable conditions from requirements | 20-30 |
| Effort/Priority | From L1 classification | 5-10 |
| Gotchas | Edge cases, integration risks | 10-20 |

**Target: 350-610 lines per spec** (matches /quick-plan guidelines)

Spec writing rules:
- Each spec must be independently buildable (given dependencies are met)
- One clear deliverable per spec
- Include enough technical detail for `/build` to execute without ambiguity
- Reference existing codebase paths and patterns when known
- Never leave placeholder text — every section must have real content
- Follow the 50% rule: if >50% is runnable code, scale back
- Add `Depends on:` and `Blocks:` headers at top of each spec

5. **Write spec** to `{output-dir}/{NN}-{slug}.md`

### Step 2.3: Cross-Reference & Dependency Graph

After all specs are written:

1. Scan each spec for shared resources (databases, APIs, schemas, config files)
2. Build a directed acyclic graph of dependencies
3. Output text-based dependency graph:

```
Dependency Graph:
  01-parser ─────────── 03-optimizer
  02-etl ──────────────┐
                       ├── 04-dashboard
  01-parser ───────────┘
  05-alerts (independent)
```

4. Topological sort into build phases:
   - Specs with NO dependencies -> Phase 1
   - Specs depending only on Phase 1 -> Phase 2
   - Continue until all specs are phased
5. Within each phase, classify as PARALLEL or SEQUENTIAL:
   - No cross-dependencies within phase -> PARALLEL (use `/agent-teams`)
   - Cross-dependencies within phase -> SEQUENTIAL (use `/build`)

### Step 2.4: Generate ROADMAP.md

Generate `{output-dir}/ROADMAP-{project-slug}.md` using the standard roadmap format from `/quick-plan`:

```markdown
# Roadmap -- {Feature/Project Name}

## Created: {date}
## Total Specs: {N} | Completed: 0 | Remaining: {N}

---

## Checklist

- [ ] Phase 1: {description}
  - [ ] `{NN}-{slug}.md` -- {brief}
- [ ] Phase 2: {description}
  - [ ] `{NN}-{slug}.md` -- {brief}

---

## Phase 1: {Description} ([SEQUENTIAL|PARALLEL x N]) PENDING

> {Why this phase exists / what it unlocks}

| Order | Spec File | What It Builds | Depends On | Status |
|-------|-----------|---------------|------------|--------|
| 1.1 | `{spec}.md` | {description} | None | [ ] |

### How to Build Phase 1

**Sequential:**
/build specs/todo/{spec-name}.md

**Parallel (if applicable):**
/agent-teams specs/roadmaps/ROADMAP-{slug}.md phase-1

---

## Execution Timeline

TIME ---------------------------------------------------------------->
Phase 1   [PARALLEL x3] spec-a | spec-b | spec-c
Phase 2   [SEQUENTIAL]  spec-d (depends on Phase 1)
```

### Step 2.5: Store in Cortex

Store extraction results via CLI (fire-and-forget):
```bash
cortex remember "Meeting-to-specs: [summary of specs generated, source document, dependency graph]" \
  --tags meeting-to-specs,spec-genesis,{project-or-client-name} --importance 70 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Meeting-to-specs: [summary]" --tags meeting-to-specs,spec-genesis,{project-or-client-name} --importance 70
```

If source document is stored in Cortex, link them via CLI:
```bash
cortex link "{source_memory_id}" "{specs_memory_id}" 2>/dev/null || true
```

### Step 2.6: Final Summary Report

```markdown
## Specs Generated from: {source_document}

| # | Spec File | Title | Type | Effort | Priority | Depends On |
|---|-----------|-------|------|--------|----------|------------|
| 1 | {NN}-{slug}.md | {title} | {type} | {S/M/L/XL} | {P0-P3} | -- |

### Dependency Graph
{text graph from Step 2.3}

### Recommended Build Order
1. {spec} (no dependencies, highest priority)
2. {spec} (no dependencies, quick win)
3. {spec} (depends on #1)

### Roadmap
File: specs/roadmaps/ROADMAP-{slug}.md
Phases: {N} | Max Parallelism: {N} agents

### Next Steps
- Review generated specs in specs/todo/ for accuracy
- Run `/build specs/todo/{first-spec}.md` to start first spec
- Or use `/agent-teams specs/roadmaps/ROADMAP-{slug}.md phase-1` for parallel build
```

---

## Report Convention Compliance

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

### Before Generating the Final Summary Report

1. Check for previous reports: `Glob reports/meeting-to-specs/mts-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison

### YAML Frontmatter

Every meeting-to-specs report MUST include this frontmatter block at the top:

```yaml
---
report_type: "meeting-to-specs"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{source_document_name}"
project_tag: "{project-slug}"
mode: "{quick|deep}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

`composite_score` is null for meeting-to-specs (extraction, not scored).

### Delta Section (if previous extraction from same source/project exists)

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {new work item extracted}

**RESOLVED** ({count} items):
- [RESOLVED] {previously extracted item now built/completed}

**MOVED** ({count} items):
- [MOVED] {item}: {previous_priority} -> {current_priority}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous_status} -> {current_status}
```

Omit categories with 0 items. First report = omit delta section entirely.

### Trend Section (3+ extractions for same project)

```markdown
## Trend (last {N} reports)

| Report | Date | Items Extracted | Specs Generated | Phases |
|--------|------|----------------|----------------|--------|
| mts-{NNN} | {date} | {count} | {count} | {count} |

**Direction:** {first} -> {last} ({arrow}, {+/-N})
```

If fewer than 3 reports exist: `> Trend tracking available after 3+ reports ({N} exist).`

---

## Edge Cases

- **Vague meeting notes**: If an item lacks enough detail for a full spec, generate a skeleton spec with `<!-- NEEDS DETAIL: ... -->` comments. Flag in summary with asterisk.
- **Single-item documents**: Still generate a proper spec. Skip ROADMAP generation for single specs.
- **Non-English input**: Process as-is. Generate specs in English.
- **Very large documents** (>100 items): Group related items into themed specs. Aim for 10-20 specs maximum per run. Note groupings in summary.
- **Transcripts with speaker labels**: Strip timestamps and filler words. Preserve speaker names only when they indicate action item ownership.
- **Overlapping with existing specs**: Frame as enhancement/extension. Reference existing spec number in `Depends on:` header.
