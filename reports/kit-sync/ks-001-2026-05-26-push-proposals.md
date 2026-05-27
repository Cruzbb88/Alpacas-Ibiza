---
id: ks-001-push-proposals
date: 2026-05-26
type: kit-sync push-back proposal
status: RECOMMENDATION READY — no action taken
policy: Read-only. Do not push without Cruz's go.
---

# Kit Sync Push-Back Proposal — Alpaca Farm Redesign → Global Kit
**Date:** 2026-05-26  
**Source project:** `C:\Users\cruzb\projects\alpaca-farm-redesign`  
**Global kit target:** `C:\Users\cruzb\.claude\`  
**Prior report:** `ks-001-2026-05-26-push-back-proposal.md` (ks-001 series covers skill-level sync; this report covers conventions and templates)

---

## What was verified before writing this

1. `philosophy/active/` — 8 seeds confirmed. All 8 are already in global catalog (entries 009–015 + 004). Content matches. **No push needed for philosophies.**
2. Global catalog at `~/.claude/skills/philosophy-prompting/catalog/` — 15 entries (001–015), includes `linked_practice: "PRACTICES.md Rule 11 (alpaca project)"`. Catalog is already the global home.
3. `.claude/agent-teams-config.md` — project-local; no matching file at `~/.claude/`. No `agent-teams-config.md` in global skill folder either.
4. Report templates (wave-synthesis, reality-check, incompleteness) — exist only under `reports/` in this project. Not in kit.
5. `CANT_BE_DONE.md` — project-local; no global equivalent found in kit or `~/.claude/`.
6. `PRACTICES.md` — project-local; no global template found in kit or `~/.claude/`.
7. Recurrence-log convention (`## Recurrences` block in philosophy seeds) — present in this project's `philosophy/active/*.md`; global catalog entries do not include a `## Recurrences` section yet.

---

## Proposal Table (6 candidates)

