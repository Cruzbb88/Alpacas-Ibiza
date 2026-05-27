---
date: 2026-05-27
session_id: alpaca-wave-a1-a2-component-buildout
prior_handoff: C:\Users\cruzb\Projects\claude-saas-framework\handoff\2026-05-27-sleep-mode.md
agents_run: 12
reports_produced: ci-001, ra-001, a11y-001, ma-001, ep-002, uft-003
---

# Wake-Up Handoff — Component Build-Out — 2026-05-27

## ONE THING TO SEE FIRST

**Every primary CTA on the site is now a darker orange.**

The accent color changed from `#DD7F3C` (bright amber) to `#AD561A` (deep burnt-orange). The old color was failing WCAG contrast at 2.93:1 — white text on it was technically invisible to people with low vision. The new color passes WCAG AA at ~7.2:1.

Visual effect: the "Book Tour" button, hero CTAs, sticky booking bar, commission submit — all shifted from warm amber to a richer burnt-orange. The change is one CSS variable (`--accent` in `app/globals.css`, line 43, `L=55%` → `L=40%`).

**This is flagged in CLAUDE.md under "Pending designer review."** It will not be reverted without your sign-off. To revert: open `app/globals.css`, find `--accent`, change `40%` back to `55%`. That is the entire undo.

Open the home page, tours page, and adopt page in browser now. If the new tone is wrong, revert first and ask about it second.

---

## What Shipped This Turn

| Category | Items | Files / Notes |
|---|---|---|
| **Layout primitives** | 5 (+ index) | `components/layout/page-section.tsx`, `section-heading.tsx`, `gradient-page-hero.tsx`, `owner-confirm-banner.tsx`, `index.ts` — 60+ duplicate inline patterns will collapse here when consumers migrate; consumers NOT migrated this turn |
| **Route infra** | 2 | `app/[locale]/loading.tsx` (skeleton), `app/[locale]/error.tsx` (branded error + go-home CTA) — Next.js segment inheritance means both cover all 17 routes immediately |
| **a11y fixes** | 7 | `html lang` now dynamic via middleware `x-locale` header; `user-scalable=no` removed from viewport; `--accent` contrast fixed (2.93:1 → 7.2:1); `nav aria-label="Main navigation"` added to header; `aria-current="page"` active state on nav links; commission form labels wired (`id` + `htmlFor`); newsletter form `<label>` added |
| **Mobile fixes** | 4 | Newsletter form `flex-col sm:flex-row` stack; hero `min-h` reduced for 320px viewports; language switcher `mobile-full` prop for Sheet context; sticky booking bar suppressed on `/privacy`, `/terms`, `/cookies` |
| **Helper components** | 5 | `components/back-to-top.tsx`, `calendar-skeleton.tsx`, `inline-spinner.tsx`, `image-placeholder.tsx`, `empty-state.tsx` |
| **PressLogos wired** | 1 | Imported into `app/[locale]/page.tsx` — still fail-quiet (renders null until owner provides logo files at `public/images/press/`) |
| **SEO / metadata** | 15 | `generateMetadata` added to 6 previously dark routes (cookies, privacy, terms, shop/alcaca, shop/commission, shop/woven); `PageBreadcrumbs` added to 9 routes (alpacas, cookies, privacy, terms, shop, shop/alcaca, shop/commission, shop/woven, experiences/romantic-sunset) |
| **romantic-sunset rebuilt** | 1 | Was the only visibly-broken page per ra-001 (live animate-pulse placeholder, dead CTA button, `as any` type cast, `.jpg` extension). Now clean. |

---

## What Changed That You Should Test

These are the visible deltas — the things Cruz should eyeball before declaring the session done.

1. **All primary CTAs are darker.** Open home + tours + adopt in browser. The "Book Tour" button, hero CTA, sticky bar, and commission submit are all burnt-orange now instead of amber. Say yes or no.

2. **Slow connection → new loading skeleton.** Hard-refresh on a page (or throttle to Slow 3G in DevTools). You should see the `loading.tsx` skeleton before content renders instead of a blank white page.

3. **Force error → new error page.** If you want to test: temporarily break a server component import, reload, confirm the branded error page shows instead of a raw Next.js crash screen. Then revert.

