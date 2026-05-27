---
name: self-heal
description: >-
  Self-healing loop with persistent reports, trend tracking, and fix effectiveness scoring.
  Analyzes tool failures, identifies recurring patterns, applies fixes to MEMORY.md,
  tracks fix effectiveness in fix-patterns.md, and saves numbered reports to
  reports/self-heal/. v2 adds 4-layer system health analysis with parallel
  sub-agents for tool reliability, session health, and memory freshness.
  Supports global infrastructure scanning (--global) for ~/.claude/ health checks
  and damage-control bridge alignment. MCP intelligence layer (--mcp-audit) analyzes
  tool usage, co-occurrence patterns, and API overlap across owned MCP servers.
  Use when: (1) End of a work session to capture and fix error patterns,
  (2) After noticing repeated tool failures, (3) As a manual equivalent of the
  ADW v2 RETROSPECTIVE + APPLY_LEARNINGS phases, (4) User says "self heal", "fix errors",
  "analyze failures", or "heal session", (5) Infrastructure health check with --global,
  (6) MCP tool usage review with --mcp-audit.
argument-hint: "[quick | deep | report-only] [--global | --combined] [--mcp-audit]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, AskUserQuestion, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_get_timeline, mcp__brain-mcp__brain_status, mcp__brain-mcp__brain_pulse, mcp__brain-mcp__brain_journal_export
model: opus
---

## Instructions

- Parse $ARGUMENTS for mode (quick/deep/report-only) and scope (--global/--combined/--mcp-audit) before doing any analysis
- Run Zone Engine classification before modifying any file — never auto-modify Danger-zone files
- Layer 1 (tool failures) is mandatory; Layers 2-4 run only in deep/default mode
- Compare against previous report for trend tracking — always show score_delta
- Apply fixes only to Safe-zone files; flag Gray-zone files for user review
- Store final health score and key findings in Cortex with tags ["self-heal", "{project-name}"]
- In global/combined scope, scan ~/.claude/ hooks, settings, MCPs, skills, and commands
- MCP audit mode analyzes tool usage co-occurrence and flags redundant capabilities

# Self-Heal v2

Analyze tool failures from the current project, identify recurring patterns, apply fixes to memory files, track fix effectiveness, and save persistent numbered reports with trend analysis. v2 adds 4-layer system health analysis with parallel sub-agents. Zone-based safety classification (Safe/Gray/Danger) ensures dangerous files are never auto-modified. Global scope (`--global`) scans `~/.claude/` infrastructure; combined scope (`--combined`) merges project + global in one report. MCP intelligence layer (`--mcp-audit`) analyzes tool usage, co-occurrence, and API overlap across owned MCP servers with consolidation recommendations.

## Arguments

Parse `$ARGUMENTS` for mode and scope:

**Mode** (pick one):
- **(none)** or **deep** - All 4 layers with parallel sub-agents (default)
- **quick** - Layer 1 only + report file + MEMORY.md updates (no sub-agents)
- **report-only** - All 4 layers, display only, no file modifications
- **quick-embed** - Layer 1 only, single-line output, no files (for embedding in other commands)

**Scope** (optional, pick one):
- **(none)** - Project-only scan (default, existing behavior)
- **--global** - Scan `~/.claude/` infrastructure only (hooks, settings, MCPs, skills, commands)
- **--combined** - Run both project + global scans, produce merged report

**Analysis** (optional, standalone):
- **--mcp-audit** - Run MCP tool intelligence analysis only (skip Layers 1-2, focused MCP report). Analyzes usage patterns, co-occurrence, and API overlap across owned MCP servers. Produces consolidation recommendations zone-classified through the tiered pipeline.

Flags combine with modes: `self-heal quick --global`, `self-heal report-only --combined`, `self-heal --mcp-audit`, `self-heal deep --mcp-audit`, etc. The `--mcp-audit` flag also activates automatically when scope is `--global` or `--combined`.

## Variables

PROJECT_DIR: Current working directory (from CLAUDE_PROJECT_DIR or cwd)
FAILURES_FILE: .omni-cortex/tool_failures.jsonl
MEMORY_SLUG: Computed from PROJECT_DIR (replace : with empty, \ and / with -)
MEMORY_DIR: ~/.claude/projects/{MEMORY_SLUG}/memory
MEMORY_FILE: {MEMORY_DIR}/MEMORY.md
REPORTS_DIR: reports/self-heal
REPORT_NUMBER: Auto-incremented from existing reports (Glob for sh-*.md, extract highest NNN + 1)
FIX_PATTERNS_FILE: {REPORTS_DIR}/fix-patterns.md
FIX_PATTERNS_YAML: {PROJECT_DIR}/config/fix-patterns.yaml
FIX_PATTERN_MATCHER: {PROJECT_DIR}/python-scripts/fix_pattern_matcher.py
CORTEX_DB: {PROJECT_DIR}/.omni-cortex/cortex.db
GLOBAL_DB: ~/.omni-cortex/global.db
SCAN_SCOPE: "project" (default) | "global" | "combined" — parsed from --global/--combined flags
GLOBAL_DIR: ~/.claude/ — infrastructure root for global scope scans
DC_PATTERNS_FILE: ~/.claude/hooks/damage-control/patterns.yaml
MCP_AUDIT: Boolean — true when --mcp-audit flag is set, or when SCAN_SCOPE is "global"/"combined"
MCP_INTELLIGENCE_REF: ~/.claude/commands/self-heal/references/mcp-intelligence.md
MCP_STANDALONE: Boolean — true when --mcp-audit is explicitly set (vs auto-activated by scope)

## Composite Health Score Formula

```
composite_score = (
    layer_1_score * 0.40 +    # Tool failures (most actionable)
    layer_2_score * 0.30 +    # Tool reliability (biggest efficiency impact)
    layer_3_score * 0.15 +    # Session health (continuity impact)
    layer_4_score * 0.15      # Memory freshness (knowledge quality)
)
```

Each layer scores 0-100 independently. If a layer is N/A, redistribute its weight equally among available layers. In quick mode, only Layer 1 runs and its score IS the health score (no composite).

## Workflow

### Step 0: Load Previous Reports & Trend Context

**0-scope. Parse scope and analysis flags from arguments**
- Check `$ARGUMENTS` for `--global` or `--combined` flag (case-insensitive)
- If `--global` found: set `SCAN_SCOPE = "global"`
- If `--combined` found: set `SCAN_SCOPE = "combined"`
- If neither: set `SCAN_SCOPE = "project"` (default)
- Check `$ARGUMENTS` for `--mcp-audit` flag (case-insensitive)
- If `--mcp-audit` found: set `MCP_STANDALONE = true`, `MCP_AUDIT = true`
- If `SCAN_SCOPE` is `"global"` or `"combined"` (and no explicit `--mcp-audit`): set `MCP_AUDIT = true`, `MCP_STANDALONE = false`
- Otherwise: set `MCP_AUDIT = false`, `MCP_STANDALONE = false`
- Remove all flags from arguments before parsing mode (so `quick --global --mcp-audit` parses mode as `quick`)
- **Global scope behavior:** When `SCAN_SCOPE` is `"global"`, Layer 1 runs global infrastructure checks instead of tool_failures.jsonl analysis. MCP intelligence runs automatically. Layers 2-4 still use `CORTEX_DB`/`GLOBAL_DB` as normal.
- **Combined scope behavior:** When `SCAN_SCOPE` is `"combined"`, Layer 1 runs BOTH tool_failures.jsonl analysis AND global infrastructure checks. MCP intelligence runs automatically. Report has all sections.
- **MCP standalone behavior:** When `MCP_STANDALONE` is true, skip Layer 1 (tool failures), Layer 1g (global checks), and Layers 2-4. Run only MCP intelligence analysis (Step 1m). Produce a focused MCP-only report.

**0a. Determine report number**
- Glob for `{PROJECT_DIR}/{REPORTS_DIR}/sh-*.md`
- Extract NNN from filenames using pattern `sh-(\d+)-`
- REPORT_NUMBER = highest NNN + 1 (or 1 if no reports exist)
- Create `{REPORTS_DIR}/` directory if missing

**0b. Parse previous report frontmatter**
- For each `sh-*.md` file, read lines between first `---` and second `---`
- Parse each line as `key: value` (strip quotes from values)
- For `top_patterns:` array, collect subsequent lines starting with `  - ` until next non-indented key
- Build array of report objects sorted by report_number
- Keep only the most recent 10 reports for trend display
- **Backward compat:** Old reports have `health_score` — treat as `composite_score` if layer scores are missing

