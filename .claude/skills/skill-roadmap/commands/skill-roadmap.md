# Skill Roadmap -- Execution Logic (L1 + L2 + L3 + L4)

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

Step-by-step execution for the Skill Roadmap skill. Follow these steps exactly.

---

## Step 0: Parse Arguments and Determine Mode

1. Check the argument passed to the skill:
   - **No argument** -> Default mode (L1 + L2 + L3 with rationale, save report + roadmap)
   - **`scan`** -> Scan mode (L1 inventory only, terminal output, no report)
   - **`quick`** -> Quick mode (L1 + L2 + L3 without rationale, medium-detail roadmap, no report)
   - **`deep`** -> Deep mode (L1 + L2 + L3 with full rationale, full-detail roadmap, save report)
   - **`update`** -> Update mode (L1 + L2 + L3, re-scan and merge with existing roadmap, save report)
2. Check for `--domain <name>` flag (can combine with any mode). If present, store domain filter for L4.
3. Record the mode for later use.

## Step 1: L1 -- Capability Discovery

Build a complete inventory of all accessible skills, commands, and MCP tools.

### 1.1: Discover Skills

Glob for skills in priority order (project-level overrides universal):

1. **Project skills:** `{cwd}/.claude/skills/*/SKILL.md` (also check lowercase `skill.md`)
2. **Universal skills:** `~/.claude/skills/*/SKILL.md` (also check lowercase `skill.md`)

For each SKILL.md found:
- Extract `name` from frontmatter (fallback: parent directory name)
- Extract `description` from frontmatter
- Extract `argument-hint` from frontmatter
- Count layers: search body for `| L1 |`, `| L2 |`, etc. or `Layer` table rows
- Detect modes: search for mode matrix table entries
- Classify scope: `universal` if under `~/.claude/skills/`, `project` if under `{cwd}/.claude/skills/`

**Deduplication:** If a skill name appears at both project and universal level, keep the project-level entry and mark it `project (overrides universal)`.

### 1.2: Discover Commands

Glob for commands:

1. **Project commands:** `{cwd}/.claude/commands/*.md`
2. **Universal commands:** `~/.claude/commands/*.md`

For each command file:
- Extract `name` from frontmatter (fallback: filename without `.md`)
- Extract `description` from frontmatter (fallback: first non-empty line of body)
- Extract `argument-hint` from frontmatter
- Classify scope: `universal` or `project`

**Deduplication:** Project-level overrides universal.

**Subdirectory commands:** Also check `~/.claude/commands/*/` for multi-file commands (like crystal-ball). The parent directory name is the command name.

### 1.3: Discover MCP Tools

Read `~/.claude.json` to find registered MCP servers:

1. Parse the `mcpServers` key to get server names
2. For each server, note the server name and its command/args
3. Use `ListMcpResourcesTool` with each server name to enumerate available tools (if accessible)
4. If tool enumeration is not available, list known server names only with description "MCP server - tools not enumerated"

Record each MCP tool as:
- `name`: `{server-name}:{tool-name}` (or just `{server-name}` if tools not enumerable)
- `description`: from tool metadata or inferred from server name

### 1.4: Classify Weights

Read `references/weight-heuristics.md` for classification rules.

For each discovered capability, assign a weight tier:
- **Light**: Single-file commands, no layers, no deep mode
- **Medium**: 2-3 layers, generates reports, multi-step workflows
- **Heavy**: 4+ layers with deep mode, sub-agent spawning, agent-teams

Apply auto-detection rules from the reference file in order.

### 1.5: Build Inventory

Compile all discovered capabilities into a structured inventory.

**L1 Scoring:**
- Start at 100
- Deduct -5 for each discovery path that returns zero results (indicates misconfigured environment)
- Deduct -10 if MCP tool enumeration fails entirely
- Deduct -3 if fewer than 5 total capabilities discovered (sparse environment)
- Bonus +5 if project-level skills/commands exist (indicates project customization)
- Floor at 0, cap at 100

