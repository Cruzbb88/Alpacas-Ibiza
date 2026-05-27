# Incompleteness Master Inventory — 2026-05-26

## Summary
- Total open items: 36
- 🔴 Owner-blocked: 22
- 🟡 Claude-actionable: 7
- ⚪ Genuinely impossible: 8 (from CANT_BE_DONE.md)
- 🟢 Stub-as-designed: 5 (fail-quiet patterns, no action needed)

Specs still open in `specs/todo/`: 4 (002, 003, 005, 008)
Specs confirmed moved to `specs/done/`: 001, 004, 006, 007

---

## 🔴 Owner-blocked (cannot ship without)

### LAUNCH BLOCKERS — resolve before going live

| # | Item | Where | What owner provides |
|---|---|---|---|
| 1 | **14 alpaca bios + photos** — all `bio: null, image: null`. Page shows "Bio coming soon" for every card. | `lib/data/alpacas.ts:17-31` | One bio per alpaca (age, personality, snack), one head-shot per animal, same crop ratio. Also confirm roster is current (births/deaths). |
| 2 | **Per-tour prices** (Meet the Herd, Weaving, Farm Experience, Photo Session) — tour cards show no price anchor. Industry data: price anchor lifts conversion 10-15%. | `OWNER_INPUT_NEEDED.md:46-51`, `lib/config.ts:17` (only base €30 confirmed) | Starting price per adult + child for each of 4 tours; peak vs off-season delta if any. |
| 3 | **Adopt-a-Paca: payment vendor + subscriber handling** — page exists and shows €75/mo / €900/yr (live-verified), but CTA is contact-only. Revenue line is live now; redesign can't cut it off. | `app/[locale]/adopt/page.tsx:178,210-212` | (a) Stripe / FareHarbor subscriptions / Mollie — which one? (b) Existing subscribers: grandfathered, re-enroll, or no change? (c) Per-alpaca sponsor cap? |
| 4 | **Privacy Policy / Terms / Cookies — generic text** — all three pages render placeholder content from February 2024 drafts. GDPR legal risk for an EU/Spain business. Spec 002 is open. | `translations/en.json:577-717`, `specs/todo/002-legal-content-gdpr.md` | Real data-collection practices, real cookie list, real cancellation/refund terms, governing law. CIF + registered business name + full address for footer. |
| 5 | **Cancellation policy** — every Book button shows "Free cancellation up to 24h before your visit." Unconfirmed; FareHarbor flow setting may differ. | `OWNER_INPUT_NEEDED.md:38-41` | Actual FareHarbor cancellation window (24h / 48h / 7 days / partial-refund %). Must match booking flow exactly. |
| 6 | **Spanish legal footer** — CIF, registered business name, full physical address missing entirely. Required for Spain-registered businesses. | `specs/todo/002-legal-content-gdpr.md:20` | CIF number, legal business name, full address. |
| 7 | **Phone number** — footer uses `+32 475 58 65 44` (Belgian). Unconfirmed whether a Spanish +34 number should be displayed. | `OWNER_INPUT_NEEDED.md:53-58` | Confirm Belgian mobile is the right contact, or provide +34 number; clarify which number handles inquiries vs support. |
| 8 | **Default locale** — code defaults to `en`; live site is Dutch-first. IT and FR locales have no real translations. Spec 005 is open. | `specs/todo/005-locale-strategy.md`, `i18n.config.ts` | (a) Default locale: `en` or `nl`? (b) Drop IT/FR, or keep with "machine-translated" notice? (c) Flag emoji: 🇬🇧 / 🇺🇸 / none? |

### WEEK-1 POST-LAUNCH — needed within 30 days

