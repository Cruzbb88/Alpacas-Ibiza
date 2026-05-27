---
id: ks-001
date: 2026-05-26
type: kit-sync push-back proposal
wave: W5.2
status: RECOMMENDATION READY
---

# Kit Sync Push-Back Proposal — 2026-05-26

## Scope

Compared local universal skills at `~/.claude/skills/` against kit source at:
`C:\Users\cruzb\AppData\Local\Temp\claude-collab-kit-extract\claude-collab-kit-master\.claude\`

Also compared project-level skills and commands at `.claude/` (alpaca-farm-redesign) against the same kit source.

---

## Findings Table

| Type | Name | Local Status | Kit Status | Recommended Action |
|------|------|-------------|------------|-------------------|
| Skill | `philosophy-prompting` | New — local only at `~/.claude/skills/` | Not in kit | **PUSH** |
| Skill | `philosophy-prompting` | New — project copy at `.claude/skills/` | Not in kit | **PUSH** (same content) |
| Skill | All 36 other skills (agent-teams, airtable-enhanced, architecture-decision-tracker, billing-reconciler, brainstorm, build, ci-fix, collab-handoff, crystal-ball, data-pipeline, devtools-extract, exploding-pen, file-factory, gigafactory, kit-sync, matrix-reload, meeting-to-specs, memory, performance-optimizer, portfolio-health, probability-storm, proposal-builder, quick-plan, resonance-finder, saas-blueprint-skill, scorm, sipoc, site-assets, skill-creator, skill-roadmap, sop-gen, task-radar, unified-field-theory, video-transcript-extractor, weekly-digest, youtube-bulk) | Kit current (project copy = kit copy, content-identical) | Current | no-op |
| Command | All 43 commands (activity-report, build, check, client-dashboard, client-switch, commit, create-command, crystal-ball/*, error-trends/*, handoff, install, pickup, portfolio-health, quick-plan, retrospective, robocopy, self-heal/*, session-stats, spec-review, test, time-report/*, timeline, tool-stats, update, weekly-digest, write-like-me) | Kit current (project copy = kit copy, content-identical) | Current | no-op |

---

## Push Candidates — Detail

### philosophy-prompting

- **Files:** 20 (excluding .log test artifacts)
- **Total LOC:** 907
- **File breakdown:**
  - `SKILL.md` — 9,461 bytes (main skill definition, 5-layer L1–L5 workflow)
  - `catalog/` — 15 entries (001–015), avg ~2,600 bytes each
  - `references/entry-template.md` — 1,392 bytes
  - `references/hook-template.py` — 2,580 bytes
  - `references/self-reflection-prompts.md` — 1,978 bytes
  - `scripts/run-test.ps1` — 4,198 bytes
- **Value proposition:** Closed-loop methodology (Capture→Record→Diagnose→Test→Enforce) for permanently eliminating recurring AI bad habits; ships with 15 seeded catalog entries covering the most common Claude failure modes (loops, hallucination, stale-trust, narration-only, permission-abuse).
- **Push-back path:** `~/.claude/skills/philosophy-prompting/` → kit `.claude/skills/philosophy-prompting/`
- **Caveats before push:**
  - `catalog/002-test-*.log` and `catalog/test-em-dash-test.log` are local test artifacts — exclude from push.
  - `scripts/run-test.ps1` is Windows PowerShell — add a cross-platform note or bash equivalent before pushing to a kit that targets multiple OS.
  - Catalog entries 001–015 contain Cruz-specific examples (Overwatch FPS, working-set trim, Surity testing). They are illustrative but reviewers may want to strip personal context from catalog entries before publishing upstream.

---

## Kit-Only Skills (informational, no action)

The following skills exist in the kit but are not installed locally (expected — they are excluded per skill exclusion rules or simply not needed for this session):

`agent-teams`, `airtable-enhanced`, `architecture-decision-tracker`, `billing-reconciler`, `brainstorm`, `build`, `ci-fix`, `collab-handoff`, `crystal-ball`, `data-pipeline`, `devtools-extract`, `exploding-pen`, `file-factory`, `gigafactory`, `kit-sync`, `matrix-reload`, `meeting-to-specs`, `memory`, `performance-optimizer`, `portfolio-health`, `probability-storm`, `proposal-builder`, `quick-plan`, `resonance-finder`, `saas-blueprint-skill`, `scorm`, `sipoc`, `site-assets`, `skill-creator`, `skill-roadmap`, `sop-gen`, `task-radar`, `unified-field-theory`, `video-transcript-extractor`, `weekly-digest`, `youtube-bulk`

(All 36 are installed at project level and content-verified as identical to kit.)

---

## Summary

- **1 push candidate:** `philosophy-prompting` (New, not in kit)
- **0 stale items:** All other local content is content-identical to kit
- **0 command diffs:** All 43 project commands match kit exactly

**Recommendation: PUSH philosophy-prompting** after stripping test log artifacts and adding a cross-platform note to `scripts/run-test.ps1`.

---

## How to Execute (when ready)

```
# Analysis only — no git operations performed in this run.
# When Cruz decides to push:
# 1. Copy ~/.claude/skills/philosophy-prompting/ to kit .claude/skills/philosophy-prompting/
# 2. Exclude: catalog/*.log files
# 3. Add note to scripts/run-test.ps1 header: "Windows PowerShell. Linux/macOS equivalent not yet provided."
# 4. Open PR to kit repo with message:
#    feat: Add philosophy-prompting skill (Capture→Enforce loop for AI bad habits)
#    15 catalog entries seeded from real session corrections.
```
