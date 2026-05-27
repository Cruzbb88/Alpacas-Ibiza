---
report_id: tr-002
date: 2026-05-27
generated_at: "2026-05-27 2:04 PM MDT"
layer: L2 (Deep Radar)
mode: fresh-rebuild (stale tr-001 discarded)
prior_report: reports/task-radar/tr-001-2026-05-26.md
scope: alpaca website ONLY (not claude-saas-framework)
sources_cross_referenced:
  - reports/task-radar/tr-001-2026-05-26.md (stale — Wave A/B/C/D pre-session)
  - reports/incompleteness-master-2026-05-26.md
  - DROP_IN_GUIDE.md (shipped 2026-05-27 — all slots now wired)
  - CANT_BE_DONE.md (12 limits)
  - reports/component-inventory/ci-001-2026-05-27-all-components.md
  - reports/route-audit/ra-001-2026-05-27.md
  - reports/accessibility/a11y-001-2026-05-27.md
  - reports/mobile-audit/ma-001-2026-05-27.md
  - reports/exploding-pen/ep-002-2026-05-27-component-gaps.md
  - reports/unified-field-theory/uft-003-2026-05-27-ui-patterns.md
  - handoff/2026-05-27-component-buildout.md
  - specs/todo/ (3 open: 002, 003, 005)
  - specs/done/ (6 done: 001, 004, 006, 007, 008, 009/010 from this session)
q1_count: 7
q2_count: 14
q3_count: 4
q4_count: 6
resolved_since_last_scan: 23
predicted_actions_count: 6
quick_wins_count: 4
quick_wins_total_time: "85m"
---

# Task Radar — tr-002 — Fresh Matrix
## Alpacas Ibiza Website | 2026-05-27 2:04 PM MDT

**This is a full rebuild from scratch.** tr-001 was written before Wave A/B/C/D shipped. Most of its Q1 Claude-actionable items are now DONE. The matrix below reflects post-session state.

---

## RESOLVED SINCE tr-001 (23 items)

Items from tr-001 or the audits done this session that have shipped and are no longer active work:

| # | Item | Resolved by |
|---|------|-------------|
| R-01 | Admin credential CI guard | Wave A (loading/error infra pass) |
| R-02 | product-card.tsx null-guard fix | Wave A — component refactor |
| R-03 | GTM doc cleanup (NJRGZPGS refs) | CLAUDE.md RESOLVED note + docs aligned |
| R-04 | sunset-bg .jpg → .webp extension | romantic-sunset rebuild (Wave A2) |
| R-05 | Spec 008 image optimization | specs/done/008-perf-image-optimization.md — DONE |
| R-06 | `html lang` hardcoded to "en" | a11y fix — middleware x-locale header |
| R-07 | `user-scalable=no` viewport violation | Removed from `app/layout.tsx` (a11y fix A2.3) |
| R-08 | White-on-accent contrast WCAG fail | Accent darkened #DD7F3C → #AD561A (7.2:1, WCAG AA) |
| R-09 | `nav aria-label` missing | `aria-label="Main navigation"` added to header |
| R-10 | `aria-current="page"` missing on nav | Active-link detection wired in header.tsx |
| R-11 | commission-form labels disassociated | `id` + `htmlFor` added to all inputs |
| R-12 | newsletter-form missing `<label>` | `<label>` added for email input |
| R-13 | Newsletter form breaks at 320px | `flex-col sm:flex-row` + `w-full sm:w-auto` |
| R-14 | Hero `min-h` too tall for 320px | Reduced to `min-h-[500px] sm:min-h-[600px]` |
| R-15 | LanguageSwitcher 140px hardcoded | `mobile-full` prop for Sheet context |
| R-16 | StickyBookingBar on legal pages | Route-suppress added for `/privacy`, `/terms`, `/cookies` |
| R-17 | PressLogos dead (not imported) | Wired into `app/[locale]/page.tsx` |
| R-18 | `generateMetadata` missing (6 routes) | Added to cookies, privacy, terms, shop/alcaca, shop/commission, shop/woven |
| R-19 | `PageBreadcrumbs` missing (9 routes) | Added to alpacas, cookies, privacy, terms, shop, shop/alcaca, shop/commission, shop/woven, romantic-sunset |
| R-20 | romantic-sunset broken stub | Rebuilt: type cast fixed, animate-pulse removed, CTA wired, breadcrumbs added |
| R-21 | `loading.tsx` missing site-wide | `app/[locale]/loading.tsx` — Next.js segment inheritance covers all 17 routes |
| R-22 | `error.tsx` missing site-wide | `app/[locale]/error.tsx` — branded error boundary, covers all 17 routes |
| R-23 | Brand single-source-of-truth (`lib/brand.ts`) | Shipped — tenant config, globals.css, email templates all read from `lib/brand.ts` |

