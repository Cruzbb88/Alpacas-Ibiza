# Airtable API Reference

Direct API patterns for operations not supported by the standard MCP.

## Authentication

All requests require Bearer token authentication:

```
Authorization: Bearer {AIRTABLE_TOKEN}
```

## Update Field Options (Single Select)

**Endpoint:** `PATCH /v0/meta/bases/{baseId}/tables/{tableId}/fields/{fieldId}`

**Payload:**
```json
{
  "options": {
    "choices": [
      {"name": "Option1"},
      {"name": "Option2", "color": "blueLight2"},
      {"name": "Option3"}
    ]
  }
}
```

**Note:** To add options while preserving existing ones, first GET the current options, merge with new ones, then PATCH.

## Batch Create Records

**Endpoint:** `POST /v0/{baseId}/{tableId}`

**Payload:**
```json
{
  "records": [
    {"fields": {"Name": "Value1", "Status": "Active"}},
    {"fields": {"Name": "Value2", "Status": "Pending"}}
  ],
  "typecast": true
}
```

**Limit:** 10 records per request

## Batch Update Records

**Endpoint:** `PATCH /v0/{baseId}/{tableId}`

**Payload:**
```json
{
  "records": [
    {"id": "recXXX", "fields": {"Status": "Complete"}},
    {"id": "recYYY", "fields": {"Status": "Active"}}
  ],
  "typecast": true
}
```

## Upsert Records

**Endpoint:** `PATCH /v0/{baseId}/{tableId}`

**Payload:**
```json
{
  "performUpsert": {
    "fieldsToMergeOn": ["email"]
  },
  "records": [
    {"fields": {"email": "test@example.com", "name": "Test"}}
  ],
  "typecast": true
}
```

## Get Table Schema

**Endpoint:** `GET /v0/meta/bases/{baseId}/tables`

**Response includes:**
- Table ID and name
- Field definitions with types
- Select field options
- Linked table references

## Rate Limits

- 5 requests per second per base
- Implement exponential backoff on 429 errors
- Batch operations to minimize request count

## Error Codes

| Code | Meaning |
|------|---------|
| 401 | Invalid or expired token |
| 403 | Insufficient permissions |
| 404 | Base/table/record not found |
| 422 | Invalid request (e.g., missing select option) |
| 429 | Rate limited |
| 500 | Server error |