### 1.6: L1 Output

Display the capability inventory:

```markdown
## Capability Inventory

**Discovered:** {N} skills, {M} commands, {P} MCP tools ({total} total)
**Environment:** {project-name} at {cwd}

### Universal Skills ({count})
| Name | Layers | Modes | Weight | Description |
|------|--------|-------|--------|-------------|
| crystal-ball | 6 | full, per-spec, sub-skills | Heavy | Design coherence auditor... |
| exploding-pen | 4 | quick, default, deep, scan | Heavy | Capability gap scanner... |
| ... | | | | |

### Universal Commands ({count})
| Name | Weight | Description |
|------|--------|-------------|
| commit | Light | Generate Git Commit |
| build | Medium | Build codebase from plan... |
| ... | | | |

### Project Skills ({count})
| Name | Layers | Modes | Weight | Description |
|------|--------|-------|--------|-------------|
(empty if none found)

### Project Commands ({count})
| Name | Weight | Description |
|------|--------|-------------|
(empty if none found)

### MCP Tools ({count})
| Server | Tool | Description |
|--------|------|-------------|
| omni-cortex | cortex_remember | Store memories... |
| patent-office | patent_search_packages | Search registries... |
| ... | | |
```

**If in `scan` mode:** Output the inventory to the terminal, display L1 score, and STOP.

---

## Step 2: L2 -- Project Analysis + Classification

### 2.1: Gather Project Context

Collect lightweight project signals (do NOT deep-scan the codebase):

1. **Read CLAUDE.md** (project root) — extract key instructions, workflow info, project description
2. **List specs:** Glob `specs/todo/*.md` and `specs/done/**/*.md` — count pending vs done
3. **List roadmaps:** Glob `specs/roadmaps/ROADMAP-*.md` — note project names
4. **Read package.json** (or `pyproject.toml`, `Cargo.toml`, `go.mod`) — extract project type, dependencies, scripts
5. **Check git history:** `git log --oneline -10` — recent activity summary
6. **If `--domain` specified:** Filter context signals to that domain only

Store as project context signals:
```
project_name: "{from CLAUDE.md or directory name}"
project_type: "{web-app|api|cli|library|skill-ecosystem|...}"
languages: ["{detected languages}"]
has_specs: {true/false}
spec_count_todo: {N}
spec_count_done: {N}
has_roadmaps: {true/false}
dependency_count: {N}
domain_filter: "{domain or null}"
```

### 2.2: Classify Each Capability

Read `references/purpose-taxonomy.md` for classification rules.

For each capability from the L1 inventory:

1. **Assign purpose group:** Walk the decision tree in the taxonomy reference:
   - Analyzes before building? -> Audit
   - Discovers structure? -> Map
   - Produces documentation? -> Document
   - Creates code/skills? -> Build
   - Verifies quality? -> Validate
   - Maintains existing work? -> Maintain

2. **Assign classification tier** based on project context signals:
   - **Essential:** Directly addresses a known project need (spec mentions it, project type matches, dependencies align)
   - **Recommended:** High-value for the project type even if not explicitly requested
   - **Optional:** Available but not specifically needed

3. **Generate rationale** (default + deep modes only, skip in quick mode):
   - One sentence explaining WHY this classification was chosen
   - Reference the specific project signal that triggered it

### 2.3: L2 Scoring

- Start at 100
- Deduct -3 for each capability that couldn't be classified (ambiguous purpose)
- Deduct -5 if project context was sparse (no CLAUDE.md, no specs, no package.json)
- Deduct -5 if domain filter returned zero matches
- Bonus +5 if at least 3 essential capabilities found (good project-tool fit)
- Bonus +3 if all 6 purpose groups have at least one entry (well-rounded coverage)
- Floor at 0, cap at 100

### 2.4: L2 Output

