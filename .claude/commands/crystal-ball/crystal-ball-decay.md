---
description: Surface old decisions that may need re-validation given subsequent changes. Two modes - regular (lightweight) and deep (full directory scan with report + Part 2 prompt).
argument-hint: "[regular | deep] [days-threshold (default: 7)]"
allowed-tools: Read, Glob, Grep, Bash, Agent, Write, Edit, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_get_session_context
---

# Crystal Ball — Confidence Decay (Stale Decision Finder)

Find old decisions, reports, documentation, and specs that may need re-validation.

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

RAW_ARGS: $ARGUMENTS

## Step 0: Parse Arguments

Parse `RAW_ARGS` for mode and threshold:

1. **Mode detection**: Look for "deep" or "regular" as a token
   - If "deep" found: `MODE = deep`
   - If "regular" found or neither found: `MODE = regular`
2. **Threshold**: Look for a number in the remaining tokens
   - If number found: `DAYS_THRESHOLD = that number`
   - If no number: `DAYS_THRESHOLD = 7`

Examples:
- `/crystal-ball-decay` -> MODE=regular, DAYS_THRESHOLD=7
- `/crystal-ball-decay deep` -> MODE=deep, DAYS_THRESHOLD=7
- `/crystal-ball-decay 14` -> MODE=regular, DAYS_THRESHOLD=14
- `/crystal-ball-decay deep 30` -> MODE=deep, DAYS_THRESHOLD=30

---

## MODE: REGULAR (Lightweight Diagnostic)

The regular mode is a quick diagnostic that checks Omni-Cortex memories for stale decisions. Display-only — no saved report.

### Step 1: Query Stale Decisions

Use the pre-built query from `references/sql-queries.md` (Stale Decisions section):

```sql
SELECT id, content, importance_score, access_count,
  julianday('now') - julianday(created_at) as days_old
FROM memories
WHERE importance_score > 70 AND access_count < 3
  AND julianday('now') - julianday(created_at) > {DAYS_THRESHOLD}
  AND (type = 'decision' OR tags LIKE '%architecture%' OR tags LIKE '%planning%')
ORDER BY importance_score DESC;
```

If direct SQL fails, use Omni-Cortex MCP tools:
- `cortex_list_memories` with tags_filter ["architecture", "planning"]
- Filter by created_at older than threshold
- Check access_count and importance_score

### Step 2: Count Subsequent Changes

For each stale decision:
1. Count memories created AFTER it that relate to the same tags/topics
2. Check if any `supersedes` relationships exist
3. Check if the technology or feature it references has changed since

### Step 3: Calculate Decay Score

```
Decay_Risk = (days_old / threshold) * (subsequent_changes / 3) * (1 / access_count)
```

Higher decay risk = more likely to be stale.

### Step 4: Display Report

```
## Stale Decision Report
**Mode**: Regular  |  **Threshold**: [N] days  |  **Stale decisions found**: [N]

### High Decay Risk (re-validate immediately)
| Decision | Age | Importance | Last Accessed | Changes Since | Decay Risk |
|----------|-----|------------|--------------|---------------|------------|
| [brief]  | [N]d | [score]   | [date]       | [N] changes   | HIGH       |

Context: [Why this decision may be stale -- what changed since it was made]
Recommendation: [Specific re-validation action]

### Medium Decay Risk (review when convenient)
...

### Low Decay Risk (monitor)
...

### Summary
- Total stale: [N]
- High risk: [N] -- action needed
- Medium risk: [N] -- review soon
- Low risk: [N] -- monitoring only

> For a comprehensive project-wide scan including files, reports, and docs, run:
> `/crystal-ball-decay deep`
```

### Step 5: Store Results

```
cortex_remember:
  content: "Crystal Ball Decay (regular) -- [N] stale decisions found ([H] high risk). Threshold: [D] days."
  tags: ["crystal-ball", "decay", "{project-name}"]
  importance: 75
```

---

## MODE: DEEP (Full Project Directory Scan)

The deep mode performs a comprehensive scan of the entire project directory, cross-referencing all reports, specs, docs, SOPs, configs, and Omni-Cortex memories against recent findings. Produces a **saved report** and a **Part 2 prompt** for a follow-up session.

### Deep Step 1: Discover All Scannable Content

Launch **3 parallel Explore agents** to inventory the project:

```
Agent 1 (Explore): Reports & Specs Inventory
  - Glob: reports/**/*.md (all reports across all subdirectories)
  - Glob: specs/done/**/*.md, specs/todo/**/*.md
  - Glob: specs/roadmaps/*.md
  - For each file: extract YAML frontmatter (date, report_type, project_tag)
  - Return: list of {path, date, type, title}

Agent 2 (Explore): Documentation & Guides Inventory
  - Glob: Docs/**/*.md, docs/**/*.md (case-insensitive search)
  - Glob: *.md in project root (CLAUDE.md, README.md, etc.)
  - Glob: config/**/*.md, config/**/*.json
  - For each file: extract title line + any version/date markers
  - Return: list of {path, date_marker, title}

Agent 3 (Explore): Omni-Cortex Decision Memories
  - cortex_list_memories: tags_filter ["architecture", "planning", "decision"], limit 50, sort by created_at desc
  - cortex_list_memories: tags_filter ["crystal-ball"], limit 10, sort by created_at desc
  - cortex_list_memories: tags_filter ["handoff", "session-summary"], limit 5, sort by created_at desc
  - Return: list of {id, content_summary, tags, created_at, importance_score, access_count}
```

### Deep Step 2: Build the "Knowledge Timeline"

After agents return, construct a chronological timeline of all project knowledge:

```
For each item from all 3 agents:
  - Parse or estimate a date (YAML date, filename date pattern YYYY-MM-DD, or file modification time)
  - Assign a category: report, spec, doc, config, sop, memory, roadmap
  - Record key topics/tags mentioned in the content

Sort all items chronologically.
```

This timeline is the foundation for detecting what invalidates what.

### Deep Step 3: Cross-Reference for Invalidation

For each item in the timeline, check if **any later item** contradicts, supersedes, or significantly changes its assumptions:

**Invalidation detection patterns:**

| Pattern | Example | How to Detect |
|---------|---------|---------------|
| **Direct supersession** | far-001 supersedes ps-002 assumptions | Later report references earlier report by ID and changes conclusions |
| **Decision reversal** | ADR-009 (N8N -> Python) invalidates nwa-001, nwp-001 | ADR changes a technology that earlier reports analyzed |
| **Assumption collapse** | "Zero API documentation" assumption proven wrong by far-001 | Grep for the assumption text in earlier docs; check if later findings contradict |
| **Stale data** | Cost calculations from Feb when prices changed in March | Check if numerical data (costs, scores, percentages) are referenced in later corrections |
| **Scope change** | Spec scope expanded/reduced after SOP was written | Compare spec version dates against dependent docs |
| **Technology obsolescence** | N8N workflows referenced after Python migration decision | Grep for deprecated technology names in current docs |

**Implementation approach:**

For each report/doc older than `DAYS_THRESHOLD`:
1. Read its content (first 100 lines for large files)
2. Extract key claims, assumptions, and referenced technologies
3. Search the timeline for later items that touch the same topics
4. Score the invalidation risk:

```
Invalidation_Risk = base_risk

Modifiers:
  + 30 if a later report explicitly references this item's ID and changes conclusions
  + 25 if a decision (ADR) changes a technology this item analyzes
  + 20 if key assumptions are contradicted by later findings
  + 15 if numerical data (costs, scores) have been updated elsewhere
  + 10 if the item references deprecated technology/patterns
  + 5 per month since last access or update
  - 20 if the item is marked as "reference" or "historical" (intentionally preserved)

Cap at 100, floor at 0.
```

**Categorize each item:**
- **STALE** (risk > 70): Content is materially wrong or misleading. Must be updated or archived.
- **DECAYED** (risk 40-70): Some assumptions have shifted. Needs review and selective updates.
- **CURRENT** (risk < 40): Still valid. No action needed.

### Deep Step 4: Identify Skill Re-Run Candidates

For items categorized as STALE or DECAYED:
1. Check if the item was produced by a known skill (check `report_type` in YAML frontmatter)
2. If yes, determine if re-running the skill with updated inputs would refresh the content
3. Map each stale report to the skill that created it:

| Report Type | Skill to Re-Run | Input Needed |
|-------------|-----------------|--------------|
| probability-storm | `/probability-storm` | Updated decision description + new evidence |
| crystal-ball-* | `/crystal-ball` variant | Current project state |
| data-pipeline | `/data-pipeline` | Updated source/target schemas |
| sop-gen | `/sop-gen` | Updated process description |
| exploding-pen | `/exploding-pen` | Current codebase state |
| unified-field-theory | `/unified-field-theory` | Current specs |

