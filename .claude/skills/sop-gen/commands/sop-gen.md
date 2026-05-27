# SOP Generator Command

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

This is the main execution command for the SOP Generator skill.

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **Process input**: File path OR inline text describing the process (required unless `--audit`)
2. **--audit**: Path to existing SOP to audit (triggers audit mode instead of generation)
3. **--format**: `md` (default) or `docx`. Controls output format.
4. **--mode**: `quick` (L1 only) or `deep` (L1+L2, default)

Rules:
- If `--audit <file>` is present, run Audit Mode (skip L1/L2)
- If `--mode quick`, run L1 only
- Otherwise, run L1 then L2 (deep is the default)
- If input is a file path (ends in .md, .txt, or contains `/`), read it. Otherwise treat as inline text.

---

## Audit Mode

Triggered by `--audit <file>`. Reviews an existing SOP for gaps against the standard template.

### Audit Step 1: Read the Existing SOP

```
Read the file specified after --audit
```

Parse the SOP to identify which sections are present and their content quality.

### Audit Step 2: Section Completeness Check

Compare the existing SOP against the 12-section template in `references/sop-template.md`.

For each section:
- **Present and complete**: Section exists with substantive content
- **Present but thin**: Section exists but lacks detail (e.g., RACI with no roles filled, procedure steps without expected outcomes)
- **Missing**: Section not found

### Audit Step 3: Quality Analysis

Check each present section for:

1. **Step specificity**: Do procedure steps start with action verbs? Flag any vague steps like "handle the request" or "do the thing" -- they should be specific like "Navigate to Settings > Users and click Add New User"
2. **RACI completeness**: Does every major step have at least R and A roles assigned? Are role names real (from the document) or generic placeholders?
3. **Decision tree coverage**: Are there IF/THEN conditions in the procedure that lack formal decision tree documentation?
4. **Exception handling**: Are common failure modes addressed? Is there an escalation path with timeframes?
5. **Prerequisites clarity**: Are access requirements specific (system names, permission levels) or vague?
6. **Screenshot markers**: For UI-heavy procedures, are `[SCREENSHOT: ...]` placeholders present? Use Playwright CLI for headless captures (`npx playwright screenshot "<url>" screenshot.png --full-page`). Use Chrome MCP only for authenticated pages needing live Brave sessions.
7. **Cross-references**: Are related SOPs and policies linked?
8. **Version currency**: Is the review date in the past (stale SOP)?
9. **Definitions**: Are acronyms and jargon defined?
10. **Ambiguity scan**: Flag any step containing words like "appropriate", "as needed", "if necessary", "etc." without specific criteria

### Audit Step 4: Generate Gap Report

Output a structured gap report:

```markdown
# SOP Audit Report

**File audited:** {file_path}
**Audit date:** {YYYY-MM-DD}
**Overall completeness:** {X}/12 sections present ({Y} thin, {Z} missing)

## Section Inventory

| # | Section | Status | Notes |
|---|---------|--------|-------|
| 1 | Document Control | {Present/Thin/Missing} | {specific note} |
| 2 | Purpose | ... | ... |
| ... | ... | ... | ... |
| 12 | Version History | ... | ... |

## Quality Findings

### Critical (must fix)
- {Finding with specific location and recommendation}

### Important (should fix)
- {Finding with specific location and recommendation}

### Minor (nice to have)
- {Finding with specific location and recommendation}

## Recommendations

1. {Highest priority recommendation}
2. {Second priority recommendation}
3. ...

## Ambiguous Steps Found
| Step | Current Wording | Suggested Improvement |
|------|----------------|----------------------|
| {Step #} | "{vague wording}" | "{specific suggestion}" |
```

Write the gap report to: `docs/sops/audit-{sop-filename}-{YYYY-MM-DD}.md`

**After audit, stop.** Do not proceed to L1/L2.

---

## Layer 1: Structure (Quick Mode)

L1 parses input, identifies process steps, and generates an SOP skeleton with all 12 section headers.

### L1 Step 1: Ingest Process Input

Read the process description (file or inline text). Extract:

- **Process name**: What is this procedure called?
- **Process trigger**: What event starts this procedure?
- **Actors/roles**: Who is involved? (use exact names from input, don't invent)
- **Sequential steps**: What are the discrete actions in order?
- **Decision points**: Where does the process branch?
- **Inputs**: What data/materials/access feeds into the process?
- **Outputs**: What does the process produce?
- **Systems/tools**: What software/hardware is used?

For anything that cannot be extracted, flag as `[NEEDED: ...]`.

### L1 Step 2: Check Cortex for Context

Search for related knowledge to enrich the SOP:

Pre-fetch context via CLI:
```bash
SOP_CONTEXT=$(cortex recall "{process_name}" --json --limit 5 2>/dev/null)
SOP_STEPS=$(cortex recall "{process_name} steps procedure" --json --limit 5 2>/dev/null)
GLOBAL_CONTEXT=$(cortex search --global "{process_keywords}" --json --limit 5 2>/dev/null)
```

Use any relevant history from the pre-fetched context: past SOPs, related processes, known issues.

### L1 Step 3: Generate SOP Skeleton

Read `references/sop-template.md` for section definitions.

Generate the skeleton following this structure. Every section must have at least a header and placeholder content:

```markdown
# SOP: {Process Name}

---

## 1. Document Control

| Field | Value |
|-------|-------|
| **SOP Number** | SOP-{DOMAIN}-{NNN} |
| **Version** | 1.0 |
| **Effective Date** | {YYYY-MM-DD} |
| **Author** | {author or [NEEDED: Author]} |
| **Approved By** | [NEEDED: Approver] |
| **Review Date** | {effective date + 6 months} |

---

## 2. Purpose

This procedure establishes the standard process for {process_name} to ensure {extracted or inferred business outcome}.

---

## 3. Scope

### Applies To
- {Role/team from input or [NEEDED: Applicable roles]}

### When to Use
- {Trigger condition from input}

### Out of Scope
- {Inferred exclusions or [NEEDED: Out of scope items]}

---

## 4. Definitions

| Term | Definition |
|------|-----------|
| {Terms extracted from input} | {Definition} |

---

## 5. RACI Matrix

| Step | {Role 1} | {Role 2} | {Role 3} |
|------|:--------:|:--------:|:--------:|
| {Step name} | R | A | I |

> **Note:** Role names should be confirmed with process owner. [NEEDED: Confirm role names]

---

## 6. Prerequisites

### Access Required
- [ ] {Systems/tools from input}

### Tools Required
| Tool | Purpose |
|------|---------|
| {Tool from input} | {Purpose} |

---

## 7. Procedure

### Phase 1: {Phase Name}

1. **{Action verb} {step from input}**
   - Expected result: {outcome}
   - [SCREENSHOT: {description if UI-based}]

{Continue numbering all extracted steps}

---

## 8. Decision Trees

### Decision Point: {Name from extracted branch points}
- **IF** {condition}: {action}
- **ELSE**: {alternative}

---

## 9. Exception Handling

| Error / Symptom | Likely Cause | Resolution |
|-----------------|-------------|------------|
| {Inferred from input or [NEEDED]} | {Cause} | {Fix} |

---

## 10. Quality Checks

- [ ] {Verification based on outputs}
- [ ] All stakeholders notified
- [ ] Process outputs saved to designated location

---

## 11. References

- {Related documents from input or cortex}

---

## 12. Version History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | {YYYY-MM-DD} | {Author} | Initial version |
```

### L1 Step 4: Output Skeleton

Write the skeleton to: `docs/sops/sop-{process-slug}-{YYYY-MM-DD}.md`

Create the output directory if it does not exist.

**If mode is `quick`**: Display a summary of what was generated and stop. Do NOT continue to L2.

Summary format:
```markdown
## SOP Skeleton Generated

- **Process**: {name}
- **Sections**: 12/12 headers created
- **Steps identified**: {count}
- **Decision points**: {count}
- **Items flagged as [NEEDED]**: {count}
- **File**: {output_path}

To generate the full SOP with all sections populated, run without `--mode quick`.
```

---

## Layer 2: Generate (Deep Mode -- Default)

L2 takes the L1 skeleton and fills all 12 sections with substantive content.

### L2 Step 1: Enrich from Cortex

Deeper cortex search for content to fill sections:

Pre-fetch enrichment context via CLI:
```bash
ERROR_CONTEXT=$(cortex recall "{process_name} errors troubleshooting" --json --limit 5 2>/dev/null)
BEST_PRACTICES=$(cortex recall "{process_name} best practices" --json --limit 5 2>/dev/null)
COMPLIANCE=$(cortex recall "{domain} compliance requirements" --json --limit 5 2>/dev/null)
```

Also search project files:
- `Glob` for `**/docs/**/*{keywords}*`
- `Glob` for `**/specs/**/*{keywords}*`
- `Grep` for process keywords in markdown files

### L2 Step 2: Fill All Sections

For each section, expand the skeleton with substantive content following the templates in `references/sop-template.md`.

**Section-specific rules:**

1. **Document Control**: Fill all fields. Use today's date for effective date. Review date = effective date + 6 months.

2. **Purpose**: 1-2 sentences. Be specific about the business value. No generic filler.

3. **Scope**: List specific roles, trigger conditions, and exclusions. If not enough info, flag [NEEDED] items.

4. **Definitions**: Include every acronym and domain term used in the SOP. If the SOP uses no jargon, write "No specialized terms required."

5. **RACI Matrix**: Build from roles identified in L1. Rules:
   - Every step needs exactly one A (Accountable)
   - Every step needs at least one R (Responsible)
   - Do NOT invent organization-specific role names -- use what the input provides or flag [NEEDED: Role names]

6. **Prerequisites**: Be specific about access levels, tool versions, and training requirements.

7. **Procedure**: This is the core section. Rules:
   - Every step starts with an action verb (Click, Enter, Verify, Navigate, Run, Select, Submit, Open, Review, Approve, etc.)
   - Number steps sequentially across all phases
   - Use a.b notation for sub-steps
   - Include expected outcomes for non-obvious steps
   - Add `[SCREENSHOT: {description}]` for any UI-based step
   - End each phase with a checkpoint
   - Steps must be specific enough for someone with no domain expertise to follow
   - No step should say "as appropriate" or "as needed" without defining the criteria

8. **Decision Trees**: Build ASCII flowcharts for every branching point identified. Include:
   - A visual diagram (ASCII art)
   - A plain text IF/THEN/ELSE version
   - Step number references for navigation
   - Default/fallback path for unexpected conditions

9. **Exception Handling**: For each major step, identify what could go wrong:
   - Error table with symptom, cause, resolution, and escalation contact
   - Escalation path with specific timeframes
   - Rollback procedure if the process must be reversed

10. **Quality Checks**: Create a sign-off checklist:
    - Completeness checks (were all steps done?)
    - Quality checks (were they done correctly?)
    - Output verification (do outputs match expected results?)

11. **References**: Link to related SOPs, policies, tools documentation, and external resources found in cortex or project files.

12. **Version History**: Initial version only. Do NOT pre-populate future changes.

### L2 Step 3: Format and Output

Based on `--format`:

**For Markdown (md -- default):**
Write the complete SOP to: `docs/sops/sop-{process-slug}-{YYYY-MM-DD}.md`

**For Word (docx):**
1. Write the SOP as Markdown first
2. Check if `file-factory` skill is available
3. If available, invoke file-factory to convert to docx
4. If not available, output as Markdown with note: "file-factory not available. SOP saved as Markdown."

### L2 Step 4: Store in Cortex

Store via CLI (fire-and-forget):
```bash
cortex remember "SOP generated: {process_name}. File: {output_path}. Sections: 12. Steps: {step_count}. Key scope: {brief_summary}. Version 1.0." --tags sop,{process-slug},{domain},documentation --importance 70 2>/dev/null
```

Link to any related memories found during research via CLI:
```bash
cortex link "$SOP_ID" "$RELATED_ID" 2>/dev/null
```

### L2 Step 5: Final Summary

Output:

```markdown
## SOP Generated

- **Process**: {name}
- **Sections**: 12/12 complete ({flagged} items flagged as [NEEDED])
- **Procedure steps**: {count}
- **Decision trees**: {count}
- **Exception handlers**: {count}
- **Format**: {format}
- **File**: {output_path}

### Items Flagged as [NEEDED]
{list all [NEEDED: ...] items requiring user input}

### Next Steps
1. Review the SOP for accuracy
2. Fill in all [NEEDED] items with actual data
3. Add screenshots where [SCREENSHOT: ...] markers appear
4. Get approval from designated approver
5. Distribute to applicable roles listed in Scope
```

---

## Report Convention Compliance

### Before Generating Any Report (SOP or Audit)

1. Check for previous reports: `Glob reports/sop-gen/sop-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison

### YAML Frontmatter

Every SOP report MUST include this frontmatter block at the top of the generated file:

```yaml
---
report_type: "sop-gen"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{process_name}"
project_tag: "{process-slug}"
mode: "{quick|deep|audit}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

`composite_score` is null for SOPs (documentation, not scored). For audit reports, composite_score can be the completeness percentage (0-100).

### Delta Section (if previous SOP/audit for same process exists)

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {new section or procedure step}

**RESOLVED** ({count} items):
- [RESOLVED] {previously flagged [NEEDED] item now filled}

**MOVED** ({count} items):
- [MOVED] {step}: {previous_phase} -> {current_phase}

**PROGRESS** ({count} items):
- [PROGRESS] {section}: {previous_completeness} -> {current_completeness}
```

Omit categories with 0 items. First report = omit delta section entirely.

### Trend Section (3+ reports for same process)

```markdown
## Trend (last {N} reports)

| Report | Date | Sections | Steps | Flagged Items |
|--------|------|----------|-------|---------------|
| sop-{NNN} | {date} | {N}/12 | {count} | {count} |

**Direction:** {first} -> {last} ({arrow}, {+/-N})
```

If fewer than 3 reports exist: `> Trend tracking available after 3+ reports ({N} exist).`

---

## Safety Rules

1. **NEVER invent role names or organization structure.** Use only what the input provides. Flag gaps as `[NEEDED: ...]`.
2. **NEVER fabricate process steps.** Extract from input and cortex only. If information is insufficient, flag it.
3. **Steps must be specific.** No "as appropriate", "as needed", "etc." without defining criteria.
4. **Version 1.0 only.** Do not pre-populate version history with fictional changes.
5. **Screenshot placeholders only.** Do not generate or describe screenshots that don't exist.
6. **Graceful degradation.** If cortex is unavailable, proceed with input data only. If file-factory is unavailable, output as Markdown.
7. **Audit mode is read-only.** Audit produces a gap report -- it does NOT modify the original SOP.
8. **Client-specific terminology.** Adapt to the terminology used in the input (e.g., if input says "vendor" use "vendor", not "supplier").
