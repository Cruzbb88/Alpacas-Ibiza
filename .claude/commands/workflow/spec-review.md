---
description: "Code-level spec compliance review (no browser/e2e — use /e2e-test for that)"
argument-hint: "[spec-file]"
allowed-tools: Bash, Read, Glob, Grep, Write
---

# Spec Review

Follow the `Instructions` below to **review work done against a specification file** (specs/*.md) to ensure implemented features match requirements. Use the spec file to understand the requirements and then use the git diff if available to understand the changes made. If there are issues, report them if not then report success.

> **For visual/UI/e2e validation, use `/e2e-test` instead.**

## Mode Detection

**Auto-detect ADW mode:** If the preamble mentions "ADW_MODE=1" or "automated ADW pipeline", run in lean mode:
- Skip review_dir creation and summary.md file — output findings inline
- Prioritize: migration exists, models registered, router wired, RLS enabled
- Skip cosmetic issues (import order, line length, naming style)
- After 15 tool calls, start writing the verdict regardless of remaining checks
- No Cortex storage — the ADW pipeline handles that
- Target completion in **under 3 minutes**

## Variables

spec_file: $ARGUMENT (optional - auto-detected from specs/done/ or specs/todo/ if not provided)

## Review Output Directory

Screenshots and summary are saved to a structured `reviews/` folder at the project root:

```
reviews/
└── {spec-slug}/
    └── {YYYY-MM-DD_HHMM}/
        └── summary.md
```

### Folder Naming Rules
- **spec-slug**: Derived from the spec filename, e.g. `01-gridrunner-foundation.md` → `spec-01-foundation`
  - Strip leading number prefix and trailing `.md`
  - Prefix with `spec-` and use the first number + last meaningful word(s)
  - Keep it short and scannable (e.g. `spec-01-foundation`, `spec-02-brain-dump`, `spec-03-gallery`)
- **timestamp**: Current date + time as `YYYY-MM-DD_HHMM` (24h, local time)

### Setup
- At the start of the review, determine the `review_dir` path using the rules above
- Create the directory if it doesn't exist: `mkdir -p <review_dir>` (or PowerShell equivalent)
- At the end of the review, write `summary.md` into this same directory

## Instructions

- Check current git branch using `git branch` to understand context
- Run `git diff origin/main` (or `origin/master`) to see all changes made in current branch. Continue even if there are no changes related to the spec file.
- Find the spec file:
  - If provided as argument, use that path directly
  - Otherwise, look in `specs/done/` first (recursively, including project subfolders), then `specs/todo/` for the most recently modified spec
  - If multiple specs exist, pick the one matching the current branch name or the most recent
- Read the identified spec file to understand requirements
- Compare the implementation (via git diff, reading source files, Grep, Glob) against each requirement in the spec
- Check for completeness: are all specified features/functions/endpoints/configs present?
- Check for correctness: does the implementation match the spec's intent (naming, behavior, structure)?
- IMPORTANT: Issue Severity Guidelines
  - Think hard about the impact of the issue on the feature and the user
  - Guidelines:
    - `skippable` - the issue is non-blocker for the work to be released but is still a problem
    - `tech_debt` - the issue is non-blocker for the work to be released but will create technical debt that should be addressed in the future
    - `blocker` - the issue is a blocker for the work to be released and should be addressed immediately. It will harm the user experience or will not function as expected.
- IMPORTANT: Output a human-readable review summary based on the `Report` section below
  - Use markdown formatting with headers, bullet points, and status indicators
  - Make the output easy to scan and understand at a glance
- Ultra think as you work through the review process. Focus on the critical functionality paths and the user experience. Don't report issues if they are not critical to the feature.

## Report

Provide a human-readable review summary using markdown formatting:
- Use ✅ for success, ⚠️ for issues, ❌ for blockers
- Success = NO BLOCKING issues (can have skippable/tech_debt issues)

### Output Format (displayed to user)

```
## Spec Review Results

**Spec:** [spec file path]
**Status:** ✅ APPROVED | ⚠️ APPROVED_WITH_NOTES | ❌ NEEDS_CHANGES

### Summary
[2-4 sentences describing what was built and whether it matches the spec]

### Requirements Checklist
- ✅ Requirement 1 - Implemented correctly
- ✅ Requirement 2 - Implemented correctly
- ⚠️ Requirement 3 - Partial (minor issue)

### Issues Found (if any)

**Issue #1** (skippable|tech_debt|blocker)
- Description: [what's wrong]
- Resolution: [how to fix]

### Recommendation
[APPROVED / APPROVED_WITH_NOTES / NEEDS_CHANGES] - [brief rationale]
```

## Workflow

1. Determine `review_dir` path from spec name and current timestamp; create it
2. Check current git branch and run `git diff origin/main` to understand all changes made
3. Find the spec file (from argument, or auto-detect from `specs/done/` then `specs/todo/`)
4. Read the spec file to extract all requirements
5. Review implementation by reading source files, checking git diff, using Grep/Glob to verify code-level compliance
6. Compare implementation against each spec requirement; assign severity to any gaps
7. Write `summary.md` into `review_dir` with concise verdict, checklist, issues, and next steps
8. Output human-readable review summary

## ADW Pipeline Resilience (Anti-Stall)

When running inside an ADW pipeline, the spec-review phase is budget-limited (40 turns max).
If API responses are slow (gaps > 30s between tool responses), reduce scope:

1. **Write findings incrementally** — append to summary.md after EACH file check, not at the end.
   This prevents losing all work if the phase stalls mid-execution (ADW 021 lost all findings).
2. **Prioritize checks**: migration exists, models registered, router wired, RLS enabled.
   Skip cosmetic issues (import order, line length) under time pressure.
3. **After 25 tool calls**, start writing the final summary regardless of remaining checks.
   A partial review with blockers identified is better than a stall with nothing written.

## Summary File (summary.md)

After the review is complete, write a `summary.md` file into the `review_dir`. This file should be **concise and information-dense** - designed for fast scanning during future reviews.

### summary.md Format

```markdown
# Review: {spec name}
**Date:** {YYYY-MM-DD HH:MM}
**Spec:** {spec file path}
**Status:** APPROVED | APPROVED_WITH_NOTES | NEEDS_CHANGES
**Branch:** {git branch}

## Verdict
{1-2 sentence summary. What was built, does it match spec.}

## Checks
- ✅ {requirement}
- ✅ {requirement}
- ⚠️ {requirement} — {brief note}

## Issues
{If none: "None."}
{If any:}
- **#{n}** ({severity}) {one-line description} → {fix action}

## Next
- {action item 1}
- {action item 2}
```

Key rules for summary.md:
- **No filler words** - every word earns its place
- **Action-oriented** - issues state the fix, not just the problem
- **Scannable** - someone should understand the review in 10 seconds
