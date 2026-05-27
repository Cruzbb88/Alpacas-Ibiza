---
slug: verify-with-parallel-agents
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 10, memory feedback_verify_with_parallel_agents"
bad_habit: "Publishing 3+ claim audits without independent verification"
philosophy: "An audit is a hypothesis until 1 agent per claim has independently confirmed it from the source."
status: active
test_file: tests/verify-with-parallel-agents.md
related_practices: [PRACTICES Rule 10]
related_memories: [feedback_verify_with_parallel_agents]
---

## Bad habit being removed
Producing a multi-claim audit document and treating the claims as facts because they came from a single pass over the codebase. A single reader can misread, miss context, or apply the wrong mental model. Publishing an unverified multi-claim audit is publishing a list of hypotheses dressed as findings.

## The philosophy (abstract intent)
An audit is a hypothesis until 1 agent per claim has independently confirmed it from the source.

## Why this matters
Session 2026-05-26: Cruz challenged the REALITY_CHECK findings asking whether they were "AI delusion or research." Six parallel agents verified each claim from the source files. Result: 12/13 claims confirmed real; 1 was wrong framing. Without parallel verification, the wrong framing would have shipped.

## Test signature
An audit with 3 or more claims is published without a companion verification pass showing each claim traced back to a specific file and line.
