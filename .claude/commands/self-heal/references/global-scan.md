# Global Infrastructure Scan Reference

The global scan examines `~/.claude/` infrastructure for common issues that cause cascading failures. This is invoked via `--global` or `--combined` scope flags.

## Check Definitions

Each check runs as part of Layer 1 when scope is `global` or `combined`.

### 1. Hook JSON Format

| Field | Value |
|-------|-------|
| **Name** | hook-json-format |
| **Description** | Verify all Python hook scripts produce valid JSON to stdout |
| **Patterns** | `~/.claude/hooks/*.py` (excluding `damage-control/` subdirectory) |
| **Failure** | Hook file does not contain `print("{}")` or `json.dumps` or `json.dump` call |
| **Zone** | GRAY |
| **Fix Template** | Add `print("{}")` before exit, or wrap output in `json.dumps()` |

**Why it matters:** Hooks that don't print JSON cause "hook error" messages and can block tool execution.

### 2. Hook Response Schema

| Field | Value |
|-------|-------|
| **Name** | hook-response-schema |
| **Description** | Verify hooks return the correct response format for their event type |
| **Patterns** | Cross-reference `~/.claude/settings.json` → `hooks` section against hook files |
| **Failure** | UserPromptSubmit hook returning `{"decision":"allow"}` instead of `{}`, or PreToolUse hook missing `decision` key |
| **Zone** | GRAY |
| **Fix Template** | Replace response with correct format for the event type |

**Schema by event type:**
- `UserPromptSubmit` → `{}`
- `PreToolUse` → `{"decision": "allow"|"block"|"skip"}`
- `PostToolUse` → `{}` (or `{"systemMessage":...}`)
- `Stop` / `SubagentStop` → `{}`

### 3. MCP Registration

| Field | Value |
|-------|-------|
| **Name** | mcp-registration |
| **Description** | Compare MCP backup against live registration |
| **Patterns** | `~/.claude/mcp-backup.json` vs `~/.claude.json` (top-level `mcpServers`) |
| **Failure** | MCP server in backup but missing from `.claude.json` |
| **Zone** | DANGER |
| **Fix Template** | Recommend running `node ~/.claude/restore-mcps.js` and restarting |

**Why it matters:** Claude Code re-auth wipes `.claude.json`, dropping local MCP registrations. The mcp-guard hook catches this on first prompt, but a global scan should verify proactively.

### 4. Settings Structure

| Field | Value |
|-------|-------|
| **Name** | settings-structure |
| **Description** | Validate JSON integrity of settings files |
| **Patterns** | `~/.claude/settings.json`, `~/.claude/settings.local.json` |
| **Failure** | JSON parse error, or missing expected top-level keys |
| **Zone** | DANGER |
| **Fix Template** | Recommend manual repair with backup reference |

**Expected keys (settings.json):** `permissions`, `hooks` (optional), `customSlashCommands` (optional)
**Expected keys (settings.local.json):** Any valid JSON object

### 5. Symlink/Junction Health

| Field | Value |
|-------|-------|
| **Name** | symlink-health |
| **Description** | Check that junctions/symlinks in skills/ and commands/ point to valid targets |
| **Patterns** | `~/.claude/skills/*/`, `~/.claude/commands/*/` (directories only) |
| **Failure** | Junction/symlink where target directory does not exist |
| **Zone** | SAFE |
| **Fix Template** | Remove broken junction, or note the missing target path |

**Windows note:** Use `os.path.islink()` or check for reparse points. Git Bash may report junctions differently than Python.

### 6. Orphaned Backup Detection

| Field | Value |
|-------|-------|
| **Name** | orphaned-backups |
| **Description** | Find old backup directories that can be cleaned up |
| **Patterns** | `~/.claude/*-backup-*` (directories matching backup naming convention) |
| **Failure** | Backup directory older than 30 days |
| **Zone** | SAFE |
| **Fix Template** | Delete or archive the backup directory |

### 7. Skill Frontmatter Validation

| Field | Value |
|-------|-------|
| **Name** | skill-frontmatter |
| **Description** | Verify SKILL.md files have required YAML frontmatter |
| **Patterns** | `~/.claude/skills/*/SKILL.md` |
| **Failure** | Missing `---` delimiters, or missing required fields: `name`, `description`, `argument-hint` |
| **Zone** | SAFE |
| **Fix Template** | Add missing frontmatter fields with sensible defaults |

### 8. Command Syntax Validation

| Field | Value |
|-------|-------|
| **Name** | command-syntax |
| **Description** | Verify command .md files start with valid structure |
| **Patterns** | `~/.claude/commands/*.md`, `~/.claude/commands/*/*.md` (skip SKILL.md, skip directories) |
| **Failure** | File does not start with `#` header or `---` YAML frontmatter |
| **Zone** | SAFE |
| **Fix Template** | Add missing header based on filename |

## Bridge Consistency Check

### 9. Zone-Map / Damage-Control Alignment

| Field | Value |
|-------|-------|
| **Name** | zone-dc-bridge |
| **Description** | Compare zone-map.yaml danger paths against damage-control patterns.yaml protections |
| **Patterns** | `~/.claude/commands/self-heal/zone-map.yaml` vs `~/.claude/hooks/damage-control/patterns.yaml` |
| **Failure** | Danger-zone path with no damage-control protection, or zeroAccessPath not in danger zone |
| **Zone** | DANGER (recommendations only) |
| **Fix Template** | Recommend adding missing paths to the appropriate classification |

**Comparison logic:**
1. Parse zone-map.yaml `danger` list (normalized paths)
2. Parse patterns.yaml `zeroAccessPaths` + `noDeletePaths` (normalized paths)
3. Flag gaps:
   - Danger-zone path not in any DC category → "GAP: no DC protection"
   - zeroAccessPath not in danger zone → "Note: DC stricter than zone-map" (informational, not a gap)
   - noDeletePath not in gray/danger zone → "Note: DC protects deletion but zone allows modification"
4. Generate alignment table

**Path normalization for comparison:**
- Expand `~` to home directory
- Convert backslashes to forward slashes
- Normalize glob patterns: `**` in one system may be `*/` or specific paths in the other
- Compare at pattern level (exact match) and at semantic level (does the set of matched files overlap?)

## Selective Strict Mode

If the global scan detects `securityMode: permissive` in patterns.yaml AND the zone-map has danger-zone paths, generate a DANGER-zone recommendation to consider switching to selective strict mode. This is always a recommendation, never auto-applied.

## Report Integration

Global scan results appear in the report as:

```markdown
### Global Infrastructure Health
| Check | Status | Details | Zone |
|-------|--------|---------|------|
| Hook JSON Format | PASS/FAIL | N/M hooks valid | GRAY |
| Hook Response Schema | PASS/FAIL | N issues found | GRAY |
| MCP Registration | PASS/FAIL | N missing servers | DANGER |
| Settings Structure | PASS/FAIL | JSON valid/invalid | DANGER |
| Symlink Health | PASS/FAIL | N broken junctions | SAFE |
| Orphaned Backups | PASS/FAIL | N old backups | SAFE |
| Skill Frontmatter | PASS/FAIL | N/M valid | SAFE |
| Command Syntax | PASS/FAIL | N/M valid | SAFE |
| Zone/DC Bridge | PASS/FAIL | N alignment gaps | DANGER |
```

For combined scope, the report has both "Project Analysis" and "Global Infrastructure" sections with a merged fix summary.
