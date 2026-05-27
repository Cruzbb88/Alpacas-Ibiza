---
project: "Alpacas Ibiza Redesign"
type: "skill-execution"
created: "2026-05-26"
updated: "2026-05-26"
status: "PLANNING"
domain: null
capabilities_total: 38
essential_count: 6
recommended_count: 12
waves: 6
steps: 18
---

# Roadmap — Skill Execution: Alpacas Ibiza Redesign

> Six waves, 18 ESSENTIAL+RECOMMENDED skills. Audit-first (Wave 0) before any code changes. Wave 3 (Build) uses agent-teams for parallel spec execution; Wave 4 (Validate) runs heavy skills in parallel terminals. Cortex-dependent skills run in degraded local-file mode per project memory rule `feedback_no_cortex_saves`. Total: ~25 execution passes if all run.

## Total Steps: 18 | Completed: 14 | Remaining: 4

## Checklist

- [x] **Wave 0: Audit** (4 steps, PARALLEL terminal x4) — synthesis at [reports/wave-0-synthesis-2026-05-26.md](../../reports/wave-0-synthesis-2026-05-26.md)
  - [x] `W0.1` /crystal-ball — 71/100 NEEDS-ATTENTION — [cb-001](../../reports/crystal-ball/cb-001-2026-05-26-alpaca-redesign.md)
  - [x] `W0.2` /exploding-pen — 12 gaps, top 5 actioned — [ep-001](../../reports/exploding-pen/ep-001-2026-05-26-gap-scan.md)
  - [x] `W0.3` /probability-storm — 3 decisions scored; Adopt €15/€75 conflict surfaced — [ps-001](../../reports/probability-storm/ps-001-2026-05-26-three-decisions.md)
  - [x] `W0.4` /matrix-reload — 83/100; 2 rebuild zones in /experiences — [mr-001](../../reports/matrix-reload/mr-001-2026-05-26-locale-routes.md)
- [x] **Wave 1: Map** (3 steps + 2 extra peer scans, PARALLEL agent-teams x5)
  - [x] `W1.1` /unified-field-theory — 8 duplicate patterns; Geist + theme-color bugs surfaced — [uft-001](../../reports/unified-field-theory/uft-001-2026-05-26-app-lib.md)
  - [x] `W1.2a` /site-assets live — Geist not rendering, themeColor mismatch — [sa-001](../../reports/site-assets/sa-001-2026-05-26-live-site.md)
  - [x] `W1.2b` /site-assets canmarti — 5 patterns to steal — [sa-002](../../reports/site-assets/sa-002-2026-05-26-canmarti-peer.md)
  - [x] `W1.2c` /site-assets atzaro — premium signaling patterns — [sa-003](../../reports/site-assets/sa-003-2026-05-26-atzaro-peer.md)
  - [x] `W1.3` /devtools-extract — degraded template for FareHarbor admin — [de-001](../../reports/devtools-extract/de-001-2026-05-26-fareharbor-bookings.md)
- [x] **Wave 2: Document** (2 steps, SEQUENTIAL)
  - [x] `W2.1` /architecture-decision-tracker — 8 ADRs backfilled: [002](../../docs/adr/002-turnstile-fail-open-dev-fail-closed-prod.md) [003](../../docs/adr/003-webhook-secret-fail-closed.md) [004](../../docs/adr/004-email-only-no-ecommerce.md) [005](../../docs/adr/005-6-locale-en-default-gb-flag.md) [006](../../docs/adr/006-ga4-before-interactive-ssr.md) [007](../../docs/adr/007-admin-login-fail-closed.md) [008](../../docs/adr/008-availability-isr-1800s.md) [009](../../docs/adr/009-client-availability-dedup-promise-cache.md)
  - [x] `W2.2` /sipoc — Tour booking flow mapped end-to-end — [sip-001](../../reports/sipoc/sip-001-2026-05-26-booking-flow.md)
