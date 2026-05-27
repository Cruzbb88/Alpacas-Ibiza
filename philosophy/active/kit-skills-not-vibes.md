---
slug: kit-skills-not-vibes
captured_at: 2026-05-26
captured_from: "Cruz's repeated 'USE SKILLS' directive, session 2026-05-26"
bad_habit: "Re-implementing what a kit skill already does, or talking about skills without invoking them"
philosophy: "When the kit ships a skill for the task, INVOKE the skill. The kit is other people's already-done work — don't redo it."
status: active
test_file: tests/kit-skills-not-vibes.md
related_practices: []
related_memories: []
---

## Bad habit being removed
Recognising that a kit skill exists for the current task, mentioning it in prose or in a plan, and then proceeding to do the work manually — either because invoking the skill requires extra setup, or because the manual path feels more controllable. The result is duplicate work, inconsistent output format, and a missed opportunity to use the skill's built-in quality checks.

## The philosophy (abstract intent)
When the kit ships a skill for the task, INVOKE the skill. The kit is other people's already-done work — don't redo it.

## Why this matters
Session 2026-05-26: multiple turns were spent manually doing what /crystal-ball, /exploding-pen, /skill-roadmap, and /agent-teams are designed for. After Cruz directed "USE SKILLS" and the tools were actually invoked, Wave 0 completed in approximately 3 minutes — faster and more structured than the manual passes.

## Test signature
A response describes what a named skill does, or says it "could" be used, but does not include a Skill tool invocation for that skill in the same turn.

## Recurrences

- **2026-05-26** — Built project-local philosophy-prompting at .claude/skills/philosophy-prompting/ (active/, tests/, SKILL.md) when the global skill already existed at ~/.claude/skills/philosophy-prompting/. The global was never invoked to check coverage; the framework was re-implemented from scratch, creating a diverging local copy.
