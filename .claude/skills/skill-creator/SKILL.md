---
name: skill-creator
description: >-
  Guide for creating effective skills with layered architecture. This skill should be used when
  users want to create a new skill (or update an existing skill) that extends Claude's capabilities
  with specialized knowledge, workflows, or tool integrations. Always applies the layered system
  pattern (layers, modes, scoring, numbered reports) unless the skill is trivially simple.
argument-hint: "<skill-name or description> | enhance <existing-skill> | update <existing-skill> | audit <skill-name>"
license: Complete terms in LICENSE.txt
tools:
  - mcp__omni-cortex__cortex_global_search
  - Bash
model: opus
---

# Skill Creator

This skill provides guidance for creating effective skills.

## Pre-Creation Context

Before creating a skill:
- Search for similar skills: `cortex_global_search: "skill {skill_type}"`
- Check for existing patterns: `cortex_global_search: "skill template"`
- Use recalled patterns to inform skill design

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing
specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific
domains or tasks—they transform Claude from a general-purpose agent into a specialized agent
equipped with procedural knowledge that no model can fully possess.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Skills share the context window with everything else Claude needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**Default assumption: Claude is already very smart.** Only add context Claude doesn't already have. Challenge each piece of information: "Does Claude really need this explanation?" and "Does this paragraph justify its token cost?"

Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match the level of specificity to the task's fragility and variability:

**High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.

**Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.

**Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

Think of Claude as exploring a path: a narrow bridge with cliffs needs specific guardrails (low freedom), while an open field allows many routes (high freedom).

### Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter metadata (required)
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions (required)
└── Bundled Resources (optional)
    ├── scripts/          - Executable code (Python/Bash/etc.)
    ├── references/       - Documentation intended to be loaded into context as needed
    └── assets/           - Files used in output (templates, icons, fonts, etc.)
```

#### SKILL.md (required)

Every SKILL.md consists of:

- **Frontmatter** (YAML): Contains `name` and `description` fields. These are the only fields that Claude reads to determine when the skill gets used, thus it is very important to be clear and comprehensive in describing what the skill is, and when it should be used.
- **Body** (Markdown): Instructions and guidance for using the skill. Only loaded AFTER the skill triggers (if at all).

#### Bundled Resources (optional)

##### Scripts (`scripts/`)

Executable code (Python/Bash/etc.) for tasks that require deterministic reliability or are repeatedly rewritten.

- **When to include**: When the same code is being rewritten repeatedly or deterministic reliability is needed
- **Example**: `scripts/rotate_pdf.py` for PDF rotation tasks
- **Benefits**: Token efficient, deterministic, may be executed without loading into context
- **Note**: Scripts may still need to be read by Claude for patching or environment-specific adjustments

##### References (`references/`)

Documentation and reference material intended to be loaded as needed into context to inform Claude's process and thinking.

- **When to include**: For documentation that Claude should reference while working
- **Examples**: `references/finance.md` for financial schemas, `references/mnda.md` for company NDA template, `references/policies.md` for company policies, `references/api_docs.md` for API specifications
- **Use cases**: Database schemas, API documentation, domain knowledge, company policies, detailed workflow guides
- **Benefits**: Keeps SKILL.md lean, loaded only when Claude determines it's needed
- **Best practice**: If files are large (>10k words), include grep search patterns in SKILL.md
- **Avoid duplication**: Information should live in either SKILL.md or references files, not both. Prefer references files for detailed information unless it's truly core to the skill—this keeps SKILL.md lean while making information discoverable without hogging the context window. Keep only essential procedural instructions and workflow guidance in SKILL.md; move detailed reference material, schemas, and examples to references files.

##### Assets (`assets/`)

Files not intended to be loaded into context, but rather used within the output Claude produces.

- **When to include**: When the skill needs files that will be used in the final output
- **Examples**: `assets/logo.png` for brand assets, `assets/slides.pptx` for PowerPoint templates, `assets/frontend-template/` for HTML/React boilerplate, `assets/font.ttf` for typography
- **Use cases**: Templates, images, icons, boilerplate code, fonts, sample documents that get copied or modified
- **Benefits**: Separates output resources from documentation, enables Claude to use files without loading them into context

#### What to Not Include in a Skill

A skill should only contain essential files that directly support its functionality. Do NOT create extraneous documentation or auxiliary files, including:

- README.md
- INSTALLATION_GUIDE.md
- QUICK_REFERENCE.md
- CHANGELOG.md
- etc.

The skill should only contain the information needed for an AI agent to do the job at hand. It should not contain auxilary context about the process that went into creating it, setup and testing procedures, user-facing documentation, etc. Creating additional documentation files just adds clutter and confusion.

### Progressive Disclosure Design Principle

Skills use a three-level loading system to manage context efficiently:

1. **Metadata (name + description)** - Always in context (~100 words)
2. **SKILL.md body** - When skill triggers (<5k words)
3. **Bundled resources** - As needed by Claude (Unlimited because scripts can be executed without reading into context window)

#### Progressive Disclosure Patterns

Keep SKILL.md body to the essentials and under 500 lines to minimize context bloat. Split content into separate files when approaching this limit. When splitting out content into other files, it is very important to reference them from SKILL.md and describe clearly when to read them, to ensure the reader of the skill knows they exist and when to use them.

**Key principle:** When a skill supports multiple variations, frameworks, or options, keep only the core workflow and selection guidance in SKILL.md. Move variant-specific details (patterns, examples, configuration) into separate reference files.

**Pattern 1: High-level guide with references**

```markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
[code example]

