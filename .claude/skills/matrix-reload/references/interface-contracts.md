# Interface Contracts Reference

Contract extraction patterns, test stub generation, and criticality assessment for L3 Interface Preservation Contracts.

---

## Exported Symbol Identification

### JavaScript / TypeScript

```bash
# Named exports
grep -n "^export " file.ts
grep -n "^export {" file.ts
grep -n "^export const\|^export let\|^export var\|^export function\|^export class\|^export interface\|^export type\|^export enum\|^export default\|^export abstract" file.ts

# Re-exports
grep -n "^export.*from" file.ts

# Default exports
grep -n "export default" file.ts

# Module.exports (CommonJS)
grep -n "module\.exports\|exports\." file.js
```

### Python

```bash
# Public functions and classes (no leading underscore)
grep -n "^def [^_]\|^class [^_]" file.py

# __all__ declaration (explicit public API)
grep -n "^__all__" file.py

# Module-level constants (UPPER_CASE)
grep -n "^[A-Z][A-Z_]*\s*=" file.py
```

### Go

```bash
# Exported symbols (capitalized names)
grep -n "^func [A-Z]\|^type [A-Z]\|^var [A-Z]\|^const [A-Z]" file.go

# Exported struct fields
grep -n "^\s*[A-Z][a-zA-Z]*\s" file.go
```

### Rust

```bash
# Public items
grep -n "^pub fn\|^pub struct\|^pub enum\|^pub type\|^pub trait\|^pub const\|^pub static\|^pub mod" file.rs
```

---

## Consumer Tracing

For each exported symbol from a zone file, find all consumers outside the zone.

### JavaScript / TypeScript

```bash
# Find consumers of a named export
symbol_name="validateSession"
grep -rn "import.*${symbol_name}\|{ ${symbol_name}\|${symbol_name} }" --include="*.{ts,tsx,js,jsx}" .

# Find consumers of a default export
file_basename="session"
grep -rn "import.*from.*['\"].*${file_basename}['\"]" --include="*.{ts,tsx,js,jsx}" .

# Find dynamic imports
grep -rn "import(['\"].*${file_basename}" --include="*.{ts,tsx,js,jsx}" .
```

### Python

```bash
# Find consumers of a function/class
symbol_name="validate_session"
grep -rn "from.*import.*${symbol_name}\|import.*${symbol_name}" --include="*.py" .

# Find module-level imports
module_name="session"
grep -rn "import ${module_name}\|from ${module_name}" --include="*.py" .
```

### Go

```bash
# Find consumers of a package function
package_name="auth"
func_name="ValidateSession"
grep -rn "${package_name}\.${func_name}" --include="*.go" .
```

### Filtering to Outside-Zone Consumers

After finding all consumers, filter to only those OUTSIDE the reload zone:

```
all_consumers = find_all_consumers(symbol)
zone_files = L2_reload_zone_files
outside_consumers = [c for c in all_consumers if c.file not in zone_files]
```

Only outside consumers matter for interface contracts. Internal zone consumers will be rebuilt.

---

## Contract Type Classification

### Function Signature Contracts

A function exported from the zone and called by outside code.

**Extract:**
- Function name
- Parameter names, types, and optionality
- Return type (including async/Promise types)
- Thrown exceptions / error types
- Side effects (writes to DB, emits events, modifies global state)

**Template:**
```
contract_id: ic-{NNN}
type: function-signature
name: validateSession
source: src/auth/session.ts
direction: inbound
signature: (token: string, options?: ValidateOptions) => Promise<Session | null>
consumers:
  - src/middleware/auth.ts
  - src/api/routes/user.ts
  - src/api/routes/admin.ts
criticality: high (3 consumers)
test_stub: |
  // Contract test: validateSession must accept a string token
  // and return a Promise resolving to Session or null.
  // Must not throw on invalid tokens (returns null instead).
  assert(typeof validateSession === 'function')
  assert(await validateSession('valid-token') instanceof Session)
  assert(await validateSession('invalid-token') === null)
```

### Data Shape Contracts

Types, interfaces, or data structures passed across the zone boundary.

**Extract:**
- Type/interface name
- All fields with types
- Optional vs required fields
- Nested type references

**Template:**
```
contract_id: ic-{NNN}
type: data-shape
name: Session
source: src/auth/types.ts
direction: inbound
signature: |
  interface Session {
    id: string
    userId: string
    expiresAt: Date
    permissions: string[]
    metadata?: Record<string, unknown>
  }
consumers:
  - src/middleware/auth.ts
  - src/api/routes/user.ts
criticality: high (2 consumers, deeply nested usage)
test_stub: |
  // Contract test: Session must have id, userId, expiresAt, permissions.
  // metadata is optional.
  const session = getSession()
  assert('id' in session && typeof session.id === 'string')
  assert('userId' in session && typeof session.userId === 'string')
  assert('expiresAt' in session && session.expiresAt instanceof Date)
  assert(Array.isArray(session.permissions))
```

### API Endpoint Contracts

HTTP endpoints or RPC interfaces exposed by zone code.

**Extract:**
- Method and path
- Request body schema
- Response body schema
- Status codes
- Headers / auth requirements

