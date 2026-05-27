# Gap Scanner -- Detection Heuristics

Reference file for L1 Capability Gap Scan. Contains detection patterns, false positive filters, and severity classification for each of the 10 gap categories.

---

## How to Use This File

For each gap category:
1. Run the **detection patterns** (Grep/Glob) to find candidate locations
2. Apply the **false positive filters** to exclude already-protected code
3. Classify severity using the **severity guide**
4. Record confirmed gaps in the gap table

---

## Category 1: Retry Logic

**What to look for**: External API calls without retry/backoff.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: fetch\(|axios\.|\.get\(|\.post\(|\.put\(|\.delete\(|\.patch\(
Glob: **/*.{ts,js,tsx,jsx}
```
Then check the surrounding context (10 lines before/after) for absence of: `retry`, `retries`, `backoff`, `withRetry`, `attempt`

**Python**:
```
Grep: requests\.(get|post|put|delete|patch)|httpx\.|aiohttp\.|urllib\.request
Glob: **/*.py
```
Then check for absence of: `retry`, `retries`, `backoff`, `tenacity`, `@retry`, `max_retries`

### False Positive Filters
- Skip if the file already imports a retry library (tenacity, retry, p-retry, axios-retry)
- Skip if a `withRetry` or `retry_wrapper` function exists in the same file or is imported
- Skip if the call is inside a try/catch that already implements manual retry logic (loop + catch)
- Skip test files (`*.test.*`, `*.spec.*`, `test_*`, `*_test.*`)

### Severity Guide
- **Critical**: Retry missing on payment/transaction APIs
- **Important**: Retry missing on any external HTTP call in production paths
- **Nice-to-have**: Retry missing on internal service calls with low failure rates

---

## Category 2: Circuit Breaking

**What to look for**: HTTP clients without circuit breaker patterns.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: fetch\(|axios\.(create|get|post)|new HttpClient|http\.request
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of: `circuitBreaker`, `circuit`, `breaker`, `opossum`, `CircuitBreaker`

**Python**:
```
Grep: requests\.Session|httpx\.Client|aiohttp\.ClientSession
Glob: **/*.py
```
Check for absence of: `circuit`, `breaker`, `pybreaker`, `CircuitBreaker`

### False Positive Filters
- Skip if a circuit breaker library is imported in the module
- Skip if the HTTP client is wrapped in a class that implements circuit breaking
- Skip one-off scripts or CLI tools (not long-running services)
- Skip test files

### Severity Guide
- **Critical**: No circuit breaker on calls to external services that the app depends on for core functionality
- **Important**: No circuit breaker on calls to third-party APIs
- **Nice-to-have**: No circuit breaker on optional/auxiliary service calls

---

## Category 3: Rate Limiting

**What to look for**: Endpoints or outbound calls with no rate limiting.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\(|\.route\(
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of: `rateLimit`, `rate-limit`, `throttle`, `limiter`, `RateLimiter`

**Python**:
```
Grep: @app\.(route|get|post|put|delete)|@router\.(get|post|put|delete)|def (get|post|put|delete)
Glob: **/*.py
```
Check for absence of: `rate_limit`, `throttle`, `limiter`, `slowapi`, `RateLimiter`

### False Positive Filters
- Skip if rate limiting middleware is applied globally (check app setup/main file)
- Skip if behind an API gateway that handles rate limiting (check for gateway config)
- Skip internal-only endpoints (health checks, metrics)
- Skip test files

### Severity Guide
- **Critical**: No rate limiting on public-facing authentication endpoints
- **Important**: No rate limiting on public API endpoints
- **Nice-to-have**: No rate limiting on internal endpoints

---

## Category 4: Caching

**What to look for**: Pure/idempotent functions with no memoization.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: async function (get|fetch|load|find|search|query)|\.find\(|\.findOne\(|\.query\(
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of: `cache`, `memo`, `memoize`, `lru`, `Cache`, `cached`

**Python**:
```
Grep: def (get_|fetch_|load_|find_|search_|query_)|\.find\(|\.filter\(|\.query\(
Glob: **/*.py
```
Check for absence of: `cache`, `@lru_cache`, `@cached`, `@functools.cache`, `memoize`, `cachetools`

### False Positive Filters
- Skip functions that modify state (POST/PUT/DELETE handlers, write operations)
- Skip functions that MUST return fresh data (real-time data, auth checks)
- Skip if caching is handled at a higher layer (Redis/Memcached configured globally)
- Skip test files

### Severity Guide
- **Critical**: No caching on expensive database queries in hot paths
- **Important**: No caching on repeated external API lookups
- **Nice-to-have**: No caching on pure computation functions called infrequently

---

## Category 5: Timeout Handling

**What to look for**: Promises/async calls with no timeout protection.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: await fetch\(|await axios\.|new Promise\(|await .*\.query\(|await .*\.connect\(
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of: `timeout`, `Timeout`, `AbortController`, `signal`, `setTimeout` used as timeout guard

**Python**:
```
Grep: await .*\.(get|post|fetch|query|connect|execute)|asyncio\.(wait_for|gather)|async with
Glob: **/*.py
```
Check for absence of: `timeout`, `asyncio.wait_for`, `async_timeout`, `signal.alarm`

### False Positive Filters
- Skip if the HTTP client has a default timeout configured (check client instantiation)
- Skip if the database connection pool has a timeout configured
- Skip background jobs where long execution is expected
- Skip test files

### Severity Guide
- **Critical**: No timeout on external API calls in request handlers (can hang entire server)
- **Important**: No timeout on database queries or connection attempts
- **Nice-to-have**: No timeout on internal async operations

---

## Category 6: Error Recovery

**What to look for**: Service boundaries without error boundary/fallback.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: catch\s*\(|\.catch\(|onError|errorHandler|ErrorBoundary
Glob: **/*.{ts,js,tsx,jsx}
```
Also scan for async functions WITHOUT any try/catch:
```
Grep: async function \w+
```
Then verify each has error handling.

**Python**:
```
Grep: except\s|try:|raise\s
Glob: **/*.py
```
Also scan for functions that call external services without try/except.

### False Positive Filters
- Skip if a global error handler is registered (Express errorHandler, FastAPI exception_handler)
- Skip if the framework provides automatic error handling (Next.js error boundaries)
- Skip simple utility functions that should propagate errors
- Skip test files

### Severity Guide
- **Critical**: No error recovery on data write paths (could cause data corruption/loss)
- **Important**: No error recovery on service boundaries (API calls, DB operations)
- **Nice-to-have**: No error recovery on non-critical operations

---

## Category 7: Input Validation

**What to look for**: Endpoints accepting user input without validation.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: req\.body|req\.params|req\.query|request\.json|ctx\.request\.body
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of: `validate`, `schema`, `zod`, `joi`, `yup`, `class-validator`, `ajv`, `.parse(`, `z.object`

**Python**:
```
Grep: request\.(json|form|args|data)|Body\(|Query\(|Path\(
Glob: **/*.py
```
Check for absence of: `pydantic`, `BaseModel`, `validate`, `Schema`, `marshmallow`, `cerberus`

### False Positive Filters
- Skip if validation middleware runs before the handler (check middleware chain)
- Skip if using a framework with built-in validation (FastAPI + Pydantic type hints)
- Skip if the endpoint only accepts path params with type constraints
- Skip test files

### Severity Guide
- **Critical**: No validation on authentication/authorization inputs
- **Important**: No validation on any user-facing endpoint body/params
- **Nice-to-have**: No validation on internal API endpoints with trusted callers

---

## Category 8: Logging/Observability

**What to look for**: Key operations with no structured logging or metrics.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: async function (create|update|delete|process|handle|execute)|app\.(get|post|put|delete)
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of: `logger`, `log\.`, `console.log` (weak), `winston`, `pino`, `bunyan`, `metrics`, `trace`

**Python**:
```
Grep: def (create_|update_|delete_|process_|handle_|execute_)|@app\.(route|get|post)
Glob: **/*.py
```
Check for absence of: `logger`, `logging`, `log\.`, `structlog`, `metrics`

### False Positive Filters
- Skip if a logging middleware captures all requests automatically
- Skip simple getter functions that don't modify state
- Skip if the function is a thin wrapper that delegates to a logged function
- Skip test files

### Severity Guide
- **Critical**: No logging on authentication/authorization events
- **Important**: No logging on data mutations or external service calls
- **Nice-to-have**: No logging on read-only operations

---

## Category 9: Graceful Degradation

**What to look for**: External dependencies with no fallback behavior.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: await fetch\(|await axios\.|redis\.|cache\.|\.query\(.*external
Glob: **/*.{ts,js,tsx,jsx}
```
Check for absence of fallback patterns: `catch.*default`, `catch.*fallback`, `|| default`, `?? fallback`, `try.*catch.*return`

**Python**:
```
Grep: requests\.|httpx\.|redis\.|cache\.|external
Glob: **/*.py
```
Check for absence of: `except.*return`, `fallback`, `default`, `or default`

### False Positive Filters
- Skip if the external call is non-critical and failure is acceptable
- Skip if a higher-level retry + circuit breaker already provides degradation
- Skip if the function explicitly should fail fast (e.g., payment processing)
- Skip test files

### Severity Guide
- **Critical**: No fallback when cache/DB is down and app becomes unavailable
- **Important**: No fallback on external API calls that have reasonable defaults
- **Nice-to-have**: No fallback on optional feature flags or analytics

---

## Category 10: Connection Pooling

**What to look for**: DB/HTTP connections created per-request.

### Detection Patterns

**JavaScript/TypeScript**:
```
Grep: new Pool\(|createConnection\(|new Client\(|mysql\.createConnection|pg\.connect
Glob: **/*.{ts,js,tsx,jsx}
```
Check if connections are created inside request handlers instead of at module level.

**Python**:
```
Grep: psycopg2\.connect\(|sqlite3\.connect\(|pymysql\.connect\(|create_engine\(
Glob: **/*.py
```
Check if connections are created inside route handlers instead of at app startup.

### False Positive Filters
- Skip if using an ORM that manages pooling (SQLAlchemy with pool, Prisma, TypeORM)
- Skip if connection is created at module/app level (singleton pattern)
- Skip if using a connection pool library (pg-pool, asyncpg pool)
- Skip test files, migration scripts, CLI tools

### Severity Guide
- **Critical**: DB connections created per-request in high-traffic endpoints
- **Important**: HTTP connections created per-request without pooling
- **Nice-to-have**: Connection creation in low-traffic endpoints or batch jobs

---

## General Notes

- Always exclude: `node_modules/`, `venv/`, `.venv/`, `__pycache__/`, `dist/`, `build/`, `.git/`, `vendor/`
- Always exclude test files: `*.test.*`, `*.spec.*`, `test_*`, `*_test.*`, `__tests__/`
- When in doubt about severity, prefer **important** over critical (avoid false alarms)
- A single file can have gaps in multiple categories
- Count each unique gap location once, even if multiple categories apply
