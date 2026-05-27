---
description: Build the codebase based on the plan, then move plan to done folder
argument-hint: [path-to-plan]
allowed-tools: Read, Write, Bash, Edit, Glob, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember
---

# Build

Follow the `Workflow` to implement the `PATH_TO_PLAN` then `Report` the completed work.

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
- After completion, store build outcome: `cortex_remember`
  - Content: Build result summary (success/failure, key changes, files modified)
  - Tags: ["build", "{project_name}", "success" or "failure"]
  - Type: "progress" for success, "troubleshooting" for failure
  - Include any errors encountered and how they were resolved

### Step 3: Move Plan to Done (On Success)

**IMPORTANT: Skip this step if running inside an ADW pipeline** (detected by: prior phase-bridge context exists in Cortex for the current ADW ID, OR the prompt mentions "ADW", "adw_full_spec", or "phase"). The ADW pipeline handles spec movement after all phases complete.

If the build was successful (and NOT in an ADW pipeline):

1. **Determine destination folder** by checking for roadmap files:
   - Glob for `specs/roadmaps/ROADMAP-*.md`
   - **If roadmap(s) exist:**
     - Extract project name from filename (e.g., `ROADMAP-genius-toolkit.md` → `genius-toolkit`)
     - If multiple roadmaps exist, pick the one most relevant to the spec being built (match by spec filename prefix or spec content keywords)
     - Set destination: `specs/done/{project-name}/`
   - **If NO roadmap exists** (standalone spec):
     - Set destination: `specs/done/`

2. **Create destination and move:**
   ```bash
   mkdir -p specs/done/{project-name}   # or just specs/done/ for standalone
   mv {PATH_TO_PLAN} specs/done/{project-name}/
   ```

3. Report: "Plan moved to specs/done/{project-name}/{filename}" (or `specs/done/{filename}` for standalone)

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
  - `specs/done/{project-name}/` = Project subfolder (when a matching `specs/roadmaps/ROADMAP-{project-name}.md` exists)
  - `specs/done/*.md` = Standalone specs (no matching roadmap)
- `specs/roadmaps/ROADMAP-*.md` = Project roadmaps that drive subfolder organization in `specs/done/`
- Plans are created by `/quick-plan` in `specs/todo/`
- Plans are moved to `specs/done/{project-name}/` (or `specs/done/` for standalone) by `/build` on success
- To list all completed specs across projects, glob `specs/done/**/*.md`
- When called from ADW pipeline: `/build` does NOT move specs or commit — the pipeline handles both
