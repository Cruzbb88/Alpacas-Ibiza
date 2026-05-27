# Optimization Techniques Catalog

Reference catalog for L3 Gap Closure Optimization. Organized by bottleneck type. For each technique: when to apply, typical improvement, effort, risk, and a concrete example.

---

## 1. Database

### 1.1 Index Optimization
- **Applicable when:** Queries perform full table scans or inefficient index usage (EXPLAIN shows seq scan)
- **Typical improvement:** 10-1000x for unindexed queries; 2-5x for partially indexed
- **Effort:** Low
- **Risk:** Write performance may degrade slightly; index bloat on high-write tables
- **Example:** Adding composite index on `(user_id, created_at)` reduces a 150ms full scan to 0.5ms B-tree lookup

### 1.2 Query Rewriting
- **Applicable when:** N+1 queries, unnecessary JOINs, subqueries that could be CTEs/window functions
- **Typical improvement:** 2-20x depending on N+1 severity
- **Effort:** Low-Medium
- **Risk:** Low -- semantically equivalent queries, verify with test data
- **Example:** Replace N+1 loop (`SELECT * FROM orders WHERE user_id = ?` per user) with single `SELECT * FROM orders WHERE user_id IN (...)` -- reduces 100 queries to 1

### 1.3 Query Result Caching
- **Applicable when:** Same expensive queries run repeatedly with identical or slowly-changing results
- **Typical improvement:** 10-100x for cache hits (sub-ms vs tens/hundreds of ms)
- **Effort:** Medium
- **Risk:** Stale data if invalidation is incorrect; memory pressure from large cache
- **Example:** Cache `getProductCatalog()` result in Redis with 60s TTL -- 200ms query becomes 0.5ms cache read for 99% of requests

### 1.4 Connection Pooling
- **Applicable when:** Each request opens a new DB connection; connection setup visible in traces
- **Typical improvement:** 2-10x for connection-dominated workloads (saves 20-50ms per connection)
- **Effort:** Low
- **Risk:** Low -- pool exhaustion under extreme load needs max-pool tuning
- **Example:** Switch from `mysql.createConnection()` per request to a pool of 10 connections -- eliminates 30ms TCP+auth handshake per query

### 1.5 Denormalization
- **Applicable when:** Read-heavy paths require multi-table JOINs that could be pre-computed
- **Typical improvement:** 2-10x by eliminating JOINs
- **Effort:** High
- **Risk:** Data consistency -- must maintain denormalized copies via triggers/events; increased storage
- **Example:** Store `order_total` directly on orders table instead of `SUM(line_items.price)` JOIN -- eliminates aggregation query on every order view

### 1.6 Read Replicas
- **Applicable when:** Read workload saturates primary DB; write contention causes read latency
- **Typical improvement:** 2-5x throughput improvement; latency unchanged per-query but reduced contention
- **Effort:** Medium-High
- **Risk:** Replication lag causes stale reads; application must handle eventual consistency
- **Example:** Route read-only dashboard queries to replica -- frees primary for writes, reduces p99 read latency from 200ms to 50ms

---

## 2. Network

### 2.1 Request Batching
- **Applicable when:** Multiple sequential HTTP/API calls that could be combined into one
- **Typical improvement:** N-1 round trips eliminated (e.g., 5 calls at 100ms each -> 1 call at 120ms)
- **Effort:** Medium
- **Risk:** Batch endpoint may not exist; larger payloads may hit size limits
- **Example:** Replace 5 sequential `GET /user/{id}` calls with single `POST /users/batch` -- saves 400ms of network overhead

### 2.2 Parallel Fetching
- **Applicable when:** Multiple independent API calls executed sequentially
- **Typical improvement:** Total time = max(individual times) instead of sum (e.g., 3x100ms -> 100ms vs 300ms)
- **Effort:** Low
- **Risk:** Low -- must ensure calls are truly independent; may increase instantaneous load on downstream
- **Example:** `Promise.all([fetchUser(), fetchOrders(), fetchPrefs()])` instead of sequential await -- 300ms becomes 100ms

