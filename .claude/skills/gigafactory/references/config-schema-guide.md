# Config Schema Design Guide

Best practices for designing generator configuration schemas. Consult this reference during L2 (Factory Design) to ensure high-quality, usable config schemas.

---

## Core Principles

### 1. Config Captures Variance, Not Constants

A config should only contain what **changes** between generated instances. If every endpoint needs an error handler, that's a template constant, not a config field.

**Bad:** `{ error_handling: true, use_middleware: true }` (always true = not config)
**Good:** `{ auth: "required" }` (varies per endpoint)

### 2. Required Fields Must Be Truly Required

A field is required only if the generator cannot produce valid output without it. Everything else gets a sensible default.

**Rule of thumb:** If 80%+ of users would set the same value, make it a default.

### 3. Match Project Conventions

- **JS/TS projects:** camelCase field names, JSON or YAML format
- **Python projects:** snake_case field names, YAML or TOML format
- **Go projects:** snake_case in YAML, PascalCase in Go structs

### 4. Progressive Complexity

Simple configs should be simple. Advanced options should be available but not required.

```yaml
# Minimal config (works fine):
entity_name: "User"
fields:
  - name: "email"
    type: "string"

# Full config (power users):
entity_name: "User"
table_name: "users"            # optional, defaults to lowercase plural
fields:
  - name: "email"
    type: "string"
    required: true
    unique: true
    max_length: 255
    validate: "email"
relationships:
  - type: "hasMany"
    entity: "Post"
auth: "required"
pagination:
  enabled: true
  default_page_size: 25
soft_delete: true
timestamps: true
audit_log: false
```

---

## Schema Design Patterns

### Flat Config (Simple Generators)

For generators with few dimensions (5 or fewer top-level fields):

```yaml
command_name: "deploy"
description: "Deploy to environment"
has_dry_run: true
has_verbose: true
```

Use when: The generator produces 1-2 files with straightforward variation.

### Nested Config (Medium Generators)

For generators with structured sub-dimensions:

```yaml
service_name: "PaymentService"
methods:
  - name: "charge"
    params:
      - name: "amount"
        type: "number"
      - name: "currency"
        type: "string"
    return_type: "ChargeResult"
dependencies:
  - name: "stripe"
    type: "StripeClient"
```

Use when: The generator has collections of sub-items (fields, methods, routes) each with their own properties.

### Inheritance Config (Complex Generators)

For generators where instances share base configurations:

```yaml
# base.yaml
base:
  auth: "required"
  pagination: true
  timestamps: true
  soft_delete: false

# entity-specific config extends base
extends: "base"
entity_name: "Product"
fields:
  - name: "title"
    type: "string"
overrides:
  soft_delete: true    # override base for this entity
```

Use when: Many instances share 80%+ of their config and you want DRY configs.

---

## Field Type Definitions

### Primitive Types

| Type | Description | Validation |
|------|-------------|------------|
| `string` | Text value | Optional: min_length, max_length, pattern (regex) |
| `number` | Numeric value | Optional: min, max, integer_only |
| `boolean` | True/false | No additional validation needed |
| `enum` | One of a fixed set | Required: `values` array |

### Complex Types

| Type | Description | Usage |
|------|-------------|-------|
| `array` | List of items | Specify `items` type. Optional: min_items, max_items |
| `object` | Nested structure | Specify `properties` with their own types |
| `reference` | Foreign key / relation | Specify `references` target entity |

### Example: Field Definition Sub-Schema

When a generator's config includes field definitions (common for CRUD/model generators), each field should support:

```yaml
fields:
  - name: "email"               # Required: field name
    type: "string"              # Required: data type
    required: true              # Optional, default: false
    unique: false               # Optional, default: false
    nullable: true              # Optional, default: true
    default: null               # Optional: default value
    max_length: 255             # Optional: type-specific constraint
    validate: "email"           # Optional: validation rule name
    index: false                # Optional: create index
    description: "User email"   # Optional: for documentation
```

---

## Naming Conventions

### Entity/Component Names

| Convention | Language | Example |
|-----------|----------|---------|
| PascalCase | JS/TS classes, React components | `UserProfile` |
| camelCase | JS/TS variables, file names | `userProfile` |
| snake_case | Python modules, file names | `user_profile` |
| kebab-case | URLs, CSS classes, CLI commands | `user-profile` |
| SCREAMING_SNAKE | Constants, env vars | `USER_PROFILE` |

The config should accept the **canonical form** (usually PascalCase for entities) and the generator should derive other forms automatically:
- `entityName: "UserProfile"` -> generates `user_profile.py`, `UserProfile` class, `user-profile` route, `USER_PROFILE_TABLE` constant

### Config Field Names

Match the project language:
- **JS/TS:** `entityName`, `hasTimestamps`, `defaultPageSize`
- **Python:** `entity_name`, `has_timestamps`, `default_page_size`

---

## Validation Rules

Every config schema should define what makes a config **invalid**. Common validations:

### Required Field Checks
```
- entity_name: must be present, non-empty, match /^[A-Z][a-zA-Z0-9]+$/
- fields: must have at least one field defined
- field.name: must be present, match /^[a-z][a-zA-Z0-9_]*$/
- field.type: must be one of the supported types
```

### Cross-Field Validations
```
- If auth is "admin", must have an admin role field or dependency
- If pagination is enabled, list endpoints must accept page/limit params
- If soft_delete is true, must have a deleted_at timestamp field (auto-added)
- Foreign key references must point to entities that exist or are being generated
```

