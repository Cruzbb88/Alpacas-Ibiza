# Command: proposal-builder

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

Full proposal generation orchestrating all 3 layers based on mode.

## Execution Flow

```
Parse Arguments
     |
     v
L1: Structure (always runs)
  - Ingest scope notes
  - Extract deliverables, client info, constraints
  - cortex_recall past proposals for this client
  - Generate proposal skeleton (10 sections)
  - If --mode quick → OUTPUT skeleton → STOP
     |
     v
L2: Draft (standard + deep)
  - Expand each section with full content
  - Build deliverables table with acceptance criteria
  - Generate timeline table with dependencies
  - Apply voice via /write-like-me (if --voice specified and skill available)
  - Investment section = [TO BE DETERMINED] (unless user provides pricing)
  - All hour/cost math via bash/python
  - Write draft to ./proposals/{client-slug}-proposal-{date}.md
  - If --mode standard → OUTPUT draft → STOP
     |
     v
L3: Polish (deep only)
  - cortex_recall + cortex_global_search for past proposals
  - Cross-reference for consistency and reuse
  - Read references/clause-library.md
  - Apply matching clauses to Sections 7 & 8
  - cortex_recall "business positioning about us" for Section 9
  - Generate final document via file-factory (if available)
  - cortex_remember the proposal pattern
  - OUTPUT polished proposal + summary
```

## Argument Parsing

```
Input: $ARGUMENTS

Extract:
  scope_input = first positional arg (file path or inline text)
  --client    = client name (string)
  --voice     = me | ralph (default: none → professional tone)
  --format    = docx | pdf | md (default: docx)
  --mode      = quick | standard | deep (default: standard)
```

### Scope Input Detection

