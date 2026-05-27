---
description: Cross-check design against known technology limits. Self-growing database that learns new constraints from every session.
argument-hint: "[tech-name | all | add]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_remember
---

# Crystal Ball — Technology Constraints Check

Cross-check design against known technology limits.

Read the Crystal Ball skill at `~/.claude/skills/crystal-ball/SKILL.md` for core engine.

## Variables

TARGET: $ARGUMENTS

## Constraint Database Location

The self-growing constraint database lives at:
`~/.claude/skills/crystal-ball/references/tech-constraints.md`

## Workflow

### For "all" (default if empty):

**Step 1: Load Constraints**
- Read `references/tech-constraints.md` from the Crystal Ball skill directory
- Parse each technology section and its constraints

**Step 2: Load Current Design**
- Read spec files, config files, and architecture docs
- Identify all technologies in use and their configuration

**Step 3: Cross-Check**
For each constraint in the database:
1. Check if the technology is used in the current project
2. If yes, verify the design respects the constraint
3. Calculate proximity to limits (e.g., "using 3500 of 4096 chars = 85%")

**Step 4: Report**
```
## Technology Constraints Report

### [Technology Name]
- ✅ [constraint]: within bounds ([X]% of limit)
- ⚠️ [constraint]: approaching limit ([X]% of limit)
- ❌ [constraint]: VIOLATED — [current value] exceeds [limit]

### Compliance Score: [N]%
([passing] of [total] constraints met)

### New Constraints Discovered: [N]
[List any new constraints found during this check]
```

### For specific technology (e.g., "vercel"):

Same as above but filtered to only constraints for that technology.

### For "add":

1. Ask user for:
   - Technology name
   - Constraint description
   - Limit value (if applicable)
2. Read current `references/tech-constraints.md`
3. Append new constraint under the appropriate technology heading
4. If technology heading doesn't exist, create it
5. Format: `- **[Constraint]**: [Detail] — discovered [YYYY-MM-DD]`
6. Store in Omni-Cortex:
   ```
   cortex_remember:
     content: "New tech constraint: [tech] — [constraint]"
     tags: ["crystal-ball", "tech-constraint", "{tech-name}"]
     importance: 75
   ```

### Auto-Growth After Every Crystal Ball Run

After any Crystal Ball command completes, check the session for new constraint discoveries:
1. Were any errors caused by hitting a technology limit?
2. Were any workarounds applied due to a platform restriction?
3. If yes, append to tech-constraints.md automatically

## Instructions

- Read the Crystal Ball SKILL.md for core engine behavior before executing
- Read references/tech-constraints.md to load the constraint database
- For "add" mode: ask user for technology, constraint, and limit; then append to the database
- Cross-check only technologies that are actually used in the current project
- Always update the constraint database after each run if new limits were discovered
- Store results in Cortex with tags ["crystal-ball", "tech-constraint", "{tech-name}"]

## Report

```
## Technology Constraints Report

### [Technology Name]
- [constraint]: within bounds ([X]% of limit)
- [constraint]: approaching limit ([X]% of limit)
- [constraint]: VIOLATED — [current value] exceeds [limit]

### Compliance Score: [N]%
([passing] of [total] constraints met)

### New Constraints Discovered
[Any new limits found during this check, added to tech-constraints.md]
```