## Advanced features

- **Form filling**: See [FORMS.md](FORMS.md) for complete guide
- **API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```

Claude loads FORMS.md, REFERENCE.md, or EXAMPLES.md only when needed.

**Pattern 2: Domain-specific organization**

For Skills with multiple domains, organize content by domain to avoid loading irrelevant context:

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

When a user asks about sales metrics, Claude only reads sales.md.

Similarly, for skills supporting multiple frameworks or variants, organize by variant:

```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md (AWS deployment patterns)
    ├── gcp.md (GCP deployment patterns)
    └── azure.md (Azure deployment patterns)
```

When the user chooses AWS, Claude only reads aws.md.

**Pattern 3: Conditional details**

Show basic content, link to advanced content:

```markdown
# DOCX Processing

## Creating documents

Use docx-js for new documents. See [DOCX-JS.md](DOCX-JS.md).

## Editing documents

For simple edits, modify the XML directly.

**For tracked changes**: See [REDLINING.md](REDLINING.md)
**For OOXML details**: See [OOXML.md](OOXML.md)
```

Claude reads REDLINING.md or OOXML.md only when the user needs those features.

**Important guidelines:**

- **Avoid deeply nested references** - Keep references one level deep from SKILL.md. All reference files should link directly from SKILL.md.
- **Structure longer reference files** - For files longer than 100 lines, include a table of contents at the top so Claude can see the full scope when previewing.

## Enhance Mode (Upgrade Existing Skills)

When invoked with `enhance <name>` or `update <name>`, follow this workflow instead of the creation process:

### Step 0: Analyze Existing Skill

1. **Locate the skill** (check in priority order):
   - `{cwd}/.claude/skills/{name}/SKILL.md` (project skill)
   - `~/.claude/skills/{name}/SKILL.md` (global skill)
   - `~/.claude/commands/{name}.md` (global command)
   - `{cwd}/.claude/commands/{name}.md` (project command)
2. **Run gap analysis** — use `scripts/analyze_skill.py {name}` OR manually check against `references/gap-analysis.md`
3. **Present gap report** — show what's missing (layers, modes, argument-hint, references, scripts, scoring, reports)

### Step 0.5: Plan Enhancement

1. **Propose layer design** based on gaps and skill complexity (see `references/layered-system.md`)
2. **Identify what to preserve** — existing logic, workflows, and behavior must be retained
3. **If upgrading command → skill**: Create skill directory, generate SKILL.md from command content, optionally remove old command file (ask user)
4. **Get user approval** before making changes

Then proceed to **Step 3** (Plan Reusable Contents) → Step 5 (Edit) → Step 6 (Package) → Step 7 (Iterate). Skip Steps 1-2 and 4 since the skill already exists.

## Audit Mode (Diet Report)

When invoked with `audit <skill-name>`, analyze a skill's weight and ADW compatibility.

### Step 1: Run Metrics Script
```bash
python ~/.claude/skills/skill-creator/scripts/audit_skill.py <skill-name> --json
```
Parse the JSON output. If the script exits with code 1, the skill was not found — report this and stop.

### Step 2: Read the Skill Body
Read the SKILL.md body (not frontmatter) to understand what each step does. Focus on procedural steps and workflow sections.

### Step 3: Generate 80/20 Analysis
Classify each procedural step/section as:
- **Essential (20%)**: Steps that catch real bugs, produce core output, or are required for the skill to function
- **Bloat (80%)**: Steps that add depth/polish but aren't needed for automated pipelines — sub-agent spawning, trend tracking, screenshot analysis, multi-layer scoring, interactive prompts

### Step 4: Output Diet Report
Format the report as:

```
# Diet Report: /<skill-name>

