---
name: "build"
description: >-
  Build codebase from spec plans with template-aware page creation, utility
  guardrails, and multi-layer architecture. Enforces page template system
  (PageShell, PageHeader, UniversalPageRenderer) for all new pages. Auto-generates
  module YAML configs. Use when: (1) Building a spec from specs/todo/,
  (2) Implementing features from a plan file, (3) Running inside an ADW pipeline
  build phase. Includes The Big 3 rules (api.get() returns JSON, port 8002,
  no hardcoded URLs) and 4-factor utility guardrails to prevent loops.
argument-hint: "<path-to-plan> [quick | full]"
tools:
  - Read
  - Write
  - Bash
  - Edit
  - Glob
  - Grep
  - mcp__omni-cortex__cortex_recall
---

# Build

Build the codebase from a spec plan, then move the plan to done.

## Guardrails -- 4-Factor Utility Check (APPLY TO EVERY ACTION)

Before every significant action, evaluate:
1. **Estimated Gain** -- marginal value of this action. Skip if near zero.
2. **Step Cost** -- token/time cost. Prefer cheaper alternatives.
3. **Uncertainty** -- confidence level. If < 50%, investigate first.
4. **Redundancy** -- already done something similar? STOP and move on.

**Hard stops:** 3+ repeated tool call patterns = loop. Exploring unrelated code = refocus. Error persists after 3 fix attempts = message user.

Source: adws/references/research-integration.md Paper #2 (Utility-Guided Agent Orchestration)

---

## Mode Matrix

| Mode | Argument | Layers | Description |
|------|----------|--------|-------------|
| Quick | `quick` | L1 only | Lint + typecheck validation (no implementation) |
| Standard | *(default)* | L1 + L2 | Full build + test + commit (current behavior) |
| Full | `full` | L1 + L2 + L3 | Build + test + spec-review + e2e-test + commit + deploy |

## Argument Routing

| Input | Action |
|-------|--------|
| `/build <path>` | Standard mode: build the spec at path |
| `/build <path> quick` | Quick mode: validate only, no implementation |
| `/build <path> full` | Full mode: build + test + review + e2e + deploy |
| `/build` (no args) | Prompt for spec from `specs/todo/` |

---

## The Big 3 Rules (CRITICAL -- baked from session learnings)

