# Zone Engine Reference

The zone engine classifies every potential self-heal fix into one of three safety tiers before execution. This prevents automated changes to critical configuration files while still allowing safe fixes to apply without friction.

## Zones

| Zone | Level | Behavior | Label |
|------|-------|----------|-------|
| SAFE | 0 | Auto-apply without prompting | [AUTO-FIXED] |
| GRAY | 1 | Present draft with before/after, require approval | [APPROVED] or [DEFERRED] |
| DANGER | 2 | Recommendation only, never modify the file | [DANGER-ZONE] |

## Zone Inheritance

When a fix targets multiple files, the batch inherits the **highest** zone:

- `[SAFE, SAFE]` = SAFE
- `[SAFE, GRAY]` = GRAY
- `[SAFE, DANGER]` = DANGER

This is controlled by `overrides.multi_file_inheritance: true` in `zone-map.yaml`. Set to `false` to classify each file independently (not recommended).

## Zone Map File

Location: `~/.claude/commands/self-heal/zone-map.yaml`

The zone map uses glob-style patterns organized by zone. Patterns are checked in this order: **danger first, then gray, then safe**. First match wins. If no pattern matches, the path defaults to **GRAY** (conservative).

### Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `*` | Any characters within a single path segment |
| `**` | Any number of path segments (recursive) |
| `~` | Expands to home directory at runtime |

All paths are normalized to forward slashes before matching, regardless of OS.

### Default Classifications

**Safe zone** (auto-apply):
- Skill command files (`~/.claude/skills/*/commands/*.md`)
- Skill reference files (`~/.claude/skills/*/references/*`)
- Command markdown files (`~/.claude/commands/**/*.md`)
- MEMORY.md files (any location)
- Report files (`**/reports/**`)
- Tool failure logs (`.omni-cortex/tool_failures*.jsonl`)
- SKILL.md files (minor edits only — see SKILL.md threshold below)
- Cortex database files

**Gray zone** (approval required):
- Owned MCP source code (`D:/Projects/omni-cortex/**`, etc.)
- Hook scripts (`~/.claude/hooks/**`)

**Danger zone** (recommendation only):
- Settings files (`~/.claude/settings.json`, `~/.claude/settings.local.json`)
- MCP registration (`.claude.json`)
- Plugin files (`~/.claude/plugins/**`)
- Root scripts (`~/.claude/*.js`, `~/.claude/*.py`)

## SKILL.md Threshold

SKILL.md files get special handling controlled by `overrides.skill_md_threshold`:

| Value | Behavior |
|-------|----------|
| `"structural"` (default) | Minor edits (frontmatter, typos, single-line fixes) = SAFE. Structural changes (add/remove sections, change layers, >10 lines) = GRAY |
| `"any"` | All SKILL.md edits are GRAY |
| `"none"` | All SKILL.md edits are SAFE |

## Customizing the Zone Map

Edit `zone-map.yaml` directly. Changes take effect on the next `/self-heal` run (no restart needed).

### Adding a new safe path

```yaml
safe:
  - "~/my-project/docs/**"    # Add your path
```

### Promoting a path to danger zone

```yaml
danger:
  - "~/.claude/hooks/critical-hook.py"   # Specific file
```

### Order matters

Patterns are checked **danger > gray > safe**. Within each zone, first match wins. Place more specific patterns before broader ones.

## Mode Interactions

| Mode | Safe Fixes | Gray Fixes | Danger Fixes |
|------|-----------|------------|-------------|
| `quick` | Auto-apply | Log only (no prompt) | Log only |
| `deep` | Auto-apply | Prompt with draft | Recommendation in report |
| `report-only` | Classify only | Classify only | Classify only |
| `quick-embed` | N/A (no zone logic) | N/A | N/A |

## Sub-Agent Zone Enforcement

Sub-agents spawned in deep mode (Layers 2-4) receive zone context in their prompts:

- Danger-zone path list injected into each sub-agent prompt
- Sub-agents instructed to classify their findings by zone
- Main agent validates all sub-agent zone classifications in Step 3d
- Misclassifications are overridden: danger-zone suggestions downgraded to recommend-only
- Classification overrides logged in the report

This prevents sub-agents from bypassing zone restrictions even if their analysis produces incorrect classifications.

## Report Integration

The self-heal report includes zone information in:

1. **Fix Summary by Zone** table — counts per zone with actions taken
2. **Layer 1 findings** — Zone column showing classification per pattern
3. **Global Infrastructure Health** table — zone per check (when scope is global/combined)
4. **Zone/DC Bridge alignment** table — zone-map vs damage-control comparison
5. **MCP Intelligence Summary** — consolidation recommendations zone-classified (when --mcp-audit or global/combined scope)
6. **YAML frontmatter** — `safe_fixes_applied`, `gray_fixes_approved`, `gray_fixes_deferred`, `danger_recommendations`, `global_checks_passed/failed/total`, `scope`, `mcp_audit`, `mcp_score` fields
