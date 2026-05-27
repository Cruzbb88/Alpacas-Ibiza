# Skill Roadmap — Alpacas Ibiza site (2026-05-26)

## Methodology

`skill-roadmap` discovers available skills/commands/MCP tools and classifies each one against the current project shape (L1 inventory → L2 project-fit → L3 wave sequencing). **Degraded local-file mode:** catalog 005 hook blocks all `mcp__omni-cortex__*` calls, so any skill whose value comes from cross-session memory (decision-decay, brainstorm-history, link-graphs) is scored on local-file artifacts only. Project context confirmed via `Read` of START_HERE.md / CLAUDE.md / PRACTICES.md / PLAN.md / INTEGRATION_STATUS_2026-04-20.md / CANT_BE_DONE.md and `Bash` listings of `app/`, `lib/`, `components/`, `reports/`, `specs/` (Rule 11: Research-Confirm-Test passed before classifying).

Project class: single-tenant Next.js 16 brochure site (4 conversion paths, FareHarbor embed, Resend, Turnstile, GA4). No DB, no billing engine, no multi-tenant, no video pipeline, no LMS, no CRM. 12/18 roadmap items already shipped; remaining work is owner-input gated (P0 specs 002/003/005) or one unblocked perf flip (spec 008).

## Classification

| Skill | Verdict | Why |
|---|---|---|
| agent-teams | OPTIONAL | No cross-layer parallel front. Triggers when a multi-spec wave reopens (e.g. 002+003+005 land together). |
| airtable-enhanced | SKIP | No Airtable base in this project; static JSON + translations files own the data. |
| architecture-decision-tracker | RECOMMENDED | 9 ADRs already in `docs/adr/`. Skill would surface decision-decay heuristically (CANT_BE_DONE entry: no statistical decay without Cortex) and catch ADR drift vs code. |
| billing-reconciler | SKIP | ADR 004: shop is FareHarbor-only, no Stripe. No invoices, no ledger. |
| brainstorm | OPTIONAL | Spec backlog is owner-blocked, not ideation-blocked. Triggers if owner unlocks 🟢 items (Adopt-a-Paca format, loyalty, referral). |
| build | ESSENTIAL | Spec 008 (image opt) and any future code spec needs `npm run build` smoke before claim. Used implicitly already. |
| ci-fix | OPTIONAL | No CI configured in repo (no `.github/workflows` referenced in PRACTICES). Triggers when Vercel + GitHub Actions wired post-deploy. |
| collab-handoff | RECOMMENDED | Sessions persist via START_HERE.md / handoff reports already; skill would standardize the existing pattern. Degraded mode: writes local handoff file instead of Cortex sync. |
| crystal-ball | ESSENTIAL | Already run (71/100 in `reports/crystal-ball/`). Re-run before unblocking owner specs to re-score after content lands. L3 decay flagged degraded in CANT_BE_DONE. |
| data-pipeline | SKIP | No ETL surface. Translations + alpacas.ts + press.ts are tiny static files. |
| devtools-extract | ESSENTIAL | Already produced FareHarbor admin scrape template in `reports/devtools-extract/`. Permanently delegated owner-only path per CANT_BE_DONE entry 8. |
| exploding-pen | ESSENTIAL | Already run; catches XSS / failsafe drift (Rule 12 fix-loop). Re-run after each code-change wave. |
| file-factory | OPTIONAL | Useful if owner answers C2 (14 alpaca bios) — generate 14 MDX/JSON files in one pass. Currently blocked. |
| gigafactory | OPTIONAL | Reserved in roadmap W3.3 for alpaca card factory — explicitly blocked on owner bios per START_HERE. Pre-staged. |
| kit-sync | RECOMMENDED | Wave 5 of the project roadmap is `handoff + kit-sync` still open. Closes the loop by syncing improved skill prompts back to `~/.claude/skills/`. |
| matrix-reload | OPTIONAL | Already run — verdict "incremental sufficient, no reload zone." Re-trigger only if codebase doubles or a re-architecture is proposed. CANT_BE_DONE 7 limits churn heuristic. |
| meeting-to-specs | RECOMMENDED | Pending owner call (20-min ⚠️ block per PLAN Track B). Skill turns that single call into spec drafts in `specs/todo/`. |
| performance-optimizer | ESSENTIAL | Spec 008 (`images.unoptimized: true → false`) is the next concrete unblocked work. Skill already produced critical-path report; pairs directly with the flip. |
| portfolio-health | SKIP | Single-project session. No portfolio to roll up. |
| probability-storm | OPTIONAL | Useful for monte-carlo on launch-readiness once owner items land. Currently every blocker is owner-deterministic, not probabilistic. |
| proposal-builder | SKIP | No client proposals — this is the owner's own site, not an agency deliverable. |
| quick-plan | RECOMMENDED | PLAN.md exists but Track C gaps (language strategy, weaving brand split) lack acceptance criteria. Skill converts them. |
| resonance-finder | OPTIONAL | Already run (5 sensitive knobs in report). Re-run after env-var changes or ADR additions. |
| saas-blueprint-skill | SKIP | Brochure site, not SaaS. No tenants, no plans, no billing. |
| scorm | SKIP | No e-learning. Tours are real-world experiences booked via FareHarbor. |
| sipoc | OPTIONAL | Useful for documenting the FareHarbor → email → owner-digest pipeline as a Supplier-Input-Process-Output-Customer flow. Already run once (`reports/sipoc/`). |
| site-assets | ESSENTIAL | Already run (live + competitor brand audits). Re-trigger when owner supplies hex/font values (CANT_BE_DONE entry 5 lifts). |
| skill-creator | OPTIONAL | Triggers only if a recurring failure mode lacks a skill (philosophy-prompting handles that route now with 15 catalog entries). |
| skill-roadmap | ESSENTIAL | This file. Running now in degraded mode; re-run after Cortex policy lifts or after Wave 5 closes. |
| sop-gen | RECOMMENDED | Owner needs a "how to add an alpaca / how to update tour copy" SOP post-launch — the failsafe map in CLAUDE.md is dev-facing, not owner-facing. |
| task-radar | ESSENTIAL | Already produced Eisenhower matrix (8 Q1 launch-blockers). Re-run weekly during launch ramp. Note mode hard-routes to local "noted" entries since Cortex blocked. |
| unified-field-theory | OPTIONAL | Already run (duplicate-pattern clusters). Re-trigger after any Track A refactor lands to confirm clusters didn't reform. |
| video-transcript-extractor | SKIP | No video corpus. Optional video hero in OWNER_INPUT is 🟢 deferred. |
| weekly-digest | OPTIONAL | `app/api/owner-digest` already implements the runtime weekly digest (vercel cron Mon 9am). This dev-side skill triggers only if Cruz wants a session-side weekly summary. |
| youtube-bulk | SKIP | No YouTube channel ingestion in scope. |