| # | Artifact | Source path | Proposed global destination | Risk | Priority |
|---|---|---|---|---|---|
| P1 | `PRACTICES.md` rule template (Trigger/Rule/Verify/Why + append protocol) | `PRACTICES.md:152-165` (template block) | `~/.claude/skills/philosophy-prompting/references/practices-rule-template.md` | Low | HIGH |
| P2 | `CANT_BE_DONE.md` format (4 required fields + retire convention) | `CANT_BE_DONE.md:1-84` (format spec) | `~/.claude/skills/philosophy-prompting/references/cant-be-done-template.md` | Low | HIGH |
| P3 | Recurrence-log convention (`## Recurrences` block in catalog entries) | `philosophy/active/*.md` (all 8 have the section) | Patch `~/.claude/skills/philosophy-prompting/references/entry-template.md` — add `## Recurrences` section | Low | HIGH |
| P4 | `agent-teams-config.md` (4 named patterns: verification, wave-audit, spec-execution, peer-pattern-scan) | `.claude/agent-teams-config.md` | `~/.claude/skills/agent-teams/references/named-patterns.md` | Med | MED |
| P5 | Wave-synthesis report template | `reports/wave-0-synthesis-2026-05-26.md` (structure: score table + cross-agent critical finding + top-10 + CAN'T DO WITHOUT HELP) | `~/.claude/skills/agent-teams/references/wave-synthesis-template.md` | Low | MED |
| P6 | Reality-check report template | `reports/reality-check-vs-peers-2026-05-26.md` (structure: peer baselines + scored comparison per axis + gaps to close) | `~/.claude/skills/site-assets/references/reality-check-template.md` | Low | LOW |

---

## Top 3 Highest-Value Pushes

### P1 — PRACTICES rule template
The Trigger/Rule/Verify/Why structure (plus the append protocol at `PRACTICES.md:152-165`) is the most reusable artifact in this project. It converts raw session corrections into machine-checkable rules with a self-expiry mechanism (Verify step). Any project using philosophy-prompting could drop this template into its root and immediately have a disciplined feedback loop — without reinventing the format. The global `entry-template.md` covers catalog entries but not project-level rules. This fills that gap.

Migration risk: None. It is a template, not code. The source `PRACTICES.md` is not harmed.

### P2 — CANT_BE_DONE format
The 4-field schema (Captured / Why / What to do instead / Re-check trigger) plus the retire-vs-delete convention is a general-purpose "known-limits register" that any project benefits from. It prevents agents from re-attempting proven dead-ends and explicitly encodes the condition under which a limit should be revisited. Nothing like it exists at `~/.claude/`. The format is entirely domain-neutral; the alpaca-specific entries are not pushed — only the schema.

Migration risk: None. Template only.

### P3 — Recurrence-log convention
The `## Recurrences` block in project philosophy seeds (pattern: date + one-sentence description of the re-occurrence) is how a philosophy entry proves its own ongoing relevance. The global `entry-template.md` currently omits this section. Without it, global catalog entries have no mechanism for tracking whether a bad habit was actually cured or keeps recurring. Adding `## Recurrences` to the global template upgrades every future catalog entry with drift-detection capability.

Migration risk: Low. Existing global entries (001-015) would need a `## Recurrences` section added manually — but they are editable and the section can start empty.

---

## Remaining Proposals — Notes

### P4 — agent-teams-config.md patterns
The 4 patterns (verification, wave-audit, spec-execution, peer-pattern-scan) are fully generic. All prompt templates use `{PLACEHOLDER}` variables. Session proof links are alpaca-specific but illustrative, not blocking.  
Risk: The spec-execution pattern references `PRACTICES.md` and `CANT_BE_DONE.md` by relative path in its prompt template — if pushed to the global kit, those references need to be updated to say "read the project's PRACTICES.md and CANT_BE_DONE.md if they exist."

### P5 — Wave-synthesis template
The structure (score table, cross-agent critical finding, top-10 ranked by leverage/effort, CAN'T DO WITHOUT HELP aggregation) is reusable across any wave-audit run on any project. Currently only exists as a concrete report, not a template. Value: future projects can invoke `/agent-teams wave-audit` and know exactly what the synthesis output should look like.  
Risk: Low. Pure template, no code.

### P6 — Reality-check template
Scored peer comparison (per axis: visual polish, content depth, trust signals) is site-assets-adjacent work. The template is reusable for any web project doing competitive positioning. Lower priority because site-assets already has its own output schema.

---

## CAN'T DO WITHOUT HELP

**Global vs per-project boundary question — Cruz's call:**

Three of these proposals (P1, P2, P3) effectively elevate project-local conventions to global kit defaults. This is a policy decision, not a technical one:

- If Cruz wants projects to remain free to define their own PRACTICES format, these should stay as **reference templates in the philosophy-prompting skill** (clearly optional).
- If Cruz wants every new project to start with these conventions pre-baked, they should go into a **project-init template** or the `init` skill's scaffolding.

Neither option requires changes to existing projects. The alpaca project's PRACTICES.md and CANT_BE_DONE.md are not touched by this push.

P4 (agent-teams patterns) has a harder dependency: the spec-execution pattern instructs agents to `Read PRACTICES.md and CANT_BE_DONE.md before starting`. If those files don't exist in a project, the instruction fails silently. Pushing P4 as-is without noting that dependency would create a broken pattern in the kit.

---

## How to Execute (when Cruz decides)

```
# P1 — extract template block from PRACTICES.md lines 152-165
# destination: C:\Users\cruzb\.claude\skills\philosophy-prompting\references\practices-rule-template.md

# P2 — extract format spec from CANT_BE_DONE.md (header + How this list grows/shrinks sections)
# destination: C:\Users\cruzb\.claude\skills\philosophy-prompting\references\cant-be-done-template.md

# P3 — patch entry-template.md: add ## Recurrences section after ## Test signature
# destination: C:\Users\cruzb\.claude\skills\philosophy-prompting\references\entry-template.md (edit in place)

# P4 — copy .claude/agent-teams-config.md with path-ref fixes
# destination: C:\Users\cruzb\.claude\skills\agent-teams\references\named-patterns.md

# P5 — extract wave-synthesis schema from reports/wave-0-synthesis-2026-05-26.md
# destination: C:\Users\cruzb\.claude\skills\agent-teams\references\wave-synthesis-template.md

# P6 — extract reality-check schema from reports/reality-check-vs-peers-2026-05-26.md
# destination: C:\Users\cruzb\.claude\skills\site-assets\references\reality-check-template.md
```

No git operations performed. No files copied. Proposal only.
