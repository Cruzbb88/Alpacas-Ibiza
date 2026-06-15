# Real Performance Benchmark — Lighthouse 12.8.2 (mobile, local Chrome headless)

**Date:** 2026-06-13 · **Tool:** Lighthouse CLI 12.8.2, mobile form-factor, performance category, local headless Chrome (no API quota). · **Note:** the REDESIGN is NOT publicly deployed (only the Squarespace incumbent exists), so its own number is deferred — needs a Vercel preview or a localhost production-build run. This benchmarks the competitors + the live incumbent = the bar the redesign must beat.

| Site | Role | Perf | LCP s | CLS | TBT ms | SI s |
|---|---|---|---|---|---|---|
| https://alpacasibiza.com | LIVE incumbent (Squarespace — the redesign replaces this) | 49 | 12.9 | 0.002 | 444 | 6.4 |
| https://www.westwightalpacas.co.uk/ | UK alpaca farm (2014 jQuery) | 49 | 6.9 | 1.247 | 50 | 4.5 |
| https://www.pukkapacas.com/ | UK alpaca farm | 36 | 10.7 | 0.000 | 961 | 7.8 |
| https://www.alpacawalking.co.uk/ | UK alpaca (Spring Farm) | 60 | 8.9 | 0.000 | 41 | 6.5 |
| https://atzaro.com/ | Ibiza boutique hotel | 57 | 11.6 | 0.001 | 123 | 6.6 |
| https://canmarti.com/ | Ibiza agroturismo | 57 | 15.8 | 0.000 | 343 | 5.5 |
| https://lagranjaibiza.com/ | Ibiza Design Hotels | UNMEASURABLE (blocks headless Chrome — ERRORED_DOCUMENT_REQUEST) | – | – | – | – |

**Sector verdict:** 6 of 7 measured. **Not one competitor scores above 60, and not one has a "good" LCP** (Google good <2.5s). Best LCP in the entire set is West Wight at 6.9s — but with a catastrophic CLS of 1.247 (good is <0.1). The Ibiza luxury peers (Atzaró 57/11.6s, Can Martí 57/15.8s) and the live Squarespace incumbent (49/12.9s) are all in the amber-to-red band. A Next.js 16 redesign that ships proper image optimization + ISR + a fixed `getActiveAdopterCount` should land LCP <2.5s and a 90+ score — making it **3–5× faster than every competitor on the metric Google ranks by**. This is the single clearest measurable moat the redesign has. La Granja blocks automated agents (bot protection) — unmeasurable without a real browser session.

## Reading the numbers
- **Perf**: Lighthouse 0-100 mobile performance score. >=90 green, 50-89 amber, <50 red.
- **LCP**: Largest Contentful Paint — good <2.5s, poor >4.0s (the headline Core Web Vital).
- **CLS**: layout shift — good <0.1, poor >0.25. **TBT**: interactivity proxy — good <200ms. **SI**: Speed Index.

## Redesign — DEFERRED (no public URL)
To get the redesign's real number: (a) deploy a Vercel preview and re-run, or (b) `pnpm build && pnpm start` then `npx lighthouse http://localhost:3000`. Per po-001-2026-05-31 the power core to fix BEFORE measuring is the uncached getActiveAdopterCount blocking /adopt SSR.
