# L1: Parameter Inventory Guide

This reference defines the protocol for discovering and cataloging every tunable parameter in a project. The inventory is the foundation for all subsequent layers -- L2 sensitivity ranking, L3 optimization, and L4 harmonic analysis all depend on a thorough L1 scan.

---

## Parameter Source Scan Order

Scan sources in this order. Each source category is worth 5 points toward the L1 score (30 points total for full coverage).

### 1. Environment Files

**Files to scan:**
- `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`, `.env.example`
- `docker-compose*.yml` (the `environment:` sections only)

**What to extract:**
- Every `KEY=VALUE` pair where the value is numeric, a duration, a boolean, or a size
- Common patterns: `*_PORT`, `*_HOST`, `*_TIMEOUT`, `*_SIZE`, `*_LIMIT`, `*_COUNT`, `*_RETRIES`, `*_TTL`, `*_INTERVAL`, `*_WORKERS`

**Technique:**
- Read each .env file and extract all assignments
- In docker-compose, parse the `environment:` block for each service

### 2. Config Files

**Files to scan:**
- `config/` and `settings/` directories (all files within)
- `*.config.js`, `*.config.ts`, `*.config.json`, `*.config.mjs`, `*.config.cjs`
- `*.yml`, `*.yaml`, `*.toml`, `*.ini` in the project root

**What to extract:**
- Any numeric values, durations, sizes, counts, or limits
- Named configuration keys with tunable values
- Nested config objects with parameter-like properties

**Technique:**
- Glob for config files, read each one
- Focus on values that look tunable (numbers, durations, booleans controlling behavior)

### 3. Package Metadata

**Files to scan:**
- `package.json`: scripts with numeric arguments, `config` sections, engine constraints
- `pyproject.toml`: tool configuration sections (e.g., `[tool.pytest.ini_options]`, `[tool.black]`)
- `Cargo.toml`: profile settings (`[profile.release]` opt-level, lto, codegen-units)
- `go.mod`, `Gemfile`, `build.gradle`, `pom.xml`: version constraints and build parameters

**What to extract:**
- Build parameters (optimization levels, parallelism)
- Tool configuration (line lengths, timeouts, thresholds)
- Engine/runtime constraints

### 4. Framework Config

**Files to scan:**
- `next.config.*` (image sizes, compression, headers, rewrites with timeouts)
- `webpack.config.*` (chunk sizes, parallelism, cache settings)
- `vite.config.*` (build targets, chunk size warnings, server settings)
- `tsconfig.json` (compiler options with boolean/numeric values)
- `babel.config.*`, `rollup.config.*`, `esbuild.config.*`
- `.eslintrc*`, `.prettierrc*` (style parameters like line width, tab size)

**What to extract:**
- Build-time parameters (chunk sizes, optimization levels)
- Runtime framework parameters (image dimensions, compression quality)
- Compiler/transpiler flags that affect output

### 5. Infrastructure

**Files to scan:**
- `Dockerfile`, `Dockerfile.*` (ARG and ENV values, exposed ports, health check intervals)
- `docker-compose*.yml` (resource limits: `mem_limit`, `cpus`, `restart` policy, volumes)
- `*.tf`, `*.tfvars` (Terraform resource sizing, instance types, scaling parameters)
- `pulumi.*`, `cdk.*` (IaC sizing parameters)
- `k8s/`, `kubernetes/`, `helm/` directories (replica counts, resource requests/limits, probe intervals)
- `nginx.conf`, `apache.conf` (worker_processes, keepalive_timeout, buffer sizes)

**What to extract:**
- Resource allocation (memory, CPU, disk)
- Scaling parameters (replicas, instance counts)
- Network parameters (ports, timeouts, buffer sizes)
- Health check intervals and thresholds

### 6. Application Code

**Search patterns (grep/ripgrep):**

```
# Hardcoded numeric constants
const.*=.*\d+
let.*=.*\d+
var.*=.*\d+
#define.*\d+

# Parameter-like variable names (case-insensitive)
timeout|limit|max|min|size|count|interval|ttl|threshold|retry|retries|pool|batch|buffer|capacity|workers|concurrency|parallel|threads|backoff|delay|rate|quota|duration|period|window|expire|cache
```

**What to extract:**
- Hardcoded magic numbers used as configuration (not array indices, loop counters, or version numbers)
- Constants or variables with parameter-like names
- Default values in function signatures
- Configuration objects defined inline

**Filtering out noise:**
- Skip test files (`*.test.*`, `*.spec.*`, `__tests__/`) unless they define test timeouts
- Skip `node_modules/`, `vendor/`, `.git/`, `dist/`, `build/`
- Skip version numbers, array indices, loop bounds (unless they look like configuration)
- Skip CSS values, pixel dimensions (unless they are configurable thresholds)

