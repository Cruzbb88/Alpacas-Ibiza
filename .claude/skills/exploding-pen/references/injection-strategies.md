# Injection Strategies -- Placement and Execution Reference

Reference file for L3 Injection Planning. Contains injection point identification heuristics, wrapping patterns by language, impact assessment methodology, disruption risk checklists, and rollback templates.

---

## How to Use This File

During L3 injection planning for each gadget designed in L2:
1. **Identify injection points** using the language-specific detection patterns below
2. **Select the wrapping pattern** that matches the gadget type and target language
3. **Assess impact** by counting downstream code paths affected
4. **Check disruption risk** against the risk checklist
5. **Generate rollback instructions** using the rollback templates

---

## Injection Point Identification

### Principles

- Inject at **service boundaries** (entry/exit points) rather than deep in call chains
- Prefer wrapping at the **call site** (where a function is called) over modifying the **definition site** (where it is defined)
- When a gadget protects multiple code paths, inject at the **highest common ancestor** in the call graph
- Never inject inside third-party code or generated files

### By Language

**JavaScript/TypeScript**:
- **Function calls to external APIs**: Look for `fetch()`, `axios.*()`, HTTP client method calls. Inject wrapper around the call expression.
- **Express/Koa route handlers**: Inject middleware before the handler, or wrap the handler function.
- **Database queries**: Look for `query()`, `execute()`, ORM method calls. Wrap at the repository/DAO layer.
- **Module exports**: If a function is exported and used widely, wrap at the export point.
- **Class methods**: Wrap at the method level using a decorator pattern or by reassigning the prototype method.

**Detection patterns (JS/TS)**:
```
# Find external API call sites
Grep: (fetch|axios|got|request|superagent)\s*[\.(]
Glob: **/*.{ts,js,tsx,jsx}

# Find Express/Koa route handlers
Grep: \.(get|post|put|delete|patch|use)\s*\(
Glob: **/*.{ts,js}

# Find database call sites
Grep: \.(query|execute|findOne|findMany|create|update|delete|save)\s*\(
Glob: **/*.{ts,js}
```

**Python**:
- **Function calls to external APIs**: Look for `requests.*()`, `httpx.*()`, `aiohttp` session calls. Wrap the calling function with a decorator.
- **Flask/FastAPI route handlers**: Add middleware or wrap the route function with a decorator.
- **Database queries**: Look for `cursor.execute()`, ORM calls. Wrap at the repository layer.
- **Module-level functions**: Wrap with a decorator at the definition site if the function is defined in the project.
- **Class methods**: Use decorator on the method, or wrap in `__init_subclass__`.

**Detection patterns (Python)**:
```
# Find external API call sites
Grep: requests\.(get|post|put|delete|patch)|httpx\.(get|post|put|delete|patch)|session\.(get|post|put|delete|patch)
Glob: **/*.py

# Find Flask/FastAPI route handlers
Grep: @(app|router|blueprint)\.(get|post|put|delete|patch|route)
Glob: **/*.py

# Find database call sites
Grep: cursor\.execute|session\.(query|execute|add|commit)|\.filter\(|\.filter_by\(
Glob: **/*.py
```

**Go**:
- **HTTP client calls**: Look for `http.Get()`, `http.Post()`, `client.Do()`. Wrap by creating a wrapper function or middleware.
- **HTTP handlers**: Inject middleware in the handler chain.
- **Database calls**: Look for `db.Query()`, `db.Exec()`. Wrap at the repository function level.

**Detection patterns (Go)**:
```
# Find HTTP client call sites
Grep: http\.(Get|Post|Head|Do)|client\.Do\(|\.RoundTrip\(
Glob: **/*.go

# Find HTTP handlers
Grep: func\s+\w+\(w\s+http\.ResponseWriter
Glob: **/*.go

# Find database call sites
Grep: \.(Query|QueryRow|Exec|Prepare)\(
Glob: **/*.go
```

---

## Wrapping Patterns

### Pattern 1: Function Wrapper (All Languages)

The most universal pattern. Create a new function that calls the original.

**JavaScript/TypeScript** -- wrap a call site:
```typescript
// BEFORE:
const data = await fetchUser(userId);

// AFTER:
const data = await withRetry(() => fetchUser(userId));
```

**Python** -- decorator on definition:
```python
# BEFORE:
def fetch_user(user_id):
    return requests.get(f"/users/{user_id}").json()

# AFTER:
@with_retry
def fetch_user(user_id):
    return requests.get(f"/users/{user_id}").json()
```

**Go** -- wrap at call site:
```go
// BEFORE:
resp, err := http.Get(url)

// AFTER:
resp, err := withRetry(func() (*http.Response, error) {
    return http.Get(url)
})
```

### Pattern 2: Middleware Insertion (Web Frameworks)

Insert a middleware function in the request processing chain.

**Express (JS/TS)**:
```typescript
// BEFORE:
app.get('/users/:id', getUser);

// AFTER:
app.get('/users/:id', rateLimiter({ max: 100 }), getUser);
```

**FastAPI (Python)**:
```python
# Add middleware to app
app.add_middleware(TimeoutMiddleware, timeout=30)
```

