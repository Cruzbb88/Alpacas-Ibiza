---
name: scorm
description: >-
  SCORM 1.2 build, validate, debug, and deploy skill with 32+ issue knowledge base.
  Wraps build-scorm.ts with pre/post validation guardrails. 4-layer architecture:
  L1 Quick Validate, L2 Standard Build, L3 Deep Debug, L4 Full Deploy.
  Use when: (1) Building SCORM packages, (2) Debugging SCORM errors (CORS, manifest,
  API timing), (3) Scaffolding new SCORM units, (4) Deploying SCORM backend + ZIPs,
  (5) User says "scorm", "build zip", "scorm validate", "scorm debug".
argument-hint: "validate | build [unit] | debug <error> | deploy | scaffold <name> | full"
model: opus
---

# SCORM Skill

4-layer skill for building, validating, debugging, and deploying SCORM 1.2 packages. Wraps the existing `build-scorm.ts` pipeline with guardrails from 32+ documented issues.

## Arguments

Parse `$ARGUMENTS` to determine mode:

| Input | Mode | Layers |
|-------|------|--------|
| *(empty)* | Help | Show available commands |
| `validate` | Validate | L1 only |
| `build` | Build | L1 + L2 (all units) |
| `build <unit>` | Build | L1 + L2 (specific unit) |
| `debug <symptom>` | Debug | L3 only |
| `deploy` | Deploy | L1-L4 |
| `scaffold <name>` | Scaffold | L2 scaffold sub-workflow |
| `full` | Full | L1-L4 with report |

## Project Detection

Before any layer, detect the SCORM project:

1. Check if `scorm-app/scripts/build-scorm.ts` exists relative to cwd
2. If not, check if cwd IS a scorm-app directory (look for `scripts/build-scorm.ts`)
3. Set `SCORM_ROOT` = path to the scorm-app directory
4. Set `MONOREPO_ROOT` = parent of SCORM_ROOT (for Vercel deploy)
5. If not found: "No SCORM project detected. Run from the monorepo root or scorm-app directory."

## Execution

Read `commands/scorm.md` for the full layer definitions and workflow for the selected mode.

### Mode: Help (no arguments)

Display:
```
SCORM Skill - Available Commands:

  /scorm validate           Quick pre-build checks (< 5s)
  /scorm build              Validate + build all units
  /scorm build <unit>       Validate + build specific unit
  /scorm debug <symptom>    Look up error in knowledge base
  /scorm deploy             Full validate + build + deploy pipeline
  /scorm scaffold <name>    Create new SCORM unit from template
  /scorm full               All layers with composite score report

Available units: pathway_viewer, assignment, oral_assessment, grade_report,
  grade_feedback, plagiarism_viewer, portfolio, feedback_survey,
  career_counselor, final_transcript
```

### Mode: Validate

Run L1 from `commands/scorm.md`. Display checklist with pass/fail/warn indicators.

### Mode: Build

Run L1, then L2 from `commands/scorm.md`. If L1 score < 60, abort and show failures. Optional `<unit>` filters to a single unit type.

### Mode: Debug

Run L3 from `commands/scorm.md`. Takes an error message or symptom. Searches `references/issue-kb.md`. If no KB match, runs flow tracing.

### Mode: Deploy

Run L1-L4 from `commands/scorm.md`. Requires user confirmation before `vercel --prod`. Saves composite score report.

### Mode: Scaffold

Run L2 scaffold sub-workflow from `commands/scorm.md`. Creates new unit from `templates/`.

### Mode: Full

Run L1-L4 from `commands/scorm.md`. Saves composite score report.

## Composite Scoring (deploy/full modes)

```
composite = (L1 x 0.30) + (L2 x 0.30) + (L3 x 0.25) + (L4 x 0.15)
```

Thresholds:
- 80-100: Build healthy, deploy safe
- 60-79: Minor issues, review before deploy
- 40-59: Significant issues, fix before deploy
- 0-39: Critical -- do not deploy

If a layer is N/A, redistribute its weight equally among available layers.

## Reference Files

- `references/issue-kb.md` -- 32+ categorized issues with solutions
- `references/lms-talentlms.md` -- TalentLMS quirks, sizing, API limits
- `references/scorm-12-spec.md` -- SCORM 1.2 API quick reference

## Templates

- `templates/base-unit.tsx` -- Base SCORM unit React component
- `templates/assignment-unit.tsx` -- File upload + grading flow
- `templates/voice-unit.tsx` -- ElevenLabs voice integration
- `templates/viewer-unit.tsx` -- Airtable data dashboard
- `templates/imsmanifest-entry.xml` -- Manifest entry for new units
