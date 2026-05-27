---
slug: read-existing-docs-first
test_type: session-start
---

## Test
Before publishing any claim that something is "missing," "undocumented," or "not yet built," confirm that every .md file in the repo root and /docs directory has been searched for keywords related to that thing.

## How to run
```
grep -r -i "<feature-name>" /path/to/repo --include="*.md" -l
```
If any file is returned, read it before proceeding. If zero files are returned, the claim may proceed.

## Pass criteria
Either: (a) no .md file in the repo mentions the claimed-missing feature, OR (b) the output cites the specific doc that was checked and confirms the feature is absent from it.

## Failure response
If a "missing" claim appears and a repo .md file mentions the feature: retract the claim, cite the document, and revise the output to reflect what is actually documented. Add the doc to the pre-read list for this project.
