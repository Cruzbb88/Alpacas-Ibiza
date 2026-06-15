---
report_number: 3
date: "2026-06-15"
mode: "default"
project: "alpaca-farm-redesign"
domain_filter: null
skills_count: 39
commands_count: 22
focus: "finish + harden the in-house booking engine and site"
---

# Skill Roadmap #003 — Website Build Waves

Mapped the 39 global skills against this project. Most are irrelevant here (youtube-bulk,
scorm, sipoc, billing-reconciler, proposal-builder, data-pipeline, saas-blueprint, …).
The **relevant** set, wave-sequenced for finishing + hardening the site:

## Wave 1 — BUILD remaining buildable items (spec-011 §I) ← executing now
Skills: `build` discipline, then `/code-review --fix` tail.
- Reserve idempotency (FM2) — stop duplicate holds on client retry.
- GDPR soft-delete on `bookings` (FM4) — `deleted_at` + erasure helper (the `customers` table already has this; `bookings` didn't).
- (Wave 1.5) Guest booking lookup (FM4).

## Wave 2 — HARDEN / quality (skills)
- `/security-review` (payments + new PII surface), `/performance-optimizer`, `resonance-finder` (tune hold TTL / cron cadence / timeouts), `simplify`/`matrix-reload` if churn warrants.

## Wave 3 — VERIFY / COHERE
- `crystal-ball` coherence (cb-008 after Wave 1), `verify`, `consensus-gate` for sign-off before go-live.

## Wave 4 — LAUNCH
- `/launch-readiness` route + checklist; owner-data punch list (slots, VAT decision, env).

## Owner-blocked (not a skill can fix)
- VAT/IVA decision, real slot data, customer UI design sign-off, Postgres provisioning + flags.

Executing Wave 1 below.