### 2.3 Response Caching (HTTP/CDN)
- **Applicable when:** Responses are cacheable (same URL returns same content for a period)
- **Typical improvement:** 10-100x for cache hits (CDN edge: 5-20ms vs origin: 200-500ms)
- **Effort:** Low-Medium
- **Risk:** Stale content if cache-control headers are wrong; cache poisoning
- **Example:** Add `Cache-Control: max-age=300` to product listing API -- CDN serves 95% of requests without hitting origin

### 2.4 Connection Keep-Alive
- **Applicable when:** Repeated connections to the same host without persistent connections
- **Typical improvement:** Saves 20-100ms per connection (TCP handshake + TLS negotiation)
- **Effort:** Low
- **Risk:** Very low -- connection idle timeout tuning may be needed
- **Example:** Enable HTTP keep-alive on API client -- eliminates TLS handshake on repeated calls to same service

### 2.5 Payload Compression
- **Applicable when:** Large response bodies (>1KB) transferred over network
- **Typical improvement:** 2-10x reduction in transfer size; 20-60% latency reduction for large payloads
- **Effort:** Low
- **Risk:** Very low -- CPU cost of compression is negligible vs network savings
- **Example:** Enable gzip/brotli on API responses -- 50KB JSON payload becomes 8KB, saving 40ms on typical connections

### 2.6 Edge Caching / CDN
- **Applicable when:** Static or semi-static content served from a distant origin
- **Typical improvement:** 5-50x latency reduction (edge: 5-20ms vs cross-region origin: 100-300ms)
- **Effort:** Medium
- **Risk:** Cache invalidation complexity; cost of CDN service
- **Example:** Serve static assets and cacheable API responses from CDN edge -- global p50 drops from 200ms to 15ms

---

## 3. Algorithm

### 3.1 Complexity Reduction (Big-O Improvement)
- **Applicable when:** Algorithm uses higher complexity than the problem requires (e.g., O(n^2) when O(n log n) exists)
- **Typical improvement:** Order-of-magnitude for large inputs (e.g., O(n^2) -> O(n log n) on 100K items: 100x)
- **Effort:** Medium-High
- **Risk:** New algorithm may have different edge cases; verify correctness thoroughly
- **Example:** Replace nested loop search `O(n^2)` with hash map lookup `O(n)` -- 800ms on 100K items becomes 8ms

### 3.2 Memoization
- **Applicable when:** Pure functions called repeatedly with same arguments
- **Typical improvement:** Near-instant for cache hits; savings proportional to computation cost x repeat frequency
- **Effort:** Low
- **Risk:** Memory growth if cache is unbounded; must ensure function is truly pure
- **Example:** Memoize `computeShippingRate(zip, weight)` -- repeated calls with same args return cached result in <0.01ms vs 50ms computation

### 3.3 Lazy Evaluation
- **Applicable when:** Computing values that may not be needed; processing entire collections when only subset is used
- **Typical improvement:** Proportional to unused work avoided (e.g., if 80% of computed values unused: 5x)
- **Effort:** Low-Medium
- **Risk:** Low -- may complicate debugging if evaluation order matters
- **Example:** Replace eager `users.map(u => fetchProfile(u))` with lazy generator that fetches on demand -- only fetches profiles actually displayed

### 3.4 Data Structure Swap
- **Applicable when:** Using wrong data structure for the access pattern (e.g., array for frequent lookups)
- **Typical improvement:** 10-1000x depending on size and operation (e.g., array search -> hash lookup)
- **Effort:** Low-Medium
- **Risk:** Low -- verify all access patterns are covered by new structure
- **Example:** Replace `Array.find()` lookups on 10K items with `Map.get()` -- O(n) becomes O(1), 5ms becomes 0.01ms