---

## Parameter Categories

Classify each discovered parameter into one of four categories:

| Category | Description | Signal Keywords |
|----------|-------------|----------------|
| **Performance** | Controls throughput, concurrency, or processing speed | batch, pool, workers, concurrency, parallel, threads, chunk, queue |
| **Reliability** | Controls error handling, failover, or resilience | timeout, retry, backoff, threshold, circuit, fallback, heartbeat, health |
| **Resource** | Controls resource allocation or limits | limit, max, quota, buffer, capacity, size, memory, cpu, disk, connections |
| **Behavior** | Controls application behavior or features | limit, rate, ttl, cache, page, level, mode, flag, feature, format |

When a parameter could fit multiple categories, choose the one that best describes the *primary impact* of changing that parameter.

---

## Parameter Record Format

For each parameter, record a row in this table:

```markdown
| # | Parameter | Value | Source | Type | Category | Notes |
|---|-----------|-------|--------|------|----------|-------|
| 1 | DB_POOL_SIZE | 10 | .env | int | Performance | Default, not documented |
| 2 | API_TIMEOUT | 30000 | config/api.ts | int (ms) | Reliability | Hardcoded constant |
| 3 | MAX_RETRIES | 3 | src/http-client.ts | int | Reliability | No backoff configured |
| 4 | CACHE_TTL | 3600 | .env | int (sec) | Behavior | 1 hour, may be too long |
| 5 | WORKER_COUNT | 4 | docker-compose.yml | int | Performance | Matches CPU cores? |
```

### Field Definitions

- **#**: Sequential number, starting at 1
- **Parameter**: The name or identifier (use the env var name, config key, or variable name)
- **Value**: Current value as found in source. Include units in Type column if ambiguous.
- **Source**: File path (relative to project root) where the parameter was found
- **Type**: `int`, `float`, `int (ms)`, `int (sec)`, `boolean`, `string`, `duration`, `bytes`
- **Category**: One of: Performance, Reliability, Resource, Behavior
- **Notes**: Context -- e.g., "framework default", "hardcoded, no config override", "overrides .env value", "undocumented"

### Duplicate Parameters

If the same logical parameter appears in multiple sources (e.g., `DB_POOL_SIZE` in `.env` AND `config/database.ts`), record BOTH occurrences and note the relationship:

```markdown
| 6 | DB_POOL_SIZE | 10 | .env | int | Performance | Primary source |
| 7 | DB_POOL_SIZE | 10 | config/database.ts | int | Performance | Reads from env, fallback=5 |
```

---

## Undocumented Defaults

Flag parameters that are hardcoded in application code with no configuration override mechanism. These are high-value findings because they represent hidden tuning knobs.

Present these separately:

```markdown
### Undocumented Defaults

These parameters are hardcoded in application code with no external configuration override:

| # | Parameter | Value | Location | Category | Risk |
|---|-----------|-------|----------|----------|------|
| 1 | connectionTimeout | 5000 | src/db.ts:42 | Reliability | No way to adjust without code change |
| 2 | maxBatchSize | 100 | src/processor.ts:15 | Performance | Limits throughput, not configurable |
```

---

## L1 Scoring Rubric

| Criterion | Points | How to Score |
|-----------|--------|-------------|
| **Source coverage** | 0-30 | 5 points per source category scanned (6 categories x 5 = 30 max). Award points even if the category has no files (the scan was attempted). |
| **Parameter count** | 0-25 | <5 params = 5 pts, 5-15 params = 15 pts, 15-30 params = 20 pts, 30+ params = 25 pts |
| **Categorization** | 0-25 | All parameters have: category assigned (10 pts), type specified (10 pts), meaningful notes (5 pts) |
| **Undocumented defaults** | 0-20 | Identified hardcoded constants: 0 found but looked = 10 pts, 1-5 found = 15 pts, 6+ found = 20 pts |

**Total: 0-100**

---

## Edge Cases

- **No config files at all**: Focus on application code scan (source #6). Score will reflect limited coverage but should still identify hardcoded parameters.
- **Monorepo**: Scope the scan to the current working directory, not the entire repository root.
- **Generated files**: Skip files in `dist/`, `build/`, `.next/`, `out/` -- these are outputs, not configuration sources.
- **Encrypted or obfuscated config**: Note the file exists but cannot be read. Do not attempt to decrypt.
- **Very large projects**: Prioritize config files first, then targeted application code searches. Do not attempt to read every source file.