If scope_input looks like a file path (contains `/` or `\` or ends in `.md`/`.txt`/`.docx`):
```
Read: {scope_input}
```

If scope_input is inline text, use it directly as scope notes.

If no scope input provided:
```
Glob: ./proposals/**/*.md, ./scope/**/*.md, ./notes/**/*.md
cortex_recall: "scope notes proposal"
```
Present candidates and ask user to confirm.

## Layer 1: Structure

### 1.1 Extract Key Information

From scope notes, extract:
- Client name (or use --client)
- Project title (derive from scope description)
- Deliverables list
- Systems/platforms mentioned
- Constraints (time, budget, regulatory)
- Stakeholders mentioned

For each missing critical item:
```markdown
[NEEDED: {what's missing}]
```

### 1.2 Cortex Lookup

Pre-fetch context via CLI:
```bash
PROPOSAL_CONTEXT=$(cortex recall "proposal {client_name}" --json --limit 5 2>/dev/null)
PROJECT_CONTEXT=$(cortex recall "{project_keywords}" --json --limit 5 2>/dev/null)
```

Use any relevant history from the pre-fetched context to inform the skeleton.

### 1.3 Generate Skeleton

Read `references/proposal-sections.md` for section guidance.

Output 10-section skeleton with:
- Headers for all sections
- Bullet points with extracted content
- Tables with placeholder rows
- Investment section = `[TO BE DETERMINED]`
- All [NEEDED: ...] flags for missing information

**Quick mode stops here.**

## Layer 2: Draft

### 2.1 Expand Sections

For each section, follow the guidance in `references/proposal-sections.md`:
- Write full prose, not just bullets
- Use client's own language from scope notes
- Include specific details (system names, deliverable counts, stakeholder names)
- Flag unknowns as [NEEDED: ...]

### 2.2 Voice Application

If `--voice` is specified:
1. Check if /write-like-me skill exists
2. If yes: apply voice transformation to prose sections (NOT tables, NOT terms)
3. If no: use professional consulting tone (fallback)

Sections that get voice applied:
- Executive Summary
- Background & Context
- Approach & Methodology
- About Us

Sections that NEVER get voice applied:
- Scope of Work (tables)
- Timeline & Milestones (tables)
- Investment (numbers)
- Terms & Conditions (formal language)
- Assumptions & Exclusions (standardized clauses)

### 2.3 Build Tables

**Deliverables Table (Section 3):**

| # | Deliverable | Description | Acceptance Criteria | Est. Effort |
|---|-------------|-------------|---------------------|-------------|

Every deliverable extracted from scope notes gets a row. Acceptance criteria must be measurable.

**Timeline Table (Section 5):**

| Phase | Duration (Est.) | Dependencies | Key Deliverable |
|-------|----------------|--------------|-----------------|

Use timeline heuristics from proposal-sections.md.
Add caveat: "All timelines are estimated and subject to adjustment."

**Investment Table (Section 6):**

If user has NOT provided pricing:
```markdown
> **[TO BE DETERMINED]**
> Investment details will be confirmed following scope alignment discussion.
```

If user HAS provided pricing (hours, rates, fixed amounts):
- Build pricing table
- Calculate totals via Bash/Python:

```bash
python3 -c "
items = [('Discovery', 20, 150), ('Design', 40, 150), ('Build', 80, 150)]
total_hours = sum(h for _, h, _ in items)
total_cost = sum(h * r for _, h, r in items)
print(f'Total Hours: {total_hours}')
print(f'Total Investment: \${total_cost:,.2f}')
"
```

**NEVER use LLM to compute costs.** Always Bash/Python.

### 2.4 Write Draft

```bash
# Create output directory if needed
mkdir -p ./proposals

# Determine filename
client_slug=$(echo "{client_name}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
date=$(date +%Y-%m-%d)
filename="./proposals/${client_slug}-proposal-${date}.md"
```

Write the full proposal to the output file.

**Standard mode stops here.**

## Layer 3: Polish

### 3.1 Cross-Reference Past Proposals

Pre-fetch via CLI:
```bash
PAST_PROPOSALS=$(cortex recall "proposal {client_name}" --json --limit 5 2>/dev/null)
GLOBAL_PROPOSALS=$(cortex search --global "proposal consulting" --json --limit 5 2>/dev/null)
```

Integrate findings:
- Maintain terminology consistency with past proposals
- Reference prior work where relevant
- Reuse proven structures from successful proposals

### 3.2 Apply Clause Library

```
Read: references/clause-library.md
```

1. Identify project type (consulting, development, strategy, automation)
2. Select universal clauses + project-type clauses
3. Customize clauses for this specific engagement
4. Populate Section 7 (Assumptions & Exclusions)
5. Populate Section 8 (Terms & Conditions)

### 3.3 Populate About Us

Pre-fetch via CLI:
```bash
ABOUT_US=$(cortex recall "business positioning about us company bio consultant" --json --limit 3 2>/dev/null)
```

If found: populate Section 9 with recalled content
If not found: `[NEEDED: Company/consultant biography for Section 9]`

### 3.4 Generate Final Document

Based on `--format`:

**docx (default):**
- Check if file-factory skill is available
- If yes: invoke file-factory DOCX workflow with the proposal content
- If no: output as Markdown with note about manual conversion

**pdf:**
- Check if file-factory skill is available
- If yes: invoke file-factory PDF workflow
- If no: output as Markdown with note about manual conversion

**md:**
- Already done — the draft from L2 is the final output

### 3.5 Store in Cortex

Store via CLI (fire-and-forget):
```bash
cortex remember "Generated {mode} proposal for {client}: {project_title}. {deliverable_count} deliverables. Key scope: {scope_summary}. Output: {output_path}. Format: {format}." --tags proposal,client-{client_slug},{project_type} 2>/dev/null
```

### 3.6 Report Convention Compliance

#### Before Generating the Report

1. Check for previous reports: `Glob reports/proposal-builder/pb-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison

#### YAML Frontmatter

Every proposal report MUST include this frontmatter block at the top:

```yaml
---
report_type: "proposal-builder"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{client} - {project_title}"
project_tag: "{client-slug}"
mode: "{quick|standard|deep}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

`composite_score` is null for proposals (not scored).

#### Delta Section (if previous proposal for same client exists)

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {new deliverable or section}

**RESOLVED** ({count} items):
- [RESOLVED] {previously flagged [NEEDED] item now filled}

**MOVED** ({count} items):
- [MOVED] {deliverable}: {previous_phase} -> {current_phase}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous_status} -> {current_status}
```

Omit categories with 0 items. First report = omit delta section entirely.

#### Trend Section (3+ proposals for same client)

```markdown
## Trend (last {N} reports)

| Report | Date | Deliverables | Sections Complete | Flagged Items |
|--------|------|-------------|-------------------|---------------|
| pb-{NNN} | {date} | {count} | {N}/10 | {count} |

**Direction:** {first} -> {last} ({arrow}, {+/-N})
```

If fewer than 3 reports exist: `> Trend tracking available after 3+ reports ({N} exist).`

### 3.7 Final Summary

Output:
```markdown
## Proposal Generated

- **Client**: {client_name}
- **Project**: {project_title}
- **Mode**: {mode}
- **Sections**: 10/10 complete ({flagged_count} items flagged)
- **Deliverables**: {count}
- **Format**: {format}
- **Output**: {output_path}
- **Voice**: {voice or "Professional (default)"}

### Items Requiring Attention
{list of all [NEEDED: ...] and [TO BE DETERMINED] items}

### Next Steps
1. Review the proposal for accuracy
2. Fill in [NEEDED] items with actual data
3. Confirm pricing in Section 6 (Investment)
4. Send to client
```
