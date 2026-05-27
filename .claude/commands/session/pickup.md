---
description: Resume work from previous session using Omni-Cortex context
argument-hint: [optional: N (last N handoffs), "global", or memory ID (mem_...)]
allowed-tools: mcp__omni-cortex__cortex_start_session, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_get_session_context, TodoWrite
---

# Pick Up From Last Session

Retrieve context from the previous session and prepare to continue work seamlessly.

## Purpose

Replace manual context-gathering at the start of each session with a single command that:
1. Starts a new Omni-Cortex session with previous context
2. Retrieves the most recent handoff memory (or last N handoffs)
3. Summarizes where we left off
4. Sets up a todo list if there are pending tasks

Supports:
- Default: Pick up from most recent handoff in current project
- `N` (e.g., `/pickup 2`): Pick up last N handoffs
- `global`: Pick up from most recent handoff across ALL projects
- `mem_ID` (e.g., `/pickup mem_1234...`): Pick up a specific handoff by memory ID

## Instructions

### Step 0: Parse Arguments

Check `$ARGUMENTS` for:
- Empty or no args → Pick up most recent handoff (limit: 1)
- **Memory ID** (starts with "mem_") → Retrieve that specific memory using `cortex_recall` with the ID
- Number (e.g., "2", "3") → Pick up last N handoffs
- "global" → Search across all projects using `cortex_global_search`

**If a memory ID is provided:**
Use `cortex_recall` with query containing the memory ID to retrieve that specific handoff. This takes priority over other argument types.

### Step 1: Start Session with Context

Use `cortex_start_session` with:
- `provide_context`: true
- `context_depth`: 3 (last 3 sessions)

This returns a "Last time you were working on..." summary.

### Step 2: Retrieve Handoff Memory

**CRITICAL: Use cortex_list_memories (NOT cortex_recall) to get handoffs sorted by creation time**

**IMPORTANT: Do NOT use type_filter** - Omni-Cortex auto-categorizes memories and often overrides the specified type (handoffs get categorized as "error", "concept", etc. based on content). Rely on tags only.

For current project:
```
cortex_list_memories with:
- tags_filter: ["handoff", "session-summary"]
- sort_by: "created_at"
- sort_order: "desc"
- limit: 1 (or N from arguments)
```

CRITICAL: Filter by tags ["handoff", "session-summary"] ONLY. Do NOT use type_filter as it's unreliable due to auto-categorization.

For global (cross-project):
```
cortex_global_search with:
- query: "handoff session-summary"
- tags_filter: ["handoff", "session-summary"]
- limit: 1 (or N from arguments)
```

This ensures you get the MOST RECENT handoff first, not the most "relevant" one, and filters out any non-handoff memories that mention handoffs.

### Step 3: Present Context Summary

**If retrieving 1 handoff (default):**

```
## Session Pickup Summary

**Last Session:** [date from handoff]
**Project:** [project name]

### Where We Left Off
[CONTEXT from handoff]

### Completed Previously
- [items from COMPLETED]

### Still In Progress
- [items from IN PROGRESS]

### Next Steps
1. [from NEXT STEPS]
2. ...

### Key Files
- [from KEY FILES]

### Notes/Blockers
- [from BLOCKERS/NOTES if any]
```

**If retrieving N handoffs (e.g., `/pickup 2`):**

Show each handoff in reverse chronological order (most recent first):

```
## Session Pickup Summary - Last [N] Handoffs

### Handoff #1 (Most Recent - [date])
**Project:** [project]
**Context:** [brief 1-2 sentence summary]
**Status:** [what was in progress]

### Handoff #2 ([date])
**Project:** [project]
**Context:** [brief summary]
**Status:** [what was in progress]

### Combined Next Steps
[Merge the NEXT STEPS from all handoffs, removing duplicates]

### Combined Key Files
[List all key files mentioned across handoffs]
```

### Step 3.5: Crystal Ball Awareness

After presenting the context summary:

1. **Check handoff for Crystal Ball suggestions**: If the handoff memory contains a "Crystal Ball Suggestion" section, display it prominently after the summary.

2. **Check audit recency**: Query `cortex_list_memories` with `tags_filter: ["crystal-ball"]`, `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 1`.
   - If no Crystal Ball audit has ever been run: suggest `/crystal-ball` for an initial design health check
   - If last audit was more than 5 sessions ago: suggest a refresh — "Your last Crystal Ball check was [N] sessions ago. Consider running `/crystal-ball` for an updated health check."
   - If recent audit exists: briefly show the score — "Last Crystal Ball score: [X]/100 ([N] sessions ago)"

3. Add Crystal Ball option to the direction prompt (Step 5).

### Step 4: Create Todo List (if applicable)

If there are clear next steps from the handoff, use `TodoWrite` to create a todo list so progress can be tracked.

### Step 5: Ask for Direction

End with:
```
Ready to continue. Would you like me to:
1. Start on the first next step
2. Review the in-progress items first
3. Run a Crystal Ball check on the current design state
4. Do something else?
```

## Fallback Behavior

If no handoff memory is found:
1. Check `cortex_get_session_context` for any previous session info
2. Use `cortex_recall` with broader queries like the project name
3. If still nothing, inform user: "No previous handoff found. What would you like to work on?"

## Example Usage

**Basic usage** (most recent handoff in current project):
```
/pickup
```

**Pick up last 2 handoffs** (combine context from 2 sessions):
```
/pickup 2
```

**Pick up from any project** (cross-project handoff):
```
/pickup global
```

**Pick up last 3 global handoffs** (combine cross-project context):
```
/pickup global 3
```

**Pick up a specific handoff by memory ID**:
```
/pickup mem_1768876884942_e67a2384
```

Claude responds with the context summary and is ready to continue exactly where the last session(s) ended.

## Notes

- Pairs with `/handoff` which creates the handoff memories
- Works across all projects (universal)
- Uses session management for proper tracking
- Falls back gracefully if no handoff exists
- **ALWAYS sorts by creation time** (most recent first), not relevance
- Supports combining multiple handoffs for complex multi-session workflows
