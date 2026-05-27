---
name: philosophy-prompting
description: >-
  RETIRED — superseded by the global skill at ~/.claude/skills/philosophy-prompting/.
  This project-local version was built 2026-05-26 before discovering the existing
  global catalog. All 7 unique local entries have been migrated to the global catalog
  (IDs 007–013); 5 session-recurrence logs are appended to the relevant global entries.
  Project-local philosophy/active/, philosophy/tests/, and reports/philosophy/ are
  preserved as session evidence — they are not the canonical source. Use the global
  skill for capture/test/verify going forward.
argument-hint: "(retired — see ~/.claude/skills/philosophy-prompting/)"
---

# Philosophy Prompting — RETIRED (project-local)

This project-local skill is **retired** as of 2026-05-26.

## Canonical location
`~/.claude/skills/philosophy-prompting/` — the global skill Cruz built first. It uses a
5-step loop (Capture → Record → Diagnose → Test → Enforce) and a flat `catalog/`
directory of numbered entries.

## What happened
A duplicate version of this skill was created project-locally before the global one
was discovered. This is itself a recurrence of philosophy **013 — kit-skills-not-vibes**
("when the kit ships a skill, invoke it — don't re-implement it"). The recurrence
is logged in the global catalog entry 013.

## What was migrated
| Local slug | Migrated to global ID |
|---|---|
| read-existing-docs-first | Merged into existing 004 |
| verify-with-parallel-agents | 007 (new) |
| never-invent-data | 008 (new) |
| preflight-gate | 009 (new) |
| audit-finding-is-a-claim | 010 (new) |
| mtime-is-not-truth | 011 (new) |
| sonnet-for-scans-opus-for-synthesis | 012 (new) |
| kit-skills-not-vibes | 013 (new) |

## Preserved as evidence (not canonical)
- `reports/philosophy/pp-001-2026-05-26-global-local-diff.md` — the diff that drove migration
- `reports/philosophy/pp-002-2026-05-26-session-self-test.md` — the test run that caught 5 FAILs

`philosophy/active/` and `philosophy/tests/` directories were deleted after migration (content lives in global catalog 009–015). Audit trail is the two `reports/philosophy/` files above.

## Action for future Claude sessions on this project
1. Invoke `/philosophy-prompting capture <text>` — this routes to the global skill.
2. Do NOT add new entries to `philosophy/active/` — that path is retired.
3. CANT_BE_DONE.md at project root is a separate artifact — it stays. It is not part of this skill.
