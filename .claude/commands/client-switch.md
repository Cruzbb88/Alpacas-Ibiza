---
description: Switch active client context with memory recall and handoff summary
argument-hint: "client name (e.g., ralph, surity) or empty to list all clients"
allowed-tools: mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_global_stats, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember, Read, Glob, Bash
---

# Client Context Switch

> **CLI-first migration (Spec 17):** Fire-and-forget operations (remember for switch event storage)
> use `cortex` CLI via Bash. Interactive operations (global_search, global_stats, list_memories,
> recall for context gathering where LLM reasons about results) remain as MCP.
> Estimated CLI ratio: ~60%.

Switch active working context to a different client project. Loads relevant CLAUDE.md, retrieves the last handoff, and displays a quick status summary so you can resume work immediately.

## Purpose

When working across multiple clients, this command:
1. Maps client name to directory path
2. Retrieves the last handoff and key memories for that client
3. Displays a concise status dashboard
4. Stores the switch event for activity tracking
5. Prepares you to start working in that client's context

## Instructions

### Step 0: Parse Arguments

Check `$ARGUMENTS` for:
- **Client name** (e.g., "ralph", "surity", "acme") -> Map to directory and switch context
- **Empty / no args** -> List all known clients with brief status

### Step 1: Client Directory Mapping

Map the client name (case-insensitive) to its directory path. Known clients:

| Client Name | Directory Path |
|------------|----------------|
| ralph | `D:\Clients\Ralph` |
| surity | `D:\Clients\Ralph\surity` |

**If the client name is not in the map:**
1. Try `D:\Clients\{ClientName}` (title-cased) as a fallback
2. Use `ls D:/Clients/` to check if a matching directory exists
3. If still not found, inform user: "Client '{name}' not found. Known clients: [list]. Or provide the full path."

### Step 2: Handle No Arguments (List All Clients)

If `$ARGUMENTS` is empty:

1. Use `cortex_global_stats` to get the full project breakdown (memory counts per project)
2. Use `ls D:/Clients/` to enumerate client directories on disk
3. For each client directory found:
   - Use `cortex_global_search` with:
     - `query`: "handoff session-summary"
     - `tags_filter`: ["handoff"]
     - `project_filter`: client directory path (or substring like "Ralph")
     - `limit`: 1
   - Extract: date, brief context summary
4. Display a client roster:

```
## Active Clients

| Client | Last Handoff | Status | Memories |
|--------|-------------|--------|----------|
| Ralph  | 2026-02-13  | SCORM grading system | 47 |
| Surity | 2026-02-10  | Data pipeline setup  | 12 |
| ...    | ...         | ...                  | .. |

Use `/client-switch <name>` to switch to a client.
```

5. Stop here (do not proceed to Step 3+).

### Step 3: Validate Client Directory

1. Verify the target directory exists using `ls` on the path
2. Check for `CLAUDE.md` in the client directory — read it if present
3. Check for `specs/todo/` and `specs/done/` directories — count files in each (use recursive glob `**/*.md` for `specs/done/` to include project subfolders)
4. Check for `reports/self-heal/` — read latest if present

### Step 4: Retrieve Last Handoff

Use `cortex_list_memories` with:
- `tags_filter`: ["handoff"]
- `sort_by`: "created_at"
- `sort_order`: "desc"
- `limit`: 1

**AND** use `cortex_global_search` with:
- `query`: "handoff session-summary"
- `tags_filter`: ["handoff", "session-summary"]
- `project_filter`: the client directory path
- `limit`: 1

Use whichever returns the most recent result. Extract:
- Date of last handoff
- CONTEXT section
- IN PROGRESS items
- NEXT STEPS
- BLOCKERS/NOTES
- KEY FILES

### Step 5: Gather Additional Context

Use `cortex_recall` with query: "{client_name} recent decisions architecture" to surface any important recent memories beyond the handoff.

Also use `cortex_list_memories` with:
- `tags_filter`: ["decision"]
- `sort_by`: "created_at"
- `sort_order`: "desc"
- `limit`: 3

