#!/usr/bin/env python3
"""
Batch operations for Airtable with automatic chunking and error recovery.

Handles:
- Automatic batching (Airtable limits: 10 records per request)
- Error recovery with individual item retry
- Progress reporting
- Rate limiting

Usage:
    python batch_operations.py create --base-id "appXXX" --table-id "tblXXX" --input records.json
    python batch_operations.py update --base-id "appXXX" --table-id "tblXXX" --input records.json
    python batch_operations.py upsert --base-id "appXXX" --table-id "tblXXX" --input records.json --merge-on "id"

Environment:
    AIRTABLE_API_KEY or AIRTABLE_TOKEN: Your Airtable personal access token
"""

import argparse
import json
import os
import sys
import time
from typing import Optional
import urllib.request
import urllib.error


BATCH_SIZE = 10  # Airtable's limit
RATE_LIMIT_DELAY = 0.2  # seconds between requests


def get_api_token() -> str:
    """Get Airtable API token from environment."""
    token = os.environ.get("AIRTABLE_API_KEY") or os.environ.get("AIRTABLE_TOKEN")
    if not token:
        raise ValueError("AIRTABLE_API_KEY or AIRTABLE_TOKEN environment variable required")
    return token


def make_request(
    url: str,
    method: str,
    token: str,
    data: Optional[dict] = None
) -> dict:
    """Make an API request to Airtable."""
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")

    if data:
        req.data = json.dumps(data).encode("utf-8")

    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        raise RuntimeError(f"API error {e.code}: {error_body}")


def batch_create(
    base_id: str,
    table_id: str,
    records: list[dict],
    token: str,
    typecast: bool = True
) -> dict:
    """
    Create records in batches with error recovery.

    Args:
        base_id: Airtable base ID
        table_id: Table ID or name
        records: List of records (each is a dict of field values)
        token: API token
        typecast: Enable Airtable's automatic type conversion

    Returns:
        Summary with created records and any errors
    """
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"

    created = []
    errors = []

    # Process in batches
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"  Processing batch {batch_num}/{total_batches} ({len(batch)} records)...")

        payload = {
            "records": [{"fields": r} for r in batch],
            "typecast": typecast
        }

        try:
            result = make_request(url, "POST", token, payload)
            created.extend(result.get("records", []))
        except RuntimeError as e:
            # Batch failed, try individual records
            print(f"    Batch failed, retrying individually...")
            for j, record in enumerate(batch):
                try:
                    single_payload = {
                        "records": [{"fields": record}],
                        "typecast": typecast
                    }
                    result = make_request(url, "POST", token, single_payload)
                    created.extend(result.get("records", []))
                except RuntimeError as e2:
                    errors.append({
                        "index": i + j,
                        "record": record,
                        "error": str(e2)
                    })
                time.sleep(RATE_LIMIT_DELAY)

        time.sleep(RATE_LIMIT_DELAY)

    return {
        "created": len(created),
        "errors": len(errors),
        "records": created,
        "failed": errors
    }


def batch_update(
    base_id: str,
    table_id: str,
    records: list[dict],
    token: str,
    typecast: bool = True
) -> dict:
    """
    Update records in batches with error recovery.

    Args:
        base_id: Airtable base ID
        table_id: Table ID or name
        records: List of records with 'id' field and fields to update
        token: API token
        typecast: Enable Airtable's automatic type conversion

    Returns:
        Summary with updated records and any errors
    """
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"

    updated = []
    errors = []

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"  Processing batch {batch_num}/{total_batches} ({len(batch)} records)...")

        # Separate id from fields
        payload_records = []
        for r in batch:
            record_id = r.pop("id", None) or r.pop("record_id", None)
            if not record_id:
                errors.append({"record": r, "error": "Missing record ID"})
                continue
            payload_records.append({"id": record_id, "fields": r})

        if not payload_records:
            continue

        payload = {
            "records": payload_records,
            "typecast": typecast
        }

        try:
            result = make_request(url, "PATCH", token, payload)
            updated.extend(result.get("records", []))
        except RuntimeError as e:
            print(f"    Batch failed, retrying individually...")
            for j, pr in enumerate(payload_records):
                try:
                    single_payload = {
                        "records": [pr],
                        "typecast": typecast
                    }
                    result = make_request(url, "PATCH", token, single_payload)
                    updated.extend(result.get("records", []))
                except RuntimeError as e2:
                    errors.append({
                        "index": i + j,
                        "record": pr,
                        "error": str(e2)
                    })
                time.sleep(RATE_LIMIT_DELAY)

        time.sleep(RATE_LIMIT_DELAY)

    return {
        "updated": len(updated),
        "errors": len(errors),
        "records": updated,
        "failed": errors
    }