**Go net/http**:
```go
// BEFORE:
http.HandleFunc("/users", getUser)

// AFTER:
http.HandleFunc("/users", withTimeout(30*time.Second, getUser))
```

### Pattern 3: Decorator Application (Python)

Apply a decorator to an existing function definition.

```python
# Add decorator above existing function definition
@circuit_breaker(threshold=5, reset_after=60)
def call_payment_api(amount):
    ...
```

### Pattern 4: Higher-Order Component / Wrapper (JS/TS)

Wrap an exported function or class method.

```typescript
// Wrap an existing export
const originalFetchUser = fetchUser;
const fetchUser = withCircuitBreaker(originalFetchUser, { threshold: 5 });
```

### Pattern 5: Utility Placement (All Languages)

Place a standalone utility function in a shared utilities module.

- **JS/TS**: `src/utils/gadgets.ts` or `src/lib/gadgets.ts`
- **Python**: `src/utils/gadgets.py` or `lib/gadgets.py`
- **Go**: `internal/gadgets/gadgets.go` or `pkg/gadgets/gadgets.go`

If no utils directory exists, create one. Import from there at injection points.

---

## Impact Assessment

### Counting Downstream Code Paths

For each injection point, estimate how many code paths pass through it:

1. **Direct callers**: How many functions call the target function? (Use Grep to find references)
2. **Transitive callers**: How many functions call the direct callers? (One level up is sufficient)
3. **Request paths**: How many user-facing endpoints ultimately invoke this code?

### Impact Ranking

| Code paths protected | Impact level | Priority |
|---------------------|-------------|----------|
| 10+ | Critical | Inject first |
| 5-9 | High | Inject second |
| 2-4 | Medium | Inject third |
| 1 | Low | Inject last |

### Injection Order Strategy

1. Inject gadgets protecting the **most code paths** first (cascading benefit)
2. For equal impact, prefer gadgets at **higher abstraction levels** (service boundaries)
3. For equal abstraction, prefer gadgets addressing **critical severity** gaps
4. Group injections by file when possible to minimize context switching

---

## Disruption Risk Checklist

Before planning each injection, check:

| Risk | Check | Mitigation |
|------|-------|------------|
| Signature change | Does the wrapper change the function's input/output types? | Use generics/type parameters to preserve signatures |
| Test breakage | Do existing tests mock or stub the target function? | Update test imports if wrapper changes the reference |
| Performance | Does the wrapper add latency to a hot path? | Ensure wrapper overhead is < 1ms for hot paths |
| Error semantics | Does the wrapper catch/transform errors differently? | Re-throw original error types; only add behavior, don't change semantics |
| Import changes | Does injection require new imports in the target file? | Minimize import additions; prefer single utility import |
| Side effects | Does the wrapper introduce side effects (logging, metrics)? | Document any new side effects in the injection plan |

### Risk Levels

- **Low risk**: Wrapping at call site, no signature changes, no new imports needed
- **Medium risk**: Adding decorator/middleware, new import needed, tests may need updates
- **High risk**: Changing function signature, modifying class hierarchy, touching generated code

---

## Rollback Templates

Every injection must have a corresponding rollback instruction. Use these templates:

### Template 1: Call Site Wrapper Rollback

```
ROLLBACK for gd-{NNN} in {file_path}:
Replace:
  {wrapped code}
With:
  {original code}
```

Example:
```
ROLLBACK for gd-001 in src/api/client.ts:
Replace:
  const data = await withRetry(() => fetchUser(userId));
With:
  const data = await fetchUser(userId);
Also: Remove `import { withRetry } from '../utils/gadgets';` if no other gadgets use it.
```

### Template 2: Decorator Rollback

```
ROLLBACK for gd-{NNN} in {file_path}:
Remove the decorator line:
  @{decorator_name}({args})
from above the function definition of `{function_name}`.
Also: Remove the import if no other gadgets use it.
```

### Template 3: Middleware Rollback

```
ROLLBACK for gd-{NNN} in {file_path}:
Remove the middleware from the route/app:
  Remove: {middleware_call}
Also: Remove the import/require if no other routes use it.
```

### Template 4: Utility File Rollback

```
ROLLBACK for gd-{NNN}:
If no other gadgets remain in {utility_file}:
  Delete {utility_file}
  Remove any imports of {utility_file} from other files
Else:
  Remove the `{gadget_name}` function from {utility_file}
  Remove imports of `{gadget_name}` from injection target files
```

---

## Gadget Placement Strategy

### Where to Place Gadget Code

1. **If project has a utils/helpers directory**: Place gadgets there in a `gadgets.{ext}` file
2. **If project uses a lib/ directory**: Place in `lib/gadgets.{ext}`
3. **If project has no clear utility location**: Create `src/utils/gadgets.{ext}` (or equivalent for the language)
4. **For single-use gadgets**: Place in the same file as the injection target, above the target function

### Import Strategy

- Group all gadget imports into a single import statement where possible
- Use named imports (not default exports) so multiple gadgets can share one import line
- Add gadget imports at the end of the existing import block to minimize diff noise
