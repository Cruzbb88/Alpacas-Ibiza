---
name: "exploding-pen"
description: "Capability gap scanner and micro-gadget designer. Finds what your codebase is missing and designs <20-line fixes. Use when looking for missing features or micro-improvements to inject, or when a user asks what small additions could make a codebase more capable."
argument-hint: "quick | scan <category> | deep | inject <gadget-id> | inventory | history"
---

# Exploding Pen

> Maximum impact, minimum footprint. Hidden power in plain sight.

Scans codebases for missing capabilities and designs self-contained micro-gadgets (each under 20 lines) to fill the gaps. Plans precise injection points and tracks all gadgets across runs. Think of it as surgical capability injection -- not refactoring, not architecture redesign, just precisely placed hidden power.

## Architecture

| Layer | Name | Weight | Status |
|-------|------|--------|--------|
| L1 | Capability Gap Scan | 35% | Active |
| L2 | Gadget Design | 30% | Active |
| L3 | Injection Plan | 20% | Active |
| L4 | Gadget Inventory | 15% | Active |

**Composite scoring:** `composite = (L1 x 0.35) + (L2 x 0.30) + (L3 x 0.20) + (L4 x 0.15)`

When running in default mode (L1 + L2 only), normalize by dividing by the sum of active weights:
`composite = ((L1 x 0.35) + (L2 x 0.30)) / 0.65`

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Description |
|------|-----|--------|-------------|-------------|
| Quick | `quick` | L1 | No | Fast gap scan only -- outputs to terminal |
| Default | *(none)* | L1 + L2 | Yes | Scan gaps + design gadgets, save report |
| Scan | `scan <category>` | L1 scoped | No | Scan one gap category only |
| Deep | `deep` | L1-L4 | Yes | Full analysis with injection plan + inventory update |
| Inject | `inject <gadget-id>` | L3 | No | Execute injection of a specific designed gadget |
| Inventory | `inventory` | L4 | No | Show cumulative gadget tracker and deployment status |
| History | `history` | -- | No | Show report history and score trends |

## Argument Routing

| Input Pattern | Action |
|---------------|--------|
| *(no args)* | Default mode: L1 scan + L2 gadget design, save report |
| `quick` | Quick mode: L1 scan only, terminal output, no report |
| `scan retry` | Scan mode: L1 filtered to "retry" category only |
| `scan circuit` | Scan mode: L1 filtered to "circuit breaking" only |
| `scan rate` | Scan mode: L1 filtered to "rate limiting" only |
| `scan cache` | Scan mode: L1 filtered to "caching" only |
| `scan timeout` | Scan mode: L1 filtered to "timeout handling" only |
| `scan error` | Scan mode: L1 filtered to "error recovery" only |
| `scan input` | Scan mode: L1 filtered to "input validation" only |
| `scan logging` | Scan mode: L1 filtered to "logging/observability" only |
| `scan graceful` | Scan mode: L1 filtered to "graceful degradation" only |
| `scan connection` | Scan mode: L1 filtered to "connection pooling" only |
| `deep` | Deep mode: L1-L4 full analysis with sub-agents for L3+L4 |
| `inject <gadget-id>` | Inject mode: execute injection of a specific gadget from latest report |
| `inventory` | Inventory mode: display cumulative gadget tracker |
| `history` | History mode: list past reports with composite scores and trend |

## Gap Categories (L1)

The scanner checks against these 10 capability categories:

1. **Retry logic** -- External API calls without retry/backoff
2. **Circuit breaking** -- HTTP clients without circuit breaker patterns
3. **Rate limiting** -- Endpoints or outbound calls with no rate limiting
4. **Caching** -- Pure/idempotent functions with no memoization
5. **Timeout handling** -- Promises/async calls with no timeout protection
6. **Error recovery** -- Service boundaries without error boundary/fallback
7. **Input validation** -- Endpoints accepting user input without validation
8. **Logging/observability** -- Key operations with no structured logging or metrics
9. **Graceful degradation** -- External dependencies with no fallback behavior
10. **Connection pooling** -- DB/HTTP connections created per-request

## References

| File | Purpose | When to Read |
|------|---------|-------------|
| `references/gap-scanner.md` | Detection heuristics, grep patterns, false positive filters | During L1 gap scanning |
| `references/gadget-patterns.md` | Pre-designed gadget patterns by category and language | During L2 gadget design |
| `references/injection-strategies.md` | Injection point identification, wrapping patterns, impact assessment, rollback templates | During L3 injection planning |

## Execution

Follow the instructions in `commands/exploding-pen.md` for full execution logic covering all 4 layers and all 7 modes.

## Gadget Inventory

The cumulative gadget inventory is stored at `reports/exploding-pen/gadget-inventory.md` in the project where the skill is run (not in the skill installation directory). It persists across runs and tracks all gadgets through their lifecycle: designed -> injected -> removed -> superseded.

## Report Format

Reports are saved to `reports/exploding-pen/ep-NNN-YYYY-MM-DD.md` in the project where the skill is run.

```yaml
---
report_number: {NNN}
date: "{YYYY-MM-DD}"
mode: "{quick|default|deep}"
target_path: "{scanned path}"
language: "{primary language detected}"
gaps_found: {N}
gadgets_designed: {N}
gadgets_injected: {N_or_0}
gap_scan_score: {N}
gadget_design_score: {N_or_NA}
injection_plan_score: {N_or_NA}
inventory_score: {N_or_NA}
composite_score: {N}
previous_composite: {N_or_null}
score_delta: "{+/-N_or_dash}"
trend: "{improving|declining|stable|first_run|insufficient_data}"
---
```
