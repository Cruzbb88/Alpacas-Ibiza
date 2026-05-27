# Benchmark Patterns Reference

Code templates for performance benchmarks by language/framework. These are minimal starting points -- fill in the specifics for your bottleneck. Used by L4 Regression Prevention to generate benchmark specs.

---

## 1. Node.js / TypeScript -- vitest bench

```typescript
// __benchmarks__/{bottleneck-name}.bench.ts
import { bench, describe } from 'vitest'

describe('{Bottleneck Name} Performance', () => {
  // Setup: initialize test data, connections, etc.
  // const db = await setupTestDb()
  // const testData = generateTestData({SIZE})

  bench('{operation name} - baseline', async () => {
    // Call the operation under test
    // await targetFunction(testData)
  }, {
    iterations: 100,
    warmupIterations: 10,
  })

  bench('{operation name} - after optimization', async () => {
    // Call the optimized version for comparison
    // await optimizedFunction(testData)
  }, {
    iterations: 100,
    warmupIterations: 10,
  })
})

// Run: npx vitest bench __benchmarks__/{bottleneck-name}.bench.ts
```

### vitest.config.ts addition

```typescript
export default defineConfig({
  test: {
    benchmark: {
      include: ['**/__benchmarks__/**/*.bench.ts'],
      reporters: ['default'],
    },
  },
})
```

---

## 2. Node.js / TypeScript -- Standalone Timing

```typescript
// benchmarks/{bottleneck-name}.perf.ts
const ITERATIONS = 100
const WARMUP = 10
const BASELINE_MS = {CURRENT_TIME}       // Current measured time
const TARGET_MS = {TARGET_TIME}           // Target after optimization
const FAILURE_THRESHOLD_MS = TARGET_MS * 1.2  // 20% tolerance

async function runBenchmark(): Promise<void> {
  // Setup
  // const testData = prepareData()

  // Warmup
  for (let i = 0; i < WARMUP; i++) {
    // await targetFunction(testData)
  }

  // Measure
  const times: number[] = []
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now()
    // await targetFunction(testData)
    times.push(performance.now() - start)
  }

  // Report
  times.sort((a, b) => a - b)
  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]
  const mean = times.reduce((a, b) => a + b, 0) / times.length

  console.log(`Benchmark: {Bottleneck Name}`)
  console.log(`  Mean: ${mean.toFixed(2)}ms`)
  console.log(`  P50:  ${p50.toFixed(2)}ms`)
  console.log(`  P95:  ${p95.toFixed(2)}ms`)
  console.log(`  P99:  ${p99.toFixed(2)}ms`)
  console.log(`  Baseline: ${BASELINE_MS}ms | Target: ${TARGET_MS}ms | Threshold: ${FAILURE_THRESHOLD_MS}ms`)

  if (p95 > FAILURE_THRESHOLD_MS) {
    console.error(`FAIL: P95 (${p95.toFixed(2)}ms) exceeds threshold (${FAILURE_THRESHOLD_MS}ms)`)
    process.exit(1)
  }
  console.log('PASS')
}

runBenchmark()
// Run: npx tsx benchmarks/{bottleneck-name}.perf.ts
```

---

## 3. Python -- pytest-benchmark

```python
# tests/benchmarks/test_{bottleneck_name}_perf.py
import pytest

BASELINE_MS = {CURRENT_TIME}
TARGET_MS = {TARGET_TIME}
FAILURE_THRESHOLD_MS = TARGET_MS * 1.2

# Setup fixture
@pytest.fixture
def test_data():
    """Prepare test data for the benchmark."""
    # return prepare_data()
    pass

def test_{bottleneck_name}_performance(benchmark, test_data):
    """Benchmark: {Bottleneck Name}

    Baseline: {BASELINE_MS}ms | Target: {TARGET_MS}ms
    """
    result = benchmark.pedantic(
        target_function,       # Replace with actual function
        args=(test_data,),     # Replace with actual args
        iterations=100,
        warmup_rounds=10,
        rounds=5,
    )

    # Assert performance threshold
    mean_ms = benchmark.stats["mean"] * 1000
    assert mean_ms < FAILURE_THRESHOLD_MS, (
        f"Mean {mean_ms:.2f}ms exceeds threshold {FAILURE_THRESHOLD_MS}ms"
    )

# Run: pytest tests/benchmarks/test_{bottleneck_name}_perf.py --benchmark-only
```

