---
name: data-pipeline
description: >-
  Design and validate ETL/data transformation pipelines from source to target schemas.
  Takes source and target format descriptions, generates field mappings, transformation
  rules, validation checks, and executable implementation (Python scripts or n8n workflows).
  2-layer architecture: L1 (Analyze & Map) parses schemas and generates mapping table,
  L2 (Generate & Validate) produces executable implementation with validation rules and
  error handling.
  Use when: (1) Mapping data between systems (Excel/CSV to ERP), (2) Designing ETL
  workflows for client data, (3) Validating data transformation rules, (4) Converting
  between file formats (CSV, JSON, XML, Excel), (5) Building Surity pilot pipelines.
argument-hint: <source-description-or-file> --target <target-description-or-file> [--output python|n8n|doc] [--mode quick|deep]
model: claude-opus-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - mcp__omni-cortex__cortex_recall

---

# Data Pipeline Designer

Design and validate ETL/data transformation pipelines from source to target schemas. Generates field mappings, transformation rules, validation checks, and executable implementation.

## Mode Matrix

| Mode | Arg | Layers | Output | Sub-agents |
|------|-----|--------|--------|------------|
| Quick | `quick` | L1 | Schema analysis + mapping table | No |
| Deep | `deep` or *(none)* | L1 + L2 | Full implementation + validation rules + error handling | No |

## Step 0: Parse Arguments

Parse `$ARGUMENTS` for:

1. **Source input**: File path OR natural language description of source data (required)
2. **--target**: Target format file path OR description (required)
3. **--output**: `python` (default), `n8n`, or `doc` (mapping document only)
4. **--mode**: `quick` (L1 only) or `deep` (default, L1+L2)

If source input is a file path, read the file. If inline text, use directly.
If --target is a file path, read the file. If inline text, use directly.

---

## Layer 1: Analyze & Map (Quick Mode)

L1 parses source and target schemas and generates a field-level mapping table.

### Step 1.1: Analyze Source

Read the source input. Determine analysis strategy:

**If a file path is provided:**
- Read the file and detect format (CSV, JSON, Excel, XML, etc.)
- For CSV/TSV: detect delimiter, read headers, infer types from first 10-20 rows
- For JSON: parse schema, identify nested structures, array vs object
- For Excel: read sheet names, column headers, detect merged cells and hidden columns
- For XML: parse element hierarchy and attributes

**If a natural language description:**
- Extract field names, types, and relationships from the description
- Flag assumptions as `[ASSUMED: ...]`

For each source field, extract:
- **Field name** and path (for nested structures)
- **Data type** (string, int, float, date, boolean, etc.)
- **Sample values** (3-5 non-null examples when file available)
- **Cardinality** (unique count vs total count)
- **Null percentage**
- **Pattern** (date format, email, phone, currency, ID format, etc.)

Use Bash/Python for all data analysis — row counts, type inference, pattern detection:

```bash
python3 -c "
import csv
with open('source.csv') as f:
    reader = csv.DictReader(f)
    rows = list(reader)
    print(f'Records: {len(rows)}')
    for col in rows[0].keys():
        vals = [r[col] for r in rows[:10] if r[col]]
        print(f'{col}: {vals[:3]}')
"
```

### Step 1.2: Analyze Target

Read the target format specification. Extract for each required field:
- **Field name** and path (for nested structures)
- **Expected data type**
- **Validation rules** (required, min/max, regex, enum values)
- **Constraints** (unique, foreign key, not null)
- **Default value** (if any)

Check cortex for previous mappings to this target format:
```
cortex_recall: "data-pipeline mapping {target_system}"
cortex_recall: "etl {target_keywords}"
```

If previous mappings found, use them as a starting template.

### Step 1.3: Generate Mapping Table

Create a field-level mapping table:

```markdown
### Column Mapping: {source} -> {target}

| # | Source Field | Source Type | Transform | Target Field | Target Type | Validation | Notes |
|---|-------------|------------|-----------|-------------|------------|------------|-------|
| 1 | order_id | str | direct | OrderNumber | str | required, unique | |
| 2 | qty | str | int() | Quantity | int | required, > 0 | |
| 3 | date | str | strptime(%d/%m/%Y) | OrderDate | date | required, ISO 8601 | |
| 4 | first, last | str | concat(" ") | FullName | str | required | merge 2 fields |
| 5 | -- | -- | default("NEW") | Status | str | required, enum | no source field |
```

Categorize each mapping:
- **Direct**: Field name matches or is obviously equivalent
- **Transform**: Type conversion, formatting, date parsing
- **Merge**: Multiple source fields combined
- **Split**: Single source field split into multiple targets
- **Lookup**: Value mapping via lookup table
- **Computed**: Formula combining fields
- **Default**: No source data, use default value
- **Unmapped source**: Source field with no target equivalent (document why)
- **Missing target**: Required target field with no source (flag for manual input)

Read `references/common-transforms.md` to apply standard transformation patterns.

### Step 1.4: Gap Analysis

Identify and report:

**Unmapped Source Fields:**
| Field | Reason |
|-------|--------|
| {field} | {no equivalent in target / optional / deprecated} |

**Missing Target Fields (action required):**
| Field | Required? | Suggested Action |
|-------|-----------|-----------------|
| {field} | Yes | {provide default / manual input / derive from X} |

**Data Quality Issues:**
- Null values in required source fields
- Inconsistent formats (mixed date formats, etc.)
- Potential encoding issues
- Values outside expected ranges

**If mode is `quick`**: Output the analysis and mapping table, then stop. Do NOT continue to L2.

---

## Layer 2: Generate & Validate (Deep Mode)

L2 generates executable implementation with validation rules and error handling.

### Step 2.1: Generate Validation Rules

For each target field, define validation as both human-readable rules AND executable checks:

**Human-Readable Rules Table:**

| # | Field | Rule | Error Action |
|---|-------|------|-------------|
| 1 | OrderNumber | required, unique, matches ^[A-Z]{2}\d{6}$ | reject row |
| 2 | Quantity | required, integer, 1-99999 | reject row |
| 3 | OrderDate | required, valid date, within last 365 days | log warning |
| 4 | Email | optional, valid email format | log warning |

**Cross-field Validations:**
- If Status = "SHIPPED" then ShipDate is required
- EndDate must be >= StartDate
- TotalPrice = Quantity * UnitPrice (tolerance: 0.01)

**Error Handling Strategy** (configurable):
| Strategy | Behavior | Use When |
|----------|----------|----------|
| `strict` | Halt on first error | Financial data, regulatory compliance |
| `log` | Log error, continue processing | Bulk imports, data migration |
| `quarantine` | Separate failed rows into error file | Large datasets, iterative cleanup |

Default: `log` (log and continue)

### Step 2.2: Generate Implementation

Based on `--output` flag:

#### Option A: Python Script (default)

Generate a standalone `.py` script with these functions:

```python
def read_source(filepath: str) -> list[dict]:
    """Read source file, auto-detect format (CSV, JSON, Excel)."""

def transform_row(row: dict, row_num: int) -> tuple[dict, list[str]]:
    """Apply mapping rules to a single row. Returns (transformed_row, warnings)."""

def validate_row(row: dict, row_num: int) -> list[str]:
    """Validate a transformed row. Returns list of error messages."""

def load_target(rows: list[dict], filepath: str, format: str):
    """Write transformed rows to target format."""

def main(source_path: str, target_path: str, error_strategy: str = "log"):
    """Orchestrate: read -> transform -> validate -> load with error logging."""
```

Script requirements:
- Uses pandas for data processing (CSV/Excel) or json module (JSON)
- Comprehensive logging with row numbers and field names
- Error summary at end: total rows, passed, failed, warnings
- Configurable error strategy via CLI argument
- Save to `scripts/etl_{source}_{target}.py`

