# /sipoc — SIPOC Process Mapping

Map end-to-end processes using SIPOC methodology. Extracts Suppliers, Inputs, Process steps, Outputs, and Customers — plus Transformations, Handoffs, and Variance paths. Generates both tabular SIPOC Matrix and visual Hierarchy SIPOC (Mermaid diagrams).

---

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **Process input** (required): Process description as inline text OR a file path to read
2. **--format**: `matrix` (table only), `hierarchy` (Mermaid only), or `both` (default)
3. **--output**: `md` (default), `pptx` (via file-factory), `mermaid` (raw Mermaid code)
4. **--mode**: `quick` (L1 only), `default` (L1+L2), `deep` (L1+L2+L3)
5. **--level**: `1`, `2`, or `3` — maximum decomposition depth to generate (default: `2`)

**If mode is `quick`**: Execute L1 only, output draft element table, then stop.
**If mode is `default` or omitted**: Execute L1 + L2, output full matrix + Mermaid diagram.
**If mode is `deep`**: Execute L1 + L2 + L3, output matrix + diagrams + PPTX + Cortex persistence.

If process input is a file path (ends in `.md`, `.txt`, `.docx`, `.csv`, or other recognized extension), read the file contents. Otherwise, treat the input as inline process description text.

Check Cortex for prior SIPOC analyses of this process or related processes:

```
cortex_recall: "sipoc {process_keywords}"
cortex_recall: "process map {process_keywords}"
```

If prior analysis found, reference it as a starting point and note what has changed.

---

## Layer 1: Extract & Map (Weight: 40%)

L1 parses the process input, extracts all SIPOC elements, identifies hierarchy levels, and documents variances.

### Step 1.1: Identify Process Scope

From the input, determine:

1. **Process name**: The end-to-end process being mapped (L1 name)
2. **Process boundary**: Where it starts and where it ends
3. **Trigger**: What initiates the process
4. **End condition**: What constitutes process completion
5. **Scope inclusions**: What is explicitly part of this process
6. **Scope exclusions**: What is explicitly out of scope (if mentioned)

Format as:

```markdown
### Process Scope

| Attribute | Value |
|-----------|-------|
| Process Name | {name} |
| Trigger | {what starts it} |
| End Condition | {what ends it} |
| Boundary Start | {first activity} |
| Boundary End | {last activity} |
| Inclusions | {in-scope items} |
| Exclusions | {out-of-scope items or "[Not specified]"} |
```

### Step 1.2: Extract SIPOC Elements

Read `references/sipoc-elements.md` for element definitions and extraction cues.

For each process step identified in the input, extract:

- **Suppliers**: Who/what provides the inputs? Use extraction cues from reference.
- **Inputs**: What materials, data, or information are consumed? Use extraction cues.
- **Process Step**: Name using `Verb + Noun Phrase` convention. Number sequentially.
- **Transformation**: What changes between input and output? Classify using transformation type codes (FMT, AGG, ENR, VAL, FLT, CAL, STS, RTE, DEC, ASM, AUT, NTF).
- **Outputs**: What is produced? Use extraction cues.
- **Customers**: Who receives or consumes the output? Use extraction cues.
- **Handoff**: How does the output reach the customer/next step? Classify using handoff type codes (DIR, QUE, SYS, MAN, REP, GAT, BRC, CBK).

**Safety rules**:
- Never invent process steps, stakeholders, or data that aren't in the source input
- If an element cannot be determined from the input, flag it as `[NEEDED: {description}]`
- Use the client's exact terminology — do not substitute generic terms
- If the input is ambiguous about a step, flag it as `[ASSUMED: {assumption}]`

### Step 1.3: Determine Hierarchy Levels

Analyze the extracted steps to identify natural decomposition levels:

- **L1**: The end-to-end process (always 1 item)
- **L2**: Major phases or sub-processes (typically 3–8 items)
- **L3**: Individual tasks within each sub-process (typically 2–5 per L2)

