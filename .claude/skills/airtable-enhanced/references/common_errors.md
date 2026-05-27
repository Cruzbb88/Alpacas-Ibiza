# Common Airtable Errors and Solutions

## INVALID_MULTIPLE_CHOICE_OPTIONS

**Error:**
```
422 - {"error":{"type":"INVALID_MULTIPLE_CHOICE_OPTIONS","message":"Insufficient permissions to create new select option \"Value\""}}
```

**Cause:** Trying to insert a value that doesn't exist in a single/multiple select field's options.

**Solutions:**

1. **Add the missing option first:**
   ```bash
   python scripts/airtable_field_options.py \
     --base-id "appXXX" --table-id "tblXXX" --field-id "fldXXX" \
     --add-options "MissingValue"
   ```

2. **Pre-validate records:**
   ```bash
   python scripts/validator.py \
     --base-id "appXXX" --table-id "tblXXX" \
     --input records.json --missing-options-json missing.json
   ```

3. **Check for data issues:**
   - Extra quotes: `"\"Value\""` should be `Value`
   - Case mismatch: `iframe` vs `iFrame`
   - Whitespace: `" Value "` should be `Value`

## Data Sanitization Issues

### Extra Quotes

**Symptom:** Error mentions `""Value""` or `\"Value\"`

**Fix:**
```bash
python scripts/data_sanitizer.py --input data.json --output clean.json
```

### Case Mismatch

**Symptom:** Option exists as `iFrame` but data has `iframe`

**Fix:** Either normalize the data or add the variant as an option.

## Rate Limiting (429)

**Error:** Too many requests

**Solution:** The batch_operations.py script includes automatic rate limiting. For manual operations, add 200ms delay between requests.

## Invalid Record ID

**Error:** Record not found or invalid ID format

**Cause:** Record IDs must start with `rec` prefix (e.g., `recABC123`)

**Solution:** Verify record IDs are valid Airtable record IDs, not external system IDs.

## Permission Errors (403)

**Causes:**
- Token lacks required scopes
- Token doesn't have access to the base
- Trying to modify a read-only field

**Required Scopes:**
- `data.records:read` - Read records
- `data.records:write` - Create/update records
- `schema.bases:read` - Read schema
- `schema.bases:write` - Modify field options

## Workflow: Fix Select Option Errors

1. **Identify missing options from error:**
   ```
   "Insufficient permissions to create new select option \"iFrame\""
   ```

2. **Sanitize the data first:**
   ```bash
   python scripts/data_sanitizer.py --input data.json --output clean.json
   ```

3. **Validate and get missing options:**
   ```bash
   python scripts/validator.py --base-id appXXX --table-id tblXXX \
     --input clean.json --missing-options-json missing.json -v
   ```

4. **Add missing options:**
   ```bash
   python scripts/airtable_field_options.py --base-id appXXX \
     --table-id tblXXX --field-id fldXXX --sync-from-json missing.json
   ```

5. **Retry the batch operation:**
   ```bash
   python scripts/batch_operations.py upsert --base-id appXXX \
     --table-id tblXXX --input clean.json --merge-on "id"
   ```
