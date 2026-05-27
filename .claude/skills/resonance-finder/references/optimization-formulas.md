# L3: Optimization Formulas

This reference defines the protocol for determining optimal values for tunable parameters. For each HIGH-sensitivity parameter from L2 (or the top 3 MEDIUM parameters if no HIGH parameters exist), apply the optimization methods below in order of availability. The first method that applies produces the recommendation.

---

## Optimization Methods

Apply methods in this priority order. Use the highest-priority method that has sufficient input data.

### Method 1: Theoretical Bounds

Calculate hard mathematical limits using established formulas. These provide the highest confidence recommendations.

| Parameter Type | Formula / Bound | Variables | Example |
|---------------|----------------|-----------|---------|
| **Connection pool size** | `optimal = ceil(concurrent_queries * avg_query_time / avg_request_interval)` then add 2-3x headroom | Estimate concurrent_queries from request rate, avg_query_time from timeout or P50, avg_request_interval = 1/RPS | 50 QPS, 20ms avg query = ceil(50 * 0.02) = 1 minimum, apply 3x headroom = 3, but practical minimum is higher due to burst traffic. Use Little's Law: L = lambda * W |
| **Worker count** | I/O-bound: `optimal = CPU_cores * (1 + wait_time/compute_time)`. CPU-bound: `optimal = CPU_cores` | Determine CPU cores from infrastructure config or standard (4-8). Estimate I/O ratio from code patterns (DB calls, HTTP requests, file I/O) | 4 cores, 80% I/O wait = 4 * (1 + 0.8/0.2) = 20 workers. Pure CPU = 4 workers |
| **Batch size** | `optimal = sqrt(2 * fixed_cost * demand_rate / holding_cost)` (EOQ model adapted). Practical: balance setup overhead vs memory/latency | fixed_cost = per-batch overhead (connection setup, transaction start). demand_rate = items/sec. holding_cost = memory per item * processing time | If batch takes 10ms to set up, processes 1000 items/sec, each item holds 1KB for 50ms: sqrt(2 * 10 * 1000 / 0.05) ~= 632. Round to nearest power of 2 or clean number |
| **Cache TTL** | `optimal_ttl = -ln(acceptable_stale_rate) * data_change_interval` | acceptable_stale_rate = fraction of requests OK to serve stale (0.01-0.10). data_change_interval = average time between data modifications | 5% stale OK, data changes hourly: -ln(0.05) * 3600 = ~10,800s (3 hours). 1% stale OK, data changes every 10 min: -ln(0.01) * 600 = ~2,764s |
| **Timeout** | `optimal = P99_latency * safety_factor` where safety_factor = 1.5-3x | Estimate P99 from code patterns: simple DB query ~50-200ms, HTTP call ~200-2000ms, file I/O ~10-100ms. Use the higher end for safety | P99 = 200ms, factor 2x = 400ms timeout. For chained calls, outer timeout must exceed sum of inner timeouts |
| **Retry count** | `max_retries = ceil(ln(acceptable_failure_rate) / ln(per_attempt_failure_rate))` | acceptable_failure_rate = target (e.g., 0.001 for 99.9% success). per_attempt_failure_rate = estimated single-attempt failure rate | 0.1% acceptable, 10% per-attempt = ceil(ln(0.001)/ln(0.1)) = 3 retries |
| **Rate limit** | Bound by: downstream capacity, cost budget, or SLA. `safe_limit = downstream_capacity * safety_margin` where safety_margin = 0.7-0.8 | Identify the binding constraint: API rate limit, DB connection capacity, or budget | Downstream handles 100 RPS, safety margin 0.8 = limit to 80 RPS |
| **Buffer size** | `optimal = throughput_rate * max_acceptable_latency` | throughput_rate = messages or items per second. max_acceptable_latency = how long items can wait in buffer | 1000 msg/s, 50ms max latency = 50 messages. Add 2x for burst: 100 |

**When to use:** The parameter matches one of the types above AND you can estimate the required variables from the codebase (config files, infrastructure specs, code patterns).

### Method 2: Best Practice Lookup

When theoretical calculation is not possible (missing input variables), reference documented best practices for the project's technology stack.

#### Node.js
| Parameter | Best Practice | Source |
|-----------|--------------|--------|
| `UV_THREADPOOL_SIZE` | Default 4, optimal for I/O-heavy apps = CPU cores | Node.js docs: libuv thread pool |
| HTTP server `timeout` | 30s for APIs, 120s for file uploads | Express.js/Fastify defaults |
| `maxSockets` (HTTP agent) | 50-100 per host for high-throughput | Node.js HTTP agent documentation |
| Event loop lag threshold | Alert at >100ms | Clinicjs/Node.js best practices |
| `--max-old-space-size` | 75% of container memory limit | Node.js memory management guides |

