---
name: agent-teams
description: |
  Orchestrate Claude Code agent teams for parallel development with shared task lists, inter-agent messaging, and centralized coordination.
  Use when: (1) Multiple independent fixes or features need parallel work, (2) Cross-layer coordination (frontend + backend + tests),
  (3) Complex debugging with competing hypotheses, (4) Research and review tasks that benefit from multiple perspectives,
  (5) User says "create team", "agent team", "team up", "parallel agents", or "coordinate agents"
argument-hint: "<roadmap-file> <phase-number> OR <team-name> [spec-file(s) or task description]"
tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - TaskCreate
  - TaskUpdate
  - TaskList
  - TaskGet
  - TeamCreate
  - TeamDelete
  - SendMessage
  - mcp__omni-cortex__cortex_recall
---

# Agent Teams Orchestration

Coordinate multiple Claude Code instances working together as a team with shared tasks, inter-agent messaging, and centralized management.

## Roadmap Mode

If the first argument is a `ROADMAP-*.md` file path and the second is a phase number (e.g., `phase-2`):

1. Read the roadmap file
2. Find the specified phase section (e.g., `## Phase 2:`)
3. Extract all spec files listed in that phase's table
4. Verify all specs are marked as PARALLEL in the phase header (warn if sequential specs detected — sequential specs should use `/build` instead)
5. Derive the team name from the roadmap: `{feature-slug}-phase{N}` (e.g., `skills-ecosystem-phase2`)
6. Launch one agent per spec file, each running `/build` on its assigned spec
7. Coordinate, review, and clean up per the standard workflow below

**Example:**
```
/agent-teams specs/roadmaps/ROADMAP-skills-ecosystem.md phase-2
→ Reads roadmap, finds Phase 2 has 3 parallel specs (03, 04, 05)
→ Creates team "skills-ecosystem-phase2"
→ Launches 3 agents, each running /build on one spec
```

**Note:** Direct spec-file usage still works — roadmap mode is additive.

## Prerequisites

Agent teams must be enabled. Check and enable if needed:

```json
// In ~/.claude/settings.json under "env":
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**IMPORTANT**: If the setting was just added, Claude Code must be restarted for it to take effect.

## Pre-Launch Context

Before creating a team:
- Recall relevant patterns: `cortex_recall: "agent team {project_name}"`
- Check for previous team configurations: `cortex_recall: "parallel development"`
- Review the task at hand and determine if it truly benefits from parallelization

## Workflow

### Step 0: Decide Coordination Level

Evaluate whether the work needs full team infrastructure or just parallel execution.

**Ask:** Do agents need to communicate, share findings, or have task dependencies?

| Signal | Coordination Level |
|--------|-------------------|
| Agents need to message each other or share findings | **Full Team** (TeamCreate + TaskCreate + SendMessage) |
| Tasks have dependencies (A must finish before B starts) | **Full Team** (use `addBlockedBy`) |
| Cross-layer work (frontend + backend + tests) with integration | **Full Team** |
| All work streams are fully independent, no communication needed | **Parallel Agents** (native Agent tool, skip team overhead) |
| Multiple agents will edit the SAME files | **Git Worktrees** (`/git-worktrees`) — not agent-teams |

**If Parallel Agents:** Tell the user — one sentence explaining why team overhead isn't needed (e.g., "All 5 batches are fully independent with no shared files or dependencies — using parallel agents directly to skip coordination overhead"). If the user still wants full team mode, proceed with Full Team. Otherwise, skip Steps 2-3, spawn agents directly via the Agent tool in Step 4 (without `team_name`), and skip Step 7 cleanup.

**If Full Team:** Proceed with Steps 1-7 as normal.

### Step 1: Analyze the Work

1. Read the spec file(s) or task description
2. Identify 2-5 independent work streams
3. Determine if streams have dependencies (blocking relationships)
4. Name each teammate role descriptively

### Step 2: Create Task List

Before spawning teammates, create all tasks using `TaskCreate`:

```
For each work stream:
- subject: Clear imperative title (e.g., "Fix drag-and-drop from media browser to timeline")
- description: Detailed requirements, file paths, acceptance criteria
- activeForm: Present continuous (e.g., "Fixing drag-and-drop functionality")
```

Set up dependencies between tasks using `TaskUpdate` with `addBlockedBy` where needed.

### Step 3: Create the Team

Use `TeamCreate` to create the team:

```json
{
  "team_name": "descriptive-team-name",
  "description": "Brief purpose of the team"
}
```

### Step 4: Spawn Teammates

Use the `Task` tool with `team_name` parameter to spawn each teammate:

```json
{
  "subagent_type": "general-purpose",
  "team_name": "your-team-name",
  "name": "teammate-role-name",
  "mode": "bypassPermissions",
  "model": "opus",
  "prompt": "Detailed instructions for this teammate..."
}
```

**Teammate Spawn Prompt Template:**
```
You are the [ROLE] teammate on the [TEAM_NAME] team.

