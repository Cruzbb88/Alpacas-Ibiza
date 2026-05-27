---
description: Show design changes since a reference point and flag unaddressed downstream effects. Run after brainstorming or design sessions.
argument-hint: "since-session | since-commit | today"
allowed-tools: Read, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_global_search, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_get_session_context, mcp__omni-cortex__cortex_get_activities
---

# Crystal Ball — Delta (What Changed)

Show what changed in the design and flag unaddressed downstream effects.

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

REFERENCE_POINT: $ARGUMENTS

## Workflow

### Step 1: Determine Reference Point

- `today` (default) → Changes from today's sessions
- `since-session` → Changes since the previous session ended
- `since-commit` → Changes since the last git commit (use `git diff`)

### Step 2: Gather Changes

Launch parallel sub-agents:

**Agent 1 — Omni-Cortex Changes:**
- `cortex_list_memories` sorted by created_at desc, filtered to reference period
- Identify: new decisions, new specs, architecture changes, plan updates
- Look for tags: architecture, planning, decision, spec-*

**Agent 2 — File Changes:**
- `git diff` (for since-commit) or `git log --since` (for today/session)
- Identify modified spec files, plan files, architecture docs
- Extract what specifically changed in each file

**Agent 3 — Session Activities:**
- `cortex_get_session_context` for recent sessions
- `cortex_get_activities` for detailed activity timeline
- Identify brainstorming indicators: spec creation, plan updates, architecture tags

### Step 3: Map Downstream Effects

For each change identified:

1. **What changed**: Specific decision, spec update, or plan modification
2. **What it affects**: Walk the dependency chain — which specs, endpoints, tables, workflows depend on the changed element
3. **Addressed?**: Check if any subsequent changes or memories address the downstream effect
4. **Unaddressed**: Flag effects that haven't been handled yet

### Step 4: Generate Delta Report

```
## Crystal Ball Delta Report
**Reference**: [reference point]  |  **Changes found**: [N]  |  **Date**: [timestamp]

### Changes Detected
1. **[Change description]** — [source: spec/plan/decision]
   - What changed: [detail]
   - Downstream effects:
     - -> [Spec/System X]: [effect] — Addressed? ✅ / ❌
     - -> [Spec/System Y]: [effect] — Addressed? ✅ / ❌

2. **[Change description]**
   ...

### Unaddressed Effects Summary
| Change | Affected System | Effect | Priority |
|--------|----------------|--------|----------|
| [change] | [system] | [what needs updating] | HIGH/MED/LOW |

### Recommendations
1. [Most urgent unaddressed effect]
2. [Second priority]
3. [Third priority]

### Design Regression Check
- Changes that contradict previous decisions: [list or "None found"]
- Changes that invalidate previous Crystal Ball findings: [list or "None"]
```

### Step 5: Store Results

```
cortex_remember:
  content: "Crystal Ball Delta — [N] changes, [M] unaddressed downstream effects. Top: [brief]"
  tags: ["crystal-ball", "delta", "{project-name}"]
  importance: 80
```

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Parse $ARGUMENTS for reference point: today (default), since-session, or since-commit
- Launch 3 parallel agents to gather: Cortex memory changes, file changes (git diff/log), and session activities
- For each change, trace downstream effects and check if they are addressed in subsequent changes
- Flag unaddressed downstream effects with HIGH/MED/LOW priority
- Store results in Cortex with tags ["crystal-ball", "delta", "{project-name}"]

## Report

```
## Crystal Ball Delta Report

**Reference:** {reference point} | **Changes found:** {N} | **Date:** {timestamp}

### Changes Detected
1. {Change description} — [source: spec/plan/decision]
   - What changed: [detail]
   - Downstream effects: -> [System X]: [effect] — Addressed? Yes/No

### Unaddressed Effects Summary
| Change | Affected System | Effect | Priority |

### Recommendations
1. [Most urgent unaddressed effect]
2. [Second priority]

### Design Regression Check
- Changes contradicting previous decisions: [list or "None found"]
```