#### Python
| Parameter | Best Practice | Source |
|-----------|--------------|--------|
| Gunicorn workers | `(2 * CPU_cores) + 1` | Gunicorn docs: design/workers |
| uvicorn workers | Same as Gunicorn for ASGI | uvicorn deployment guide |
| `PYTHONDONTWRITEBYTECODE` | Set to 1 in containers | Docker Python best practices |
| Connection pool (SQLAlchemy) | `pool_size=5, max_overflow=10` for moderate load | SQLAlchemy engine configuration docs |
| Celery `worker_concurrency` | CPU cores for CPU-bound, 4-8x cores for I/O-bound | Celery optimization guide |

#### PostgreSQL
| Parameter | Best Practice | Source |
|-----------|--------------|--------|
| `max_connections` | `(max_concurrent_requests * 1.5) + superuser_reserved` (typically 3-5) | PostgreSQL wiki: tuning |
| `shared_buffers` | 25% of system RAM (max ~8GB) | PostgreSQL docs: resource consumption |
| `work_mem` | `RAM / max_connections / 4` | PostgreSQL wiki: tuning |
| `effective_cache_size` | 50-75% of system RAM | PostgreSQL docs: query planning |
| `maintenance_work_mem` | 256MB-1GB depending on RAM | PostgreSQL docs: resource consumption |

#### Redis
| Parameter | Best Practice | Source |
|-----------|--------------|--------|
| `maxmemory` | `available_RAM * 0.6-0.8` for dedicated instances | Redis docs: memory optimization |
| `maxmemory-policy` | `allkeys-lru` for cache, `noeviction` for persistent data | Redis docs: eviction policies |
| `timeout` (idle connection) | 300s for connection pools, 0 for persistent connections | Redis docs: client handling |
| `tcp-keepalive` | 60-300 seconds | Redis docs: networking |

#### Docker
| Parameter | Best Practice | Source |
|-----------|--------------|--------|
| `memory` limit | Application peak usage * 1.5 | Docker docs: resource constraints |
| `cpus` limit | Average usage for requests, peak for limits | Docker docs: resource constraints |
| `--shm-size` | 256MB for database containers | Docker Postgres/MySQL images |
| Health check `interval` | 10-30s for services, 60s for background workers | Docker docs: health check |
| Health check `retries` | 3-5 retries before marking unhealthy | Docker docs: health check |

#### Kubernetes
| Parameter | Best Practice | Source |
|-----------|--------------|--------|
| CPU `requests` | Average usage (from monitoring or estimate) | K8s docs: resource management |
| CPU `limits` | Peak usage * 1.2 (or omit to allow bursting) | K8s docs: resource management |
| Memory `requests` | Working set size (from monitoring or estimate) | K8s docs: resource management |
| Memory `limits` | Peak * 1.25 (same as requests for predictability) | K8s docs: resource management |
| `replicas` | Start with 2-3 for HA, scale based on load | K8s docs: deployment |
| Probe `initialDelaySeconds` | Application startup time + 10s buffer | K8s docs: probe configuration |
| Probe `periodSeconds` | 10s for liveness, 5s for readiness | K8s docs: probe configuration |