4. Check if any of these skills appear in the skill execution roadmap (`specs/roadmaps/ROADMAP-skill-execution.md`). If a re-run aligns with a pending roadmap step, note it.

### Deep Step 5: Generate the Decay Report (SAVED)

**IMPORTANT:** Deep mode saves a report. Determine next `cb-NNN` from existing `reports/crystal-ball/cb-*.md` files.

Write report to: `reports/crystal-ball/cb-{NNN}-{DATE}-deep-decay-scan.md`

```markdown
---
report_type: "crystal-ball-decay-deep"
report_number: "cb-{NNN}"
date: "{YYYY-MM-DD}"
project_name: "{project}"
mode: "deep"
days_threshold: {N}
items_scanned: {total}
items_stale: {stale_count}
items_decayed: {decayed_count}
items_current: {current_count}
skills_to_rerun: {rerun_count}
---

# Crystal Ball Deep Decay Scan

**Date**: {date}  |  **Project**: {project}  |  **Threshold**: {N} days
**Items Scanned**: {total}  |  **Stale**: {stale}  |  **Decayed**: {decayed}  |  **Current**: {current}

---

## Executive Summary

[2-3 sentence summary: how many items need attention, what the biggest invalidation drivers are, and the overall health of the project's documentation.]

---

## STALE Items (Must Address)

### [Item 1 — path/to/file.md]
- **Category**: report | spec | doc | sop | config | memory
- **Created**: {date}  |  **Last Modified**: {date}
- **Invalidation Risk**: {score}/100
- **What Changed**: [Specific later findings that invalidate this]
- **Key Stale Claims**:
  - "[quoted claim]" -- now contradicted by [source]
  - "[quoted claim]" -- technology/approach has been replaced by [what]
- **Recommended Action**: [Update in place | Archive to legacy/ | Re-run skill | Delete]
- **Skill to Re-Run**: [skill name] with [input description] (if applicable)
- **Roadmap Alignment**: [ROADMAP step X if applicable, or "N/A"]

### [Item 2...]
...

---

## DECAYED Items (Review When Convenient)

### [Item — path/to/file.md]
- **Invalidation Risk**: {score}/100
- **What Shifted**: [Brief description of what assumptions changed]
- **Recommended Action**: [Selective update | Add disclaimer | Re-validate section X]

...

---

## Current Items (No Action Needed)

[Count only -- don't list individual items unless they're notable for being surprisingly current despite age]

Total current: {N} items

---

## Skill Re-Run Summary

| # | Skill | Report to Refresh | Input Needed | Roadmap Step | Priority |
|---|-------|-------------------|--------------|--------------|----------|
| 1 | [skill] | [report ID] | [brief input] | [step or N/A] | HIGH/MED/LOW |

---

## Legacy/Archive Candidates

Items that should be moved to `{category}/legacy/` or `{category}/archive/` subdirectories:

| # | Current Path | Recommended Destination | Reason |
|---|-------------|------------------------|--------|
| 1 | [path] | [new path] | [reason] |

---

## File Organization Recommendations

[Any structural recommendations: new subdirectories, naming convention fixes, cross-reference updates needed]

---

## Part 2: Update Execution Prompt

The following prompt can be copied into a **new terminal session** to execute all recommended updates from this decay scan. This keeps the analysis (Part 1) and execution (Part 2) in separate context windows.

~~~
[GENERATED PROMPT — see Deep Step 6 below for generation rules]
~~~
```

### Deep Step 6: Generate Part 2 Prompt

At the bottom of the report (inside the "Part 2: Update Execution Prompt" section), generate a ready-to-copy prompt that:

1. **References the decay report** by path so the new session can read it
2. **Lists every STALE and DECAYED item** with its specific recommended action
3. **Groups actions by type** for efficient execution:
   - Group A: Files to move/archive (simple file operations)
   - Group B: Content updates (edit specific sections in files)
   - Group C: Skills to re-run (with exact invocations)
   - Group D: Cross-references to update (other files that reference stale items)
4. **Includes safety instructions**: read before modifying, git commit between groups, verify after each change
5. **Ends with a verification checklist**

**Part 2 Prompt Template:**

````
You are continuing a Crystal Ball Deep Decay analysis. Part 1 (scan) is complete.
Your job is Part 2: execute the recommended updates.

## Context

Read the decay report first:
`reports/crystal-ball/cb-{NNN}-{DATE}-deep-decay-scan.md`

This report identified {stale_count} STALE and {decayed_count} DECAYED items
across the project. Execute the following update groups in order.

