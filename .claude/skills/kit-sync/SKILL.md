---
name: kit-sync
description: "Reverse-flow sync that scans universal local skills and commands (~/.claude/skills/, ~/.claude/commands/), compares them against the Claude Collab Kit repo, and proposes/executes updates TO the kit so collaborators get the latest versions. The inverse of /install and /update (which pull FROM the kit). Use when: (1) You updated local skills/commands and want to push changes to the shared kit, (2) You want to see what's stale in the kit vs your local versions, (3) You created a new skill/command that Ralph should have, (4) You want a quick inventory diff between local and kit, (5) User says 'kit sync', 'sync to kit', 'push to kit', 'update the kit', 'what needs updating in the kit'."
argument-hint: "scan | compare <name> | push [--all] [name...] | status | --dry-run | --skills-only | --commands-only"
---

# Kit Sync -- Push Local Changes to the Collab Kit

Reverse-flow sync: scan your universal local skills/commands, compare against the Claude Collab Kit repo, and push updates TO the kit so collaborators (Ralph) get the latest versions.

**This is the inverse of `/install` and `/update`** which pull FROM the kit TO local. Kit-sync pushes FROM local TO the kit.

## Variables

SUBCOMMAND: First word of $ARGUMENTS (scan | compare | push | status). Default: scan
ITEMS: Remaining words after subcommand (skill/command names to target)
FLAGS: Any --prefixed arguments (--all, --dry-run, --skills-only, --commands-only)

## Argument Routing

| Input | Behavior |
|-------|----------|
| *(empty)* or `scan` | L1 Quick Scan -- inventory diff table |
| `scan --skills-only` | L1 scan filtered to skills only |
| `scan --commands-only` | L1 scan filtered to commands only |
| `compare <name>` | L2 Detailed Compare for a specific item |
| `push` | L3 push all recommended items (with confirmation) |
| `push --all` | L3 push everything that differs (with confirmation) |
| `push <name1> <name2>` | L3 push only named items |
| `status` | Full inventory: everything in kit + everything local |
| `--dry-run` | Alias for `scan` |

## Paths

- **Local skills:** `~/.claude/skills/`
- **Local commands:** `~/.claude/commands/`
- **Kit repo root:** Search in order (stop at first match):
  1. `D:\Projects\claude-collab-kit`
  2. `~/claude-collab-kit`
  3. `~/Projects/claude-collab-kit`
  4. `$HOME/claude-collab-kit`
- **Kit skills:** `{REPO_ROOT}/.claude/skills/`
- **Kit commands:** `{REPO_ROOT}/.claude/commands/` (organized in subfolders: workflow/, session/, analysis/, crystal-ball/, etc.)

## Structural Difference: Commands

Kit commands are organized in **category subfolders** for maintainability:
```
.claude/commands/
  workflow/commit.md
  workflow/build.md
  session/pickup.md
  session/handoff.md
  analysis/timeline.md
  crystal-ball/crystal-ball.md
```

Local commands are installed **flat**:
```
~/.claude/commands/
  commit.md
  build.md
  pickup.md
  handoff.md
  timeline.md
  crystal-ball/ (folder-based commands)
```

**When pushing a command to the kit:**
1. Check if it already exists somewhere in `{REPO_ROOT}/.claude/commands/**/` by filename match
2. If found: update in place at the existing location
3. If new: ask user which category subfolder to place it in, or suggest one based on the command's description/purpose. Show existing subfolders as options.

## Exclusion Rules

Skip these items during scanning (they are local-only or not universal):
- Items in `~/.claude/commands/` that are `.bak` or `.backup` files
- Items in `~/.claude/skills/_archived/`
- The kit-sync skill itself (avoid self-referential sync loops)
- Any item whose name starts with `.` or `_`
- `.skill` package files (e.g., `airtable-enhanced.skill`)

### Commands Excluded from Kit (Tony-only / ecosystem-specific)

These commands are local-only and should NOT be synced to the kit. They are either Tony-specific,
ecosystem-dependent (ADW, Brain, Omni-Cortex internals), or project-specific tools Ralph doesn't need:

```
adw-upgrade, all_tools, analyze-history, api, bdd-refactor,
cc_hook_expert_build, cc_hook_expert_improve, cc_hook_expert_plan,
clean, clear-cache, client-onboard, client-update, companion, compose,
coverage, create-teaching-materials, deploy, docs, generate-gpt,
health-check, hotfix, improve, logging, memory-health, merge-worktrees,
migrate, my-style, new-feature, oauth-fix, omni-pause, omni-resume,
omni-start, orchestrate, phase-bridge, prime, prime_cc, prompt, ps,
question, redteam, refactor, security, security-api, security-fix,
security-input, security-preprod, security-secrets, start, voice
```

### Skills Excluded from Kit (Tony-only / ecosystem-specific)

These skills are local-only and should NOT be synced to the kit:

```
adw-analyze, adw-improve, apply-learnings, audio-message,
background-check, biz-recon, brain-scan, brand-guidelines,
brand-identity-generator, client-video, e2e-test, fluxcard-generator,
gemini-analyzer, git-worktrees, invoice, mcp-builder,
n8n-code-javascript, n8n-code-python, n8n-expression-syntax,
n8n-mcp-tools-expert, n8n-node-configuration, n8n-validation-expert,
n8n-workflow-architect, n8n-workflow-patterns, remediation,
research-digest, retrospective, scam-investigator, template-factory,
test, time-travel, transcribe, visual-content-generator,
waverunner-orchestration, web-artifacts-builder, web-extract,
web-harvest, write-like-me, youtube-thumbnail-generator
```

When scanning, treat items in these lists as if they don't exist -- skip them entirely in status reports and push operations.

**Explicit override:** If the user explicitly names an excluded item (e.g., `/kit-sync push scam-investigator` or "add scam-investigator to the kit"), override the exclusion for that specific item only. Warn that it's normally excluded, then proceed. This lets the user force-include items on a case-by-case basis without editing the exclusion list.

**Adding to exclusion lists:** If the user says an item shouldn't be in the kit during a scan/status, add it to the appropriate exclusion list above.

## 4-Status Classification

For each item found in local universal directories, compare against kit:

| Status | Condition | Action |
|--------|-----------|--------|
| **Kit Current** | Local content identical to kit content | No action needed |
| **Kit Stale** | Content differs (local is the source of truth) | Recommend push |
| **New (not in kit)** | Exists locally but no match in kit | Recommend adding |
| **Kit Only** | Exists in kit but not locally | Informational only |

**Comparison method:** Content-based diffing (not timestamps). For skills, compare SKILL.md content. For commands, compare the .md file content. File size difference is a quick pre-filter but always confirm with content comparison.

