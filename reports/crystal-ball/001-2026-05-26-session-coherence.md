---
report_type: crystal-ball-session-coherence
project: alpaca-farm-redesign
date: 2026-05-26
slug: session-coherence
auditor: claude-sonnet-4-6 (degraded local-file mode, hook 005 blocks Cortex, L3 skipped)
cortex_available: false
l3_skipped: true
adrs_read: [001, 002, 003, 004, 005, 006, 007, 008, 009]
rule_11_applied: true
prior_runs: [cb-001-2026-05-26-alpaca-redesign.md, cb-002-2026-05-26-post-session.md]
---

# Crystal Ball — Session Coherence Audit (2026-05-26)

## Methodology + degraded-mode note
Local-file crystal-ball (PRACTICES Rule 11): read all 9 ADRs (`docs/adr/001-009`), CLAUDE.md, PRACTICES.md, CANT_BE_DONE.md, philosophy catalog 005/007/008, the two prior cb reports, and every code site touched this session before predicting. L3 Decision Pattern Predictor is **skipped** — hook 005 (`~/.claude/hooks/005-no-cortex-saves.py`) blocks `mcp__omni-cortex__*`, so statistical revision-rate grounding is unavailable; predictions below are heuristic with stated leading indicators rather than confidence percentages.

## Load-bearing decisions this session

| # | Decision | Encoded at | ADR / failsafe / PRACTICES coverage |
|---|---|---|---|
| 1 | Hook 005 enforces no-Cortex policy | `~/.claude/hooks/005-no-cortex-saves.py`; catalog `005-no-cortex-saves.md:42-44` | catalog only — **no project ADR**; CANT_BE_DONE.md:9-13 documents the consequence |
| 2 | Catalog 007 (cross-doc quote verify) — pending; recurrence logged 2026-05-26 | `catalog/007-verify-doc-cross-quotes.md:74` | covered by PRACTICES.md Rule 11; no hook |
| 3 | Catalog 008 (re-read after cross-tool mod) — pending; FAILED on parent same session | `catalog/008-re-read-after-cross-tool-modifications.md:71` | advisory only; broke `lib/config.ts` build |
| 4 | Fake prices removed (V3/V4) — `aggregateRating` optional, no hardcoded reviewCount/€45/€30 tiers | `lib/structured-data.ts:55-101` (optional `reviewData` block, lines 91-100) | covered by PRACTICES Rule 5 ("never invent data") + ADR-004 (no-ecommerce framing); failsafe map row absent |
| 5 | JSON-LD `image` keys omitted when asset absent (V8) | `lib/structured-data.ts:38, 65, 114` ("image intentionally omitted" comments) | not in any ADR; convention-only |
| 6 | Security headers + CSP Report-Only (IB1) | `next.config.mjs:12-63` | **no ADR**; CLAUDE.md failsafe map row missing |
| 7 | In-memory rate limiter (IB3) wired into contact/commission/newsletter | `lib/rate-limit.ts:25-72`; `app/api/{contact,commission,newsletter}/route.ts:20-23` | **no ADR**; ADR-001 precedents the "in-memory, upgrade when volume justifies" pattern but rate-limit.ts:5 references ADR 001 in a comment without an ADR-010 of its own |
| 8 | Env-var rename `FAREHARBOR_ITEM_*` → `FAREHARBOR_ITEM_TOUR_*` for the four tour types | `lib/config.ts:65-68`; `.env.local.example:22-25`; `lib/validate-env.ts:102-107` | not in any ADR; CLAUDE.md Tier-2 list mentions `FAREHARBOR_ITEM_*` generically (line 39) — does not enumerate the four new TOUR names |
| 9 | `lib/webhook-router.ts` extracted from route for testability | `lib/webhook-router.ts:1-121`; `app/api/fareharbor-webhook/route.ts:13-17` | not in ADR-001 or ADR-003 (the two webhook-adjacent ADRs); pure refactor — no behavior change but no ADR amendment either |
| 10 | `getFareHarborTourUrl()` helper added; per-tour fallback to base URL when item ID unset | `lib/config.ts:104-117` | covered by Tier-2 fail-quiet pattern (CLAUDE.md line 39); failsafe map row absent for "per-tour Book button inert when env var unset" |

## ADR cross-check (Rule 11 Confirm step)