Rules:
- If the input describes only high-level phases → map as L1 with L2 sub-processes
- If the input includes detailed tasks → map as L1 → L2 → L3
- If `--level` flag limits depth, only decompose to that level
- Each L2 step should represent a coherent phase with its own SIPOC chain
- Each L3 step should be a specific, testable activity

### Step 1.4: Identify Variances

Scan the input for variance indicators:

- Exception paths ("if X fails", "when Y is missing", "error handling")
- Rejection flows ("rejected", "returned", "denied", "not approved")
- Escalation paths ("escalated to", "requires senior approval", "above threshold")
- Rework loops ("sent back", "corrected", "resubmitted")
- Branching logic ("if A then X, else Y", "international vs domestic")
- Timeout conditions ("if not received within", "SLA breach")

For each variance found, document using the template from `references/sipoc-elements.md`:

```markdown
### Variance: {descriptive name}

| Attribute | Value |
|-----------|-------|
| Variance ID | V-{parent_step_number}-{sequence} |
| Parent Step | {step where variance originates} |
| Category | {EXC\|REJ\|ESC\|RWK\|BRN\|TMO\|CAN} |
| Trigger | {condition causing deviation} |
| Rejoin Point | {where it merges back \| "Terminal" \| "Escalation"} |
| Frequency | {estimated or "[Unknown]"} |
| Impact | {Low \| Medium \| High \| Critical} |

**Sub-SIPOC Chain:**

| Supplier | Input | Process | Transformation | Output | Customer |
|----------|-------|---------|---------------|--------|----------|
| {supplier} | {input} | {variance handling step} | {transform} | {output} | {customer} |
```

If no variances are explicitly mentioned in the input, flag:
`[NEEDED: No variances documented — probe for at least: rejection path, timeout handling, escalation path]`

### Step 1.5: Draft Element Table

Compile all extracted elements into the draft SIPOC table:

```markdown
## Draft SIPOC Element Table

### L1: {Process Name}

| # | Suppliers | Inputs | Process Step | Transformation | Outputs | Customers | Handoff |
|---|-----------|--------|-------------|---------------|---------|-----------|---------|
| 1 | {supplier} | {input} | {step name} | {type code}: {description} | {output} | {customer} | {type code}: {mechanism} |
| 2 | ... | ... | ... | ... | ... | ... | ... |

### Transformation Chain
{Input 1} → [{type1}] → {Intermediate 1} → [{type2}] → ... → {Final Output}

### Handoff Map
| From | To | Type | Mechanism |
|------|----|------|-----------|
| Step 1 → Step 2 | {role} → {role} | {code} | {description} |

### Gaps & Assumptions
- [NEEDED: ...] (list all flagged gaps)
- [ASSUMED: ...] (list all assumptions made)
```

**If mode is `quick`**: Output the draft element table and stop here. Do NOT continue to L2.

Present the draft table and ask: *"SIPOC element extraction complete. Review the draft table above. Should I proceed to generate the full SIPOC Matrix and Hierarchy Diagram?"*

---

## Layer 2: Visualize & Connect (Weight: 35%)

L2 generates both output formats: the SIPOC Matrix (enhanced table) and the Hierarchy SIPOC (Mermaid diagram).

### Step 2.1: Generate SIPOC Matrix

Build the enhanced SIPOC Matrix table from the L1 draft elements. The matrix has two additional columns beyond classic SIPOC: **Transformation** and **Handoff**.

**Main Process Table:**

```markdown
## SIPOC Matrix: {Process Name}

| # | Suppliers | Inputs | Process Step | Transformation | Outputs | Customers | Handoff |
|---|-----------|--------|-------------|---------------|---------|-----------|---------|
| 1 | {supplier(s)} | {input(s)} | {step name} | {code}: {what changes} | {output(s)} | {customer(s)} | {code}: {mechanism} |
```

**Transformation Chain:**

Trace the end-to-end data/material flow showing every transformation:

```markdown
### Transformation Chain

{Original Input}
  → [Step 1: {transform_code}] → {Intermediate Output 1}
  → [Step 2: {transform_code}] → {Intermediate Output 2}
  → ...
  → [Step N: {transform_code}] → {Final Output}
```

**Handoff Map:**

