---
slug: preflight-gate
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 11"
bad_habit: "Making changes or publishing claims without naming what is unknown"
philosophy: "Before acting, name the goal, the assumptions (verified / needs-research / needs-owner), and the test. STOP on any unresolved assumption."
status: active
test_file: tests/preflight-gate.md
related_practices: [PRACTICES Rule 11]
related_memories: []
---

## Bad habit being removed
Starting a task, writing code, or publishing an analysis without first writing down: (1) what the goal is, (2) which assumptions are verified from the code, which need research, and which need owner input, and (3) what observable outcome proves success. Unresolved assumptions turn into invented data or incorrect claims downstream.

## The philosophy (abstract intent)
Before acting, name the goal, the assumptions (verified / needs-research / needs-owner), and the test. STOP on any unresolved assumption.

## Why this matters
Session 2026-05-26: Cruz stated "make a way for you to realise that you research to confirm and test beforehand so that you realise what you don't know or can't do without more help." This was a direct correction after claims were published without a pre-flight step that would have surfaced what wasn't known.

## Test signature
A task begins — code is written, a file is created, a claim is published — without a named assumption list or without a STOP marker on any assumption in "needs-owner" state.

## Recurrences

- **2026-05-26** — REALITY_CHECK (first major session deliverable) shipped without a preflight block. No GOAL/ASSUMPTIONS/TEST structure was documented before the file was created. Later Wave 0/1 invocations had structured preflights, but the gate failed at the highest-risk moment: session start.
