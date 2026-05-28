# Skill Execution — Build Manifest (2026-05-28)

> Generated from `ROADMAP-skill-execution-2026-05-28.md`. Attach to `/pickup` or `/build` for quick context.

## Reference Files

- **Roadmap:** `specs/roadmaps/ROADMAP-skill-execution-2026-05-28.md`
- **Skill-roadmap report:** `reports/skill-roadmap/sr-002-2026-05-28.md`
- **CLAUDE.md** — failsafe map + SDK-shape rule
- **ADR 019** — Mollie primary
- **specs/todo/** — 3 pending specs

## Execution Queue

### Wave 0: Audit (SEQUENTIAL — stop/go gates)

| # | Skill / Command | Action | Target | Status |
|---|---|---|---|---|
| W0.1 | `/code-review high` | RUN | HEAD (0097b2e) | TODO |
| W0.2 | `/crystal-ball` | RUN | failure-tracker + manage chain | TODO |
| W0.3 | `/security-review` | RUN | /api/mollie-manage/* + tokens | TODO |
| W0.4 | `/verify` | RUN | admin dashboard + manage endpoints | TODO |

### Wave 1: Map (PARALLEL agent-teams x3)

| # | Skill / Command | Action | Target | Status |
|---|---|---|---|---|
| W1.1 | `/task-radar deep` | RUN | session + specs/todo | TODO |
| W1.2 | `/exploding-pen deep` | RUN | app/ + lib/ | TODO |
| W1.3 | `/unified-field-theory` | RUN | payment handlers + webhook routes | TODO |

### Wave 2: Document (SEQUENTIAL)

| # | Skill / Command | Action | Target | Status |
|---|---|---|---|---|
| W2.1 | `/architecture-decision-tracker` | RUN | ADR 019 + SDK-shape rule | TODO |

### Wave 3: Build (CONDITIONAL — gated on W0/W1)

| # | Skill / Command | Action | Target | Status |
|---|---|---|---|---|
| W3.1 | `/quick-plan deep` | RUN | VAT-OSS automation | TODO |
| W3.2 | `/quick-plan deep` | RUN | gift-recipient threading | TODO |
| W3.3 | `/quick-plan` | RUN | dunning dashboard | TODO |

### Wave 4: Validate (PARALLEL agent-teams x3)

| # | Skill / Command | Action | Target | Status |
|---|---|---|---|---|
| W4.1 | `/verify` | RUN | re-mandate flow | TODO |
| W4.2 | `/verify` | RUN | failure-escalation ladder | TODO |
| W4.3 | `/run` | RUN | admin dashboard | TODO |

### Wave 5: Maintain (PARALLEL terminal x5)

| # | Skill / Command | Action | Target | Status |
|---|---|---|---|---|
| W5.1 | `/performance-optimizer` | RUN | admin/analytics/subscriptions | TODO |
| W5.2 | `/resonance-finder deep` | RUN | tunables across new lib files | TODO |
| W5.3 | `/schedule create` | RUN | weekly MRR digest | TODO |
| W5.4 | `/philosophy-prompting` | RUN | SDK-any-cast bad-habit hook | TODO |
| W5.5 | `/simplify` | RUN | apply W0.1 findings | TODO |

## Notes

- **W0 is a sequential gate.** Each step's output decides whether to proceed. A P0 in W0.1 stops the wave until it's fixed.
- **W1 + W4 + W5 use parallel orchestration.** W1 + W4 = agent-teams (light enough to share context). W5 = separate terminals (heavy skills).
- **W3 is conditional.** If W0 + W1 produce no escalating specs, skip W3 entirely.
- **The first command is `/code-review high`.** That's the only thing to do right now.