**For skills with subfolders:** Compare each file in the skill directory (SKILL.md, references/*, scripts/*). If ANY file differs, classify the whole skill as Kit Stale.

## Layer Architecture

### L1: Quick Scan (default, <15s)

Fast inventory diff. Checks file existence and sizes, does content comparison for files that differ in size.

**Output format:**
```
## Kit Sync Scan

### Kit Repo
{REPO_ROOT} -- {clean | N uncommitted changes}

### Kit Stale (N) -- recommend push
| Type | Name | Size Delta | Note |
|------|------|-----------|------|
| Skill | gigafactory | +2.4KB | Local has updates |
| Command | /commit | +340B | Local has updates |

### New -- not in kit (N) -- recommend adding
| Type | Name | Description |
|------|------|-------------|
| Skill | scam-investigator | OSINT scam investigation |
| Command | /deploy | Deployment orchestration |

### Kit Current (N)
skill-1, /command-1, /command-2, ...

### Kit Only (N) -- in kit but not local
skill-x, /command-y, ...

### Summary
{stale_count} items need updating, {new_count} new items to add.
Run `/kit-sync push` to apply, or `/kit-sync compare <name>` to inspect.
```

### L2: Detailed Compare

Read both versions and show meaningful differences. Invoked with `compare <name>`.

**Workflow:**
1. Find the item in both local and kit
2. If skill: compare SKILL.md first, then each file in references/, scripts/, assets/
3. If command: compare the single .md file
4. Show:
   - Sections added locally (not in kit version)
   - Sections removed locally (present in kit but not local)
   - Sections modified (present in both but content differs)
   - New files in local skill folder not in kit
   - For large diffs, summarize rather than showing raw diff

**Output format:**
```
## Compare: {name} ({type})

Local: ~/.claude/skills/{name}/SKILL.md (4.2KB)
Kit:   {REPO_ROOT}/.claude/skills/{name}/SKILL.md (3.1KB)

### Changes in SKILL.md
- ADDED: "## ADW Mode" section (lines 45-67)
- MODIFIED: "## Workflow" -- 3 new steps added
- MODIFIED: frontmatter description updated

### File Changes
- references/patterns.md: MODIFIED (local +1.2KB)
- scripts/analyze.py: NEW (not in kit)
- references/old-ref.md: KIT ONLY (in kit, not local)

### Recommendation
Push to kit -- local version is more complete.
```

### L3: Execute Sync (push)

Copy files from local to kit repo. Requires confirmation before any writes.

**Pre-flight checks:**
1. Check if kit repo has uncommitted changes: `git -C {REPO_ROOT} status --porcelain`
   - If dirty: warn "Kit repo has uncommitted changes. Proceeding will mix your sync with existing changes." Ask to continue or abort.
2. Verify the items to push (show the list, ask for confirmation)

**Push workflow for each item:**

**Skills:**
1. Remove existing kit skill folder: `rm -rf {REPO_ROOT}/.claude/skills/{name}/`
2. Copy entire local skill folder: `cp -r ~/.claude/skills/{name} {REPO_ROOT}/.claude/skills/`
3. Verify SKILL.md exists at target

**Commands (flat .md files):**
1. Find existing location in kit (search `{REPO_ROOT}/.claude/commands/**/` for matching filename)
2. If found: overwrite at existing location
3. If new command: present category subfolder options:
   ```
   Where should /{name} go in the kit?
   1. workflow/    (build, check, commit, test, ...)
   2. session/     (pickup, handoff)
   3. analysis/    (timeline, session-stats, retrospective, ...)
   4. crystal-ball/ (crystal-ball commands)
   5. (root)       (top-level, no subfolder)
   6. New folder:  (create a new category)
   ```
4. Copy the file: `cp ~/.claude/commands/{name}.md {REPO_ROOT}/.claude/commands/{category}/{name}.md`

**Commands that are folders locally (e.g., crystal-ball/, self-heal/, error-trends/, ps/, time-report/):**
- These are skill-like command folders. Copy the entire folder.
- Check if a matching folder already exists in the kit commands directory.

**Post-push:**
1. Run `git -C {REPO_ROOT} status --short` to show what changed
2. Suggest a commit message based on what was synced:
   ```
   Suggested commit message:
   feat: Sync {N} items from local -- {list of names}

   Updated: gigafactory, crystal-ball
   Added: scam-investigator, /deploy
   ```
3. Ask if user wants to commit now (do NOT auto-commit)

## Status Subcommand

Full inventory showing everything in both locations:

```
## Kit Sync Status -- Full Inventory

### Skills ({local_count} local, {kit_count} in kit)
| Name | Local | Kit | Status |
|------|-------|-----|--------|
| gigafactory | Yes | Yes | Kit Stale |
| crystal-ball | Yes | Yes | Kit Current |
| scam-investigator | Yes | No | New |
| devtools-extract | No | Yes | Kit Only |

### Commands ({local_count} local, {kit_count} in kit)
| Name | Local | Kit | Kit Location | Status |
|------|-------|-----|-------------|--------|
| /commit | Yes | Yes | workflow/ | Kit Stale |
| /deploy | Yes | No | -- | New |
| /activity-report | No | Yes | (root) | Kit Only |
```

## Cortex & Brain Integration

### Omni-Cortex (memory/knowledge layer)

**CLI Operations (fire-and-forget):**
- `cortex remember` -- store sync results, what was pushed, what was skipped
- `cortex log-activity` -- track kit-sync executions for session history

**MCP Operations (interactive reasoning):**
- `cortex_recall` -- check if there are previous sync notes or known issues with specific items

### Decision Rule
> If the LLM needs the result to continue reasoning -> MCP.
> If the result is stored/logged and the LLM moves on -> CLI.

## Examples

```
/kit-sync                           # Quick scan: what's stale, what's new
/kit-sync scan                      # Same as above
/kit-sync scan --skills-only        # Only compare skills
/kit-sync scan --commands-only      # Only compare commands
/kit-sync compare gigafactory       # Detailed diff of gigafactory skill
/kit-sync compare commit            # Detailed diff of /commit command
/kit-sync push gigafactory crystal-ball  # Push just these two skills
/kit-sync push --all                # Push everything that differs
/kit-sync push                      # Push all recommended items (with confirmation)
/kit-sync status                    # Full inventory of both locations
/kit-sync --dry-run                 # Alias for scan
```