- **Decision 7 (rate limiter)** — ADR-001 (`docs/adr/001-resend-scheduled-sends.md:39-41`) accepts the in-memory pattern explicitly for `bookingScheduleStore`. `lib/rate-limit.ts:5` borrows that pattern verbatim ("upgrade to Redis/Vercel KV when volume justifies, see ADR 001"). **No contradiction**, but the rate limiter is a second, independent in-memory store and inherits ADR-001's cold-start volatility without its own ADR. **Propose ADR-010: "In-memory rate limiter — accepted volatility, upgrade trigger."**
- **Decision 6 (CSP Report-Only)** vs **ADR-006** (`docs/adr/006-ga4-before-interactive-ssr.md:23`): ADR-006 mandates `beforeInteractive` script injection for GA4/GTM, which requires `'unsafe-inline'` in `script-src`. `next.config.mjs:17` does allow it — **no contradiction today**. But `next.config.mjs:13-14` says "Future ticket: migrate to nonce-based enforcing CSP." A nonce-based CSP is **architecturally incompatible** with `beforeInteractive` unless Next.js injects the nonce into the auto-generated `<script>` tags. **Propose ADR-011: "CSP Report-Only with `unsafe-inline`/`unsafe-eval` — accepted because of ADR-006; nonce migration requires re-litigating ADR-006."**
- **Decision 4 (no aggregateRating without data)** is fully consistent with PRACTICES Rule 5 and ADR-004 (no-ecommerce email-only). No conflict.
- **Decision 8 (env rename)** — neither ADR mentions it. CLAUDE.md:39 ("`FAREHARBOR_ITEM_*` IDs → per-tour Book buttons inert") technically still matches because the new names share the prefix, but the failsafe map line is now imprecise. Minor doc debt, not a contradiction.
- **Decision 9 (webhook-router extraction)** — ADR-003 (`docs/adr/003-webhook-secret-fail-closed.md:22-24`) cites `route.ts:66-72` for the 503 fail-closed. After extraction the secret check is still in the route (good), but ADR-003's line cite is now stale if the route reshuffled. Re-verify line numbers in ADR-003 against `app/api/fareharbor-webhook/route.ts` current state.

## Downstream predictions (one line each — failure mode + when + leading indicator)

| Change | First failure mode | When | Leading indicator |
|---|---|---|---|
| In-memory rate limiter (IB3) | Vercel scales to N>1 lambda instances → per-instance counter → effective limit becomes N×5/5min instead of 5/5min | First traffic spike or a cron-driven warm-up that splits across regions | `5xx` rate stays flat while spam-form rate climbs in Resend dashboard |
| CSP Report-Only with `unsafe-inline` | Future-Claude flips Report-Only → enforcing without adding nonces; GA4/GTM/Turnstile inline blocks all break | A "tighten CSP" ticket lands without re-reading ADR-006 | Browser console: `Refused to execute inline script because it violates...` on first preview deploy after the change |
| CSP `connect-src` allowlist | GTM container fetch to `https://www.googletagmanager.com` rejected once CSP enforced — only `frame-src` lists it (`next.config.mjs:22`); `connect-src` line 21 omits googletagmanager.com | The moment CSP moves to enforcing | GA4 events stop reaching `google-analytics.com`; GTM Preview shows zero hits |
| `FAREHARBOR_ITEM_TOUR_*` rename | A new contributor (or future-Claude) sets the OLD names (`FAREHARBOR_ITEM_MEET_HERD`) reading CLAUDE.md:39's generic prefix; `validate-env.ts:104-107` only checks the NEW names → silent fail-quiet (per Tier-2), every Book button stays inert in prod | First post-launch owner-driven env-var update | Owner reports "Book button doesn't open the right tour"; `validate-env` Tier-2 warning visible in server logs but easy to miss |
| `webhook-router.ts` extraction | Pure-function refactor — extraction itself is low risk; the risk is ADR-003's line cites (`route.ts:66-72`) drifting | Next refactor of the route file | `grep FAREHARBOR_WEBHOOK_SECRET app/api/fareharbor-webhook/route.ts` returns a line number ≠ 66-72 with no ADR-003 amendment |
| JSON-LD `image` omitted (V8) | Owner uploads `/images/logo.webp` to `public/` but no code change reactivates the `logo` / `image` keys → silent "still no image" in structured data | First owner asset drop | Google Search Console "missing image" warnings stay even after assets shipped; grep for "intentionally omitted" comments still matches |
| Fake-price removal (V3/V4) | A future copywriter re-introduces a hardcoded `€45` in a translation JSON; Rule 6 (single source of truth) only protects `TOUR_BASE_PRICE_EUR` | First translation update pass | `grep -r '€[0-9]' translations/` finds new literals not sourced from `lib/config.ts` |
| Catalog 005 (hook-enforced) | Hook blocks a kit-skill subagent mid-run; subagent reports "Cortex call failed" and either retries (loop) or falls through to no-op — neither is what the user wants | Any new kit skill installed | `~/.claude/hooks/005-no-cortex-saves.py` exit-1 in transcript without a fallback path being documented in the calling skill |
| Catalog 007/008 FAILED on parent | Same parent-context drop recurs — next session-reminder of "file modified by linter" gets treated as informational | Within the next two multi-edit sessions | A second `pnpm build` failure citing "X defined multiple times" |

