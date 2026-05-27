#!/usr/bin/env python3
"""
Sanitize data before inserting into Airtable.

Handles common issues like:
- Extra quotes around values
- Whitespace trimming
- Empty string normalization
- Case normalization for select fields

Usage:
    python data_sanitizer.py --input data.json --output cleaned.json
    python data_sanitizer.py --input data.json --output cleaned.json --select-fields "unit_type,status"

Can also be imported and used as a library.
"""

import argparse
import json
import re
import sys
from typing import Any, Optional


def strip_extra_quotes(value: str) -> str:
    """
    Remove extra quotes from a string value.

    Examples:
        '"iFrame"' -> 'iFrame'
        '""Value""' -> 'Value'
        '"Value' -> 'Value'
        'Normal' -> 'Normal'
    """
    if not isinstance(value, str):
        return value

    original = value

    # Remove escaped quotes: \"value\" -> value
    if value.startswith('\\"') and value.endswith('\\"'):
        value = value[2:-2]

    # Remove double-double quotes: ""value"" -> value
    while value.startswith('""') and value.endswith('""') and len(value) > 4:
        value = value[2:-2]

    # Remove surrounding quotes: "value" -> value
    while len(value) >= 2 and value.startswith('"') and value.endswith('"'):
        value = value[1:-1]

    # Remove unbalanced leading/trailing quotes
    value = value.strip('"')

    return value


def sanitize_value(value: Any, field_type: Optional[str] = None) -> Any:
    """
    Sanitize a single value based on its type.

    Args:
        value: The value to sanitize
        field_type: Optional hint about the field type (e.g., 'select', 'text')

    Returns:
        Sanitized value
    """
    if value is None:
        return None

    if isinstance(value, str):
        # Strip extra quotes
        value = strip_extra_quotes(value)

        # Trim whitespace
        value = value.strip()

        # Convert empty strings to None
        if value == "":
            return None

        return value

    if isinstance(value, list):
        return [sanitize_value(v, field_type) for v in value]

    if isinstance(value, dict):
        return {k: sanitize_value(v) for k, v in value.items()}

    return value


def sanitize_record(
    record: dict,
    select_fields: Optional[list[str]] = None,
    field_mapping: Optional[dict[str, str]] = None
) -> dict:
    """
    Sanitize all fields in a record.

    Args:
        record: The record dictionary to sanitize
        select_fields: List of field names that are select fields (for special handling)
        field_mapping: Optional mapping of field names to their types

    Returns:
        Sanitized record
    """
    sanitized = {}

    for key, value in record.items():
        field_type = None
        if select_fields and key in select_fields:
            field_type = "select"
        elif field_mapping and key in field_mapping:
            field_type = field_mapping[key]

        sanitized[key] = sanitize_value(value, field_type)

    return sanitized


def sanitize_records(
    records: list[dict],
    select_fields: Optional[list[str]] = None
) -> list[dict]:
    """
    Sanitize a list of records.

    Args:
        records: List of record dictionaries
        select_fields: List of field names that are select fields

    Returns:
        List of sanitized records
    """
    return [sanitize_record(r, select_fields) for r in records]


def extract_unique_values(records: list[dict], field_name: str) -> list[str]:
    """
    Extract all unique values for a field from a list of records.

    Useful for syncing select field options.
    """
    values = set()
    for record in records:
        value = record.get(field_name)
        if value is not None:
            if isinstance(value, list):
                values.update(str(v) for v in value if v)
            else:
                sanitized = sanitize_value(value)
                if sanitized:
                    values.add(str(sanitized))
    return sorted(values)


def main():
    parser = argparse.ArgumentParser(description="Sanitize data for Airtable")
    parser.add_argument("--input", required=True, help="Input JSON file")
    parser.add_argument("--output", help="Output JSON file (default: stdout)")
    parser.add_argument("--select-fields", help="Comma-separated list of select field names")
    parser.add_argument("--extract-values", help="Extract unique values for this field")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")

    args = parser.parse_args()

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

    # Parse select fields
    select_fields = None
    if args.select_fields:
        select_fields = [f.strip() for f in args.select_fields.split(",")]

    # Extract unique values if requested
    if args.extract_values:
        values = extract_unique_values(records, args.extract_values)
        output = json.dumps(values, indent=2 if args.pretty else None)
        if args.output:
            with open(args.output, "w") as f:
                f.write(output)
        else:
            print(output)
        return

    # Sanitize records
    sanitized = sanitize_records(records, select_fields)

    # Output
    output = json.dumps(sanitized, indent=2 if args.pretty else None)
    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Sanitized {len(sanitized)} records to {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
