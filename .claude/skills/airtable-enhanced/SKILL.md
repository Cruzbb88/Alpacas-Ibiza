---
name: airtable-enhanced
description: |
  Enhanced Airtable operations that wrap the Airtable MCP with additional capabilities.
  Use when: (1) Updating single select field options/choices, (2) Bulk operations exceeding
  10 record limit, (3) Data needs sanitization (strip quotes, normalize casing),
  (4) Pre-validating records before upsert, (5) Auto-syncing select options from external
  sources, (6) Error recovery with retry logic for failed items, (7) Any Airtable operation
  that fails due to missing select options or data format issues. Use this when standard
  Airtable MCP calls fail or you need bulk/batch Airtable operations.
argument-hint: "<operation description or base/table target>"
---

# Airtable Enhanced

Extends the Airtable MCP with validation, sanitization, batch operations, and field option management.

## Quick Reference

| Operation | Use |
|-----------|-----|
| Update select options | `scripts/airtable_field_options.py` |
| Batch create/update | `scripts/batch_operations.py` |
| Sanitize data | `scripts/data_sanitizer.py` |
| Validate before insert | `scripts/validator.py` |

## Workflow: Fix Missing Select Options

When Airtable returns `INVALID_MULTIPLE_CHOICE_OPTIONS` error:

1. Extract the missing option from error message
2. Run `airtable_field_options.py` to add the option
3. Retry the operation

```bash
python scripts/airtable_field_options.py \
  --base-id "appXXX" \
  --table-id "tblXXX" \
  --field-id "fldXXX" \
  --add-options "Option1,Option2,Option3"
```

## Workflow: Bulk Upsert with Validation

For large datasets that need validation and batching:

1. Sanitize data with `data_sanitizer.py`
2. Validate against schema with `validator.py`
3. Batch upsert with `batch_operations.py`

## Workflow: Sync Select Options from Source

To sync all possible values from an external source (e.g., API) to Airtable:

1. Collect all unique values from source
2. Get current field options from Airtable schema
3. Identify missing options
4. Add missing options with `airtable_field_options.py`

## Data Sanitization Rules

The `data_sanitizer.py` script applies these fixes:

| Issue | Before | After |
|-------|--------|-------|
| Extra quotes | `"\"iFrame\""` | `iFrame` |
| Double quotes | `""Value""` | `Value` |
| Whitespace | `" Value "` | `Value` |
| Empty to null | `""` | `null` |

## Error Recovery

The `batch_operations.py` script handles failures:

1. Attempts batch of 10 records
2. On failure, identifies failed item index
3. Retries failed items individually
4. Reports successes and failures separately

## API Reference

See [references/airtable_api.md](references/airtable_api.md) for direct Airtable API patterns.

See [references/common_errors.md](references/common_errors.md) for error patterns and solutions.
