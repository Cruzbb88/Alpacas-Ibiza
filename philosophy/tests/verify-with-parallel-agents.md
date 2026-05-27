---
slug: verify-with-parallel-agents
test_type: pre-action
---

## Test
Before publishing an audit with 3 or more claims, confirm that each claim has been verified by tracing it to a specific file and line — either in the same pass or via a parallel agent per claim.

## How to run
Count the claims in the draft audit. For each claim, check: is there a cited file path and line number (or function name) that a reader could open and confirm? If any claim lacks a citation, the audit is not ready to publish.

## Pass criteria
Every claim in the published audit has a corresponding file:line citation or a "verified by agent N" reference. The verification pass is documented in the same output or a companion file.

## Failure response
If an uncited claim is found after publication: mark it as UNVERIFIED in the document, dispatch a verification agent to that specific file, and update the audit with the result. If the claim is wrong, issue a correction prominently at the top of the audit.