## Decision debt added this session

New cross-dependencies that didn't exist at session start:

1. **CSP Report-Only ↔ ADR-006 `beforeInteractive`.** Migrating to enforcing CSP now requires either keeping `'unsafe-inline'` (defeats the point) OR re-litigating ADR-006. Two STOP items, one ticket.
2. **Rate limiter ↔ ADR-001 in-memory pattern.** Volume trigger that retires ADR-001 (`bookingScheduleStore` → KV/Redis) now also has to retire `lib/rate-limit.ts`. Single migration covers both — but neither side knows about the other except via the comment at `lib/rate-limit.ts:5`. **Decision debt: write ADR-010 that links the two stores explicitly.**
3. **Per-tour env rename ↔ `validate-env.ts` allowlist.** Adding a 5th tour (`FAREHARBOR_ITEM_TOUR_YOGA`?) now requires three edits in lockstep: `config.ts:65-68`, `validate-env.ts:104-107`, `.env.local.example:22-25`. Currently no test enforces the lockstep.
4. **`webhook-router.ts` ↔ ADR-003 line cites.** Any future refactor of `app/api/fareharbor-webhook/route.ts` must check ADR-003:22 still points at the 503 block.
5. **CSP `frame-src` allowlist ↔ FareHarbor + Turnstile.** Adding a new third-party (e.g., a chat widget, a new analytics tool) silently fails until added to BOTH `script-src` AND `frame-src` AND `connect-src`. No single source of truth for "approved third parties."

## Failsafe map gaps (CLAUDE.md "In-code failsafe map")

The failsafe map currently lists 14 rows. This session added load-bearing failsafes/invariants that are **missing**:

- ❌ Rate limiter (`lib/rate-limit.ts` — 5/5min sliding window on contact/commission/newsletter; in-memory, lost on cold start)
- ❌ Security headers (HSTS 2yr, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy, CSP Report-Only) — `next.config.mjs:28-62`
- ❌ Per-tour env var fallback to `FAREHARBOR_BOOKING_URL` when ID unset (`lib/config.ts:104-117`)
- ❌ Catalog 005 hook (claude-side enforcement, not in-code, but worth a note in PRACTICES)

CLAUDE.md:39 mentions `FAREHARBOR_ITEM_*` generically — should be amended to list the four `FAREHARBOR_ITEM_TOUR_*` names explicitly to match `validate-env.ts:104-107`.

## What I'd predict will be the next regression

**Most-likely single failure: someone tightens the CSP from Report-Only to enforcing (because the `next.config.mjs:13-14` comment invites it) without removing `'unsafe-inline'` first OR without re-reading ADR-006.** Result: GA4 + GTM + Turnstile widget all break simultaneously on the first preview deploy after the change. The CSP comment is a foot-gun precisely because it sounds like a follow-up cleanup, not an architectural change.

**Test that would catch it early:** a build-time test (or a CI playwright check on preview) that asserts both:
1. `Content-Security-Policy-Report-Only` header exists (not `Content-Security-Policy`).
2. `gtag('event', ...)` and Turnstile `cf-turnstile` render without console errors on `/en`.

Failing either = STOP and re-litigate ADR-006 first.

## STOP — things I can't predict without owner input or production data

1. **Whether ADR-006's `beforeInteractive` is still required** in current Next.js (15.x) — Google tag checker may have improved since ADR-006's 2026-03-09 date. Per CANT_BE_DONE.md:15-19, only a Vercel preview + GTM Preview-mode test can confirm. Until then, CSP nonce migration is blocked.
2. **Rate-limiter scaling break-point.** Without Vercel-region traffic stats, I can't predict at what RPS the per-instance counter starts mattering. ADR-001 has the same blind spot for `bookingScheduleStore`.
3. **Whether `FAREHARBOR_ITEM_TOUR_*` IDs actually exist in the owner's FareHarbor admin.** Per CANT_BE_DONE.md:21-25 — FareHarbor API access blocked.
4. **Whether the CSP allowlist is complete.** Cannot enumerate all third-party fetches without a live page-source view (CANT_BE_DONE.md:15-19); WebFetch cannot resolve runtime XHRs.
5. **Catalog 007/008 enforcement.** Both are `pending` (advisory only). Cannot predict recurrence rate without Cortex history (catalog 005 hook blocks it).
