# Scale Test Validation Protocol

Reference guide for L3 (Scale Test Validation). Consult this during L3 execution for variation strategies, validation criteria, and hardcoding detection patterns.

---

## Config Variation Strategies

### The 3-Variation Model

Every L3 validation creates exactly 3 config variations. This is not arbitrary — each variation targets a specific class of generator failure.

| Variation | Purpose | Tests For |
|-----------|---------|-----------|
| **Minimal** | Simplest valid config — required fields only | Missing default handling, empty-state crashes, null-safety |
| **Typical** | Realistic mid-complexity config | Core value proposition, common path correctness |
| **Maximal** | All fields populated, edge cases, unusual combos | Overflow handling, optional field interactions, boundary behavior |

### How to Design Each Variation

#### Minimal Config Rules
- Include ONLY fields marked `required` in the config schema
- Use the simplest valid values (shortest strings, smallest numbers, fewest array items)
- Do NOT include optional fields, even if they have defaults — the generator must apply defaults itself
- If a required field has an enum, use the first/simplest option
- Goal: The generator should produce valid, functional output from this bare-bones config

#### Typical Config Rules
- Include all required fields with realistic values
- Include 50-70% of optional fields — the ones a typical user would set
- Use values that represent the most common use case
- Include at least one nested/complex field (e.g., field definitions, relationships)
- Goal: The output should look like what a real user would actually deploy

#### Maximal Config Rules
- Include ALL fields (required + optional)
- Use maximum-complexity values:
  - Longest reasonable strings (multi-word names, descriptions with special characters)
  - Largest reasonable arrays (10+ field definitions, multiple relationships)
  - All enum options exercised across the config
  - Edge-case values: empty strings where allowed, zero values, boolean toggles in non-default state
- Include unusual but valid combinations (e.g., a public endpoint with audit logging, a read-only entity with soft deletes)
- Goal: Stress-test every code path in the generator

### What "Meaningfully Distinct" Means

Two variations are **meaningfully distinct** if they produce output with at least 3 of these differences:

1. **Different file count** — Maximal may generate additional files (e.g., migration file, test file) that minimal does not
2. **Different code paths** — Conditional blocks present in one but not another (e.g., auth middleware only when auth is enabled)
3. **Different structural elements** — Different number of fields, methods, routes, or components
4. **Different imports/dependencies** — Maximal may require additional imports not needed by minimal
5. **Different validation rules** — More constraints, different types, additional checks
6. **Different configuration sections** — Sections that only appear when optional features are enabled

**NOT meaningfully distinct:**
- Only the entity name changed (Task vs Product vs Order) with identical structure
- Only comments differ
- Only whitespace or formatting differs
- Same code with different variable names throughout

---

## Validation Checklist

Run this checklist for each of the 3 variations.

### Completeness Checks

- [ ] All files listed in L2 blueprint were produced
- [ ] File paths correctly interpolate config values (no `{entityName}` placeholders remaining)
- [ ] No unexpected extra files generated
- [ ] Directory structure matches the L2 specification
- [ ] Empty directories are not generated (every directory has at least one file)

### Distinctness Checks (Cross-Variation)

Compare each pair: minimal-typical, typical-maximal, minimal-maximal.

- [ ] At least 3 meaningful differences per pair (see criteria above)
- [ ] Output file count varies appropriately (maximal >= typical >= minimal)
- [ ] Conditional features appear only when their config flag is set
- [ ] Array-driven sections (fields, routes, methods) scale with config array sizes

### Parameterization Checks

For each config value, verify it flows through to the correct output locations:

- [ ] Entity/component names appear in file names, class names, variable names
- [ ] Field definitions appear in models, schemas, types, and test fixtures
- [ ] Boolean flags control the presence/absence of conditional sections
- [ ] Enum values map to the correct code patterns
- [ ] Nested config objects produce correctly structured output

### Syntax Validity Checks

