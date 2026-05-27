# KS-001 — Kit-Sync Propagation Inventory
**Date:** 2026-05-27  
**Mode:** Inventory only — READ-ONLY. No writes to CSF.  
**Rules applied:** Catalog 005 (local-file mode), Rule 011 (preflight gate), Rule 016 (verify fan-out outputs), Rule 017 (check sibling before scaffolding).

---

## 1 — PRE-DISPATCH READ Summary

| Artifact | Path | Status |
|---|---|---|
| SKILL.md | `~/.claude/skills/philosophy-prompting/SKILL.md` | Read — 151 lines, 5-layer loop, intact |
| Local catalog | `~/.claude/skills/philosophy-prompting/catalog/` | 17 entries (001–017, with 015 present) |
| Catalog 016 | `catalog/016-verify-fan-out-outputs-before-downstream-use.md` | Read — status: pending, enforcement: advisory |
| Catalog 017 | `catalog/017-check-sibling-projects-before-scaffolding.md` | Read — status: pending, enforcement: advisory |
| Hook 005 | `~/.claude/hooks/005-no-cortex-saves.py` | Read — 53 lines, blocks `mcp__omni-cortex__*` |
| Hook 010 | `~/.claude/hooks/010-agent-read-first.py` | Read — 180 lines, advisory on Agent dispatch |
| Hook 010 README | `~/.claude/hooks/010-agent-read-first.README.md` | Read — wiring, disable, promote instructions |
| CSF catalog | `claude-saas-framework/skills/philosophy-prompting/catalog/` | 15 entries (001–015) |
| CSF hooks | `claude-saas-framework/hooks/` | 2 files: `005-no-cortex-saves.py`, `INSTALL.md` |
| CSF CHANGELOG | `claude-saas-framework/CHANGELOG.md` | Read — v0.1.1 already notes 016+017 in "Catalog growth" section |

**Key finding from CHANGELOG v0.1.1:** The CHANGELOG already *describes* catalog 016 and 017 ("philosophy-prompting catalog grew from 15 → 17 entries during this session") but the actual `.md` files for 016 and 017 are NOT present in CSF's `skills/philosophy-prompting/catalog/`. The CHANGELOG is ahead of the files. This is the primary propagation gap.

---

## 2 — Catalog Entry Diff

| ID | Title (short) | Local has | CSF has | Propagate? | Priority |
|---|---|---|---|---|---|
| 001 | no-loops | Y | Y | No diff observed | — |
| 002 | no-hallucinating | Y | Y | No diff observed | — |
| 003 | verify-before-claiming | Y | Y | No diff observed | — |
| 004 | read-existing-docs-first | Y | Y | No diff observed | — |
| 005 | no-cortex-saves | Y | Y | No diff observed | — |
| 006 | dont-lose-files-mid-cleanup | Y | Y | No diff observed | — |
| 007 | verify-doc-cross-quotes | Y | Y | No diff observed | — |
| 008 | re-read-after-cross-tool-modifications | Y | Y | No diff observed | — |
| 009 | verify-with-parallel-agents | Y | Y | No diff observed | — |
| 010 | never-invent-data | Y | Y | No diff observed | — |
| 011 | preflight-gate | Y | Y | No diff observed | — |
| 012 | audit-finding-is-a-claim | Y | Y | No diff observed | — |
| 013 | mtime-is-not-truth | Y | Y | No diff observed | — |
| 014 | sonnet-for-scans-opus-for-synthesis | Y | Y | No diff observed | — |
| 015 | kit-skills-not-vibes | Y | Y | No diff observed | — |
| **016** | **verify-fan-out-outputs-before-downstream-use** | **Y** | **N** | **YES — P1** | **High** |
| **017** | **check-sibling-projects-before-scaffolding** | **Y** | **N** | **YES — P1** | **High** |

**Destination in CSF:** `skills/philosophy-prompting/catalog/016-verify-fan-out-outputs-before-downstream-use.md` and `...017-check-sibling-projects-before-scaffolding.md`

**Content note on 016:** Generalizable. The orchestrator-treats-intent-as-completion failure pattern is not alpaca-specific — any multi-agent fan-out by any CSF user can hit it. The test prompt uses generic report paths; no alpaca tokens.

