# Execution Plan — Alpacas Ibiza Redesign

**Generated:** 2026-05-26
**Supersedes (partially):** REALITY_CHECK.md — see "Corrections" below.
**Pairs with:** [OWNER_INPUT_NEEDED.md](OWNER_INPUT_NEEDED.md), [INTEGRATION_STATUS_2026-04-20.md](INTEGRATION_STATUS_2026-04-20.md), [PRACTICES.md](PRACTICES.md).

This plan covers everything that can be done **without owner input** + **without new plugins**, plus what's blocked on the existing OWNER_INPUT_NEEDED list. Items are sorted by dependency: do A before B.

---

## Corrections to REALITY_CHECK.md

I made claims without reading existing project docs first. Striking these:

| Claim in REALITY_CHECK | Reality | Where I should have looked |
|---|---|---|
| "Fake e-commerce — no Stripe, no Supabase" | **Intentional.** Shop routes through FareHarbor item IDs via `lib/config.ts:48-57`. Owner needs to provide IDs (already in OWNER_INPUT_NEEDED.md ⚠️ section). | [INTEGRATION_STATUS_2026-04-20.md:16](INTEGRATION_STATUS_2026-04-20.md) — "E-commerce: ⚪ N/A by design" |
| "Docs say SendGrid; code uses Resend — fix docs" | INTEGRATION_STATUS already documents Resend as LIVE. Only README/INTEGRATION_CHECKLIST are stale. | INTEGRATION_STATUS line 7 |
| "Adopt-a-Paca missing — needs route" | Already a 🟢 optional in OWNER_INPUT_NEEDED.md with the full Yes/No question set + €15/mo suggested. | OWNER_INPUT_NEEDED.md line 154 |
| "Press / Media page missing — fix" | Already 🟢 optional ("Featured in" / press logos) in OWNER_INPUT_NEEDED.md line 218. | OWNER_INPUT_NEEDED.md |
| "Trust signal: hardcoded `reviewCount: 127`" | Confirmed real, structured-data.ts:66-71. Stands. | n/a |
| "GTM `GTM-KR3CGLS6`" | That's the **secondary** FareHarbor container. Primary is `GTM-NJRGZPGS`. I named only one. | INTEGRATION_STATUS lines 9-10 |

**Confirmed standing gaps** (not previously documented anywhere):

1. Tour price split: `translations/en.json:169` says €30, `lib/structured-data.ts:94` says €20. No central constant.
2. Home conversion order (`app/[locale]/page.tsx:19-48`: Tour → Woven → Commission → Alcaca) contradicts README "Primary Conversion Goals" priority order.
3. Duplicate non-localized routes (`app/shop/*`, `app/about/page.tsx`, `app/contact/page.tsx`) — unreachable due to middleware redirect, dead code.
4. Individual alpaca profiles (14 named animals on live `/onze-alpacas`) — not in code, not in OWNER_INPUT_NEEDED.md.
5. 6 configured locales (`en/de/it/es/nl/fr`) with `en` default — diverges from Dutch-first live site; OWNER_INPUT_NEEDED.md doesn't address language strategy.

---

## Track A — Code-only fixes (no owner input, no plugins)

These can ship today.

