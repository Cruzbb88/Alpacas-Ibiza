---
description: End session with structured context handoff to Omni-Cortex memory
argument-hint: "combine to merge with previous handoff context"
allowed-tools: mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_end_session, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_link_memories, mcp__omni-cortex__cortex_get_session_context, TodoWrite
---

# Session Handoff

Create a structured handoff memory for seamless continuation in the next terminal session.

## Purpose

Replace the manual "store everything before context runs out" prompt with a single command that:
1. Captures current work state
2. Stores it in Omni-Cortex memory with high importance
3. Ends the session properly
4. Provides a simple continuation prompt

Supports:
- Default: Create handoff for current session only
- `combine`: Merge current session with previous handoff (for multi-session workflows)

## Instructions

### Step 0: Parse Arguments

Check `$ARGUMENTS` for:
- Empty or no args → Create standalone handoff for current session
- "combine" → Retrieve most recent handoff and merge with current session context

### Step 1: Gather Context

Review the current conversation to identify:
- What task/feature we were working on
- What was completed
- What is still in progress
- What the next steps are
- Any blockers, errors, or important decisions
- Key files that were modified or are relevant

### Step 1.5: Detect Roadmap Progress (if applicable)

Check if the session involves a roadmap-based multi-spec project:

1. Look for `specs/ROADMAP-*.md` files via Glob
2. If a roadmap exists AND the session involved building specs:
   - Read the roadmap to extract all phases and their spec lists
   - Check `specs/done/` and `specs/todo/` to determine completion status per phase
   - Build a PROJECT PROGRESS block for inclusion in the handoff memory (Step 4)

**Phase status rules:**
- **Done** = ALL specs in that phase are in `specs/done/`
- **In Progress** = SOME specs in that phase are in `specs/done/`, others in `specs/todo/`
- **Next** = First phase where NO specs are in `specs/done/` (only one phase gets "Next")
- **Pending** = All remaining phases after "Next"

**Format for the memory content:**
```
PROJECT PROGRESS: [X/total specs complete]
Phase 1 (sequential): [Done|In Progress|Next|Pending] — Specs 01, 02
Phase 2 (parallel x3): [Done|In Progress|Next|Pending] — Specs 03, 04, 05
Phase 3 (parallel x3): [Done|In Progress|Next|Pending] — Specs 06, 07, 08
...
```

This section goes between BLOCKERS/NOTES and SYSTEM HEALTH in the handoff memory.

### Step 2: Retrieve Previous Handoff (if combining)

If `$ARGUMENTS` contains "combine":

Use `cortex_list_memories` with:
- `tags_filter`: ["handoff"]
- `sort_by`: "created_at"
- `sort_order`: "desc"
- `limit`: 1

This gets the most recent handoff to merge context from.

### Step 3: Check for Existing Handoffs (for format consistency)

Use `cortex_recall` with query "handoff session-summary" to see the format of previous handoffs for consistency.

### Step 3.5: Gather System Health Data

If `workspace/self-heal-reports/` exists and contains `sh-*.md` reports:
- Read the most recent `sh-*.md` report (by filename sort, highest NNN)
- Extract from YAML frontmatter: `composite_score` (or `health_score` for old reports), `trend`, `date`, `report_number`, `top_patterns`
- Store for inclusion in Step 4's handoff memo (SYSTEM HEALTH section)
- If no reports exist, skip this section entirely

### Step 4: Create Handoff Memory

Use `cortex_remember` with:

**Content structure (standalone):**
```
[Project/Feature Name] Session Handoff - [YYYY-MM-DD]

CONTEXT:
[1-2 sentences: What we were working on and why]

COMPLETED:
- [Item 1]
- [Item 2]
- ...

IN PROGRESS:
- [Item with current state/status]
- ...

NEXT STEPS:
1. [Most important next action]
2. [Second priority]
3. ...

KEY FILES:
- [path/to/file1] - [brief description]
- [path/to/file2] - [brief description]

BLOCKERS/NOTES:
- [Any issues, decisions, or context the next session needs]

PROJECT PROGRESS: (include only if roadmap detected from Step 1.5)
[X/total] specs complete
Phase 1 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
Phase 2 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
...

SYSTEM HEALTH: (include only if self-heal reports exist from Step 3.5)
- Self-Heal Score: {composite_score}/100 ({trend})
- Last run: {date} (Report: sh-{NNN})
- Top issue: {first item from top_patterns}
```

