# Pain Heuristics Reference

Detection patterns, normalization rules, and false positive filtering for L1 Pain Mapping.

---

## Dimension 1: Bug Density Patterns

### Universal Pain Markers

```bash
# Primary markers (all languages)
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|XXX\|TEMPORARY\|KLUDGE\|BRITTLE\|UGLY\|SMELL" \
  --include="*.{ts,tsx,js,jsx,py,go,rs,java,rb,cs}" .
```

### Language-Specific Patterns

**JavaScript / TypeScript:**
```bash
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|XXX\|TEMPORARY\|@ts-ignore\|@ts-expect-error\|@ts-nocheck\|eslint-disable\|any as\|as any" \
  --include="*.{ts,tsx,js,jsx}" .
```

**Python:**
```bash
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|XXX\|TEMPORARY\|noqa\|type: ignore\|pragma: no cover\|nosec" \
  --include="*.py" .
```

**Go:**
```bash
grep -rn "TODO\|FIXME\|HACK\|WORKAROUND\|XXX\|TEMPORARY\|nolint" \
  --include="*.go" .
```

### False Positive Filtering

Exclude from bug density counts:
- **Test files**: `*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*` -- TODOs in tests may be intentional test plans
- **Generated files**: Files with `// Code generated` or `# AUTO-GENERATED` headers
- **Vendor/dependencies**: `node_modules/`, `vendor/`, `.venv/`, `venv/`
- **Documentation TODOs**: Lines that are clearly documentation tasks, not code quality markers

**Heuristic**: If a TODO is followed by a GitHub issue number (e.g., `TODO(#123)`), it is a tracked item and should count at 50% weight (it is acknowledged but not fixed).

### Normalization

```
file_bug_score = (marker_count / max_marker_count_in_project) * 100
```

If no files have markers, all scores = 0 (this is good).

---

## Dimension 2: Churn Rate Patterns

### Git Commands

```bash
# Commits per file, last 6 months
git log --since="6 months ago" --format=format: --name-only | \
  grep -v '^$' | sort | uniq -c | sort -rn | head -50

# Commits per file, all time (if project is < 1 year old)
git log --format=format: --name-only | \
  grep -v '^$' | sort | uniq -c | sort -rn | head -50

# Churn with line changes (more detailed)
git log --since="6 months ago" --numstat --format=format: | \
  awk 'NF==3 {adds[$3]+=$1; dels[$3]+=$2} END {for(f in adds) print adds[f]+dels[f], adds[f], dels[f], f}' | \
  sort -rn | head -30
```

### Churn Interpretation

- **High commits + high line changes** = Actively problematic (pain score: high)
- **High commits + low line changes** = Frequently touched but stable per change (pain score: medium)
- **Low commits + high line changes** = Rare big rewrites (pain score: medium-low)
- **Low everything** = Stable code (pain score: low)

### Non-Git Fallback

When git is unavailable:
- Skip the churn dimension entirely
- Redistribute its 25% weight equally to the remaining 4 dimensions
- Each remaining dimension gets +6.25% (becoming 31.25%, 26.25%, 21.25%, 21.25%)
- Note in output: "Churn rate dimension skipped (no git history available)"

### Normalization

```
file_churn_score = (file_commit_count / max_commit_count) * 100
```

---

## Dimension 3: Complexity Metrics

### Nesting Depth

**JavaScript / TypeScript:**
```bash
# Count nesting indicators per file
grep -c "if\s*(\|for\s*(\|while\s*(\|switch\s*(\|try\s*{" file.ts
# Rough nesting depth via indentation (assumes 2-space indent)
awk '{match($0, /^[ ]*/); depth=RLENGTH/2; if(depth>max) max=depth} END{print max}' file.ts
```

**Python:**
```bash
# Nesting depth via indentation (4-space indent standard)
awk '{match($0, /^[ ]*/); depth=RLENGTH/4; if(depth>max) max=depth} END{print max}' file.py
```

Scoring:
- Max depth <= 3: 0 points
- Max depth 4-5: 30 points
- Max depth 6-7: 60 points
- Max depth >= 8: 100 points

### Long Functions

Heuristic: Count blank-line-separated blocks that exceed 50 lines.

