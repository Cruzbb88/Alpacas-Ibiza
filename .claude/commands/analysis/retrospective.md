---
allowed-tools: Read, Write, Glob, Grep, mcp__omni-cortex__cortex_recall, mcp__omni-cortex__cortex_remember, mcp__omni-cortex__cortex_list_memories, mcp__omni-cortex__cortex_link_memories, mcp__omni-cortex__cortex_get_activities, mcp__omni-cortex__cortex_get_timeline
description: Analyze conversation for errors, snags, and lessons learned - creates improvement documentation
argument-hint: [session-name]
model: opus
---

# Retrospective

Reverse meta-prompt the current conversation to extract lessons learned, errors encountered, and improvements for future sessions. Creates documentation and optionally updates commands to prevent recurring issues.

Follow the `Workflow` to analyze the session and generate actionable improvements.

## Variables

SESSION_NAME: $1
RETRO_DIR: docs/retrospectives
TIMESTAMP: Current date in YYYY-MM-DD format

## Workflow

1. **Initialize Retrospective**
   - Create `<RETRO_DIR>` directory if it doesn't exist
   - **Sequential File Naming**:
     1. Get today's date in YYYY-MM-DD format
     2. List existing files: `ls docs/retrospectives/retrospective-YYYY-MM-DD-*.md 2>/dev/null`
     3. Find highest existing number (e.g., if 001 and 002 exist, next is 003)
     4. If no files for today, start with 001
     5. Generate filename: `retrospective-YYYY-MM-DD-NNN-<SESSION_NAME>.md`
        - Example: `retrospective-2026-01-11-001-adw-migration.md`
        - Example: `retrospective-2026-01-11-002.md` (if no session name)

2. **Recall Memories from Session**
   - Use `mcp__omni-cortex__cortex_recall` to search for recent memories
   - Use `mcp__omni-cortex__cortex_list_memories` to get recent entries
   - Use `mcp__omni-cortex__cortex_get_timeline` for chronological activity view
   - Extract:
     - Decisions made
     - Errors encountered
     - Solutions applied
     - Tools used

3. **Analyze Conversation Context**
   - Review the conversation history for:
     - **Errors**: Build failures, type errors, merge conflicts, API issues
     - **Snags**: Unexpected blockers, missing dependencies, configuration issues
     - **Workarounds**: How problems were solved
     - **Time sinks**: Tasks that took longer than expected
     - **Successes**: What worked well

4. **Categorize Findings**
   - **Preventable Issues**: Could be avoided with better setup/commands
   - **Knowledge Gaps**: Missing documentation or understanding
   - **Tool Improvements**: Commands that need updating
   - **Process Improvements**: Workflow changes needed

5. **Include Self-Heal Trend Data**
   If `workspace/self-heal-reports/` exists with 2+ `sh-*.md` reports:
   - Read all report YAML frontmatter (extract `report_number`, `date`, `composite_score`/`health_score`, `trend`, `recurring_patterns`, `top_patterns`)
   - Include trend summary in retrospective document:
     ```
     ### Self-Heal Trends
     - Reports: {N} runs over {first_date} to {latest_date}
     - Score trajectory: {first_score} -> {latest_score} ({delta})
     - Escalated patterns: {count from fix-patterns.md} (see fix-patterns.md)
     - Top persistent issue: {pattern} ({count}x, {effectiveness status})
     ```
   - If fix-patterns.md exists, read it and include escalation summary
   - If only 0-1 reports exist, skip this section
   - If no reports directory exists, skip entirely

6. **Generate Retrospective Document** (includes Self-Heal Trends from step 5 if available)
   - Create markdown file in `<RETRO_DIR>` with structure:
     ```
     # Retrospective: <SESSION_NAME>
     Date: <TIMESTAMP>

     ## Summary
     Brief overview of what was accomplished

     ## Errors Encountered
     | Error | Cause | Resolution | Prevention |

     ## Snags & Blockers
     - Description, impact, resolution

     ## Lessons Learned
     - Key takeaways

     ## Command Improvements
     - Specific changes to make to existing commands

     ## Process Improvements
     - Workflow changes for future sessions

     ## Metrics
     - Tasks completed
     - Time spent on issues vs productive work
     ```