**Content structure (combined with previous handoff):**
```
[Project/Feature Name] Combined Session Handoff - [YYYY-MM-DD]

CONTEXT:
[Merge context from previous handoff AND current session - explain the full arc of work]

COMPLETED (Sessions 1-2):
Session 1:
- [Items from previous handoff's COMPLETED]

Session 2 (Current):
- [Items completed in this session]

IN PROGRESS:
- [Merge IN PROGRESS from previous handoff with current work]
- [Note which items carried over vs. new items]

NEXT STEPS:
1. [Prioritized list combining both sessions' next steps]
2. [Remove duplicates, update based on progress]

KEY FILES:
- [Combined list from both sessions, removing duplicates]

BLOCKERS/NOTES:
- [Any unresolved blockers from Session 1]
- [New blockers/notes from Session 2]

PROJECT PROGRESS: (include only if roadmap detected from Step 1.5)
[X/total] specs complete
Phase 1 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
Phase 2 ([sequential|parallel xN]): [Done|In Progress|Next|Pending] — Specs [list]
...

SYSTEM HEALTH: (include only if self-heal reports exist from Step 3.5)
- Self-Heal Score: {composite_score}/100 ({trend})
- Last run: {date} (Report: sh-{NNN})
- Top issue: {first item from top_patterns}
```

**Parameters:**
- `importance`: 90-95 (high priority for recall)
- `tags`: ["handoff", "session-summary", "continuation", "<project-name>"]
- `type`: "context"

### Step 4.5: Auto-Link Knowledge Graph

After creating the handoff memory, automatically link it to related memories:

1. Use `cortex_list_memories` with `tags_filter: ["handoff"]`, `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 2` to find the previous handoff for this project (the second result is the previous handoff, since the first is the one just created)
2. If a previous handoff is found (i.e., 2 results returned), use `cortex_link_memories`:
   - `source_id`: new handoff memory ID (from Step 4)
   - `target_id`: previous handoff memory ID (second result)
   - `relationship_type`: "supersedes"
3. Search for related spec memories: `cortex_recall` with a query matching the current task/feature name
4. For each related spec found (up to 3), use `cortex_link_memories`:
   - `source_id`: new handoff memory ID
   - `target_id`: spec memory ID
   - `relationship_type`: "related_to"

### Step 4.6: End Session (Optional)

If the MCP session tracking is active, use `cortex_end_session` with:
- `summary`: Brief 1-sentence summary of what was accomplished
- `key_learnings`: Array of important discoveries or decisions made

### Step 5: Crystal Ball Nudge

After creating the handoff, analyze the session for Crystal Ball relevance:

1. Check if the session involved design decisions, architecture changes, or brainstorming:
   - Spec creation or updates
   - PLAN changes or phase restructuring
   - Architecture discussions or technology decisions
   - New integration points or dependency changes

2. If design-relevant activity detected, append a Crystal Ball recommendation to the output:
   ```
   Crystal Ball Suggestion:
   This session involved [design decisions / architecture changes / brainstorming].
   Consider running:
   - `/crystal-ball-delta today` — Check downstream effects of today's changes
   - `/crystal-ball-predict "<most significant decision>"` — Evaluate revision risk
   - `/crystal-ball-constraints` — Verify tech limits aren't violated
   ```

   Only include commands relevant to the session. Do not include all 3 every time:
   - If new specs created → suggest `/crystal-ball-matrix`
   - If decisions deferred → suggest `/crystal-ball-debt`
   - If old assumptions revisited → suggest `/crystal-ball-decay`

### Step 5.5: Quick Resume Prediction

Predict the single most likely next action for the next session and display it prominently.

1. **Read command history**: Read `~/.claude/stats/command-history.jsonl` (last 200 lines max). If file doesn't exist, skip to step 3.
2. **Analyze the NEXT STEPS** just written in the handoff memory (Step 4). Extract commands starting with `/`.
3. **Score the #1 candidate** using the same 5-factor formula as `/pickup`:
   - Explicit NEXT STEPS (40 pts for #1 item)
   - Sequence pattern (25 pts max — what usually follows the last command this session)
   - Overdue maintenance commands (20 pts max — crystal-ball, self-heal, weekly-digest, memory-prune, portfolio-health, retrospective)
   - Time/day pattern (10 pts max)
   - Project type match (5 pts max)
4. **Display as Quick Resume** at the bottom of the handoff output:

```
### Quick Resume
Next session, run:
  /agent-teams specs/ROADMAP-skills-ecosystem.md phase-4
```

If no command can be predicted (no NEXT STEPS, no history), skip this section.

### Step 6: Provide Continuation Prompt

Give the user this exact text to paste in their next terminal session:

```
Use /pickup to continue from the last session.
```

Or if they prefer manual control:

```
Use cortex_start_session with provide_context: true, then cortex_recall "handoff" to get the full context from last session.
```

## Example Usage

**Basic handoff** (current session only):
```
/handoff
```

**Combined handoff** (merge with previous session):
```
/handoff combine
```

Use the "combine" option when:
- You worked on the same feature across multiple sessions
- You want to create a comprehensive handoff that spans multiple days
- You need to merge context from an incomplete previous handoff

## Example Output

After running `/handoff`, the user should see:

1. Confirmation that handoff memory was created (with memory ID)
2. The continuation prompt to copy
3. Any session end confirmation if applicable

## Notes

- This skill works across all projects (universal)
- Handoff memories are tagged for easy filtering
- High importance (90-95) ensures they surface in recall
- Use `/pickup` in the next session to retrieve this context
- **ALWAYS retrieves most recent handoff** when combining (sorted by creation time)
