---
slug: read-existing-docs-first
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 1, memory feedback_read_existing_docs_first"
bad_habit: "Claiming gaps without reading the project's existing .md files"
philosophy: "The existing project is smarter than your assumptions — read before you write."
status: active
test_file: tests/read-existing-docs-first.md
related_practices: [PRACTICES Rule 1]
related_memories: [feedback_read_existing_docs_first]
---

## Bad habit being removed
Publishing gap analyses, REALITY_CHECK documents, or owner-input requests that name something as "missing" or "undocumented" without first grepping every .md in the repo root and known doc directories. The result is false alarms that erode owner trust and waste review cycles.

## The philosophy (abstract intent)
The existing project is smarter than your assumptions — read before you write.

## Why this matters
Session 2026-05-26: published a REALITY_CHECK claiming Adopt-a-Paca was missing and Stripe was not wired. Both were already documented in OWNER_INPUT_NEEDED.md and INTEGRATION_STATUS_2026-04-20.md. The claims were false because the docs were never read.

## Test signature
An "X is missing" or "X is undocumented" claim appears in any output file without a prior grep of repo .md files for X-related keywords.

## Recurrences

- **2026-05-26** — REALITY_CHECK published before reading OWNER_INPUT_NEEDED.md and INTEGRATION_STATUS_2026-04-20.md; Adopt-a-Paca and Stripe claimed missing/unwired when both were documented. Also: built project-local philosophy-prompting framework without reading the global skill at ~/.claude/skills/philosophy-prompting/ first.