```bash
# Rough function length (lines between function declarations)
grep -n "function \|def \|func \|fn \|public \|private \|protected " file.ts | \
  awk -F: '{if(prev) print $1-prev, prevline; prev=$1; prevline=$0} END{print "EOF", prevline}'
```

Scoring:
- 0 functions > 50 lines: 0 points
- 1-2 functions > 50 lines: 40 points
- 3-5 functions > 50 lines: 70 points
- 6+ functions > 50 lines: 100 points

### High Parameter Counts

```bash
# Find functions with many parameters
grep -n "function.*,.*,.*,.*,.*," file.ts  # 5+ commas = 6+ params
```

### File Length

- < 200 lines: 0 points
- 200-500 lines: 20 points
- 500-1000 lines: 50 points
- 1000+ lines: 80 points

### Composite Complexity

```
complexity = (nesting_depth * 0.35) + (long_functions * 0.30) + (param_counts * 0.15) + (file_length * 0.20)
```

### Normalization

```
file_complexity_score = (file_complexity / max_complexity_in_project) * 100
```

---

## Dimension 4: Workaround Patterns

### JavaScript / TypeScript

```bash
# Null/undefined defensive checks
grep -c "!= null\|!== null\|!= undefined\|!== undefined\|??\s\|\?\.\|as any\|as unknown" file.ts

# Try/catch density
grep -c "try\s*{" file.ts

# Type assertions (working around type system)
grep -c "as \w\|<\w.*>" file.ts

# Re-exports and adapter patterns
grep -c "export.*from\|module\.exports.*require" file.ts
```

### Python

```bash
# Defensive checks
grep -c "is not None\|is None\|!= None\|== None\|getattr.*default\|hasattr" file.py

# Try/except density
grep -c "try:" file.py

# Type: ignore comments
grep -c "type: ignore\|noqa\|pragma: no cover" file.py

# Monkey patching
grep -c "setattr\|__dict__\|__class__" file.py
```

### Scoring

Workaround score per file:
```
workaround_density = total_workaround_markers / file_line_count
```

Normalize across all files: highest density = 100.

### False Positive Filtering

- **Legitimate null checks**: In data validation layers, null checks are correct practice, not workarounds. If the file is clearly a validator/sanitizer, reduce its workaround score by 50%.
- **Error handling**: Files that are explicitly error handlers (e.g., `errorHandler.ts`, `exceptions.py`) should have try/catch -- reduce their score by 50%.
- **Type assertion in tests**: Test files often use `as` for mocking -- exclude test files.

---

## Dimension 5: Coupling Density

### Import Counting

**JavaScript / TypeScript:**
```bash
# Fan-out: imports this file makes
grep -c "^import\|require(" file.ts

# Fan-in: files that import this file
basename=$(basename file.ts .ts)
grep -rn "import.*${basename}\|require.*${basename}" --include="*.{ts,tsx,js,jsx}" . | wc -l
```

**Python:**
```bash
# Fan-out
grep -c "^import\|^from.*import" file.py

# Fan-in
module=$(basename file.py .py)
grep -rn "import.*${module}\|from.*${module}" --include="*.py" . | wc -l
```

### Coupling Score

```
coupling = (fan_in * 0.6) + (fan_out * 0.4)
```

Fan-in is weighted higher because files that many others depend on are harder to change safely.

### Normalization

```
file_coupling_score = (file_coupling / max_coupling_in_project) * 100
```

---

## Large Repo Handling

For projects with > 500 source files:

1. **Phase 1: Directory-level scan** -- Aggregate pain markers at the directory level first
2. **Phase 2: Drill into hot directories** -- Only analyze individual files in the top 5 most painful directories
3. **Phase 3: Sample the rest** -- Randomly sample 10% of files from remaining directories to check for hidden hotspots

This keeps analysis practical while still finding pain clusters.

Document the approach in the report: "Large repo mode: analyzed {N} files in {M} hot directories + {K} sampled files from {J} other directories."

---

## Combined Pain Score Formula

```
pain_score = (bug_density * W_bug) + (churn * W_churn) + (complexity * W_complex) + (workarounds * W_work) + (coupling * W_couple)

Standard weights:
  W_bug     = 0.25
  W_churn   = 0.25
  W_complex = 0.20
  W_work    = 0.15
  W_couple  = 0.15

If a dimension is skipped, redistribute its weight equally among remaining dimensions.
```

All dimension scores are 0-100. Composite pain score is 0-100.
