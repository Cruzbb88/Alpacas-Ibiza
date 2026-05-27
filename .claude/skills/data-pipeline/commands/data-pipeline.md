# Command: data-pipeline

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

Full ETL pipeline design orchestrating both layers based on mode.

## Execution Flow

```
Parse Arguments
     |
     v
L1: Analyze & Map (always runs)
  - Detect source format (CSV, JSON, Excel, XML, or description)
  - Analyze source fields: types, patterns, cardinality, nulls
  - Analyze target schema: required fields, types, constraints
  - cortex_recall past mappings for this target system
  - Generate field-level mapping table
  - Perform gap analysis (unmapped source, missing target, quality issues)
  - If --mode quick -> OUTPUT analysis + mapping table -> STOP
     |
     v
L2: Generate & Validate (deep mode, default)
  - Generate validation rules (per-field + cross-field)
  - Define error handling strategy (strict/log/quarantine)
  - Generate implementation (Python script, n8n workflow, or mapping doc)
  - Validate against sample data if available
  - cortex_remember pipeline design for reuse
  - OUTPUT full pipeline + implementation + validation results
```

## Argument Parsing

```
Input: $ARGUMENTS

Extract:
  source_input = first positional arg (file path or quoted description)
  --target     = target format (file path or description) (required)
  --output     = python | n8n | doc (default: python)
  --mode       = quick | deep (default: deep)
```

### Source Input Detection

