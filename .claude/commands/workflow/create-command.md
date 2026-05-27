---
allowed-tools: Write, Edit, WebFetch, Task, AskUserQuestion, mcp__firecrawl-mcp__firecrawl_scrape, Fetch
description: Create a new slash command or skill from a high-level description
argument-hint: "<what the command should do>"
model: sonnet
---

# MetaPrompt

Based on the `High Level Prompt` follow the `Workflow`, to create a new prompt in the `Specified Format`. Before you start, WebFetch everything in the `Documentation`.

## Variables

HIGH_LEVEL_PROMPT: $ARGUMENTS

## Workflow

1. We're building a new prompt to satisfy the request detailed in the `High Level Prompt`.
2. Use one Task tool per documentation item to run sub tasks to gather documentation quickly in parallel using `Task` and `WebFetch`.
3. **Hook Assessment**: Before creating the prompt, use AskUserQuestion to ask:
   - "Does this command need validation hooks?"
   - Provide recommendations based on the command type (see `Hook Recommendations` section)
   - Options: "Yes - add hooks", "No - skip hooks"
   - If yes, ask which hook type(s) using the `Hook Types` reference
4. Save the new prompt to `.claude/commands/<name_of_prompt>.md`
   - The name of the prompt should make sense based on the `High Level Prompt`
5. VERY IMPORTANT: The prompt should be in the `Specified Format`
   - Do not create any additional sections or headers that are not in the `Specified Format`
   - If hooks were requested, include the `hooks:` field in frontmatter
6. IMPORTANT: As you're working through the `Specified Format`, replace every block of `<some request>` with the request detailed within the braces.
7. Note we're calling these 'prompts' they're also known as custom slash commands.
8. Ultra Think - you're operating a prompt that builds a prompt. Stay focused on the details of creating the best high quality prompt for other ai agents.
9. If the `High Level Prompt` requested multiple arguments, give each their own position with `$1`, `$2`, etc.
10. Note, if no variables are requested or mentioned, do not create a Variables section.
11. Think through what the static variables vs dynamic variables are and place them accordingly with dynamic variables coming first and static variables coming second.
    - Prefer the `$1`, `$2`, ... over the `$ARGUMENTS` notation.
12. **MANDATORY: Always include `argument-hint` in the frontmatter.** Every command and skill MUST have an argument-hint, even if the command accepts no arguments (use `argument-hint: "(no arguments)"` in that case). Study the command's purpose and typical invocation patterns to write a helpful hint. Examples:
    - Commands with a single input: `argument-hint: "<spec-file-or-description>"`
    - Commands with options: `argument-hint: "<target> [--flag]"`
    - Commands with multiple args: `argument-hint: "<name> <path> [options]"`
    - Commands with discrete choices: `argument-hint: "create | delete | list"`

## Hook Types

| Hook Event | When it Fires | Use Case |
|------------|---------------|----------|
| `Stop` | When command finishes | Final validation, cleanup, notifications |
| `PostToolUse` | After a tool runs | Validate output of specific tools |
| `PreToolUse` | Before a tool runs | Block dangerous operations |
| `UserPromptSubmit` | User sends prompt | Context injection, prompt validation |

## Hook Recommendations

Based on command type, recommend these hooks:

| Command Type | Recommended Hooks | Reason |
|--------------|-------------------|--------|
| Data modification (CSV, DB) | `Stop` with validator | Validate data integrity after changes |
| File generation (reports, exports) | `Stop` with validator | Ensure output format is correct |
| Email/notification sending | `Stop` with confirmation | Verify message before send |
| Morning/evening routines | `Stop` with logger | Track completion for patterns |
| API operations | `PostToolUse` on Bash/WebFetch | Validate API responses |
| Simple queries/views | None | No side effects to validate |

## Hook Template

When hooks are requested, use this pattern in frontmatter:

```yaml
hooks:
  Stop:
    - hooks:
        - type: command
          command: "uv run $CLAUDE_PROJECT_DIR/.claude/hooks/validators/<validator_name>.py"
```

## Documentation

Slash Command Documentation: https://docs.anthropic.com/en/docs/claude-code/slash-commands
Create Custom Slash Commands: https://docs.anthropic.com/en/docs/claude-code/common-workflows#create-custom-slash-commands
Available Tools and Settings: https://docs.anthropic.com/en/docs/claude-code/settings

## Output Format Rules

**CRITICAL: All commands MUST use human-readable output format, NOT JSON.**

- Use markdown formatting with headers, bullet points, and checkmarks
- Provide summaries that are easy to scan and understand
- Use status indicators for quick visual feedback
- Structure reports like you would present in a standup meeting
- NEVER require "Return ONLY JSON" or similar machine-readable formats
- See `/quick-plan` as the gold standard for output formatting

Example good report format:
```
## Results Summary

**Status:** Success | Partial | Failed

### Details
- Item 1: Completed
- Item 2: Failed - [reason]

### Next Steps
1. [actionable step]
```

## YAML Frontmatter Warning

**CRITICAL: `argument-hint` values must be quoted strings.**

YAML interprets `[word:` as array/object syntax, which crashes Claude Code's UI (React error #31).

BAD: `argument-hint: [optional: description here]`
GOOD: `argument-hint: "optional description here"`
GOOD: `argument-hint: "<arg1> <arg2>"`

Never start argument-hint with `[word:` pattern. Always quote the value.

## Specified Format
```md
---
allowed-tools: <allowed-tools comma separated>
description: <description we'll use to id this prompt>
argument-hint: "<argument-hint description>"  # REQUIRED - Always include to help users know valid arguments
model: sonnet
hooks:  # OPTIONAL - only include if user requested hooks
  <HookEvent>:
    - matcher: "<tool_pattern>"  # optional, for PreToolUse/PostToolUse
      hooks:
        - type: command
          command: "<command to run>"
---

# <name_of_prompt>

<prompt purpose: here we describe what the prompt does at a high level and reference any sections we create that are relevant like the `Instructions` section. Every prompt must have an `Instructions` section where we detail the instructions for the prompt in a bullet point list>

## Variables

<NAME_OF_DYNAMIC_VARIABLE>: $1
<NAME_OF_DYNAMIC_VARIABLE>: $2
<NAME_OF_STATIC_VARIABLE>: <SOMETHING STATIC>

## Instructions

<bullet point list of rules, constraints, and requirements for this prompt>

## Workflow
<step by step numbered list of tasks to complete to accomplish the prompt>

## Report

Provide a human-readable summary with:
- Overall status (success/partial/failed) with emoji indicators
- Key findings or results in bullet points
- Any issues found with severity and resolution
- Clear next steps

<details of how the prompt should respond back to the user - MUST be human-readable, NOT JSON>

```