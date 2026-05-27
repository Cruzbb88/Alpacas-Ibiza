# L1: Critical Path Protocol

Trace every user-facing operation from input to output, measure or estimate time at each layer, and identify the single most impactful bottleneck -- the "power core" that everything depends on.

## Step 1: Target Scoping

Accept the user's target argument. If a specific file/endpoint/function is given, start there. If a directory or "the whole app" is given, start with entry points:
- API routes / HTTP handlers
- CLI commands / main entry points
- Event handlers / message consumers
- Scheduled tasks / cron jobs
- WebSocket handlers

Use Glob and Grep to discover entry points. Look for route definitions, `main()` functions, handler registrations.

## Step 2: Operation Tracing

For each entry point, trace the execution path through all layers:

```
User Request -> Route Handler -> Middleware -> Service Layer -> Data Access -> External Calls -> Response
```

Identify every layer the request passes through. Use static analysis:
- Grep for imports, function calls, middleware chains
- Follow the call graph from entry to exit
- Note async boundaries, queue handoffs, cache layers
- Document each hop as a node in the critical path

**v1 is static analysis only** -- no runtime profiling, no instrumentation. Estimate through code analysis.

## Step 3: Time Estimation

For each node in the critical path, estimate time contribution:

| Operation Type | Estimation Method |
|---------------|-------------------|
| Database queries | Query complexity: full scan vs indexed lookup, JOIN count, result set size |
| Network/API calls | Count external HTTP calls. Baseline: 100ms external, 1-10ms internal |
| File I/O | Count file reads/writes, estimate by typical file sizes |
| CPU computation | Algorithm complexity (O(n), O(n^2), etc.) relative to typical input sizes |
| Memory operations | Large allocations, deep copies, serialization/deserialization |
| Cache operations | Hit/miss scenarios, cache warming, invalidation overhead |

When estimating, document assumptions explicitly. Prefer conservative (slower) estimates for unknown operations.

## Step 4: Bottleneck Ranking

Rank each node by two dimensions:
- **Direct impact:** Estimated time this node contributes to the critical path
- **Downstream impact:** How many other operations depend on this node's output

Combine into **Power Core Score**:

```
Power Core Score = direct_time_ms x downstream_count
```

The node with the highest Power Core Score is the primary bottleneck -- the power core.

## Step 5: Cascading Impact Analysis

For the top bottleneck, trace downstream:
- Which endpoints, features, or user flows are affected?
- How many of the total user-facing operations depend on this node?

Express as: "Optimizing {bottleneck} would improve {N} of {total} user-facing operations ({percentage}%)."

## L1 Scoring

| Score Range | Meaning |
|-------------|---------|
| 80-100 | No significant bottleneck -- critical path is well-balanced |
| 60-79 | Minor bottleneck -- single node contributes < 40% of total path time |
| 40-59 | Moderate bottleneck -- single node contributes 40-70% of total path time |
| 0-39 | Severe bottleneck -- single node dominates the critical path (> 70% of time) |

A LOW L1 score means a severe bottleneck exists (which is the whole point of running this tool). A high score means performance is well-distributed.

## L1 Output Format

```markdown
## L1: Critical Path Analysis

### Power Core Identified
**Bottleneck:** {component/function/query name}
**Location:** {file:line}
**Estimated Time:** {N}ms of {total}ms total path ({percentage}%)
**Downstream Impact:** Affects {N}/{total} user-facing operations ({percentage}%)
**Power Core Score:** {score}

### Critical Path Map
{request} -> {layer1} ({Nms}) -> {layer2} ({Nms}) -> **{bottleneck}** ({Nms}) -> {layer3} ({Nms}) -> {response}

### Bottleneck Ranking
| Rank | Component | Est. Time | Downstream Ops | Power Core Score |
|------|-----------|-----------|----------------|-----------------|
| 1 | {name} | {N}ms | {N} | {score} |
| 2 | {name} | {N}ms | {N} | {score} |
| 3 | {name} | {N}ms | {N} | {score} |
```
