# Portfolio Comparator Reference

Reference file for L4 Portfolio Comparator — tool overlap analysis, usage tracking, and keep/merge/scrap recommendations.

## Item Resolution

Resolve each user-provided name to an actual file and description:

### Resolution Order

1. **Skills:** Glob `~/.claude/skills/{name}/SKILL.md` — read YAML frontmatter (name + description)
2. **Commands:** Glob `~/.claude/commands/{name}.md` — read first 10 lines (title + description)
3. **Project skills:** Glob `{cwd}/.claude/skills/{name}/SKILL.md`
4. **MCP servers:** Check `~/.claude/settings.json` and `{cwd}/.claude/settings.json` for `mcpServers.{name}`
5. **Abstract idea:** If not found in any of the above, treat the name as an abstract description. Create a synthetic entry with the name as both the name and description.

### Item Data Structure

For each resolved item, collect:

```
{
  "name": "tool-name",
  "type": "skill" | "command" | "mcp" | "abstract",
  "path": "/path/to/SKILL.md or command.md" (null for abstract/mcp),
  "description": "extracted description text",
  "capabilities": ["keyword1", "keyword2", ...],
  "file_count": N,
  "line_count": N,
  "last_modified": "YYYY-MM-DD",
  "external_deps": ["dep1", "dep2"],
  "usage_30d": N,
  "usage_all": N,
  "usage_trend": "increasing" | "stable" | "declining" | "unused"
}
```

## Overlap Analysis

Pairwise comparison of capabilities between items using Jaccard similarity.

### Capability Tokenization

1. Extract description text from each item
2. Lowercase all text
3. Split on whitespace and punctuation
4. Remove stop words (see list below)
5. Deduplicate tokens per item

**Stop words to remove:**
```
a, an, the, is, are, was, were, be, been, being, have, has, had, having,
do, does, did, doing, will, would, shall, should, may, might, must, can, could,
to, of, in, for, on, with, at, by, from, as, into, through, during, before,
after, above, below, between, out, off, over, under, again, further, then,
once, here, there, when, where, why, how, all, both, each, every, few, more,
most, other, some, such, no, nor, not, only, own, same, so, than, too, very,
and, but, or, if, while, about, against, because, until, that, this, these,
those, it, its, use, used, using, tool, skill, command, claude, code, when
```

### Jaccard Similarity Calculation

For each pair of items (A, B):

```
tokens_A = set of capability tokens for item A
tokens_B = set of capability tokens for item B
intersection = tokens_A AND tokens_B
union = tokens_A OR tokens_B
jaccard = |intersection| / |union|
overlap_pct = round(jaccard * 100)
```

### Overlap Matrix

Build an N x N matrix showing pairwise overlap percentages.

For 8+ items: Show only pairs with >30% overlap instead of full matrix.

### Consolidation Detection

If 3+ tools have >50% pairwise overlap with each other, flag as "consolidation candidates".

## Usage Frequency

Parse `~/.claude/stats/command-history.jsonl` for invocation counts.

### Parsing Logic

```
1. Read file line by line (each line is JSON)
2. Parse each line: { "cmd": "...", "args": "...", "project": "...", "ts": "..." }
3. For each item being compared:
   - Count entries where cmd matches the item name
   - Split into: last 30 days vs all-time
4. Calculate trend:
   - If 30d count > all_time_avg_per_30d * 1.5: "increasing"
   - If 30d count < all_time_avg_per_30d * 0.5: "declining"
   - If 30d count == 0 and all_time count == 0: "unused"
   - Otherwise: "stable"
```

If command-history.jsonl doesn't exist: all usage = "N/A", trend = "unknown".

### MCP and Abstract Items

- MCP servers: search for the server name in command history (unlikely to appear)
- Abstract ideas: usage = "N/A" (no command to track)

## Maintenance Cost Estimation

For each item with a file path:

### File Count

```
Glob {item_path_directory}/**/* to count all files in the skill/command directory
```

### Line Count

```
Sum line counts across all .md files in the directory
(proxy for complexity — more lines = more to maintain)
```

### Reference Count (Integration Depth)

```
Grep across all skills and commands for mentions of the item name:
- Grep pattern: item_name
- Path: ~/.claude/skills/ and ~/.claude/commands/
- Count unique files that reference this item
```

A high reference count means other tools depend on this one — scrapping it would be disruptive.

### External Dependencies

Check the item's files for mentions of:
- MCP servers (pattern: `mcp__`)
- API keys (pattern: `api.key`, `API_KEY`, `api-keys.json`)
- External services (pattern: `WebSearch`, `WebFetch`, `Bash.*curl`)
- Third-party tools (pattern: `npm`, `pip`, `uv run`)

