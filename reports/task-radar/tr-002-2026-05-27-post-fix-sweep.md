---
report_type: "task-radar"
report_number: 2
date: "2026-05-27"
layer: "L2"
scope: "alpaca-farm-redesign + claude-saas-framework"
q1_count: 7
q2_count: 11
q3_count: 5
q4_count: 4
total_open: 27
---

# Task Radar TR-002 — Post-Fix Sweep

**Date:** 2026-05-27
**Scope:** `alpaca-farm-redesign` (alpaca) + `claude-saas-framework` (framework)
**Layer:** L2 Deep
**Sources scanned:** specs/todo/, OWNER_INPUT_NEEDED.md, FINAL-DECISIONS-2026-05-27.md, CANT_BE_DONE.md (both), reports/*/, TODO/FIXME/HACK/UNMAPPED in code, git status, philosophy-prompting catalog 001-017

---

## Eisenhower Matrix

### Q1 — Urgent + Important (launch blockers, revenue risk)

| # | Task | Source file | Project | Unblocked by | Est size |
|---|------|------------|---------|-------------|----------|
| 1 | GDPR legal text: Privacy/Terms/Cookies pages are placeholder (EU legal risk) | `specs/todo/002-legal-content-gdpr.md` | alpaca | owner (legal text) | M (4-6h) |
| 2 | Adopt-a-Paca route missing (live revenue line at EUR 75/mo killed on DNS cutover) | `specs/todo/003-adopt-a-paca-page.md` | alpaca | owner (pricing confirm + 14 bios) | M (4-8h) |
| 3 | PaymentsProvider interface mismatch — `_interfaces/types.ts` vs `payments/_interfaces/payments-provider.ts` (BLK-001, silent type-cast bypass) | `reports/security-review/sr-002-2026-05-27-v020.md`, `reports/verify/vf-002-2026-05-27-v020.md` | framework | none | S (1-2h) |
| 4 | CAPTCHA PoW HMAC secret falls through to empty string — forge-able challenges in prod | `reports/security-review/sr-002-2026-05-27-v020.md` (Medium) | framework | none | XS (30m) |
| 5 | `X-Tenant-Slug` header spoofing — no allowlist or internal-origin check | `reports/security-review/sr-002-2026-05-27-v020.md` (Medium) | framework | none | S (1-2h) |
| 6 | Open-redirect on Stripe checkout `successUrl`/`cancelUrl` (no origin validation) | `reports/security-review/sr-002-2026-05-27-v020.md` (Medium) | framework | none | XS (30m) |
| 7 | Spanish legal footer missing: CIF, registered business name, full address | `OWNER_INPUT_NEEDED.md:54-59` | alpaca | owner (CIF + legal name) | XS (30m code) |

### Q2 — Important, Not Urgent (quality, architecture, post-launch)

| # | Task | Source file | Project | Unblocked by | Est size |
|---|------|------------|---------|-------------|----------|
| 8 | Locale strategy: drop IT/FR or add machine-translation banner; fix GB flag emoji | `specs/todo/005-locale-strategy.md` | alpaca | owner (decision D7) | S (2-3h) |
| 9 | FINAL-DECISIONS 1-10: 10 owner decisions blocking framework publish + alpaca launch sequence | `FINAL-DECISIONS-2026-05-27.md` | framework | owner (all 10) | varies |
| 10 | Reconciliation path A/B/C/D3 — alpaca runtime vs CSF multi-tenant | `RECONCILIATION-2026-05-27.md`, `READY_FOR_GO.md` D1 | both | owner (decision D1) | L (6-38h per path) |
| 11 | 14 alpaca bios + photos UNMAPPED — all `bio: null, image: null` | `lib/data/alpacas.ts`, `READY_FOR_GO.md` C2 | alpaca | owner (content) | M (paste-in) |
| 12 | Press logos + article URLs — 6 outlets, all `logoUrl: null, articleUrl: null` | `lib/data/press.ts`, `READY_FOR_GO.md` C3 | alpaca | owner (content) | XS (paste-in) |
| 13 | Per-tour pricing UNMAPPED for 4 tour cards (conversion lift 10-15% with price anchors) | `OWNER_INPUT_NEEDED.md:19-27`, `READY_FOR_GO.md` C4 | alpaca | owner (pricing) | XS (paste-in) |
| 14 | Real photos: hero, OG, team headshots, tour-specific, alpaca portraits — 0 in `public/images/` | `OWNER_INPUT_NEEDED.md:37-44`, `READY_FOR_GO.md` C8 | alpaca | owner (photos) | M (asset prep) |
| 15 | 13 of 14 framework modules missing `test.md` (CONTRIBUTING.md mandates one per module) | `reports/exploding-pen/ep-001-2026-05-27-framework-gaps.md` gap #4 | framework | none | M (4-6h) |
| 16 | `bootstrap.sh` Linux/macOS dry-run unvalidated | `CANT_BE_DONE.md` (framework), `FINAL-DECISIONS` D9 | framework | external (Linux env) | S (1h) |
| 17 | Accent color darkened (L=55% to 40%) pending owner visual review | `CLAUDE.md` "Pending designer review" table | alpaca | owner (visual sign-off) | XS |
| 18 | `X-Tenant-*` header stripping in middleware (spoofing vector) | `reports/security-review/sr-002-2026-05-27-v020.md` (Low) | framework | none | XS (30m) |

### Q3 — Urgent, Not Important (quick fixes, doc cleanup)

| # | Task | Source file | Project | Unblocked by | Est size |
|---|------|------------|---------|-------------|----------|
| 19 | bootstrap.ps1 next-steps should reference `.env.example.template` (gd-003) | `reports/exploding-pen/ep-001-2026-05-27-framework-gaps.md` | framework | none | XS (1 line) |
| 20 | "provider" naming disambiguation paragraph in ONBOARDING.md Phase 1.5 (gd-005) | `reports/exploding-pen/ep-001-2026-05-27-framework-gaps.md` | framework | none | XS (6 lines) |
| 21 | `verify.ps1` post-install smoke check template (gd-004) | `reports/exploding-pen/ep-001-2026-05-27-framework-gaps.md` | framework | none | XS (19 lines) |
| 22 | Mollie payment adapter is a stub — `TODO: wire to Mollie API once owner confirms vendor` | `lib/integrations/payment-mollie.ts:68,89` | alpaca | owner (vendor confirm) | M (4-6h) |
| 23 | FareHarbor adapter TODO: move per-item availability fetching to adapter | `lib/booking-engine/fareharbor-adapter.ts:42` | alpaca | none | S (2h) |

### Q4 — Neither Urgent Nor Important (nice-to-have, deferred)

| # | Task | Source file | Project | Unblocked by | Est size |
|---|------|------------|---------|-------------|----------|
| 24 | Wedding page 9 UNMAPPED detail slots (renders "Contact for details" — functional) | `READY_FOR_GO.md` C6 | alpaca | owner (wedding details) | XS (paste-in) |
| 25 | Workshop details: price, group size, off-season months — 6 UNMAPPED | `READY_FOR_GO.md` C7 | alpaca | owner (workshop details) | XS (paste-in) |
| 26 | Yoga details: instructor, time, what to bring — 6 UNMAPPED | `READY_FOR_GO.md` C5 | alpaca | owner (yoga details) | XS (paste-in) |
| 27 | PoW captcha dev fast-path sends `{skipped:true}` that is indistinguishable in prod | `reports/security-review/sr-002-2026-05-27-v020.md` (Low) | framework | none | XS (30m) |

---

## Already Done in Session (not re-listed above)

- Specs 001, 004, 006, 007, 008, 009, 010 — all in `specs/done/`
- Framework v0.1.0 + v0.1.1 + v0.2.0 deliverables (CHANGELOG.md confirms)
- 22 alpaca routes live, `pnpm build` + `pnpm test` 239/239 green
- 32-row failsafe map in CLAUDE.md
- 14 ADRs (001-014) across alpaca
- 239 tests across 14 test suites
- Philosophy-prompting catalog 001-017 seeded (global + framework copies)
- `.env.example.template` created (gd-001 applied)
- ONBOARDING.md dead-skill annotations added (gd-002 applied)
- bootstrap.ps1 Windows-1252 encoding fix validated (bv-002 PASS)
- Self-audit sa-001 3 blockers all fixed in v0.1.1
- Two-tenant proof (alpacasibiza + exampleVineyard) round-tripping `getProviders()`
- OWNER_INPUT_NEEDED.md comprehensive (3 conversation buckets documented)
- CANT_BE_DONE.md: 12 alpaca limits + 8 framework limits captured with re-check triggers
- READY_FOR_GO.md one-sheet with D1-D10 decisions + C1-C12 content slots + E1-E9 external work
- DROP_IN_GUIDE.md for owner paste-ins
- Legal placeholder banners on privacy/terms/cookies (dev-only, disappear in prod)

---

## Summary Counts

| Quadrant | Count | Unblocked (no owner/external dep) |
|----------|-------|-----------------------------------|
| Q1 Urgent+Important | 7 | 4 (items 3,4,5,6 — all framework security) |
| Q2 Important | 11 | 3 (items 15,17,18) |
| Q3 Urgent | 5 | 4 (items 19,20,21,23) |
| Q4 Neither | 4 | 1 (item 27) |
| **Total** | **27** | **12** |

---

## Philosophy-Prompting Catalog Status (001-017)

No new recurrences logged since the overnight session. Entries 002, 006, 007, 008 previously FAILED their test prompts (WAKEUP notes). Entries 016 (verify-fan-out-outputs) and 017 (check-sibling-projects) were born from live failures caught during the session. Entry 015 (kit-skills-not-vibes) has 2 recorded recurrences. No entries require migration to CANT_BE_DONE.md — all are behavioral guardrails, not hard limits.
