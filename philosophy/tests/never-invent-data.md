---
slug: never-invent-data
test_type: pre-action
---

## Test
Before any numeric value, tier name, or business rule is written into an output file, confirm it appears verbatim in the codebase or in an owner-confirmed document. If it does not, the field must be rendered as UNMAPPED with a note indicating what the owner needs to confirm.

## How to run
For any price or named tier in draft output:
```
grep -r "<value>" /path/to/repo --include="*.{js,ts,json,md}" -l
```
If zero matches: the value must become UNMAPPED in the output.

## Pass criteria
Every numeric value and named business entity in the output either has a grep citation to the codebase/owner doc, or is explicitly marked UNMAPPED.

## Failure response
If an invented value is found in published output: replace it with UNMAPPED immediately, add a comment citing this philosophy, and add an owner-input request for the correct value. Do not attempt to "correct" the invented value with another guess.
