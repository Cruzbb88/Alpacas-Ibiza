# Known CI Failure Patterns

Knowledge base for `/ci-fix` skill. Each pattern has detection regex, severity, fix command, and prevention.

## Pattern 1: Ruff F401 (Unused Imports)

- **Detection:** Log contains `F401` or `imported but unused`
- **Severity:** Critical (blocks API Lint job)
- **Auto-fixable:** Yes
- **Fix command:** `cd apps/process-catalogue/build && python -m ruff check packages/api/src/ --fix`
- **Root cause:** ADW agents or commits without lint-staged push code with unused imports
- **Prevention:** Run `ruff check src/ --fix` before every Python commit
- **Frequency:** ~15% of failures

## Pattern 2: Deprecated ESLint Rules

- **Detection:** Log contains `Definition for rule` AND `was not found`
- **Severity:** Critical (blocks Web Build job)
- **Auto-fixable:** Yes
- **Fix command:** Grep for the rule name in `eslint-disable` comments and remove them
- **Example:** `@typescript-eslint/no-var-requires` removed in typescript-eslint v6+
- **Root cause:** Node version mismatch (local Node 20 vs CI Node 24 = different plugin versions)
- **Prevention:** Don't add `eslint-disable` for rules you haven't verified exist in CI
- **Frequency:** New pattern (3 runs as of 2026-03-29)

## Pattern 3: Lockfile Drift

- **Detection:** Log contains `ERR_PNPM_OUTDATED_LOCKFILE` or `frozen-lockfile`
- **Severity:** Critical (blocks all pnpm install steps)
- **Auto-fixable:** Yes
- **Fix command:** `cd apps/process-catalogue/build && pnpm install`
- **Root cause:** Merge conflicts in pnpm-lock.yaml or dependency changes without lockfile regen
- **Prevention:** Run `pnpm install` after any package.json change or merge conflict resolution
- **Frequency:** ~10% of failures

## Pattern 4: Alembic Migration Conflicts (Multiple Heads)

- **Detection:** Log contains `multiple heads` or `FAILED: alembic heads`
- **Severity:** Critical (blocks API Tests job)
- **Auto-fixable:** Yes
- **Fix command:** `cd apps/process-catalogue/build/packages/api && python -m alembic merge heads -m "merge migration heads"`
- **Root cause:** Parallel ADW pipeline merges creating branching migration chains
- **Prevention:** Check `alembic heads` before pushing; never create parallel migrations on same branch
- **Frequency:** ~57% of historical failures (highest single cause)

## Pattern 5: TypeScript Schema Drift

- **Detection:** Log contains `error TS2339` or `does not exist on type`
- **Severity:** Critical (blocks Web Build job)
- **Auto-fixable:** No (interactive -- needs human decision on rename)
- **Fix approach:** Search frontend for old field name, replace with new name, verify with `tsc --noEmit`
- **Root cause:** Backend ORM field renames not propagated to frontend TypeScript types
- **Prevention:** When renaming ANY backend field, grep frontend and update all references
- **Frequency:** ~5% of failures

## Pattern 6: GitHub Actions Billing

- **Detection:** Annotation contains `payments have failed` or `spending limit`
- **Severity:** Blocking (all jobs fail immediately)
- **Auto-fixable:** No (user must update billing at github.com/settings/billing)
- **Fix approach:** Inform user, provide billing URL
- **Root cause:** GitHub billing/account payment failure
- **Prevention:** Keep payment method current, set spending alerts
- **Frequency:** Rare (1 occurrence 2026-03-29)

## Pattern 7: Node Version Mismatch

- **Detection:** Warning about `deprecated` Node.js version + ESLint errors that don't reproduce locally
- **Severity:** Warning (may cause false ESLint failures)
- **Auto-fixable:** Partial (update ci.yml node-version OR update local Node)
- **Fix approach:** Align CI and local Node versions. Current: CI uses Node 24, local uses Node 20.
- **Root cause:** GitHub Actions deprecated Node 20, forces Node 24. Different ESLint plugin versions.
- **Prevention:** Pin the same Node version in ci.yml and local .nvmrc
- **Frequency:** Systemic (affects all ESLint-related failures)

## Quick Diagnosis Flow

```
1. Check annotations first (billing? -> Pattern 6)
2. Check API Lint job (ruff F401? -> Pattern 1)
3. Check Web Build job:
   a. "rule was not found" -> Pattern 2
   b. "frozen-lockfile" -> Pattern 3
   c. "error TS2339" -> Pattern 5
4. Check API Tests job (multiple heads? -> Pattern 4)
5. Check for Node deprecation warning -> Pattern 7
```
