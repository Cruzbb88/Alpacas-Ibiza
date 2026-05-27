---
description: Build the codebase based on the plan, then move plan to done folder
argument-hint: [path-to-plan]
allowed-tools: Read, Write, Bash, Edit, Glob, mcp__omni-cortex__cortex_recall
---

# Build

Follow the `Workflow` to implement the `PATH_TO_PLAN` then `Report` the completed work.

## Instructions

- Read the plan file at PATH_TO_PLAN before implementing anything; ask user which plan if none provided
- Always add import AND its usage in the same Edit call — never add an unused import (linters auto-remove them)
- Use asyncpg directly for Python/FastAPI DB access — never Prisma Python client
- Verify all new dependencies are in pyproject.toml/package.json before using them
- Skip steps 3 (move plan) and 4 (commit) when running inside an ADW pipeline
- Store build outcome in Cortex with tags ["build", "{project_name}", "success" or "failure"]

## Mode Detection

**Auto-detect ADW mode:** If the preamble mentions "ADW_MODE=1" or "automated ADW pipeline":
- Exploration budget: max 15 tool calls before writing code
- Skip Step 0 (memory recall) and Step 3 (move plan) and Step 4 (commit)
- Skip Step 1.4 (console scan) and Step 1.5 (frontend lint) — pipeline has dedicated phases
- Prioritize DB + API completion over UI completeness
- Store outcome via CLI (Step 2) is still required

## Variables

PATH_TO_PLAN: $ARGUMENTS

## Workflow

### Step 0: Memory Context (Optional)
- Recall previous build issues for this project: `cortex_recall: "build errors {project_name}"`
- Check for known solutions: `cortex_recall: "build fix"`
- Use recalled context to avoid repeating past mistakes

### Step 0.5: Project-Specific Patterns (Critical)

**Database Access Pattern (Python/FastAPI projects):**
- **ALWAYS use asyncpg directly** - Do NOT use Prisma Python client
- Import pattern: `from .database import get_pool`
- Query pattern:
  ```python
  pool = get_pool()
  async with pool.acquire() as conn:
      result = await conn.fetch("SELECT * FROM table")
  ```
- Reference implementation: `app/server/api/projects.py`

**Dependency Management:**
- When creating new Python files with imports, verify all packages are in `pyproject.toml`
- Common missing dependencies: `python-multipart` (for UploadFile), `httpx` (for API calls)
- Add missing deps immediately: `uv add {package-name}`

### Step 1: Implementation
- If no `PATH_TO_PLAN` is provided, check `specs/todo/` for available plans and ask user which one to build.
- Read the plan at `PATH_TO_PLAN`. Think hard about the plan and implement it into the codebase.

#### Exploration Budget (Critical for ADW Pipeline Runs)
When running inside an ADW pipeline, **limit codebase exploration to 15 tool calls max** (Read, Grep, Glob, Bash ls/find). After 15 exploration calls, you MUST start writing code. ADW analysis showed builds spending 80% of turns on exploration (51/79 calls) with only 1 edit produced. Trust the project structure documented in CLAUDE.md:
- Backend: `apps/process-catalogue/build/packages/api/src/`
- Frontend: `apps/process-catalogue/build/packages/web/src/`
- Migrations: `apps/process-catalogue/build/packages/api/alembic/versions/`
If the spec has multiple implementation phases (e.g., DB + API + UI), prioritize DB and API completion over UI completeness.

#### Script-First Convention (Batch Operations)

Before executing batch operations — **5+ API calls** against any service OR **complex bulk work** with
structured logic, error accumulation, or multi-item processing — check for existing scripts first:

1. `{project}/python-scripts/` — project-specific scripts
2. `~/.claude/scripts/templates/` — universal reusable templates (airtable_batch, api_batch, etc.)
3. `script_list` via Script Runner MCP — for discoverable template listing

If a matching script exists, use it instead of sequential MCP calls or ad-hoc Bash loops. This reduces
context consumption by 10-50x for batch work. **For simple file/text ops where Bash piping suffices,
Bash-First still applies** — scripts are for when logic, state, or error accumulation is needed.
See `~/.claude/docs/adw-script-integration.md` for the phase-by-phase decision matrix.

### Step 1.3: Ruff/Linter Import Safety (Critical for Python)

When adding new imports to existing Python files (e.g., registering a new router in `main.py`):
- **ALWAYS add the import AND its usage in the SAME Edit call**
- If you add an import without usage, linters (ruff) will auto-remove it as "unused"
- Bad: Edit 1 adds `from .api.timelines import router` → ruff removes it → Edit 2 adds `app.include_router(router)` → import is gone
- Good: Single Edit that adds both `from .api.timelines import router` at the import block AND `app.include_router(router)` at the registration block
- If the import and usage are far apart in the file, use two sequential Edits in the same response (import first, then usage immediately after)

### Step 1.4: Console Statement Scan (If Applicable)
Before marking implementation complete, scan for debug logging in production code:
1. Search for `console.log`, `console.error`, `console.warn` in source files (NOT test files, NOT config files)
2. Remove any debug console statements from production code
3. If error handling needs logging, use a proper logger or handle silently
4. **Skip**: Console statements in ADW scripts, hooks, or build tooling are intentional

