---
report_type: philosophy-diff
report_number: 001
date: 2026-05-26
global_entries: 6
local_entries: 8
overlap: 3
new_from_local: 5
global_only: 3
---

# Philosophy Catalog Diff — Global vs Project-Local
## 2026-05-26

---

## Global catalog (`~/.claude/skills/philosophy-prompting/catalog/`)

| ID | File | Title / one-line |
|---|---|---|
| 001 | `001-no-loops.md` | Never retry a failing approach without diagnosing first |
| 002 | `002-no-hallucinating.md` | Never invent file paths, line numbers, APIs, or facts without verification |
| 003 | `003-verify-before-claiming.md` | Never mark a criterion "done" without a test proving it works |
| 004 | `004-read-existing-docs-first.md` | Glob *.md + read latest dated status file BEFORE auditing |
| 005 | `005-no-cortex-saves.md` | Never save to Omni-Cortex MCP; use local memory files only |
| 006 | `006-dont-lose-files-mid-cleanup.md` | Verify file count before/after every batch of moves/renames/deletes |

---

## Local active philosophies (`philosophy/active/`)

| Slug | One-line philosophy |
|---|---|
| `read-existing-docs-first` | The existing project is smarter than your assumptions — read before you write. |
| `verify-with-parallel-agents` | An audit is a hypothesis until 1 agent per claim has independently confirmed it from the source. |
| `preflight-gate` | Before acting, name the goal, the assumptions, and the test. STOP on any unresolved assumption. |
| `never-invent-data` | If the owner hasn't confirmed it, render UNMAPPED. Never invent facts. |
| `audit-finding-is-a-claim` | Audit findings are claims, not facts — the fix agent re-verifies before fixing. |
| `mtime-is-not-truth` | File mtime is not content currency. Accurate = matches the code, not touched-last. |
| `sonnet-for-scans-opus-for-synthesis` | Match the model to the task: parallel scans go to Sonnet; synthesis is Opus's job. |
| `kit-skills-not-vibes` | When the kit ships a skill for the task, INVOKE it — don't redo it manually. |

---

## Diff table

| Local slug | Closest match in global | Genuinely new to global? | Action |
|---|---|---|---|
| `read-existing-docs-first` | `004-read-existing-docs-first` | NO — same root failure | **MERGE** — local has concrete session evidence (Adopt-a-Paca/Stripe example); global has fuller audit checklist. Merge local `## Why this matters` into global 004's `## Notes`. |
| `verify-with-parallel-agents` | `003-verify-before-claiming` | PARTIAL — scoped narrower | **MIGRATE** — global 003 is about "code written ≠ code works"; local is about "audit claims need 1 agent per claim to independently verify from source." Different trigger, different test. Add as global `007-verify-with-parallel-agents`. |
| `never-invent-data` | `002-no-hallucinating` | PARTIAL — scoped narrower | **MIGRATE** — global 002 targets invented file:line citations in code responses; local targets invented business values (prices, tier names, flags) with UNMAPPED enforcement. Different domain, different failure mode. Add as global `008-never-invent-data`. |
| `preflight-gate` | None | YES | **MIGRATE** — no global entry captures the "name goal + assumptions + test BEFORE acting, STOP on unresolved" gate. Most distinct new entry. Add as global `009-preflight-gate`. |
| `audit-finding-is-a-claim` | None | YES | **MIGRATE** — no global entry covers "fix agent must re-verify the finding before applying the fix" in both false-positive and false-negative directions. Add as global `010-audit-finding-is-a-claim`. |
| `mtime-is-not-truth` | None | YES | **MIGRATE** — no global entry covers "don't trust mtime as proxy for content currency; verify claims match code." Add as global `011-mtime-is-not-truth`. |
| `sonnet-for-scans-opus-for-synthesis` | None | YES | **MIGRATE** — no global entry covers model selection heuristics. Add as global `012-sonnet-for-scans-opus-for-synthesis`. |
| `kit-skills-not-vibes` | None | YES | **MIGRATE** — no global entry covers "invoke the skill instead of re-implementing it manually." Add as global `013-kit-skills-not-vibes`. |

### Global-only entries (nothing to do — stay in global)

| Global ID | Title | Why no local counterpart |
|---|---|---|
| `001-no-loops` | Never retry without diagnosing | Cross-project; not triggered in alpaca session |
| `005-no-cortex-saves` | Never save to Cortex MCP | Applies globally, locally honoured via project rule |
| `006-dont-lose-files-mid-cleanup` | Verify file count before/after batches | Caught during alpaca session but filed globally; no redundant local copy needed |

---