## Group A: Archive/Move Legacy Files ({count} files)

Move these files to their respective legacy subdirectories.
Create the subdirectory if it doesn't exist.

{For each file:}
- [ ] Move `{current_path}` to `{new_path}`
      Reason: {reason}

After completing Group A, create a git commit:
`git add -A && git commit -m "chore: archive {N} legacy files per cb-{NNN} decay scan"`

## Group B: Content Updates ({count} files)

For each file below, read it first, then make the specified edits.

{For each file:}
- [ ] **{path}**
      Action: {specific edit instruction}
      What changed: {what invalidated this content}
      Section to update: {section name or line range}

After completing Group B, create a git commit:
`git add -A && git commit -m "docs: update {N} decayed files per cb-{NNN} decay scan"`

## Group C: Skills to Re-Run ({count} skills)

These skills should be re-run with updated inputs to refresh stale reports.
Run each one and verify the output before proceeding to the next.

{For each skill:}
- [ ] `/{skill-name} {arguments}`
      Refreshes: {report ID}
      Why: {what changed since last run}

## Group D: Cross-Reference Updates ({count} references)

Other files reference items that changed in Groups A-C. Update these references.

{For each reference:}
- [ ] In `{file_path}`, update reference to `{old_reference}` -> `{new_reference}`

## Verification Checklist

After all groups are complete:
- [ ] Run `git status` to confirm all changes are committed
- [ ] Verify no broken cross-references: `grep -r "{old_path_patterns}" {project_root}`
- [ ] Update `reports/MANIFEST.md` if any reports were archived or refreshed
- [ ] Store completion in Omni-Cortex: `cortex_remember` with tags ["crystal-ball", "decay-update", "{project}"]
````

### Deep Step 7: Store Results

```
cortex_remember:
  content: "Crystal Ball Deep Decay Scan -- {total} items scanned. {stale} STALE, {decayed} DECAYED, {current} CURRENT. Report: reports/crystal-ball/cb-{NNN}-{DATE}-deep-decay-scan.md. Part 2 prompt included for update execution."
  tags: ["crystal-ball", "decay", "deep-scan", "{project-name}"]
  importance: 85
```

### Deep Step 8: Present Summary to User

After saving the report, display:

```
## Deep Decay Scan Complete

**Report saved**: reports/crystal-ball/cb-{NNN}-{DATE}-deep-decay-scan.md

### Results
- Items scanned: {total}
- STALE (must address): {N}
- DECAYED (review soon): {N}
- Current (no action): {N}
- Skills to re-run: {N}
- Files to archive: {N}

### Top 3 Most Urgent Items
1. {item} -- {why}
2. {item} -- {why}
3. {item} -- {why}

### Next Step
Copy the **Part 2 prompt** from the bottom of the report into a new terminal session
to execute all updates with a fresh context window.

The Part 2 prompt is self-contained -- it references the report, lists every action
grouped by type, and includes git commit points and a verification checklist.
```

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Parse $ARGUMENTS for mode (regular/deep, default: regular) and days threshold (default: 7)
- Regular mode: query Cortex for stale high-importance decisions; display only, no saved report
- Deep mode: run 3 parallel agents to inventory all reports, docs, and Cortex memories; save report
- Deep mode produces a saved report AND a Part 2 execution prompt for a follow-up session
- Store results in Cortex with tags ["crystal-ball", "decay", "{project-name}"]

## Workflow

1. Parse $ARGUMENTS for MODE (regular/deep) and DAYS_THRESHOLD
2. For regular: query cortex_list_memories for stale decisions; calculate decay scores; display report
3. For deep: launch 3 parallel agents (reports/specs, docs/configs, Cortex memories)
4. Build knowledge timeline; cross-reference for invalidation using defined patterns
5. Score each item (STALE/DECAYED/CURRENT); identify skill re-run candidates
6. For deep: save report to reports/crystal-ball/cb-{NNN}-{date}-deep-decay-scan.md
7. For deep: generate Part 2 execution prompt embedded in the report

## Report

```
## Stale Decision Report (regular) | ## Deep Decay Scan Complete (deep)

**Mode:** {regular|deep} | **Threshold:** {N} days
**Items scanned:** {N} | **STALE:** {N} | **DECAYED:** {N} | **Current:** {N}

[regular: stale decisions table with decay risk scores]
[deep: top 3 urgent items; report path; Part 2 prompt instructions]

**Saved to (deep only):** reports/crystal-ball/cb-{NNN}-{date}-deep-decay-scan.md
```
