---
allowed-tools: all
description: Verify code quality, run tests, and ensure production readiness
argument-hint: "specific files, areas, or quality requirements to check (optional)"
model: sonnet
---

> Report format: See ~/.claude/skills/REPORT-CONVENTION.md

**THIS IS NOT A REPORTING TASK - THIS IS A FIXING TASK!**

## Arguments Integration

**Task Arguments**: ARGUMENTS$

**Apply check protocol to arguments:**
1. ken-you-remember: Store specific files/areas to check
2. Extract quality requirements from user description
3. Verify all mentioned files exist with Read tool
4. Store user quality standards and expectations

---

When you run `/check`, you are REQUIRED to:

1. **IDENTIFY** all errors, warnings, and issues
2. **FIX EVERY SINGLE ONE** - not just report them!
3. **USE MULTIPLE AGENTS** to fix issues in parallel:
   - Spawn one agent to fix linting issues
   - Spawn another to fix test failures
   - Spawn more agents for different files/modules
   - Say: "I'll spawn multiple agents to fix all these issues in parallel"
4. **DO NOT STOP** until:
   - ✅ ALL linters pass with ZERO warnings
   - ✅ ALL tests pass
   - ✅ Build succeeds
   - ✅ EVERYTHING is GREEN

**FORBIDDEN BEHAVIORS:**
- ❌ "Here are the issues I found" → NO! FIX THEM!
- ❌ "The linter reports these problems" → NO! RESOLVE THEM!
- ❌ "Tests are failing because..." → NO! MAKE THEM PASS!
- ❌ Stopping after listing issues → NO! KEEP WORKING!

**MANDATORY WORKFLOW:**
```
1. Run checks → Find issues
2. IMMEDIATELY spawn agents to fix ALL issues
3. Re-run checks → Find remaining issues
4. Fix those too
5. REPEAT until EVERYTHING passes
```

**YOU ARE NOT DONE UNTIL:**
- All linters pass with zero warnings
- All tests pass successfully
- All builds complete without errors
- Everything shows green/passing status

---

🛑 **MANDATORY PRE-FLIGHT CHECK** 🛑
1. Re-read ~/.claude/CLAUDE.md RIGHT NOW
2. Check current TODO.md status
3. Verify you're not declaring "done" prematurely

Execute comprehensive quality checks with ZERO tolerance for excuses.

**FORBIDDEN EXCUSE PATTERNS:**
- "This is just stylistic" → NO, it's a requirement
- "Most remaining issues are minor" → NO, ALL issues must be fixed
- "This can be addressed later" → NO, fix it now
- "It's good enough" → NO, it must be perfect
- "The linter is being pedantic" → NO, the linter is right

Let me ultrathink about validating this codebase against our exceptional standards.

🚨 **REMEMBER: Hooks will verify EVERYTHING and block on violations!** 🚨

**Universal Quality Verification Protocol:**

**Step 0: Hook Status Check**
- Run `~/.claude/hooks/smart-lint.sh` directly to see current state
- If ANY issues exist, they MUST be fixed before proceeding
- Check `~/.claude/hooks/violation-status.sh` if it exists

**Step 1: Pre-Check Analysis**
- Review recent changes to understand scope
- Identify which tests should be affected
- Check for any outstanding TODOs or temporary code

**Step 1.5: Python Dependency Verification (If Applicable)**
If the project uses Python with `pyproject.toml`:
1. Scan all Python files for imports: `find . -name "*.py" -exec grep -h "^import \|^from " {} + | sort -u`
2. Verify all third-party packages are in `pyproject.toml` dependencies
3. Common missing dependencies to check:
   - `python-multipart` - required when using FastAPI's `UploadFile`
   - `httpx` - required for async HTTP client calls
   - Any package imported but not in pyproject.toml
4. Add missing dependencies immediately: `uv add {package-name}`
5. Report any additions made

**Step 1.6: Python Import Validation (If Applicable)**
For Python FastAPI projects with relative imports:
1. **DO NOT** use standalone `python -c "from module import x"` - this fails on relative imports
2. **ALWAYS** use server startup test: `uvicorn app.server.main:app --help` or similar
3. This validates all imports correctly by loading the full application package
4. Standalone imports fail because FastAPI modules use `from ..database import get_pool` patterns
5. Server startup is the canonical import validation method

