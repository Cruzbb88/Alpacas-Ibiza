---
name: "matrix-reload"
description: >
  Strategic partial rebuild planner. Maps codebase pain, isolates the reload zone,
  extracts interface contracts, designs clean rebuilds, and plans hot swaps with rollback.
  Analyzes bug density, churn rate, complexity, workaround patterns, and coupling density
  to find the 20% of code causing 80% of pain, then draws a hard boundary around the
  reload zone, maps every interface crossing the boundary, designs a replacement architecture,
  and generates a step-by-step transition plan with rollback at every step.
  Use when: (1) Code is beyond incremental improvement, (2) You need to identify the
  worst parts of a codebase systematically, (3) You want to plan a controlled partial
  rebuild, (4) You need to convince stakeholders which code to rewrite, (5) You suspect
  technical debt is concentrated in a small area, (6) You need interface contracts before
  rebuilding, (7) You want a safe hot swap plan with rollback guarantees.
  NOT for: incremental refactoring (use /refactor), greenfield rewrites, or cosmetic
  cleanup. Matrix Reload is strategic surgery, not incremental therapy.
argument-hint: "quick | zone <path> | deep | swap | history"
model: "opus"
---

# Matrix Reload -- Strategic Partial Rebuild Planner

**Philosophy:** Don't destroy the system. Reload it with better parameters.

Matrix Reload identifies the code causing the most pain, draws an explicit boundary around it, maps every interface crossing that boundary, designs a clean replacement, and plans a safe hot swap -- all while preventing scope creep from consuming the entire project.

## When to Use Matrix Reload vs /refactor

| Dimension | /refactor | Matrix Reload |
|-----------|-----------|---------------|
| **Scope** | Files and functions | Entire zones and subsystems |
| **Behavior** | Preserves ALL behavior | Preserves external interfaces, rebuilds internals |
| **Architecture** | Works within existing architecture | May redesign internals of the zone |
| **When** | Code works but is messy | Code is beyond incremental improvement |
| **Risk** | Low -- behavior-preserving | Medium -- controlled rebuild with boundary |
| **Output** | Refactored code | Reload plan with scope boundary |

**Rule of thumb:** If you can fix it file-by-file without changing interfaces, use `/refactor`. If the pain is systemic and concentrated, use Matrix Reload.

---

## Architecture

### 5-Layer System (Equal 20% Weights)

| Layer | Name | Weight | Status | Description |
|-------|------|--------|--------|-------------|
| L1 | Pain Mapping | 20% | Active | Bug density, churn, complexity, workarounds, coupling |
| L2 | 80/20 Isolation | 20% | Active | Find the 20% causing 80% of pain, draw boundary |
| L3 | Interface Preservation Contracts | 20% | Active | Map and lock external interfaces crossing zone boundary |
| L4 | Clean Rebuild Design | 20% | Active | Design the replacement architecture for the zone internals |
| L5 | Hot Swap Plan with Rollback | 20% | Active | Plan the swap with rollback safety at every step |

**Composite scoring:**
```
composite = (L1 x 0.20) + (L2 x 0.20) + (L3 x 0.20) + (L4 x 0.20) + (L5 x 0.20)
```

When some layers are not run (e.g., default mode only runs L1+L2), redistribute weight equally among available layers.

**Score interpretation:**
- 80-100: Excellent -- pain is well-mapped and zone is cleanly isolatable
- 60-79: Good -- clear pain clusters, some boundary complexity
- 40-59: Fair -- pain is distributed or boundary is messy, proceed with caution
- 0-39: Critical -- pain is too distributed for partial rebuild, consider /refactor instead

### Mode Matrix

| Mode | Arg | Layers | Saves Report | Description |
|------|-----|--------|-------------|-------------|
| Quick | `quick` | L1 | No | Pain map only -- terminal output, no report |
| Default | *(none)* | L1 + L2 | Yes | Pain map + reload zone isolation |
| Zone | `zone <path>` | L2 scoped | No | Analyze isolation feasibility for a specific path |
| Deep | `deep` | L1-L5 | Yes | Full analysis: pain map, isolation, contracts, rebuild design, hot swap plan |
| Swap | `swap` | L5 | No | Hot swap execution plan from an existing deep report's contracts |
| History | `history` | -- | No | Show past reload reports with composite score trends |

### Argument Routing

| Input Pattern | Action |
|--------------|--------|
| *(no args)* | Default mode: run L1 + L2, save report |
| `quick` | Quick mode: run L1 only, terminal output |
| `zone <path>` | Zone mode: run L2 scoped to `<path>`, analyze isolability |
| `deep` | Deep mode: run L1 + L2 + L3 + L4 + L5, save full report |
| `swap` | Swap mode: load most recent deep report, generate L5 hot swap plan |
| `swap N` | Swap mode: load report N, generate L5 hot swap plan |
| `history` | History mode: display past reports with score trends |

---

## Execution

Read and follow `commands/matrix-reload.md` for all execution logic.

---

## References

| File | Contains | Read When |
|------|----------|-----------|
| `references/pain-heuristics.md` | Pain detection patterns, grep patterns, normalization rules, false positive filtering | Running L1 Pain Mapping |
| `references/isolation-patterns.md` | Boundary drawing strategies, dependency analysis, scope creep prevention, Mermaid templates | Running L2 80/20 Isolation |
| `references/interface-contracts.md` | Contract extraction patterns per language, test stub templates, criticality assessment | Running L3 Interface Contracts |
| `references/hot-swap-strategies.md` | Feature flag patterns, parallel running strategies, rollback templates, scope enforcement | Running L5 Hot Swap Plan |

---

## SCOPE CREEP WARNING

```
+============================================================+
|                    SCOPE CREEP ALERT                        |
|                                                            |
|  The reload zone boundary is a HARD LINE.                  |
|                                                            |
|  - Files INSIDE the zone: analyze, plan, rebuild           |
|  - Files OUTSIDE the zone: DO NOT TOUCH                    |
|                                                            |
|  If you feel the urge to modify something outside the      |
|  reload zone, STOP. Reassess. Scope creep is the #1        |
|  killer of rewrites.                                       |
|                                                            |
|  The boundary exists to protect you. Respect it.           |
+============================================================+
```

This warning MUST appear in every report and every terminal output that defines a reload zone.

---

## Reports

Reports are saved to: `reports/matrix-reload/mr-NNN-YYYY-MM-DD.md`

- Report directory is relative to the project where the skill is RUN (not where the skill is installed)
- Reports are numbered sequentially (mr-001, mr-002, etc.)
- Each report includes YAML frontmatter with scores, metrics, and trend data
- Deep mode reports include additional frontmatter: contracts_mapped, contracts_high_criticality, interface_score, rebuild_score, hot_swap_score, swap_steps, rollback_coverage
- When 2+ reports exist, include a score trend table at the bottom
