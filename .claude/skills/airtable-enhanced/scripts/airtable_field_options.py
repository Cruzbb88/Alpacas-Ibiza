#!/usr/bin/env python3
"""
Update single select field options in Airtable.

This script uses the Airtable API directly to add/update options for single select fields,
which is not supported by the standard Airtable MCP.

Usage:
    python airtable_field_options.py --base-id "appXXX" --table-id "tblXXX" --field-id "fldXXX" --add-options "Opt1,Opt2"
    python airtable_field_options.py --base-id "appXXX" --table-id "tblXXX" --field-id "fldXXX" --sync-from-json "values.json"

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


def get_field_options(base_id: str, table_id: str, field_id: str, token: str) -> dict:
    """Get current field configuration including options."""
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

    # Find the table and field
    for table in data.get("tables", []):
        if table["id"] == table_id or table["name"] == table_id:
            for field in table.get("fields", []):
                if field["id"] == field_id or field["name"] == field_id:
                    return field

    raise ValueError(f"Field {field_id} not found in table {table_id}")


def update_field_options(
    base_id: str,
    table_id: str,
    field_id: str,
    new_options: list[str],
    token: str,
    merge: bool = True
) -> dict:
    """
    Update single select field options.

    Args:
        base_id: Airtable base ID
        table_id: Table ID or name
        field_id: Field ID
        new_options: List of option names to add
        token: API token
        merge: If True, add to existing options. If False, replace all options.

    Returns:
        Updated field configuration
    """
    # Get current field config
    current_field = get_field_options(base_id, table_id, field_id, token)

    if current_field.get("type") not in ("singleSelect", "multipleSelects"):
        raise ValueError(f"Field is type '{current_field.get('type')}', not a select field")

    # Build options list
    current_choices = current_field.get("options", {}).get("choices", [])
    current_names = {c["name"] for c in current_choices}

    if merge:
        # Keep existing options, add new ones
        choices = list(current_choices)
        for opt in new_options:
            if opt and opt not in current_names:
                choices.append({"name": opt})
                print(f"  Adding option: {opt}")
    else:
        # Replace all options
        choices = [{"name": opt} for opt in new_options if opt]

    # Update the field
    url = f"https://api.airtable.com/v0/meta/bases/{base_id}/tables/{table_id}/fields/{field_id}"

    payload = {
        "options": {
            "choices": choices
        }
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"API error {e.code}: {error_body}")


def main():
    parser = argparse.ArgumentParser(description="Update Airtable single select field options")
    parser.add_argument("--base-id", required=True, help="Airtable base ID (appXXX)")
    parser.add_argument("--table-id", required=True, help="Table ID (tblXXX) or name")
    parser.add_argument("--field-id", required=True, help="Field ID (fldXXX)")
    parser.add_argument("--add-options", help="Comma-separated options to add")
    parser.add_argument("--sync-from-json", help="JSON file with array of option values")
    parser.add_argument("--replace", action="store_true", help="Replace all options instead of merging")
    parser.add_argument("--list", action="store_true", help="List current options and exit")

    args = parser.parse_args()

    try:
        token = get_api_token()
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # List current options
    if args.list:
        try:
            field = get_field_options(args.base_id, args.table_id, args.field_id, token)
            choices = field.get("options", {}).get("choices", [])
            print(f"Field: {field.get('name')} ({field.get('id')})")
            print(f"Type: {field.get('type')}")
            print(f"Current options ({len(choices)}):")
            for c in choices:
                print(f"  - {c.get('name')}")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)
        return

    # Get options to add
    new_options = []

    if args.add_options:
        new_options.extend([o.strip() for o in args.add_options.split(",") if o.strip()])

    if args.sync_from_json:
        try:
            with open(args.sync_from_json) as f:
                json_options = json.load(f)
                if isinstance(json_options, list):
                    new_options.extend([str(o) for o in json_options if o])
                else:
                    print(f"Error: JSON file must contain an array", file=sys.stderr)
                    sys.exit(1)
        except Exception as e:
            print(f"Error reading JSON file: {e}", file=sys.stderr)
            sys.exit(1)

    if not new_options:
        print("Error: No options provided. Use --add-options or --sync-from-json", file=sys.stderr)
        sys.exit(1)

    # Remove duplicates while preserving order
    seen = set()
    unique_options = []
    for opt in new_options:
        if opt not in seen:
            seen.add(opt)
            unique_options.append(opt)

    print(f"Updating field options...")
    print(f"  Base: {args.base_id}")
    print(f"  Table: {args.table_id}")
    print(f"  Field: {args.field_id}")
    print(f"  Options to add: {len(unique_options)}")

    try:
        result = update_field_options(
            args.base_id,
            args.table_id,
            args.field_id,
            unique_options,
            token,
            merge=not args.replace
        )
        print(f"\nSuccess! Field updated.")
        choices = result.get("options", {}).get("choices", [])
        print(f"Total options now: {len(choices)}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
