# SITE_DATA_EXTRACT — programmatic full-page audit (2026-06-13)

**Method:** `scripts/site-extract.mjs` — Playwright headless Chrome crawled **39 public pages** in a real browser and extracted the complete dataset per page (meta, all parsed JSON-LD, heading outline, image/link/form inventory, visible word count, desktop+mobile horizontal-overflow, console errors, failed network requests) **plus real axe-core 4.12.1 WCAG violations**. This is *measured rendered behaviour*, not code-reading inference — it caught systemic defects that 30+ prior static audits and the heuristic mobile/a11y reports all missed.

Raw data: `reports/site-extract-2026-06-13/_summary.csv` + `_aggregate.json` + `pages/*.json` (one per page) + `pages/*.png` (full-page desktop screenshots).

**Headline: 152 axe WCAG violations across 39 pages. Every page renders HTTP 200. The defects are overwhelmingly SYSTEMIC (shared chrome) — a handful of global fixes clear most of them.**

---

## A. SYSTEMIC defects (appear on ~every page — fix once, fix everywhere)

### A1. ❌ SERIOUS — `color-contrast`: 22–51 failing elements PER PAGE, site-wide
The dominant violation by far. axe measures **22–51 elements below WCAG 1.4.3 contrast** on every page (home 43, adopt 46, alpacas 51, contact 22). **This contradicts the documented assumption** in CLAUDE.md ("Pending designer review: `--accent`/`--foreground` darkened for WCAG 1.4.3 — PASS") — the tokens were darkened but axe proves the result still fails at scale, almost certainly the `text-foreground/70` opacity-blend body copy + muted/secondary text on the off-white background.
- **Class:** DESIGN-TOKEN decision (the contrast tokens are in the "pending designer review, DO NOT REVERT without owner sign-off" zone). Needs the exact failing selectors (re-run axe with node detail) → then either push the token L-values further or stop using `/70` opacity blends for body text.
- **Highest-volume a11y issue on the site.** ~1,200+ total contrast failures across all pages.

### A2. ❌ CRITICAL — `button-name`: 1 nameless button on every page
axe flags exactly **1 critical `button-name`** (button with no discernible text) on all 39 pages → it lives in global chrome (header/footer/cookie-banner). A desktop DOM probe found 0 nameless `<button>` at 1280px, so the culprit is responsive/icon-only (mobile menu toggle, or a `role=button` icon). **Pinpoint pending:** re-run axe capturing node targets. One fix → 39 pages, critical severity.