If source_input looks like a file path (contains `/` or `\` or ends in `.csv`/`.json`/`.xlsx`/`.xml`/`.tsv`):
```
Read: {source_input}
```

If source_input is inline text (quoted or no file extension), use it directly as a description.

If no source input provided, ask the user what data source to analyze.

### Target Input Detection

Same logic as source: if `--target` looks like a file path, read it. Otherwise treat as description.

---

## Layer 1: Analyze & Map

### 1.1 Source Analysis

**For file-based sources**, use Bash/Python for ALL data analysis:

```bash
python3 -c "
import csv, json, sys
from collections import Counter

# Auto-detect and analyze
filepath = sys.argv[1]
if filepath.endswith('.csv') or filepath.endswith('.tsv'):
    delimiter = '\t' if filepath.endswith('.tsv') else ','
    with open(filepath, encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=delimiter)
        rows = list(reader)
    print(f'Format: CSV')
    print(f'Records: {len(rows)}')
    print(f'Fields: {len(rows[0].keys()) if rows else 0}')
    print()
    for col in rows[0].keys() if rows else []:
        values = [r[col] for r in rows if r.get(col)]
        nulls = sum(1 for r in rows if not r.get(col) or r[col].strip() == '')
        unique = len(set(v for v in values if v))
        samples = values[:5]
        print(f'Column: {col}')
        print(f'  Non-null: {len(values)}/{len(rows)} ({nulls} nulls, {nulls/len(rows)*100:.0f}%)')
        print(f'  Unique: {unique}')
        print(f'  Samples: {samples}')
        print()
elif filepath.endswith('.json'):
    with open(filepath, encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, list):
        print(f'Format: JSON Array')
        print(f'Records: {len(data)}')
        if data and isinstance(data[0], dict):
            print(f'Fields: {len(data[0].keys())}')
            for key in data[0].keys():
                values = [r.get(key) for r in data if r.get(key) is not None]
                print(f'Column: {key}')
                print(f'  Type: {type(data[0][key]).__name__}')
                print(f'  Samples: {[r.get(key) for r in data[:3]]}')
    elif isinstance(data, dict):
        print(f'Format: JSON Object')
        print(f'Top-level keys: {list(data.keys())}')
" "{source_file}"
```

**For description-based sources**, extract fields from the text and flag assumptions:
```markdown
### Source Schema (from description)
| Field | Type | Notes |
|-------|------|-------|
| {field} | {type} | [ASSUMED: inferred from description] |
```

### 1.2 Target Analysis

Same approach as source: read file or parse description.

Check cortex for prior mappings via CLI pre-fetch:
```bash
PRIOR_MAPPINGS=$(cortex recall "data-pipeline mapping {target_system}" --json --limit 5 2>/dev/null)
ETL_CONTEXT=$(cortex recall "etl {target_keywords}" --json --limit 5 2>/dev/null)
```

If previous mappings found, load them as a starting template and note what changed.

### 1.3 Generate Mapping Table

Read `references/common-transforms.md` for standard transformation patterns.

For each source field, determine the best mapping:

1. **Direct match**: Field names are identical or obviously equivalent (e.g., `email` -> `Email`)
2. **Type conversion**: Same semantics but different type (e.g., `"42"` string -> `42` integer)
3. **Format conversion**: Same data but different format (e.g., `DD/MM/YYYY` -> `YYYY-MM-DD`)
4. **Merge**: Multiple source fields -> one target (e.g., `first_name` + `last_name` -> `full_name`)
5. **Split**: One source field -> multiple targets (e.g., `full_name` -> `first_name` + `last_name`)
6. **Lookup**: Value mapping table (e.g., `"AU"` -> `"Australia"`)
7. **Computed**: Derived from formula (e.g., `total = qty * price`)
8. **Default**: No source data, use default value

Output the mapping table:

```markdown
### Column Mapping: {source} -> {target}

| # | Source Field | Source Type | Transform | Target Field | Target Type | Validation | Notes |
|---|-------------|------------|-----------|-------------|------------|------------|-------|
```

### 1.4 Gap Analysis

Report:

**Unmapped Source Fields** (source fields with no target equivalent):
| Field | Reason |
|-------|--------|
| {field} | {no equivalent / optional / deprecated / informational only} |

**Missing Target Fields** (required target fields with no source data):
| Field | Required? | Suggested Action |
|-------|-----------|-----------------|
| {field} | Yes/No | {provide default / manual input / derive from X / ask user} |

**Data Quality Warnings:**
- Fields with high null percentage (>20%)
- Inconsistent formats within a single column
- Values that look like they belong in a different column
- Encoding issues (mojibake, BOM, etc.)

**Quick mode stops here.** Output the full analysis and mapping table.

---

## Layer 2: Generate & Validate

### 2.1 Generate Validation Rules

For each target field, create validation rules:

**Per-field rules:**
| # | Field | Type Check | Format | Range | Required | Enum | Error Action |
|---|-------|-----------|--------|-------|----------|------|-------------|
| 1 | {field} | {type} | {regex/format} | {min-max} | {Y/N} | {values} | {reject/warn/skip} |

**Cross-field rules:**
```
- IF {field_a} = "{value}" THEN {field_b} is required
- {field_x} must be >= {field_y}
- {field_z} = {field_a} * {field_b} (tolerance: 0.01)
```

**Error handling strategy:**

Ask user preference or default to `log`:
- `strict`: Halt processing on first validation error. Use for financial/regulatory data.
- `log`: Log all errors, continue processing. Generate error report at end. Default for most use cases.
- `quarantine`: Separate failed rows into a separate error file for review. Best for large datasets.

### 2.2 Generate Implementation

Based on `--output` flag:

#### Python Script (`--output python`, default)

Generate a complete, runnable Python script saved to `scripts/etl_{source}_{target}.py`:

```python
#!/usr/bin/env python3
"""ETL Pipeline: {source} -> {target}
Generated by /data-pipeline on {date}

Source: {source_description}
Target: {target_description}
Fields mapped: {count}
Validation rules: {count}
Error strategy: {strategy}
"""

import csv
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(f"etl_{datetime.now():%Y%m%d_%H%M%S}.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ============================================================
# Configuration
# ============================================================

ERROR_STRATEGY = "log"  # strict | log | quarantine

# Field mapping: source_field -> (target_field, transform_func)
FIELD_MAP = {
    # Populated per pipeline
}

# Enum lookup tables
LOOKUPS = {
    # Populated per pipeline
}

# ============================================================
# Core Functions
# ============================================================

def read_source(filepath: str) -> list[dict]:
    """Read source file, auto-detect format."""
    path = Path(filepath)
    if path.suffix.lower() in ('.csv', '.tsv'):
        delimiter = '\t' if path.suffix.lower() == '.tsv' else ','
        with open(path, encoding='utf-8-sig') as f:
            return list(csv.DictReader(f, delimiter=delimiter))
    elif path.suffix.lower() == '.json':
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, list) else [data]
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")


def transform_row(row: dict, row_num: int) -> tuple[dict, list[str]]:
    """Apply mapping rules to a single row."""
    result = {}
    warnings = []
    # Per-field transformations populated per pipeline
    return result, warnings


def validate_row(row: dict, row_num: int) -> list[str]:
    """Validate a transformed row against all rules."""
    errors = []
    # Per-field and cross-field validations populated per pipeline
    return errors


def load_target(rows: list[dict], filepath: str):
    """Write transformed rows to target format."""
    path = Path(filepath)
    if path.suffix.lower() == '.csv':
        if not rows:
            logger.warning("No rows to write")
            return
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
    elif path.suffix.lower() == '.json':
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(rows, f, indent=2, default=str)
    logger.info(f"Wrote {len(rows)} rows to {filepath}")


def main(source_path: str, target_path: str, error_strategy: str = "log"):
    """Orchestrate ETL pipeline."""
    logger.info(f"Starting ETL: {source_path} -> {target_path}")
    logger.info(f"Error strategy: {error_strategy}")

    # Read
    rows = read_source(source_path)
    logger.info(f"Read {len(rows)} source rows")

    # Transform + Validate
    output_rows = []
    error_rows = []
    total_warnings = 0

    for i, row in enumerate(rows, 1):
        # Transform
        transformed, warnings = transform_row(row, i)
        total_warnings += len(warnings)
        for w in warnings:
            logger.warning(f"Row {i}: {w}")

        # Validate
        errors = validate_row(transformed, i)
        if errors:
            for e in errors:
                logger.error(f"Row {i}: {e}")
            if error_strategy == "strict":
                logger.critical(f"Halting at row {i} (strict mode)")
                sys.exit(1)
            elif error_strategy == "quarantine":
                error_rows.append({"row_num": i, "errors": errors, "data": transformed})
                continue
            # else: log and continue

        output_rows.append(transformed)

    # Load
    load_target(output_rows, target_path)

    # Write quarantine file if needed
    if error_rows:
        quarantine_path = f"errors_{datetime.now():%Y%m%d_%H%M%S}.json"
        with open(quarantine_path, 'w') as f:
            json.dump(error_rows, f, indent=2, default=str)
        logger.info(f"Quarantined {len(error_rows)} rows to {quarantine_path}")

    # Summary
    logger.info("=" * 60)
    logger.info(f"ETL Complete")
    logger.info(f"  Source rows:  {len(rows)}")
    logger.info(f"  Output rows:  {len(output_rows)}")
    logger.info(f"  Failed rows:  {len(error_rows)}")
    logger.info(f"  Warnings:     {total_warnings}")
    logger.info("=" * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ETL Pipeline")
    parser.add_argument("source", help="Source file path")
    parser.add_argument("target", help="Target file path")
    parser.add_argument("--strategy", default="log", choices=["strict", "log", "quarantine"])
    args = parser.parse_args()
    main(args.source, args.target, args.strategy)
```

Customize the template by filling in:
- `FIELD_MAP` with actual field mappings
- `LOOKUPS` with enum/lookup tables
- `transform_row()` with per-field transformation logic
- `validate_row()` with per-field and cross-field validation rules

#### n8n Workflow (`--output n8n`)

Generate n8n workflow JSON. Reference available n8n skills for patterns:
- `/n8n-workflow-architect` for overall workflow design
- `/n8n-code-python` for Function node code
- `/n8n-node-configuration` for node setup

Workflow structure:
```json
{
  "nodes": [
    {"type": "n8n-nodes-base.manualTrigger"},
    {"type": "n8n-nodes-base.readBinaryFiles"},
    {"type": "n8n-nodes-base.spreadsheetFile"},
    {"type": "n8n-nodes-base.code", "notes": "Transform + Validate"},
    {"type": "n8n-nodes-base.if", "notes": "Validation gate"},
    {"type": "n8n-nodes-base.spreadsheetFile", "notes": "Write output"},
    {"type": "n8n-nodes-base.spreadsheetFile", "notes": "Write errors"}
  ]
}
```

#### Mapping Document (`--output doc`)

Generate comprehensive markdown specification:
- Complete mapping table with all details
- Transformation pseudocode for each non-direct mapping
- Validation rules with test cases
- Edge cases and known issues
- Error handling strategy
- Suitable for developer handoff

Save to `docs/pipeline_{source}_{target}.md`

### 2.3 Validate Against Sample Data

If source data was provided as a file:

```bash
python3 -c "
# Validate first 10-20 rows against generated rules
# Report: tested, passed, failed, warnings
# Show sample failures: row number, field, expected, actual
"
```

Output validation results:
```markdown
### Validation Results (sample data)
- Tested: {N} rows
- Passed: {N} ({%}) rows
- Failed: {N} ({%}) rows
- Warnings: {N}

#### Sample Failures
| Row | Field | Rule | Expected | Actual |
|-----|-------|------|----------|--------|
| 3 | OrderDate | valid date | YYYY-MM-DD | "32/13/2024" |
| 7 | Quantity | > 0 | positive integer | "-5" |
```

### 2.4 Store Pipeline Design

Store via CLI (fire-and-forget):
```bash
cortex remember "ETL pipeline: {source} -> {target}. {field_count} mappings. Key transforms: {list}. {rule_count} validation rules. Output: {type}." --tags data-pipeline,etl,{source_system},{target_system} --importance 75 2>/dev/null
```

Check for related memories and link via CLI:
```bash
RELATED=$(cortex recall "pipeline {source_system}" --json --limit 3 2>/dev/null)
# If related pipeline found, link:
cortex link "$NEW_ID" "$RELATED_ID" 2>/dev/null
```

---

## Report Convention Compliance

### Before Generating the Report

1. Check for previous reports: `Glob reports/data-pipeline/dp-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison

### YAML Frontmatter

Every data-pipeline report MUST include this frontmatter block at the top:

```yaml
---
report_type: "data-pipeline"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{source} -> {target}"
project_tag: "{source-slug}-to-{target-slug}"
mode: "{quick|deep}"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---
```

`composite_score` is null for data-pipeline reports (mapping/ETL design, not scored).

### Delta Section (if previous report for same source->target exists)

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {new mapping or validation rule}

**RESOLVED** ({count} items):
- [RESOLVED] {previously flagged gap now mapped}

**MOVED** ({count} items):
- [MOVED] {field}: {previous_transform} -> {current_transform}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous_status} -> {current_status}
```

Omit categories with 0 items. First report = omit delta section entirely.

### Trend Section (3+ reports for same source->target)

```markdown
## Trend (last {N} reports)

| Report | Date | Fields Mapped | Gaps | Warnings |
|--------|------|---------------|------|----------|
| dp-{NNN} | {date} | {count} | {count} | {count} |

**Direction:** {first} -> {last} ({arrow}, {+/-N})
```

If fewer than 3 reports exist: `> Trend tracking available after 3+ reports ({N} exist).`

---

## Final Output Summary

```markdown
## Data Pipeline: {source} -> {target}

### Source Analysis
- Format: {format}
- Records: {count}
- Fields: {count}
- Quality issues: {count}

### Column Mapping
| # | Source Field | Source Type | Transform | Target Field | Target Type | Validation | Notes |
|---|-------------|------------|-----------|-------------|------------|------------|-------|

### Gap Analysis
- Unmapped source fields: {count}
- Missing target fields: {count}
- Data quality warnings: {count}

### Validation Rules
- Per-field rules: {count}
- Cross-field rules: {count}
- Error strategy: {strategy}

### Validation Results
- Tested: {N} rows | Passed: {N} | Failed: {N} | Warnings: {N}

### Implementation
- Type: {Python script | n8n workflow | Mapping document}
- File: {output_path}
- Error log: {log_path}

### Next Steps
1. Review the mapping table for accuracy
2. Fill in any [ASSUMED] or [NEEDED] items
3. Test with full dataset (not just sample)
4. Configure error strategy for production (strict/log/quarantine)
5. Set up scheduling if recurring pipeline
```
