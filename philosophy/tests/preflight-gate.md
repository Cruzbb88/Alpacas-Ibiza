---
slug: preflight-gate
test_type: pre-action
---

## Test
Before writing any file, running any command, or publishing any claim, produce a preflight block containing: GOAL (one sentence), ASSUMPTIONS (each tagged verified/needs-research/needs-owner), and TEST (what proves success). STOP if any assumption is tagged needs-owner and owner input has not been received.

## How to run
Search the session output for a preflight block before the first action on a new task:
```
grep -i "GOAL\|ASSUMPTIONS\|needs-owner\|needs-research" <output-file>
```
If no preflight block exists, the gate was skipped.

## Pass criteria
A preflight block exists before the first action. All needs-owner assumptions either have a response from the owner, or the task has a visible STOP/BLOCKED marker.

## Failure response
If action was taken without a preflight block: pause the task, write the preflight block retrospectively, identify which assumptions were unresolved at action time, and flag any output produced under unresolved assumptions as PROVISIONAL.