### Step 1.5: Frontend Lint Check (If Applicable)
If the project has a Vue/React/TypeScript frontend (check for `package.json` with vue/react):
1. Run TypeScript/build check BEFORE marking implementation complete:
   ```bash
   cd {frontend_path} && npm run build 2>&1
   ```
2. If TypeScript errors occur:
   - Parse error messages (file:line, error type)
   - Fix the issues (common: inline functions in templates, missing imports)
   - Re-run build until it passes
3. Common Vue TypeScript issues to watch for:
   - Don't use `setTimeout`/functions directly in template event handlers like `@blur="setTimeout(...)"`
   - Create methods instead: `@blur="handleBlur"` with `function handleBlur() { setTimeout(...) }`
   - Ensure all imports are used
   - Check for type mismatches in props/emits

### Step 2: Store Outcome
- After completion, store build outcome via CLI (fire-and-forget):
```bash
cortex remember "Build: [result summary, key changes, files modified]" \
  --tags build,{project_name},success --importance 70 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Build: [result summary]" --tags build,{project_name},success --importance 70
```
  - Use tag "failure" instead of "success" if build failed
  - Include any errors encountered and how they were resolved

### Step 3: Move Plan to Done (On Success)

**IMPORTANT: Skip this step if running inside an ADW pipeline** (detected by: prior phase-bridge context exists in Cortex for the current ADW ID, OR the prompt mentions "ADW", "adw_full_spec", or "phase"). The ADW pipeline handles spec movement after all phases complete.

If the build was successful (and NOT in an ADW pipeline):

1. **Determine destination using priority chain:**

   **Priority 1 — Subfolder Preservation:**
   If the spec is inside a project subfolder (`specs/todo/{project-name}/`):
   - Destination: `specs/done/{project-name}/`
   - Create if needed: `mkdir -p specs/done/{project-name}`

   **Priority 2 — Roadmap Match** (fallback for flat specs):
   If no subfolder but a roadmap `specs/roadmaps/ROADMAP-{name}.md` exists:
   - Extract project name from filename (e.g., `ROADMAP-genius-toolkit.md` → `genius-toolkit`)
   - If multiple roadmaps exist, pick the one most relevant to the spec being built (match by spec filename prefix or spec content keywords)
   - Destination: `specs/done/{name}/`

   **Priority 3 — Auto-Detect** (flat spec, no roadmap match):
   If flat in `specs/todo/` and `specs/done/` has project subfolders:
   - Check if spec filename contains any existing subfolder name as substring
   - Check if spec's first line (# title) contains a project name matching a subfolder
   - If multiple subfolders match, prefer the one with the most existing specs
   - If match found: route to `specs/done/{matched-project}/`

   **Priority 4 — One-Offs** (no project association detected):
   If none of the above match:
   - Destination: `specs/done/one-offs/`

2. **Create destination and move:**
   ```bash
   mkdir -p {destination}
   mv {PATH_TO_PLAN} {destination}/
   ```

3. Report: "Plan moved to {destination}/{filename}"

If the build failed, leave the plan in `specs/todo/` for retry.

### Step 4: Auto-Commit & Push

**IMPORTANT: Skip this step if running inside an ADW pipeline.** The ADW pipeline has a dedicated COMMIT phase that handles git operations.

If NOT in an ADW pipeline and the build was successful:
1. Run `git status` to see uncommitted changes
2. If there are changes:
   - Stage relevant files with `git add` (spec files, skill files, roadmap — avoid temp files, .env, credentials)
   - Create a descriptive commit message summarizing what was built
   - Commit the changes
   - Push to remote
3. If no changes to commit, note this and move on
- Note: Changes are NOT visible to end users until committed, pushed, and (for packages) published

## Report

After completing the build:

```
Build Complete

Plan: {original plan path}
Status: SUCCESS / FAILED
Plan Location: specs/done/{project-name}/{filename} (moved) OR specs/done/{filename} (standalone) OR specs/todo/{filename} (retry needed)

Changes Made:
- <change 1>
- <change 2>
- <change 3>

Files Modified: {count}
Lines Changed: +{added} -{removed}
```

Then run `git diff --stat` to show the detailed file changes.

## Plan Management Notes

The specs folder structure:
- `specs/todo/` = Plans waiting to be implemented
- `specs/done/` = Completed plans (successful builds)
  - `specs/done/{project-name}/` = Project specs (matched by subfolder preservation, roadmap, or auto-detection)
  - `specs/done/one-offs/` = Standalone specs with no project association
- `specs/roadmaps/ROADMAP-*.md` = Project roadmaps (used as Priority 2 fallback for routing specs to `done/`)
- Plans are created by `/quick-plan` in `specs/todo/`
- Plans are moved to `specs/done/{project-name}/` (or `specs/done/one-offs/`) by `/build` on success
- To list all completed specs across projects, glob `specs/done/**/*.md`
- When called from ADW pipeline: `/build` does NOT move specs or commit — the pipeline handles both