## Metrics
| Metric             | Value | Grade |
|--------------------|-------|-------|
| Token estimate     | ...   | OK/HEAVY |
| Step count         | ...   | OK/HEAVY |
| Agent mentions     | ...   | OK/HEAVY |
| Reference files    | ...   | OK/HEAVY |
| Interactive prompts| ...   | — |
| Quick mode         | Yes/No| — |
| ADW mode           | Yes/No| — |

## ADW Compatibility: XX/100
- Quick mode bonus:      XX/30
- No mandatory agents:   XX/20
- Low tool baseline:     XX/20
- Low token cost:        XX/15
- No interactive:        XX/15

## 80/20 Analysis

### Essential (keep)
1. [Step X] — reason it's essential
2. ...

### Bloat (cut for ADW mode)
1. [Step X] — reason it's bloat
2. ...

## Recommendation
[If adw_score < 60, recommend adding ADW mode with env var check]
```

### Step 5: ADW Mode Recommendation
If `adw_score < 60`, recommend adding an ADW mode that:
1. Checks `ADW_MODE` env var at the top of the skill
2. Skips all bloat steps when `ADW_MODE=1`
3. Targets <5 min execution time
4. Eliminates sub-agent spawning and interactive prompts

---

## Skill Creation Process

Skill creation involves these steps:

1. Understand the skill with concrete examples
2. **Gap analysis & layer design** — determine layers, modes, scoring, reports (see `references/layered-system.md`)
3. Plan reusable skill contents (scripts, references, assets)
4. Initialize the skill (run init_skill.py)
5. Edit the skill (implement resources and write SKILL.md with layered architecture)
5.5. **Completeness audit** — check skill against closed-loop checklist, flag gaps before packaging
6. Package the skill (run package_skill.py)
7. Iterate based on real usage

Follow these steps in order, skipping only if there is a clear reason why they are not applicable.

**IMPORTANT — Spec-driven builds skip questioning:** If this skill is being invoked as part of a `/build` pipeline with an existing spec file that already defines layers, modes, scoring, and architecture, skip Steps 1-2 entirely and proceed directly to Step 3. The spec IS the plan — do not re-ask questions the user already answered during planning. Only ask follow-up questions if the spec has genuine ambiguities or missing critical details.

**IMPORTANT — Enhance mode skips creation steps:** If invoked with `enhance` or `update`, follow the Enhance Mode workflow above. Skip Steps 1-2 (the skill already exists) and Step 4 (no init needed unless upgrading command → skill).

### Step 1: Understanding the Skill with Concrete Examples

Skip this step only when the skill's usage patterns are already clearly understood (e.g., a detailed spec exists). It remains valuable even when working with an existing skill.

To create an effective skill, clearly understand concrete examples of how the skill will be used. This understanding can come from either direct user examples or generated examples that are validated with user feedback.

For example, when building an image-editor skill, relevant questions include:

- "What functionality should the image-editor skill support? Editing, rotating, anything else?"
- "Can you give some examples of how this skill would be used?"
- "I can imagine users asking for things like 'Remove the red-eye from this image' or 'Rotate this image'. Are there other ways you imagine this skill being used?"
- "What would a user say that should trigger this skill?"

To avoid overwhelming users, avoid asking too many questions in a single message. Start with the most important questions and follow up as needed for better effectiveness.

Conclude this step when there is a clear sense of the functionality the skill should support.

### Step 2: Gap Analysis & Layer Design

**Every non-trivial skill MUST use the layered system pattern.** See `references/layered-system.md` for the complete pattern, scoring formulas, report numbering, and proven examples.

Skip this step ONLY if:
- The skill is trivially simple (single-purpose utility, no modes needed)
- A pre-existing spec already defines the full layer architecture

#### 2a. Determine skill complexity

Assess whether the skill needs 2, 3, or 4 layers:

| Signal | Layers |
|--------|--------|
| Single data source, one output | 2 layers |
| Multiple data sources or analysis types | 3 layers |
| Historical tracking, trend comparison, or burnout/health indicators | 4 layers |

#### 2b. Ask gap analysis questions

Use `AskUserQuestion` to surface gaps the user may not have considered. Ask about:

1. **Layer coverage**: "What's the ONE metric you need most? What patterns add depth? What expensive analysis would be valuable but not always needed? Is historical comparison useful?"
2. **Mode needs**: "Do you need a fast 'headline only' mode? A scoped view (e.g., last 7 days)? A comparison mode?"
3. **Data sources**: "What data does each layer need? What happens if it's missing?"
4. **Scoring priorities**: "What makes a 'good' score? Which layer is most actionable (it gets highest weight)?"
5. **Report persistence**: "Should runs be saved as numbered reports for trend tracking?"

Do NOT ask all 5 at once. Start with #1 and #2, then follow up with #3-5 based on answers.

#### 2c. Document layer design

Before proceeding, document:
- Layer names, weights, and data sources
- Mode matrix (which modes run which layers)
- Composite scoring formula
- Report naming convention (if applicable)

This becomes the blueprint for Step 5 (writing SKILL.md).

### Step 3: Planning the Reusable Skill Contents

To turn concrete examples into an effective skill, analyze each example by:

1. Considering how to execute on the example from scratch
2. Identifying what scripts, references, and assets would be helpful when executing these workflows repeatedly

Example: When building a `pdf-editor` skill to handle queries like "Help me rotate this PDF," the analysis shows:

1. Rotating a PDF requires re-writing the same code each time
2. A `scripts/rotate_pdf.py` script would be helpful to store in the skill

Example: When designing a `frontend-webapp-builder` skill for queries like "Build me a todo app" or "Build me a dashboard to track my steps," the analysis shows:

1. Writing a frontend webapp requires the same boilerplate HTML/React each time
2. An `assets/hello-world/` template containing the boilerplate HTML/React project files would be helpful to store in the skill

Example: When building a `big-query` skill to handle queries like "How many users have logged in today?" the analysis shows:

1. Querying BigQuery requires re-discovering the table schemas and relationships each time
2. A `references/schema.md` file documenting the table schemas would be helpful to store in the skill

To establish the skill's contents, analyze each concrete example to create a list of the reusable resources to include: scripts, references, and assets.

### Step 4: Initializing the Skill

At this point, it is time to actually create the skill.

Skip this step only if the skill being developed already exists, and iteration or packaging is needed. In this case, continue to the next step.

When creating a new skill from scratch, always run the `init_skill.py` script. The script conveniently generates a new template skill directory that automatically includes everything a skill requires, making the skill creation process much more efficient and reliable.

Usage:

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

The script:

- Creates the skill directory at the specified path
- Generates a SKILL.md template with proper frontmatter and TODO placeholders
- Creates example resource directories: `scripts/`, `references/`, and `assets/`
- Adds example files in each directory that can be customized or deleted

After initialization, customize or remove the generated SKILL.md and example files as needed.

### Step 5: Edit the Skill

When editing the (newly-generated or existing) skill, remember that the skill is being created for another instance of Claude to use. Include information that would be beneficial and non-obvious to Claude. Consider what procedural knowledge, domain-specific details, or reusable assets would help another Claude instance execute these tasks more effectively.

#### Learn Proven Design Patterns

Consult these helpful guides based on your skill's needs:

- **Layered architecture** (REQUIRED for non-trivial skills): See `references/layered-system.md` for the complete pattern — layers, modes, composite scoring, numbered reports, trend tracking. This is the standard architecture.
- **Cortex CLI-first patterns**: See `references/cortex-cli-patterns.md` for CLI vs MCP decision matrix, per-layer recommendations, anti-patterns, and copy-paste snippets. Use CLI for fire-and-forget (remember, link, log), MCP for interactive reasoning (recall, list).
- **Multi-step processes**: See `references/workflows.md` for sequential workflows and conditional logic
- **Specific output formats or quality standards**: See `references/output-patterns.md` for template and example patterns

These files contain established best practices for effective skill design.

#### Start with Reusable Skill Contents

To begin implementation, start with the reusable resources identified above: `scripts/`, `references/`, and `assets/` files. Note that this step may require user input. For example, when implementing a `brand-guidelines` skill, the user may need to provide brand assets or templates to store in `assets/`, or documentation to store in `references/`.

Added scripts must be tested by actually running them to ensure there are no bugs and that the output matches what is expected. If there are many similar scripts, only a representative sample needs to be tested to ensure confidence that they all work while balancing time to completion.

Any example files and directories not needed for the skill should be deleted. The initialization script creates example files in `scripts/`, `references/`, and `assets/` to demonstrate structure, but most skills won't need all of them.

#### Update SKILL.md

**Writing Guidelines:** Always use imperative/infinitive form.

##### Frontmatter

Write the YAML frontmatter with required fields:

**Required fields:**
- `name`: The skill name
- `description`: This is the primary triggering mechanism for your skill, and helps Claude understand when to use the skill.
  - Include both what the Skill does and specific triggers/contexts for when to use it.
  - Include all "when to use" information here - Not in the body. The body is only loaded after triggering, so "When to Use This Skill" sections in the body are not helpful to Claude.
  - Example description for a `docx` skill: "Comprehensive document creation, editing, and analysis with support for tracked changes, comments, formatting preservation, and text extraction. Use when Claude needs to work with professional documents (.docx files) for: (1) Creating new documents, (2) Modifying or editing content, (3) Working with tracked changes, (4) Adding comments, or any other document tasks"

**Required fields (continued):**
- `argument-hint`: Short hint shown in CLI autocomplete to guide users on valid arguments. **MANDATORY for every skill and command — no exceptions.** Even skills that accept no arguments must include `argument-hint: "(no arguments)"`.
  - Use pipe-separated options for discrete choices: `"jarvis | sound | off"`
  - Use angle brackets for required params: `"<filename>"`
  - Use square brackets for optional params: `"[optional_flag]"`
  - Combine patterns as needed: `"<command> [options]"`
  - **CRITICAL**: Always quote the value to avoid YAML parsing errors (e.g., `argument-hint: "[word:` breaks the UI — YAML interprets `[word:` as array/object syntax, which crashes Claude Code's UI)
  - Study the skill's purpose and typical invocation patterns to write a helpful hint
  - Examples:
    - `argument-hint: "create | delete | list"`
    - `argument-hint: "<project_name> [--force]"`
    - `argument-hint: "jarvis | sound | off | test | length <brief|adaptive|detailed>"`
    - `argument-hint: "<spec-file-or-description>"`
    - `argument-hint: "[scope: full | spec-name]"`
    - `argument-hint: "(no arguments)"`

