---
slug: mtime-is-not-truth
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 9"
bad_habit: "Assuming the most-recently-touched doc is the most current source of truth"
philosophy: "File mtime is not content currency. The accurate doc is the one whose claims match the code, not the one touched last."
status: active
test_file: tests/mtime-is-not-truth.md
related_practices: [PRACTICES Rule 9]
related_memories: []
---

## Bad habit being removed
When two or more docs cover overlapping topics, picking the one with the latest filesystem timestamp as the authoritative source and dismissing the others as "stale." A doc's mtime reflects when it was last edited, not whether its content is correct. A doc touched last week to fix a typo outranks a doc from last year that accurately reflects the current code — and that ranking is backwards.

## The philosophy (abstract intent)
File mtime is not content currency. The accurate doc is the one whose claims match the code, not the one touched last.

## Why this matters
Session 2026-05-26: INTEGRATION_STATUS_2026-04-20.md was called "the newer source of truth" when it was actually the oldest of three integration docs. The staleness direction was inverted, which would have led to dismissing accurate docs in favor of outdated ones.

## Test signature
An output document names one doc as "more current" or "newer" than another based solely on the date in the filename or on mtime, without checking whether the content matches the live code.

## Recurrences

- **2026-05-26** — INTEGRATION_STATUS_2026-04-20.md called "the newer source of truth" based on filename date, inverting the correct ranking. PLAN.md (the actual authoritative doc) was ranked below it. Caught and corrected by Sonnet verification before downstream decisions were made.
