---
description: Check for updates to installed skills and commands from the Claude Collab Kit. Detects what changed, flags locally modified items, offers smart merge, and handles removals — with full user control before anything is applied.
argument-hint: "<name> | --check | all"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, AskUserQuestion
model: sonnet
---

# /update — Claude Collab Kit Updater

Scan all locally installed skills and commands against the Claude Collab Kit repo, classify each item by update status, and guide the user through applying updates — including AI-assisted hybrid merge for locally modified items.

## Variables

TARGET: $ARGUMENTS

## Instructions

- Always show a summary before applying any changes — never apply silently
- For locally modified items, always present the 4-option merge workflow (Hybrid Merge / Skip / Overwrite / Keep)
- Never auto-overwrite CLAUDE.md — always show diff and require explicit user confirmation
- Use `rm -rf` before `cp -r` for skill folders on Windows (Git Bash `cp -r` merges, not replaces)
- Items not installed locally are skipped — use `/install` to add new items

## Workflow

### Phase 1: Repo Discovery + Git Freshness Check

**Step 1.1: Locate the Collab Kit Repo**

Search for the repo in these locations (stop at first match):
1. `D:\Projects\claude-collab-kit`
2. `~/claude-collab-kit`
3. `~/Projects/claude-collab-kit`
4. `$HOME/claude-collab-kit`

Verify the directory exists and contains a `commands/` or `skills/` folder. If not found, ask the user for the path with:

```
AskUserQuestion: "Collab kit repo not found at default locations. Where is it installed?"
```

Store the found path as `REPO_ROOT`.

**Step 1.2: Git Freshness Check**

Run: `git -C REPO_ROOT fetch --dry-run 2>&1`

- If the output indicates the local repo is behind (any fetch output besides empty): display a warning with the repo path and ask the user if they want to pull latest changes before scanning (recommended).
  - If yes: run `git -C REPO_ROOT pull`
  - If no: continue with current local state (note they may miss latest updates)
- If git fetch fails (no network/git error): warn "Could not check remote — scanning local state." and continue.
- If the directory is not a git repo: skip this step entirely.

### Phase 2: Enhanced Detection Scan

**Step 2.1: Discover Kit Items**

Scan the repo to build a complete picture of what's available (same as `/install` discovery):

**Skills:** Scan `REPO_ROOT/skills/` for subdirectories with `SKILL.md` or `skill.md`.
- Read YAML frontmatter from each to extract: name, description
- Record: `{ name, description, kit_path }`

**Commands:** Scan `REPO_ROOT/commands/**/*.md` recursively (excluding README.md files).
- Read YAML frontmatter from each to extract: description
- Derive command name from filename (e.g., `handoff.md` → `/handoff`)
- Record: `{ name, description, kit_path }`

**Step 2.2: Scan Installed Items**

Find what is currently installed locally:

**Installed skills:**
- Global: `~/.claude/skills/` — each subdirectory is an installed skill
- Project: `.claude/skills/` in current working directory (if it exists)

**Installed commands:**
- Global: `~/.claude/commands/*.md` — each file is an installed command
- Project: `.claude/commands/*.md` in current working directory (if it exists)

Build a map: `{ item_name: { local_path, type: "skill"|"command" } }`

**Step 2.3: Cross-Reference + Classify Each Installed Item**

For each installed item, find its counterpart in the kit repo by name match, then classify:

| Status | Condition |
|--------|-----------|
| **Current** | Local content is identical to kit content |
| **Update Available** | Content differs, local shows no custom additions |
| **Locally Modified + Update Available** | Content differs AND local has extra content (larger file or unique sections not in kit) |
| **Removed from Kit** | Installed locally but no matching item found in kit repo |

**Modification heuristic for "Locally Modified":**
Read both the local file and the kit file. If the local file is larger in size than the kit file, OR if the local file contains section headers or content blocks not present anywhere in the kit file, classify as `Locally Modified + Update Available`. When in doubt, prefer this safer classification — the 4-option workflow handles all cases.

**Step 2.4: Kit Items Not Installed**

For completeness, note any kit items that have no local counterpart (status: `Not Installed`). These are NOT shown in the update summary — they are handled by `/install`. Skip them.

**Targeting filter (if TARGET is a specific name):**
If TARGET is not empty, `--check`, or `all`, filter to only items matching the name. Continue with just that item.

### Phase 3: Summary Display + Confirmation

**Step 3.1: Display Update Summary**

Present a grouped summary:

```
## Update Check Results

### Git Status
{REPO_ROOT} — {up to date | X commits behind remote}

### Updates Available ({count})
| Type    | Name     | What Changed                              |
|---------|----------|-------------------------------------------|
| Skill   | brainstorm | New first-principles mode, refined steps |
| Command | /handoff | Updated cortex integration, new section  |

### Locally Modified + Update Available ({count})
| Type    | Name   | Your Additions         | Kit Updates              |
|---------|--------|------------------------|--------------------------|
| Command | /build | Custom output path logic | New subfolder auto-detect |

### Removed from Kit ({count})
| Type    | Name        | Note                            |
|---------|-------------|---------------------------------|
| Command | /old-command | No longer in the collab kit    |

### Already Current ({count})
{skill-1}, /command-1, /command-2, ...
```

For each item with **Update Available** or **Locally Modified + Update Available**:
- Read both versions (local + kit)
- Generate a 1-line "What Changed" description (e.g., "New argument routing, updated cortex calls, 3 added steps")
- For skills with multiple files: summarize folder-level changes (files added/removed/modified), don't list every file

**Step 3.2: Handle `--check` mode**

If TARGET is `--check`: display the summary above and stop. Apply nothing. Report: "Dry run complete — no changes made."