**0c. Load fix patterns database**

**0c-i. YAML pattern config (primary source):**
- If `{FIX_PATTERNS_YAML}` exists, run the pattern matcher for a pre-scan:
  ```bash
  python {FIX_PATTERN_MATCHER} --json --days 7
  ```
- Parse the JSON output to get `pattern_hit_counts`, `matched_count`, `unmatched_count`
- These pre-matched patterns inform Layer 1 scoring (matched errors get instant fix suggestions instead of requiring manual JSONL mining)
- If the YAML config or matcher script doesn't exist, skip this step silently

**0c-ii. Markdown tracking table (effectiveness history):**
- Read `{FIX_PATTERNS_FILE}` if it exists
- Parse the "Active Fixes" markdown table:
  - Skip header row and separator row
  - Split each data row by `|`, trim whitespace
  - Extract: Pattern, First Seen, Runs Tracked, Count History (comma-separated), Current, Effectiveness, Status
- Store as array of fix pattern objects for later comparison
- Merge with YAML pre-scan: patterns matched by both get their effectiveness history attached

**0d. Display trend dashboard** (skip if no previous reports)
- Generate and display the trend table:

```markdown
### Health Score Trend
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
| 001 | Feb 10 | 17 | — | — | — | 17 | — |
| 002 | Feb 11 | 25 | — | — | — | 25 | +8 |
| **{NNN}** | **{date}** | **{l1}** | **{l2}** | **{l3}** | **{l4}** | **{comp}** | **{+/-N}** |

Trajectory: {trajectory_summary}
```

Note: Old reports without layer scores show `—` for L2-L4 columns.

**0e. Trend analysis commentary**
- Calculate trajectory metrics from report history:
  - Failure count trend: compare last 3 runs (increasing/decreasing/stable)
  - Composite score trend: compare last 3 runs
  - Pattern emergence rate: new patterns per run vs resolved patterns
- If failures increasing 3+ consecutive runs: warn **"Regression detected"**
- If score improving 3+ consecutive runs: note **"Sustained improvement"**
- If new patterns appearing faster than old ones resolve: warn **"Pattern churn — fixes may not be sticking"**
- If first run (no previous reports): display "First run — no trend data yet"

### Step 0.5: Load Zone Classification Engine

**This step runs in ALL modes except `quick-embed`.**

**0.5a. Load zone-map.yaml**
- Read `~/.claude/commands/self-heal/zone-map.yaml`
- Expand `~` to actual home directory in all path patterns (use environment-appropriate home path)
- On Windows, normalize all backslashes to forward slashes in both patterns and file paths before matching
- Parse the `safe`, `gray`, `danger` lists and `overrides` section
- If zone-map.yaml is missing or unreadable, warn and default ALL paths to GRAY (conservative fallback)

**0.5b. Zone enum and classification functions**

Zone levels: `SAFE=0, GRAY=1, DANGER=2`

**`classify_path(filepath) -> Zone`:**
1. Normalize the filepath: expand `~`, convert backslashes to forward slashes
2. Check patterns in order: **danger first, then gray, then safe** (most restrictive wins on ambiguity)
3. For each zone's pattern list, check glob match against the normalized path
4. First match wins — return that zone
5. If no pattern matches: return **GRAY** (conservative default)

**`classify_fix(fix_entry) -> Zone`:**
1. Get zone for each file in `fix.target_files` using `classify_path`
2. If `overrides.multi_file_inheritance` is true (default): return `max(zones)` — highest zone wins
3. A batch of [SAFE, SAFE] = SAFE; [SAFE, GRAY] = GRAY; [SAFE, DANGER] = DANGER

**0.5c. SKILL.md edit detection (special case)**

When a fix targets a SKILL.md file and `overrides.skill_md_threshold` is `"structural"` (default):
- If the diff only touches YAML frontmatter lines (between `---` markers) or is a single-line text correction → classify as **SAFE**
- If the diff adds/removes sections, changes layer definitions, or modifies more than 10 lines → upgrade to **GRAY**
- If threshold is `"any"`: all SKILL.md edits are GRAY
- If threshold is `"none"`: all SKILL.md edits are SAFE

**Reference:** See `references/zone-engine.md` for full documentation on customizing the zone map.

### Step 1: Layer 1 — Tool Failures (Inline)

**This layer runs in ALL modes (quick, deep, report-only).**

**1a. Gather failure data**
Read `{PROJECT_DIR}/.omni-cortex/tool_failures.jsonl`. If file doesn't exist or is empty, Layer 1 scores 100/100 (no failures).

Each line is JSON: `{timestamp, tool_name, error, input_summary, project_path}`

Also check for archived files: `.omni-cortex/tool_failures.*.jsonl` (include if within last 7 days).

**1b. Analyze patterns**
Group failures by:

**By Tool:**
```
tool_name -> count, list of unique error patterns
```

**By Error Pattern:**
Normalize errors (strip paths, timestamps, variable data) then group:
```
normalized_error -> count, tools affected
```

**Classify each pattern:**
- **Recurring** (3+ occurrences) - Systemic issue, needs a fix
- **Frequent** (2 occurrences) - Watch pattern, document if clear
- **One-off** (1 occurrence) - Note but don't act

**1c. Layer 1 scoring**
```
layer_1_score = 100
layer_1_score -= (recurring_patterns * 10)
layer_1_score -= (total_failures / 5)
Floor at 0.
```

**1d. Layer 1 report section**
```markdown
### Layer 1: Tool Failures (Score: {N}/100)

**Failures Processed:** {total_count}
**Period:** {earliest_timestamp} to {latest_timestamp}

#### Recurring Patterns (3+)
| Pattern | Count | Tool(s) | Zone | Action | Effectiveness |
|---------|-------|---------|------|--------|--------------|
| {desc}  | {n}   | {tools} | {SAFE/GRAY/DANGER} | {[AUTO-FIXED]/[APPROVED]/[DEFERRED]/[DANGER-ZONE]} | {eff_status} |

#### Watch Patterns (2x)
- {pattern}: {tools} - {brief desc}

#### One-offs ({count} total)
{count} unique failures (not actionable individually)
```

**If mode is `quick`, skip to Step 5 (Apply Fixes) after Layer 1. Do NOT spawn sub-agents.**

**If mode is `quick-embed`:**
- Skip ALL remaining steps (no sub-agents, no report, no MEMORY.md, no Cortex)
- Output a single parseable line and stop:
  ```
  SH_QUICK|score={layer_1_score}|trend={trend_from_previous_reports}|failures={total}|recurring={recurring_count}|top={top_pattern_description}
  ```
- Pipe-delimited key=value pairs. Other commands split on `|` and `=` to extract what they need.
- Must complete in <30 seconds. No cortex_recall, no cortex_remember, no sub-agents. Read local files only.

### Step 1g: Global Infrastructure Checks (Inline)

**Only runs when `SCAN_SCOPE` is `"global"` or `"combined"`. Runs in ALL modes (quick, deep, report-only). Skipped for `quick-embed`.**

**Reference:** See `references/global-scan.md` for full check definitions, failure criteria, and fix templates.

Run these 9 checks against `~/.claude/` infrastructure. Each check produces a PASS/FAIL status, details, and zone classification. Results feed into the fix pipeline (Step 5/6) the same way Layer 1 patterns do.

**1g-a. Hook JSON Format Check**
- Glob for `~/.claude/hooks/*.py` (top-level only, exclude `damage-control/` subdirectory)
- For each hook file: Read and verify it contains `print("{}")` or `json.dumps(` or `json.dump(` call
- Hooks without JSON output = FAIL. Zone: GRAY.

**1g-b. Hook Response Schema Check**
- Read `~/.claude/settings.json` and parse the `hooks` section
- For each registered hook, determine its event type (UserPromptSubmit, PreToolUse, PostToolUse, Stop, SubagentStop)
- Cross-reference the hook script file to verify the response format matches the event type:
  - UserPromptSubmit hooks must return `{}` (NOT `{"decision": "allow"}`)
  - PreToolUse hooks must return `{"decision": "..."}` or exit with code 2
  - PostToolUse/Stop/SubagentStop hooks must return `{}`
- Schema mismatches = FAIL. Zone: GRAY.