### pytest configuration (pyproject.toml)

```toml
[tool.pytest.ini_options]
markers = ["benchmark: performance benchmark tests"]

# Run benchmarks separately from unit tests:
# pytest --benchmark-only      (benchmarks only)
# pytest --benchmark-disable   (skip benchmarks in normal test runs)
```

---

## 4. Python -- Manual Timing

```python
# benchmarks/{bottleneck_name}_perf.py
import time
import statistics
import sys

ITERATIONS = 100
WARMUP = 10
BASELINE_MS = {CURRENT_TIME}
TARGET_MS = {TARGET_TIME}
FAILURE_THRESHOLD_MS = TARGET_MS * 1.2

def run_benchmark():
    # Setup
    # test_data = prepare_data()

    # Warmup
    for _ in range(WARMUP):
        pass  # target_function(test_data)

    # Measure
    times = []
    for _ in range(ITERATIONS):
        start = time.perf_counter()
        # target_function(test_data)
        elapsed_ms = (time.perf_counter() - start) * 1000
        times.append(elapsed_ms)

    # Report
    times.sort()
    p50 = times[len(times) // 2]
    p95 = times[int(len(times) * 0.95)]
    p99 = times[int(len(times) * 0.99)]
    mean = statistics.mean(times)

    print(f"Benchmark: {{Bottleneck Name}}")
    print(f"  Mean: {mean:.2f}ms")
    print(f"  P50:  {p50:.2f}ms")
    print(f"  P95:  {p95:.2f}ms")
    print(f"  P99:  {p99:.2f}ms")
    print(f"  Baseline: {BASELINE_MS}ms | Target: {TARGET_MS}ms | Threshold: {FAILURE_THRESHOLD_MS}ms")

    if p95 > FAILURE_THRESHOLD_MS:
        print(f"FAIL: P95 ({p95:.2f}ms) exceeds threshold ({FAILURE_THRESHOLD_MS}ms)")
        sys.exit(1)
    print("PASS")

if __name__ == "__main__":
    run_benchmark()

# Run: python benchmarks/{bottleneck_name}_perf.py
```

---

## 5. Go -- testing.B

```go
// {bottleneck_name}_bench_test.go
package yourpackage

import (
	"testing"
	"time"
)

const (
	baselineMs        = {CURRENT_TIME}
	targetMs          = {TARGET_TIME}
	failureThresholdMs = float64(targetMs) * 1.2
)

func BenchmarkBottleneckName(b *testing.B) {
	// Setup
	// testData := prepareData()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// targetFunction(testData)
	}
}

// Threshold test -- fails if too slow
func TestBottleneckNamePerformance(t *testing.T) {
	// Setup
	// testData := prepareData()

	iterations := 100
	var totalDuration time.Duration

	// Warmup
	for i := 0; i < 10; i++ {
		// targetFunction(testData)
	}

	// Measure
	for i := 0; i < iterations; i++ {
		start := time.Now()
		// targetFunction(testData)
		totalDuration += time.Since(start)
	}

	meanMs := float64(totalDuration.Milliseconds()) / float64(iterations)
	t.Logf("Mean: %.2fms (baseline: %dms, target: %dms, threshold: %.0fms)",
		meanMs, baselineMs, targetMs, failureThresholdMs)

	if meanMs > failureThresholdMs {
		t.Errorf("Mean %.2fms exceeds threshold %.0fms", meanMs, failureThresholdMs)
	}
}

// Run benchmark: go test -bench=BenchmarkBottleneckName -benchtime=5s
// Run threshold: go test -run=TestBottleneckNamePerformance -v
```

---

## 6. Rust -- criterion

```rust
// benches/{bottleneck_name}.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn benchmark_bottleneck_name(c: &mut Criterion) {
    // Setup
    // let test_data = prepare_data();

    c.bench_function("{bottleneck_name}", |b| {
        b.iter(|| {
            // target_function(black_box(&test_data))
        })
    });
}

criterion_group!(benches, benchmark_bottleneck_name);
criterion_main!(benches);

// Cargo.toml addition:
// [[bench]]
// name = "{bottleneck_name}"
// harness = false
//
// [dev-dependencies]
// criterion = { version = "0.5", features = ["html_reports"] }

// Run: cargo bench --bench {bottleneck_name}
```