#### Option B: n8n Workflow

Generate n8n workflow JSON with nodes for:
- Trigger node (manual or schedule)
- Read File / HTTP Request node for source data
- Set/Function nodes for field transformations
- IF nodes for validation branching
- Error handling workflow (separate branch for failed rows)
- Output node (file write, API call, or database insert)

Reference existing n8n skills (n8n-workflow-architect, n8n-code-python) for node configuration patterns if available.

#### Option C: Mapping Document

Generate a comprehensive markdown specification:
- Complete mapping table with all field details
- Transformation pseudocode for each non-direct mapping
- Validation checklist with test cases
- Edge cases and known issues
- Suitable for handoff to a developer for manual implementation

### Step 2.3: Validate Against Sample Data

If source data is available (file was provided), validate the pipeline:

```bash
python3 -c "
# Run validation on first 10-20 rows
# Report pass/fail per rule
# Show sample failures with row numbers
"
```

Report:
- **Tested**: {N} rows
- **Passed**: {N} rows
- **Failed**: {N} rows
- **Warnings**: {N}
- **Sample failures**: (first 5 with row number, field, expected, actual)

### Step 2.4: Store Pipeline Design

Store via CLI (fire-and-forget):
```bash
cortex remember "ETL pipeline: {source_desc} -> {target_desc}. {field_count} field mappings. Key transforms: {transform_summary}. Validation: {rule_count} rules. Output: {output_type}." --tags data-pipeline,etl,{source_system},{target_system} 2>/dev/null
```

Check for related memories and link via CLI:
```bash
RELATED=$(cortex recall "pipeline {source_system}" --json --limit 3 2>/dev/null)
# If related, link:
cortex link "$NEW_ID" "$RELATED_ID" 2>/dev/null
```

---

## Output Format

```markdown
## Data Pipeline: {source} -> {target}

### Source Analysis
- Format: {detected format}
- Records: {count or "N/A — description only"}
- Fields: {count}
- Quality issues: {count or "none detected"}

### Column Mapping
| # | Source Field | Source Type | Transform | Target Field | Target Type | Validation | Notes |
|---|-------------|------------|-----------|-------------|------------|------------|-------|
| 1 | {field} | {type} | {transform} | {field} | {type} | {rules} | {notes} |

### Unmapped Source Fields
- {field}: {reason not mapped}

### Missing Target Fields (need manual input or defaults)
- {field}: {description of what's needed}

### Validation Rules
1. {rule description}
2. {rule description}

### Validation Results (sample data)
- Tested: {N} rows
- Passed: {N} rows
- Failed: {N} rows ({failure summary})

### Implementation
- Type: {Python script | n8n workflow | Mapping document}
- File: {output_path}

### Error Handling
- Strategy: {strict | log | quarantine}
- Error log: {path}
```

## Example Usage

```
/data-pipeline orders.csv --target SAP_OrderImport
/data-pipeline students.xlsx --target Airtable --output python
/data-pipeline "JSON API response with user profiles" --target "PostgreSQL users table" --mode quick
/data-pipeline bunnings_orders.csv --target erp_upload_format.json --output python
```

## Safety Rules

1. **All data analysis via Bash/Python.** Row counts, type inference, pattern detection, and calculations must never be LLM-computed.
2. **Never execute the generated pipeline.** The skill designs and generates the pipeline code — it does NOT run the ETL process.
3. **Flag assumptions explicitly.** If inferring from descriptions instead of actual data, mark as `[ASSUMED: ...]`.
4. **Handle encoding carefully.** Detect and document file encoding. Default to UTF-8 but check for BOM, Latin-1, and locale-specific encodings.
5. **Date format ambiguity.** When date formats are ambiguous (01/02/2024 — is it Jan 2 or Feb 1?), ask the user or detect from context. Never silently assume.
6. **Graceful degradation.** If n8n skills are unavailable for `--output n8n`, fall back to generating the JSON structure manually with a note.