**1g-c. MCP Registration Check**
- Read `~/.claude/mcp-backup.json` (if it exists; skip check with note if missing)
- Read `~/.claude.json` (the live MCP config, top-level `mcpServers` key)
- Compare: for each server in backup, check if it exists in live config
- Missing servers = FAIL. Zone: DANGER. Fix: recommend `node ~/.claude/restore-mcps.js` + restart.

**1g-d. Settings Structure Check**
- Read `~/.claude/settings.json` — verify it parses as valid JSON
- Read `~/.claude/settings.local.json` — verify it parses as valid JSON (if exists)
- For `settings.json`: verify `permissions` key exists at top level
- Parse failures or missing required keys = FAIL. Zone: DANGER.

**1g-e. Symlink/Junction Health Check**
- Glob for `~/.claude/skills/*/` directories
- Glob for `~/.claude/commands/*/` directories (these are subdirectories, not .md files)
- For each directory entry: check if it's a junction/symlink. If so, verify target exists.
- On Windows: use Bash `cmd //c "dir /AL" "C:/Users/{user}/.claude/skills"` to list junctions, or check with `test -L` and `readlink`
- Broken junctions (target doesn't exist) = FAIL. Zone: SAFE.

**1g-f. Orphaned Backup Detection**
- Glob for `~/.claude/*-backup-*` (directories matching backup naming pattern)
- For each match: check modification time. If older than 30 days, flag as orphaned.
- Orphaned backups = FAIL (informational). Zone: SAFE.

**1g-g. Skill Frontmatter Validation**
- Glob for `~/.claude/skills/*/SKILL.md`
- For each: read the first 20 lines, check for `---` delimiters, verify `name:`, `description:`, `argument-hint:` fields exist
- Missing or malformed frontmatter = FAIL. Zone: SAFE.

**1g-h. Command Syntax Validation**
- Glob for `~/.claude/commands/*.md` and `~/.claude/commands/*/*.md` (skip SKILL.md files, skip non-.md)
- For each: read the first 5 lines, verify file starts with `# ` header or `---` YAML frontmatter
- Invalid syntax = FAIL. Zone: SAFE.

**1g-i. Zone/Damage-Control Bridge Consistency**
- Read `~/.claude/commands/self-heal/zone-map.yaml` — parse `danger` paths
- Read `~/.claude/hooks/damage-control/patterns.yaml` — parse `zeroAccessPaths` and `noDeletePaths`
- Normalize all paths (expand `~`, forward slashes)
- Compare danger-zone paths against DC protections:
  - Danger-zone path NOT in any DC category (zeroAccess/noDelete) → flag as **GAP**
  - zeroAccessPath NOT in danger zone → note as "DC stricter" (informational, not a gap)
- Generate bridge alignment table for the report
- Gaps = FAIL. Zone: DANGER (recommendations only, never auto-modify patterns.yaml).

**1g-j. Selective Strict Mode Recommendation**
- Check `securityMode` value in `~/.claude/hooks/damage-control/patterns.yaml`
- If `permissive` AND danger-zone gaps were found in 1g-i: generate a DANGER-zone recommendation to switch to `strict` for danger-zone paths
- This is always a recommendation (DANGER zone), never auto-applied

**1g-k. Global Infrastructure Scoring**
```
global_checks_total = 9  (checks a through i)
global_checks_passed = count of PASS results
global_checks_failed = global_checks_total - global_checks_passed
global_score = round(100 * global_checks_passed / global_checks_total)
```

**1g-l. Global Infrastructure Report Section**
```markdown
### Global Infrastructure Health (Score: {global_score}/100)

| Check | Status | Details | Zone |
|-------|--------|---------|------|
| Hook JSON Format | {PASS/FAIL} | {N}/{total} hooks produce valid JSON | GRAY |
| Hook Response Schema | {PASS/FAIL} | {N} schema mismatches | GRAY |
| MCP Registration | {PASS/FAIL} | {N} missing from .claude.json | DANGER |
| Settings Structure | {PASS/FAIL} | JSON {valid/invalid} | DANGER |
| Symlink Health | {PASS/FAIL} | {N} broken junctions | SAFE |
| Orphaned Backups | {PASS/FAIL} | {N} old backups | SAFE |
| Skill Frontmatter | {PASS/FAIL} | {N}/{total} valid | SAFE |
| Command Syntax | {PASS/FAIL} | {N}/{total} valid | SAFE |
| Zone/DC Bridge | {PASS/FAIL} | {N} alignment gaps | DANGER |

### Zone / Damage-Control Alignment
| Zone-Map Path | DC Category | Status |
|--------------|-------------|--------|
| {path} | {zeroAccess/noDelete/none} | {Aligned/GAP} |
```

Each failed check generates a fix entry that flows into the tiered pipeline (Step 5/6). The fix zone is determined by the check's default zone classification.

**For `combined` scope:** Both the project Layer 1 section and the Global Infrastructure section appear in the report, with their scores weighted into the composite: `composite = layer_1 * 0.30 + global * 0.10 + layer_2 * 0.25 + layer_3 * 0.15 + layer_4 * 0.15 + (remaining 0.05 to highest-impact layer)`. If scope is `project`, the original weights apply unchanged.

### Step 1m: MCP Intelligence Analysis (Inline)

**Only runs when `MCP_AUDIT` is true (either via `--mcp-audit` flag or via `--global`/`--combined` scope). Runs in ALL modes except `quick-embed`. Skipped when `MCP_AUDIT` is false.**

**Reference:** See `references/mcp-intelligence.md` for owned server registry, SQL queries, overlap heuristics, recommendation templates, and scoring formula.

**1m-a. Load owned server registry**
- Read `{MCP_INTELLIGENCE_REF}`
- Parse the `owned_servers` YAML block to get server names, source paths, and tool prefixes
- Parse the `thresholds` configuration block
- If reference file is missing or unreadable, warn and skip MCP analysis entirely: "MCP intelligence skipped — reference file not found"

**1m-b. Schema verification**
- Write a Python script to `{PROJECT_DIR}/tmp_sh_mcp.py` that:
  1. Opens `{CORTEX_DB}` (project) in read-only mode
  2. Runs `SELECT name FROM sqlite_master WHERE type='table' AND name='activities'` — if no result, MCP analysis scores "N/A" ("No activities table found")
  3. Runs `PRAGMA table_info(activities)` — check for `session_id` column. If missing, set `HAS_SESSION_ID = false` (co-occurrence will be skipped)
  4. Counts total MCP tool calls: `SELECT COUNT(*) FROM activities WHERE tool_name LIKE 'mcp__%' AND created_at > datetime('now', '-{window_days} days')`
  5. If total < `min_mcp_calls` threshold (default 50): MCP analysis displays "Insufficient data for MCP analysis ({N} calls, minimum {threshold})" and scores "N/A"
- Run via Bash: `python "{PROJECT_DIR}/tmp_sh_mcp.py" "{CORTEX_DB}"`
- Delete temp file after (try/finally)
- **Windows paths:** Use forward slashes in all Python paths. Use `chr(92)` if backslash manipulation is ever needed.

**1m-c. Usage profiler**
- Write a Python script to `{PROJECT_DIR}/tmp_sh_mcp_usage.py` that:
  1. Opens `{CORTEX_DB}` in read-only mode
  2. Runs the Usage Profiler SQL query from `references/mcp-intelligence.md` (call count, failures, fail%, avg duration, last used per tool)
  3. Filters results client-side: keep only tools whose `tool_name` starts with one of the `tool_prefix` values from the owned server registry
  4. For each owned server, calculate:
     - Total tools in catalog (from `references/mcp-intelligence.md` Known Tool Catalog)
     - Active tools (call_count > 0 in the window)
     - Dormant tools (in catalog but 0 calls — distinguish from "removed" tools that aren't in the DB at all)
     - Average failure rate across all tools on the server
     - Top tool by call count
  5. Classify each tool by usage threshold: Heavy (>50), Regular (10-50), Light (3-9), Rare (1-2), Dormant (0)
  6. Flag tools with failure rate > `failure_concern` threshold (default 10%)
  7. Output as JSON: `{"per_tool": [...], "per_server": [...], "dormant_tools": [...], "high_failure_tools": [...]}`
- Run via Bash, parse JSON output, delete temp file
- Format the **Tool Usage Details** table and **Usage Health** table from the reference file templates

**1m-d. Co-occurrence analysis**
- **Skip if `HAS_SESSION_ID` is false** (log: "Co-occurrence skipped — no session_id column in activities")
- Write a Python script to `{PROJECT_DIR}/tmp_sh_mcp_cooccur.py` that:
  1. Opens `{CORTEX_DB}` in read-only mode
  2. Runs the Co-occurrence SQL query from reference file (tool pairs called in same session)
  3. Runs the Per-Tool Session Count query
  4. For each pair: calculate `co_occurrence_rate = shared_sessions / max(tool_a_sessions, tool_b_sessions)`
  5. Filter to owned MCP tools only (both tools in the pair must match an owned prefix)
  6. Flag pairs where rate > `co_occurrence_rate` threshold (default 80%)
  7. Output as JSON: `{"pairs": [{"tool_a": "...", "tool_b": "...", "shared": N, "rate": 0.XX}], "high_pairs": [...]}`
- Run via Bash, parse JSON output, delete temp file
- Format the **Co-occurrence Patterns** table

**1m-e. Overlap detection**
- This step uses the **Known Tool Catalog** from `references/mcp-intelligence.md` (static functional categories) plus usage data from 1m-c
- For each pair of owned MCP tools across different servers in the same functional category:
  - Flag as "Cross-server overlap" with the category name
- For each pair of tools on the SAME server with similar categories (Search/Query + List/Browse, or two Search/Query tools):
  - Flag as "Same-server redundancy"
- For rare/dormant tools that have an alternative with higher usage in the same category:
  - Flag as "Rare tool with alternative"
- Format the **Potential Overlaps** table from reference file templates
- All overlaps are framed as "potential" — heuristic-based, user decides

**1m-f. Generate recommendations**
- For each finding from 1m-c through 1m-e, generate a recommendation using the templates in `references/mcp-intelligence.md`:
  - Dormant tools → "Document use case or consider removing" (Zone: GRAY for source, DANGER for registration)
  - High failure tools → "Investigate and fix root cause" (Zone: GRAY)
  - High co-occurrence pairs → "Consider combined convenience tool" (Zone: GRAY)
  - Cross-server overlaps → "Document differentiation" (Zone: SAFE)
  - Same-server redundancy → "Document or merge" (Zone: GRAY for merge, SAFE for docs)
  - Rare with alternative → "Document preferred workflow" (Zone: SAFE)
- Each recommendation is zone-classified using `classify_path()` on the target files (MCP source paths → GRAY per zone-map.yaml)
- Recommendations flow through the tiered pipeline (Step 5/6) alongside Layer 1 fixes:
  - SAFE recommendations → auto-apply (documentation)
  - GRAY recommendations → draft for user review
  - DANGER recommendations → recommend only

**1m-g. MCP Intelligence scoring**
```
mcp_score = 100
mcp_score -= (dormant_tools * 5)            # Each dormant tool = -5
mcp_score -= (high_failure_tools * 10)       # Each >10% failure tool = -10
mcp_score -= (unresolved_overlaps * 3)       # Each overlap finding = -3
mcp_score -= (high_co_occurrence_pairs * 2)  # Each >80% pair = -2
Floor at 0, cap at 100.
```

**1m-h. MCP Intelligence report section**
- Format using the report template from `references/mcp-intelligence.md`:
  - MCP Intelligence Summary header with server counts and totals
  - Usage Health table (per-server summary)
  - Tool Usage Details table (per-tool breakdown)
  - Co-occurrence Patterns table (if session_id available)
  - Potential Overlaps table
  - Consolidation Opportunities (numbered list with zone labels)
  - Trend comparison (if previous MCP intelligence snapshot exists in Cortex)

**1m-i. Trend comparison**
- Query Cortex for previous MCP intelligence snapshot: `cortex_list_memories` with `tags_filter: ["mcp-intelligence", "self-heal"]`, `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 1`
- If previous snapshot exists: compare current vs previous values (usage changes, new dormant tools, failure rate changes)
- Format the **Trend** section with arrows: usage up/down, new dormant tools, failure rate changes
- If no previous snapshot: display "First MCP audit — no trend data yet"

**1m-j. Store MCP intelligence snapshot**
- Use `cortex_remember` to store current analysis results for future trend comparison:
  ```
  content: "MCP Intelligence Snapshot - {date}
    Servers analyzed: {N}
    Total tools: {N}, Active: {N}, Dormant: {list}
    High failure: {list}
    Co-occurrence pairs: {list}
    Overlaps detected: {list}
    MCP Score: {mcp_score}/100
    Key recommendations: {top 3}"
  tags: ["mcp-intelligence", "self-heal", "trend-data"]
  importance: 60
  ```

**1m-routing. Standalone mode routing**
- **If `MCP_STANDALONE` is true:** After completing Step 1m, skip Steps 2-7 (no sub-agents, no Layer 1 fixes, no failure archiving). Jump directly to Step 8 (save report). The report contains only the MCP Intelligence section. The report score is `mcp_score` (not a composite).
- **If `MCP_STANDALONE` is false:** Continue to Step 2 as normal. MCP intelligence results are included in the full report alongside other layers.

### Step 2: Launch Layers 2-4 (Parallel Sub-Agents)

**Only runs in `deep` (default) and `report-only` modes.**

Spawn 3 Task sub-agents in a single message (parallel execution):

```
Task 1: Layer 2 — Tool Reliability
  subagent_type: "general-purpose"
  prompt: [Layer 2 instructions]

Task 2: Layer 3 — Session Health
  subagent_type: "general-purpose"
  prompt: [Layer 3 instructions]

Task 3: Layer 4 — Memory Freshness
  subagent_type: "general-purpose"
  prompt: [Layer 4 instructions]
```

Each sub-agent:
1. Writes a temp Python script to `{PROJECT_DIR}/tmp_sh_layer{N}.py`
2. Runs it via Bash: `python "{PROJECT_DIR}/tmp_sh_layer{N}.py" "{DB_PATH}"`
3. Parses JSON output
4. Deletes the temp file (even on failure — use try/finally pattern)
5. Returns the result as a structured text block with score and markdown section

**Zone context injection:** Prepend the following to EACH sub-agent's prompt to enforce zone awareness:

```
Zone restrictions for this analysis:
- SAFE zone files: You may suggest auto-applicable fixes for these paths
- GRAY zone files: Flag for main agent review, do NOT suggest auto-apply
- DANGER zone files: Report only, do NOT suggest modifications
- Danger paths (from zone-map.yaml): {list all patterns from zone-map.yaml danger section}
- Gray paths: {list all patterns from zone-map.yaml gray section}
When generating gotcha or fix suggestions, classify each by the target file's zone.
Return zone classification alongside each finding.
```

**Important:** If a sub-agent fails or times out, that layer scores "N/A" and is noted in the report. Other layers still complete.

#### Layer 2 Sub-Agent Instructions: Tool Reliability

Tell the sub-agent:

> Write a Python script to `{PROJECT_DIR}/tmp_sh_layer2.py` that queries `{CORTEX_DB}`:
>
> ```sql
> SELECT tool_name,
>        COUNT(*) as total,
>        SUM(CASE WHEN success=0 THEN 1 ELSE 0 END) as failures,
>        ROUND(SUM(CASE WHEN success=0 THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as fail_rate,
>        ROUND(AVG(duration_ms), 0) as avg_duration
> FROM activities
> WHERE timestamp > datetime('now', '-7 days')
> GROUP BY tool_name
> HAVING COUNT(*) >= 5
> ORDER BY fail_rate DESC
> ```
>
> **Scoring:**
> ```
> layer_2_score = 100
> For each tool with fail_rate > 0:
>     if fail_rate > 20%: layer_2_score -= 20  (critical)
>     elif fail_rate > 10%: layer_2_score -= 10
>     elif fail_rate > 5%: layer_2_score -= 5
>     elif fail_rate > 1%: layer_2_score -= 2
> Floor at 0.
> ```
>
> **Status labels:** >20% = CRITICAL, >10% = Warning, >5% = Watch, >1% = Minor, 0% = Healthy
>
> **Report section:**
> ```markdown
> ### Layer 2: Tool Reliability (Score: {N}/100)
>
> | Tool | Calls (7d) | Failures | Fail Rate | Avg Duration | Status |
> |------|-----------|----------|-----------|--------------|--------|
> | {tool} | {total} | {failures} | {rate}% | {duration}ms | {status} |
>
> **Top Issue:** {tool} has {rate}% failure rate — {failures} wasted calls in 7 days.
> Recommendation: {specific recommendation based on tool and error patterns}
> ```
>
> **Gotcha generation:** For each tool with fail_rate > 10% that isn't already a known gotcha, output a gotcha line:
> `- **{Tool} {rate}% failure rate**: {failures}/{total} calls fail — {recommendation}. ({failures}x in 7 days)`
>
> Return your results in this exact format:
> ```
> LAYER_2_SCORE: {N}
> LAYER_2_GOTCHAS:
> - {gotcha line 1}
> - {gotcha line 2}
> LAYER_2_SECTION:
> {markdown section}
> ```
>
> Use forward slashes in Python paths. Delete `tmp_sh_layer2.py` when done.
> If the database doesn't exist or the activities table is missing, return score N/A.

**MCP context injection for Layers 3-4:** If `MCP_AUDIT` is true and MCP analysis completed (Step 1m), inject the following into Layer 3 and Layer 4 sub-agent prompts:

```
MCP Intelligence context (from Step 1m analysis):
- High-failure MCP tools: {list of tools with >10% failure rate, or "none"}
- Dormant MCP tools: {list of tools with 0 calls, or "none"}
- Known overlaps: {list of overlap findings, or "none"}
When analyzing session health or memory freshness, cross-reference any MCP tool findings.
Layer 3: If session failures correlate with high-failure MCP tools, note the correlation.
Layer 4: If MCP intelligence snapshots exist in Cortex, compare usage trends.
```

#### Layer 3 Sub-Agent Instructions: Session Health

Tell the sub-agent:

> Write a Python script to `{PROJECT_DIR}/tmp_sh_layer3.py` that queries `{CORTEX_DB}`:
>
> ```sql
> -- Graceful exit rate
> SELECT COUNT(*) as total,
>        SUM(CASE WHEN ended_at IS NOT NULL THEN 1 ELSE 0 END) as graceful,
>        ROUND(SUM(CASE WHEN ended_at IS NOT NULL THEN 1 ELSE 0 END)*100.0/COUNT(*), 1) as graceful_pct
> FROM sessions
> WHERE started_at > datetime('now', '-30 days');
>
> -- Average session duration (graceful only)
> SELECT ROUND(AVG(
>     (julianday(ended_at) - julianday(started_at)) * 24 * 60
> ), 1) as avg_minutes
> FROM sessions
> WHERE ended_at IS NOT NULL AND started_at > datetime('now', '-30 days');
>
> -- Sessions without summary
> SELECT COUNT(*) as no_summary
> FROM sessions
> WHERE summary IS NULL AND started_at > datetime('now', '-30 days');
> ```
>
> **Scoring:**
> ```
> layer_3_score = 100
> if graceful_pct < 50%: layer_3_score -= 30
> elif graceful_pct < 70%: layer_3_score -= 20
> elif graceful_pct < 90%: layer_3_score -= 10
> if no_summary_pct > 30%: layer_3_score -= 15
> Floor at 0.
> ```
>
> **Brain integration (if available):**
> Also query Brain for coordination context — terminal state, pulse data, and journal entries add depth to session health:
> ```bash
> brain --json status 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.dumps({k:d.get(k) for k in ['terminals','pulse_count_session','edits_since_commit','paused']}))"
> brain --json journal list 2>/dev/null | python3 -c "import sys,json; entries=json.load(sys.stdin); alerts=[e for e in entries if e.get('type')=='failure_alert']; print(f'Brain alerts: {len(alerts)}/{len(entries)} entries')"
> ```
> Include in session health scoring: if brain has failure alerts, subtract 5 per alert (max -20). If brain shows stale terminals (>24h), subtract 10. If brain is paused during analysis, note it.
>
> **Report section:**
> ```markdown
> ### Layer 3: Session Health (Score: {N}/100)
>
> - **Graceful exits:** {N}% ({graceful}/{total} sessions in 30d)
> - **Average duration:** {N} minutes (graceful sessions only)
> - **Missing summaries:** {N}% ({no_summary}/{total})
> - **Brain terminals:** {N} active | **Brain alerts:** {N} failure alerts in 7d
> - **Edits since commit:** {N} | **Brain paused:** {yes/no}
>
> **Issue:** {describe main issue if score < 100}
> Recommendation: {specific recommendation}
> ```
>
> Return your results in this exact format:
> ```
> LAYER_3_SCORE: {N}
> LAYER_3_SECTION:
> {markdown section}
> ```
>
> Use forward slashes in Python paths. Delete `tmp_sh_layer3.py` when done.
> If the database doesn't exist or the sessions table is missing, return score N/A.

#### Layer 4 Sub-Agent Instructions: Memory Freshness

Tell the sub-agent:

> Write a Python script to `{PROJECT_DIR}/tmp_sh_layer4.py` that queries BOTH databases.
> **CRITICAL: `{GLOBAL_DB}` is READ ONLY — never write to it.**
>
> Query `{CORTEX_DB}` (project):
> ```sql
> SELECT status, COUNT(*) as cnt FROM memories GROUP BY status;
> ```
>
> Query `{GLOBAL_DB}` (global, READ ONLY):
> ```sql
> -- Age distribution
> SELECT
>     SUM(CASE WHEN created_at > datetime('now', '-7 days') THEN 1 ELSE 0 END) as last_week,
>     SUM(CASE WHEN created_at > datetime('now', '-30 days') THEN 1 ELSE 0 END) as last_month,
>     COUNT(*) as total
> FROM memories;
>
> -- Access pattern
> SELECT
>     SUM(CASE WHEN access_count = 0 THEN 1 ELSE 0 END) as never_accessed,
>     COUNT(*) as total
> FROM memories;
> ```
>
> **Scoring:**
> ```
> layer_4_score = 100
> if needs_review_pct > 10%: layer_4_score -= 15
> if never_accessed_pct > 80%: layer_4_score -= 20
> if archived_pct < 1% AND total > 500: layer_4_score -= 10
> Floor at 0.
> ```
>
> **Report section:**
> ```markdown
> ### Layer 4: Memory Freshness (Score: {N}/100)
>
> | Metric | Value | Assessment |
> |--------|-------|------------|
> | Total memories (project) | {N} | — |
> | Total memories (global) | {N} | — |
> | Status: fresh | {N}% | {assessment} |
> | Never accessed | {N}% | {assessment} |
> | Last review | {date or "Never"} | {assessment} |
>
> **Issue:** {describe main issue if score < 100}
> Recommendation: {specific recommendation}
> ```
>
> Return your results in this exact format:
> ```
> LAYER_4_SCORE: {N}
> LAYER_4_SECTION:
> {markdown section}
> ```
>
> Use forward slashes in Python paths. Delete `tmp_sh_layer4.py` when done.
> If a database doesn't exist or a table is missing, return score N/A for that part.

### Step 3: Merge Layer Results

**3a. Collect results from sub-agents**
- Parse the structured text returned by each sub-agent
- Extract score (number or "N/A") and markdown section
- If a sub-agent failed entirely: set that layer's score to "N/A", use fallback section: `### Layer {N}: {Name} (Score: N/A)\n\nLayer unavailable — sub-agent failed or timed out.`

**3b. Calculate composite score**
Apply the composite formula from above. If any layer is N/A, redistribute its weight equally among available layers. Example: if Layer 4 is N/A, redistribute 0.15 across L1 (0.46), L2 (0.35), L3 (0.19).

**3c. Collect gotchas from Layer 2**
- Layer 2 may return new gotcha entries for tools with >10% failure rate
- Add these to the fix generation queue in Step 5

**3d. Validate sub-agent zone classifications**
- For each fix suggestion returned by sub-agents (Layers 2-4), re-classify through `classify_fix()` using the main agent's zone-map
- If a sub-agent suggested modifying a danger-zone file: override to recommend-only regardless of what the sub-agent proposed
- If a sub-agent suggested auto-applying a gray-zone fix: downgrade to draft-and-approve
- Log any classification mismatches in the report: "Zone override: sub-agent proposed {action} for {file} but zone is {zone}"
- This validation ensures sub-agents cannot bypass zone restrictions even if their zone context was incomplete

### Step 4: Recall Existing Knowledge

Check what's already known:
```
cortex_recall: "tool failure pattern {project_name}"
cortex_recall: "self-heal improvements {project_name}"
```

Read current MEMORY.md if it exists. Parse existing Gotchas section to avoid duplicates.

### Step 5: Generate Fixes

For each **recurring** pattern (from Layer 1) AND each high-failure tool gotcha (from Layer 2), generate a fix entry:

**Format for MEMORY.md Gotchas:**
```
- **{short description}**: {what fails} - {how to avoid it}. ({count}x in recent sessions)
```

**Fix categories** (determines WHAT the fix does):
1. **Memory fix** - Add gotcha to MEMORY.md
2. **Command fix** - Suggest update to a slash command (deep mode only)
3. **Config fix** - Suggest update to CLAUDE.md or settings (deep mode only)
4. **Hook prevention** - Generate PreToolUse hook for escalated patterns (deep mode only, see Step 5b)
5. **Unfixable** - External issue, just document

**5a-zone. Zone classification** (determines HOW the fix executes):

After assigning a category to each fix, classify its zone:
```
for each fix in generated_fixes:
    fix.zone = classify_fix(fix)     # Uses target_files + zone-map.yaml
    # Category (memory/command/config/hook/unfixable) still applies
    # Zone determines execution track in Step 6, not what the fix does
```

Each fix entry now carries both a `category` and a `zone`. Example:
- Memory fix targeting MEMORY.md → category=memory, zone=SAFE → auto-apply
- Config fix targeting settings.json → category=config, zone=DANGER → recommend only
- Command fix targeting a hook script → category=command, zone=GRAY → draft-and-approve

**5b. Hook Prevention Generation (deep mode only, escalated patterns)**

Read fix-patterns.md and find patterns with status "ESCALATE". For each escalated pattern:

1. **Determine hook parameters:**
   - Which tool(s) are affected (from gotcha text and failure data)
   - What regex detects the bad input in tool_input
   - What correction message to show

2. **Pattern-to-hook mapping** (known categories):

   | Pattern Category | Tool Matcher | Validation Logic |
   |-----------------|-------------|-----------------|
   | Windows path quoting | Bash | Detect unquoted paths matching `[A-Z]:\\[^ ]+\s` |
   | Complex Python inline | Bash | Detect `python -c` with >3 levels of quote nesting |
   | Read directory error | Read | Detect file_path ending in `\` or known directory paths |
   | Glob timeout | Glob | Detect patterns starting with `C:\Users\` or `**/*` without path |
   | Windows commands in bash | Bash | Detect `del `, `copy `, `Select-String`, `Get-Content` |

3. **Generate two files per escalated pattern:**

   **Python hook script** (`{REPORTS_DIR}/hooks/sh-hook-{slug}.py`):
   ```python
   #!/usr/bin/env -S uv run --script
   # /// script
   # requires-python = ">=3.8"
   # ///
   # Auto-generated by /self-heal v2 — Pattern: {pattern_name}
   # Report: sh-{NNN}-{date}.md | Status: ESCALATED after {N} runs
   # To install: Copy the JSON config to ~/.claude/settings.json hooks.PreToolUse
   # To disable: Remove this hook entry from settings.json

   import json, sys, re, logging
   from pathlib import Path
   from datetime import datetime

   LOG_DIR = Path.home() / ".claude" / "logs"
   LOG_DIR.mkdir(parents=True, exist_ok=True)
   logger = logging.getLogger("sh-prevention")
   handler = logging.FileHandler(LOG_DIR / "sh-prevention.log")
   handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
   logger.addHandler(handler)
   logger.setLevel(logging.INFO)

   def validate(tool_name: str, tool_input: dict) -> tuple:
       """Returns (is_valid, reason). Pattern-specific logic below."""
       # {Generated validation logic for this specific pattern}
       return True, ""

   def main():
       try:
           data = json.load(sys.stdin)
           tool_name = data.get("tool_name", "")
           tool_input = data.get("tool_input", {})
           is_valid, reason = validate(tool_name, tool_input)
           if not is_valid:
               logger.info(f"BLOCKED {tool_name}: {reason}")
               print(f"Self-Heal Prevention: {reason}", file=sys.stderr)
               sys.exit(2)  # EXIT 2 = BLOCK
           sys.exit(0)
       except Exception:
           sys.exit(0)  # Never crash on hook errors

   if __name__ == "__main__":
       main()

   # === TEST ===
   # echo '{"tool_name":"{tool}","tool_input":{bad_example}}' | python this_script.py
   # Expected: Exit code 2, stderr shows "Self-Heal Prevention: ..."
   #
   # echo '{"tool_name":"{tool}","tool_input":{good_example}}' | python this_script.py
   # Expected: Exit code 0 (passes validation)
   ```

   **Settings config snippet** (`{REPORTS_DIR}/hooks/sh-hook-{slug}.json`):
   ```json
   {
     "matcher": "{ToolName}",
     "hooks": [
       {
         "type": "command",
         "command": "python \"{REPORTS_DIR}/hooks/sh-hook-{slug}.py\"",
         "timeout": 3
       }
     ]
   }
   ```

4. **Create `{REPORTS_DIR}/hooks/` directory** if it doesn't exist.

5. **NEVER auto-install hooks.** Generated hooks go to `{REPORTS_DIR}/hooks/`. The user must manually copy the config into `~/.claude/settings.json` under `hooks.PreToolUse`. Remind them hooks load at startup only.

### Step 6: Apply Fixes (Tiered Pipeline)

**Skip this step if mode is report-only.** In report-only mode, all fixes are classified but nothing is applied — all tracks just report.

**In quick mode:** Safe fixes auto-apply. Gray and danger fixes are logged but NOT prompted (quick should be fast).

Group all generated fixes by zone, then execute each track in order:

**6a. Safe Track (auto-apply)**
- Filter fixes where `zone == SAFE`
- If MEMORY_FILE doesn't exist, create it with basic template:
  ```
  # {Project Name} - Auto Memory

  ## Key Patterns

  ## Gotchas

  ## Decisions
  ```
- Read existing content, find `## Gotchas` section
- For each safe fix entry, check if a similar gotcha already exists (compare first 40 chars after `**`)
- If exists: update the count (e.g., `(3x` -> `(5x`)
- Append only NEW entries under `## Gotchas`
- Keep total file under 180 lines (leave buffer for 200-line truncation)
- Mark each applied fix as `[AUTO-FIXED]` in the report
- No user interaction needed
- Display brief summary: "Auto-applied {N} safe fixes"

**6b. Gray Track (draft-and-approve)**
- Filter fixes where `zone == GRAY`
- **In quick mode:** Log all gray fixes in the report as `[DEFERRED]` — do NOT prompt the user
- **In deep mode:** For each gray fix, display a draft:
  ```
  ### Gray Zone Fix: {pattern_name}
  **Target:** {file_path}
  **Zone:** GRAY (requires approval)
  **What changes:**
  {description of the fix}

  **Before:**
  ```{current content snippet}```

  **After:**
  ```{proposed content}```
  ```
- Use `AskUserQuestion` for approval with options:
  - "Approve this fix"
  - "Skip this fix"
  - "Approve all remaining gray fixes"
  - "Skip all remaining gray fixes"
- If approved: apply the fix and mark `[APPROVED]` in report
- If rejected: mark `[DEFERRED]` in report and include as recommendation
- If "approve all": apply all remaining gray fixes, mark `[APPROVED]`
- If "skip all": mark all remaining gray as `[DEFERRED]`
- Deep mode also suggests command/skill improvements for tool-specific patterns (e.g., Bash failures from Windows syntax) — output suggestions but do NOT auto-modify commands

**6c. Danger Track (recommend-only)**
- Filter fixes where `zone == DANGER`
- Generate detailed recommendation in report for each:
  ```markdown
  ### [DANGER-ZONE] {pattern_name}
  **Target:** {file_path}
  **Why this is in the danger zone:** {explanation based on zone-map.yaml classification}
  **Recommended change:**
  {what should change and why}
  **Manual steps:**
  1. Open {file_path}
  2. {step-by-step instructions}
  3. Restart Claude Code (if hooks/settings changed)
  ```
- **NEVER** attempt to modify danger-zone files
- Display count: "{N} danger-zone recommendations in report"

**6d. Update fix-patterns.md**
- Read current `{FIX_PATTERNS_FILE}` (or initialize if missing)
- For each pattern found in current analysis (all zones):
  - If pattern exists in Active Fixes table:
    - Increment `Runs Tracked`
    - Append current count to `Count History` (comma-separated)
    - Update `Current` to new count
    - Recalculate `Effectiveness`: `((first_count - current_count) / first_count) * 100`
    - Update `Status` based on effectiveness:
      - `> 50%` -> IMPROVING
      - `0% to 50%` -> active
      - `== 0%` -> STABLE
      - `< 0%` -> WORSE
    - If WORSE for 3+ consecutive runs -> ESCALATE
  - If pattern is NEW (not in table):
    - Add new row with `First Seen = sh-{REPORT_NUMBER}`, `Runs Tracked = 1`, `Count History = {count}`, `Effectiveness = NEW`, `Status = active`
- For patterns in Active Fixes NOT found in current analysis:
  - If count was > 0 last run, append `,0` to Count History and update Current to 0
  - If Current has been 0 for 3+ consecutive runs: move to "Resolved Fixes" section
- For patterns with ESCALATE status:
  - Add/update entry in "Escalated Fixes" section with trend and recommendation
- Write updated `{FIX_PATTERNS_FILE}`

### Step 7: Archive Processed Failures

Rename the processed file:
```
.omni-cortex/tool_failures.jsonl -> .omni-cortex/tool_failures.{YYYY-MM-DD}.jsonl
```

If an archive for today already exists, append to it instead of overwriting.

### Step 8: Save Report & Store in Cortex

**8a. Save numbered report file**

YAML frontmatter (with layer scores):
```yaml
---
report_number: {REPORT_NUMBER}
date: "{YYYY-MM-DD}"
mode: "{mode}"
scope: "{SCAN_SCOPE}"
failures_processed: {total_count}
recurring_patterns: {recurring_count}
frequent_patterns: {frequent_count}
oneoff_count: {oneoff_count}
new_gotchas_added: {added_count}
existing_gotchas_updated: {updated_count}
safe_fixes_applied: {N}
gray_fixes_approved: {N}
gray_fixes_deferred: {N}
danger_recommendations: {N}
global_checks_passed: {N_or_NA}
global_checks_failed: {N_or_NA}
global_checks_total: {N_or_NA}
global_score: {N_or_NA}
mcp_audit: {true_or_false}
mcp_servers_analyzed: {N_or_NA}
mcp_total_tools: {N_or_NA}
mcp_active_tools: {N_or_NA}
mcp_dormant_tools: {N_or_NA}
mcp_high_failure_tools: {N_or_NA}
mcp_overlaps_detected: {N_or_NA}
mcp_score: {N_or_NA}
layer_1_score: {N}
layer_2_score: {N_or_NA}
layer_3_score: {N_or_NA}
layer_4_score: {N_or_NA}
composite_score: {N}
previous_composite_score: {prev_or_null}
health_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run}"
top_patterns:
  - "{pattern_1} ({count}x)"
  - "{pattern_2} ({count}x)"
  - "{pattern_3} ({count}x)"
---
```

Followed by the full report body (same as terminal output).

**Description slug generation for sh- reports:**
- Derive from the top error pattern or mode:
  - If top recurring pattern exists: use it (e.g., `"bash-path-quoting"`, `"read-directory-error"`)
  - Deep scan with no failures: `"deep-scan"`
  - Quick mode: `"quick-check"`
  - Default fallback: `"default-run"`
- Follow slug rules from `~/.claude/skills/REPORT-CONVENTION.md`

Save to: `{PROJECT_DIR}/{REPORTS_DIR}/sh-{NNN}-{YYYY-MM-DD}-{slug}.md`
- NNN is zero-padded to 3 digits (001, 002, ..., 999)

**8b. Store summary in Cortex**

```
cortex_remember:
  content: "Self-Heal #{REPORT_NUMBER}: {project_name} - Processed {N} failures. {recurring_count} recurring patterns. Composite: {composite}/100 (L1:{l1} L2:{l2} L3:{l3} L4:{l4}{if MCP_AUDIT: ' MCP:{mcp_score}'}) ({delta}). Added {added_count} new gotchas, updated {updated_count}. Top issues: {top_3_patterns}.{if MCP_AUDIT: ' MCP: {mcp_servers} servers, {dormant} dormant, {high_fail} high-failure.'} Report: {REPORTS_DIR}/sh-{NNN}-{YYYY-MM-DD}.md"
  tags: ["self-heal", "{project_name}", "tool-failures", "improvements-applied", "report-{NNN}"{if MCP_AUDIT: , "mcp-intelligence"}]
  importance: 70
```

**8c. Display fix effectiveness summary**

After the standard report, display:

```markdown
### Fix Effectiveness

| Pattern | Previous | Current | Trend | Status |
|---------|----------|---------|-------|--------|
| {name} | {prev} | {curr} | {arrow} | {status} |

**Escalated (fix not working):** {count} patterns need hook-level prevention
**Improving:** {count} patterns trending down
**New this run:** {count} patterns first seen
```

### Step 9: Post-Analysis Action Suggestions

At the end of every self-heal run (all modes except `quick-embed`), suggest the most relevant next action based on results:

```markdown
### Suggested Next Action
{IF Layer 2 has CRITICAL tools (fail_rate > 20%)}
  -> Run `/crystal-ball-constraints` to check if tool reliability issues violate tech limits
{ELIF many one-off failures suggest session-level issues}
  -> Run `/retrospective` for deeper session-level root cause analysis
{ELIF escalated patterns exist in fix-patterns.md AND mode was not deep}
  -> Run `/self-heal deep` to generate hook prevention code for escalated patterns
{ELIF escalated patterns exist AND mode IS deep}
  -> Hook scripts generated in {REPORTS_DIR}/hooks/. Install by copying JSON config to ~/.claude/settings.json
{ELIF composite_score > 80}
  -> System healthy. No immediate action needed.
{ELSE}
  -> Run `/self-heal` again after your next session to track improvement.
```

## Report Format

The full report combines all layers:

```markdown
## Self-Heal Report #{NNN}

**Project:** {project_name}
**Date:** {YYYY-MM-DD}
**Mode:** {mode}
**Scope:** {SCAN_SCOPE}
**Composite Score:** {composite}/100
**Zone Summary:** Applied: {N} safe. Pending: {N} gray. Recommended: {N} danger.

### Health Score Trend
| Run | Date | L1 | L2 | L3 | L4 | Composite | Delta |
|-----|------|----|----|----|-----|-----------|-------|
| {previous runs from frontmatter — old reports show — for missing layers} |
| **{NNN}** | **{date}** | **{l1}** | **{l2}** | **{l3}** | **{l4}** | **{composite}** | **{delta}** |

Trajectory: {trajectory_summary}

### Layer 1: Tool Failures (Score: {N}/100)
{layer_1_section — or "Skipped (global scope)" if scope is "global"}

### Global Infrastructure Health (Score: {N}/100)
{global_section from Step 1g — or "Skipped (project scope)" if scope is "project"}
{Include Zone/DC Bridge alignment table if scope is "global" or "combined"}

### MCP Intelligence Summary (Score: {N}/100)
{mcp_section from Step 1m — or "Skipped (no --mcp-audit, project scope)" if MCP_AUDIT is false}
{In standalone mode (--mcp-audit): this is the only analysis section}
{In integrated mode (--global/--combined): appears alongside other layers}

### Layer 2: Tool Reliability (Score: {N}/100)
{layer_2_section — or "Skipped (quick mode)" if quick}

### Layer 3: Session Health (Score: {N}/100)
{layer_3_section — or "Skipped (quick mode)" if quick}

### Layer 4: Memory Freshness (Score: {N}/100)
{layer_4_section — or "Skipped (quick mode)" if quick}

### Fix Summary by Zone
| Zone | Fixes | Action | Details |
|------|-------|--------|---------|
| SAFE | {N} | Auto-applied | {brief list} |
| GRAY | {N} | {N approved, N deferred} | {brief list} |
| DANGER | {N} | Recommended only | See recommendations below |

### Fix Effectiveness
{fix_effectiveness_table}

### Danger Zone Recommendations (if any)
{For each danger-zone fix: detailed recommendation with manual steps — from Step 6c output}

### Hook Prevention Suggestions (deep mode only, if escalated patterns exist)

**1. {Pattern Name}** — {count}x across {N} runs, count {INCREASING/STABLE}
- Hook type: PreToolUse ({Matcher} matcher)
- Generated: `{REPORTS_DIR}/hooks/sh-hook-{slug}.py`
- Config: `{REPORTS_DIR}/hooks/sh-hook-{slug}.json`
- What it does: {brief description of validation logic}

To install:
1. Copy the JSON config into `~/.claude/settings.json` under `hooks.PreToolUse`
2. Restart Claude Code (hooks load at startup only)

### Suggested Next Action
{contextual suggestion from Step 9}

### Actions Taken
- Composite score: {composite}/100 (L1:{l1} L2:{l2} L3:{l3} L4:{l4})
- Zone pipeline: {N} safe auto-applied, {N} gray ({N} approved, {N} deferred), {N} danger recommended
- Updated fix-patterns.md ({new} new, {updated} updated, {resolved} resolved)
- Saved report to {REPORTS_DIR}/sh-{NNN}-{YYYY-MM-DD}.md
- Archived failures to tool_failures.{date}.jsonl
- Stored summary in Cortex
{if MCP_AUDIT: - MCP intelligence: {N} servers, {N} tools analyzed, MCP score: {mcp_score}/100}
{if deep mode: - Suggested {N} command improvements (see above)}

**Next:** Run `/self-heal` again after your next session to track improvement.
```

## Edge Cases

- **No failures file:** Layer 1 scores 100/100, other layers still run (unless quick mode)
- **All one-offs:** Report but don't modify MEMORY.md
- **MEMORY.md doesn't exist:** Create it with template before adding gotchas
- **MEMORY.md near 200 lines:** Only add high-count patterns (5+), warn about limit
- **Duplicate gotcha:** Update count instead of adding duplicate (fuzzy match on first 40 chars of bold text)
- **Archive file exists for today:** Append, don't overwrite
- **No previous reports (first run):** Set trend to "first_run", skip dashboard, initialize fix-patterns.md
- **Reports deleted manually:** Next number increments from highest remaining filename, not total count
- **Multiple runs same day:** Each gets its own report number (different NNN, same date)
- **fix-patterns.md doesn't exist:** Create with header template and populate from current analysis
- **Pattern name mismatch:** Match patterns by normalizing: lowercase, strip counts/parenthetical, compare first 30 chars
- **Effectiveness calculation with count 0:** If first_count was 0 (shouldn't happen), treat effectiveness as 0%
- **cortex.db doesn't exist:** Layers 2-4 score "N/A", report notes "No Cortex database found"
- **Table missing in cortex.db:** That layer scores "N/A" with note "Table not found: {table_name}"
- **Sub-agent timeout (>30s):** Skip that layer, score "N/A", note "Layer N: timed out" in report
- **Sub-agent error:** Score "N/A", include error message in report section
- **Quick mode:** NEVER spawn sub-agents — Layer 1 only, exit fast
- **Global DB read-only:** Layer 4 must NEVER write to `~/.omni-cortex/global.db`
- **Windows SQLite paths:** Use forward slashes or raw strings in Python scripts
- **Temp file cleanup:** Always delete `tmp_sh_layer{N}.py` files even if script fails
- **Old reports without layer scores:** Treat `health_score` as `composite_score`, show `—` for L2-L4 in trend table
- **quick-embed mode:** No Cortex, no sub-agents, no report file, no MEMORY.md — single-line output only
- **Hook generation without escalated patterns:** Skip hook section entirely if no ESCALATE patterns exist
- **Hook slug generation:** Slugify pattern name: lowercase, replace spaces with `-`, strip non-alphanumeric except `-`
- **Existing hook with same slug:** Overwrite the previous generated files (user hasn't installed them yet since they're in reports dir)
- **Hook exit codes:** 0 = pass, 1 = warn only, 2 = block. Only use exit 2 for definitive pattern matches
- **zone-map.yaml missing:** Warn user, default ALL paths to GRAY (conservative). Zone engine still works, just no auto-apply.
- **zone-map.yaml malformed YAML:** Parse error → treat as missing (all GRAY). Display warning in report.
- **Path not matching any zone pattern:** Defaults to GRAY (conservative)
- **Hook generation targets reports/ directory:** The hook FILES are written to safe zone (reports/hooks/), but the RECOMMENDATION to install them into settings.json is danger-zone. Do not auto-install.
- **Zone inheritance with single file:** Single-file fix takes that file's zone directly (no inheritance needed)
- **SKILL.md structural detection:** Diff >10 lines or section headers added/removed → GRAY. Frontmatter-only → SAFE. When in doubt, classify as GRAY.
- **Windows path normalization:** Both `C:\Users\` and `C:/Users/` must match the same patterns. Normalize all backslashes to forward slashes before glob matching.
- **~ expansion on Windows:** `~` expands to `C:/Users/{username}` (forward slashes). Expansion happens at zone-map load time.
- **Sub-agent zone context:** Sub-agents receive zone context in their prompts (danger/gray path lists). The main agent validates all sub-agent zone classifications in Step 3d before applying fixes. Sub-agent zone misclassifications are overridden and logged.
- **Global scope with no tool_failures.jsonl:** When scope is "global", Layer 1 tool failure analysis is skipped entirely (no tool_failures.jsonl to read). Global infrastructure checks (Step 1g) replace it.
- **Combined scope scoring:** Composite score formula includes global_score when scope is "combined". If global checks are N/A (scope is "project"), global_score fields in frontmatter are set to "N/A".
- **mcp-backup.json missing:** MCP Registration check (1g-c) skips with "N/A — backup file not found". Other checks still run.
- **patterns.yaml missing:** Zone/DC Bridge check (1g-i) skips with "N/A — damage-control not installed". Other checks still run.
- **Large ~/.claude/ directory:** Global scan checks are file-existence + basic parsing only (not deep content analysis). Should complete in <30 seconds even with 60+ items.
- **Damage-control hooks in gray zone:** Hook files in `~/.claude/hooks/damage-control/` are GRAY zone. Global scan reads them for analysis but NEVER auto-modifies them.
- **Bridge path normalization:** patterns.yaml uses `~/` prefix and different glob syntax than zone-map.yaml. Normalize both to forward-slash absolute paths before comparing. Compare at pattern level (exact match), not file-by-file expansion.
- **--global with quick-embed:** Not supported. quick-embed always returns project-level single-line output. Ignore --global flag in quick-embed mode.
- **--mcp-audit standalone:** Skips Layers 1-4, runs only MCP intelligence (Step 1m). Report score is `mcp_score` alone (no composite). Still stores in Cortex and generates report file.
- **--mcp-audit with --global/--combined:** MCP analysis runs alongside global/combined analysis. MCP_STANDALONE is false, so full pipeline runs. MCP score integrates into composite via adjusted weights.
- **--mcp-audit with quick-embed:** Not supported. Ignore --mcp-audit flag in quick-embed mode.
- **Insufficient MCP data (<50 calls):** Display "Insufficient data for MCP analysis ({N} calls, minimum 50)" and score "N/A". Skip co-occurrence and overlap analysis. Do not generate recommendations.
- **Missing session_id column:** Co-occurrence analysis is skipped with note. Usage profiler and overlap detection still run normally.
- **MCP tool added between audits:** New tools appear in usage data but may not be in the Known Tool Catalog. Add them dynamically to the analysis with category "Unknown" and note "New tool not in catalog — update references/mcp-intelligence.md".
- **MCP tool removed between audits:** Tool in catalog but not in activity log AND not in current MCP registration → classify as "Removed" (not "Dormant"). Do not penalize score for removed tools.
- **Cortex DB path on Windows:** Use forward slashes: `D:/Workshop/.omni-cortex/cortex.db`. Python scripts use `sqlite3.connect()` with forward-slash paths.
- **Large activity log (7000+ entries):** SQL queries run directly on SQLite, not through MCP API pagination. Performance should be sub-second for all queries.
- **MCP intelligence reference file missing:** Warn and skip MCP analysis entirely. Do not fail the self-heal run — other layers still complete.
- **Co-occurrence threshold tuning:** The 80% default may be too aggressive or too lenient. Threshold is configurable in `references/mcp-intelligence.md` under `thresholds.co_occurrence_rate`.
- **Overlap detection false positives:** All overlaps are labeled "potential" — heuristic-based, not definitive. User decides on each recommendation.
- **MCP source paths in zone-map:** D:/Projects/*-mcp/ paths are in GRAY zone. MCP recommendations targeting source code go through gray track (draft-and-approve). Registration changes go through danger track (recommend-only).
- **Composite score with MCP:** When both `--combined` and MCP audit run together, composite uses adjusted weights: `L1*0.25 + global*0.10 + mcp*0.10 + L2*0.20 + L3*0.15 + L4*0.15 + 0.05 to highest-impact`. When MCP is standalone, no composite — just mcp_score.
- **Temp file cleanup for MCP scripts:** Always delete `tmp_sh_mcp*.py` files even on failure. Use try/finally pattern in the execution flow.