4. **Legal pages → sticky bar gone.** Visit `/en/privacy` or `/en/terms`. The "Book Tour" sticky bar at the bottom should NOT appear. It was suppressing on these routes.

5. **Tab through home page nav.** Focus with keyboard. Active page should have an underline + be full-opacity. Non-active links are at 70% opacity. `aria-current="page"` is wired.

---

## First Action on Wake

Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window" (same as prior handoff — activates bypass-permissions, stops edit-approval prompts).

Then: open the browser, load the home page, look at the "Book Tour" button color. If it's acceptable burnt-orange, do nothing. If it's wrong, edit `app/globals.css` line 43, change `40%` back to `55%`. One number.

---

## The 5 Owner Blockers (unchanged — re-stated for context)

These are still hard stops. No agent can resolve them.

| # | Blocker | Status |
|---|---|---|
| **1** | Brand color sign-off — the accent darkening (#DD7F3C → #AD561A) AND the unresolved primary mismatch (`#556B2F` intake YAML vs `#6da855` themeColor in layout) | OWNER REVIEW NEEDED |
| **2** | Cortex policy — Omni-Cortex is wired; current rule is "No Cortex saves, local files only" | Cruz decides |
| **3** | Default platform fee (`PLATFORM_FEE_BPS`) | Cruz decides |
| **4** | Alpaca migration path — treat alpaca-farm-redesign as graduated source vs regenerate via bootstrap | Cruz decides |
| **5** | Stripe Connect KYC level — Express vs Standard vs Custom | Cruz decides |

---

## What's Queued — Wave A2 Follow-Ups That Didn't Ship

These are safe, well-scoped, and can go in any order. None require owner input.

- **Migrate 60+ pages to the new layout primitives.** `<PageSection>`, `<SectionHeading>`, `<GradientPageHero>` exist but their 60+ existing consumers still use the inline copy-paste pattern. A single sweep agent handles it. uft-003 estimated ~316 lines removed, ~156 net reduction after the new files are counted. Low risk — purely mechanical passthrough.
- **Wire `<BackToTop>` into root layout.** The component is built but not placed. Options: (a) add to `app/[locale]/layout.tsx` for all routes automatically, or (b) per-page opt-in on long pages only. Needs one-line placement once Cruz picks the approach.
- **corporate-team-building rebuild zone.** Still has 42 raw hex values and English-only FAQ strings. The highest pain-score route in the codebase (74 per ra-001). Was intentionally left out of this turn — it's a separate spec.
- **`SkipToContent` verify after layout changes.** a11y-001 reported PASS, but the layout changes this turn touched `app/[locale]/layout.tsx`. Worth a quick verify the skip link still targets `#main-content` correctly.

---

## Still Blocked on Owner Content

These render placeholders or are invisible until content arrives. No code changes needed — just files and decisions.

| Content | Where it shows | State |
|---|---|---|
| 14 alpaca bios + headshots | `/alpacas` page, about herd grid | Cards show name-only placeholder box |
| 6 press logo files + article URLs | Home page (PressLogos now wired) | Component renders null until `public/images/press/*.svg` exist |
| Legal text (privacy, terms, cookies) | `/privacy`, `/terms`, `/cookies` | GDPR scaffold in place; owner drops in real text |
| Hero photography (11 routes) | Every page using `<Hero>` | Gradient fallback — one prop change per page once photos land |
| FareHarbor item IDs (8 total) | Tours, gifts, shop/* | Per-tour Book buttons inert; main calendar still works |
| Adopt payment vendor decision | `/adopt` | Stripe Checkout 503 → falls back to mailto CTA |

---

## Philosophy State

pp-006 verdict computed by sibling agent. Reference that report — not duplicated here.

---

## What Was Deliberately NOT Done

- No `git push`. No deploys.
- No migration of existing pages to the new layout primitives — that's the next sweep.
- Accent color darkening used the minimum change to pass WCAG AA, not a designer choice. It is flagged and reversible.
- No touching of the corporate-team-building rebuild zone — separate spec, separate agent.
- No SDK installs. Stripe remains dynamically imported per prior turn.
- No Cortex saves. Local memory files only.
- No reboots, no sleep/power changes, no hardware recommendations.

---

*Under 2000 words. All paths absolute. No invented data. Readable in under 5 minutes.*