**Step 2: Language-Agnostic Linting**
Run appropriate linters for ALL languages in the project:
- `make lint` if Makefile exists
- `~/.claude/hooks/smart-lint.sh` for automatic detection
- Manual linter runs if needed

**Universal Requirements:**
- ZERO warnings across ALL linters
- ZERO disabled linter rules without documented justification
- ZERO "nolint" or suppression comments without explanation
- ZERO formatting issues (all code must be auto-formatted)

**For Go projects specifically:**
- ZERO warnings from golangci-lint (all checks enabled)
- No disabled linter rules without explicit justification
- No use of interface{} or any{} types
- No nolint comments unless absolutely necessary with explanation
- Proper error wrapping with context
- No naked returns in functions over 5 lines
- Consistent naming following Go conventions

**Step 3: Test Verification**
Run `make test` and ensure:
- ALL tests pass without flakiness
- Test coverage is meaningful (not just high numbers)
- Table-driven tests for complex logic
- No skipped tests without justification
- Benchmarks exist for performance-critical paths
- Tests actually test behavior, not implementation details

**Go Quality Checklist:**
- [ ] No interface{} or any{} - concrete types everywhere
- [ ] Simple error handling - no custom error hierarchies
- [ ] Early returns to reduce nesting
- [ ] Meaningful variable names (userID not id)
- [ ] Proper context propagation
- [ ] No goroutine leaks
- [ ] Deferred cleanup where appropriate
- [ ] No race conditions (run with -race flag)
- [ ] No time.Sleep() for synchronization - channels used instead
- [ ] Select with timeouts instead of polling loops

**Code Hygiene Verification:**
- [ ] All exported symbols have godoc comments
- [ ] No commented-out code blocks
- [ ] No debugging print statements
- [ ] No placeholder implementations
- [ ] Consistent formatting (gofmt/goimports)
- [ ] Dependencies are actually used
- [ ] No circular dependencies

**Security Audit:**
- [ ] Input validation on all external data
- [ ] SQL queries use prepared statements
- [ ] Crypto operations use crypto/rand
- [ ] No hardcoded secrets or credentials
- [ ] Proper permission checks
- [ ] Rate limiting where appropriate

**Performance Verification:**
- [ ] No obvious N+1 queries
- [ ] Appropriate use of pointers vs values
- [ ] Buffered channels where beneficial
- [ ] Connection pooling configured
- [ ] No unnecessary allocations in hot paths
- [ ] No busy-wait loops consuming CPU
- [ ] Channels used for efficient goroutine coordination

**Failure Response Protocol:**
When issues are found:
1. **IMMEDIATELY SPAWN AGENTS** to fix issues in parallel:
   ```
   "I found 15 linting issues and 3 test failures. I'll spawn agents to fix these:
   - Agent 1: Fix linting issues in files A, B, C
   - Agent 2: Fix linting issues in files D, E, F
   - Agent 3: Fix the failing tests
   Let me tackle all of these in parallel..."
   ```
2. **FIX EVERYTHING** - Address EVERY issue, no matter how "minor"
3. **VERIFY** - Re-run all checks after fixes
4. **REPEAT** - If new issues found, spawn more agents and fix those too
5. **NO STOPPING** - Keep working until ALL checks show ✅ GREEN
6. **NO EXCUSES** - Common invalid excuses:
   - "It's just formatting" → Auto-format it NOW
   - "It's a false positive" → Prove it or fix it NOW
   - "It works fine" → Working isn't enough, fix it NOW
   - "Other code does this" → Fix that too NOW
7. **ESCALATE** - Only ask for help if truly blocked after attempting fixes

**Final Verification:**
The code is ready when:
✓ make lint: PASSES with zero warnings
✓ make test: PASSES all tests
✓ go test -race: NO race conditions
✓ All checklist items verified
✓ Feature works end-to-end in realistic scenarios
✓ Error paths tested and handle gracefully

