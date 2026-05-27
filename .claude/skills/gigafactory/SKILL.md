---
name: "gigafactory"
description: >-
  Meta-generation skill that builds generators, factories, and scaffolders
  instead of individual code artifacts. Config Discovery (Step 0) inventories
  YAML configs AND page template systems (PageShell, UniversalPageRenderer),
  enforcing template-first page creation. Use when: (1) Building repeatable
  patterns (CRUD, components, services, migrations), (2) Automating code
  generation with config-driven factories, (3) Assessing one-off vs generator,
  (4) YAML-config-first compliance review, (5) UX/UI roast (screenshot every
  page, score 5 criteria), (6) Page migration generators (raw-layout to
  config-driven templates via page-template-audit.yaml).
argument-hint: "quick | full | generate <config-file> | roast [section] | audit [section]"
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
---

# Gigafactory

> *"Don't build the product. Build the machine that builds the product."* — Elon Musk

Gigafactory is a meta-generation skill. When a user asks you to build something, your first job is NOT to build it — it's to determine whether you should build a **generator** that can produce it (and all its siblings) from a config file.

**Think meta. Think factory. Think replication.**

---

## Disambiguation: Gigafactory vs. Template-Factory

| | Gigafactory | Template-Factory |
|---|---|---|
| **Purpose** | Creates NEW generators from scratch | Deploys EXISTING patterns from a curated registry |
| **Input** | A user request + project context | A template name from `D:\Projects\Templates\` |
| **Output** | A generator (config schema + templates + example) | Deployed code from a pre-built template |
| **When to use** | "I need to build many things like this" | "I need this specific known pattern deployed" |
| **Analogy** | Building a car factory | Ordering a car from the factory |

If the user wants to deploy an existing IndyDevDan-style pattern, use `/template-factory`.
If the user wants to create a new generator/factory/scaffolder, use `/gigafactory`.

---

## Architecture

### 5-Step System (Step 0 + 4 Layers)

| Step | Name | Weight | Description |
|------|------|--------|-------------|
| S0 | Config Discovery | -- | Inventory existing YAML configs, loaders, and patterns in the project BEFORE designing anything new. Produces a Config Landscape baseline. Runs in ALL modes. |
| L1 | Generator Detection | 30% | Assess replication potential. Cross-reference against Config Landscape — recommend extending existing patterns before creating new ones. |
| L2 | Factory/Generator Design | 35% | Design config schema, template structure, generation approach. For each design, specify EXTEND (existing pattern) vs NEW (justify why existing is insufficient). |
| L3 | Scale Test Validation | 20% | Generate 3 config variations (minimal/typical/maximal), run the generator, validate outputs for completeness, distinctness, parameterization, syntax, and consistency. Hardcoding audit. |
| L4 | Documentation & Packaging | 15% | Produce README, example configs, JSON Schema, self-contained generator package in `generators/{name}/`. |

**Composite scoring (full, L1-L4):**
```
composite = (L1 x 0.30) + (L2 x 0.35) + (L3 x 0.20) + (L4 x 0.15)
```

**Composite scoring (default, L1-L2 only):**
```
composite = (L1 x 0.4615) + (L2 x 0.5385)
```
When L3/L4 are not run (default mode), their weight redistributes proportionally to L1 and L2.

**Composite scoring (generate, L2-L3 only):**
```
composite = (L2 x 0.636) + (L3 x 0.364)
```
When L1/L4 are not run (generate mode), their weight redistributes proportionally to L2 and L3.

---

## Mode Matrix

| Mode | Argument | Layers | Saves Report | Description |
|------|----------|--------|--------------|-------------|
| Quick | `quick` | L1 | No (unless non-one-off) | Fast replication assessment — "should this be a generator?" |
| Default | *(none)* | L1 + L2 | Yes | Detect replication potential + design the generator |
| Full | `full` | L1 + L2 + L3 + L4 | Yes | Complete pipeline: detect + design + validate + document |
| Generate | `generate <config-file>` | L2 + L3 | Yes | Run an existing generator design against a new config |
| Roast | `roast [section]` | S0 + Roast Protocol | Yes | UX/UI audit: screenshot every page, score against 5 criteria, generate brutal findings report |

---

## Argument Routing

| Input Pattern | Action |
|---------------|--------|
| `/gigafactory` | Default mode: L1 detection + L2 design. Prompt user for what they want to build if not obvious from context. |
| `/gigafactory quick` | Quick mode: L1 detection only. Output assessment to terminal. No report saved (unless verdict is not one-off). |
| `/gigafactory full` | Full mode: L1 detection + L2 design + L3 validation + L4 documentation. Full pipeline with composite scoring. |
| `/gigafactory generate <path>` | Generate mode: Load existing generator blueprint from most recent report. Apply provided config (L2). Validate output (L3). |
| `/gigafactory roast` | Roast mode: Full platform UX/UI audit. Screenshots all sidebar pages, scores against 5 criteria, generates brutal findings report. |
| `/gigafactory roast <section>` | Targeted roast: Audit only pages in the specified sidebar section (e.g., `commercial`, `knowledge-base`, `quality`). |
| `/gigafactory audit` | Alias for `roast`. Same behavior. |
| `/gigafactory audit <section>` | Alias for `roast <section>`. |

---

## Reference Files

| File | Purpose | When to Read |
|------|---------|-------------|
| `references/config-discovery-patterns.md` | Config pattern types (6 patterns incl. Page Template System), loader identification, cross-reference decision tree | During Step 0 Config Discovery — categorize existing configs, detect page template systems, decide EXTEND vs NEW |
| `references/generator-patterns.md` | Common generator patterns by type and language | During L1 pattern recognition — match the user's request against known patterns |
| `references/config-schema-guide.md` | Best practices for config schema design | During L2 config schema design — ensure quality config schemas |
| `references/validation-protocol.md` | Scale test variation strategies, validation checklist, hardcoding detection patterns | During L3 validation — follow the variation protocol and hardcoding audit procedures |

---

## Execution

All execution logic lives in `commands/gigafactory.md`. Route to it after argument parsing.
