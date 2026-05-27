# Probability Storm -- Duplicate Detection

Scan existing skills, commands, and Cortex memories for overlapping capabilities before committing to a build.

## Scanning Steps

### Step 1: Scan Existing Skills

Glob `~/.claude/skills/*/SKILL.md` to find all installed skills. For each:
- Read YAML frontmatter only (first `---` to second `---`)
- Extract `name` and `description` fields
- Store as `{name, description, path}`

### Step 2: Scan Existing Commands

Glob `~/.claude/commands/*.md` to find all commands. For each:
- Read the first 10 lines (header area)
- Extract the filename as command name (e.g., `pickup.md` -> `pickup`)
- Extract any description line (usually first non-frontmatter line)
- Store as `{name, description, path}`

### Step 3: Query Cortex for Past Builds

Use `cortex_list_memories` with `tags_filter: ["build", "completed"]` to find past build records. Extract skill/feature names and brief descriptions.

### Step 4: Fuzzy Match

Compare the decision text keywords against each skill/command:

1. Tokenize the decision text into keywords (lowercase, remove stop words)
2. Tokenize each skill/command name + description into keywords
3. Calculate overlap: `matching_keywords / total_decision_keywords`
4. Flag if overlap > 60%

### Step 5: Output

Format as a table of potential duplicates:

```
| Match | Overlap | Type | Path |
|-------|---------|------|------|
| brainstorm | 73% | skill | ~/.claude/skills/brainstorm/ |
| quick-plan | 45% | command | ~/.claude/commands/quick-plan.md |
```

Only include matches with overlap > 30%. Flag matches > 60% as "Existing capability detected".

## Stop Words

Ignore these common words when tokenizing:
a, an, the, is, are, was, were, be, been, being, have, has, had, do, does, did, will, would, could, should, may, might, can, shall, for, and, but, or, nor, not, so, yet, both, either, neither, each, every, all, any, few, more, most, other, some, such, no, only, own, same, than, too, very, just, about, above, after, again, also, because, before, between, during, from, into, of, on, out, over, then, there, through, to, under, until, up, with

## Confidence Notes

- Fuzzy matching is approximate -- false positives are acceptable (advisory only)
- A 45% match is worth mentioning but not alarming
- A 73% match strongly suggests the capability already exists
- Even 100% match is advisory -- the user may want a different approach to the same problem