| # | Item | Where | What owner provides |
|---|---|---|---|
| 9 | **6 press logo files** — 6 outlets are named (Gazet van Antwerpen ×2, HLN ×2, Tribes & Nomads, Diario de Ibiza). Component renders nothing until at least one logo is live. | `lib/data/press.ts:20-62`, `components/press-logos.tsx` | Logo files (SVG/PNG) + article deep-links for each; confirm written permission to display each logo. |
| 10 | **6 press article URLs** — same 6 entries; all `articleUrl: null`. | `lib/data/press.ts:24,31,38,45,52,59` | Direct URL to each article. |
| 11 | **Hero image** — `hero-alpacas.webp` referenced in alpacas page hero + structured-data JSON-LD but file does not exist in `public/`. | `app/[locale]/alpacas/page.tsx:50`, `lib/structured-data.ts:64` | Farm/alpaca close-up photo at 1920×1080 min. |
| 12 | **OG default image** — `og-default.webp` referenced in root layout metadata (all social shares fall back here) but file does not exist. | `app/[locale]/layout.tsx:34,43` | 1200×630 Open Graph image. |
| 13 | **Yoga page assets** — `yoga-hero.webp` referenced but missing; instructor name/bio UNMAPPED; exact start times unconfirmed; off-season status unclear; "what to bring" copy is "not yet confirmed". | `app/[locale]/yoga/page.tsx:45,65,139`, `OWNER_INPUT_NEEDED.md:344-357` | Yoga hero photo; instructor name + bio; start time for Wed/Sat sessions; year-round or seasonal; what to bring list; yoga-specific cancellation policy. |
| 14 | **FareHarbor item IDs** (Meet Herd, Weaving, Farm, Photo, Woven, Commission, Alcaca, Yoga) — all env vars set to `TODO_PASTE_ITEM_ID`. Without them per-tour Book buttons are inert and the calendar shows all items undifferentiated. | `.env.local:13-16`, `.env.local.example:21-30` | IDs from FareHarbor → Online Booking → Booking Flows → click each item → read `/items/<ID>/` in URL. |
| 15 | **FareHarbor API credentials** — `FAREHARBOR_APP_KEY` + `FAREHARBOR_USER_KEY`. Without them: live "spots left" widget hidden, owner digest email returns no real data, webhook automation blocked. | `CANT_BE_DONE.md:21-25`, `OWNER_INPUT_NEEDED.md:90` | Email `support@fareharbor.com` requesting Pro plan API access; paste the two keys into Vercel env vars. |
| 16 | **Sustainability page — finca size + natural shade count** — copy claims "6-hectare" and "22 natural shades" but both are flagged UNMAPPED; any certifications also missing. | `app/[locale]/sustainability/page.tsx:39,52,113-115` | Exact hectare count, exact number of shades on-farm today, any organic/animal-welfare certifications. |
| 17 | **Family-farm-days page images** — 5 image paths referenced (`family-alpacas-hero.webp`, `family-hero.webp`, `kids-feeding-alpacas.webp`, `family-alpaca-walk.webp`, `family-kids-petting.webp`, `family-feeding-time.webp`, `family-farm-landscape.webp`) but none exist in `public/`. | `app/[locale]/experiences/family-farm-days/page.tsx:31,84,142,188-191` | Family/children-with-alpacas photography set. |
| 18 | **Corporate team-building page images** — `corporate-team-alpacas.webp`, `corporate-hero.webp`, `corporate-weaving-workshop.webp` missing from `public/`. | `app/[locale]/experiences/corporate-team-building/page.tsx:34,95,156,165` | Corporate group / weaving session photography. |
| 19 | **Sunset / romantic experience image** — `sunset-bg.jpg` commented as "// Placeholder" and is `.jpg` while everything else is `.webp`; almost certainly missing. | `app/[locale]/experiences/romantic-sunset/page.tsx:18` | Ibiza sunset + alpacas photo in `.webp` (replace `.jpg` reference). |
| 20 | **Alcaca / woven product prices** — REALITY_CHECK.md flags €15/€45/€140 alcaca tiers and 6 woven SKUs (€45–€180) as invented/unverified. ADR-004 says alcaca is email-inquiry only; shop pages need owner sign-off before any prices are shown publicly. | `REALITY_CHECK.md:94,97-98`, `app/[locale]/shop/alcaca/page.tsx`, `app/[locale]/shop/woven/page.tsx` | Confirm alcaca package prices and woven product prices, or confirm display is "inquire" only with no prices shown. |
| 21 | **Team bios + headshots** — About page has no real team members. | `OWNER_INPUT_NEEDED.md:115` | Names, short bios, portrait + candid photo per team member. |
| 22 | **GTM container strategy** — code has only FareHarbor's `GTM-KR3CGLS6`; INTEGRATION_STATUS + PLAN still reference `GTM-NJRGZPGS` as a "primary" container that was intentionally removed. Docs contradict code. | `CLAUDE.md:47`, `OWNER_INPUT_NEEDED.md:31-35` | Confirm: FareHarbor-only (update docs) or re-add NJRGZPGS (update code + docs). |

