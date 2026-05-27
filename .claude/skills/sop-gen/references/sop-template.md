# SOP Template Reference

This document defines the standard 12-section SOP structure. Every generated SOP must include all 12 sections (some may be marked N/A if not applicable).

---

## Section 1: Document Control

**Purpose:** Identify and track the document itself.

| Field | Description |
|-------|-------------|
| SOP Number | Unique identifier (format: SOP-{DOMAIN}-{NNN}) |
| Version | Semantic version (start at 1.0) |
| Effective Date | Date the SOP becomes active |
| Author | Person who wrote/generated the SOP |
| Approved By | Person with authority to approve |
| Review Date | Next scheduled review (default: 6 months from effective date) |

Template:
```markdown
| Field | Value |
|-------|-------|
| **SOP Number** | SOP-{DOMAIN}-{NNN} |
| **Version** | 1.0 |
| **Effective Date** | {YYYY-MM-DD} |
| **Author** | {author} |
| **Approved By** | {approver or [NEEDED: Approver]} |
| **Review Date** | {YYYY-MM-DD + 6 months} |
```

---

## Section 2: Purpose

**Purpose:** State why this procedure exists in 1-2 sentences.

Guidelines:
- Answer: "What problem does this solve?"
- Be specific, not generic
- Include the business value

Template:
```markdown
## 2. Purpose

This procedure establishes the standard process for {what the process does} to ensure {business outcome}. It applies when {trigger condition}.
```

---

## Section 3: Scope

**Purpose:** Define boundaries -- who it applies to, when to use it, what it covers and excludes.

Guidelines:
- List who must follow this SOP (roles, teams, departments)
- List when this SOP applies (triggers, conditions)
- Explicitly state what is OUT of scope

Template:
```markdown
## 3. Scope

### Applies To
- {Role/Team 1}
- {Role/Team 2}

### When to Use
- {Trigger condition 1}
- {Trigger condition 2}

### Out of Scope
- {Exclusion 1}
- {Exclusion 2}
```

---

## Section 4: Definitions

**Purpose:** Define key terms, acronyms, and jargon used in the SOP.

Guidelines:
- Include any term that a new hire would not immediately understand
- Include all acronyms with their expansions
- Keep definitions concise (1 sentence)

Template:
```markdown
## 4. Definitions

| Term | Definition |
|------|-----------|
| {Term/Acronym} | {Clear, concise definition} |
```

---

## Section 5: RACI Matrix

**Purpose:** Clarify who does what for each major step.

RACI Roles:
- **R** (Responsible): Performs the work
- **A** (Accountable): Final decision-maker, signs off
- **C** (Consulted): Provides input before the work
- **I** (Informed): Notified after the work is done

Guidelines:
- Every step must have exactly ONE "A" (Accountable)
- Every step must have at least one "R" (Responsible)
- Roles should come from user input or be flagged as [NEEDED: Role names]
- Do NOT invent organization-specific role names

Template:
```markdown
## 5. RACI Matrix

| Step | {Role 1} | {Role 2} | {Role 3} | {Role 4} |
|------|:--------:|:--------:|:--------:|:--------:|
| {Step 1 name} | R | A | C | I |
| {Step 2 name} | R | A | | I |
```

---

## Section 6: Prerequisites

**Purpose:** List everything required before starting the procedure.

Categories:
- **Access/Permissions**: System access, credentials, approvals needed
- **Tools/Software**: Applications, scripts, hardware required
- **Training**: Required knowledge or certifications
- **Data/Materials**: Files, forms, reference materials needed

Template:
```markdown
## 6. Prerequisites

### Access Required
- [ ] {System/tool} access with {permission level}

### Tools Required
| Tool | Purpose | How to Get |
|------|---------|-----------|
| {Tool} | {What it's used for} | {URL or install method} |

### Training Required
- [ ] {Training/certification}

### Materials Needed
- [ ] {Document, form, or data set}
```

---

## Section 7: Procedure

**Purpose:** Step-by-step instructions for performing the process.

Guidelines:
- Start every step with an **action verb** (Click, Enter, Verify, Navigate, Run, Select, Submit, etc.)
- Number steps sequentially across all phases
- Use a.b notation for sub-steps (e.g., 3a, 3b)
- Include expected outcomes for non-obvious steps
- Add `[SCREENSHOT: {description}]` placeholders where visual aids would help
- Keep steps atomic -- one action per step
- Each phase/section should end with a verification checkpoint