- [ ] **Wave 3: Build** (4 steps, PARALLEL agent-teams x4)
  - [x] `W3.1` /quick-plan — Convert OWNER_INPUT_NEEDED.md ⚠️ items to specs/todo/ → 8 specs generated 2026-05-26
  - [~] `W3.2` /build — Partial: 7/10 specs verified done ([001](../done/001-tour-price-single-source.md), [004](../done/004-dead-routes-cleanup.md), [006](../done/006-structured-data-integrity.md), [007](../done/007-form-handler-dedup.md), [008](../done/008-perf-image-optimization.md), [009](../done/009-mailer-timeout.md), [010](../done/010-webhook-owner-alert.md)); 3 remain in [todo/](../todo/) (002, 003, 005)
  - [~] `W3.3` /gigafactory — Design done ([gf-002](../../reports/gigafactory/gf-002-2026-05-26-alpaca-card-factory-design.md)); build blocked on owner-supplied bios + photos
  - [x] `W3.4` /agent-teams — Team config at [.claude/agent-teams-config.md](../../.claude/agent-teams-config.md) — proven 2026-05-26 with verification + wave-audit + peer-pattern teams.
- [x] **Wave 4: Validate** (2 steps, PARALLEL terminal x2) — re-run 2026-05-26
  - [x] `W4.1` /performance-optimizer — Critical path: beforeInteractive scripts + `images.unoptimized` + dup availability fetches — [po-001](../../reports/performance-optimizer/po-001-2026-05-26-alpaca-farm-critical-path.md)
  - [x] `W4.2` /resonance-finder — 5 high-sensitivity knobs (admin pwd default, JWT maxAge, availability cache, Turnstile fail-closed, FareHarbor timeout) — [rf-001](../../reports/resonance-finder/rf-001-2026-05-26-alpaca-farm-knobs.md)
- [ ] **Wave 5: Maintain** (3 steps, SEQUENTIAL)
  - [x] `W5.1` /handoff — End-of-session structured save — [2026-05-26-session-handoff](../../reports/handoff/2026-05-26-session-handoff.md)
  - [x] `W5.2` /kit-sync — Push recommended: `philosophy-prompting` (20 files, 907 LOC) — [ks-001](../../reports/kit-sync/ks-001-2026-05-26-push-back-proposal.md)
  - [x] `W5.3` /task-radar — 32 items mapped on Eisenhower matrix; 8 Q1 launch-blockers — [tr-001](../../reports/task-radar/tr-001-2026-05-26-alpaca-farm-unfinished.md)

---

## Wave 0: Audit (PARALLEL terminal x4)

> Audit BEFORE building. Catches bad decisions while they're still cheap. PRACTICES.md Rule 11 (preflight gate) is the manual version of what crystal-ball + probability-storm automate.

| Order | Step | Skill / Command | Target | Output | Execution |
|-------|------|----------------|--------|--------|-----------|
| W0.1 | Design audit | /crystal-ball | full | 6-layer score + downstream risks | TERMINAL 1 |
| W0.2 | Gap scan | /exploding-pen | scan | List of <20-line micro-fixes | TERMINAL 2 |
| W0.3 | Decision viability | /probability-storm | OWNER_INPUT ⚠️ items | Strategy score per item | TERMINAL 3 |
| W0.4 | Rebuild zones | /matrix-reload | app/[locale]/ | Pain map + reload boundaries | TERMINAL 4 |

**How to Run** (4 terminals in parallel)
```
# Terminal 1
/crystal-ball

# Terminal 2
/exploding-pen scan

# Terminal 3
/probability-storm "Alpaca adoption Yes/No decision per OWNER_INPUT_NEEDED.md L154"

# Terminal 4
/matrix-reload app/[locale]
```

**Expected artifacts:**
- `reports/crystal-ball/cb-001-*.md` (or local equivalent)
- `reports/exploding-pen/*.md`
- Cortex memories (degraded — will write to local files instead per project rule)
- ASCII pain map + rebuild plan

---