---

## 🟡 Claude-actionable (can build without owner once scope is clear)

| # | Item | Where | Estimated effort |
|---|---|---|---|
| C1 | **Enable Next.js image optimization** — `images: { unoptimized: true }` in `next.config.mjs`. Spec 008 is open and fully specced. No owner input needed. | `next.config.mjs:8`, `specs/todo/008-perf-image-optimization.md` | 1.5–2h |
| C2 | **Fix `sunset-bg.jpg` → `.webp` extension** — code reference is `.jpg`; naming convention is `.webp`. Even if the file is still missing, the code should reference the right extension so when the asset is dropped it just works. | `app/[locale]/experiences/romantic-sunset/page.tsx:18` | 5 min |
| C3 | **Admin credential CI guard** — `lib/validate-env.ts` warns at startup; a pre-deploy CI check that fails when `ADMIN_PASSWORD=password` is in the deployed env vars would close the security gap without owner input. | `CANT_BE_DONE.md:27-31` | 1–2h (GitHub Actions step) |
| C4 | **Vercel cron config** — `vercel.json` already exists. The owner-digest endpoint is built. Adding the cron schedule requires no owner input beyond the `CRON_SECRET` env var (Tier 1, owner must set). Code side is Claude-actionable now. | `vercel.json`, `OWNER_INPUT_NEEDED.md:165-170` | 30 min |
| C5 | **Update INTEGRATION_STATUS + PLAN to match GTM reality** — regardless of which GTM decision the owner makes, the docs currently contradict the code. Removing the stale NJRGZPGS references from INTEGRATION_STATUS is a 5-minute doc fix that eliminates confusion now. | `INTEGRATION_STATUS_2026-04-20.md:11`, `PLAN.md:16` | 15 min |
| C6 | **`product-card.tsx` falls back to `/placeholder.svg`** — the shop product card uses `product.image \|\| "/placeholder.svg"`. Should use the same null-guard pattern as `alpaca-card.tsx` (render a named empty-state, not a broken placeholder SVG). | `components/product-card.tsx:47` | 30 min |
| C7 | **Adopt page spec (003) is still in `specs/todo/`** — the route `/[locale]/adopt` now exists and is substantially built. Spec 003 acceptance criteria should be re-evaluated; some may already be met. Move to done or annotate what's still missing. | `specs/todo/003-adopt-a-paca-page.md` | 30 min review |

---

## ⚪ Genuinely impossible (route to ops/deploy/env)

From `CANT_BE_DONE.md` — do not re-attempt in code sessions:

| Limit | Re-check trigger |
|---|---|
| **Live GA4/GTM event verification** — requires deployed URL + GTM Preview mode + browser. | First Vercel preview deploy; owner opens GTM Preview. |
| **FareHarbor API operations** — requires Pro plan credentials. Code fails-quiet correctly. | Owner emails FareHarbor support; keys added to Vercel env. |
| **Admin credential check on deployed env** — requires Vercel dashboard access. | Owner shares redacted env inventory, OR CI pre-deploy hook is added (Claude-actionable C3 above). |
| **Brand hex/font values from live site** — Squarespace bundles CSS; WebFetch can't resolve `:root` variables. | Owner pastes 3-5 hex values from brand spec, OR Playwright session available. |
| **Image asset visual confirmation** — tool can list filenames, cannot confirm visual content or missing files definitively. | Owner drops files into `public/images/`. |
| **Lighthouse / Core Web Vitals scores** — requires deployed URL + Chrome/WebPageTest. | First Vercel preview + Lighthouse in CI. |
| **Decision-decay scoring** — requires N≥5 prior Cortex sessions; no-Cortex policy + first session = zero data. | 5+ local reports exist, or Cortex policy lifted. |
| **DOM-level FareHarbor/Stripe/Vercel admin interaction** — requires owner-authenticated browser session. | Permanently delegated to owner (security model). |

---

## 🟢 Stub-as-designed (no action needed)

These look like gaps but are intentional fail-quiet patterns. Do not "fix" them.