Template:
```markdown
## 7. Procedure

### Phase 1: {Phase Name}

1. **{Action verb} {specific instruction}**
   - Expected result: {what should happen}
   - [SCREENSHOT: {description of what to capture}]

2. **{Action verb} {specific instruction}**
   - Input: {what data/file is needed}
   - Output: {what is produced}
   - 2a. {Sub-step if needed}
   - 2b. {Sub-step if needed}

> **Checkpoint:** Verify {what to check before proceeding}

### Phase 2: {Phase Name}

3. **{Action verb} {specific instruction}**
   ...
```

---

## Section 8: Decision Trees

**Purpose:** Document branching logic for steps with multiple possible paths.

Guidelines:
- Use ASCII flowcharts for Markdown output
- Use indented IF/THEN/ELSE blocks for simple branches
- Always include a default/fallback path
- Reference step numbers for navigation

Template:
```markdown
## 8. Decision Trees

### Decision Point: {Name}

**At Step {N}, evaluate: {condition}**

```
                    [{condition}]
                    /           \
                 YES             NO
                  |               |
          [Step {X}]       [{sub-condition}]
                           /              \
                        YES                NO
                         |                  |
                  [Step {Y}]        [Escalate to {role}]
```

**Plain text version:**
- **IF** {condition A}: Proceed to Step {X}
  - **IF** {sub-condition}: Proceed to Step {Y}
  - **ELSE**: Escalate to {role}
- **ELSE**: Proceed to Step {Z}
```

---

## Section 9: Exception Handling

**Purpose:** Document what to do when the normal procedure fails.

Guidelines:
- List common failure modes and their resolutions
- Include an escalation path with timeframes
- Provide rollback steps where applicable

Template:
```markdown
## 9. Exception Handling

### Common Issues

| # | Error / Symptom | Likely Cause | Resolution | Escalation |
|---|-----------------|-------------|------------|------------|
| 1 | {Error message or symptom} | {Root cause} | {Steps to fix} | {Who to contact if unresolved} |

### Escalation Path
1. **Self-service**: Try the resolution steps above
2. **Tier 1**: Contact {role/team} via {channel} (response within {timeframe})
3. **Tier 2**: Escalate to {manager/lead} if unresolved after {timeframe}

### Rollback Procedure
If the process must be reversed:
1. {Rollback step 1}
2. {Rollback step 2}
```

---

## Section 10: Quality Checks

**Purpose:** Verification steps to confirm the procedure was followed correctly.

Guidelines:
- Create a checklist that can be used as a sign-off
- Include both completeness checks (was everything done?) and quality checks (was it done correctly?)
- Reference specific outputs and expected states

Template:
```markdown
## 10. Quality Checks

### Completeness
- [ ] All steps in Section 7 completed
- [ ] All required outputs generated
- [ ] All stakeholders notified

### Quality
- [ ] {Specific quality criterion 1}
- [ ] {Specific quality criterion 2}
- [ ] No errors or warnings in {system/log}

### Sign-Off
| Reviewer | Date | Status |
|----------|------|--------|
| {Role} | {Date} | Approved / Rejected |
```

---

## Section 11: References

**Purpose:** Link to related documents, SOPs, policies, and external resources.

Template:
```markdown
## 11. References

### Related SOPs
- {SOP-XXX-NNN}: {Title}

### Policies
- {Policy name}: {Link or location}

### External Resources
- {Resource name}: {URL}

### Tools Documentation
- {Tool name}: {Documentation URL}
```

---

## Section 12: Version History

**Purpose:** Track changes to the SOP over time.

Guidelines:
- Version 1.0 is always the initial version
- Do NOT pre-populate future changes
- Use semantic versioning: major.minor (1.0, 1.1, 2.0)
  - Minor: clarifications, formatting, small updates
  - Major: process changes, new steps, removed steps

Template:
```markdown
## 12. Version History

| Version | Date | Author | Description of Changes |
|---------|------|--------|----------------------|
| 1.0 | {YYYY-MM-DD} | {Author} | Initial version |
```

---

## Audit Checklist

When auditing an existing SOP, check for:

1. **Section completeness**: Are all 12 sections present?
2. **Step specificity**: Are steps actionable (start with verbs) or vague ("do the thing")?
3. **RACI coverage**: Does every step have clear R and A roles?
4. **Decision tree coverage**: Are all branching points documented?
5. **Exception handling**: Are common failure modes addressed?
6. **Screenshot placeholders**: Are visual aids indicated for complex UI steps?
7. **Prerequisites completeness**: Are all access/tools/training requirements listed?
8. **Version currency**: Is the SOP within its review date?
9. **Cross-references**: Are related SOPs and policies linked?
10. **Definitions**: Are all jargon and acronyms defined?
