# Redesign — real Lighthouse scores (production build, mobile)

**Date:** 2026-06-13 · **Tool:** Lighthouse 12.8.2 mobile, against `next build && next start` (production) at http://localhost:3100. · Competitor bar (perf-competitor-bench): sector perf 36–60, LCP 6.9–15.8s, none 'good'.

| Page | Perf | A11y | Best-Pract | SEO | LCP s | CLS | TBT ms |
|---|---|---|---|---|---|---|---|
| home | 73 | 89 | 56 | 92 | 9.9 | 0.000 | 156 |
| adopt | 65 | 88 | 56 | 92 | 9.4 | 0.030 | 300 |
| tours | 81 | 86 | 56 | 92 | 4.4 | 0.000 | 207 |
| gifts | 77 | 88 | 56 | 92 | 4.6 | 0.000 | 292 |
| alpacas | 74 | 88 | 56 | 92 | 5.3 | 0.000 | 296 |
| shop | 64 | 87 | 56 | 92 | 8.0 | 0.000 | 269 |
| contact | 35 | 89 | 56 | 92 | 8.7 | 0.000 | 2838 |

## Honest interpretation (corrects the earlier "3–5× faster moat" claim)

The clean moat I hypothesized did **not** materialise on this localhost production build. The honest read:

- **Perf is MIXED (35–81), not dominant.** tours (81) and gifts (77) beat the sector best (Spring Farm 60). But home (73), adopt (65), shop (64) are only ~tied-to-slightly-better than competitors, and **contact (35) is WORSE than most competitors.** Not a 3–5× win.
- **LCP is still poor (4.4–9.9s).** Only tours/gifts/alpacas (4.4–5.3s) are meaningfully better than the sector's 6.9–15.8s; home/adopt/shop/contact (8.0–9.9s) sit **in the same bad band as competitors.** None are "good" (<2.5s). The redesign is competitive on LCP, not a moat — yet.
- **CLS is a decisive, real win.** 0.000 on almost every page (adopt 0.030) vs e.g. West Wight's catastrophic 1.247. This is the one unambiguous competitive advantage measured.
- **SEO 92 uniform** — strong (the 8-pt gap is the thin-content/hreflang + missing-alt + soft-404 already documented).
- **A11y 86–89** — amber, dragged by the contrast + button-name violations the full axe pass measured (152 total).

### Two NEW systemic signals this surfaced
- **Best-Practices = 56 on EVERY page (uniform → systemic).** Partly a **localhost artifact** — Lighthouse's "uses HTTPS" audit fails on `http://localhost`, which alone costs several points; console errors + the `next/image quality 85 not configured` warning also count. On real Vercel HTTPS this should rise materially. Re-measure after deploy before treating 56 as the true number.
- **contact: perf 35, TBT 2838ms** — a main-thread-blocking outlier (the contact page's form + captcha + map-embed scripts are the likely culprits). Worth a targeted profile; it's the single worst page measured.

### Caveats on these numbers
- **localhost ≠ Vercel.** No edge CDN, no Brotli, no image-CDN, no regional caching — so LCP + Best-Practices here are a **pessimistic floor.** The real deployed numbers will be better, but a 9.9s localhost LCP won't become 2.0s from CDN alone if the SSR is slow.
- **The power core is confirmed:** adopt (LCP 9.4s) is among the slowest — consistent with po-001's `getActiveAdopterCount` uncached-on-SSR diagnosis. Fix that + deploy to Vercel, THEN re-measure to find the true ceiling.

**Bottom line:** the redesign decisively wins on layout stability (CLS) and structured data, is competitive-to-better on perf for tours/gifts, but is **not yet** the speed moat the slow competitor field leaves open. The opportunity is real (every competitor is 36–60) but it requires the power-core fix + a real deploy to claim.