**When to use:** The parameter relates to a recognized technology stack AND no theoretical formula applies (or the formula's required variables cannot be estimated).

### Method 3: Empirical Pattern Analysis

When no formula or best practice applies, analyze from code patterns and available context.

**Techniques:**

1. **Current value assessment**: Is the current value a round number (likely a guess), a framework default (check default values in dependencies), or a calculated value (likely intentional)?

2. **Scale analysis**: Compare the parameter against the project's apparent scale:
   - Small project (few routes, simple DB schema): smaller values are appropriate
   - Large project (many services, complex queries): larger values needed
   - If Cortex has data from other projects, compare parameter values at similar scale

3. **Growth trajectory**: If the parameter has been changed in git history, note the direction and rate of change. Project whether the current value is keeping up with growth.

4. **Error correlation**: Look for error handling patterns in the code that suggest the parameter is under pressure:
   - Retry loops with exponential backoff suggest the operation fails frequently
   - Timeout error handlers suggest the timeout may be too low
   - Pool exhaustion errors suggest the pool is undersized
   - Rate limit error handlers suggest limits are being hit

5. **Relative sizing**: Compare related parameters for consistency:
   - Is the connection pool sized for the number of workers?
   - Is the buffer sized for the batch size?
   - Are timeouts ordered correctly (outer > inner)?

**When to use:** No formula or best practice applies. This method produces LOW confidence recommendations that should be validated empirically.

---

## Recommendation Record Format

For each analyzed parameter, produce a row in this table:

```markdown
| # | Parameter | Current | Recommended | Confidence | Method | Expected Impact | Reasoning |
|---|-----------|---------|-------------|-----------|--------|----------------|-----------|
| 1 | DB_POOL_SIZE | 10 | 25 | High | Theoretical (Little's Law) | -40% query wait time | 50 QPS * 20ms = 1 min, current 10 = 10x headroom but contention at peak |
| 2 | CACHE_TTL | 3600 | 7200 | Medium | Formula (stale rate) | +15% cache hit rate | Data changes every 4h, 2h TTL gives 1% stale rate |
| 3 | WORKER_COUNT | 4 | 12 | Medium | Best practice (I/O-bound) | +60% throughput | 4 cores * (1 + 2.0 I/O ratio) = 12 |
```

### Column Definitions

- **#**: Sequential number
- **Parameter**: Name from L1 inventory
- **Current**: Current value as found
- **Recommended**: Calculated optimal value. If current value is already optimal, state "Current OK" with reasoning
- **Confidence**: High, Medium, or Low (see below)
- **Method**: Which optimization method was used (Theoretical + formula name, Best practice + source, or Empirical + technique)
- **Expected Impact**: Quantitative estimate of improvement (e.g., "-40% latency", "+30% throughput", "-60% error rate")
- **Reasoning**: Brief explanation of the calculation or logic. Include formula inputs and intermediate results

---

## Confidence Levels

| Level | Meaning | Basis |
|-------|---------|-------|
| **High** | Strong mathematical or empirical basis | Theoretical formula with known inputs; well-documented best practice for the exact stack and scale |
| **Medium** | Reasonable estimate based on patterns | Best practices for similar (not exact) stack/scale; theoretical formula with estimated inputs |
| **Low** | Educated guess, needs empirical validation | Pattern analysis, relative sizing, or limited data; formula with heavily estimated inputs |

### Confidence Adjustment Rules

- Start with the confidence level of the method used (Theoretical = High, Best Practice = Medium, Empirical = Low)
- **Upgrade** if: multiple methods agree on the same recommendation, or codebase provides exact input values
- **Downgrade** if: input values are heavily estimated, project scale is unusual, or the parameter has custom semantics

---

## Conflicting Optimization Handling

When a recommendation conflicts with a system constraint:

1. **Identify the constraint**: Memory limit, CPU budget, license restriction, cost budget
2. **Flag the conflict**: Note that the optimal value exceeds the constraint
3. **Provide constrained recommendation**: The best value achievable within the constraint
4. **Quantify the gap**: How much performance is left on the table due to the constraint

Example:
```markdown
| 4 | DB_POOL_SIZE | 10 | 30 (constrained: 20) | Medium | Theoretical (Little's Law) | -25% query wait (vs -40% unconstrained) | Optimal = 30 but container memory limits cap at ~20 connections. Recommend increasing memory allocation to unlock full optimization. |
```

---

## Edge Cases

- **No HIGH-sensitivity parameters**: Apply L3 to the top 3 MEDIUM sensitivity parameters instead. Note in the output: "No HIGH-sensitivity parameters found. Analyzing top 3 MEDIUM parameters."
- **Parameter with no applicable method**: Record with Confidence = Low, Method = "No formula available", Recommended = "Needs load testing", Reasoning = explanation of why no method applies
- **Current value is already optimal**: Record with Recommended = "Current OK", note why the current value is appropriate
- **Parameter not in inventory (tune mode)**: Return error: "Parameter `{name}` not found in inventory. Run `/resonance-finder` first to build the parameter inventory."

---

## L3 Scoring Rubric

| Criterion | Points | How to Score |
|-----------|--------|-------------|
| **Coverage** | 0-30 | Percentage of HIGH-sensitivity params with recommendations: (recommended / total_high) * 30. If no HIGH params, use top 3 MEDIUM params as denominator. |
| **Method quality** | 0-30 | Weighted average of method types used: Theoretical = 30, Best Practice = 20, Empirical = 10. Formula: sum(method_score) / count(params) |
| **Confidence calibration** | 0-20 | Each confidence level justified with specific evidence: all justified = 20, most justified = 15, some justified = 10, none justified = 0 |
| **Impact estimation** | 0-20 | Expected impact stated with quantitative reasoning: all quantitative = 20, mostly quantitative = 15, qualitative only = 10, no impact = 0 |

**Total: 0-100**
