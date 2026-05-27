---
name: unified-field-theory
description: >-
  Cross-system unification analyzer that finds modules solving the same problem in different
  ways and proposes unified abstractions. Catalogs every system by abstract function, detects
  overlaps in problem-solving, and generates unification proposals with risk assessment and
  migration plans. Use when: (1) Suspecting duplicate logic across a codebase, (2) Reviewing
  architecture for redundancy, (3) Planning refactors to consolidate scattered patterns,
  (4) Auditing validation/auth/error-handling/logging consistency, (5) Assessing technical
  debt from organic growth. NOT for spec-level analysis (use /crystal-ball-matrix instead).
argument-hint: "[quick | deep | compare] [target-path]"
tools:
  - Bash
  - Read
  - Grep
  - Glob
  - Task
  - mcp__omni-cortex__cortex_remember
  - mcp__omni-cortex__cortex_recall
model: opus
---

# Unified Field Theory

*"If two systems solve the same problem, there's a unification hiding underneath."* -- inspired by Albert Einstein

Cross-system unification analyzer. Catalogs every module by abstract function, detects overlapping responsibilities, and proposes unified abstractions. Present-facing, code-level analysis (not spec-level -- use `/crystal-ball-matrix` for that).

## 4-Layer Architecture

| Layer | Name | Weight | Purpose |
|-------|------|--------|---------|
| L1 | System Inventory | 25% | Catalog every significant module/system by primary function |
| L2 | Abstract Function Mapping | 25% | Describe what each system DOES in abstract terms (intent, not implementation) |
| L3 | Overlap Detection | 30% | Find systems with overlapping abstract functions, classify severity, generate Mermaid overlap map |
| L4 | Unification Proposals | 20% | Propose unified abstractions with risk assessment, migration plans, and honest "do not unify" verdicts |

## Mode Matrix

| Mode | Arg | Layers | Saves Report | Sub-agents |
|------|-----|--------|-------------|------------|
| Quick | `quick` | L1 | No | No |
| Default | *(none)* | L1 + L2 | Yes | No |
| Deep | `deep` | L1-L4 | Yes | L3, L4 |
| Compare | `compare` | L4 trend | Yes | L4 |

**Note:** `deep` mode runs all 4 layers sequentially (L3 depends on L2, L4 depends on L3). `compare` mode requires 2+ existing reports.

## Argument Parsing

Parse `$ARGUMENTS` for:
1. **Mode**: first positional arg -- `quick`, `deep`, or `compare` (default: standard L1+L2)
2. **Target path**: remaining arg -- scope analysis to a specific directory

```
mode = "default"
target = project_root

if $ARGUMENTS starts with "quick": mode = "quick"
if $ARGUMENTS starts with "deep": mode = "deep"
if $ARGUMENTS starts with "compare": mode = "compare"
remaining args after mode keyword = target path (if provided)
```

## Execution Flow

1. Parse arguments (mode + optional target path)
2. Check for cortex context: `cortex_recall: "unified-field {target}"`
3. Run layers per mode:
   - **quick**: L1 only -> display inventory table -> done (no report)
   - **default**: L1 -> L2 -> compute composite (50/50 weights) -> save report
   - **deep**: L1 -> L2 -> L3 (sub-agent) -> L4 (sub-agent, after L3) -> composite (25/25/30/20 weights) -> save report
   - **compare**: Read previous reports -> build trend dashboard -> overlap resolution tracking -> save report

## Composite Scoring

```
composite = (L1 x 0.25) + (L2 x 0.25) + (L3 x 0.30) + (L4 x 0.20)
```

Weight redistribution when layers are unavailable:
- **Quick mode**: L1 = 100%
- **Default mode**: L1 = 50%, L2 = 50%
- **Deep mode**: All four layers at defined weights
- **N/A layers**: Redistribute weight equally among available layers

Score interpretation (INVERTED -- high score = clean codebase):
- 80-100: Minimal redundancy, well-unified codebase
- 60-79: Some overlaps detected, unification opportunities exist
- 40-59: Significant duplication, multiple unification candidates
- 0-39: Critical redundancy, high unification potential

## Reports

Numbered reports saved to: `reports/unified-field/uft-NNN-YYYY-MM-DD.md`

Report numbering: glob existing reports, extract highest NNN, increment by 1, zero-pad to 3 digits.

YAML frontmatter template and full report structure defined in `commands/unified-field.md`.

## References

- **Function taxonomy**: `references/function-taxonomy.md` -- 14 standard abstract function categories for L2 mapping
- **Command logic**: `commands/unified-field.md` -- full L1 and L2 protocols, report generation, scoring details

## Layer Details

- **L1 (System Inventory)**: Catalogs every module by name, type, primary function, tech, size, and connections. Score reflects structural clarity.
- **L2 (Abstract Function Mapping)**: Maps systems to 14 standard abstract function categories (from `references/function-taxonomy.md`). Detects overlapping responsibilities and overloaded systems.
- **L3 (Overlap Detection)**: Deep-compares overlapping systems from L2. Classifies each as Full Duplication (>80% similar), Partial Overlap (40-80%), Conceptual Similarity (<40%), or False Positive. Generates Mermaid overlap map with color-coded edges.
- **L4 (Unification Proposals)**: Assesses unification feasibility for Full Duplications and Partial Overlaps. Produces Unify / Partially Unify / Do Not Unify verdicts with risk assessment, unified interface design, and migration plans (LOW/MEDIUM risk only). "Do not unify" is a first-class output.
- **Compare mode**: Reads 2+ existing reports, builds score trend dashboard, tracks which overlaps were resolved between runs.