def batch_upsert(
    base_id: str,
    table_id: str,
    records: list[dict],
    merge_on: list[str],
    token: str,
    typecast: bool = True
) -> dict:
    """
    Upsert records in batches with error recovery.

    Args:
        base_id: Airtable base ID
        table_id: Table ID or name
        records: List of records (each is a dict of field values)
        merge_on: Field names to use for matching existing records
        token: API token
        typecast: Enable Airtable's automatic type conversion

    Returns:
        Summary with upserted records and any errors
    """
    url = f"https://api.airtable.com/v0/{base_id}/{table_id}"

    upserted = []
    errors = []

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(records) + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"  Processing batch {batch_num}/{total_batches} ({len(batch)} records)...")

        payload = {
            "performUpsert": {
                "fieldsToMergeOn": merge_on
            },
            "records": [{"fields": r} for r in batch],
            "typecast": typecast
        }

        try:
            result = make_request(url, "PATCH", token, payload)
            upserted.extend(result.get("records", []))
        except RuntimeError as e:
            print(f"    Batch failed, retrying individually...")
            for j, record in enumerate(batch):
                try:
                    single_payload = {
                        "performUpsert": {
                            "fieldsToMergeOn": merge_on
                        },
                        "records": [{"fields": record}],
                        "typecast": typecast
                    }
                    result = make_request(url, "PATCH", token, single_payload)
                    upserted.extend(result.get("records", []))
                except RuntimeError as e2:
                    errors.append({
                        "index": i + j,
                        "record": record,
                        "error": str(e2)
                    })
                time.sleep(RATE_LIMIT_DELAY)

        time.sleep(RATE_LIMIT_DELAY)

    return {
        "upserted": len(upserted),
        "errors": len(errors),
        "records": upserted,
        "failed": errors
    }


def main():
    parser = argparse.ArgumentParser(description="Batch Airtable operations with error recovery")
    parser.add_argument("operation", choices=["create", "update", "upsert"],
                       help="Operation to perform")
    parser.add_argument("--base-id", required=True, help="Airtable base ID")
    parser.add_argument("--table-id", required=True, help="Table ID or name")
    parser.add_argument("--input", required=True, help="Input JSON file with records")
    parser.add_argument("--merge-on", help="Comma-separated field names for upsert matching")
    parser.add_argument("--output", help="Output JSON file for results")
    parser.add_argument("--no-typecast", action="store_true", help="Disable automatic type conversion")

    args = parser.parse_args()

    # Validate upsert requires merge-on
    if args.operation == "upsert" and not args.merge_on:
        print("Error: --merge-on is required for upsert operation", file=sys.stderr)
        sys.exit(1)

    try:
        token = get_api_token()
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
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

    print(f"Processing {len(records)} records...")
    typecast = not args.no_typecast

    # Execute operation
    if args.operation == "create":
        result = batch_create(args.base_id, args.table_id, records, token, typecast)
        print(f"\nCreated: {result['created']}, Errors: {result['errors']}")

    elif args.operation == "update":
        result = batch_update(args.base_id, args.table_id, records, token, typecast)
        print(f"\nUpdated: {result['updated']}, Errors: {result['errors']}")

    elif args.operation == "upsert":
        merge_on = [f.strip() for f in args.merge_on.split(",")]
        result = batch_upsert(args.base_id, args.table_id, records, merge_on, token, typecast)
        print(f"\nUpserted: {result['upserted']}, Errors: {result['errors']}")

    # Output results
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Results written to {args.output}")

    # Report errors
    if result["failed"]:
        print(f"\nFailed records:")
        for err in result["failed"][:5]:  # Show first 5
            print(f"  Index {err.get('index', '?')}: {err.get('error', 'Unknown error')}")
        if len(result["failed"]) > 5:
            print(f"  ... and {len(result['failed']) - 5} more")

    sys.exit(0 if result["errors"] == 0 else 1)


if __name__ == "__main__":
    main()