```markdown
## Project Analysis: {project-name}

**Project type:** {type} | **Languages:** {langs} | **Specs:** {done}/{total}

### Classification Summary
| Classification | Count | Capabilities |
|---------------|-------|-------------|
| Essential | {N} | {comma-separated names} |
| Recommended | {M} | {comma-separated names} |
| Optional | {P} | {comma-separated names} |

### By Purpose
| Purpose | Essential | Recommended | Optional |
|---------|-----------|-------------|----------|
| Audit | {list} | {list} | {list} |
| Map | {list} | {list} | {list} |
| Document | {list} | {list} | {list} |
| Build | {list} | {list} | {list} |
| Validate | {list} | {list} | {list} |
| Maintain | {list} | {list} | {list} |

### Rationale (default/deep mode only)
- **{skill-name}** -> {ESSENTIAL|RECOMMENDED|OPTIONAL}: {one-sentence reason}
- ...
```

**If in `quick` mode:** Output classification summary and purpose table without rationale. Do not save report. Continue to Step 3 (L3) with medium detail level.

---

## Step 3: L3 + L4 -- Roadmap Generation

**Mode gate:** Skip this entire step if mode is `scan`. For all other modes (quick, default, deep, update), proceed.

### 3.1: L4 Domain Filtering (only if `--domain` flag is set)

Read `references/domain-discovery.md` for detection heuristics.

If `--domain <name>` was provided:

1. **Discover domain indicators** in the project:
   - Directory matches: Glob `{cwd}/src/{domain}*/**`, `{cwd}/packages/{domain}*/**`, `{cwd}/apps/{domain}*/**`, `{cwd}/modules/{domain}*/**`
   - Spec mentions: Grep `specs/` for domain name in titles/overviews
   - CLAUDE.md references: Grep CLAUDE.md for domain name in section headers
2. For comma-separated domains (`--domain a,b`): combine matches from each domain
3. **Reclassify** L2 results through the domain lens:
   - Capabilities relevant to the domain: may PROMOTE (Optional -> Recommended, Recommended -> Essential)
   - Capabilities irrelevant to the domain: DEMOTE to Optional
   - Pre-filled arguments should target domain-specific files/directories
4. Store the filtered classifications for wave assignment

If no `--domain` flag: use L2 classifications as-is. Skip to Step 3.2.

### 3.2: Check for Existing Roadmap (Update Mode Only)

If `update` mode:
1. Glob `specs/roadmaps/ROADMAP-skill-execution*.md` for existing roadmaps
2. If found, read the existing roadmap
3. Parse completion status: extract all `[x]` items and their step IDs (e.g., `W0.1`, `W1.3`)
4. Store completed items map for merge in Step 3.9
5. Continue to Step 3.3

If not `update` mode: skip to Step 3.3.

### 3.3: Read References

1. Read `~/.claude/skills/ROADMAP-TEMPLATE.md` for section menu and format standards
2. Read `references/wave-sequencing.md` for wave assignment algorithm

### 3.4: Assign Waves

Using the wave sequencing algorithm from the reference:

1. **Filter capabilities:** Only Essential and Recommended capabilities from L2 (or L4-filtered L2) get wave assignments. Optional capabilities go to a "Not Scheduled" appendix section.

2. **Group by purpose:** Organize filtered capabilities into their L2 purpose groups:
   - Audit, Map, Document, Build, Validate, Maintain

3. **Map to default wave order:**
   - Wave 0: Audit (essential only)
   - Wave 1: Map + Analyze
   - Wave 2: Document
   - Wave 3: Build
   - Wave 4: Validate
   - Wave 5: Maintain

4. **Skip empty waves:** If a purpose group has zero Essential/Recommended entries, omit that wave entirely.

5. **Renumber contiguously:** After skipping empties, renumber starting from 0 (no gaps).

6. **Sub-wave splitting:** If any wave has >5 items, split into sub-waves (e.g., W2A, W2B). Target 3-5 items per sub-wave. Group related capabilities together.

### 3.5: Determine Execution Method per Wave

For each wave, apply the decision matrix from `references/wave-sequencing.md`:

| Condition | Execution Method |
|-----------|-----------------|
| Single capability in wave | SEQUENTIAL |
| Multiple light/medium, all independent | PARALLEL (agent-teams xN) |
| Multiple heavy, all independent | PARALLEL (terminal xN) |
| Mix of heavy + light | PARALLEL (mixed) |
| Chain dependency within wave | SEQUENTIAL within wave |
| Interactive capability (needs user input) | SEQUENTIAL (separate terminal) |

Store the execution method with each wave.

### 3.6: Pre-fill Arguments

For each capability assigned to a wave:

1. Read its `argument-hint` from the L1 inventory
2. Match hint patterns to project context signals gathered in L2:
   - `<file-path>` -> Glob for relevant files in project, pick most relevant
   - `<spec-file>` -> Match to first spec in `specs/todo/`
   - `<roadmap-path>` -> Match to project roadmap in `specs/roadmaps/`
   - `<description>` -> Generate from CLAUDE.md or project context
   - Mode flags (`quick | deep`) -> Choose based on classification tier: essential=deep, recommended=default
3. If no pattern matches: leave the command bare with a `# user fills in` comment
4. For domain-filtered roadmaps: target domain-specific files/directories in arguments

Track the number of successfully pre-filled vs bare commands for L3 scoring.

### 3.7: Determine Detail Level

Count total steps (capabilities assigned to waves).

| Condition | Detail Level | Template Sections |
|-----------|-------------|-------------------|
| <5 steps OR quick mode | Medium | Frontmatter, Title, Strategy, Status Counter, Checklist, Per-Wave (no rationale, no artifacts), Key Files, Getting Started |
| 5+ steps (default/deep) | Full | ALL sections: + Execution Rules, Quick Reference, Execution Timeline, Agent Teams Config, per-wave Rationale + Expected Artifacts |

### 3.8: Generate Roadmap Document

Build the roadmap following ROADMAP-TEMPLATE.md section menu. Generate each applicable section:

**1. YAML Frontmatter:**
```yaml
---
project: "{project-name}"
type: "skill-execution"
created: "{YYYY-MM-DD}"
updated: "{YYYY-MM-DD}"
status: "PLANNING"
domain: "{domain or null}"
capabilities_total: {N}
essential_count: {N}
recommended_count: {N}
waves: {N}
steps: {N}
---
```

**2. Title:** `# Roadmap -- Skill Execution: {Project Name}`
- If domain filtered: `# Roadmap -- Skill Execution: {Project Name} ({Domain})`

**3. Strategy blockquote:** Summarize the approach:
- Number of waves and their purpose flow
- Parallelism opportunities (which waves use agent-teams/terminal)
- Key audit/build/validate sequence
- Total estimated execution passes

**4. Status Counter:** `## Total Steps: {N} | Completed: 0 | Remaining: {N}`

**5. Checklist:** Nested checkboxes grouped by wave:
```markdown
- [ ] Wave 0: Audit (2 steps, SEQUENTIAL)
  - [ ] `W0.1` crystal-ball-matrix -- Spec interaction analysis
  - [ ] `W0.2` crystal-ball -- Full design audit
- [ ] Wave 1: Build (5 steps, PARALLEL agent-teams x5)
  - [ ] `W1.1` build -- specs/todo/feature-a.md
  - [ ] `W1.2` build -- specs/todo/feature-b.md
  ...
```

**6. Per-Wave Sections:** For each wave:
- `## Wave {N}: {Purpose Group} ({execution tag})`
- Rationale blockquote (default/deep mode, 5+ steps only): why these capabilities in this order
- Skill-execution table:
  ```
  | Order | Step | Skill / Command | Target | Output | Execution |
  |-------|------|----------------|--------|--------|-----------|
  | W0.1 | Spec Interaction Map | /crystal-ball-matrix | specs/ | N×N matrix | SEQUENTIAL |
  ```
- **How to Run** block with copy-pasteable commands (pre-filled from Step 3.6):
  - SEQUENTIAL: individual commands in order
  - PARALLEL (agent-teams): `/agent-teams` invocation
  - PARALLEL (terminal): commands labeled by terminal number
  - PARALLEL (mixed): agent-teams batch + separate terminal commands