## Top 5 next-up

1. **performance-optimizer** — pair with spec 008 image opt; the only unblocked code work today, flips `images.unoptimized` and validates LCP impact (bounded by CANT_BE_DONE 9: real CWV scores need deploy).
2. **meeting-to-specs** — convert the owner ⚠️ call (cancellation policy, prices, photos, privacy/terms, CIF) into 5 spec stubs in `specs/todo/` so the call output isn't lossy.
3. **quick-plan** — fill acceptance criteria for Track C items (language strategy, weaving brand split) so they become testable, not advisory.
4. **architecture-decision-tracker** — re-score the 9 ADRs against current code after spec 008 lands; degraded-mode decay = heuristic-only per CANT_BE_DONE 10.
5. **kit-sync** — close project Wave 5; sync any prompt deltas back to `~/.claude/skills/` so improvements survive the session.

## Skip cluster (with reasons)

`airtable-enhanced`, `billing-reconciler`, `data-pipeline`, `portfolio-health`, `proposal-builder`, `saas-blueprint-skill`, `scorm`, `video-transcript-extractor`, `youtube-bulk` — all model the wrong domain (SaaS infra, e-commerce ledgers, ETL, LMS, video pipelines, agency client work, portfolio rollups). This is a single-tenant brochure site with FareHarbor doing all commerce, Resend doing all messaging, and static JSON owning all content. None of these surfaces exist here and none are roadmap items.

## STOP

Cannot classify `agent-teams` orchestration depth without owner-input timing: if specs 002 + 003 + 005 land in the same call, parallel agents become essential; if staggered, sequential single-agent waves suffice. Routed to OWNER_INPUT_NEEDED.md (call cadence is the missing input, not a code fact).
