---
name: proposal-builder
description: >-
  Generate professional consulting proposals from scope notes, meeting transcripts,
  or brief descriptions using voice matching and document output. 3-layer architecture:
  L1 (Structure) builds proposal skeleton, L2 (Draft) fills all sections with content
  and applies voice style, L3 (Polish) cross-references past proposals, applies clause
  library, and generates final document.
  Use when: (1) Creating consulting proposals, (2) Turning scope notes into formal
  proposals, (3) Generating client-facing proposal documents for any engagement.
argument-hint: <scope-notes-or-file> [--client name] [--voice me|ralph] [--format docx|pdf|md] [--mode quick|standard|deep]
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
  - mcp__omni-cortex__cortex_global_search
---

# Proposal Builder

Generate professional consulting proposals from scope notes using voice matching and document output.

## Mode Matrix

| Mode | Arg | Layers | Output | Sub-agents |
|------|-----|--------|--------|------------|
| Quick | `quick` | L1 | Proposal skeleton with section headers | No |
| Standard | `standard` or *(none)* | L1 + L2 | Full draft proposal (Markdown) | No |
| Deep | `deep` | L1 + L2 + L3 | Polished proposal with clause library + final document | No |

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **Scope input**: File path OR inline text describing the engagement scope (required)
2. **--client**: Client name (used for cortex lookups and document header)
3. **--voice**: `me` (Tony's style) or `ralph` (Ralph's style). Default: professional tone
4. **--format**: `docx` (default), `pdf`, or `md`. Controls final output format
5. **--mode**: `quick`, `standard` (default), or `deep`

If scope input is a file path, read the file. If inline text, use directly.

If `--client` is not provided, attempt to extract client name from scope notes. If not found, flag as `[NEEDED: Client Name]`.

---

## Layer 1: Structure (Quick Mode)

L1 parses scope notes and generates a proposal skeleton with all 10 standard section headers.

### Step 1.1: Ingest Scope Notes

Read the scope input (file or inline text). Extract:

- **Client name** (if not provided via `--client`)
- **Project description** (what the engagement is about)
- **Key deliverables** (specific outputs/artifacts)
- **Systems/platforms mentioned** (technologies involved)
- **Constraints** (timeline, budget, regulatory, etc.)
- **Stakeholders** (who is involved)

For any critical item that cannot be extracted, flag as `[NEEDED: ...]`.

### Step 1.2: Check Cortex for Context

```
cortex_recall: "proposal {client_name}"
cortex_recall: "{project_keywords} engagement"
```

Pull any relevant history: past proposals, client preferences, known constraints.

### Step 1.3: Generate Proposal Skeleton

Read `references/proposal-sections.md` for section definitions.

Generate a structured skeleton with all 10 sections:

```markdown
# Proposal: {Project Title}
## Prepared for: {Client Name}
## Date: {YYYY-MM-DD}
## Prepared by: {Author — from cortex or [NEEDED: Author]}

---

### 1. Executive Summary
- Problem: {extracted from scope}
- Solution: {proposed approach}
- Expected Outcome: {desired result}

### 2. Background & Context
- {bullet points from scope notes}

### 3. Scope of Work
| # | Deliverable | Description | Acceptance Criteria |
|---|-------------|-------------|---------------------|
| 1 | {item} | {desc} | {criteria or [NEEDED]} |

### 4. Approach & Methodology
- Phase overview bullets

### 5. Timeline & Milestones
| Phase | Duration (Est.) | Dependencies | Deliverable |
|-------|----------------|--------------|-------------|
| 1 | {est} | None | {deliverable} |

### 6. Investment
> **[TO BE DETERMINED]**
> Pricing to be discussed and confirmed with client.

### 7. Assumptions & Exclusions
- See clause library (references/clause-library.md)

### 8. Terms & Conditions
- Standard terms placeholder

### 9. About Us
- {From cortex or [NEEDED: Company/consultant bio]}

### 10. Next Steps
- {Call to action}
```

**CRITICAL: Section 6 (Investment) is ALWAYS `[TO BE DETERMINED]` unless the user explicitly provides pricing.** Never auto-generate pricing.

**If mode is `quick`**: Output the skeleton and stop. Do NOT continue to L2.

---

## Layer 2: Draft (Standard Mode)

L2 fills all sections with substantive content and applies voice styling.

### Step 2.1: Generate Section Content

For each section, expand the skeleton into full prose using the scope notes as source material.

Follow the guidance in `references/proposal-sections.md` for each section's purpose, tone, and structure.

Rules:
- **Extract, don't invent.** All claims about the client must come from scope notes or cortex. If information is missing, flag as `[NEEDED: specific info]`.
- **Deliverables table** must list every concrete output with acceptance criteria.
- **Timeline estimates** are labeled "Estimated" with appropriate caveats. Use these heuristics:
  - Simple deliverable (config, script, single endpoint): 1-3 days
  - Moderate deliverable (feature, integration): 1-2 weeks
  - Complex deliverable (platform, migration, multi-phase): 1-3 months