- Expected Artifacts (5+ steps, default/deep only): what this wave produces

**7. Execution Rules** (5+ steps only): Overall constraints — max concurrent agents, cross-wave dependencies, context window considerations for heavy skills.

**8. Quick Reference Table** (5+ steps only):
```
| Wave | Produces | Feeds Into |
|------|----------|-----------|
```

**9. Execution Timeline** (5+ steps only): ASCII art showing temporal parallelism:
```
TIME ------------------------------------------------->
Wave 0  [SEQUENTIAL]    W0.1 -> W0.2
Wave 1  [PARALLEL x3]   W1.1 | W1.2 | W1.3
Wave 2  [PARALLEL x2]   W2.1 | W2.2
```

**10. Agent Teams Config** (if any wave uses agent-teams):
```
| Wave | Agents | Steps per Agent | Execution | Notes |
```

**11. Key Files:** Reference files, roadmap path, spec directories, relevant project files.

**12. Getting Started:** The single most important first command — the first step in Wave 0.

**13. Not Scheduled (Optional Capabilities):** List all Optional-classified capabilities that were NOT assigned to waves. Brief table with name, purpose, and reason for exclusion. This helps users know what's available if scope expands.

### 3.9: Update Mode Merge (Only if `update` mode)

If `update` mode and existing roadmap was found in Step 3.2:

1. For each step in the new roadmap, check the completed items map from Step 3.2
2. If step was completed in existing roadmap (`[x]`): preserve as `[x]` in new roadmap
3. New capabilities discovered since last run: add as `[ ]` with `# NEW` annotation
4. Capabilities that existed before but are no longer discovered: add `# REMOVED` annotation (do not delete — user may want to review)
5. Update `updated:` field in YAML frontmatter to today's date
6. Update `status:` field with correct completion count: `IN PROGRESS (X/Y complete)`
7. Update Status Counter line with correct numbers

### 3.10: Save Roadmap

Determine save location:
- If project has `specs/` directory: save to `specs/roadmaps/ROADMAP-skill-execution.md`
- If no `specs/` directory: save to `{cwd}/ROADMAP-skill-execution.md`
- If domain filtered: append domain to filename (e.g., `ROADMAP-skill-execution-sales.md`)

Create directory if needed: `mkdir -p specs/roadmaps/`

Write the complete roadmap document.

### 3.11: Generate Build Manifest (if 5+ total steps)

Create companion manifest at `specs/roadmaps/skill-execution-build-manifest.md`:

```markdown
# Skill Execution -- Build Manifest

> Generated from ROADMAP-skill-execution.md. Attach to /pickup or /build for quick context.

## Reference Files
- **Roadmap:** specs/roadmaps/ROADMAP-skill-execution.md

## Execution Queue

### Wave {N}: {Title} ({execution type})

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W0.1 | /crystal-ball-matrix | RUN | specs/ | TODO |

## Notes
- {Execution tips for agent-teams or terminal-based waves}
```

### 3.12: L3 Scoring

- Start at 100
- Deduct -5 for each capability where argument pre-filling failed (left bare)
- Deduct -3 for each wave with only 1 item (missed parallelism opportunity — single-item waves are fine for Audit chain but penalize others)
- Deduct -5 if no audit wave exists despite having 5+ specs in the project
- Deduct -5 if roadmap has >6 waves (over-segmented)
- Bonus +5 if all waves have 2+ items (good batching)
- Bonus +3 if at least one wave uses agent-teams or terminal parallelism
- Floor at 0, cap at 100

### 3.13: L4 Scoring (only if `--domain` was used)

- Start at 100
- Deduct -10 if no domain indicators found in project structure
- Deduct -5 for each reclassification with no supporting evidence
- Deduct -5 if domain filtering removed all Essential capabilities (over-filtered)
- Bonus +5 if domain-specific files were found and used in argument pre-fills
- Bonus +5 if reclassification changed at least 2 capability tiers (meaningful filtering)
- Floor at 0, cap at 100

