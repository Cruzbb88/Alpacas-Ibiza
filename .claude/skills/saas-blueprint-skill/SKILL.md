---
name: saas-blueprint
description: End-to-end system design methodology for multi-tenant SaaS platforms. Guides the complete journey from requirements gathering through specification, architecture, methodology adaptation, and Claude Code handoff. Use when starting a new SaaS project, designing a multi-tenant platform, creating a software specification (Blueprint), preparing for AI-assisted development, or generating a CLAUDE.md context file. Triggers on phrases like "new SaaS project", "system design", "software specification", "Blueprint document", "multi-tenant architecture", "prepare for Claude Code", or "design methodology".
argument-hint: "<phase N | audit | status | full>"
---

# SaaS Blueprint Methodology

A systematic approach to designing multi-tenant SaaS platforms, producing a complete specification and Claude Code context in 6 phases.

## Modes

| Mode | Arg | Phases Run | Saves Report | Description |
|------|-----|------------|-------------|-------------|
| Phase | `phase <N>` | Single phase | No | Run a specific phase (1-6) |
| Audit | `audit` | Readiness only | Yes | Score an existing Blueprint for completeness |
| Status | `status` | None | No | Show current phase progress from Omni-Cortex |
| Full | `full` | All 1-6 | Yes | Run the complete methodology end-to-end |

**Default (no argument):** Resume from the last active phase via Omni-Cortex, or start Phase 1 if no prior context.

## Layered Architecture

Phases map to two workflow layers:

- **L1 — Build (Phases 1-3):** Discovery → Specification → Architecture. Produces the Blueprint and tech decisions.
- **L2 — Validate (Phases 4-6):** Readiness → Methodology → Handoff. Scores completeness, adapts methodology, produces CLAUDE.md.

### Readiness Scoring (Phase 4)

Each Blueprint section scored 1-5:

| Score | Meaning |
|-------|---------|
| 5 | Implementation-ready |
| 4 | Minor clarifications needed |
| 3 | Gaps requiring resolution |
| 2 | Significant gaps, would cause rework |
| 1 | Missing or incomplete |

**Overall readiness = weighted average of section scores (as %). Proceed at >= 70%. Below 70%, return to Phase 2.**

## Session Continuity (Omni-Cortex)

This methodology spans 12-20+ sessions. Use Omni-Cortex to maintain context:

**At phase completion:**
```
cortex_remember:
  content: "SaaS Blueprint [Project]: Completed Phase [N]. Key outputs: [summary]. Open questions: [list]. Next: Phase [N+1]."
  tags: ["saas-blueprint", "{project-name}", "phase-{N}"]
  type: "decision"
```

**At session start:**
```
cortex_recall: "saas-blueprint {project-name}"
```

**Link phase outputs:**
```
cortex_link_memories: source=[phase-N-memory-id], target=[phase-N+1-memory-id], relationship="feeds-into"
```

## Reference Guide

Load references as needed — do not load all at once:

- **Starting a new project or running a phase?** Read `references/phase-guide.md` — the 6-phase workflow with quality gates
- **Writing the Blueprint?** Read `references/blueprint-template.md` — section-by-section template (§1-§14)
- **Generating CLAUDE.md?** Read `references/claude-md-template.md` — optimised context file template with token budget
- **Evaluating a methodology?** Read `references/methodology-evaluation.md` — 12-dimension assessment framework
- **Making architecture decisions?** Read `references/architecture-decisions.md` — decision tiers, multi-tenancy guide, checklists

## Core Principles

1. **Specification before code.** No implementation without a written requirement.
2. **Questions before assumptions.** Ambiguity is resolved by asking, not guessing.
3. **Constraints before features.** Define what the system must NOT do before what it should do.
4. **Multi-tenancy is security, not a feature.** Tenant isolation is architectural, enforced at the data layer.
5. **Every infrastructure choice must work everywhere the system deploys.** Abstract providers, not business logic.
6. **Context window is precious.** Every token in CLAUDE.md must earn its place.

## Phase Summary

| Phase | Name | Input | Output |
|-------|------|-------|--------|
| 1 | Discovery | Stakeholder interviews, docs, data | Requirements inventory, entity map, open questions |
| 2 | Specification | Requirements inventory | Blueprint.md (complete spec) |
| 3 | Architecture | Blueprint.md | Tech stack, data model, API design, infra plan |
| 4 | Readiness | Blueprint + Architecture | Readiness score, gap list, phase roadmap |
| 5 | Methodology | External frameworks | Evaluation report, adapted CLAUDE.md |
| 6 | Handoff | All above | CLAUDE.md, implementation guide, project scaffold |

Read `references/phase-guide.md` for complete workflow with decision points and quality gates.

## Quick Start

```
I'm starting a new SaaS project for [domain]. Here's what I know so far:
- Users: [who]
- Core problem: [what]
- Existing data/docs: [uploaded files]

Let's start Phase 1 Discovery.
```
