# Skill Execution — Build Manifest

> Generated from ROADMAP-skill-execution.md. Attach to /pickup or /build for quick context.

## Reference Files
- **Roadmap:** specs/roadmaps/ROADMAP-skill-execution.md
- **Project CLAUDE.md:** CLAUDE.md
- **Practices:** PRACTICES.md (Rule 11 = preflight gate)
- **Plan:** PLAN.md
- **Owner gaps:** OWNER_INPUT_NEEDED.md

## Execution Queue

### Wave 0: Audit (PARALLEL terminal x4)

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W0.1 | /crystal-ball | RUN | full | TODO |
| W0.2 | /exploding-pen | RUN | scan | TODO |
| W0.3 | /probability-storm | RUN | "Adoption Y/N" | TODO |
| W0.4 | /matrix-reload | RUN | app/[locale]/ | TODO |

### Wave 1: Map (PARALLEL agent-teams x3)

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W1.1 | /unified-field-theory | RUN | app/ + lib/ | TODO |
| W1.2 | /site-assets | RUN | https://alpacasibiza.com | TODO |
| W1.3 | /devtools-extract | RUN | FareHarbor admin | TODO |

### Wave 2: Document (SEQUENTIAL)

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W2.1 | /architecture-decision-tracker | RUN | PLAN.md + PRACTICES.md | TODO |
| W2.2 | /sipoc | RUN | booking + Alcaca flows | TODO |

### Wave 3: Build (PARALLEL agent-teams x4)

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W3.1 | /quick-plan | RUN | OWNER_INPUT ⚠️ | TODO |
| W3.2 | /build | RUN | specs/todo/ | TODO (W3.1 dep) |
| W3.3 | /gigafactory | RUN | lib/data/alpacas.ts | TODO |
| W3.4 | /agent-teams | RUN | save team config | TODO |

### Wave 4: Validate (PARALLEL terminal x2)

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W4.1 | /performance-optimizer | RUN | /tours, /alpacas | TODO |
| W4.2 | /resonance-finder | RUN | lib/turnstile.ts, lib/fetch.ts | TODO |

### Wave 5: Maintain (SEQUENTIAL)

| # | Skill / Command | Action | Target | Status |
|---|----------------|--------|--------|--------|
| W5.1 | /handoff | RUN | end-of-session | TODO |
| W5.2 | /kit-sync | RUN | local vs kit repo | TODO |
| W5.3 | /task-radar | RUN | full | TODO |

## Notes
- **Cortex degraded mode:** all skills that would write to Cortex write to local `reports/` instead per project rule. No memory leak across sessions until policy is resolved.
- **PRACTICES Rule 11 (preflight gate):** every Wave 3/4 step must output the 3-bullet preflight (Goal / Assumptions / Test) before running.
- **W3.2 dependency:** must wait for W3.1 specs to land before /build runs.
- **Max concurrency:** 4 agents (matches Wave 3 width).