### 3.5 Parallelization
- **Applicable when:** CPU-bound work that can be split into independent chunks
- **Typical improvement:** Near-linear with core count for embarrassingly parallel work (4 cores -> ~3.5x)
- **Effort:** Medium-High
- **Risk:** Race conditions, coordination overhead, diminishing returns; not all work is parallelizable
- **Example:** Process 1000 images in parallel across worker threads -- 60s sequential becomes 16s on 4 cores

### 3.6 Pre-computation
- **Applicable when:** Expensive computations with inputs known ahead of time or at build/deploy time
- **Typical improvement:** Runtime cost drops to zero (lookup instead of compute)
- **Effort:** Medium
- **Risk:** Increased build time or storage; stale pre-computed values if inputs change
- **Example:** Pre-compute pricing tiers at deploy time instead of calculating per request -- eliminates 20ms computation on every checkout

---

## 4. I/O

### 4.1 Buffered I/O
- **Applicable when:** Many small reads/writes instead of fewer large ones
- **Typical improvement:** 2-10x by reducing syscall overhead
- **Effort:** Low
- **Risk:** Very low -- data may be delayed in buffer; flush on critical boundaries
- **Example:** Use `BufferedReader` with 8KB buffer instead of byte-at-a-time reads -- 500ms file read becomes 60ms

### 4.2 Async I/O
- **Applicable when:** I/O operations block the main thread while waiting for completion
- **Typical improvement:** Throughput improvement proportional to I/O wait time (e.g., 3 files read concurrently vs sequentially: 3x)
- **Effort:** Medium
- **Risk:** Error handling complexity; callback/promise management
- **Example:** Read 3 config files with `Promise.all([readFile(a), readFile(b), readFile(c)])` -- 90ms sequential becomes 30ms concurrent

### 4.3 Memory-Mapped Files
- **Applicable when:** Large files accessed randomly or repeatedly; OS page cache handles caching
- **Typical improvement:** 2-5x for random access patterns; eliminates explicit read/buffer management
- **Effort:** Medium
- **Risk:** Address space limits on 32-bit systems; file must fit in virtual address space
- **Example:** Memory-map a 500MB index file instead of seeking+reading -- random lookups drop from 5ms to 0.1ms

### 4.4 Streaming Processing
- **Applicable when:** Processing large files/data that does not need to be fully loaded into memory
- **Typical improvement:** Constant memory usage regardless of input size; may improve latency by starting processing sooner
- **Effort:** Medium
- **Risk:** Cannot random-access data; must process sequentially
- **Example:** Stream-parse a 100MB JSON file with SAX-style parser instead of `JSON.parse()` -- avoids 500ms parse + 200MB allocation spike

### 4.5 Compression at Rest
- **Applicable when:** Reading large files where decompression is faster than reading uncompressed data
- **Typical improvement:** 2-5x for highly compressible data (less I/O despite CPU cost)
- **Effort:** Low-Medium
- **Risk:** CPU trade-off; not beneficial for already-compressed formats (images, video)
- **Example:** Store log files as gzip -- reading 10MB compressed (30MB uncompressed) is faster than reading 30MB raw from disk

---

## 5. Memory

### 5.1 Object Pooling
- **Applicable when:** Frequent allocation/deallocation of same-type objects (GC pressure)
- **Typical improvement:** 2-5x reduction in GC pauses; smoother latency profile
- **Effort:** Medium
- **Risk:** Pool sizing; leaked objects if not returned to pool; complexity
- **Example:** Pool database connection objects instead of creating new ones per query -- eliminates 5ms allocation + GC pressure per request

### 5.2 Arena Allocation
- **Applicable when:** Many short-lived allocations within a request/operation scope
- **Typical improvement:** 2-10x allocation speed; single bulk deallocation
- **Effort:** Medium-High
- **Risk:** Memory fragmentation if arenas are too large; language support varies
- **Example:** Allocate all request-scoped objects from a pre-allocated arena, free entire arena at request end -- eliminates per-object GC tracking