- [ ] No unresolved template placeholders (`${...}`, `{...}`, `<%= ... %>`)
- [ ] No `undefined` or `null` where values should be
- [ ] Brackets, braces, and parentheses are balanced
- [ ] String literals are properly quoted and escaped
- [ ] Import paths reference existing (or expected-to-exist) modules
- [ ] No `TODO`, `FIXME`, or `PLACEHOLDER` markers in generated output

### Consistency Checks

- [ ] Same naming convention used across all variations (camelCase or snake_case, not mixed)
- [ ] Same code style (indentation, semicolons, quote style) across all variations
- [ ] Same file naming pattern across all variations
- [ ] Same directory structure pattern across all variations
- [ ] Comments follow same style (if present)

---

## Hardcoding Detection Patterns

### Universal Patterns (Any Language)

**String literal scanning:**
```
For each variation V and each config value C in V:
  For each OTHER variation O (O != V):
    Grep O's output files for the literal string C
    If found: HARDCODED — C from V appears in O's output
```

**Magic number detection:**
```
Scan all outputs for numeric literals:
  - Port numbers: 3000, 3001, 8080, 8443, 5432, 27017, 6379
  - Pagination: 10, 20, 25, 50, 100
  - Timeouts (ms): 1000, 3000, 5000, 10000, 30000, 60000
  - Timeouts (s): 30, 60, 120, 300, 3600
  - Limits: 100, 255, 1000, 1024, 4096
  - HTTP codes used as logic (not status returns): 200, 201, 400, 401, 403, 404, 500
If any of these appear AND should be configurable: HARDCODED
```

**Path detection:**
```
Scan for absolute or project-specific paths:
  - /src/, /lib/, /app/ — if these should be configurable
  - /api/v1/ — version should come from config
  - Database names, collection names — if entity-driven
```

### JavaScript / TypeScript Patterns

```javascript
// HARDCODED: Literal strings that should be config-driven
const tableName = "users";           // Should be: config.tableName
const endpoint = "/api/users";       // Should be: `/api/${config.entityPlural}`
const port = 3000;                   // Should be: config.port || 3000

// HARDCODED: Template literals with wrong interpolation
const path = `/api/v1/users`;        // "users" is hardcoded
const model = `UserModel`;           // "User" is hardcoded

// HARDCODED: Import paths assuming structure
import { User } from '../models/User';  // "User" should be parameterized
require('./routes/userRoutes');          // "user" should be parameterized

// HARDCODED: Object keys that should vary
const schema = {
  name: { type: 'string' },         // Field definitions should come from config
  email: { type: 'string' },
};

// OK: Framework constants (not config-driven)
app.use(express.json());             // This is always the same
export default router;               // Structural constant
```

