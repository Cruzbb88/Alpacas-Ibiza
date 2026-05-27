---
slug: kit-skills-not-vibes
test_type: post-output
---

## Test
After any response that mentions a skill by name (e.g., /crystal-ball, /exploding-pen, /skill-roadmap, /agent-teams): confirm the Skill tool was actually invoked in that turn, not merely described.

## How to run
Search the turn for a Skill tool call with the named skill:
- Was `Skill { skill: "crystal-ball" }` (or equivalent) called in this turn?
- Or was the skill only mentioned in prose?

If the skill was mentioned but not invoked, the test fails.

## Pass criteria
Every turn that mentions a kit skill either: (a) contains a Skill tool invocation for that skill, or (b) explicitly states why the skill cannot be invoked right now (e.g., waiting for a prerequisite) with a concrete next step to invoke it.

## Failure response
If a skill was mentioned but not invoked: invoke it immediately in the next turn. Do not continue manual work that duplicates the skill's output. If the skill's output is redundant now, note the duplication and commit to invoking first in future.