### 5.3 Avoiding Deep Copies
- **Applicable when:** Large objects cloned unnecessarily; spread operators on big arrays/objects
- **Typical improvement:** Proportional to object size (e.g., avoid copying 1MB object: save 2-10ms)
- **Effort:** Low
- **Risk:** Shared references may cause unexpected mutations; use immutable patterns where needed
- **Example:** Pass object by reference instead of `{...largeObject}` spread -- eliminates 5ms copy of 500-property object

### 5.4 Struct-of-Arrays (SoA)
- **Applicable when:** Iterating over one field of many objects (poor cache locality with array-of-structs)
- **Typical improvement:** 2-5x for iteration-heavy workloads due to cache line utilization
- **Effort:** Medium
- **Risk:** Code complexity; less natural data modeling
- **Example:** Store particle positions as `{x: Float32Array, y: Float32Array}` instead of `[{x, y}, ...]` -- iteration 3x faster from cache coherence

### 5.5 Weak References / Caches
- **Applicable when:** Caches that should not prevent garbage collection; large cached objects
- **Typical improvement:** Prevents OOM under memory pressure; smoother degradation
- **Effort:** Low
- **Risk:** Cache misses increase under memory pressure; must handle missing entries
- **Example:** Use `WeakRef` for cached DOM nodes -- cache automatically clears under memory pressure instead of growing until OOM

---

## 6. Frontend

### 6.1 Code Splitting
- **Applicable when:** Large JavaScript bundles loaded upfront; most code unused on initial page
- **Typical improvement:** 2-5x faster initial load (load 50KB instead of 500KB)
- **Effort:** Medium
- **Risk:** Loading spinners on navigation; must handle chunk loading failures
- **Example:** Split routes with `React.lazy()` -- initial bundle drops from 500KB to 80KB, TTI improves by 2 seconds

### 6.2 Lazy Loading
- **Applicable when:** Images, components, or data below the fold or behind user interaction
- **Typical improvement:** 30-70% reduction in initial payload; faster LCP
- **Effort:** Low-Medium
- **Risk:** Content shifts if placeholders are wrong size; delayed content on slow scroll
- **Example:** Add `loading="lazy"` to below-fold images -- saves 2MB of initial image downloads

### 6.3 Virtual Scrolling
- **Applicable when:** Rendering long lists (100+ items) in the DOM
- **Typical improvement:** Constant DOM node count regardless of list size; 10-100x for large lists
- **Effort:** Medium
- **Risk:** Scroll position quirks; accessibility concerns; search-in-page may not work
- **Example:** Use `react-virtuoso` for 10K-row table -- render 20 visible rows instead of 10K, eliminating 3-second render freeze

### 6.4 Render Memoization
- **Applicable when:** Components re-render with same props; expensive render computations
- **Typical improvement:** 2-10x fewer re-renders; proportional to component cost
- **Effort:** Low
- **Risk:** Stale renders if memoization key is wrong; memory for cached renders
- **Example:** Wrap expensive `<Chart data={data} />` in `React.memo()` -- skips re-render when parent updates but data unchanged

### 6.5 Worker Offloading
- **Applicable when:** CPU-heavy work on main thread causes jank (parsing, sorting, crypto)
- **Typical improvement:** Eliminates main thread blocking; perceived performance improvement
- **Effort:** Medium
- **Risk:** Communication overhead (structured clone); cannot access DOM from worker
- **Example:** Move CSV parsing to Web Worker -- 500ms main-thread parse no longer freezes UI

### 6.6 Image Optimization
- **Applicable when:** Unoptimized images dominate page weight
- **Typical improvement:** 3-10x file size reduction with modern formats (WebP/AVIF)
- **Effort:** Low
- **Risk:** Browser compatibility for newer formats; quality trade-offs
- **Example:** Convert PNG product images to WebP with responsive `srcset` -- 5MB page becomes 800KB, LCP improves by 3 seconds
