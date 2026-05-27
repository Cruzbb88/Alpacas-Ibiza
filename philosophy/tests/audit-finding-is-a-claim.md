---
slug: audit-finding-is-a-claim
test_type: pre-action
---

## Test
Before writing a fix for an audit finding, open the source file at the cited location and confirm: (a) the finding reproduces — the flagged pattern is actually present and actually unsafe, AND (b) no false-negative exists — nearby code that is safe does not mask a real gap in an adjacent location.

## How to run
1. Read the source file at the line the audit cited.
2. Confirm the unsafe pattern is present (false-positive check).
3. Search the same file and sibling files for the same pattern class (false-negative check):
```
grep -n "<pattern>" /path/to/file
grep -rn "<pattern>" /path/to/routes/ --include="*.{js,ts}"
```

## Pass criteria
Fix PR description includes: (1) quoted line from source confirming the finding reproduces, (2) grep output confirming no sibling routes were missed.

## Failure response
If a fix was applied to a false positive: revert the change, document the false positive in the audit file, and re-run the false-negative check on sibling files before closing the finding.