##### Body

Write instructions for using the skill and its bundled resources.

#### Add Dual-Backbone Integration Section

Every non-trivial skill SHOULD include a "Cortex & Brain Integration" section in its SKILL.md. This documents which backbone operations the skill uses and whether they are CLI (fire-and-forget) or MCP (interactive reasoning).

**Template to include in generated SKILL.md files** (after "Integration Points" or at the end of the body):

```markdown
## Cortex & Brain Integration

### Omni-Cortex (memory/knowledge layer)

**CLI Operations (fire-and-forget):**
- `cortex remember` -- store findings, decisions, summaries
- `cortex link` -- connect related memories
- `cortex log-activity` -- track skill execution

**MCP Operations (interactive reasoning):**
- `cortex_recall` -- retrieve context for decision-making
- `cortex_list_memories` -- present options to user

### Breathing Brain (coordination/executive layer)

**CLI Operations (fire-and-forget):**
- `brain --json status` -- get terminal state, pulse count, edit tracking
- `brain --json journal list` -- read session journal entries
- `brain --json terminals list` -- check active terminals

**MCP Operations (interactive reasoning):**
- `brain_status` -- get brain state for decision-making
- `brain_journal_export` -- export journal for analysis
- `brain_pulse` -- process accumulated signals

### Decision Rule
> If the LLM needs the result to continue reasoning -> MCP (either backbone).
> If the result is stored/logged and the LLM moves on -> CLI (either backbone).
> Cortex = what was decided/learned. Brain = what happened between decisions.
```