This captures recent decisions that may not be in the handoff.

### Step 6: Store Switch Event

Use CLI to store the switch event (fire-and-forget — Spec 17):
```bash
# CLI: store client switch event (fire-and-forget, low importance tracking)
cortex remember "Client Switch: {previous_client/context} -> {target_client}. Date: $(date '+%Y-%m-%d %H:%M'). Directory: {client_directory}. Reason: Context switch via /client-switch command" \
  --tags client-switch,{client-name-lowercase},activity-log --importance 30 2>/dev/null || \
  python3 -c "from omni_cortex.cli import main; import sys; main(sys.argv[1:])" -- \
  remember "Client Switch: {previous_client/context} -> {target_client}. Date: $(date '+%Y-%m-%d %H:%M'). Directory: {client_directory}. Reason: Context switch via /client-switch command" \
  --tags client-switch,{client-name-lowercase},activity-log --importance 30 2>/dev/null
```

### Step 7: Display Switch Summary

Present the following dashboard:

```
## Switched to: {Client Name}

**Directory:** {path}
**Last Handoff:** {date} ({N} days ago)
**Open Specs:** {count in specs/todo/} | **Done:** {count in specs/done/}

### Where We Left Off
{CONTEXT from handoff — 2-3 sentences max}

### In Progress
- {items from IN PROGRESS}

### Next Steps
1. {from NEXT STEPS}
2. ...

### Key Files
- {from KEY FILES}

### Recent Decisions
- {from Step 5 cortex_recall results — last 2-3 decisions}

### Blockers/Notes
- {from BLOCKERS/NOTES if any}
```

### Step 8: Offer Direction

End with:
```
Ready to work on {Client Name}. Would you like to:
1. Start on the first next step from the handoff
2. Review open specs (`specs/todo/`)
3. Run `/pickup` for full session context restoration
4. Do something else?
```

## Fallback Behavior

- **No handoff found:** Display directory info, CLAUDE.md summary, and spec counts. Note "No previous handoff found for this client."
- **No CLAUDE.md:** Note "No CLAUDE.md found — consider running `/client-onboard {name}` to set up project structure."
- **No specs directory:** Note "No specs/ directory found — this client may not use the spec workflow."

## Example Usage

**Switch to Ralph:**
```
/client-switch ralph
```

**List all clients:**
```
/client-switch
```

**Switch to a new/unknown client:**
```
/client-switch acme
```
(Will attempt D:\Clients\Acme, report if not found)

## Notes

- This is a lightweight context switch, NOT a full `/pickup`. It provides enough context to orient you, but `/pickup` should be used for deep session restoration.
- Switch events are stored at low importance (30) — they are for activity tracking, not recall.
- The client directory map should be updated as new clients are onboarded (or use `/client-onboard` which updates it automatically).
- Works across all projects (universal command).

## Workflow

1. Parse $ARGUMENTS: empty = list all clients, client name = switch to that client
2. If empty: run cortex_global_stats + ls D:/Clients/, display client roster, stop
3. Map client name to directory path (case-insensitive); fallback to D:\Clients\{name}
4. Validate directory exists; read CLAUDE.md if present; count specs/todo/ and specs/done/**/*.md
5. Retrieve last handoff via cortex_list_memories and cortex_global_search with project_filter
6. Gather additional context: recent decisions from cortex_recall
7. Store switch event in Cortex at importance 30 with tags ["client-switch", "{client-name}"]
8. Display switch summary: directory, last handoff, in-progress items, next steps, key files

## Report

```
## Switched to: {Client Name}

**Directory:** {path}
**Last Handoff:** {date} ({N} days ago)
**Open Specs:** {N} | **Done:** {N}

### Where We Left Off
{context from handoff}

### In Progress
- {items}

### Next Steps
1. {items}

### Recent Decisions
- {decisions}

Ready to work — would you like to start on a next step or review open specs?
```