### 3.14: L3 + L4 Output Summary

Display after roadmap generation:

```markdown
## Roadmap Generated

**File:** specs/roadmaps/ROADMAP-skill-execution.md
**Waves:** {N} | **Steps:** {M} | **Parallel waves:** {P}
**Domain:** {domain or "whole project"}
**Detail level:** {medium or full}

**L3 Score:** {score}/100
**L4 Score:** {score}/100 (or N/A if no domain)
```

---

## Step 4: Compute Composite Score and Save Report

**Mode gate:** Skip if mode is `scan` or `quick`.

### 4.1: Calculate Composite

Composite formula depends on which layers ran:

**L1 + L2 + L3 (no domain):**
```
composite = ((L1_score x 0.40) + (L2_score x 0.35) + (L3_score x 0.15)) / 0.90
```

**L1 + L2 + L3 + L4 (with domain):**
```
composite = (L1_score x 0.40) + (L2_score x 0.35) + (L3_score x 0.15) + (L4_score x 0.10)
```

Round to nearest integer.

### 4.2: Check for Previous Reports

Glob `reports/skill-roadmap/sr-*.md`:
- If previous reports exist, read the most recent one's YAML frontmatter
- Extract `composite_score` as `previous_composite`
- Calculate `score_delta`
- Determine `trend`: compare last 3 reports if available

### 4.3: Save Report

1. Create directory: `mkdir -p reports/skill-roadmap/`
2. Determine next report number (glob `reports/skill-roadmap/sr-*.md`, extract max NNN, increment)
3. Write report file: `sr-{NNN}-{YYYY-MM-DD}-{slug}.md`

**YAML frontmatter (required):**
```yaml
---
report_type: "skill-roadmap"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{project-name}"
project_tag: "{slug}"
mode: "{scan|quick|default|deep|update}"
composite_score: {0-100}
previous_composite: {0-100|null}
score_delta: "{+N|-N|---}"
trend: "{first_run|improving|declining|stable}"
capabilities_total: {N}
essential_count: {N}
recommended_count: {N}
waves: {N}
steps: {N}
---
```

**Delta section (if previous report exists):**

After frontmatter, include a "Changes Since Last Report" section comparing capabilities:

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {newly discovered capability}

**RESOLVED** ({count} items):
- [RESOLVED] {capability that was Optional, now Essential}

**MOVED** ({count} items):
- [MOVED] {capability}: {previous_classification} -> {current_classification}

**PROGRESS** ({count} items):
- [PROGRESS] {capability}: wave {prev} -> wave {current}
```

Rules: Omit categories with 0 items. First report = omit delta section entirely. Compare capability classifications and wave assignments between reports.

**Trend section (if 3+ reports exist):**

```markdown
## Trend (last {N} reports)

| Report | Date | Score | Capabilities | Essential | Waves |
|--------|------|-------|-------------|-----------|-------|
| sr-{NNN} | {date} | {score} | {total} | {essential} | {waves} |
| ... | ... | ... | ... | ... | ... |

**Direction:** {first_score} -> {last_score} ({arrow}, {+/-N%})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

After frontmatter + delta + trend, include the full L1 inventory + L2 analysis + roadmap reference path.

### 4.4: Display Summary

```markdown
## Skill Roadmap Report #{NNN}

**Discovery:** {N} capabilities found ({skills} skills, {commands} commands, {mcp} MCP tools)
**Classification:** {essential} essential, {recommended} recommended, {optional} optional
**Roadmap:** {waves} waves, {steps} steps -- saved to {roadmap_path}

**Scores:** L1: {score}/100 | L2: {score}/100 | L3: {score}/100 | L4: {score or N/A}/100 | Composite: {score}/100
**Trend:** {trend} ({delta})

Report saved to: reports/skill-roadmap/sr-{NNN}-{date}.md
```
