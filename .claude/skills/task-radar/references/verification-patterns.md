# Verification Patterns Reference

> Lookup table for verifying whether radar items are still active or have been resolved.

## Verification Methods

### spec-check
**Applies to:** Items referencing specs in `specs/todo/`
**Method:** Glob `specs/done/**/{spec_filename}` — if found, item is RESOLVED
**Also check:** `specs/archive/` for archived specs

### mcp-check
**Applies to:** Items about MCP registration
**Method:** Parse `C:\Users\Tony\.claude.json` → check if `mcpServers` contains the MCP name
**Also check:** Run `grep -l "{mcp_name}" ~/.claude/settings.json` for settings-based MCPs

### skill-check
**Applies to:** Items about creating, archiving, or syncing skills
**Method:**
- For "archive X skill": Check if `~/.claude/skills/{name}/` still exists → if gone, RESOLVED
- For "create X skill": Check if `~/.claude/skills/{name}/SKILL.md` exists → if exists, RESOLVED
- For "sync to collab-kit": Check if skill exists in `D:/Projects/claude-collab-kit/.claude/skills/{name}/`

### git-check
**Applies to:** Any item that may have been addressed in git commits
**Method:**
```bash
# Local repo — check for commits mentioning the item
git log --oneline --since="{item_last_touched}" --grep="{keyword}" -- .

# Collab-kit repo — check for sync commits
git -C "D:/Projects/claude-collab-kit" log --oneline --since="{item_last_touched}" --grep="{keyword}" 2>/dev/null

# Remote — check pushed commits
git log --oneline origin/master --since="{item_last_touched}" --grep="{keyword}" 2>/dev/null
```
**Keywords:** Extract from item title — use the most distinctive 2-3 words

### config-check
**Applies to:** Items about config file updates (CLAUDE.md, settings.json, hooks)
**Method:** Grep the target config file for expected content
**Examples:**
- "Update CLAUDE.md GWS" → `grep "gws.*v0.8" ~/.claude/CLAUDE.md`
- "Fix hook X" → `grep 'print("{}")' ~/.claude/hooks/{hook_file}`

### cortex-superseded
**Applies to:** All items sourced from Cortex memories
**Method:** Query `cortex_recall` for the item title. If a newer memory (created after source memory) marks the work as complete, RESOLVED.
**Evidence:** `"Superseded by mem_{id} ({date}): {summary}"`

### hook-check
**Applies to:** Items about hook fixes or hook errors
**Method:** Read the hook file, check for the expected fix pattern
**Examples:**
- PostToolUse hooks → check for `print("{}")` on all exit paths
- Exit code fixes → check for `sys.exit(0)` or `exit 0`

## Pattern Matching Rules

To determine which verification method to use for an item:

| Item Type | Primary Check | Secondary Check |
|-----------|--------------|----------------|
| spec-project | spec-check | git-check |
| handoff-next-step (spec reference) | spec-check | git-check |
| handoff-next-step (config task) | config-check | git-check |
| handoff-next-step (skill task) | skill-check | git-check |
| decision-pending (MCP) | mcp-check | config-check |
| decision-pending (hook) | hook-check | config-check |
| decision-pending (other) | cortex-superseded | git-check |
| brainstorm-active | spec-check + skill-check | cortex-superseded |
| conversation-intent | config-check or skill-check | git-check |

## Keyword Extraction

For git-check, extract search keywords from item titles:
1. Remove common words: "the", "a", "an", "and", "or", "for", "to", "in", "on", "with"
2. Remove action verbs: "build", "test", "fix", "update", "create", "add", "run"
3. Keep the most distinctive noun phrases (max 3 words)
4. Use as `--grep` pattern (case-insensitive)

**Examples:**
- "Archive devtools-extract & site-assets skills" → `devtools-extract` or `site-assets`
- "Darkhold MCP Registration" → `darkhold`
- "PostToolUse Hook Error Investigation" → `PostToolUse`
- "Living-docs: 8 specs unbuilt" → `living-docs`

## Confidence Levels

| Verification Result | Confidence | Action |
|--------------------|-----------|--------|
| File exists in specs/done/ | HIGH | Auto-resolve |
| MCP found in .claude.json | HIGH | Auto-resolve |
| Git commit references completion | MEDIUM | Auto-resolve |
| Newer Cortex memory supersedes | MEDIUM | Auto-resolve |
| Config grep matches expected | MEDIUM | Auto-resolve |
| No evidence either way | LOW | Keep as ACTIVE |
| Source memory is >30 days old with no activity | LOW | Mark as STALE |