**Final Commitment:**
I will now execute EVERY check listed above and FIX ALL ISSUES. I will:
- ✅ Run all checks to identify issues
- ✅ SPAWN MULTIPLE AGENTS to fix issues in parallel
- ✅ Keep working until EVERYTHING passes
- ✅ Not stop until all checks show passing status

I will NOT:
- ❌ Just report issues without fixing them
- ❌ Skip any checks
- ❌ Rationalize away issues
- ❌ Declare "good enough"
- ❌ Stop at "mostly passing"
- ❌ Stop working while ANY issues remain

**REMEMBER: This is a FIXING task, not a reporting task!**

The code is ready ONLY when every single check shows ✅ GREEN.

**Executing comprehensive validation and FIXING ALL ISSUES NOW...**

## Cortex Integration

After all checks pass, store results for quality tracking:
```bash
cortex remember "Check results for $(basename $PWD): lint=[pass/fail], tests=[pass/fail] ([N] tests), build=[pass/fail]. [N] issues fixed" --tags check,quality,$(basename $PWD | tr '[:upper:]' '[:lower:]') --importance 60 2>/dev/null || true
```

## Instructions

- This is a FIXING task, not a reporting task — identify issues and fix every single one
- Never stop at listing issues — spawn agents in parallel and resolve them immediately
- Zero tolerance: zero linter warnings, zero test failures, zero build errors
- For Go projects: use golangci-lint, no interface{}, no nolint without justification
- For Python projects: verify pyproject.toml includes all imported packages; use server startup for import validation
- FORBIDDEN: "this is just stylistic", "it's good enough", "most issues are minor"

## Workflow

1. Run all linters (`make lint`, `smart-lint.sh`, or language-specific linters) to get the full issue list
2. Spawn parallel agents to fix linting issues across different files simultaneously
3. Run the test suite (`make test`) — fix every failing test
4. Re-run all checks to verify everything is green
5. If new issues surface, repeat until zero issues remain

## Report Output

### Previous Report Lookup

Before generating the report:
1. Check for previous reports: Glob `reports/check/chk-*.md`
2. If found, read the most recent one's YAML frontmatter
3. Extract `composite_score` as `previous_composite` for the new report
4. Calculate `score_delta` and `trend` from the comparison

### Report File

Save the report to `reports/check/chk-{NNN}-{YYYY-MM-DD}-{slug}.md` using convention numbering.

The report MUST include this YAML frontmatter at the top:

```yaml
---
report_type: "check"
report_number: {N}
date: "YYYY-MM-DD"
project_name: "{name}"
project_tag: "{slug}"
mode: "{full|targeted}"
composite_score: {0-100|null}
previous_composite: {0-100|null}
score_delta: "{+N|-N|---}"
trend: "{first_run|improving|declining|stable}"
---
```

Calculate `composite_score` from quality gates passed: weight linting (30%), tests (40%), build (30%). Use null if checks could not be run.

### Report Body

Present a final status summary:
- Linting: PASS or list of remaining issues (should be zero)
- Tests: PASS (N tests) or list of failures (should be zero)
- Build: SUCCESS or errors
- What was fixed (brief list of changes made)

### Delta Section

If a previous report exists, include after the main body:

```markdown
## Changes Since Last Report

**NEW** ({count} items):
- [NEW] {item description}

**RESOLVED** ({count} items):
- [RESOLVED] {item description}

**MOVED** ({count} items):
- [MOVED] {item}: {previous_category} -> {current_category}

**PROGRESS** ({count} items):
- [PROGRESS] {item}: {previous_%}% -> {current_%}%
```

Omit categories with 0 items. First report = omit delta section entirely.

### Trend Section

If 3+ previous reports exist in `reports/check/`, include:

```markdown
## Trend (last {N} reports)

| Report | Date | Score | Lint Issues | Test Failures | Build |
|--------|------|-------|-------------|---------------|-------|
| ... | ... | ... | ... | ... | ... |

**Direction:** {first} -> {last} ({arrow}, {+/-N%})
```

If fewer than 3 reports exist, show: `> Trend tracking available after 3+ reports ({N} exist).`

