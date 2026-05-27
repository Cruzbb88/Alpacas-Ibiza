---
report: po-001
date: 2026-05-26
project: alpacas-ibiza-nextjs
mode: L1 (Critical Path Identification)
layer_score: 38/100
composite: 38
power_core: three-beforeInteractive-scripts-blocking-FCP
---

# Power Core Report — Alpacas Ibiza Critical Path

## Power Core (THE bottleneck)

**Three `strategy="beforeInteractive"` scripts block every byte of HTML from painting.**

`app/layout.tsx:50–84` loads four scripts before the browser can parse any React output:
- Consent default (inline, ~350 bytes)
- GA4 gtag.js remote fetch (~45 kB)
- GA4 init inline
- GTM-KR3CGLS6 inline bootstrap

All four carry `strategy="beforeInteractive"`, which Next.js injects into `<head>` before the RSC payload. The GA4 remote script alone is a synchronous network round-trip to `googletagmanager.com` on every page load. On a P75 mobile connection (50 ms TTFB + ~150 kB/s), this single script adds **400–600 ms to FCP** before a single pixel renders.

Fix: demote all three to `strategy="afterInteractive"`. Consent-mode `gtag('consent','default')` can precede via a tiny inline `<script>` tag (no `next/script`, just raw `<script>`) that runs synchronously — this preserves GDPR Consent Mode v2 ordering without blocking the paint chain.

Recoverable: ~400–600 ms FCP on median mobile.

---

## Ranked Secondary Slowdowns

### 1. Client-component over-declaration — ~150–300 ms TTI penalty

63 of ~65 components carry `'use client'`, including fully-static layout primitives:

- `components/features.tsx` — renders emoji + text only, no state
- `components/timeline.tsx` — static ordered list
- `components/experience-cards.tsx` — static card grid
- `components/choice-paths.tsx` — static link grid
- `components/weaving-showcase.tsx` — static prose + image
- All 40+ shadcn/ui `components/ui/*.tsx` wrappers — pulled into the client bundle even when used only in server pages

Every `'use client'` boundary forces its entire subtree into the JS bundle. The homepage (`app/[locale]/page.tsx`) is itself a Server Component, but imports 7+ client subtrees that each drag in their Radix dependencies. This bloats the hydration payload and delays TTI.

Fix: strip `'use client'` from any component that has no hooks, event handlers, or browser APIs. Estimated impact: remove ~30–60 kB of unnecessary JS from the initial bundle.

Recoverable: ~150–300 ms TTI.

### 2. `images: { unoptimized: true }` in `next.config.mjs` — ~200–500 ms LCP on image-heavy pages

`next.config.mjs:8` disables Next.js image optimization globally. This means:
- No WebP/AVIF conversion
- No responsive `srcset` generation
- No lazy-load or blur-placeholder behavior
- Hero background images and experience page `<Image>` components (`app/[locale]/experiences/*/page.tsx`) serve full-resolution originals to every viewport

`app/[locale]/experiences/corporate-team-building/page.tsx:156,165` and `family-farm-days/page.tsx:142,195` use `<Image>` from `next/image` but get zero optimization benefit because of the global override.

Fix: remove `unoptimized: true`, add `domains`/`remotePatterns` for any external image hosts, and add `priority` prop to above-the-fold hero images.

Recoverable: ~200–500 ms LCP on experience pages.

### 3. Client-side fetch waterfall on Tours page — ~300–500 ms blocking user-visible content

`app/[locale]/tours/page.tsx` renders two client components that independently fetch `/api/availability` on mount:
- `components/booking-section.tsx:27` — `useEffect(() => fetch('/api/availability'))`
- `components/availability-urgency.tsx:22` — `useEffect(() => fetch('/api/availability', ...))`

Both run after hydration, in parallel, but each triggers a server-side fan-out: if `FAREHARBOR_ITEM_ID` is unset, `app/api/availability/route.ts:40` first fetches the items list, then fans out to up to 3 availability endpoints in `Promise.allSettled`. The server-side chain is: 1 items fetch (5 s timeout) + up to 3 availability fetches (5 s timeout each). Worst-case server latency is 10 s (serial failure), typical is 1–2 s. The client sees this plus network RTT.

Additionally, `GoogleReviewsBadge` (`components/google-reviews-badge.tsx:30`) makes a third independent client fetch to `/api/google-reviews` on the same page.

Fix: (a) deduplicate the two availability fetches into one shared React context or SWR key; (b) set `FAREHARBOR_ITEM_ID` to avoid the pre-fetch items step; (c) move `GoogleReviewsBadge` data to a Server Component with `fetch` + `cache: 'force-cache'` and pass as prop.

Recoverable: ~300–500 ms on Tours page (eliminates one redundant fetch + server chain reduction).

### 4. All-locales translation bundle loaded on every request — ~30–50 kB unnecessary parse

`lib/translations.ts:3–8` statically imports all 6 locale JSON files (en + de + it + es + nl + fr = ~206 kB total, ~34 kB per locale) into a single in-memory object. Every server render, regardless of locale, loads all 6 translations into the module. While this doesn't affect the client bundle (server-only), it does bloat the server module graph and may slow cold starts marginally.

Fix: replace static imports with dynamic `import(\`@/translations/${locale}.json\`)` with a module-level cache map.

Recoverable: ~50–100 ms cold start.

### 5. Recharts full-namespace import — deferred client bundle risk

`components/ui/chart.tsx:4`: `import * as RechartsPrimitive from 'recharts'`

Recharts is ~300 kB minified (includes d3 internals). The `chart.tsx` component is marked `'use client'` and pulls the entire library. Currently recharts is only used in `app/admin/analytics/page.tsx` (admin-only), not in any public-facing route. But any future accidental import from a public page would load ~300 kB into the main bundle.

Fix: verify recharts is only imported from the admin subtree; consider `dynamic(() => import('../ui/chart'), { ssr: false })` at the admin page level as a guard.

Risk if leaked to public: ~200–300 ms additional parse time on low-end devices.

---

## Theoretical Minimum Estimate

| Metric | Current (estimated) | Theoretical Min | Gap |
|--------|--------------------|-----------------|----|
| FCP (mobile P75) | ~1.8–2.4 s | ~0.8–1.0 s | ~1.0–1.4 s |
| TTI (homepage) | ~3.0–4.5 s | ~1.5–2.0 s | ~1.5–2.5 s |
| LCP (experience pages) | ~2.5–4.0 s | ~1.0–1.5 s | ~1.5–2.5 s |

Theoretical minimum assumes: afterInteractive analytics, server-rendered availability data, optimized images with priority hints, and client bundle trimmed of static-only components.

---

## Summary Fix Priority

1. **CRITICAL** — `app/layout.tsx:70–84`: Demote GA4 gtag.js + GTM to `afterInteractive`. Keep consent snippet as raw inline `<script>`. Recovers ~400–600 ms FCP.
2. **HIGH** — `next.config.mjs:8`: Remove `images: { unoptimized: true }`. Add `priority` to hero `<Image>` props. Recovers ~200–500 ms LCP.
3. **HIGH** — `components/booking-section.tsx:27` + `components/availability-urgency.tsx:22`: Deduplicate availability fetches; set `FAREHARBOR_ITEM_ID` env var. Recovers ~300–500 ms on Tours.
4. **MEDIUM** — Strip `'use client'` from 15–20 static-only components. Recovers ~150–300 ms TTI.
5. **LOW** — `lib/translations.ts:3–8`: Lazy-load per-locale JSON. Marginal cold-start improvement.