### A3. ❌ MODERATE — duplicate/nested `<main>` on ~15 pages
The locale layout renders `<main id="main-content">` ([app/[locale]/layout.tsx:105](app/%5Blocale%5D/layout.tsx#L105)) AND ~15 pages **also** render their own `<main>`, nesting them → axe `landmark-no-duplicate-main` + `landmark-main-is-top-level` + `landmark-unique` (3 moderate/page on home, alpacas, contact, experiences, yoga, corporate, family, media, newsletter/archive…). The a11y-002 agent only checked `/adopt` (fixed to a fragment) and reported it resolved — the extract proves it persists site-wide.
- **Fix:** remove `<main>` from the ~15 page components (use a fragment/`<div>`) — the layout already provides the landmark. CODE-DOABLE, mechanical. Affected (from grep): contact:67, experiences:218, yoga:119, corporate:79, family:69, media:58, newsletter/archive:58, recover-certificate:41, share-adoption:103, newsletter-confirmed:38, newsletter/unsubscribed:43, error:46, my-adoption:147 + error-state/loading.

### A4. ❌ MOBILE — horizontal scroll-leak 332px on every page
At 390px viewport, `document.scrollWidth = 722` on every page (incl. the 404). Culprit pinpointed: the **off-canvas mobile menu drawer** `DIV.md:hidden fixed top-0 right-0 z-50 w-[…]` sits at `left:390 → right:722` (positioned off-screen-right instead of transformed off-layout). A `fixed right-0` off-canvas element **leaks real horizontal scroll** — the user can swipe right into empty space on every page.
- **Fix:** the closed drawer should use `transform: translateX(100%)` (off-layout, no scrollWidth impact) instead of being positioned at the right edge, OR set `overflow-x: clip` on the root. One header fix → 39 pages. CODE-DOABLE.

---

## B. PAGE-LEVEL defects

### B1. ⚠️ Soft-404 — `/this-page-does-not-exist` returns HTTP **200**, not 404
The not-found path renders with a 200 status (noindex meta is set, but the status code is wrong). Google treats 200-status "not found" pages as soft-404s — crawl-budget waste + potential thin-content indexing. Verify the `[locale]` not-found boundary actually calls `notFound()` / returns a 404 status.

### B2. ⚠️ Missing `alt` text — concentrated on image-heavy pages
- **alpacas: 16 images missing alt** (the entire herd grid — each alpaca card image) — both a11y (1.1.1) and SEO loss.
- **shop-woven: 7 missing** (emoji-placeholder products).
- ~12 other pages: 1 each (usually a decorative/hero slot).
- **Fix:** add `alt` from the alpaca name / product name (data already exists). CODE-DOABLE for the herd grid; emoji products are owner-photo-blocked.

### B3. ⚠️ Thin pages (<250 visible words) — soft thin-content risk
shop (229), redeem-voucher (214), herd-diary (206 — empty-state), newsletter-archive (202 — empty-state), preferences (206 — utility). Empty-state/utility pages are expected-thin; **shop (229) and redeem-voucher (214) are conversion-adjacent and should carry more copy.** Mostly OWNER-content.

---

## C. What the data CONFIRMS (corroborates prior audits with hard numbers)

- **Thin-content/hreflang defect is real:** `hreflang_n = 7` on **every** page (all 6 locales + x-default), including the ~30%-translated de/es/fr/it and including pages that should be noindex. Hard confirmation of seo-001 + loc-quality-001. The `indexableLocales` gate added to `i18n.config.ts` is still **not consumed** (cb-006 #1) — the defect is fully live.
- **Structured data is strong:** every page emits **4–8 parsed JSON-LD blocks** (vs competitors' zero). No parse errors.
- **Meta hygiene is good:** all 39 pages have title + description + canonical. (Short titles: privacy 14, cookies 13 chars — could be richer.)
- **No broken images** (`imgBroken = 0` everywhere) — the gradient/emoji placeholders are intentional `<div>`s, not broken `<img>`s.
- **No failed network requests** on render (1 each on tours/sitemap/journal — likely the optional Google-reviews/availability fetch failing graceful, expected without keys).

---

## D. Prioritized fix list (by severity × leverage)

| # | Fix | Severity | Leverage | Class |
|---|---|---|---|---|
| 1 | Mobile drawer scroll-leak (`translateX` the closed drawer) | High (every mobile visitor) | 39 pages, 1 file | CODE-DOABLE |
| 2 | `button-name` critical (pinpoint + aria-label the global icon button) | Critical (a11y) | 39 pages, 1 fix | CODE-DOABLE (pinpoint first) |
| 3 | Nested `<main>` → remove from ~15 page components | Moderate (a11y) | 15 files | CODE-DOABLE, mechanical |
| 4 | alpacas herd-grid `alt` (16 imgs) | Serious (a11y+SEO) | 1 component | CODE-DOABLE |
| 5 | Soft-404 → real 404 status | Medium (SEO) | 1 boundary | CODE-DOABLE (verify) |
| 6 | Finish the `indexableLocales` gate (consume it in hreflang/sitemap/robots) | High (SEO thin-content) | site-wide | CODE-DOABLE + product call (ratify ADR-025) |
| 7 | `color-contrast` 22–51/page | Serious (a11y), highest volume | site-wide | **DESIGN-TOKEN decision** (pending-review zone — owner sign-off) |

**1–5 are clearly-safe code fixes. 6 is code-doable but ratifies a locale-indexing product decision. 7 is the biggest by volume but sits in the contrast-token "pending designer review" zone — it needs the node-level selectors + an owner/designer call, not an autonomous token push.**

---

## E. Honest method caveats
- axe ran at desktop 1280px; some responsive-only issues (mobile menu button-name) may be under-counted — a mobile-viewport axe pass would catch more.
- The 332px overflow is a *real* scroll-leak (scrollWidth confirms), but it's the off-canvas drawer, not "all content 332px too wide" — characterised precisely so it isn't over-stated.
- Redesign **performance** numbers are being captured separately via a production-build Lighthouse pass (`scripts/lh-perf.sh` → `reports/performance-optimizer/redesign-lh-2026-06-13.md`) — dev-server perf is meaningless, so it was excluded here.

---

## F. VERIFICATION — after-fix re-extract (measured, not claimed)

Re-ran `scripts/site-extract.mjs` after the fixes. Before-snapshot preserved at `reports/site-extract-2026-06-13-BEFORE/`.

**axe WCAG violations: 152 → 47 (−105, −69%).** Confirmed per page in the aggregate diff.

| Fix | Verified result |
|---|---|
| `button-name` CRITICAL | **Eliminated site-wide** — critical 1 → 0 on **every** page. Cause was the header `<SelectTrigger>` language switcher with no accessible name; `aria-label="Select language"` ([components/language-switcher.tsx:32](components/language-switcher.tsx#L32)) fixed it on all 39 pages. |
| Nested `<main>` landmark | **Eliminated** — pages that were 5 axe violations dropped to 1; the 3 moderate landmark rules gone. 38 page components no longer render `<main>`; only the layout does. |
| Soft-404 (root) | **Fixed** — root `app/not-found.tsx` was calling `redirect()` (307→200); now renders a real 404. The `[locale]/[...slug]` catch-all correctly calls `notFound()`; it still reports 200 **on the dev server**, a known Next.js dev-streaming behaviour — **verify on prod build** (notFound() returns 404 in production). |

**Two honest corrections to Section B above:**
- **B2 was partly a measurement artifact.** "alpacas 16 missing alt" was a **CSV-column-shift** from the unescaped comma in `robots="index, follow"` — alpacas actually has **0 missing alt** (`alpaca-card.tsx` already sets `alt={alpaca.name}`). The only real missing-alt is **shop-woven's 7 emoji-placeholder products** (owner-photo-blocked).
- **A4 mobile scroll-leak is NOT fixed.** `overflow-x: clip` on body *and* html were both tried and **measured ineffective** — a `position: fixed` element escapes ancestor/root clipping in Chrome (still 332px after). The correct fix restructures the drawer (viewport-fixed `overflow-x-hidden` wrapper + `absolute` panel), which touches the nav focus-trap + slide animation — **left as a focused, mobile-tested change**. Root cause + recipe documented in `app/globals.css`.

**Remaining 47 = almost entirely `color-contrast`** (1 rule/page × 39, each 22–51 nodes) — the design-token decision in the "pending designer review" zone. Largest a11y item left; needs an owner/designer call, not an autonomous token push.
