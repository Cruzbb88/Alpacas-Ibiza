# Gadget Patterns -- Pre-Designed Micro-Gadgets

Reference file for L2 Gadget Design. Contains ready-to-use gadget implementations organized by category, with JavaScript/TypeScript and Python variants.

**All gadgets follow these constraints:**
- Under 20 lines of code (non-empty, non-comment lines only)
- Zero external dependencies (stdlib/builtins only)
- Self-contained (standalone decorator, wrapper, middleware, or utility)
- Self-documenting (clear naming + one-line docstring)
- Removable (wraps existing code without modifying internals)

---

## Category 1: Retry Logic

### JavaScript/TypeScript

**Name**: `withRetry`
**Type**: wrapper
**Lines**: 11

```typescript
/** Wraps an async function with exponential backoff retry. */
async function withRetry<T>(
  fn: () => Promise<T>, maxRetries = 3, baseMs = 100
): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      await new Promise(r => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw new Error("unreachable");
}
```

**Usage**:
```typescript
const user = await withRetry(() => fetchUser(id));
const data = await withRetry(() => api.get("/data"), 5, 200);
```

### Python

**Name**: `with_retry`
**Type**: decorator
**Lines**: 13

```python
"""Decorator that retries a function with exponential backoff."""
import time, functools
def with_retry(max_retries=3, base_s=0.1):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            for i in range(max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except Exception:
                    if i == max_retries: raise
                    time.sleep(base_s * 2 ** i)
        return wrapper
    return decorator
```

**Usage**:
```python
@with_retry(max_retries=3)
def fetch_user(user_id):
    return requests.get(f"/users/{user_id}").json()
```

---

## Category 2: Circuit Breaking

### JavaScript/TypeScript

**Name**: `circuitBreaker`
**Type**: wrapper
**Lines**: 17

```typescript
/** Wraps a function with circuit breaker that opens after threshold failures. */
function circuitBreaker<T>(fn: () => Promise<T>, threshold = 5, resetMs = 30000) {
  let failures = 0, openUntil = 0;
  return async (): Promise<T> => {
    if (Date.now() < openUntil) {
      throw new Error("Circuit open");
    }
    try {
      const result = await fn();
      failures = 0;
      return result;
    } catch (e) {
      failures++;
      if (failures >= threshold) openUntil = Date.now() + resetMs;
      throw e;
    }
  };
}
```

**Usage**:
```typescript
const safeFetch = circuitBreaker(() => fetch("/api/data"), 3, 60000);
const data = await safeFetch();
```

### Python

**Name**: `circuit_breaker`
**Type**: wrapper
**Lines**: 18

```python
"""Wraps a callable with circuit breaker that opens after threshold failures."""
import time
def circuit_breaker(fn, threshold=5, reset_s=30):
    state = {"failures": 0, "open_until": 0}
    def wrapper(*args, **kwargs):
        if time.time() < state["open_until"]:
            raise RuntimeError("Circuit open")
        try:
            result = fn(*args, **kwargs)
            state["failures"] = 0
            return result
        except Exception:
            state["failures"] += 1
            if state["failures"] >= threshold:
                state["open_until"] = time.time() + reset_s
            raise
    return wrapper
```

**Usage**:
```python
safe_fetch = circuit_breaker(requests.get, threshold=3, reset_s=60)
response = safe_fetch("https://api.example.com/data")
```

---

## Category 3: Rate Limiting

### JavaScript/TypeScript

**Name**: `rateLimiter`
**Type**: middleware
**Lines**: 14

```typescript
/** Simple in-memory rate limiter by key with sliding window. */
function rateLimiter(maxReqs: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter(t => t > now - windowMs);
    if (timestamps.length >= maxReqs) return false;
    timestamps.push(now);
    hits.set(key, timestamps);
    return true;
  };
}
```

**Usage**:
```typescript
const limiter = rateLimiter(100, 60000); // 100 req/min
app.use((req, res, next) => {
  if (!limiter(req.ip)) return res.status(429).send("Too many requests");
  next();
});
```

### Python

**Name**: `rate_limiter`
**Type**: utility
**Lines**: 14

```python
"""Simple in-memory rate limiter with sliding window."""
import time
def rate_limiter(max_reqs, window_s):
    hits = {}
    def check(key):
        now = time.time()
        timestamps = [t for t in hits.get(key, []) if t > now - window_s]
        if len(timestamps) >= max_reqs:
            return False
        timestamps.append(now)
        hits[key] = timestamps
        return True
    return check
```

**Usage**:
```python
limiter = rate_limiter(100, 60)  # 100 req/min
if not limiter(request.client.host):
    raise HTTPException(status_code=429)
```

---

## Category 4: Caching

### JavaScript/TypeScript

**Name**: `memoize`
**Type**: wrapper
**Lines**: 13

