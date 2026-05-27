# Gap Analysis Reference for Skill Enhancement

Use this checklist when running `/skill-creator enhance <name>` to identify what an existing skill is missing.

## Gap Categories

### 1. Frontmatter Completeness (Priority: HIGH)

| Field | Required | Check |
|-------|----------|-------|
| `name` | Yes | Present and matches skill directory name |
| `description` | Yes | Present, includes "Use when:" triggers |
| `argument-hint` | Yes | Present, properly quoted, lists all modes/args |
| `model` | No | Set if skill needs specific model (opus for complex) |
| `tools` | No | Lists MCP tools the skill uses |
| `license` | No | Present if distributable |

**Scoring:** -15 per missing required field. -5 per missing "Use when:" trigger.

### 2. Layered Architecture (Priority: HIGH)

| Check | Expected | Score Impact |
|-------|----------|-------------|
| Layer definitions (L1-L4) | At least L1+L2 for non-trivial skills | -25 if no layers |
| Layer independence | Each layer produces score 0-100 | -10 if layers are interdependent |
| Mode matrix table | Present with quick/default/deep | -15 if missing |
| Composite scoring formula | Weights sum to 1.0 | -10 if missing |
| Weight redistribution | Handles N/A layers gracefully | -5 if missing |

**When layers are NOT needed:** Single-purpose utilities (e.g., `/commit`, `/voice`, `/robocopy`). If the skill does exactly one thing with no analysis depth, skip this category.

### 3. Modes (Priority: HIGH)

| Check | Expected |
|-------|----------|
| `quick` mode defined | L1 only, fast execution |
| Default mode defined | L1+L2, standard depth |
| `deep` mode defined | All layers, sub-agents allowed |
| Mode gate instructions | Clear "skip if MODE = quick" gates |
| Argument-hint lists modes | All modes in the hint string |

**Scoring:** -20 if no modes defined. -5 per missing mode.

### 4. Numbered Reports (Priority: MEDIUM)

| Check | Expected |
|-------|----------|
| Report directory convention | `reports/{skill-name}/{prefix}-NNN-YYYY-MM-DD.md` |
| Report numbering logic | Glob existing, extract NNN, increment |
| YAML frontmatter in reports | Includes scores, mode, trend fields |
| Trend dashboard | Cross-run comparison table when 2+ reports exist |

**Scoring:** -15 if no report convention. -5 if no trend dashboard.

### 5. References Directory (Priority: MEDIUM)

| Check | Expected |
|-------|----------|
| `references/` directory exists | Contains domain knowledge, schemas, etc. |
| SKILL.md references files correctly | Links with clear "when to read" guidance |
| Files are discoverable | Mentioned in SKILL.md with grep patterns |

**Scoring:** -10 if references would benefit the skill but don't exist.

### 6. Scripts Directory (Priority: LOW)

| Check | Expected |
|-------|----------|
| `scripts/` directory exists | Contains executable Python/Bash |
| Scripts are tested | Can run standalone |
| SKILL.md references scripts | Clear invocation instructions |

**Scoring:** -5 if scripts would reduce token cost but don't exist.

### 7. Description Triggers (Priority: MEDIUM)

| Check | Expected |
|-------|----------|
| "Use when:" patterns | At least 3 trigger scenarios |
| Negative triggers | "Do NOT use when:" if applicable |
| Trigger keywords | Specific words/phrases that activate the skill |

**Scoring:** -10 if triggers are vague or missing.

## Overall Score Calculation

Start at 100, apply deductions:

| Score Range | Assessment |
|-------------|-----------|
| 90-100 | Excellent — minimal gaps |
| 70-89 | Good — some enhancements needed |
| 50-69 | Fair — significant gaps, enhancement recommended |
| 0-49 | Poor — major restructuring needed |

## Example Gap Reports

### Simple Command (typical score: 25-40)

```
Gap Analysis: /adw-analyze
Location: ~/.claude/commands/adw-analyze.md
Type: Command file (not a skill)

Gaps Found:
  [-25] No layered architecture (L1-L4)
  [-20] No modes (quick/default/deep)
  [-15] No argument-hint in frontmatter
  [-15] No numbered report convention
  [-10] No references directory
  [-5]  No scripts directory

Score: 10/100 — Major restructuring needed
Recommendation: Convert command → skill with full layered architecture
```

### Skill Without Layers (typical score: 50-70)

```
Gap Analysis: /deploy
Location: ~/.claude/skills/deploy/SKILL.md
Type: Skill (has SKILL.md)

Gaps Found:
  [-25] No layered architecture
  [-20] No modes
  [-10] No numbered reports
  [OK]  Has argument-hint
  [OK]  Has references/
  [OK]  Has description triggers

Score: 45/100 — Enhancement recommended
Recommendation: Add L1 (quick deploy check) + L2 (full deploy with validation)
```

## Command-to-Skill Migration Checklist

When upgrading a `~/.claude/commands/foo.md` to `~/.claude/skills/foo/SKILL.md`:

1. [ ] Create directory: `~/.claude/skills/foo/`
2. [ ] Create `SKILL.md` with YAML frontmatter (name, description, argument-hint)
3. [ ] Move command body content into SKILL.md body
4. [ ] Restructure content into layered architecture (if applicable)
5. [ ] Extract large reference sections into `references/` files
6. [ ] Create `scripts/` for any repeated code patterns
7. [ ] Add mode matrix and composite scoring (if applicable)
8. [ ] Add numbered report convention (if applicable)
9. [ ] Test: verify `/foo` triggers correctly from the new location
10. [ ] Remove old command file: `~/.claude/commands/foo.md`
11. [ ] Update any settings.json `customSlashCommands` entries
