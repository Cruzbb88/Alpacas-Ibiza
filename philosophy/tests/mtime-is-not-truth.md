---
slug: mtime-is-not-truth
test_type: post-output
---

## Test
After any output that names one doc as "newer," "more current," or "authoritative" relative to another: confirm that judgment was made by checking content against the code, not by comparing timestamps or filename dates.

## How to run
Search the output for the words "newer," "latest," "more recent," "outdated," or "stale" applied to a document name. For each occurrence, confirm a content-vs-code check was performed:
```
grep -n "newer\|latest\|more recent\|outdated\|stale" <output-file>
```
For each hit: was the claim backed by reading the doc's claims and comparing them to the live code?

## Pass criteria
Any "doc A is more current than doc B" statement is followed by a specific content discrepancy (e.g., "doc B says Stripe is not wired; the code at /api/stripe shows it is wired").

## Failure response
If a doc was ranked by timestamp alone: revisit all docs in the set, read each for content accuracy against the code, and re-issue the ranking based on content matches. Correct any downstream decisions made under the wrong ranking.
