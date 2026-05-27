---
slug: sonnet-for-scans-opus-for-synthesis
test_type: post-output
---

## Test
After a multi-agent plan is dispatched: confirm that file-reading agents, single-file auditors, and parallel claim verifiers are assigned to Sonnet, and that only the final cross-cutting synthesis step is assigned to Opus.

## How to run
Review the agent plan before dispatch. For each agent, ask: does this agent read more than 3 files, or does it need to reason across multiple system components simultaneously? If no: assign Sonnet. If yes: Opus is justified.

## Pass criteria
In a parallel scan of N files, at most 1 agent (the synthesizer) runs on Opus. All file readers and single-claim verifiers run on Sonnet.

## Failure response
If Opus was used for a single-file read or a grep-style check: note the wasted budget, reassign the equivalent future task to Sonnet, and update the agent plan template for this project to mark scan subtasks as Sonnet by default.