```typescript
/** Memoizes a function with TTL-based cache expiry. */
function memoize<T>(fn: (...args: any[]) => T, ttlMs = 60000) {
  const cache = new Map<string, { value: T; expires: number }>();
  return (...args: any[]): T => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expires) return cached.value;
    const value = fn(...args);
    cache.set(key, { value, expires: Date.now() + ttlMs });
    return value;
  };
}
```

**Usage**:
```typescript
const cachedFetch = memoize(fetchUserProfile, 300000); // 5 min TTL
const profile = cachedFetch(userId);
```

### Python

**Name**: `memoize`
**Type**: decorator
**Lines**: 14

```python
"""Decorator that caches function results with TTL expiry."""
import time, functools
def memoize(ttl_s=60):
    def decorator(fn):
        cache = {}
        @functools.wraps(fn)
        def wrapper(*args):
            key = args
            if key in cache and time.time() < cache[key][1]:
                return cache[key][0]
            result = fn(*args)
            cache[key] = (result, time.time() + ttl_s)
            return result
        return wrapper
    return decorator
```

**Usage**:
```python
@memoize(ttl_s=300)
def get_user_profile(user_id):
    return db.query(f"SELECT * FROM users WHERE id = {user_id}")
```

---

## Category 5: Timeout Handling

### JavaScript/TypeScript

**Name**: `withTimeout`
**Type**: wrapper
**Lines**: 10

```typescript
/** Wraps a promise with a timeout that rejects after specified ms. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ]);
}
```

**Usage**:
```typescript
const data = await withTimeout(fetch("/api/slow"), 5000);
const result = await withTimeout(db.query(sql), 3000);
```

### Python

**Name**: `with_timeout`
**Type**: wrapper (async)
**Lines**: 9

```python
"""Wraps an awaitable with a timeout that raises after specified seconds."""
import asyncio
async def with_timeout(coro, timeout_s):
    try:
        return await asyncio.wait_for(coro, timeout=timeout_s)
    except asyncio.TimeoutError:
        raise TimeoutError(f"Operation timed out after {timeout_s}s")
```

**Usage**:
```python
data = await with_timeout(fetch_data(), timeout_s=5.0)
result = await with_timeout(db.execute(query), timeout_s=3.0)
```

---

## Category 6: Error Recovery

### JavaScript/TypeScript

**Name**: `withFallback`
**Type**: wrapper
**Lines**: 8

```typescript
/** Wraps an async function with a fallback value on failure. */
async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
```

**Usage**:
```typescript
const config = await withFallback(() => fetchRemoteConfig(), defaultConfig);
const user = await withFallback(() => getUser(id), guestUser);
```

### Python

**Name**: `with_fallback`
**Type**: decorator
**Lines**: 11

```python
"""Decorator that returns a fallback value when the function raises."""
import functools
def with_fallback(fallback):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except Exception:
                return fallback
        return wrapper
    return decorator
```

**Usage**:
```python
@with_fallback(fallback={"theme": "default"})
def load_user_prefs(user_id):
    return remote_config.get(user_id)
```

---

## Category 7: Input Validation

### JavaScript/TypeScript

**Name**: `validate`
**Type**: utility
**Lines**: 14

```typescript
/** Validates an object against a schema of type-check functions. */
function validate<T extends Record<string, unknown>>(
  data: unknown, schema: Record<string, (v: unknown) => boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof data !== "object" || data === null) return { valid: false, errors: ["Not an object"] };
  for (const [key, check] of Object.entries(schema)) {
    if (!check((data as Record<string, unknown>)[key])) {
      errors.push(`Invalid field: ${key}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
```

**Usage**:
```typescript
const { valid, errors } = validate(req.body, {
  name: v => typeof v === "string" && (v as string).length > 0,
  age: v => typeof v === "number" && (v as number) > 0,
});
if (!valid) return res.status(400).json({ errors });
```

### Python

**Name**: `validate`
**Type**: utility
**Lines**: 12

```python
"""Validates a dict against a schema of type-check callables."""
def validate(data, schema):
    errors = []
    if not isinstance(data, dict):
        return False, ["Not a dict"]
    for key, check in schema.items():
        if not check(data.get(key)):
            errors.append(f"Invalid field: {key}")
    return len(errors) == 0, errors
```

**Usage**:
```python
valid, errors = validate(request.json, {
    "name": lambda v: isinstance(v, str) and len(v) > 0,
    "age": lambda v: isinstance(v, int) and v > 0,
})
if not valid:
    return jsonify(errors=errors), 400