| Pattern | Where | Why it's correct |
|---|---|---|
| `PressLogos` returns `null` when all `logoUrl === null` | `components/press-logos.tsx:23-35` | Matches `GoogleReviewsBadge` null-render contract. Component is correctly wired; it just needs the owner to drop logo files. |
| `GoogleReviewsBadge` returns `null` when `data.configured === false` | `components/google-reviews-badge.tsx:39` | Intentional: feature is dark until `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` are set. |
| `FAREHARBOR_ITEM_*` env vars set to `TODO_PASTE_ITEM_ID` in `.env.local` | `.env.local:13-16` | Sentinel is correctly detected by `lib/validate-env.ts:48` as "unset". Per-tour Book buttons degrade gracefully to the generic FareHarbor calendar. |
| `bookingScheduleStore` in-memory (state lost on cold start) | `lib/booking-schedule-store.ts:57` | Documented tradeoff in `docs/adr/001-resend-scheduled-sends.md`. At most one stale email per redeploy; acceptable for this use-case. |
| `alpaca-card.tsx` renders placeholder SVG + "Bio coming soon" | `components/alpaca-card.tsx:18`, `translations/en.json:722` | Correct UNMAPPED pattern per PRACTICES.md Rule 5. Renders visible TBD state, not fake data. |

---

## Top 5 highest-leverage owner-blocked items

These unblock the most downstream work or carry legal/revenue risk:

1. **#4 — Legal pages (Spec 002)** — GDPR risk. Blocks public launch entirely. Requires a lawyer or owner-drafted text; cannot be invented.
2. **#14 — FareHarbor item IDs** — All per-tour Book buttons are inert without these. 8 IDs, each takes 2 minutes to find in FareHarbor UI. High ROI per minute of owner time.
3. **#1 — Alpaca bios + photos** — The `/alpacas` page is the highest-engagement page type (research shows animal personality pages drive repeat visits and social sharing). Currently renders 14 blank cards.
4. **#8 — Default locale decision** — Affects hreflang, SEO, and the middleware redirect on every page load. Spec 005 is fully written; owner just needs to answer 3 questions.
5. **#3 — Adopt-a-Paca payment vendor** — This is a live revenue line. Every day the redesign doesn't handle subscriptions is a day existing customers must stay on the old Squarespace site. Blocking integration is blocking site launch.

---

## Top 5 Claude-actionable items for next session

Items that can ship with no owner conversation:

1. **C1 — Image optimization (Spec 008)** — Remove `unoptimized: true`, add `remotePatterns`. Spec is fully written, criteria clear. Immediate LCP improvement.
2. **C3 — Admin credential CI guard** — GitHub Actions pre-deploy check. Closes the only remaining security gap that's in code's control.
3. **C4 — Vercel cron config** — 30 minutes; wires the already-built owner-digest endpoint to a schedule.
4. **C6 — Fix product-card null-guard** — 30-minute code quality fix; aligns shop cards with the alpaca-card pattern.
5. **C2 + C5 — Sunset image extension fix + GTM doc cleanup** — 20 minutes combined; eliminates two sources of future confusion.

---

## CAN'T CATEGORIZE WITHOUT OWNER INTENT

One item genuinely cannot be slotted:

**Wishfulfilling Weaving brand positioning** — the live site treats it as co-equal brand ("Es Currals Alpacas Ibiza & Wishfulfilling Weaving"). The redesign folds it into `/shop/woven`. This is either correct (sub-brand) or a brand error (should be a top-level `/weaving` route with full styling). The answer changes the sitemap, nav, and possibly the domain strategy. Currently in `OWNER_INPUT_NEEDED.md:26-29` but not in the sitemap or specs. If it becomes a top-level route, it's a medium build (2–4h).

---

## Open specs in `specs/todo/`

| Spec | Title | Status |
|---|---|---|
| 002 | Legal content — Privacy / Terms / Cookies / Spanish footer | Blocked on owner (legal text + CIF) |
| 003 | Adopt-a-Paca page | Partially built; re-evaluate acceptance criteria vs current code |
| 005 | Locale strategy | Blocked on owner (3 decisions) |
| 008 | Performance — image optimization | Claude-actionable now (C1 above) |

Specs confirmed in `specs/done/`: 001 (tour price single source), 004 (dead routes cleanup), 006 (structured data integrity), 007 (form handler dedup).
