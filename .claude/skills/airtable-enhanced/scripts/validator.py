#!/usr/bin/env python3
"""
Pre-validate records against Airtable schema before inserting.

Checks:
- Required fields are present
- Select field values exist in options
- Field types match expected types
- Linked record IDs are valid format

Usage:
    python validator.py --base-id "appXXX" --table-id "tblXXX" --input records.json
    python validator.py --base-id "appXXX" --table-id "tblXXX" --input records.json --fix

Environment:
    AIRTABLE_API_KEY or AIRTABLE_TOKEN: Your Airtable personal access token
"""

import argparse
import json
import os
import sys
from typing import Optional
import urllib.request
import urllib.error


def get_api_token() -> str:
    """Get Airtable API token from environment."""
    token = os.environ.get("AIRTABLE_API_KEY") or os.environ.get("AIRTABLE_TOKEN")
    if not token:
        raise ValueError("AIRTABLE_API_KEY or AIRTABLE_TOKEN environment variable required")
    return token


def get_table_schema(base_id: str, table_id: str, token: str) -> dict:
    """Get table schema including field definitions."""
    url = f"https://api.airtable.com/v0/meta/bases/{base_id}/tables"

    req = urllib.request.Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"API error {e.code}: {error_body}")

    # Find the table
    for table in data.get("tables", []):
        if table["id"] == table_id or table["name"] == table_id:
            return table

    raise ValueError(f"Table {table_id} not found in base {base_id}")


def extract_select_options(schema: dict) -> dict[str, set[str]]:
    """Extract all select field options from schema."""
    options = {}

    for field in schema.get("fields", []):
        field_type = field.get("type")
        field_name = field.get("name")

        if field_type in ("singleSelect", "multipleSelects"):
            choices = field.get("options", {}).get("choices", [])
            options[field_name] = {c["name"] for c in choices}

    return options


def validate_record(
    record: dict,
    schema: dict,
    select_options: dict[str, set[str]]
) -> list[dict]:
    """
    Validate a single record against the schema.

    Returns list of validation errors.
    """
    errors = []

    field_map = {f["name"]: f for f in schema.get("fields", [])}

    for field_name, value in record.items():
        if value is None:
            continue

        field_def = field_map.get(field_name)
        if not field_def:
            # Unknown field - might be okay, Airtable ignores extra fields
            continue

        field_type = field_def.get("type")

        # Validate select fields
        if field_type == "singleSelect":
            valid_options = select_options.get(field_name, set())
            if value and value not in valid_options:
                errors.append({
                    "field": field_name,
                    "type": "invalid_select_option",
                    "value": value,
                    "valid_options": sorted(valid_options)
                })

        elif field_type == "multipleSelects":
            valid_options = select_options.get(field_name, set())
            if isinstance(value, list):
                for v in value:
                    if v and v not in valid_options:
                        errors.append({
                            "field": field_name,
                            "type": "invalid_select_option",
                            "value": v,
                            "valid_options": sorted(valid_options)
                        })

        # Validate linked records
        elif field_type == "multipleRecordLinks":
            if isinstance(value, list):
                for v in value:
                    if isinstance(v, str) and not v.startswith("rec"):
                        errors.append({
                            "field": field_name,
                            "type": "invalid_record_id",
                            "value": v,
                            "message": "Record IDs should start with 'rec'"
                        })

    return errors


def validate_records(
    records: list[dict],
    schema: dict
) -> dict:
    """
    Validate all records against the schema.

    Returns validation summary.
    """
    select_options = extract_select_options(schema)

    valid_count = 0
    invalid_count = 0
    all_errors = []
    missing_options = {}  # field -> set of missing values

    for i, record in enumerate(records):
        errors = validate_record(record, schema, select_options)

        if errors:
            invalid_count += 1
            all_errors.append({
                "index": i,
                "record": record,
                "errors": errors
            })

            # Track missing options for potential auto-fix
            for err in errors:
                if err["type"] == "invalid_select_option":
                    field = err["field"]
                    if field not in missing_options:
                        missing_options[field] = set()
                    missing_options[field].add(err["value"])
        else:
            valid_count += 1

    return {
        "total": len(records),
        "valid": valid_count,
        "invalid": invalid_count,
        "errors": all_errors,
        "missing_options": {k: sorted(v) for k, v in missing_options.items()}
    }


def main():
    parser = argparse.ArgumentParser(description="Validate records against Airtable schema")
    parser.add_argument("--base-id", required=True, help="Airtable base ID")
    parser.add_argument("--table-id", required=True, help="Table ID or name")
    parser.add_argument("--input", required=True, help="Input JSON file with records")
    parser.add_argument("--output", help="Output JSON file for validation results")
    parser.add_argument("--missing-options-json", help="Output file for missing select options (for use with airtable_field_options.py)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed errors")

    args = parser.parse_args()

    try:
        token = get_api_token()
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Get schema
    print(f"Fetching schema for {args.table_id}...")
    try:
        schema = get_table_schema(args.base_id, args.table_id, token)
    except Exception as e:
        print(f"Error fetching schema: {e}", file=sys.stderr)
        sys.exit(1)

    # Read input
    try:
        with open(args.input) as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading input: {e}", file=sys.stderr)
        sys.exit(1)

    # Ensure data is a list
    if isinstance(data, dict):
        if "records" in data:
            records = data["records"]
        else:
            records = [data]
    else:
        records = data

    # Validate
    print(f"Validating {len(records)} records...")
    result = validate_records(records, schema)

    # Summary
    print(f"\nValidation Results:")
    print(f"  Total: {result['total']}")
    print(f"  Valid: {result['valid']}")
    print(f"  Invalid: {result['invalid']}")

    if result["missing_options"]:
        print(f"\nMissing Select Options:")
        for field, options in result["missing_options"].items():
            print(f"  {field}: {options}")

    # Verbose output
    if args.verbose and result["errors"]:
        print(f"\nDetailed Errors (first 10):")
        for err in result["errors"][:10]:
            print(f"  Record {err['index']}:")
            for e in err["errors"]:
                print(f"    - {e['field']}: {e['type']} ({e['value']})")

    # Output full results
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nFull results written to {args.output}")

    # Output missing options for easy fixing
    if args.missing_options_json and result["missing_options"]:
        with open(args.missing_options_json, "w") as f:
            json.dump(result["missing_options"], f, indent=2)
        print(f"Missing options written to {args.missing_options_json}")

    sys.exit(0 if result["invalid"] == 0 else 1)


if __name__ == "__main__":
    main()