**Content note on 017:** Generalizable. The failure is filesystem-parent-scope blindness when scaffolding. The test prompt references `C:\Users\cruzb\Projects\` — this path is user-local. Before propagating to CSF, the test prompt should use a placeholder like `<PROJECTS_ROOT>\*` so it reads as a pattern, not Cruz's specific machine. This is a minor edit (3 lines), not a blocking issue. Canonical version: local (it has the full recurrence log).

---

## 3 — Hook Diff

| File | Local has | CSF has | Content diff | Propagate? | Priority |
|---|---|---|---|---|---|
| `005-no-cortex-saves.py` | Y (53 lines) | Y (53 lines) | **Identical** — byte-for-byte same logic, same REASON string, same `mcp__omni-cortex__` prefix check | No | — |
| `INSTALL.md` | N (not in `~/.claude/hooks/`) | Y | CSF-only; local install is in settings.json directly | N/A | — |
| **`010-agent-read-first.py`** | **Y (180 lines)** | **N** | **Missing from CSF** | **YES — P1** | **High** |
| **`010-agent-read-first.README.md`** | **Y** | **N** | **Missing from CSF** | **YES — P1** | **High** |

**Content note on 010:** The hook has one hardcoded user-local path: `LOG_PATH = Path(r"C:\Users\cruzb\.claude\logs\agent-dispatches.log")`. Before propagating to CSF, this must be made configurable — either via an env var (`CLAUDE_AGENT_DISPATCH_LOG`) or a `~/.claude/logs/` relative path using `Path.home()`. The env-var opt-out variable is also named `ALPACA_AGENT_READ_FIRST_DISABLED` — this should be generalized to `CLAUDE_AGENT_READ_FIRST_DISABLED` for CSF. These are 2-line changes; the logic is fully generalizable.

CSF's `hooks/INSTALL.md` currently lists only one hook (`005-no-cortex-saves.py`). After 010 propagates, that table must gain a row. The INSTALL.md update is part of the same propagation transaction.

---

## 4 — ADR Generalizability Assessment

ADRs 010–013 are all in `alpaca-farm-redesign/docs/adr/`.

| ADR | Title | Alpaca-specific? | Generalizable pattern | CSF action |
|---|---|---|---|---|
| 010 | CSP Report-Only while GTM `unsafe-inline` remains | Partially. The GTM/GA4 conflict is universal in Next.js + GTM sites. The specific ADR-006 dependency is alpaca-specific. | Pattern: "Ship CSP-RO + 5 unambiguous enforcing headers when GTM blocks nonce-CSP" | Extract to `modules/ga4-gtm/ADR-csp-report-only.md` note or CSF template. LOW priority. |
| 011 | In-memory sliding-window rate limit; defer KV | N. The `globalForStore` + in-memory→KV upgrade ladder is identical to ADR-001's pattern and is fully generic. | **Pattern: in-memory→KV upgrade ladder (defer infra until volume justifies).** Belongs in a CSF template or README. | Add a `templates/patterns/in-memory-to-kv-upgrade.md` note in CSF — 1 paragraph, not a full ADR. LOW-MED priority. |
| 012 | Content lives in per-tenant TS modules behind `ContentProvider` | Y in specifics (alpacas, experiences, FareHarbor). N in pattern (adapter interface + static-TS → CMS upgrade path). | **Pattern: `ContentProvider` interface with static-TS adapter + CMS-later slot.** This is the core multi-tenant content architecture for any CSF client. | Add to `modules/` or `templates/` as a multi-tenant content pattern. HIGH priority but deferred — requires stripping alpaca entity types first. |
| 013 | `PaymentProvider` defaults `manual-mailto`; Stripe Connect throw-guard | Y in provider list details. N in the THROW-GUARD-ON-STRIPE-CONNECT failsafe pattern. | **Pattern: payment adapter with `manual-mailto` default + throw-guard on unlicensed money transmission.** Universal for any pre-revenue SaaS. | The THROW-GUARD is load-bearing for CSF's CLAUDE.md failsafe map. Add as a 2-line note in `templates/CLAUDE.md` failsafe map section. HIGH value, LOW effort. |

**Summary:** No alpaca ADR should be copied wholesale to CSF. The two extractable patterns are:
- The in-memory→KV upgrade ladder (ADR-011, generalizable as a short template note).
- The THROW-GUARD-ON-STRIPE-CONNECT (ADR-013, generalizable as a failsafe map row in `templates/CLAUDE.md`).

---

## 5 — Propagation Queue (ordered, local → CSF, when Cruz executes)

Execute in this order. Each item is a copy from local path to CSF path with the noted edit.

```
1. [COPY + MINOR EDIT]
   FROM: ~/.claude/skills/philosophy-prompting/catalog/016-verify-fan-out-outputs-before-downstream-use.md
   TO:   claude-saas-framework/skills/philosophy-prompting/catalog/016-verify-fan-out-outputs-before-downstream-use.md
   EDIT: None required — no user-local paths in this file.