### A1. Single source of truth for tour price ⚠️
**Files:** [lib/config.ts](lib/config.ts), [lib/structured-data.ts](lib/structured-data.ts), [translations/*.json](translations/)

- Add `TOUR_BASE_PRICE_EUR = 30` to `lib/config.ts`.
- Replace hardcoded `'20'` in `lib/structured-data.ts:94` with import from config.
- Translation strings stay (they're locale-specific copy) but verify they reference 30, not other numbers.

**Acceptance:** grep for `'20'`, `"20"`, `€20`, `30` returns no contradictions. Schema.org validator on a deployed page shows 30.

### A2. Reconcile home conversion order with README
**Files:** [app/[locale]/page.tsx](app/[locale]/page.tsx), [README.md](README.md)

Two options — pick one:
- **Option 1 (recommended):** update README "Primary Conversion Goals" to match home render order (Tour → Woven → Commission → Alcaca). The implementation already de-emphasizes Alcaca and that matches what the live site does (no Alcaca e-commerce at all).
- **Option 2:** reorder `pathOptions` in `app/[locale]/page.tsx:19-48` to match README priority.

**Acceptance:** README priority order = home render order. Visual diff of `/en` matches new README.

### A3. Delete dead non-localized routes
**Files to remove:**
- `app/shop/page.tsx`, `app/shop/woven/page.tsx`, `app/shop/commission/page.tsx`, `app/shop/alcaca/page.tsx`
- `app/about/page.tsx`, `app/contact/page.tsx`

`middleware.ts:60-66` redirects every unprefixed path to `/{locale}/...` so these files never render. They also contain stale hardcoded prices (€45/€180/€95 etc.) that diverge from the localized versions.

**Acceptance:** `npm run build` succeeds. `curl localhost:3000/shop` redirects to `/en/shop`. No build warnings about unused pages.

### A4. Reconcile the three integration docs (corrected per VERIFICATION_RESULTS.md)
**Files:** [README.md](README.md), [INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md), [INTEGRATION_STATUS_2026-04-20.md](INTEGRATION_STATUS_2026-04-20.md)

**Correction:** my earlier claim that INTEGRATION_STATUS is "newer source of truth" was wrong — it's actually the OLDEST file of the three (mtime 2026-04-20 vs README 2026-10-02 vs CHECKLIST 2026-06-03). Newer mtime ≠ currency though: README and CHECKLIST still describe email as "SendGrid (to set up)" while code uses Resend; INTEGRATION_STATUS correctly documents Resend as LIVE.

The actual contradiction is: **the dated STATUS file accurately describes the code; the newer-mtime docs describe a roadmap that the code has already moved past**.

Action:
- Don't promote any one doc as "source of truth" — instead, add a "Current state" section to README that re-states what INTEGRATION_STATUS says, with the date.
- Mark `INTEGRATION_CHECKLIST.md` Phases 4/5 as ✅ COMPLETE (GA4, email).
- Leave INTEGRATION_STATUS alone — it's accurate.

### A5. Add individual alpaca profile route (data-only first)
**Files:** new `app/[locale]/alpacas/page.tsx`, `lib/data/alpacas.ts`

Mirror live `/onze-alpacas`: 14 named alpacas. Build the data file with just names from the live site. Add `{ id, name }` shape — leave bio/photo as `null` until owner provides (UNMAPPED, see PRACTICES rule #5).

This unblocks a route that can render the cards, then owner adds bios/photos via standard content workflow.

**Acceptance:** route renders 14 cards with names; cards visibly say "Bio coming soon" where UNMAPPED.

### A6. Replace hardcoded `reviewCount: '127'` in structured data
**File:** [lib/structured-data.ts:66-71](lib/structured-data.ts)

Either:
- Remove `aggregateRating` entirely until Google Reviews API is wired ([components/google-reviews-badge.tsx](components/google-reviews-badge.tsx) is scaffolded for this — OWNER_INPUT_NEEDED.md line 114 covers the API key path).
- Or, more conservatively, lower the number to match actual count on Google Business Profile (which we can't see without the API).

**Recommendation:** remove. Hardcoded 127 with `ratingValue: 5` is a structured-data integrity risk if Google ever cross-checks.

**Acceptance:** Rich Results test shows `LocalBusiness` schema without `aggregateRating` (or with live data once Places API key is in).

---

## Track B — Owner-input items (already in OWNER_INPUT_NEEDED.md)

No new work for me — the existing doc covers them. Quick map:

| OWNER_INPUT priority | Items | Notes |
|---|---|---|
| ⚠️ Must-confirm | Cancellation policy, tour pricing per type, phone number, real photos, privacy/terms/cookies, CIF/Spanish legal | All blocking launch |
| 🟡 Within a month | FareHarbor API access, per-tour item IDs, gift-card item, GA4 owner access, Google Reviews API key, Vercel deploy, Resend domain, Turnstile keys, cron service | All "ready in code, awaiting credentials" |
| 🟢 Optional | Adopt-an-Alpaca, photography package, online masterclass, corporate packages, school trips, winter workshops, loyalty, referral, UGC, video hero, press logos, holiday push | Each gets a Yes/No + question set |

**My move:** when owner answers any 🟢 item with "Yes," translate that single answer into a Track A code change. Don't ask for owner input on items already in the file — link to the existing question instead.

---

## Track C — Add to OWNER_INPUT_NEEDED.md (gaps I found that aren't covered)

Edits to existing doc, not new files:

### C1. Language strategy
Add under ⚠️ launch-blocker:

> ### Language strategy
> Currently 6 locales configured (`en/de/it/es/nl/fr`) with `en` default. Live site is Dutch-first.
> - Which languages are real audiences? (Belgian/Dutch tourists are confirmed primary based on Belgian founders + Belgian press coverage.)
> - Drop Italian and French if not justified by visitor data?
> - Default locale: `en` (international SEO) or `nl` (matches live site / actual audience)?
> - English flag — currently 🇬🇧, may be wrong for an Ibiza/Spanish business. Use 🇺🇸/🇬🇧 or no flag.

### C2. The 14 named alpacas
Add under ⚠️ must-confirm:

> ### Individual alpaca profiles
> Live `/onze-alpacas` lists 14 alpacas: Barbarella, Avalon, Bardot, Chet, Dusty, Fela, Fonda, Lewis, Marron, Mojo, Moloko, Nelson, Suki, Toots.
> - Is this list still current? (Births / deaths / new arrivals since the live site was last updated?)
> - One short bio per alpaca (age, personality, favorite snack — keep it warm and human)
> - One photo per alpaca (head-and-shoulders portrait, ideally same crop ratio across all)

### C3. "Wishfulfilling Weaving" — separate brand or sub-brand?
Add under 🟡 within-a-month:

> ### Wishfulfilling Weaving positioning
> Live site treats Wishfulfilling Weaving as a co-equal brand ("Es Currals Alpacas Ibiza & Wishfulfilling Weaving") with its own Instagram (@wishfulfillingweaving). Redesign treats it as a section.
> - Should `/weaving` be its own top-level route with full brand styling, or stay folded into `/shop/woven`?
> - Separate domain or always under alpacasibiza.com?

---

## Track D — Verify reality before next session

Run these checks before claiming new gaps:

1. **Re-crawl live site** for changes since last scan (REALITY_CHECK_PROMPTS.md Agent 1).
2. **Check OWNER_INPUT_NEEDED.md** for items the owner has now answered (Track B → Track A conversion).
3. **Diff INTEGRATION_STATUS** against current `package.json` deps + env vars actually present.
4. **Read [PRACTICES.md](PRACTICES.md) pre-flight checks** before assuming anything is missing.

---

## Order of execution

If picking just one track to start, do **Track A** first — pure code, no blockers, removes incorrect public-facing data (€20/€30, reviewCount 127) and dead routes.

After Track A: ask the owner the ⚠️ section of OWNER_INPUT_NEEDED.md in a single 20-minute call (the doc already groups it that way).

Track C is doc edits — 15 minutes, do alongside A.

Track D is the failsafe loop — always.