## Wave 1: Map (PARALLEL agent-teams x3)

> Map structural reality before changing it. Unified-field-theory has high leverage — already found duplicate routes manually; the skill will find more.

| Order | Step | Skill / Command | Target | Output | Execution |
|-------|------|----------------|--------|--------|-----------|
| W1.1 | Duplicate logic | /unified-field-theory | app/ + lib/ | Unification proposals | AGENT 1 |
| W1.2 | Brand assets | /site-assets | https://alpacasibiza.com | Logo + colors + fonts | AGENT 2 |
| W1.3 | FareHarbor admin scrape | /devtools-extract | FareHarbor admin URL | Console script for booking export | AGENT 3 |

**How to Run**
```
/agent-teams "Wave 1 mapping" --tasks "unified-field-theory app/ lib/" "site-assets https://alpacasibiza.com" "devtools-extract fareharbor admin"
```

---

## Wave 2: Document (SEQUENTIAL)

> ADRs first, then process maps. ADRs constrain what SIPOC can claim (e.g., 'we email Alcaca by design' is an ADR-worthy decision that explains why no shop checkout exists).

| Order | Step | Skill / Command | Target | Output | Execution |
|-------|------|----------------|--------|--------|-----------|
| W2.1 | ADR backfill | /architecture-decision-tracker | PLAN.md + PRACTICES.md | docs/adr/00X-*.md files | SEQUENTIAL |
| W2.2 | Process maps | /sipoc | booking + Alcaca flows | SIPOC matrix + Mermaid | SEQUENTIAL |

---

## Wave 3: Build (PARALLEL agent-teams x4)

> Generates owner-input specs (W3.1), executes them (W3.2), generates the alpaca-card factory (W3.3), and formalizes the parallel-Sonnet pattern (W3.4). Track B from PLAN.md feeds this wave.