### Rust -- threshold assertion test

```rust
// tests/{bottleneck_name}_perf.rs
use std::time::Instant;

const ITERATIONS: usize = 100;
const WARMUP: usize = 10;
const BASELINE_MS: f64 = {CURRENT_TIME} as f64;
const TARGET_MS: f64 = {TARGET_TIME} as f64;
const FAILURE_THRESHOLD_MS: f64 = TARGET_MS * 1.2;

#[test]
fn test_bottleneck_name_performance() {
    // Setup
    // let test_data = prepare_data();

    // Warmup
    for _ in 0..WARMUP {
        // target_function(&test_data);
    }

    // Measure
    let mut times = Vec::with_capacity(ITERATIONS);
    for _ in 0..ITERATIONS {
        let start = Instant::now();
        // target_function(&test_data);
        times.push(start.elapsed().as_secs_f64() * 1000.0);
    }

    times.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let p95 = times[(times.len() as f64 * 0.95) as usize];
    let mean: f64 = times.iter().sum::<f64>() / times.len() as f64;

    println!("Mean: {mean:.2}ms | P95: {p95:.2}ms | Threshold: {FAILURE_THRESHOLD_MS:.0}ms");
    assert!(
        p95 < FAILURE_THRESHOLD_MS,
        "P95 ({p95:.2}ms) exceeds threshold ({FAILURE_THRESHOLD_MS:.0}ms)"
    );
}

// Run: cargo test test_bottleneck_name_performance -- --nocapture
```

---

## 7. Generic -- Language-Agnostic Timing Wrapper

Pseudocode pattern applicable to any language:

```
CONSTANTS:
  ITERATIONS = 100
  WARMUP = 10
  BASELINE_MS = {current measured time}
  TARGET_MS = {target after optimization}
  FAILURE_THRESHOLD_MS = TARGET_MS * 1.2

FUNCTION run_benchmark():
  setup test data and dependencies

  // Warmup - populate caches, JIT compile
  REPEAT WARMUP times:
    call_target_operation()

  // Measure
  times = empty list
  REPEAT ITERATIONS times:
    start = high_resolution_timer()
    call_target_operation()
    times.append(elapsed_since(start))

  // Analyze
  sort(times)
  p50 = times[length * 0.50]
  p95 = times[length * 0.95]
  p99 = times[length * 0.99]
  mean = sum(times) / length

  // Report
  print "Mean: {mean}ms | P50: {p50}ms | P95: {p95}ms | P99: {p99}ms"
  print "Baseline: {BASELINE_MS}ms | Target: {TARGET_MS}ms"

  // Assert
  IF p95 > FAILURE_THRESHOLD_MS:
    FAIL "P95 exceeds threshold"
  ELSE:
    PASS
```

### Key Principles

1. **Always warmup** -- JIT compilers, caches, and connection pools need warmup iterations
2. **Use high-resolution timers** -- `performance.now()`, `time.perf_counter()`, `time.Now()`, `Instant::now()`
3. **Measure P95, not just mean** -- mean hides outliers; P95 catches real user experience
4. **20% tolerance on threshold** -- accounts for CI environment variance vs local benchmarks
5. **Separate from unit tests** -- benchmarks should run on a dedicated step or schedule, not on every commit

---

## CI Integration Patterns

### GitHub Actions

```yaml
# .github/workflows/benchmarks.yml
name: Performance Benchmarks
on:
  pull_request:
    types: [opened, synchronize]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run benchmarks
        run: |
          # Replace with your language-specific command
          npm run bench          # Node.js
          # pytest --benchmark-only  # Python
          # go test -bench=. ./...   # Go
      - name: Compare with baseline
        if: github.event_name == 'pull_request'
        run: |
          # Compare current results with main branch baseline
          # Fail PR if regression > threshold
```

### GitLab CI

```yaml
benchmark:
  stage: test
  script:
    - npm run bench  # or language-appropriate command
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_PIPELINE_SOURCE == "schedule"
  artifacts:
    reports:
      performance: benchmark-results.json
```
