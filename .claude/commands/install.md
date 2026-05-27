---
description: Install commands, skills, or both from the Claude Collab Kit to your project or globally. Detects what's already installed and offers what's new.
argument-hint: "all | commands | skills | update | <specific-name>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
model: sonnet
---

# Install Claude Collab Kit

Dynamically discover and install commands, skills, and other resources from the Claude Collab Kit repo. This command auto-detects what's available in the repo and what's already installed locally, so it never needs manual updates when new content is added.

## Variables

TARGET: $ARGUMENTS

## Workflow

### Step 0: Git Freshness Check

Run: `git -C REPO_ROOT fetch --dry-run 2>&1`

**Note:** REPO_ROOT is not yet known at this step. Skip this check and re-run it at the end of Step 1 once REPO_ROOT is set.

After locating the repo in Step 1, run the freshness check:
- If the output indicates the local repo is behind (any fetch output besides empty): display a warning with the repo path and ask if the user wants to pull latest before scanning (recommended).
  - If yes: run `git -C REPO_ROOT pull`
  - If no: continue with current local state
- If git fetch fails (no network): warn "Could not check remote — scanning local state." and continue.
- If not a git repo: skip this step.

### Step 1: Locate the Collab Kit Repo

Search for the repo in these locations (stop at first match):
1. `D:\Projects\claude-collab-kit`
2. `~/claude-collab-kit`
3. `~/Projects/claude-collab-kit`
4. `$HOME/claude-collab-kit`

Verify the directory exists and contains a `commands/` or `skills/` folder. If not found, ask the user for the path.

Store the found path as `REPO_ROOT`.

### Step 2: Dynamic Discovery (Scan the Repo)

**IMPORTANT: Do NOT use a hardcoded list.** Scan the repo at runtime to discover everything available.

#### Discover Skills

Scan `REPO_ROOT/skills/` for subdirectories containing `SKILL.md` or `skill.md`:
```
For each subdirectory in REPO_ROOT/skills/:
  1. Look for SKILL.md or skill.md
  2. Read the YAML frontmatter to extract: name, description, argument-hint
  3. List any references/, scripts/, examples/ subfolders
  4. Record: { name, description, path, file_count }
```

#### Discover Commands

Scan `REPO_ROOT/commands/` recursively for `.md` files (excluding README):
```
For each .md file in REPO_ROOT/commands/**/:
  1. Read the YAML frontmatter to extract: description, argument-hint
  2. Derive command name from filename (e.g., commit.md -> /commit)
  3. Derive category from parent folder (e.g., workflow/, session/, memory/)
  4. Record: { name, description, category, path }
```

#### Discover Docs (informational only)

Scan `REPO_ROOT/docs/` for any documentation files. These are listed for reference but not installed as commands.

### Step 3: Detect What's Already Installed

For each discovered item, check if it already exists locally:

**Skills check locations:**
- Global: `~/.claude/skills/{skill-name}/`
- Project: `.claude/skills/{skill-name}/`

**Commands check locations:**
- Global: `~/.claude/commands/{command-name}.md`
- Project: `.claude/commands/{command-name}.md`

**5-status classification:**
For each item, compare the repo version to the installed version:
- If not found locally: mark as **New**
- If identical content: mark as **Current**
- If content differs:
  - Read both the local file and the kit file
  - If the local file is larger in size than the kit file, OR if the local file contains section headers or content blocks not present in the kit file: mark as **Locally Modified + Update Available**
  - Otherwise: mark as **Update Available**
- When in doubt on local modification, prefer **Locally Modified + Update Available** — the merge workflow handles all cases

**Removal detection (reverse scan):**
After classifying kit items against installed items, do a reverse scan:
- For each installed skill/command, check if a matching item exists in the kit repo
- If installed locally but NOT found in kit: mark as **Removed from Kit**
- These are items the user previously installed that Tony has since removed from the repo

### Step 4: Present Inventory to User

Display a table grouping items by status:

```
## Collab Kit Inventory

### Git Status
{REPO_ROOT} — {up to date | X commits behind remote}

### New (not yet installed) — {count}
| Type    | Name            | Description                              |
|---------|-----------------|------------------------------------------|
| Skill   | agent-teams     | Orchestrate parallel agent teams...      |
| Command | /create-command | Create new slash commands from description |

### Updates Available — {count}
| Type    | Name     | Changes                                  |
|---------|----------|------------------------------------------|
| Command | /handoff | Updated cortex integration, new section  |

### Locally Modified + Update Available — {count}
| Type    | Name   | Your Additions       | Kit Updates                |
|---------|--------|----------------------|----------------------------|
| Command | /build | Custom output paths  | New subfolder auto-detect  |

### Removed from Kit — {count}
| Type    | Name        | Note                           |
|---------|-------------|--------------------------------|
| Command | /old-command | No longer in the collab kit   |

### Already Current — {count}
skill-1, /command-1, /command-2, ...
```

For each **Updates Available** and **Locally Modified** item: read both versions and generate a brief 1-line description of what changed.

### Step 5: Handle Arguments

**If TARGET is "all":**
- Install everything that is New or has an Update Available
- For Locally Modified items: present the 4-option smart merge workflow (see Step 6)
- Skip items that are already Current
- Ask for scope (global vs project)

**If TARGET is "update":**
- Filter to update-only view: show only Update Available, Locally Modified + Update Available, and Removed from Kit
- Skip New items (use `/install` without args to install new items)
- Proceed with the same summary-first confirmation flow
- For removals: show inline with guidance to run `/update` or handle directly
- This mode mirrors `/update` but is invoked from within `/install`