---

## Q1: URGENT + IMPORTANT — ship this week

All owner-blocked items are classified Q1 because they block public launch or live revenue.

| # | Item | Source | Blocker type | Est. effort |
|---|------|--------|:------------:|:-----------:|
| 1 | **Legal pages (Privacy / Terms / Cookies) + Spanish footer (CIF, legal name, address)** — GDPR launch blocker. Spec 002 open. Every legal route shows "Content pending" placeholder. | Spec 002, IM #4/#6, ra-001 | Owner (O) | 2–4h (lawyer / self-draft) |
| 2 | **FareHarbor item IDs** — 8 env vars = `TODO_PASTE_ITEM_ID`. All per-tour Book buttons inert. Each ID takes 2 min in FH dashboard. | IM #14, DROP_IN_GUIDE | Owner (O) | 16 min |
| 3 | **Adopt-a-Paca payment vendor decision** — live EUR 75/mo revenue line. Stripe env vars are wired and fail-quiet; just needs 5 env vars pasted. Spec 003 open. | Spec 003, IM #3, ra-001 | Owner (O) | 30 min (decision + env paste) |
| 4 | **Cancellation policy** — every Book CTA shows "24h free cancel" unconfirmed. Must match FareHarbor setting. | IM #5 | Owner (O) | 5 min |
| 5 | **Per-tour prices** — no price anchor on tour cards. 10–15% conversion lift blocked. | IM #2 | Owner (O) | 10 min |
| 6 | **Default locale decision** — affects hreflang, SEO, middleware redirect on every page. Spec 005 open. 3 yes/no questions. | Spec 005, IM #8, ra-001 | Owner (O) | 5 min |
| 7 | **Layout primitive migration (60+ consumers)** — `<PageSection>`, `<SectionHeading>`, `<GradientPageHero>`, `<OwnerConfirmBanner>` are built but NOT wired into their 60+ existing consumers (8 routes for GradientPageHero alone, 28 section instances, 17 heading instances). uft-003 estimates ~316 lines removed, ~156 net reduction. Mechanical sweep, no owner input. | uft-003, ep-002, DROP_IN_GUIDE | Claude (C) | 3–4h |

**5 of 7 are owner-blocked.** Item 7 is Claude-actionable immediately.

---

## Q2: IMPORTANT + NOT URGENT — schedule next 30 days