## Your Task
[Specific task description with full context]

## Key Files
- [file1.ts] - [what it does, what to change]
- [file2.vue] - [what it does, what to change]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Constraints
- Do NOT modify files outside your scope: [list files]
- Run type checks after changes: [specific command]
- Follow existing code patterns in the project

## When Done
1. Mark your task as completed using TaskUpdate
2. Send a message to the team lead with a summary of changes
3. Check TaskList for any newly unblocked tasks you can claim
```

### Step 5: Coordinate

As team lead:
1. **Monitor progress** via `TaskList` - check task statuses periodically
2. **Redirect teammates** via `SendMessage` if they get stuck
3. **Assign new tasks** via `TaskUpdate` when tasks unblock
4. **Use delegate mode** (Shift+Tab) to prevent yourself from coding - focus on coordination
5. **Wait for teammates** - don't implement tasks yourself unless necessary

### Step 6: Review & Merge

After all tasks complete:
1. Review each teammate's changes
2. Run full type checks and linting
3. Run tests to verify nothing is broken
4. Handle any integration conflicts

### Step 7: Cleanup

1. Send shutdown requests to all teammates:
```json
{
  "type": "shutdown_request",
  "recipient": "teammate-name",
  "content": "All tasks complete, shutting down team"
}
```

2. Wait for all teammates to acknowledge and shut down

3. Clean up the team:
```
TeamDelete
```

## Best Practices

### File Ownership
**CRITICAL**: Assign clear file ownership to prevent conflicts.
- Each teammate should own a distinct set of files
- If two teammates must edit the same file, sequence their tasks (use `addBlockedBy`)
- Never have two teammates editing the same file simultaneously

### Task Sizing
- **Too small** (<5 min): Coordination overhead exceeds benefit
- **Too large** (>30 min): Risk of wasted effort without check-ins
- **Just right** (10-20 min): Self-contained units with clear deliverables
- Aim for 3-5 tasks per teammate

### Context for Teammates
Teammates do NOT inherit the lead's conversation history. Include in spawn prompts:
- Full task description with acceptance criteria
- Relevant file paths and what they contain
- Project conventions (tech stack, patterns, linting rules)
- Reference to CLAUDE.md for project-level instructions

### Model Selection
- **Opus 4.6** (`model: "opus"`): Complex multi-file changes, architectural decisions, nuanced debugging
- **Sonnet 4.5** (`model: "sonnet"`): Standard implementation, straightforward fixes
- **Haiku 4.5** (`model: "haiku"`): Quick research, simple file edits, verification tasks

### Communication Patterns
- Use `SendMessage` with `type: "message"` for targeted teammate communication
- Use `type: "broadcast"` SPARINGLY - only for critical team-wide announcements
- Idle notifications are NORMAL - don't react unless you need to assign new work
- Teammates going idle after sending a message is expected behavior

## Troubleshooting

### Teammate Not Responding
- Check if they're idle (normal after completing a turn)
- Send them a message to wake them up
- If still unresponsive, spawn a replacement

### File Conflicts
- If two teammates edited the same file, the last write wins
- Prevent this by assigning clear file ownership in spawn prompts
- Use `addBlockedBy` to sequence work on shared files

### Permission Prompts Flooding
- Pre-approve common operations in permission settings
- Use `mode: "bypassPermissions"` when spawning teammates for autonomous work
- Or use `mode: "plan"` to require plan approval before changes

### Lead Starts Coding Instead of Coordinating
- Press Shift+Tab to enter delegate mode
- Tell yourself: "Wait for teammates to complete their tasks"
- Only code directly if a teammate is stuck and needs help

## Windows Notes

- Split-pane mode (tmux/iTerm2) is NOT available on Windows
- Use **in-process mode** (default) - teammates run in the same terminal
- Use Shift+Up/Down to navigate between teammates
- Press Enter to view a teammate's session, Escape to interrupt
- Press Ctrl+T to toggle the task list view

## Post-Team Memory

After team cleanup, store results via CLI (fire-and-forget):
```bash
cortex remember "Agent team [name] completed [N] tasks across [N] teammates. Key results: [summary]. Issues: [any]. Duration: [time]." \
  --tags agent-teams,{project_name},parallel-dev --importance 70 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Agent team [name] completed [N] tasks" --tags agent-teams,{project_name},parallel-dev --importance 70
```

## Example: Video Studio UI Fix Team

```
Team: "video-studio-fixes"
Teammates:
  1. "timeline-fixer" (Opus) - Fix drag-drop, default tracks, zoom reset
  2. "layout-polisher" (Opus) - Panel resizing, tab overflow, font sizes
  3. "backend-fixer" (Opus) - Env vars, API errors, state persistence
  4. "tester" (Sonnet) - Run type checks, verify all fixes, integration test

Task Dependencies:
  - timeline-fixer and layout-polisher: independent (different files)
  - backend-fixer: independent (server-side files)
  - tester: blocked by all three fixers (runs after they're done)
```
