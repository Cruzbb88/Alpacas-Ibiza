---
slug: sonnet-for-scans-opus-for-synthesis
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 7, memory feedback_model_selection"
bad_habit: "Running scans and audits with Opus when Sonnet would be cheaper and equivalent"
philosophy: "Match the model to the task: parallel scans go to Sonnet; cross-cutting synthesis is Opus's job."
status: active
test_file: tests/sonnet-for-scans-opus-for-synthesis.md
related_practices: [PRACTICES Rule 7]
related_memories: [feedback_model_selection]
---

## Bad habit being removed
Defaulting every subtask to Opus regardless of what it requires. File-reading, grep-style code scans, single-file audits, and parallel claim verification are all pattern-matching tasks where Sonnet performs identically to Opus at roughly 65% of the token cost. Burning Opus on these tasks delays the session and wastes budget that should be reserved for the synthesis step.

## The philosophy (abstract intent)
Match the model to the task: parallel scans go to Sonnet; cross-cutting synthesis is Opus's job.

## Why this matters
Session 2026-05-26: three parallel Sonnet scans completed in approximately 200s wall time. Sequential Opus would have taken approximately 10 minutes and consumed around 35% more tokens for identical coverage. The memory file feedback_model_selection records this delta explicitly: "Opus 4.7 verifies = +35% tokens."

## Test signature
A subtask that reads one or two files, runs a grep, or checks a single claim is dispatched to Opus instead of Sonnet in a multi-agent plan.