```

---

## Category 8: Logging/Observability

### JavaScript/TypeScript

**Name**: `withLogging`
**Type**: wrapper
**Lines**: 15

```typescript
/** Wraps an async function with structured entry/exit logging. */
function withLogging<T>(name: string, fn: (...args: any[]) => Promise<T>) {
  return async (...args: any[]): Promise<T> => {
    const start = Date.now();
    console.log(JSON.stringify({ event: "start", fn: name, ts: new Date().toISOString() }));
    try {
      const result = await fn(...args);
      const ms = Date.now() - start;
      console.log(JSON.stringify({ event: "end", fn: name, ms, ok: true }));
      return result;
    } catch (e) {
      const ms = Date.now() - start;
      console.log(JSON.stringify({ event: "end", fn: name, ms, ok: false, err: String(e) }));
      throw e;
    }
  };
}
```

**Usage**:
```typescript
const loggedFetch = withLogging("fetchUser", fetchUser);
const user = await loggedFetch(userId);
```

### Python

**Name**: `with_logging`
**Type**: decorator
**Lines**: 16

```python
"""Decorator that adds structured entry/exit logging to a function."""
import time, logging, functools
logger = logging.getLogger(__name__)
def with_logging(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.time()
        logger.info(f"{fn.__name__} started")
        try:
            result = fn(*args, **kwargs)
            logger.info(f"{fn.__name__} completed in {time.time()-start:.3f}s")
            return result
        except Exception as e:
            logger.error(f"{fn.__name__} failed in {time.time()-start:.3f}s: {e}")
            raise
    return wrapper
```

**Usage**:
```python
@with_logging
def process_order(order_id):
    return db.execute("UPDATE orders SET status='done' WHERE id=%s", (order_id,))
```

---

## Category 9: Graceful Degradation

### JavaScript/TypeScript

**Name**: `withDegradation`
**Type**: wrapper
**Lines**: 14

```typescript
/** Wraps a primary function with a degraded fallback on failure. */
function withDegradation<T>(
  primary: () => Promise<T>,
  degraded: () => Promise<T> | T
): Promise<T> {
  return primary().catch(async (err) => {
    console.warn(`Degrading: ${err.message}`);
    return degraded();
  });
}
```

**Usage**:
```typescript
const config = await withDegradation(
  () => fetchRemoteConfig(),
  () => loadLocalConfigCache()
);
```

### Python

**Name**: `with_degradation`
**Type**: utility
**Lines**: 11

```python
"""Calls primary function, falls back to degraded version on failure."""
import logging
logger = logging.getLogger(__name__)
def with_degradation(primary, degraded):
    try:
        return primary()
    except Exception as e:
        logger.warning(f"Degrading: {e}")
        return degraded()
```

**Usage**:
```python
config = with_degradation(
    lambda: fetch_remote_config(),
    lambda: load_local_cache()
)
```

---

## Category 10: Connection Pooling

### JavaScript/TypeScript

**Name**: `connectionPool`
**Type**: utility
**Lines**: 18

```typescript
/** Simple connection pool that reuses connections up to a max size. */
function connectionPool<T>(
  create: () => Promise<T>, maxSize = 10
) {
  const pool: T[] = [];
  return {
    async acquire(): Promise<T> {
      if (pool.length > 0) return pool.pop()!;
      return create();
    },
    release(conn: T) {
      if (pool.length < maxSize) pool.push(conn);
    },
    get size() { return pool.length; },
  };
}
```

**Usage**:
```typescript
const dbPool = connectionPool(() => createDbConnection(), 20);
const conn = await dbPool.acquire();
try { /* use conn */ } finally { dbPool.release(conn); }
```

### Python

**Name**: `connection_pool`
**Type**: utility
**Lines**: 17

```python
"""Simple connection pool that reuses connections up to a max size."""
import queue
class ConnectionPool:
    def __init__(self, create_fn, max_size=10):
        self._create = create_fn
        self._pool = queue.Queue(maxsize=max_size)
        self._max = max_size
    def acquire(self):
        try:
            return self._pool.get_nowait()
        except queue.Empty:
            return self._create()
    def release(self, conn):
        try:
            self._pool.put_nowait(conn)
        except queue.Full:
            pass
```

**Usage**:
```python
pool = ConnectionPool(lambda: psycopg2.connect(DSN), max_size=20)
conn = pool.acquire()
try:
    # use conn
finally:
    pool.release(conn)
```

---

## Pattern Selection Guide

When designing a gadget for a specific gap:

1. **Find the matching category** in this file
2. **Pick the variant** matching the project's primary language
3. **Adapt** variable names and parameters to fit the codebase context
4. **Verify** the line count is still under 20 after adaptation
5. If no pattern fits, design a new one following the same constraints

If the project uses a language not covered here (Go, Rust, Java, Ruby, PHP), design a new pattern following the same structural approach: minimal, self-contained, stdlib-only, under 20 lines.

<!-- EXTENSION POINT: 03b may add additional patterns as the gadget inventory grows -->