**Template:**
```
contract_id: ic-{NNN}
type: api-endpoint
name: POST /api/auth/validate
source: src/auth/routes.ts
direction: inbound
signature: |
  POST /api/auth/validate
  Request: { token: string }
  Response 200: { valid: boolean, session?: Session }
  Response 401: { error: string }
consumers:
  - src/gateway/proxy.ts
  - external API clients
criticality: high
test_stub: |
  // Contract test: POST /api/auth/validate
  // Must accept { token } and return { valid, session? }
  // Must return 401 for missing token
  const res = await fetch('/api/auth/validate', { method: 'POST', body: { token: 'test' } })
  assert(res.status === 200 || res.status === 401)
  assert('valid' in await res.json())
```

### Event Pattern Contracts

Events emitted or consumed across the zone boundary.

**Extract:**
- Event name
- Payload shape
- Emitter (who fires it)
- Listeners (who handles it)
- Ordering guarantees

**Template:**
```
contract_id: ic-{NNN}
type: event-pattern
name: session:expired
source: src/auth/session.ts
direction: outbound (zone emits, outside listens)
signature: |
  Event: "session:expired"
  Payload: { sessionId: string, userId: string, reason: "timeout" | "revoked" }
consumers:
  - src/notifications/handler.ts
  - src/analytics/tracker.ts
criticality: medium (2 listeners)
test_stub: |
  // Contract test: session:expired event
  // Must emit with sessionId, userId, and reason fields
  // reason must be "timeout" or "revoked"
  emitter.on('session:expired', (payload) => {
    assert(typeof payload.sessionId === 'string')
    assert(typeof payload.userId === 'string')
    assert(['timeout', 'revoked'].includes(payload.reason))
  })
```

### File Export Contracts

Module-level re-exports, barrel files, or public API surface.

**Extract:**
- Exported name
- Original source
- Re-export chain (if applicable)

**Template:**
```
contract_id: ic-{NNN}
type: file-export
name: auth/index.ts barrel exports
source: src/auth/index.ts
direction: inbound
signature: |
  export { validateSession } from './session'
  export { createToken, refreshToken } from './tokens'
  export type { Session, TokenPayload } from './types'
consumers:
  - 12 files import from 'src/auth'
criticality: high (barrel file, many consumers)
test_stub: |
  // Contract test: auth barrel must export these symbols
  import { validateSession, createToken, refreshToken } from './auth'
  import type { Session, TokenPayload } from './auth'
  assert(typeof validateSession === 'function')
  assert(typeof createToken === 'function')
  assert(typeof refreshToken === 'function')
```

---

## Criticality Assessment

| Consumer Count | Criticality | Rationale |
|---------------|-------------|-----------|
| 5+ consumers | **High** | Breaking this interface affects many files. Must be preserved exactly. |
| 2-4 consumers | **Medium** | Manageable impact. Preserve interface, but minor adjustments may be negotiable. |
| 1 consumer | **Low** | Single dependency. Can be coordinated with that one consumer if needed. |

### Criticality Modifiers

Upgrade criticality by one level if:
- The consumer is in a critical path (auth, payment, data persistence)
- The interface is part of a public API or SDK
- The interface is used by external services or third parties
- The data shape is serialized/stored (changing it requires migration)

Downgrade criticality by one level if:
- The consumer is a test file (tests will be rewritten anyway)
- The interface is internal and both sides are controlled by the same team
- The dependency is through a well-defined adapter/facade

---

## Direction Classification

| Direction | Definition | Preservation Priority |
|-----------|-----------|----------------------|
| **Inbound** | Outside code calls INTO the zone | HIGHEST -- external callers must not break |
| **Outbound** | Zone calls OUT to external code | Medium -- zone must continue to call external APIs correctly |
| **Bidirectional** | Zone and outside call each other | HIGH -- entangled, may need interface extraction |
| **Internal** | Both sides inside zone | None -- will be rebuilt together |

### Inbound Contracts (Most Critical)

These are the interfaces that the outside world depends on. When the zone is rebuilt, every inbound contract must be satisfied exactly:
- Same function names
- Same parameter types and order
- Same return types
- Same error behavior
- Same side effects

### Outbound Contracts

The rebuilt zone must continue to call external code the same way:
- Same function calls with same argument shapes
- Same event subscriptions
- Same database queries (unless the external API is stable)

---

## L3 Scoring

```
Start at 100.

Deductions:
  -10 for each exported symbol without a mapped contract
  -5  for each contract missing a test stub
  -15 for each high-criticality contract without a full type signature
  -5  for each contract without consumer tracing (consumers list empty)

Floor at 0.
```

### Scoring Example

Zone has 10 exported symbols:
- 8 fully mapped with contracts, test stubs, and type signatures: no deductions
- 1 exported symbol without a contract: -10
- 1 contract missing a test stub: -5

L3 Score = 100 - 10 - 5 = 85

---

## Contract Extraction Checklist

For each file in the reload zone:

1. [ ] List all exported symbols (functions, classes, types, constants)
2. [ ] For each symbol, trace all consumers (inside and outside the zone)
3. [ ] Filter to outside-zone consumers only
4. [ ] Classify each contract by type (function-signature, data-shape, api-endpoint, event-pattern, file-export)
5. [ ] Classify direction (inbound, outbound, bidirectional)
6. [ ] Extract full type signature
7. [ ] Assess criticality (high / medium / low)
8. [ ] Generate contract test stub (pseudocode)
9. [ ] Record in contract table with unique contract_id