**JS/TS detection regex patterns:**
```
Literal entity names:    /['"`](?:User|Product|Order|Task)\w*['"`]/
Hardcoded routes:        /['"`]\/api\/[a-z]+['"`]/
Hardcoded ports:         /(?:port|PORT)\s*[:=]\s*\d{4}/
Unresolved templates:    /\$\{[^}]*\}/  (in non-template-literal context)
Placeholder text:        /TODO|FIXME|PLACEHOLDER|CHANGEME|XXX/
```

### Python Patterns

```python
# HARDCODED: Literal strings that should be config-driven
table_name = "users"                 # Should be: config["table_name"]
endpoint = "/api/users"              # Should be: f"/api/{config['entity_plural']}"
DATABASE_URL = "postgresql://..."    # Should be from env/config

# HARDCODED: f-strings with wrong interpolation
path = f"/api/v1/users"              # "users" is hardcoded (f-string is pointless)
class_name = f"UserModel"            # "User" is hardcoded

# HARDCODED: Import paths assuming structure
from models.user import User         # "user"/"User" should be parameterized
from routes import user_routes       # "user" should be parameterized

# HARDCODED: Dict keys that should vary
schema = {
    "name": {"type": "string"},      # Field definitions should come from config
    "email": {"type": "string"},
}

# OK: Framework constants
app = Flask(__name__)                # Always the same
db = SQLAlchemy(app)                 # Structural constant
```

**Python detection regex patterns:**
```
Literal entity names:    /['"](User|Product|Order|Task)\w*['"]/
Hardcoded routes:        /['"]\/api\/[a-z]+['"]/
Hardcoded DB URLs:       /(?:postgresql|mysql|sqlite|mongodb):\/\//
Unresolved f-strings:    /f['"][^{]*['"]/  (f-string with no interpolation)
Placeholder text:        /TODO|FIXME|PLACEHOLDER|CHANGEME|XXX/
Dict literal schemas:    /\{\s*['"][a-z_]+['"]\s*:\s*\{/  (might be dynamic)
```

---

## Common Generator Failure Modes

### 1. "Copy-Paste Generator"
**Symptom:** All 3 variations produce nearly identical output with only entity names changed.
**Root cause:** Generator templates are too rigid — most content is static, only a few strings are interpolated.
**Detection:** Distinctness check fails — fewer than 3 meaningful differences between variations.
**Fix:** Identify which sections should vary based on config and add conditional blocks.

### 2. "Leaky Abstraction"
**Symptom:** Hardcoded values from the example config leak into the template.
**Root cause:** During L2 design, specific values were used where config references should be.
**Detection:** Hardcoding audit finds literal values from one variation in another's output.
**Fix:** Replace all literal values in templates with config references.

### 3. "Missing Defaults"
**Symptom:** Minimal variation crashes or produces invalid output.
**Root cause:** Generator doesn't handle missing optional fields — assumes all config values are present.
**Detection:** Completeness check fails for minimal variation; syntax errors in minimal output.
**Fix:** Add default values for all optional config fields in the generator logic.

### 4. "Maximal Overflow"
**Symptom:** Maximal variation produces valid but badly formatted or unwieldy output.
**Root cause:** Generator doesn't handle large arrays, long strings, or many optional features gracefully.
**Detection:** Syntax validity or consistency checks fail only for maximal variation.
**Fix:** Add scaling logic for large configs (pagination of long lists, wrapping of long lines).

### 5. "Template Residue"
**Symptom:** Output contains unresolved template placeholders like `${entityName}` or `{config.name}`.
**Root cause:** Template interpolation missed some placeholders, often in edge-case paths (error messages, comments, test fixtures).
**Detection:** Syntax validity check catches unresolved placeholders; grep for `${}`, `{{}}`, `<%= %>` patterns.
**Fix:** Audit all template files for placeholder completeness.

### 6. "Inconsistent Naming"
**Symptom:** Entity appears as "user" in some places, "User" in others, "users" in others — with no consistent transformation.
**Root cause:** Name transformations (camelCase, PascalCase, plural, kebab-case) are applied inconsistently.
**Detection:** Consistency check finds mixed naming conventions.
**Fix:** Define name transformation rules once and apply them uniformly.

---

## Scoring Reference

### L3 Deduction Table

| Issue | Deduction | Example |
|-------|-----------|---------|
| Variation fails to produce all expected files | -25 | Minimal variation missing 2 of 5 expected files |
| Variations are not meaningfully distinct | -20 | Minimal and typical differ only in entity name |
| Hardcoded value found (per occurrence) | -15 | "users" literal found in typical output when minimal config has "tasks" |
| Syntax errors in generated code | -10 | Unclosed brace in maximal variation's model file |
| Naming inconsistencies across variations | -5 | Minimal uses camelCase, maximal uses snake_case |

**Score floor: 0** (never go negative).

### Severity Classification for Hardcoded Values

| Severity | Criteria | Deduction |
|----------|----------|-----------|
| **Critical** | Value would cause runtime errors in another variation (wrong table name, wrong import path) | -15 |
| **Major** | Value would cause incorrect behavior (wrong endpoint path, wrong field name in query) | -15 |
| **Minor** | Value is cosmetic but wrong (wrong title in comments, wrong name in log messages) | -5 (bundle 3+ into one -15) |