**When to recommend each backbone:**

| Skill needs to... | Use |
|-------------------|-----|
| Store findings, recall context, search memories | **Cortex** |
| Track terminal coordination, multi-agent state | **Brain** |
| Detect session health, breaks, edit counts | **Brain** |
| Persist decisions for cross-session use | **Cortex** |
| Access pulse/heartbeat signals | **Brain** |
| Link related artifacts | **Cortex** |
| Both memory + coordination context | **Both** |

Adapt per skill type:
- **Analysis/research skills:** Cortex recall + Brain journal for comprehensive context
- **Execution/build skills:** Cortex CLI for results + Brain CLI for edit tracking
- **Session-aware skills** (retrospective, handoff, pickup): **Both** — Cortex for memories, Brain for terminal state and session health
- **Simple utility skills:** Skip if no memory/coordination needs

See `references/cortex-cli-patterns.md` for the Cortex CLI reference. Brain CLI docs at `~/.claude/CLAUDE.md` (Brain MCP section).

### Step 5.5: Completeness Audit

After the skill architecture is defined and SKILL.md is written (but before packaging), audit the skill against the Closed-Loop Checklist. Flag missing patterns to the user so they can choose to address gaps before finalizing.

#### Closed-Loop Checklist

| Pattern | Description | Example | Required? |
|---------|------------|---------|-----------|
| **Create** | Can produce its primary output | Generate invoice, scan items, build artifact | YES — core function |
| **Track** | Persists state across sessions | Reports dir, cache files, Cortex memories | YES for any multi-session skill |
| **Update** | Can modify existing state without full rescan | `update` argument, mark-as-done, edit mode | RECOMMENDED |
| **Verify** | Can validate its own output against real state | File checks, git-check, API verification | RECOMMENDED |
| **Report** | Generates numbered incremental reports | `{prefix}-NNN-YYYY-MM-DD-{slug}.md` with YAML frontmatter | YES if skill produces analysis |
| **Trend** | Tracks changes across multiple reports | Delta sections, score comparisons, sparklines | YES if skill has reports |
| **Integrate** | Chains with other skills in the ecosystem | /pickup integration, /handoff awareness, /self-heal hooks, Cortex CLI/MCP patterns | RECOMMENDED |
| **Self-describe** | Complete argument-hint, SKILL.md, references | Full routing table, all arguments documented | YES |