| Order | Step | Skill / Command | Target | Output | Execution |
|-------|------|----------------|--------|--------|-----------|
| W3.1 | Specs from owner-input | /quick-plan | OWNER_INPUT_NEEDED.md ⚠️ section | specs/todo/*.md | AGENT 1 |
| W3.2 | Execute specs | /build | specs/todo/ | code changes | AGENT 2 (deps on W3.1) |
| W3.3 | Card factory | /gigafactory | lib/data/alpacas.ts + UI | Reusable alpaca-card generator | AGENT 3 |
| W3.4 | Team config | /agent-teams | this project | Saved team-config for parallel-Sonnet QA | AGENT 4 |

**Dependency:** W3.2 starts after W3.1 completes (same agent can chain).

---

## Wave 4: Validate (PARALLEL terminal x2)

> Heavy skills — separate terminals. Run after Wave 3 ships code so optimization has fresh targets.

| Order | Step | Skill / Command | Target | Output | Execution |
|-------|------|----------------|--------|--------|-----------|
| W4.1 | Perf bottleneck | /performance-optimizer | /tours, /alpacas, / | Power Core Report | TERMINAL 1 |
| W4.2 | Param tuning | /resonance-finder | lib/turnstile.ts + lib/fetch.ts | Optimal timeouts + retry counts | TERMINAL 2 |

---

## Wave 5: Maintain (SEQUENTIAL)

> Session housekeeping. /handoff at session end, /kit-sync to push improvements back, /task-radar to sweep loose ends.

| Order | Step | Skill / Command | Target | Output | Execution |
|-------|------|----------------|--------|--------|-----------|
| W5.1 | Session save | /handoff | current session | local handoff file (no Cortex) | SEQUENTIAL |
| W5.2 | Kit reverse-sync | /kit-sync | ~/.claude/ vs kit repo | Sync proposal | SEQUENTIAL |
| W5.3 | Loose ends | /task-radar | full project | Sticky notes + Eisenhower matrix | SEQUENTIAL |

---

## Execution Rules

- **Max concurrent agents:** 4 (matches Wave 3 width)
- **Cross-wave dependency:** W3.2 depends on W3.1; W4.x depends on Wave 3 completion
- **Context window:** crystal-ball, matrix-reload, performance-optimizer are HEAVY — run each in its own terminal/agent, not in a shared agent-teams batch
- **Cortex-dependent skills** (crystal-ball memories, task-radar notes, handoff persistence): run in **degraded local-file mode** per project rule `feedback_no_cortex_saves`. Output goes to `reports/` not Cortex.
- **Preflight gate (PRACTICES.md Rule 11):** every code-changing skill (W3.x, W4.x) must output a 3-bullet preflight before execution

## Quick Reference

| Wave | Produces | Feeds Into |
|------|----------|-----------|
| W0 Audit | Coherence score, gap list, viability matrix, rebuild zones | W1 Map (informs scope), W3 Build (informs priority) |
| W1 Map | Duplication report, brand assets, admin scraper | W2 Document (ADRs reference duplication findings) |
| W2 Document | ADRs + SIPOC diagrams | W3 Build (specs reference ADRs) |
| W3 Build | Specs + code + factories + team configs | W4 Validate (targets fresh output) |
| W4 Validate | Perf report + tuned params | W5 Maintain (perf wins logged as task-radar items) |
| W5 Maintain | Session handoff + kit sync + sticky notes | Next session pickup |

## Execution Timeline

```
TIME --------------------------------------------------------->
W0 [PARALLEL x4]  W0.1 | W0.2 | W0.3 | W0.4
W1 [PARALLEL x3]              W1.1 | W1.2 | W1.3
W2 [SEQ]                                  W2.1 -> W2.2
W3 [PARALLEL x4]                                       W3.1 -> W3.2 | W3.3 | W3.4
W4 [PARALLEL x2]                                                          W4.1 | W4.2
W5 [SEQ]                                                                       W5.1 -> W5.2 -> W5.3
```

## Agent Teams Config

| Wave | Agents | Steps per Agent | Execution | Notes |
|------|--------|-----------------|-----------|-------|
| W1 | 3 | 1 | agent-teams | Independent, light/medium weight |
| W3 | 4 | 1 (W3.2 chained after W3.1) | agent-teams | W3.1 → W3.2 dependency handled in single agent |

## Key Files

- **CLAUDE.md** — Project entry point + in-code failsafe map + env tiers
- **PRACTICES.md** — 11 active rules, append protocol, pre-flight gate
- **PLAN.md** — Track A (done), Track B/C (input-blocked)
- **OWNER_INPUT_NEEDED.md** — ⚠️/🟡/🟢 owner-blocked items
- **VERIFICATION_RESULTS.md** — Audit verdicts (12/13 proven)
- **REALITY_CHECK.md** — Redesign vs live vs competitors
- This roadmap — `specs/roadmaps/ROADMAP-skill-execution.md`
- Build manifest — `specs/roadmaps/skill-execution-build-manifest.md`

## Getting Started

```
/crystal-ball
```

That's Wave 0, Step 1 (W0.1). It's the highest-leverage single skill in this kit for this project: 6-layer coherence audit grounded in the design state of the redesign. Output informs every later wave.

---

## Not Scheduled (Optional Capabilities — 20 items)

| Capability | Purpose | Reason for Exclusion |
|---|---|---|
| brainstorm | Build | Project past brainstorm phase (CLAUDE.md, PLAN, PRACTICES exist) |
| saas-blueprint-skill | Build | Past blueprint phase; system already designed |
| meeting-to-specs | Build | No meeting transcripts in scope |
| proposal-builder | Document | Not a consulting engagement |
| sop-gen | Document | Operations docs not urgent for launch |
| ci-fix | Maintain | Hard-coded to behnker/process_catalogue_x repo |
| data-pipeline | Build | No ETL workflows in alpaca |
| airtable-enhanced | Maintain | No Airtable integration |
| billing-reconciler | Validate | No billing system in code (FareHarbor handles payments) |
| portfolio-health | Audit | Cross-project; this is single-project |
| file-factory | Build | Could generate owner-facing PPT but not blocker |
| scorm | Build | E-learning packages — irrelevant |
| video-transcript-extractor | Map | No video assets in scope |
| youtube-bulk | Map | Same |
| weekly-digest | Document | Premature — no weekly cadence established |
| memory | Maintain | Cortex memory mgmt — project policy is local files |
| collab-handoff | Maintain | Solo project — no collaborator handoff |
| skill-creator | Build | Not building new skills |
| skill-roadmap | Audit | Currently running (self-reference) |
| client-dashboard / client-switch (commands) | Maintain | Multi-client mgmt; single-client project |

---

## Local Install QA Findings (kit health in this project)

🔴 **Missing prerequisites:**
- `specs/` directory created in this run; was missing — skills that read `specs/todo/` (build, quick-plan, crystal-ball-matrix) would have errored
- `reports/` directory created in this run; was missing — every report-saving skill needed it

🟡 **Mismatched expectations:**
- `saas-blueprint-skill` is the ONLY skill installed at `.claude/skills/` per the earlier ls — but the system shows all 38 skills as available, meaning they're loading from somewhere else (likely `.claude/skills/` has more files than ls revealed, OR they're loading from the Downloads kit master). Worth confirming with a deeper ls.
- Cortex MCP is registered (mcp__omni-cortex__cortex_* tools visible) BUT project rule `feedback_no_cortex_saves` says "Use local memory files only." Skills that depend on Cortex (crystal-ball memories, task-radar, brainstorm, architecture-decision-tracker, memory) will operate in degraded local-file mode. This is a rule conflict that should be resolved explicitly per-project.
- `GTM-NJRGZPGS` referenced in CLAUDE.md as "open question" — only `GTM-KR3CGLS6` (FareHarbor's container) is in code. Either remove the reference or add the second container.

🟢 **Working as intended:**
- `.claude/commands/` is populated (22 command files)
- `.claude/hooks/` has damage-control + notification hooks
- All 38 skills load on session start (system-reminder confirms)
- saas-blueprint-skill has SKILL.md + references/ — proper structure

**Action items:**
1. Pick a Cortex policy for the alpaca project: (a) lift the no-Cortex rule here, (b) accept degraded mode permanently, or (c) write a local-file Cortex shim. Add as a PRACTICES rule.
2. Resolve GTM-NJRGZPGS — either delete reference in CLAUDE.md/PLAN.md or add the container.
3. Verify `.claude/skills/` actually contains all 38 skill folders (run `ls .claude/skills/`).

---

## W3.1 Spec Roadmap (generated 2026-05-26)

> 8 specs in `specs/todo/`. P0s are launch-blockers; execute before W3.2 /build.

### Execution order

```
PARALLEL (no deps):
  001-tour-price-single-source   P0  S
  002-legal-content-gdpr         P0  M   ← owner content needed
  003-adopt-a-paca-page          P0  M   ← owner pricing confirm needed
  004-dead-routes-cleanup        P0  S
  005-locale-strategy            P0  S   ← owner decision needed
  007-form-handler-dedup-xss     P1  S
  008-perf-script-strategy       P1  S

AFTER 001 (depends_on price constants):
  006-structured-data-integrity  P0  S
```

### Dependency graph

```
001 ──► 006
002     (standalone)
003     (standalone, owner confirm)
004     (standalone)
005     (standalone, owner decision)
007     (standalone)
008     (standalone)
```

### Owner-input gate

Specs 002, 003, and 005 each require owner decisions before final values can be shipped. Code scaffolding can be built with `TODO: OWNER_INPUT_NEEDED` placeholders; do not ship placeholder legal text to production.

### Total estimated size

| Priority | Count | Sizes | Est. total |
|---|---|---|---|
| P0 | 6 | 4×S + 2×M | ~16–24h |
| P1 | 2 | 2×S | ~4–6h |
| **All** | **8** | | **~20–30h** |
