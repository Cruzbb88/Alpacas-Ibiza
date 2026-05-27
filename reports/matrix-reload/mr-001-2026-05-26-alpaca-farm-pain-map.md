# Matrix Reload — Pain Map
**Project:** Alpacas Ibiza (alpaca-farm-redesign)
**Date:** 2026-05-26
**Agent:** Sonnet (L1 scan only)

---

## Verdict

**INCREMENTAL SUFFICIENT — no reload zone.**

The codebase is a fresh redesign (~45 commits, actively evolving). No TODO/FIXME/HACK clusters in source. No file exceeds 400 lines in production source. Cyclomatic complexity is low throughout. The pain signals that exist are pre-launch content and config gaps, not structural rot.

---

## Pain Hotspot Table

| # | File / Area | Signal Type | Severity | Detail |
|---|---|---|---|---|
| 1 | `lib/booking-schedule-store.ts` | Architecture time-bomb | Medium | In-memory store loses all scheduled-email state on every cold start / redeploy. Explicitly documented as MVP tradeoff (ADR 001), but no upgrade has been started. At scale or with frequent redeploys, stale reminder/review emails will fire. Needs Vercel KV or equivalent before meaningful booking volume. |
| 2 | `OWNER_INPUT_NEEDED.md` — 9+ launch blockers open | Content / config gap | High (launch risk) | Cancellation policy (displayed as "24h" but unverified), tour prices per type (cards show no price anchor), 14 alpaca bios/photos all `null`, placeholder Privacy Policy + T&C (GDPR risk), Spanish CIF/legal info missing, admin password defaults to `admin`/`password`. None of these are code problems — they are pre-launch owner tasks. No reload required; owner input required. |
| 3 | `app/layout.tsx` — GTM container ambiguity | Docs/code drift | Low | Code loads only `GTM-KR3CGLS6` (FareHarbor's container). `PLAN.md` and `INTEGRATION_STATUS` reference a primary site container `GTM-NJRGZPGS` that does not exist in code. The open question is documented in `OWNER_INPUT_NEEDED.md` but unresolved. Risk: analytics attribution gap if a site-owned GTM container was intended. |

---

## Supporting Findings

- **Zero TODO/FIXME/HACK** in `app/`, `components/`, or `lib/` source files (only in `.claude/skills/` templates which are irrelevant).
- **Highest-churn file:** `app/layout.tsx` (12 touches in 90 days) — explains the GA4 revert/re-add cycle visible in git log. The churn was deliberate iteration, not instability; the file is now clean.
- **`tours/page.tsx` at 367 lines** is the largest source file. It is a data-assembly page (translation lookups + JSX composition) with only 2 conditional branches — not complex.
- **Price constant resolved:** `TOUR_BASE_PRICE_EUR = 30` in `lib/config.ts:10`; `structured-data.ts` imports it correctly. The PLAN.md flag about a `€20`/`€30` split is already fixed.
- **Dead routes already gone:** `app/shop/`, `app/about/`, `app/contact/` non-localized dirs do not exist on disk — PLAN.md A3 was already executed.
- **Failsafe map is intact and well-documented** in `CLAUDE.md`. All security-critical paths (webhook auth, Turnstile, timing-safe compare, XSS escape, fetch timeout) have named file:line references.

---

## Recommendation

Ship the incremental track from `PLAN.md`. The three concrete code actions remaining are:

1. **Hotspot 1** — Swap `MemoryStore` for Vercel KV before go-live (single-file change, interface already abstracted in `BookingScheduleStore`).
2. **Hotspot 2** — Owner input sessions (three conversations listed at bottom of `OWNER_INPUT_NEEDED.md`).
3. **Hotspot 3** — Decide GTM strategy (one-liner in `app/layout.tsx` once owner confirms).

No component rewrites, no architecture changes, no reload zone.