#### How to Apply

1. Walk through each checklist item against the skill being built
2. For items marked **YES**: if missing, add to the skill architecture before finalizing
3. For items marked **RECOMMENDED**: suggest to the user as enhancements, don't force
4. Present a summary table showing coverage and gaps:

```
Completeness: 6/8 patterns covered

  [x] Create — L1-L4 layers defined
  [x] Track — cache/last-run.json + reports dir
  [x] Report — {prefix}-NNN reports with YAML frontmatter
  [x] Self-describe — argument-hint covers all 5 arguments
  [ ] Update — No way to modify existing output (suggest: add `update` argument)
  [ ] Verify — No validation of output accuracy (suggest: add `verify` argument)
  [x] Integrate — Chains with /pickup and /handoff
  [ ] Trend — Reports exist but no cross-report trend tracking (suggest: add delta/trend section)
```

5. **MANDATORY: For ANY skill that creates reports**, enforce the standard report convention from `~/.claude/skills/REPORT-CONVENTION.md`. This is a hard requirement, not a suggestion:
   - **Read `REPORT-CONVENTION.md`** to get the prefix registry, YAML frontmatter schema, numbering logic, and slug rules
   - **Register a new prefix** in REPORT-CONVENTION.md if the skill doesn't have one yet (2-5 chars, unique, no collisions)
   - **Reports directory**: `{project_root}/reports/{skill-subdirectory}/` (created with `mkdir -p`)
   - **Filename**: `{prefix}-{NNN}-{YYYY-MM-DD}-{slug}.md` (NNN = zero-padded sequential)
   - **YAML frontmatter**: ALL required fields from REPORT-CONVENTION.md (report_type, report_number, date, generated_at, project_name, project_tag, mode, composite_score, previous_composite, score_delta, trend)
   - **`generated_at` field (MANDATORY)**: Every report MUST include `generated_at` with the exact MST/MDT timestamp. **NEVER estimate or guess the time.** ALWAYS compute it via bash before writing the report: `python3 -c "from datetime import datetime,timezone,timedelta; t=datetime.now(timezone.utc)+timedelta(hours=-6); print(t.strftime('%Y-%m-%d %#I:%M %p MDT'))"` — Use the output directly in frontmatter.
   - **Delta section**: "Changes Since Last Report" comparing to previous (if previous exists)
   - **Trend section**: When 3+ reports exist (score history, item count trends)
   - **Timestamps**: Use MDT (UTC-6) for all date/time references in report content
   - **NEVER** let a skill generate reports without following this convention — it breaks the entire reporting ecosystem