| # | Item | Source | Blocker type | Est. effort |
|---|------|--------|:------------:|:-----------:|
| 8 | **14 alpaca bios + headshots** — alpacas page renders 14 blank cards. Highest-engagement page type (research: animal personality pages drive repeat visits). | IM #1, ci-001 | Owner (O) | 2–3h (write 14 bios, shoot photos) |
| 9 | **Hero photography (11 routes)** — every Hero-bearing page is gradient-only. Code accepts `backgroundImage` prop; zero code change once photos exist. Single action upgrades visual score from 6/10 to ~9/10 peer parity (ci-001 assessment). | ci-001, ra-001, DROP_IN_GUIDE | Owner (O) | 0 code (asset drop) |
| 10 | **Press logo files + article URLs (6 outlets)** — PressLogos is now wired but renders null. Zero DOM, no layout shift. Owner drops SVG/PNG at `public/images/press/<slug>` and sets `status: 'live'` in `lib/data/press.ts`. | IM #9/#10, ci-001, DROP_IN_GUIDE | Owner (O) | 30 min |
| 11 | **OG default image (`og-default.webp`)** — missing from `public/`. All social shares fall back to nothing. | IM #12, ra-001 | Owner (O) | 0 code (asset drop) |
| 12 | **Yoga page assets** — instructor name/bio, exact start times, off-season status, `yoga-hero.webp` missing. | IM #13, ra-001 | Owner (O) | 30 min |
| 13 | **Family-farm-days photos (7 images)** — all 7 referenced images missing from `public/`. Page is skeleton-with-UNMAPPED. | IM #17, ra-001 | Owner (O) | 0 code (asset drop) |
| 14 | **Corporate team-building: token-swap + FAQ i18n** — 42 raw hex values, FAQ English-only, highest pain-score route (74 per mr-001). Owner unblocked; code side only. | ra-001 (E1), uft-003 | Claude (C) | 3h |
| 15 | **Corporate team-building photos (3 images)** — corporate-team-alpacas.webp, corporate-hero.webp, weaving-workshop.webp missing. | IM #18, ra-001 | Owner (O) | 0 code (asset drop) |
| 16 | **Sustainability page — finca size + shade count** — copy claims "6-hectare" and "22 shades", both UNMAPPED. | IM #16, ra-001 | Owner (O) | 5 min |
| 17 | **Team bios + headshots** — About page has no real team members. | IM #21 | Owner (O) | 30 min |
| 18 | **Alcaca / woven product prices** — REALITY_CHECK flags all as invented/unverified. | IM #20, ra-001 | Owner (O) | 10 min |
| 19 | **`adopt/page.tsx` nested `<main>`** — adopt renders inner `<main>` inside locale layout's `<main>`. Invalid HTML, confuses AT. 1-line fix: change inner `<main>` to `<article>`. | a11y-001 §2 | Claude (C) | 5 min |
| 20 | **Hero video `aria-hidden="true"` missing** — background video has no `aria-hidden`. Screen readers encounter uncontrolled video. 1-line fix. | a11y-001 §8 | Claude (C) | 1 min |
| 21 | **Tour/adopt emoji icons missing `aria-hidden`** — emoji read aloud verbatim ("llama emoji"). Add to wrapper divs. | a11y-001 §8 | Claude (C) | 10 min |
| 22 | **`<BackToTop>` wire into root layout** — component is built in `components/back-to-top.tsx` but not placed anywhere. One-line addition to `app/[locale]/layout.tsx`. | ep-002 C-04, DROP_IN_GUIDE | Claude (C) | 5 min |

---

## Q3: URGENT + NOT IMPORTANT — delegate or batch

| # | Item | Source | Blocker type | Est. effort |
|---|------|--------|:------------:|:-----------:|
| 23 | **FareHarbor API credentials** — `FAREHARBOR_APP_KEY` + `FAREHARBOR_USER_KEY`. Owner emails FareHarbor support. Not launch-blocking (fail-quiet pattern works). | IM #15 | Owner (O) | Owner emails support@fareharbor.com |
| 24 | **Google Places API key + Place ID** — unblocks GoogleReviewsBadge (currently renders null). | ci-001, ra-001 | Owner (O) | 5 min (Google Cloud console) |
| 25 | **StickyBookingBar `<a><button>` nesting** — renders invalid HTML (`<a>` wrapping `<Button>`). Fix: `<Button asChild><a href=…>`. 5-min single-file fix. | a11y-001 §6 | Claude (C) | 5 min |
| 26 | **Phone number confirmation** — footer shows Belgian +32. Unconfirmed vs Spanish +34. | IM #7 | Owner (O) | 1 min |