7. **Identify Command Updates**
   - Review existing commands in `.claude/commands/`
   - For each issue that could be prevented:
     - Note which command should be updated
     - Describe the specific change needed
   - List in retrospective document

8. **Apply Automatic Fixes (if safe)**
   - For clear, low-risk improvements:
     - Update command files directly
     - Add validation steps
     - Add error handling
   - For complex changes:
     - Document in retrospective only
     - Flag for manual review

9. **Store Retrospective Summary in Memory**
   - Use `mcp__omni-cortex__cortex_remember` to store:
     - Key lessons learned
     - Commands updated
     - Tags: ["retrospective", "<SESSION_NAME>", "lessons-learned"]
   - After storing the retrospective memory, auto-link to related memories:
     1. **Link to session handoff** (if one was created):
        - Use `cortex_list_memories` with `tags_filter: ["handoff"]`, `sort_by: "created_at"`, `sort_order: "desc"`, `limit: 1`
        - If a handoff is found from today's session, use `cortex_link_memories`:
          - `source_id`: retrospective memory ID
          - `target_id`: handoff memory ID
          - `relationship_type`: "derived_from"
     2. **Link to self-heal reports** for each error documented in the retrospective:
        - Use `cortex_recall` with query "self-heal {error_pattern}" for each significant error/snag
        - For each matching self-heal memory found, use `cortex_link_memories`:
          - `source_id`: retrospective memory ID
          - `target_id`: self-heal memory ID
          - `relationship_type`: "related_to"

10. **Crystal Ball Feedback Loop**
   Feed retrospective findings into the Crystal Ball knowledge base:
   - For each error/snag categorized as "Preventable":
     - If it relates to a technology constraint → store with `cortex_remember` using tags ["crystal-ball", "tech-constraint", "<technology>"]
     - If it relates to a design gap → store with tags ["crystal-ball", "gap-pattern", "<category>"]
   - For recurring patterns (same issue type across 3+ retrospectives):
     - Create a weight adjustment memory: "Retrospective pattern: [category] issues found [N] times. Crystal Ball should increase scrutiny weight by 1.5x for this category."
     - Tags: ["crystal-ball", "weight-adjustment", "retrospective-feedback"]
   - Add relevant Crystal Ball suggestion to the retrospective report:
     - If design gaps found: "Run `/crystal-ball` to audit current design completeness"
     - If constraint violations: "Run `/crystal-ball-constraints` to check all tech limits"
     - If stale decisions suspected: "Run `/crystal-ball-decay` to find outdated assumptions"
     - If lots of changes made: "Run `/crystal-ball-delta today` to check downstream effects"

11. **Generate Quick Reference**
    - If patterns emerge across multiple retrospectives:
      - Update or create `docs/COMMON_ISSUES.md`
      - Add FAQ entries for recurring problems

## Report

Output the retrospective summary:

```
## Retrospective Complete: <SESSION_NAME>

### Session Overview
- Duration: [estimated]
- Tasks Completed: X
- Issues Encountered: Y

### Key Errors
1. **[Error Type]**: [Brief description]
   - Cause: [Root cause]
   - Fix: [How it was resolved]
   - Prevention: [How to avoid next time]

### Snags Encountered
- [Snag 1]: [Impact and resolution]
- [Snag 2]: [Impact and resolution]

### Top Lessons Learned
1. [Lesson 1]
2. [Lesson 2]
3. [Lesson 3]

### Commands Updated
- `/command-name`: [Change made]

### Files Created
- `docs/retrospectives/retrospective-YYYY-MM-DD-NNN-<session>.md`

### Recommendations
- [Actionable recommendation 1]
- [Actionable recommendation 2]
```
