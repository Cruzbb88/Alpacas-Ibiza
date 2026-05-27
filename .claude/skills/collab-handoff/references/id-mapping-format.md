# ID Mapping Format Reference

Cross-reference mapping between original (remote) memory IDs and newly created local memory IDs after import. One mapping file per source user.

## File Location

```
handoffs/{source_user}/imported/.id-mapping.json
```

Each collaborator's imported memories are tracked in their own mapping file.

## Schema

```json
{
  "mappings": [
    {
      "original_id": "mem_1771304364329_92bd754f",
      "local_id": "mem_1771310000000_abc12345",
      "source_user": "tony",
      "imported_at": "2026-02-17T12:00:00Z",
      "source_file": "ch-001-2026-02-17-surity-handoff.md"
    }
  ],
  "last_updated": "2026-02-17T12:00:00Z"
}
```

## Field Details

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `mappings` | array | Yes | List of all imported memory mappings |
| `mappings[].original_id` | string | Yes | Memory ID from the exporter's Cortex |
| `mappings[].local_id` | string | Yes | New memory ID in the importer's Cortex |
| `mappings[].source_user` | string | Yes | Username of the original exporter |
| `mappings[].imported_at` | string | Yes | ISO 8601 timestamp of when the import occurred |
| `mappings[].source_file` | string | Yes | Filename (not path) of the handoff file that contained this memory |
| `last_updated` | string | Yes | ISO 8601 timestamp of most recent write to this file |

## Usage

- **Import (L3)**: After creating each memory via `cortex_remember`, append a new entry to `mappings` with the original and new IDs
- **Relationship preservation (L3)**: When linking imported memories, look up `original_id` in `mappings` to find the corresponding `local_id`
- **Re-import (`--force`)**: New entries are appended. Existing entries are not overwritten -- the same `original_id` may appear multiple times if force-reimported
- **Status command**: Read `last_updated` and count `mappings` to show import history

## Notes

- The file is created inside the `imported/` subdirectory alongside moved handoff files
- The leading dot in `.id-mapping.json` keeps it hidden in standard directory listings
- Concurrent writes are unlikely but possible -- use read-modify-write with minimal window
- The file grows monotonically. For large collaboration histories, old entries can be archived manually