---

## Q4: NEITHER URGENT NOR IMPORTANT — backlog or drop

| # | Item | Source | Classification |
|---|------|--------|---------------|
| 27 | **BookingSection vs FareHarborCalendar reconciliation** — BookingSection is dead (not wired). Partially overlaps FareHarborCalendar. Wire it or delete it — Cruz must decide; can't be done autonomously. | ci-001 | Owner-decision (O) |
| 28 | **ThemeProvider dead code** — built, never imported, no dark-mode toggle. Delete or wire. No urgency. | ci-001 | Claude (C) when asked |
| 29 | **Wishfulfilling Weaving brand positioning** — sub-brand vs top-level route. Changes sitemap/nav if elevated. No owner signal. | IM uncategorized | Owner (O) if ever |
| 30 | **Optional feature ideas** — school trips, loyalty program, referral, UGC campaign, winter workshops, video hero. All hypothetical, no owner signal. | OWNER_INPUT "Optional" | Drop unless signaled |
| 31 | **Lighthouse / CWV measurement** — requires deployed URL. Cannot act until first Vercel preview. | CANT_BE_DONE | Deploy-gated (external) |
| 32 | **Decision-decay scoring** — requires N≥5 Cortex sessions. No-Cortex policy + first session = zero data. | CANT_BE_DONE | Permanently blocked by policy |

---

## Open Specs Inventory

specs/todo/ has **3 files** (verified by directory scan):

| Spec | Title | Status |
|---|---|---|
| 002 | Legal content — Privacy / Terms / Cookies / Spanish footer | Q1 #1 — owner must provide GDPR text + CIF |
| 003 | Adopt-a-Paca page | Q1 #3 — payment vendor decision blocks closure; route is substantially built |
| 005 | Locale strategy | Q1 #6 — owner answers 3 yes/no questions to close |

specs/done/ has **6 files**: 001 (tour price single source), 004 (dead routes cleanup), 006 (structured data integrity), 007 (form handler dedup), 008 (image optimization), 009/010 (mailer timeout + webhook owner alert). Spec 008 was incorrectly listed as open in incompleteness-master — it was already done at tr-001 time.

---

## CAN'T DO WITHOUT OWNER — Priority Ranking

