---
project: "alpaca-farm-redesign"
type: "skill-execution"
created: "2026-05-28"
updated: "2026-05-28"
status: "PLANNING"
domain: null
capabilities_total: 19
essential_count: 8
recommended_count: 11
waves: 6
steps: 19
---

# Roadmap — Skill Execution: alpaca-farm-redesign

> Six waves cover Audit → Map → Document → Build → Validate → Maintain. Wave 0 (Audit) is sequential because the findings from `crystal-ball` and `code-review` feed every downstream step. Waves 1, 4, 5 parallelise via agent-teams (independent items). Wave 3 (Build) is conditional on Wave 0/1 surfacing concrete work; skip if nothing escalates from those passes.

## Total Steps: 19 | Completed: 0 | Remaining: 19

## Wave Checklist

- [ ] **Wave 0: Audit** (4 steps, SEQUENTIAL — each feeds the next)
  - [ ] `W0.1` /code-review high — Re-review the 4-system commit (`0097b2e`)
  - [ ] `W0.2` /crystal-ball — Design-coherence audit of failure-tracker → escalation → manage email chain
  - [ ] `W0.3` /security-review — HMAC token scopes + replay surface on /api/mollie-manage/*
  - [ ] `W0.4` /verify — Run /admin/analytics/subscriptions + /api/mollie-manage end-to-end
- [ ] **Wave 1: Map** (3 steps, PARALLEL agent-teams x3)
  - [ ] `W1.1` /task-radar deep — Surface every unfinished item across session + specs/todo
  - [ ] `W1.2` /exploding-pen deep — Find <20-line capability gaps (the kind that hid the missing 'pending' status)
  - [ ] `W1.3` /unified-field-theory — Mollie+Stripe handler/webhook/email overlap detection
- [ ] **Wave 2: Document** (1 step, SEQUENTIAL)
  - [ ] `W2.1` /architecture-decision-tracker — Capture ADRs 019 (Mollie primary) + the post-2026-05-28 SDK-shape rule + decision-decay radar
- [ ] **Wave 3: Build** (3 steps, SEQUENTIAL — depends on outputs from W0/W1)
  - [ ] `W3.1` /quick-plan deep — Plan for VAT automation (Stripe Tax or hand-rolled OSS tracking)
  - [ ] `W3.2` /quick-plan deep — Plan for gift-recipient threading (recipient gets welcome + certificate)
  - [ ] `W3.3` /quick-plan — Plan for owner-side dunning dashboard (visualise the failure-escalation ladder)
- [ ] **Wave 4: Validate** (3 steps, PARALLEL agent-teams x3)
  - [ ] `W4.1` /verify — Re-mandate flow end-to-end (existing sub → token → Mollie checkout → mandate patched)
  - [ ] `W4.2` /verify — Failure-escalation ladder (mock 3 consecutive Mollie failures, confirm escalated copy)
  - [ ] `W4.3` /run — Hot-test the admin dashboard with 250+ dummy subscriptions
- [ ] **Wave 5: Maintain** (5 steps, PARALLEL terminal x5)
  - [ ] `W5.1` /performance-optimizer — Critical path on /admin/analytics/subscriptions (2000-row iteration)
  - [ ] `W5.2` /resonance-finder — Tune 10+ knobs (TTLs, caps, retries, rate limits)
  - [ ] `W5.3` /schedule — Weekly MRR-digest email to CONTACT_EMAIL via cron
  - [ ] `W5.4` /philosophy-prompting — Catalogue "any-cast hides SDK shape" with hook enforcement
  - [ ] `W5.5` /simplify — Apply any /code-review fixes from W0.1 that weren't yet committed

## Wave 0: Audit (SEQUENTIAL)

> Each step's output gates the next. `code-review` finds correctness bugs; `crystal-ball` predicts cross-system issues; `security-review` widens to attacker view; `verify` proves the systems actually work. Stop the wave (do not advance) if any step finds a P0 issue — fix first.

| Order | Step | Skill / Command | Target | Output | Execution |
|---|---|---|---|---|---|
| W0.1 | Diff re-review | `/code-review high` | HEAD (0097b2e) | ≤15 findings | SEQUENTIAL |
| W0.2 | Design coherence | `/crystal-ball` | failure-tracker + manage routes | issues + decay flags | SEQUENTIAL |
| W0.3 | Security pass | `/security-review` | /api/mollie-manage/* + tokens | severity-ranked findings | SEQUENTIAL |
| W0.4 | Manual verify | `/verify` | admin dashboard + manage endpoints | runtime confirmation | SEQUENTIAL |

### How to Run

```
/code-review high
/crystal-ball
/security-review
/verify
```

### Expected Artifacts
- `reports/code-review/cr-NNN-2026-05-28-skill-roadmap-followup.md`
- `reports/crystal-ball/cb-NNN-2026-05-28.md`
- `reports/security-review/sr-NNN-2026-05-28.md`
- `reports/verify/vf-NNN-2026-05-28.md`

## Wave 1: Map (PARALLEL agent-teams x3)

> Three independent discovery passes. None depends on the others' output. Run together via agent-teams.

| Order | Step | Skill / Command | Target | Output | Execution |
|---|---|---|---|---|---|
| W1.1 | Unfinished work | `/task-radar deep` | session + specs/todo | Eisenhower matrix | PARALLEL |
| W1.2 | Capability gaps | `/exploding-pen deep` | app/ + lib/ | <20-line micro-fix list | PARALLEL |
| W1.3 | Duplicate logic | `/unified-field-theory` | lib/payment-handlers.ts + webhook routes | unification proposal | PARALLEL |

### How to Run

```
/agent-teams "Run three independent discovery passes: (1) /task-radar deep, (2) /exploding-pen deep on app/ and lib/, (3) /unified-field-theory on payment handlers + webhook routes. Each produces a report. Report URLs at the end."
```

### Expected Artifacts
- `reports/task-radar/tr-NNN-2026-05-28.md`
- `reports/exploding-pen/ep-NNN-2026-05-28.md`
- `reports/unified-field-theory/uft-NNN-2026-05-28.md`

## Wave 2: Document (SEQUENTIAL)

| Order | Step | Skill / Command | Target | Output | Execution |
|---|---|---|---|---|---|
| W2.1 | ADR capture + decay radar | `/architecture-decision-tracker` | ADRs 019 + SDK-shape rule | tracked decisions | SEQUENTIAL |

### How to Run

```
/architecture-decision-tracker capture "ADR 019: Mollie primary, Stripe fallback — cost math + EU-LPM advantage; revisit at 200 active subs"
/architecture-decision-tracker capture "SDK-shape rule (post-2026-05-28 code-review): never use type X = any at external-SDK boundaries"
/architecture-decision-tracker radar
```

## Wave 3: Build (SEQUENTIAL — gated on Wave 0/1)

> Only run W3 steps if Wave 0/1 surfaces work that needs a plan. Otherwise skip directly to Wave 4.

| Order | Step | Skill / Command | Target | Output | Execution |
|---|---|---|---|---|---|
| W3.1 | VAT plan | `/quick-plan deep` | EU OSS threshold | spec + dependency graph | SEQUENTIAL |
| W3.2 | Gift threading plan | `/quick-plan deep` | gift-flow → recipient | spec + dependency graph | SEQUENTIAL |
| W3.3 | Dunning dashboard plan | `/quick-plan` | failure tracker → admin UI | spec | SEQUENTIAL |

### How to Run

```
/quick-plan deep "Build EU VAT-OSS threshold tracking + automated VAT calculation on adopt-a-paca subscriptions. Threshold: €10k cross-border B2C/year per EU OSS rules. Goal: stay compliant without paying Stripe Tax fees."
/quick-plan deep "Thread gift-recipient name + email + send-date from /gifts wizard through Mollie metadata so the welcome email goes to the recipient (not buyer) on the chosen send date."
/quick-plan "Build /admin/analytics/dunning showing at-risk + action-required donors from payment-failure-tracker with last-fail-date, attempt count, and outreach status."
```

## Wave 4: Validate (PARALLEL agent-teams x3)

| Order | Step | Skill / Command | Target | Output | Execution |
|---|---|---|---|---|---|
| W4.1 | Re-mandate E2E | `/verify` | /api/mollie-manage/update-payment | runtime trace | PARALLEL |
| W4.2 | Escalation E2E | `/verify` | handleMolliePaymentFailed × 3 | runtime trace | PARALLEL |
| W4.3 | Dashboard load test | `/run` | /admin/analytics/subscriptions | screenshot + timings | PARALLEL |

### How to Run

```
/agent-teams "Run three independent validation passes in parallel: (1) /verify the re-mandate flow end-to-end against Mollie test mode, (2) /verify the failure-escalation ladder by simulating three consecutive payment.failed webhooks, (3) /run the admin dashboard with seeded test data and capture timings."
```

## Wave 5: Maintain (PARALLEL terminal x5)

> Heavy skills — each gets its own terminal. No cross-dependencies.

| Order | Step | Skill / Command | Target | Output | Execution |
|---|---|---|---|---|---|
| W5.1 | Performance critical path | `/performance-optimizer` | /admin/analytics/subscriptions | Power Core Report | PARALLEL terminal |
| W5.2 | Parameter tuning | `/resonance-finder deep` | TTLs, caps, retries | tuning config | PARALLEL terminal |
| W5.3 | Cron — weekly digest | `/schedule create "weekly MRR digest to owner"` | every Mon 09:00 CET | scheduled agent | PARALLEL terminal |
| W5.4 | Lock SDK-any-cast bad habit | `/philosophy-prompting` | catalog + hook enforcement | catalog entry + hook | PARALLEL terminal |
| W5.5 | Apply review fixes | `/simplify` | findings from W0.1 | committed diff | PARALLEL terminal |

### How to Run

Five terminals, one each:
```
# Terminal 1
/performance-optimizer "Find critical path bottleneck in /admin/analytics/subscriptions — currently iterates up to 2000 Mollie subscriptions per page load with no caching."

# Terminal 2
/resonance-finder deep "Audit every tunable knob in lib/payment-failure-tracker.ts, lib/mollie-manage-token.ts, lib/webhook-idempotency.ts, app/api/mollie-manage/* . Find resonance points."

# Terminal 3
/schedule create "Weekly MRR digest to CONTACT_EMAIL — Monday 09:00 Europe/Madrid — pull MRR + churn from Mollie + render via buildMrrDigestEmail"

# Terminal 4
/philosophy-prompting "Catch the 'type X = any at SDK boundary' bad habit that hid the customers_subscriptions vs customerSubscriptions bug. Hook should block new `type X = any` in lib/integrations/ + app/api/*"

# Terminal 5
/simplify
```

## Execution Rules

- **Max concurrent agents:** 5 (Wave 1 = 3, Wave 4 = 3, Wave 5 = 5)
- **Wave 0 is a STOP/GO gate.** If W0.1 finds a P0, fix-and-commit before W0.2.
- **Wave 3 is conditional.** If W0+W1 don't surface escalating work, skip W3.
- **No cross-wave dependencies.** Each wave's outputs are self-contained.

## Quick Reference

| Wave | Produces | Feeds Into |
|---|---|---|
| W0 Audit | Findings, ADRs, security report | W2 documentation + W3 plans |
| W1 Map | Task radar, gap list, duplication map | W3 plans (if escalation) |
| W2 Document | Tracked ADRs + decay radar | All future waves |
| W3 Build | Specs for next-build sprint | Future /build invocation |
| W4 Validate | Runtime confirmation of 4 new systems | Production-readiness sign-off |
| W5 Maintain | Tuning config, schedules, hook enforcement | Ongoing stability |

## Execution Timeline

```
TIME ------------------------------------------------->
W0  [SEQUENTIAL × 4]  W0.1 -> W0.2 -> W0.3 -> W0.4
W1  [PARALLEL x3 ]    W1.1 | W1.2 | W1.3
W2  [SEQUENTIAL × 1]  W2.1
W3  [SEQUENTIAL × 3]  W3.1 -> W3.2 -> W3.3       (conditional)
W4  [PARALLEL x3 ]    W4.1 | W4.2 | W4.3
W5  [PARALLEL x5 ]    W5.1 | W5.2 | W5.3 | W5.4 | W5.5
```

## Agent Teams Config

| Wave | Agents | Steps per Agent | Execution | Notes |
|---|---|---|---|---|
| W1 | 3 | 1 | PARALLEL | Independent maps; no shared state |
| W4 | 3 | 1 | PARALLEL | Each verify hits a different surface |
| W5 | 5 | 1 | PARALLEL terminal | Heavy skills — terminal-per-agent |

## Key Files

- **CLAUDE.md** — failsafe map + post-2026-05-28 SDK-shape rule
- **specs/todo/** — 3 pending specs (legal/GDPR, adopt-a-paca content, locale strategy)
- **docs/adr/019-mollie-primary-stripe-fallback.md** — most recent ADR (target for W2)
- **lib/payment-failure-tracker.ts**, **lib/mollie-manage-token.ts** — new tunables (target for W5.2)
- **app/admin/analytics/subscriptions/page.tsx** — performance hot-spot (target for W5.1)
- **reports/code-review/cr-001-2026-05-28-skill-roadmap-followup.md** — output target for W0.1

## Getting Started

```
/code-review high
```

Then wait for the report and decide whether W0.2 (`/crystal-ball`) proceeds or whether a P0 needs fixing first.

## Not Scheduled (Optional Capabilities)

| Name | Purpose | Reason for Exclusion |
|---|---|---|
| airtable-enhanced, billing-reconciler, data-pipeline, scorm, claude-api | varies | No Airtable / Billing-reconciler / ETL / SCORM / Claude-API codepaths in this project today |
| build, gigafactory | Build | We're not on a spec-driven /build pipeline; manual edits work for this codebase's pace |
| ci-fix | Maintain | Targets process_catalogue_x specifically, not this repo |
| collab-handoff | Maintain | Single-author workflow; revisit if multi-collaborator |
| devtools-extract, site-assets, video-transcript-extractor, youtube-bulk | Map | No data-extraction needs from authenticated SaaS or video |
| file-factory, proposal-builder, sop-gen | Document | Not producing client decks/proposals/SOPs in this project |
| init | Document | CLAUDE.md already exists and is mature |
| kit-sync | Maintain | Skill-kit maintenance, not project-build work |
| matrix-reload | Audit | Code not yet "beyond incremental" — watch for trigger |
| meeting-to-specs | Document | No transcripts to convert |
| portfolio-health, weekly-digest | Maintain | Cross-project; this is project-scoped |
| probability-storm | Audit | Useful before next big decision; not needed today |
| review | Audit | No open PR |
| run, simplify | Validate/Maintain | Promoted to Recommended above — see Wave 4 + 5 |
| saas-blueprint-skill | Build | Multi-tenant scaffolding already in place |
| sipoc | Map | Could map the adopt flow but lower ROI than task-radar |
| skill-creator | Build | Not creating new skills today |
| brainstorm | Document | Promoted to Recommended; runs when next big design is needed |
| update-config, fewer-permission-prompts, keybindings-help, loop | Maintain | Quality-of-life, run as-needed |
