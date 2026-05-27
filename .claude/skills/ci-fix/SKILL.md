---
name: "ci-fix"
description: >-
  Auto-diagnose and fix CI failures for the Process Catalogue project
  (behnker/process_catalogue_x). Pattern-matches against a knowledge base
  of 7 known failure types with auto-fix capabilities. Use when: (1) CI
  fails after a push, (2) Vercel deploy shows errors, (3) Want to check
  CI health or trends, (4) Need to fix someone else's broken push.
argument-hint: "quick | deep"
---

# CI Fix

Auto-diagnose and fix CI failures using pattern recognition against a knowledge base of known failure types.

## Architecture

| Layer | Name | Weight | Description |
|-------|------|--------|-------------|
| L1 | Diagnose | 40% | Fetch most recent CI failure via gh CLI, parse logs, match against known patterns |
| L2 | Fix & Verify | 40% | Apply auto-fix, run local verification suite, commit, push, monitor re-run |
| L3 | Trend Analysis | 20% | Analyze last N runs, detect systemic issues, generate report |

## Mode Matrix

| Mode | Argument | Layers | Report | Description |
|------|----------|--------|--------|-------------|
| Quick | `quick` | L1 | No | Diagnose only: show what's wrong and how to fix it |
| Default | *(none)* | L1 + L2 | No | Diagnose, fix, verify locally, commit, push |
| Deep | `deep` | L1 + L2 + L3 | Yes | Full fix + trend analysis + CI guide update |

## Project Context

- **Repo:** `behnker/process_catalogue_x` (submodule at `apps/process-catalogue/`)
- **CI workflow:** `.github/workflows/ci.yml` (at repo root, NOT inside `build/`)
- **Pre-push hook:** `build/.husky/pre-push` -> `build/scripts/pre-push-check.sh`
- **CI guide:** `Docs/guides/CI-GUIDE-FOR-RALPH.md`
- **Working directory for fixes:** `apps/process-catalogue/build/`

## Execution

### L1: Diagnose

1. **Fetch recent runs:**
   ```bash
   gh run list --repo behnker/process_catalogue_x --limit 5 --json databaseId,conclusion,displayTitle,createdAt
   ```

2. **Find the most recent failed run.** If all 5 pass, report "CI is green" and exit.

3. **Get failure details:**
   ```bash
   gh run view {id} --repo behnker/process_catalogue_x
   gh run view {id} --repo behnker/process_catalogue_x --log-failed 2>/dev/null | tail -80
   gh run view {id} --repo behnker/process_catalogue_x --json jobs --jq '.jobs[] | select(.conclusion=="failure") | {name, conclusion}'
   ```

4. **Check annotations** for billing/account issues (Pattern 6).

5. **Match against known patterns.** Read `references/known-patterns.md` and match error log content against each pattern's detection criteria. Score confidence (0-100).

6. **Display diagnosis:**
   ```
   CI Run #{id}: FAILED
   Commit: {sha} — {title}
   Failed jobs: {job names}

   Pattern match: {pattern name} ({confidence}% confidence)
   Root cause: {description}
   Auto-fixable: Yes/No
   Fix: {command or instruction}
   ```

   If quick mode, stop here.

### L2: Fix & Verify

1. **Apply the fix** based on matched pattern:

   | Pattern | Fix Command |
   |---------|------------|
   | Ruff F401 | `cd apps/process-catalogue/build && python -m ruff check packages/api/src/ --fix` |
   | Deprecated ESLint | Grep + remove offending `eslint-disable` comments |
   | Lockfile drift | `cd apps/process-catalogue/build && pnpm install` |
   | Alembic heads | `cd apps/process-catalogue/build/packages/api && python -m alembic merge heads -m "merge migration heads"` |
   | Schema drift | Search + replace (ask user for confirmation) |
   | Billing | Inform user: "Fix billing at github.com/settings/billing" -- no auto-fix |
   | Node mismatch | Suggest ci.yml update (ask user first) |

2. **Run local verification suite:**
   ```bash
   cd apps/process-catalogue/build
   python -m ruff check packages/api/src/
   pnpm --filter @process-catalogue/web lint
   pnpm --filter @process-catalogue/web exec tsc --noEmit
   pnpm --filter @process-catalogue/web build
   ```
   If any check fails, diagnose the new error (may be a second pattern).

3. **Commit the fix:**
   ```
   fix: resolve CI failure: {pattern_name}

   Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
   ```

4. **Push** (pre-push hooks provide additional validation).

5. **Monitor re-run:**
   ```bash
   gh run list --repo behnker/process_catalogue_x --limit 1 --json databaseId,conclusion,status
   ```
   Report whether the new run is queued/in_progress/success/failure.

### L3: Trend Analysis (deep mode only)

1. **Fetch last 20 runs:**
   ```bash
   gh run list --repo behnker/process_catalogue_x --limit 20 --json databaseId,conclusion,displayTitle,createdAt
   ```

2. **Calculate metrics:**
   - Failure rate (last 20, last 10, last 5)
   - Failures by pattern category
   - Trend direction (improving/stable/worsening)
   - Mean time between failures

3. **Check if CI guide needs updating** -- read `Docs/guides/CI-GUIDE-FOR-RALPH.md`, compare failure history table against actual recent runs.

4. **Save report** to `reports/ci-fix/cf-{NNN}-{YYYY-MM-DD}-ci-trend-analysis.md` with YAML frontmatter.

## Cortex & Brain Integration

### Omni-Cortex
- **CLI:** `cortex remember "CI fix: {pattern} in {commit}" --tags ci-fix,{pattern} --importance 60`
- **MCP:** `cortex_recall` with query "CI failure {pattern}" for trend analysis

## Reference Files

| File | Purpose | When to Read |
|------|---------|-------------|
| `references/known-patterns.md` | 7 documented failure patterns with detection, fix, and prevention | During L1 diagnosis: match error logs against patterns |