### Helpful Error Messages

When validation fails, tell the user exactly what's wrong and how to fix it:

```
Error: field "price" has type "decimal" but no precision specified.
Fix: Add precision, e.g., { type: "decimal", precision: 10, scale: 2 }
```

---

## Complete Example: CRUD Endpoint Generator Config Schema

### As JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CRUD Endpoint Generator Config",
  "type": "object",
  "required": ["entityName", "fields"],
  "properties": {
    "entityName": {
      "type": "string",
      "pattern": "^[A-Z][a-zA-Z0-9]+$",
      "description": "PascalCase entity name (e.g., 'UserProfile')"
    },
    "tableName": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*$",
      "description": "Database table name. Defaults to lowercase plural of entityName."
    },
    "fields": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "type"],
        "properties": {
          "name": {
            "type": "string",
            "pattern": "^[a-z][a-zA-Z0-9]*$"
          },
          "type": {
            "type": "string",
            "enum": ["string", "number", "boolean", "date", "decimal", "text", "json"]
          },
          "required": { "type": "boolean", "default": false },
          "unique": { "type": "boolean", "default": false },
          "nullable": { "type": "boolean", "default": true },
          "default": {},
          "maxLength": { "type": "integer", "minimum": 1 },
          "min": { "type": "number" },
          "max": { "type": "number" },
          "validate": {
            "type": "string",
            "enum": ["email", "url", "uuid", "slug", "phone"]
          }
        }
      }
    },
    "relationships": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "entity"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["belongsTo", "hasMany", "hasOne", "manyToMany"]
          },
          "entity": { "type": "string" },
          "foreignKey": { "type": "string" },
          "onDelete": {
            "type": "string",
            "enum": ["CASCADE", "SET NULL", "RESTRICT"],
            "default": "CASCADE"
          }
        }
      }
    },
    "auth": {
      "type": "string",
      "enum": ["public", "required", "admin"],
      "default": "required"
    },
    "pagination": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true },
        "defaultPageSize": { "type": "integer", "default": 25, "minimum": 1, "maximum": 100 }
      }
    },
    "softDelete": { "type": "boolean", "default": false },
    "timestamps": { "type": "boolean", "default": true },
    "generateTests": { "type": "boolean", "default": true }
  }
}
```

### As TypeScript Interface

```typescript
interface CrudGeneratorConfig {
  /** PascalCase entity name, e.g., "UserProfile" */
  entityName: string;
  /** Database table name. Defaults to lowercase plural of entityName. */
  tableName?: string;
  /** Entity fields (at least one required) */
  fields: FieldConfig[];
  /** Relationships to other entities */
  relationships?: RelationshipConfig[];
  /** Authentication requirement. Default: "required" */
  auth?: 'public' | 'required' | 'admin';
  /** Pagination settings */
  pagination?: {
    enabled?: boolean;       // default: true
    defaultPageSize?: number; // default: 25
  };
  /** Enable soft delete (adds deleted_at). Default: false */
  softDelete?: boolean;
  /** Add created_at/updated_at. Default: true */
  timestamps?: boolean;
  /** Generate test files. Default: true */
  generateTests?: boolean;
}

interface FieldConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'decimal' | 'text' | 'json';
  required?: boolean;    // default: false
  unique?: boolean;      // default: false
  nullable?: boolean;    // default: true
  default?: unknown;
  maxLength?: number;
  min?: number;
  max?: number;
  validate?: 'email' | 'url' | 'uuid' | 'slug' | 'phone';
}

interface RelationshipConfig {
  type: 'belongsTo' | 'hasMany' | 'hasOne' | 'manyToMany';
  entity: string;
  foreignKey?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT'; // default: CASCADE
}
```

### Sample Filled Config

```yaml
entityName: "Product"
tableName: "products"
fields:
  - name: "title"
    type: "string"
    required: true
    unique: true
    maxLength: 255
  - name: "description"
    type: "text"
    nullable: true
  - name: "price"
    type: "decimal"
    required: true
    min: 0
  - name: "sku"
    type: "string"
    required: true
    unique: true
    maxLength: 50
  - name: "inStock"
    type: "boolean"
    default: true
relationships:
  - type: "belongsTo"
    entity: "Category"
  - type: "hasMany"
    entity: "Review"
auth: "required"
pagination:
  enabled: true
  defaultPageSize: 20
softDelete: true
timestamps: true
generateTests: true
```

This config would generate 5 files (route, controller, model, validator, tests) for a fully functional Product CRUD endpoint with authentication, pagination, soft delete, and relationship handling.

---

## Anti-Patterns to Avoid

### 1. Kitchen Sink Config
**Problem:** Every possible option exposed as a config field, making simple cases overwhelming.
**Fix:** Use sensible defaults. Only expose what actually varies.

### 2. String-Typed Everything
**Problem:** `{ type: "string", validation: "string", format: "string" }` — no type safety.
**Fix:** Use enums for known values, specific types for structured data.

### 3. Implicit Dependencies
**Problem:** Field A only matters when field B is set, but nothing in the schema says so.
**Fix:** Document dependencies. Use conditional schemas or validation rules.

### 4. No Defaults
**Problem:** Every field is required, forcing users to specify obvious values.
**Fix:** Make the minimal config work. `{ entityName: "User", fields: [{ name: "email", type: "string" }] }` should produce a working endpoint.

### 5. Inconsistent Naming
**Problem:** Mixing `entity_name`, `EntityName`, and `entityname` in the same schema.
**Fix:** Pick one convention per language and enforce it.
