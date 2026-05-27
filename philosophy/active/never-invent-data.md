---
slug: never-invent-data
captured_at: 2026-05-26
captured_from: "PRACTICES Rule 5, memory feedback_never_guess_data"
bad_habit: "Filling owner-input gaps with plausible-looking numbers or names"
philosophy: "If the owner hasn't confirmed it, render UNMAPPED. The owner's confidence in the system depends on the system never inventing facts."
status: active
test_file: tests/never-invent-data.md
related_practices: [PRACTICES Rule 5]
related_memories: [feedback_never_guess_data]
---

## Bad habit being removed
When a required value (price, tier name, feature flag, business rule) is not present in the codebase or owner-confirmed docs, filling it in with a plausible placeholder — often a round number or a reasonable-sounding label — without marking it UNMAPPED. The placeholder then looks like a real value to downstream consumers.

## The philosophy (abstract intent)
If the owner hasn't confirmed it, render UNMAPPED. The owner's confidence in the system depends on the system never inventing facts.

## Why this matters
Session 2026-05-26: an OWNER_INPUT file contained a €15/mo Adopt suggestion as a placeholder. The live site showed €75/mo. The conflict was caught before any code was written, but the invented value would have produced wrong pricing copy if it had shipped.

## Test signature
Any numeric value, tier name, or business rule appears in an output file without a citation to either the codebase or an explicit owner-confirmed document.