2. [COPY + MINOR EDIT]
   FROM: ~/.claude/skills/philosophy-prompting/catalog/017-check-sibling-projects-before-scaffolding.md
   TO:   claude-saas-framework/skills/philosophy-prompting/catalog/017-check-sibling-projects-before-scaffolding.md
   EDIT: In the Test section, replace `C:\Users\cruzb\Projects\` with `<PROJECTS_ROOT>\`
         so it reads as a pattern not Cruz's machine. 3 line occurrences.

3. [COPY + 2-LINE EDIT]
   FROM: ~/.claude/hooks/010-agent-read-first.py
   TO:   claude-saas-framework/hooks/010-agent-read-first.py
   EDIT A: Change LOG_PATH from hardcoded `C:\Users\cruzb\...` to:
           LOG_PATH = Path(os.environ.get("CLAUDE_AGENT_DISPATCH_LOG",
                           str(Path.home() / ".claude" / "logs" / "agent-dispatches.log")))
   EDIT B: Rename opt-out env var from ALPACA_AGENT_READ_FIRST_DISABLED
           to CLAUDE_AGENT_READ_FIRST_DISABLED (2 occurrences: code + ADVICE string).

4. [COPY]
   FROM: ~/.claude/hooks/010-agent-read-first.README.md
   TO:   claude-saas-framework/hooks/010-agent-read-first.README.md
   EDIT: Update env var name to match EDIT B above. Update settings.json wiring example
         to use generic python path (remove hardcoded C:\Python313\python.exe → `python`).

5. [EDIT EXISTING FILE]
   FILE: claude-saas-framework/hooks/INSTALL.md
   EDIT: Add row to "Included hooks" table:
         | `010-agent-read-first.py` | `Agent` | Advisory warning when dispatch prompt lacks PRE-DISPATCH READ block |

6. [OPTIONAL — LOW PRIORITY]
   CREATE: claude-saas-framework/templates/patterns/in-memory-to-kv-upgrade.md
   Content: 1-paragraph summary of the ADR-001/011 in-memory→KV upgrade ladder pattern.
   Condition: Only if CSF already has a templates/patterns/ directory.

7. [OPTIONAL — MEDIUM PRIORITY]
   EDIT: claude-saas-framework/templates/CLAUDE.md (failsafe map section)
   Add row: "Payment adapter throws on unlicensed money-transmission adapter activation"
   Drawn from ADR-013's THROW-GUARD-ON-STRIPE-CONNECT pattern.
```

---

## 6 — Files to LEAVE in Alpaca (do not propagate)

| File | Why |
|---|---|
| `docs/adr/010-csp-report-only-with-gtm-unsafe-inline.md` | Tied to ADR-006 (`beforeInteractive`) which is alpaca-specific. |
| `docs/adr/011-in-memory-rate-limit-vs-kv.md` | Alpaca file:line references throughout. Extract pattern only (queue item 6). |
| `docs/adr/012-content-provider-abstraction.md` | Alpaca entity types (alpacas, experiences, FareHarbor) throughout. Pattern is generalizable but the ADR is alpaca-bound. |
| `docs/adr/013-payment-provider-defaults-manual-mailto.md` | References Stripe price IDs, Mollie/Bancontact specifics, ADR-004. Pattern extractable; full ADR stays. |
| All `docs/adr/001–009` | Predated this session; already in alpaca, not session artifacts. |

---

## 7 — Estimated CSF Version Increment

Current version: **v0.1.1** (released 2026-05-27).

After propagation queue items 1–5 execute:
- 2 new catalog entries (016, 017) — minor additions to existing skill bundle
- 1 new hook (010) + its README — expands the hooks/ bundle
- 1 edit to hooks/INSTALL.md — documentation update

This is a **patch release**: no breaking changes, no new modules, no API surface changes. Increment to **v0.1.2**.

If queue items 6–7 also execute (patterns template + CLAUDE.md failsafe row): still v0.1.2 — both are additive documentation, not structural.

**v0.2.0 threshold** (not triggered by this session): new module, new intake schema field, new bootstrap.ps1 behavior, or a breaking change to an existing template.

---

## 8 — STOP — Ambiguous Items

These require Cruz's decision before execution:

1. **017 test-prompt path substitution**: The proposed edit replaces `C:\Users\cruzb\Projects\` with `<PROJECTS_ROOT>\`. Alternative: leave Cruz's path and add a comment "replace with your Projects parent directory". Which is preferable for CSF readability?

2. **010 opt-out env var rename**: Renaming `ALPACA_AGENT_READ_FIRST_DISABLED` → `CLAUDE_AGENT_READ_FIRST_DISABLED` breaks backward compat for Cruz's current local wiring (though the local copy stays with the old name). Confirm the rename is acceptable before propagating.

3. **010 LOG_PATH generalization**: The proposed `Path.home() / ".claude" / "logs"` default works on Windows and POSIX. Confirm this is the right fallback (vs. a project-local log path).

4. **Queue items 6–7 (pattern template + CLAUDE.md failsafe)**: These are LOW-MEDIUM priority and require creating or editing files that weren't read in this session (`templates/patterns/` may not exist). Flag for a follow-up session rather than the current propagation run.

---

## Catalog 016 Verify (end-of-report gate)