**If TARGET is a specific name (e.g., "crystal-ball", "create-command"):**
- Find matching skill or command by name
- If it's a skill with associated commands (e.g., crystal-ball has 8 `/crystal-ball-*` commands), offer to install the suite
- If the item is Locally Modified: apply smart merge workflow (see Step 6)
- Ask for scope

**If TARGET is "commands" or "skills":**
- Install all items of that type that are New or have Updates
- For Locally Modified items: apply smart merge workflow (see Step 6)
- Ask for scope

**If TARGET is empty (interactive mode):**

Use AskUserQuestion:

**Question 1: What to install?**
Build the options dynamically from discovered items:
- "Install new + apply all standard updates (Recommended)" — with combined count of New + Update Available items
- "New items only" — skip updates, install only items not yet installed
- "Updates only" — skip new installs, same as `/install update`
- "Select specific items" — present each item individually

**Question 2: Installation scope?**
```
options:
  - label: "Global (Recommended)"
    description: "Install to ~/.claude/ — available in all projects"
  - label: "This Project Only"
    description: "Install to .claude/ in current directory"
```

### Step 6: Install Selected Items

For each selected item:

1. Determine the target directory based on scope
2. Create target directory if it doesn't exist
3. **Skills:** Remove existing folder first (`rm -rf {target}`), then copy the entire skill folder (`cp -r {kit_path} {target_dir}/`).
   - **Windows note:** `cp -r` on Git Bash merges directories instead of replacing — always `rm -rf` first for a clean overwrite
   - Preserves subdirectories like references/, scripts/, examples/
4. **Commands:** Copy the .md file to the target commands directory (flat, no subdirectories)
   - Commands in the repo are organized in subfolders for maintainability
   - But they install FLAT into `~/.claude/commands/` (Claude Code reads them flat)
5. **For Update Available items:** Overwrite the existing file/folder with the kit version
6. **For Locally Modified + Update Available items:** Present the 4-option smart merge workflow before applying:
   - **Hybrid Merge** — AI-assisted: read both versions fully, identify what's new in kit and what the user customized, produce a merged result with both sides' value, present for user review before writing
   - **Skip** — Keep current version unchanged
   - **Overwrite** — Replace with kit version (user's customizations will be lost)
   - **Keep** — Same as Skip

   For detailed merge guidance, follow the workflow in the `/update` command (Phase 4, Step 4.2). Both `/install` and `/update` use the same 4-option merge workflow.

Use `cp -r` in git bash on Windows. Use `robocopy /E /NFL /NDL /NJH /NJS` as fallback.

### Step 7: Verify Installation

For each installed item:
- Skills: Verify SKILL.md or skill.md exists at target
- Commands: Verify .md file exists at target
- Report any failures

### Step 8: Report

```
## Installation Complete

### Installed (N items)
| Type | Name | Target |
|------|------|--------|
| Skill | agent-teams | ~/.claude/skills/agent-teams/ |
| Command | /create-command | ~/.claude/commands/create-command.md |

### Updated (N items)
| Type | Name | What Changed |
|------|------|-------------|
| Command | /handoff | Updated with Crystal Ball nudges |

### Already Current (skipped)
- /commit, /check, /test (no changes)

### Next Steps
- Restart Claude Code or run `/refresh` to load new commands
- Skills are auto-triggered based on conversation context
- Commands are invoked with /command-name
```

## Instructions

- Never use a hardcoded list of available items — always scan the repo dynamically at runtime
- Install commands flat into `~/.claude/commands/` even if the repo organizes them in subfolders
- Always `rm -rf` existing skill folders before copying (Windows Git Bash `cp -r` merges, not replaces)
- For locally modified items, always offer the 4-option merge workflow — never silently overwrite
- Verify each installed item exists at the target path after copying

## Report

```
## Installation Complete

### Installed ({N} items)
| Type | Name | Target |
|------|------|--------|
| Skill | {name} | ~/.claude/skills/{name}/ |
| Command | /{name} | ~/.claude/commands/{name}.md |

### Updated ({N} items)
| Type | Name | What Changed |
|------|------|-------------|
| Command | /{name} | {brief description} |

### Skipped / Already Current
- {list of unchanged items}

### Next Steps
- Restart Claude Code to load new commands and skills
```

## Cortex Integration

After installation completes, store results for history tracking:
```bash
cortex remember "Install results for $(basename $PWD): [N] items installed, [N] updated, [N] skipped. Scope=[global/project]" --tags install,dependency,$(basename $PWD | tr '[:upper:]' '[:lower:]') --importance 60 2>/dev/null || true
```

## Design Principles

1. **Zero maintenance.** The install command never needs editing when new content is added to the repo. It discovers everything dynamically.
2. **Non-destructive.** Items marked Current are skipped. Updates require the item to actually differ.
3. **Flat command install.** Repo organizes commands in subfolders, but they install flat into `~/.claude/commands/`.
4. **Skill folder integrity.** Skills are copied as complete folders preserving references/, scripts/, etc.
5. **Update-aware.** Install detects local modifications and offers merge options instead of blind overwrites. Local customizations are always preserved unless the user explicitly chooses Overwrite.
6. **Shared detection logic.** The 5-status classification and merge workflow match `/update` for consistency. Both commands behave identically when handling updates — `/install` is the discovery entry point, `/update` is the focused update tool.

## Examples

```
/install                    # Interactive: shows what's available and what's new
/install all                # Install everything new + updated (modified items get merge prompts)
/install update             # Show only updates — same as running /update
/install crystal-ball       # Install Crystal Ball skill + its 8 commands
/install commands           # Install all commands only
/install agent-teams        # Install just the agent-teams skill
```
