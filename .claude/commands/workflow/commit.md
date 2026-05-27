---
description: Generate a well-formatted git commit with conventional prefix and Co-Authored-By trailer
argument-hint: "[agent_name] [issue_class] [issue description]"
allowed-tools: Bash
---

# Generate Git Commit

Based on the `Instructions` below, take the `Variables` follow the `Run` section to create a git commit with a properly formatted message. Then follow the `Report` section to report the results of your work.

## Pre-Commit Context

Before creating commit:
- Recall commit style via CLI (faster, no MCP overhead): `cortex recall "commit message {project_name}" --limit 3 --json 2>/dev/null | head -5`
- Use recalled patterns to maintain consistent messaging style

## Variables

agent_name: $ARGUMENT
issue_class: $ARGUMENT
issue: $ARGUMENT

## Instructions

- Generate a concise commit message in the format: `<agent_name>: <issue_class>: <commit message>`
- The `<commit message>` should be:
  - Present tense (e.g., "add", "fix", "update", not "added", "fixed", "updated")
  - 50 characters or less
  - Descriptive of the actual changes made
  - No period at the end
  - If a SECURITY-FIX phase applied changes in this commit, mention security hardening (e.g., "add render pipeline with security hardening")
- Examples:
  - `sdlc_planner: feat: add user authentication module`
  - `sdlc_implementor: bug: fix login validation error`
  - `sdlc_planner: chore: update dependencies to latest versions`
- Extract context from the issue JSON to make the commit message relevant
- Don't include any 'Generated with...' in the commit message body. Focus purely on the changes made.
- **Always append a `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>` trailer** after a blank line

## Run

1. Run `git diff HEAD` and `git status` to understand what changes have been made
2. Stage specific changed files by name (e.g., `git add app/server/api/ai.py app/client/src/stores/ai.ts`).
   - **Do NOT use `git add -A`** — this can accidentally stage sensitive files (.env, credentials) or large binaries
   - Only stage files that are relevant to the changes being committed
   - If unsure, use `git diff --name-only` to list changed files and stage them individually
3. Create the commit using HEREDOC format for proper message formatting:
   ```bash
   git commit -m "$(cat <<'EOF'
   <generated_commit_message>

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
   - **Always use HEREDOC** (not inline `-m "..."`) to avoid shell escaping issues
   - **Always include the Co-Authored-By trailer** on a separate line after a blank line

## Report

Return ONLY the commit message that was used (no other text)

## Post-Commit Memory (For Significant Changes)

For major features, breaking changes, or important fixes, store commit: `cortex_remember`
- Content: Commit hash + message summary + key files changed
- Tags: ["commit", "{project_name}", "{feature_area}"]
- Type: "progress"
- Importance: 30 (only for notable commits, skip trivial changes)

## Workflow

1. Recall project commit style via CLI: `cortex recall "commit message {project_name}" --limit 3 --json 2>/dev/null | head -5`
2. Run `git diff HEAD` and `git status` to understand all changes
3. Stage specific relevant files by name with `git add` — never use `git add -A`
4. Generate commit message: `<agent_name>: <issue_class>: <present-tense description>`
5. Commit using HEREDOC format with Co-Authored-By trailer
6. For major features/fixes, store commit in Cortex with tags ["commit", "{project_name}"]