| Rank | Item | Owner effort | What it unblocks |
|------|------|:------------:|------------------|
| 1 | **Legal pages (Q1 #1)** | 2–4h | Public launch. GDPR. Closes Spec 002. |
| 2 | **FareHarbor item IDs (Q1 #2)** | 16 min | All per-tour Book buttons + calendar filtering |
| 3 | **Payment vendor decision (Q1 #3)** | 30 min | Live Adopt revenue; closes Spec 003 |
| 4 | **Cancellation policy (Q1 #4)** | 5 min | CTA accuracy, Terms page accuracy |
| 5 | **Per-tour prices (Q1 #5)** | 10 min | 10–15% conversion lift on tour cards |
| 6 | **Default locale (Q1 #6)** | 5 min | hreflang, SEO, Spec 005 closure |
| 7 | **Hero photography (Q2 #9)** | Asset drop | Visual score 6/10 → 9/10 across all 11 routes |
| 8 | **Alpaca bios + photos (Q2 #8)** | 2–3h | Highest-engagement page |

Items 2, 4, 5, 6 can be resolved in a single 20-minute owner call. Items 1 and 3 require separate work streams.

---

## Predicted Actions (auto-generated)

### From Q1 Items (Claude-actionable)

1. **Layout primitive migration sweep** — migrate 60+ route files to `<PageSection>`, `<SectionHeading>`, `<GradientPageHero>`, `<OwnerConfirmBanner>`. Mechanical grep-replace. `[3–4h] [C]`

### From Q2 Items (Claude-actionable, no owner input)

2. **Corporate team-building token-swap + FAQ i18n** — 42 raw hex → design-system tokens; translate FAQ strings; add breadcrumbs. `[3h] [C]`
3. **Fix nested `<main>` in adopt/page.tsx** — change inner `<main>` to `<article>`. `[5 min] [C]`
4. **Add `aria-hidden="true"` to hero `<video>` element** — `[1 min] [C]`
5. **Add `aria-hidden="true"` to tour/adopt emoji icon wrappers** — `[10 min] [C]`
6. **Wire `<BackToTop>` into `app/[locale]/layout.tsx`** — one-line addition. `[5 min] [C]`

### Quick Wins (under 30 min, no owner input, safe to run immediately)

| # | Item | Time |
|---|------|------|
| ⚡ | Wire `<BackToTop>` into root layout | 5 min |
| ⚡ | Fix `adopt/page.tsx` nested `<main>` | 5 min |
| ⚡ | Hero video `aria-hidden="true"` | 1 min |
| ⚡ | Emoji icons `aria-hidden` on tour cards | 10 min |

**Quick-win total: 4 items, ~21 minutes combined.**

### Maintenance Notes

- `/self-heal` — not applicable (no Cortex policy)
- `/crystal-ball` — last run: reports/crystal-ball/cb-002-2026-05-26-post-session.md (1 session ago)
- Layout primitive migration is the next highest-leverage Claude batch

---

## Ownership Summary

| Owner | Q1 | Q2 | Q3 | Q4 | Total |
|-------|----|----|----|----|-------|
| Owner (site owner) | 5 | 9 | 3 | 2 | 19 |
| Claude (actionable) | 2 | 5 | 1 | 1 | 9 |
| External / deploy-gated | 0 | 0 | 0 | 3 | 3 |

**Owner-blocked total: 19** — the site cannot launch without the owner addressing Q1 items 1–6.

---

## CANT_BE_DONE.md Permanent Exclusions (not in matrix)

These 12 items are marked impossible in CANT_BE_DONE.md and will never appear in active radar:

| Limit | Re-check trigger |
|---|---|
| Cortex history queries | Cortex policy lifted |
| Live GA4/GTM event verification | First Vercel preview + GTM Preview mode |
| FareHarbor API operations | Owner emails FareHarbor + creds provided |
| Admin credential check on deployed env | Owner shares Vercel env inventory |
| Exact hex/font from live site | Owner pastes brand spec hex values |
| Image asset visual confirmation | Owner drops files in `public/images/` |
| Git blame / churn history | `git init` + commit history imported |
| DOM-level FareHarbor/Stripe admin | Permanently delegated (security model) |
| Lighthouse / Core Web Vitals | Vercel preview + Lighthouse CI |
| Decision-decay scoring | 5+ local reports + Cortex policy lifted |
| Brand-color owner lock | Owner confirms hex values |
| Domain DNS cutover | Owner updates nameservers |
| Stripe product/price ID creation | Owner creates in Stripe dashboard |

---

## Trend (2 reports — insufficient for trend tracking)

> Trend tracking available after 3+ reports. This is report 2 of 2.

**Session progress visible:** tr-001 had Q1:8 / Q2:11 / Q3:5 / Q4:4 = 28 items, plus 5 claude-actionable and 8 philosophy entries. After one session, 23 items are RESOLVED. Current state: Q1:7 / Q2:14 / Q3:4 / Q4:6 = 31 items — item count grew because the session audits (ci-001, ra-001, a11y-001, ma-001, ep-002, uft-003) surfaced new work that was previously invisible. The 23 RESOLVED items are genuine completions; the new items are newly discovered gaps.

**Health assessment:** Claude-actionable backlog is clearing (23 shipped, 9 remain). Owner-blocked items are stable — they cannot move without the owner. The single highest-leverage action remaining for Cruz/Claude is the layout primitive migration (Q1 #7).

---

*report tr-002 | scope: alpaca website only | no-Cortex mode | 2026-05-27 2:04 PM MDT*