Document all cross-boundary transfers:

```markdown
### Handoff Map

| # | From Step | From Role | To Step | To Role | Type | Mechanism | SLA | Failure Mode |
|---|-----------|-----------|---------|---------|------|-----------|-----|-------------|
| 1 | {step} | {role} | {step} | {role} | {code} | {how} | {time or "[TBD]"} | {what if it fails or "[TBD]"} |
```

**Variance Sub-Tables:**

For each variance identified in L1, create a sub-SIPOC table:

```markdown
### Variance: {name} (from Step {N})

**Trigger**: {condition}
**Category**: {code}
**Rejoin**: {point or Terminal/Escalation}

| # | Suppliers | Inputs | Process Step | Transformation | Outputs | Customers |
|---|-----------|--------|-------------|---------------|---------|-----------|
| V1 | {supplier} | {input} | {variance step} | {transform} | {output} | {customer} |
```

### Step 2.2: Generate Hierarchy SIPOC Diagram

Read `references/hierarchy-patterns.md` for Mermaid templates, node shapes, edge styles, and style definitions.

Build the Mermaid flowchart following these rules:

1. **Choose the template** based on complexity:
   - Single-level only → Template 1 (Single-Level Flow)
   - Multi-level, no variances → Template 2 (Multi-Level Hierarchy)
   - Has variances → Template 3 or 4 (with Variance Paths)

2. **Build the diagram** layer by layer:
   - Start with L1 subgraph containing the end-to-end SIPOC flow
   - Add L2 subgraphs for each sub-process (if `--level >= 2`)
   - Add L3 subgraphs for each task (if `--level >= 3`)
   - Add decomposition links (`-.->|"decomposes to"|`) between levels
   - Add variance subgraphs for each identified variance
   - Add variance branches (`==>|"trigger"|`) and rejoins (`-.->|"rejoins at"|`)

3. **Apply node shapes** per the reference:
   - Suppliers: `[/"name"/]` (parallelogram)
   - Inputs: `(["name"])` (stadium)
   - Process: `["name"]` (rectangle)
   - Outputs: `(["name"])` (stadium)
   - Customers: `[\"name"\]` (reverse parallelogram)

4. **Apply styles** — copy the standard `classDef` block from the reference and apply classes to all nodes.

5. **Add handoff labels** to edges between process steps: `-->|"handoff: {mechanism}"|`

6. **Check node count**: If the diagram would exceed 30 nodes, split per the rules in the reference (level split or variance split). Generate multiple diagrams with cross-reference notes.

7. **Use the naming convention** from the reference: `L1_S1`, `L2A_P`, `V1_I`, etc.

**Generate the diagram as a fenced Mermaid code block:**

````markdown
### Hierarchy SIPOC Diagram

```mermaid
flowchart TB
    %% [Generated diagram content here]
```
````

### Step 2.3: Render Diagram Preview

If `mcp__mermaid__mermaid_preview` is available, render the generated Mermaid diagram to verify it is valid:

```
mcp__mermaid__mermaid_preview: {mermaid_code}
```

If the preview fails (syntax error), fix the Mermaid code and retry. Common issues:
- Special characters in labels need quoting
- Subgraph IDs cannot contain spaces
- Node IDs must be unique across the entire diagram
- Arrow syntax must be exact (`-->`, `-.->`, `==>`)

### Step 2.4: Compile Full Report

Assemble the complete SIPOC report:

```markdown
---
report_number: {NNN}
title: "SIPOC: {Process Name}"
date: "{YYYY-MM-DD}"
format: {matrix|hierarchy|both}
level: {1|2|3}
mode: {quick|default|deep}
steps: {count}
variances: {count}
gaps: {count}
layer_1_score: {N}
layer_2_score: {N_or_NA}
layer_3_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---

# SIPOC Analysis: {Process Name}

## Process Scope
{scope table from L1}

## SIPOC Matrix
{enhanced matrix from Step 2.1}

## Transformation Chain
{chain from Step 2.1}

## Handoff Map
{map from Step 2.1}

## Variances
{variance sub-tables from Step 2.1}

## Hierarchy SIPOC Diagram
{Mermaid diagram from Step 2.2}

## Gaps & Assumptions
{consolidated list from L1}

## Score Summary
| Layer | Score | Weight |
|-------|-------|--------|
| L1: Extract & Map | {N}/100 | 0.40 |
| L2: Visualize & Connect | {N}/100 | 0.35 |
| L3: Publish & Persist | {N_or_NA} | 0.25 |
| **Composite** | **{N}/100** | |

## Score Trend
{If 2+ previous reports exist in workspace/sipoc-reports/, read their frontmatter and generate:}

| Run | Date | L1 | L2 | L3 | Composite | Delta |
|-----|------|----|----|----|-----------|-------|
| {previous runs from frontmatter} |
| **{current}** | **{date}** | **{L1}** | **{L2}** | **{L3}** | **{composite}** | **{delta}** |

Trajectory: {improving|declining|stable|first_run|insufficient_data}
```

Save the report to: `workspace/sipoc-reports/sp-{NNN}-{YYYY-MM-DD}.md`

Where `{NNN}` is a zero-padded sequential number. Check existing files in the directory to determine the next number. If the directory doesn't exist, create it.

**If mode is `default`**: Output the full report and stop here. Do NOT continue to L3.

---

## Layer 3: Publish & Persist (Weight: 25%)

L3 generates a presentation file and stores the analysis in Cortex for future reference.

### Step 3.1: Generate PPTX via file-factory

If `--output pptx` is specified or mode is `deep`, generate a PowerPoint presentation.

Use the `file-factory` skill (if available) to create a PPTX with these slides:

1. **Title Slide**: "SIPOC Analysis: {Process Name}" + date + author
2. **Process Scope**: Scope table as a formatted slide
3. **SIPOC Matrix**: The full enhanced matrix (may span multiple slides if many steps)
4. **Transformation Chain**: Visual flow of transformations
5. **Handoff Map**: Table of all handoffs
6. **Hierarchy Diagram**: Embed or reference the Mermaid diagram (as exported PNG if `mcp__mermaid__mermaid_save` is available)
7. **Variances**: One slide per variance with sub-SIPOC table
8. **Gaps & Next Steps**: Consolidated gaps list + recommended actions

If file-factory is not available, note: `[PPTX generation requires file-factory skill — skipped. Report saved as markdown.]`

Save PPTX to: `workspace/sipoc-reports/sp-{NNN}-{YYYY-MM-DD}.pptx`

### Step 3.2: Save Mermaid Diagram

If `mcp__mermaid__mermaid_save` is available, export the hierarchy diagram as PNG:

```
mcp__mermaid__mermaid_save: {mermaid_code} -> workspace/sipoc-reports/sp-{NNN}-{YYYY-MM-DD}-hierarchy.png
```

### Step 3.3: Store in Cortex

Remember the SIPOC analysis in Omni-Cortex:

```
cortex_remember:
  content: "SIPOC analysis: {process_name}. {step_count} process steps across {level_count} levels. Key transformations: {transform_summary}. {variance_count} variances identified. Handoff types: {handoff_summary}. Gaps: {gap_count} items flagged."
  tags: ["sipoc", "process-map", "{process_keywords}", "{client_name_if_known}"]
```

Search for related memories and link:

```
cortex_recall: "sipoc {process_keywords}"
cortex_recall: "process {process_keywords}"
cortex_link_memories: link to related SIPOC analyses, SOPs, or data pipelines
```

### Step 3.4: Summary Output

Present a summary to the user:

```markdown
## SIPOC Analysis Complete

| Metric | Value |
|--------|-------|
| Process | {name} |
| Steps Mapped | {count} |
| Hierarchy Levels | {L1/L2/L3} |
| Transformations | {count} |
| Handoffs | {count} |
| Variances | {count} |
| Gaps Flagged | {count} |

### Files Generated
- Report: `workspace/sipoc-reports/sp-{NNN}-{YYYY-MM-DD}.md`
- Diagram: `workspace/sipoc-reports/sp-{NNN}-{YYYY-MM-DD}-hierarchy.png` (if saved)
- Presentation: `workspace/sipoc-reports/sp-{NNN}-{YYYY-MM-DD}.pptx` (if generated)

### Cortex
- Memory stored: {memory_id}
- Linked to: {related_memory_ids or "no related memories found"}
```

