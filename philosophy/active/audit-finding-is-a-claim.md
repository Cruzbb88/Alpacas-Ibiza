---
slug: audit-finding-is-a-claim
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 12"
bad_habit: "Applying audit-recommended fixes without verifying the finding still reproduces"
philosophy: "Audit findings are claims, not facts. The fix agent re-verifies the finding before fixing — in both directions (false positive AND false negative)."
status: active
test_file: tests/audit-finding-is-a-claim.md
related_practices: [PRACTICES Rule 12]
related_memories: []
---

## Bad habit being removed
Taking an audit output at face value and immediately writing a fix. Audits can produce false positives (flagging code that is actually safe) and false negatives (missing the real vulnerability because a nearby safe call satisfied the pattern). Applying a fix without re-reading the source code means fixing the wrong thing or skipping the real problem.

## The philosophy (abstract intent)
Audit findings are claims, not facts. The fix agent re-verifies the finding before fixing — in both directions (false positive AND false negative).

## Why this matters
Session 2026-05-26: the exploding-pen audit claimed /api/contact was missing escapeHtml (false positive — it was present). It also claimed sister routes didn't exist (false negative — they did, and the newsletter route had a real XSS gap that would have been skipped if the false negative had been accepted without checking).

## Test signature
A fix PR is opened against an audit finding without a comment in the PR showing the fix agent read the source file and confirmed the finding reproduces.

## Recurrences

- **2026-05-26** — exploding-pen G-06 ranked #1 and added to Wave 0 action plan without re-reading app/api/contact/route.ts to confirm escapeHtml was absent. CLAUDE.md failsafe map already documented escapeHtml for "user input before email HTML" — the finding was a false positive that reached the action plan unchallenged.
