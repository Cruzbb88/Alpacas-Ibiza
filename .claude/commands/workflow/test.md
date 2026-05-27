---
allowed-tools: Bash, Read, Glob, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember
description: Universal test validation suite with human-readable output
argument-hint: [--fix] [--quick]
model: sonnet
---

# Application Validation Test Suite

Execute comprehensive validation tests for both frontend and backend components. Automatically detects project type and runs appropriate tests.

## Purpose

Proactively identify and fix issues in the application before they impact users or developers:
- Detect syntax errors, type mismatches, and import failures
- Identify broken tests or security vulnerabilities
- Verify build processes and dependencies
- Ensure the application is in a healthy state

## Variables

FIX_MODE: Arguments contain "--fix"
QUICK_MODE: Arguments contain "--quick"
TEST_TIMEOUT: 300000

## Pre-Test Memory Check

Before running tests:
- Recall previous test failures: `cortex_recall: "test failure {project_name}"`
- Check for flaky tests: `cortex_recall: "flaky test"`
- Use recalled context to anticipate known issues

## Project Detection

First, detect the project type by checking for key files:
- `package.json` → Node.js/JavaScript project
- `pyproject.toml` or `requirements.txt` → Python project
- `Cargo.toml` → Rust project
- `go.mod` → Go project

Read `package.json` to determine framework (Next.js, React, Vue, etc.) and available scripts.

## Test Execution

Execute tests based on detected project type. Run ALL tests even if some fail.

### For Node.js/TypeScript Projects

1. **TypeScript Type Check** (if tsconfig.json exists)
   - Command: `npx tsc --noEmit`
   - Purpose: Validates TypeScript types, catches type errors and missing imports

2. **Linting** (if lint script exists)
   - Command: `npm run lint` (or `npm run lint -- --fix` in FIX_MODE)
   - Purpose: Code quality, unused imports, style violations

3. **Build** (if build script exists)
   - Command: `npm run build`
   - Purpose: Full production build validation

4. **Tests** (if test script exists, skip in QUICK_MODE)
   - Command: `npm test`
   - Purpose: Unit and integration tests

### For Python Projects

1. **Python Syntax Check**
   - Command: `python -m py_compile <main files>`
   - Purpose: Validates Python syntax

2. **Linting** (if ruff/flake8/pylint available)
   - Command: `ruff check .` or equivalent
   - Purpose: Code quality and style validation

3. **Tests** (if pytest available, skip in QUICK_MODE)
   - Command: `pytest tests/ -v --tb=short`
   - Purpose: Unit and integration tests

## Report

After running all tests, provide a human-readable summary:

```
## Test Results

**Project:** <project name>
**Status:** All Passed | Some Failed | Critical Failure

### Summary
- Total Tests: <count>
- Passed: <count>
- Failed: <count>
- Skipped: <count>

### Test Details

**TypeScript Check** - Passed
   Types validated successfully

**ESLint** - Passed
   No linting errors

**Build** - Failed
   Error: Module not found: '@/components/Missing'
   Command: `npm run build`

**Unit Tests** - Skipped (QUICK_MODE)

### Failed Tests (if any)

1. **<test name>**
   - Error: <error message>
   - Command: `<command to reproduce>`
   - Suggestion: <brief fix suggestion if obvious>

### Next Steps

- <actionable next step based on results>
```

## Post-Test Memory Storage

After all tests complete, store results: `cortex_remember`
- Content: Test summary including:
  - Total tests: passed/failed count
  - Failed test names and error summaries
  - Any new flaky tests discovered
- Tags: ["test", "{project_name}", "passed" or "failed"]
- Type: "progress" for all passing, "troubleshooting" for failures
- Include specific error messages for future reference