Count distinct external dependencies.

### Staleness

Read file modification dates. If last modified > 30 days ago: "stale".

## Recommendation Engine

### Scoring Formula

For each item, calculate a keep-score (0-100):

```
keep_score = 0

# Usage (40% weight)
if usage_30d > 10: keep_score += 40
elif usage_30d > 3: keep_score += 30
elif usage_30d > 0: keep_score += 15
elif usage_all > 0: keep_score += 5
else: keep_score += 0  # never used

# Uniqueness (30% weight)
max_overlap_with_any = max pairwise overlap percentage with other items
if max_overlap_with_any < 20: keep_score += 30  # highly unique
elif max_overlap_with_any < 50: keep_score += 20
elif max_overlap_with_any < 70: keep_score += 10
else: keep_score += 0  # high overlap

# Integration depth (20% weight)
if reference_count > 5: keep_score += 20  # deeply integrated
elif reference_count > 2: keep_score += 15
elif reference_count > 0: keep_score += 10
else: keep_score += 0

# Maintenance cost (10% weight — penalty)
if line_count > 2000: keep_score += 0  # expensive to maintain
elif line_count > 500: keep_score += 5
else: keep_score += 10  # lightweight
```

### Recommendation Rules

| Keep Score | Max Overlap | Recommendation |
|-----------|-------------|----------------|
| >= 60 | any | **KEEP** |
| 40-59 | > 60% | **MERGE** into the higher-scored overlapping item |
| 40-59 | <= 60% | **KEEP (review)** — useful but could be improved |
| < 40 | > 60% | **SCRAP** — another tool covers this |
| < 40 | <= 60% | **SCRAP** — low usage, low uniqueness |

### Merge Target Selection

When recommending MERGE, identify the merge target:
- Find the item with highest overlap AND highest keep_score
- Recommend: "Merge {lower_scored} into {higher_scored}"

## Report Format

Comparison reports saved to: `reports/probability-storm/cmp-NNN-YYYY-MM-DD.md`

### YAML Frontmatter

```yaml
---
report_number: NNN
date: "YYYY-MM-DD"
mode: "compare"
items_compared: ["item-A", "item-B", "item-C"]
recommendation_summary: "Keep item-A, merge item-B into item-A, scrap item-C"
---
```

### Report Body Template

```markdown
# Portfolio Comparison Report #NNN

**Date:** YYYY-MM-DD
**Items Compared:** N

## Overlap Matrix

{N x N matrix or filtered pairs for 8+ items}

## Item Analysis

| Item | Type | Usage (30d) | Usage (All) | Files | Lines | Ext Deps | Refs | Keep Score |
|------|------|-------------|-------------|-------|-------|----------|------|------------|
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Unique Capabilities

### {item-A}
- {capability not found in other items}

### {item-B}
- {capability not found in other items}

## Recommendations

1. **{item-A}: {KEEP/MERGE/SCRAP}** -- {reasoning}
2. **{item-B}: {KEEP/MERGE/SCRAP}** -- {reasoning}
3. **{item-C}: {KEEP/MERGE/SCRAP}** -- {reasoning}

{If consolidation candidates detected:}
## Consolidation Opportunity

Items {X}, {Y}, {Z} share >50% overlap. Consider merging into a single tool.
```

## Terminal Output (Compare Mode)

```
PROBABILITY STORM -- Portfolio Comparison

Items Compared: N
Overlap Range:  {min}% - {max}%

| Item | Type | Usage | Keep Score | Verdict |
|------|------|-------|------------|---------|
| {name} | {type} | {30d count} | {score} | KEEP |
| {name} | {type} | {30d count} | {score} | MERGE -> {target} |
| {name} | {type} | {30d count} | {score} | SCRAP |

Report: reports/probability-storm/cmp-NNN-YYYY-MM-DD.md
```

## Deep Mode L4 Behavior

When L4 runs as part of `--deep` mode (not standalone `compare`):

1. Take the L2 strategy list (top strategies from Strategy Explorer)
2. For each strategy that references an existing tool: resolve to its SKILL.md/command
3. Run overlap analysis between the existing tools mentioned in strategies
4. If any strategies overlap significantly (>50%): note consolidation opportunity
5. Calculate L4 score = average keep_score of all resolved items (or 50 if no items resolved)
6. Add a brief "Portfolio Context" section to the deep mode report

This provides automatic "Do you already have something like this?" analysis in deep scans.