1. **API client:** `api.get()` returns JSON directly. Import: `import { api } from "@/lib/api-client"`. NEVER use `useApiClient` (doesn't exist). NEVER use `resp.data` (no wrapper). Use `api.postForm()` for file uploads.
2. **Backend port:** Always **8002** (matches .env.local). Override `DATABASE_URL` to local Docker -- build/.env has PRODUCTION URL.
3. **No hardcoded URLs:** Use relative paths (`/api/v1/...`) with Next.js rewrites. Hardcoded localhost URLs cause CORS failures.

---

## Page Template System (MANDATORY for new pages)

When a spec creates new pages, read `references/template-system.md` for full details.

**Quick rules:**
- ALL new pages MUST use PageShell + PageHeader + appropriate template type
- NEVER create raw `<div className="p-6">` layouts
- Auto-generate `config/modules/{name}.yaml` for each new page
- Check `config/page-template-audit.yaml` for existing page inventory
- Supported page_type: `data-table`, `dashboard`, `canvas` (live), `detail-view`, `form` (TODO)

**New page creation pattern:**
1. Create `config/modules/{name}.yaml` with page_type and data config
2. Create page.tsx importing `UniversalPageRenderer` with moduleId
3. Add nav entry to `config/sidebar-nav.yaml` if needed

---

## Variables

PATH_TO_PLAN: $ARGUMENTS (first argument, before mode keyword)

---

## Workflow

### L1: Validation (runs in ALL modes)

#### Step 0: Memory Context
- Recall previous build issues: `cortex_recall: "build errors {project_name}"`
- Check known solutions: `cortex_recall: "build fix"`

#### Step 0.5: Project-Specific Patterns

**Database (Python/FastAPI):** Use asyncpg directly, NOT Prisma Python.
**Dependencies:** Verify imports in pyproject.toml/package.json before using.
**ADW Mode:** If preamble mentions "ADW_MODE=1": max 15 exploration calls, skip Steps 0/3/4, prioritize DB+API over UI.

#### Step 1.0: Read Plan
- If no PATH_TO_PLAN, check `specs/todo/` and ask user which to build
- Read the plan file. Think hard about it before implementing.

**Quick mode exits here** after running lint + typecheck:
```bash
cd {frontend_path} && npm run build 2>&1 | head -50
cd {backend_path} && ruff check . 2>&1 | head -50
```

### L2: Implementation (Standard + Full modes)

#### Step 1.1: Template Check (NEW)
If the spec creates new pages:
1. Glob for `**/UniversalPageRenderer.tsx` -- does template system exist?
2. Read `config/page-template-audit.yaml` if it exists -- check page inventory
3. For each new page in the spec:
   - Determine page_type (data-table, dashboard, canvas, detail, form)
   - Create `config/modules/{name}.yaml` with appropriate schema
   - Create page.tsx using `UniversalPageRenderer` with moduleId
4. NEVER create raw div layouts. If you catch yourself writing `<div className="p-6">` for a page layout, STOP and use PageShell.

#### Step 1.2: Implementation
- Implement the spec into the codebase
- **Exploration budget (ADW):** Max 15 tool calls before writing code
- Backend: `apps/process-catalogue/build/packages/api/src/`
- Frontend: `apps/process-catalogue/build/packages/web/src/`
- Migrations: `apps/process-catalogue/build/packages/api/alembic/versions/`

#### Step 1.3: Ruff/Linter Safety (Python)
- ALWAYS add import AND usage in the SAME Edit call
- Separate edits = ruff removes "unused" import before usage is added

#### Step 1.4: Console Scan
- Remove debug `console.log/error/warn` from production code (not test/config files)
- Skip console statements in ADW scripts, hooks, build tooling

#### Step 1.5: Frontend Lint
```bash
cd {frontend_path} && npm run build 2>&1
```
Fix TypeScript errors until build passes.

#### Step 1.6: Script-First Convention
Before 5+ batch operations, check:
1. `{project}/python-scripts/` -- project scripts
2. `~/.claude/scripts/templates/` -- universal templates
3. `script_list` via Script Runner MCP

### Step 2: Store Outcome
```bash
cortex remember "Build: [result summary]" --tags build,{project_name},success --importance 70 2>/dev/null
```

### Step 3: Move Plan to Done (skip in ADW)

Priority chain:
1. **Subfolder preservation:** `specs/todo/{project}/` to `specs/done/{project}/`
2. **Roadmap match:** Match against `specs/roadmaps/ROADMAP-*.md`
3. **Auto-detect:** Match filename against existing `specs/done/` subfolders
4. **One-offs:** `specs/done/one-offs/`

### Step 3.1: Clean Up Empty Project Folders (skip in ADW)

After moving a spec from a project subdirectory in `specs/todo/`, check if the source directory is now empty:

1. **Only applies to project subdirectories** -- NEVER remove `specs/todo/` itself
2. Check if the source directory has any remaining `.md` files: `ls specs/todo/{project-folder}/*.md 2>/dev/null`
3. If NO `.md` files remain, remove the empty directory: `rmdir specs/todo/{project-folder}/`
4. Log: "Cleaned up empty project folder: specs/todo/{project-folder}/"
5. If `.md` files still exist, skip cleanup silently

**Safety:** Use `rmdir` (not `rm -rf`) -- it only removes truly empty directories. If non-md files remain, `rmdir` will fail safely, which is the correct behavior.

### Step 4: Auto-Commit (skip in ADW)
Stage, commit with descriptive message, push.

### L3: Full Verification (Full mode only)

#### Step 5: Spec Review
Run `/spec-review` on the built spec to verify code-level compliance.

#### Step 6: E2E Test
Run `/e2e-test` on affected pages to verify runtime behavior.

#### Step 7: Deploy
Run `/deploy` to push to production (Vercel + Railway).

---

## Report

```
Build Complete

Plan: {original plan path}
Mode: quick | standard | full
Status: SUCCESS / FAILED
Plan Location: {destination}
Template Pages Created: {count} (with module YAML configs)

Changes Made:
- <change 1>
- <change 2>

Files Modified: {count}
Lines Changed: +{added} -{removed}
```

---

## Cortex & Brain Integration

### Omni-Cortex
**CLI:** `cortex remember` -- store build outcomes, errors, fixes
**MCP:** `cortex_recall` -- retrieve past build context, known issues

### Breathing Brain
**CLI:** `brain --json status` -- check edit count, terminal state
**CLI:** `brain message send` -- coordinate with other terminals in multi-agent builds