- **Investment section** remains `[TO BE DETERMINED]` unless user provides pricing.
- All hour/cost calculations (if user provides rates) must be done via Bash/Python, never LLM-computed:

```bash
# Example: calculate total from hours and rate
python3 -c "hours=40; rate=150; print(f'Total: ${hours * rate:,.2f}')"
```

### Step 2.2: Apply Voice (if --voice specified)

If `--voice` is specified:
1. Check if `/write-like-me` skill is available
2. If available, apply voice transformation to all prose sections (not tables or headers)
3. If `/write-like-me` is NOT available, fall back to professional consulting tone

Voice application targets:
- Executive Summary (full section)
- Background & Context (narrative portions)
- Approach & Methodology (descriptions)
- About Us (full section)

Do NOT apply voice to: tables, pricing, terms & conditions, or technical specifications.

### Step 2.3: Build Deliverables Table

From scope notes, build a comprehensive deliverables table:

| # | Deliverable | Description | Acceptance Criteria | Est. Effort |
|---|-------------|-------------|---------------------|-------------|

Each deliverable must have:
- Clear, specific name (not vague)
- Description of what it includes
- Measurable acceptance criteria
- Estimated effort range

### Step 2.4: Output Draft

Write the full proposal draft to:
- `./proposals/{client-slug}-proposal-{YYYY-MM-DD}.md`

If output directory doesn't exist, create it.

**If mode is `standard`**: Output the draft and stop. Do NOT continue to L3.

---

## Layer 3: Polish (Deep Mode)

L3 cross-references past proposals, applies the clause library, and generates the final document.

### Step 3.1: Cross-Reference Past Proposals

```
cortex_recall: "proposal {client_name}"
cortex_global_search: "proposal consulting"
```

If past proposals exist for this client:
- Note any scope evolution or recurring themes
- Maintain consistency with past terminology
- Reference prior work if relevant ("Building on our previous engagement...")

If similar proposals exist for other clients:
- Reuse proven structures and phrasing (adapted to this client)
- Avoid contradictions with established patterns

### Step 3.2: Apply Clause Library

Read `references/clause-library.md`.

Select appropriate clauses based on project type:
- Identify project type (consulting, development, strategy)
- Pull matching assumptions templates
- Pull matching exclusions templates
- Customize clause language to fit the specific engagement

Fill Section 7 (Assumptions & Exclusions) with selected clauses.
Fill Section 8 (Terms & Conditions) with standard terms.

### Step 3.3: Pull About Us

```
cortex_recall: "business positioning about us company bio"
```

If found, populate Section 9 with business context.
If not found, flag as `[NEEDED: Company/consultant biography]`.

### Step 3.4: Generate Final Document

If `--format` is `docx` or `pdf`:
1. Check if `file-factory` skill is available
2. If available, invoke file-factory to generate the document:
   - For `docx`: Use file-factory DOCX workflow
   - For `pdf`: Use file-factory PDF workflow
3. If file-factory is NOT available, output as Markdown with a note:
   > "file-factory not available. Proposal saved as Markdown. Convert manually or install file-factory."

If `--format` is `md` (or not specified and file-factory unavailable):
- Output is already in Markdown format, saved in Step 2.4

### Step 3.5: Store in Cortex

Store via CLI (fire-and-forget):
```bash
cortex remember "Generated proposal for {client}: {project_title}. Sections: {section_count}. Deliverables: {deliverable_count}. Key scope: {scope_summary}. Format: {format}." --tags proposal,client-{client_slug},{project_type} 2>/dev/null
```

Store the proposal pattern for future reference (ACT-LEARN-REUSE cycle).

### Step 3.6: Final Summary

Output a summary of what was generated:

```markdown
## Proposal Generated

- **Client**: {name}
- **Project**: {title}
- **Sections**: 10/10 complete ({flagged_count} items flagged as [NEEDED])
- **Deliverables**: {count}
- **Format**: {format}
- **File**: {output_path}
- **Voice**: {voice_style or "Professional (default)"}

### Items Flagged as [NEEDED]
- {list of all [NEEDED: ...] items that require user input}

### Next Steps
1. Review the proposal draft for accuracy
2. Fill in [NEEDED] items with actual data
3. Confirm pricing in Section 6 (Investment)
4. Send to client for review
```

---

## Safety Rules

1. **NEVER auto-generate pricing.** Investment section is always `[TO BE DETERMINED]` unless the user explicitly provides numbers.
2. **NEVER fabricate client details.** Extract only from scope notes + cortex. Flag gaps as `[NEEDED: ...]`.
3. **All calculations via Bash/Python.** Hours, costs, and billing math must never be LLM-computed.
4. **Clause library is user-editable.** It lives in `references/clause-library.md` and users can customize it.
5. **Timeline estimates are guidance only.** Always label as "Estimated" with appropriate caveats.
6. **Graceful degradation.** If /write-like-me or file-factory are unavailable, fall back to defaults (professional tone, Markdown output) without failing.