## Overlap summary

- **Exact overlap (same slug, same concept):** 1 → `read-existing-docs-first` / `004-read-existing-docs-first`
- **Partial overlap (related concept, different scope):** 2 → `verify-with-parallel-agents`↔`003`, `never-invent-data`↔`002`
- **Genuinely new from local (not in global at all):** 5 → `preflight-gate`, `audit-finding-is-a-claim`, `mtime-is-not-truth`, `sonnet-for-scans-opus-for-synthesis`, `kit-skills-not-vibes`

---

## New-from-local summaries (for migration agent)

### `verify-with-parallel-agents`
When an agent produces a multi-claim audit, every claim is a hypothesis. Run one independent verification agent per claim, each reading the source file from scratch. A single-pass audit published without parallel verification is a list of guesses.

### `preflight-gate`
Before any task begins — code write, file create, claim publish — write down: (1) goal, (2) each assumption tagged verified/needs-research/needs-owner, (3) observable pass criterion. Hard stop if any assumption is in needs-owner state without an explicit deferral.

### `audit-finding-is-a-claim`
A fix agent must re-read the source file and confirm the finding reproduces before writing a fix. Audits produce false positives (safe code flagged) and false negatives (real issue missed near a safe call). Applying a fix without re-verification means fixing the wrong thing or skipping the real issue.

### `mtime-is-not-truth`
When two docs overlap in topic, do not assume the one with the later mtime is correct. Currency = claims match the live code. Verify by diffing the doc's assertions against the actual implementation, not by comparing timestamps.

### `sonnet-for-scans-opus-for-synthesis`
Parallel file reads, single-file audits, grep-style scans, and per-claim verification are all pattern-matching tasks — use Sonnet. Cross-cutting synthesis (connecting findings across files, generating global recommendations, writing specs) is Opus's job. Routing pattern-matching to Opus wastes ~35% tokens for identical output.

### `kit-skills-not-vibes`
When a kit skill exists for the task, invoke it via the Skill tool in the same turn — do not describe it, plan to use it later, or re-implement its logic manually. The kit is finished work; using it manually duplicates that work and discards its built-in output format and quality checks.

---

## Format differences — migration gotchas

| Concern | Global format | Local format | Migration note |
|---|---|---|---|
| Frontmatter ID field | `id: "NNN"` (zero-padded 3-digit string) | `slug: kebab-name` (no numeric ID) | Migration agent must assign the next sequential NNN (next is `007`). |
| `type` classification | Required field from controlled list: `loop`, `hallucination`, `stale-trust`, `context-drop`, `narration-only`, `lazy-default`, `permission-abuse`, `scope-creep` | Not present in local format | Each migrated entry needs a `type` field. Suggested mappings: `verify-with-parallel-agents`→`stale-trust`; `preflight-gate`→`lazy-default`; `audit-finding-is-a-claim`→`stale-trust`; `mtime-is-not-truth`→`stale-trust`; `sonnet-for-scans-opus-for-synthesis`→`lazy-default`; `kit-skills-not-vibes`→`lazy-default`. |
| `status` field | `pending \| testing \| enforced \| retired` | `active \| retired-promoted \| retired-stopped-applying` | Migrate all new entries as `status: pending`. |
| `captured` vs `captured_at` | Global uses `captured: "YYYY-MM-DD"` | Local uses `captured_at: YYYY-MM-DD` | Normalise to `captured` in global. |
| `linked_memory` | Free-text filename | `related_memories: [list]` | Global uses a single string; copy relevant memory filenames from local `related_memories`. |
| `linked_practice` | Free-text | `related_practices: [list]` | Global scopes practices to project-level PRACTICES.md. Migrated entries should note "alpaca project PRACTICES Rule N" or leave null if cross-project. |
| `Diagnose` section | Global L3 has explicit `## Root cause` section (required) | Local has `## Why this matters` (origin story) but no formal root-cause label | Migration agent must write a `## Root cause` line from the local philosophy body. |
| `Enforcement` section | Global has explicit `## Enforcement` block with level + detail | Local has `## Test signature` (observable failure signal, not an enforcement plan) | Migration agent must add `## Enforcement: advisory` plus a hook-candidacy note for each entry. |
| `Test` section | Global has a `**Prompt**` block + `**Pass criteria**` checklist | Local stores tests in a separate `philosophy/tests/<slug>.md` file | Migration agent should read `philosophy/tests/<slug>.md` for each entry being migrated and inline the test into the global `## Test` section. |
| `status` of all migrated entries | — | All local entries: `active` | All global entries should start as `status: pending` (one pass does not count as tested). |