**Step 3.3: Batch Confirmation for Standard Updates**

If there are items with status **Update Available** (non-modified), present:

```
{N} standard updates ready to apply.

Options:
1. Apply all {N} updates (recommended)
2. Select specific items to update
3. Cancel — make no changes
```

If user picks "Apply all": proceed to Phase 4 for all Update Available items.
If user picks "Select specific": present each item one by one and ask yes/no per item.
If user picks "Cancel": stop.

After applying standard updates (or if there are none), proceed to handle Locally Modified items and Removed items individually.

### Phase 4: Update Execution + Smart Merge

**Step 4.1: Apply Standard Updates**

For each approved **Update Available** item:

- **Skills:** Remove existing folder first (`rm -rf {local_path}`), then copy entire folder from kit (`cp -r {kit_path} {target_dir}/`)
  - **Windows note:** `cp -r` on Windows Git Bash merges directories instead of replacing — always `rm -rf` first for a clean overwrite
- **Commands:** Overwrite with kit version (`cp {kit_path} {local_path}`)
- Verify after each copy that the file/folder exists at the target path

**Step 4.2: Smart Merge for Locally Modified Items**

For each **Locally Modified + Update Available** item, present the 4-option workflow:

```
### {item name} — Locally Modified

Your version has customizations. The kit also has updates.

**Your customizations:** {brief description of what you added/changed}
**Kit updates:** {brief description of what's new in the kit version}

Options:
1. Hybrid Merge — I'll integrate the new kit features into your customized version (AI-assisted)
2. Skip — Keep your current version unchanged, ignore the kit update for now
3. Overwrite — Replace with the new kit version (your local customizations will be lost)
4. Keep — Same as Skip — keep your local version as-is
```

**If user picks Hybrid Merge:**
1. Read both versions fully
2. Identify what's new in the kit version: new sections, modified steps, added arguments, new workflow phases
3. Identify what the user customized: added sections, modified steps, custom config, extra arguments
4. Produce a merged result that includes BOTH the user's customizations AND the new kit features. Preserve the user's custom sections. Integrate the kit's new sections in appropriate places. Don't lose either side.
5. Present the merged version to the user for review before writing
6. If user approves: write the merged version to the local path
7. If user wants changes: revise and present again until approved

**If user picks Skip or Keep:** leave item unchanged, record in final report as "Skipped (kept local)"
**If user picks Overwrite:** apply the kit version directly (same as standard update)

**Step 4.3: Removal Handling**

For each **Removed from Kit** item, ask individually:

```
"{item name}" was removed from the collab kit and may be deprecated.
Delete your local copy at {local_path}? (y/n)
```

- If yes: remove the file/folder
- If no: leave it in place and note in report

**Step 4.4: CLAUDE.md Handling (if applicable)**

If the kit repo has a `CLAUDE.md` and a project-level `CLAUDE.md` exists in the current directory:
- Read both and check if they differ
- If different: show a diff-style comparison (what was added, removed, changed)
- Offer the same 4 options as locally modified items (Hybrid Merge / Skip / Overwrite / Keep)
- **Never auto-overwrite CLAUDE.md** — always require explicit user confirmation

**Step 4.5: Final Report**

```
## Update Complete

### Updated ({count})
| Type    | Name       | Method           |
|---------|------------|------------------|
| Skill   | brainstorm | Standard overwrite |
| Command | /build     | Hybrid merge     |

### Skipped ({count})
| Type    | Name        | Reason                  |
|---------|-------------|-------------------------|
| Command | /custom-cmd | User chose to keep local |

### Removed ({count})
| Type    | Name        |
|---------|-------------|
| Command | /old-command |

### No Changes Needed ({count})
{items that were already current}

### Next Steps
- Restart Claude Code to load updated commands and skills
- Run `/update --check` anytime to see what updates are available
- Run `/install` to add any new items not yet installed
```

## Report

```
## Update Complete

### Updated ({N} items)
| Type | Name | Method |
|------|------|--------|
| Skill | {name} | Standard overwrite |
| Command | /{name} | Hybrid merge |

### Skipped ({N} items)
| Type | Name | Reason |
|------|------|--------|
| Command | /{name} | User chose to keep local |

### Removed ({N} items)
- /{name}

### No Changes Needed ({N})
{items already current}

### Next Steps
- Restart Claude Code to load updated commands and skills
- Run `/install` to add any new items not yet installed
```

## Argument Routing

| Argument | Behavior |
|----------|----------|
| *(empty)* | Full scan of all installed items, interactive summary, batch confirm |
| `<name>` | Target a specific skill or command by name — scan and update just that item |
| `--check` | Dry run: scan everything and show summary, apply nothing |
| `all` | Apply all **Update Available** items without per-item confirmation (still shows summary first; locally modified items still get the 4-option prompt) |

## Design Principles

1. **Summary first, always.** Never apply any changes before showing what will change.
2. **Local mods are safe.** If you customized a command, `/update` detects it and offers merge — never silently overwrites.
3. **Smart merge is AI-assisted.** Hybrid merge means Claude reads both versions and produces a result with both sides' value — not a mechanical diff.
4. **Removal is explicit.** Removed items are flagged but never auto-deleted.
5. **CLAUDE.md is sacred.** Never auto-overwrite — always show diff and confirm.
6. **`/install` handles new items.** `/update` only manages items already installed. For new items from the kit, use `/install`.

## Examples

```
/update              # Full scan: see what's available, apply interactively
/update --check      # Dry run: see what would update, apply nothing
/update all          # Apply all standard updates (modified items still get prompts)
/update brainstorm   # Check and update just the brainstorm skill
/update handoff      # Check and update just the /handoff command
```