6. For skills that should integrate with others, suggest specific integration points:
   - `/pickup` — If the skill has reports, suggest adding to pickup's overdue detection table
   - `/handoff` — If the skill tracks state, suggest including status in handoff summaries
   - `/self-heal` — If the skill can detect issues, suggest hooking into self-heal's error patterns
   - `/task-radar` — If the skill creates specs or tracks work, suggest radar integration
   - **Cortex + Brain (Dual Backbone)** — ALWAYS evaluate whether the skill can benefit from either or both backbones. Present a recommendation to the user:

     **Omni-Cortex** (memory/knowledge layer):
     - Use when the skill needs to: store findings, recall prior context, search memories, track decisions, link related artifacts
     - CLI for fire-and-forget (remember, link, log), MCP for interactive reasoning (recall, list, search)
     - See `references/cortex-cli-patterns.md` for the full decision matrix

     **Brain** (coordination/executive layer):
     - Use when the skill needs to: track terminal state, detect multi-agent coordination, measure session health, access pulse/heartbeat data, read journal entries, detect breaks/pauses
     - CLI: `brain status --json`, `brain journal list --json`, `brain terminals list --json`
     - MCP: `brain_status`, `brain_pulse`, `brain_journal_export`
     - Brain captures what Cortex doesn't: inter-message events, terminal coordination, signal processing, edit tracking, background actions

     **Auto-integrate, don't ask** — When creating or enhancing a skill, automatically add the appropriate backbone(s) based on the skill's needs. Inform the user what was added and why:
     > "Added Cortex integration for [specific use] and Brain integration for [specific use]. Let me know if you want to modify this."

     Do NOT ask permission — just integrate and notify. The dual backbone is standard infrastructure, not an optional feature. Only skip if the skill is a trivial utility with zero memory/coordination needs.

     Include a "Cortex & Brain Integration" section in SKILL.md when either backbone is used, documenting which operations are CLI (fire-and-forget) vs MCP (interactive reasoning) per layer.

**This step is a quality gate, not a blocker.** Present findings and let the user decide which gaps to address. Then proceed to packaging.

### Step 6: Packaging a Skill

Once development of the skill is complete, it must be packaged into a distributable .skill file that gets shared with the user. The packaging process automatically validates the skill first to ensure it meets all requirements:

```bash
scripts/package_skill.py <path/to/skill-folder>
```

Optional output directory specification:

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

The packaging script will:

1. **Validate** the skill automatically, checking:

   - YAML frontmatter format and required fields
   - Skill naming conventions and directory structure
   - Description completeness and quality
   - File organization and resource references

2. **Package** the skill if validation passes, creating a .skill file named after the skill (e.g., `my-skill.skill`) that includes all files and maintains the proper directory structure for distribution. The .skill file is a zip file with a .skill extension.

If validation fails, the script will report the errors and exit without creating a package. Fix any validation errors and run the packaging command again.

### Step 7: Iterate

After testing the skill, users may request improvements. Often this happens right after using the skill, with fresh context of how the skill performed.

**Iteration workflow:**

1. Use the skill on real tasks
2. Notice struggles or inefficiencies
3. Identify how SKILL.md or bundled resources should be updated
4. Implement changes and test again

### Post-Creation Memory

Store skill creation info via CLI (fire-and-forget):
```bash
cortex remember "Skill-creator: [skill name, purpose, key design decisions, bundled resources]" \
  --tags skill-creator,{skill_name} --importance 70 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Skill-creator: [summary]" --tags skill-creator,{skill_name} --importance 70
```