---

## Per-Layer Scoring (0-100)

Each layer produces an independent score. Composite formula: `composite = (L1 × 0.40) + (L2 × 0.35) + (L3 × 0.25)`

If a layer is skipped (quick/default mode) or N/A, redistribute its weight equally among available layers.

### L1 Score: Extract & Map (Weight: 0.40)

| Criterion | Points | Deduction |
|-----------|--------|-----------|
| All process steps have S, I, P, O, C populated | 30 | -5 per `[NEEDED]` flag |
| Every step has a classified transformation (type code) | 20 | -5 per missing transformation |
| Every handoff documented with type code + mechanism | 20 | -5 per undocumented handoff |
| Variances identified with sub-SIPOC chains | 15 | -5 if zero variances flagged, -3 per missing sub-SIPOC |
| Hierarchy levels correctly decomposed | 15 | -5 if flat list only, -3 per uneven level |

### L2 Score: Visualize & Connect (Weight: 0.35)

| Criterion | Points | Deduction |
|-----------|--------|-----------|
| SIPOC Matrix complete with Transformation + Handoff columns | 25 | -5 per empty cell |
| Transformation Chain traces end-to-end flow | 20 | -10 if chain broken or missing |
| Handoff Map documents all cross-boundary transfers | 20 | -5 per missing handoff row |
| Mermaid diagram renders without syntax errors | 20 | -20 if invalid, -5 per manual fix needed |
| Variance sub-tables present for each identified variance | 15 | -5 per missing variance table |

### L3 Score: Publish & Persist (Weight: 0.25)

| Criterion | Points | Deduction |
|-----------|--------|-----------|
| Report saved with correct numbering and frontmatter | 30 | -15 if not saved, -5 per missing field |
| PPTX generated with all required slides | 25 | 0 if file-factory unavailable (N/A, redistribute) |
| Mermaid diagram exported as PNG | 15 | 0 if MCP unavailable (N/A, redistribute) |
| Cortex memory stored with tags and links | 30 | 0 if Cortex offline (N/A, redistribute) |

### Score Interpretation

- **80-100**: Excellent — production-ready output
- **60-79**: Good — minor gaps, usable with review
- **40-59**: Fair — needs attention, significant gaps
- **0-39**: Critical — major rework required

If composite < 60, identify the lowest-scoring layer and flag specific improvements.

---

## Safety Rules

1. **Never invent process steps, stakeholders, or data.** Only map what is described or clearly implied in the input. Flag gaps as `[NEEDED]`.
2. **Use client terminology.** Mirror the exact words from the input — do not substitute generic terms.
3. **Flag all assumptions.** If interpreting ambiguous input, mark as `[ASSUMED: ...]`.
4. **Split large diagrams.** If a Mermaid diagram exceeds 30 nodes, split per the rules in `references/hierarchy-patterns.md`.
5. **Validate Mermaid syntax.** Always attempt to preview via `mcp__mermaid__mermaid_preview` before presenting to user.
6. **No execution.** This skill analyzes and documents processes — it does not execute or automate them.
7. **Probe for variances.** If the input mentions no exceptions at all, flag that at least rejection, timeout, and escalation paths should be explored.
8. **Graceful degradation.** If Mermaid MCP is unavailable, skip preview/export and output raw code blocks. If file-factory is unavailable, skip PPTX and save markdown only. If Cortex is offline, skip persistence. Score unavailable sub-criteria as N/A and redistribute weight.

---

## Example Usage

```
/sipoc "Product hierarchy change management process" --mode quick
/sipoc "Customer onboarding from initial contact to first invoice"
/sipoc process-notes.md --format both --level 3
/sipoc "Order to cash cycle" --format matrix --output md
/sipoc "Vendor qualification and onboarding" --mode deep --output pptx
/sipoc incident-response-flow.txt --format hierarchy --level 2
```
