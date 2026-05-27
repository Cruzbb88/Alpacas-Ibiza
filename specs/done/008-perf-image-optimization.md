---
id: "008"
title: "Performance — enable Next.js image optimization"
priority: P1
depends_on: []
est_size: S (1.5–2h)
---

## Context

Performance-optimizer (po-001) flagged `images: { unoptimized: true }` in `next.config.mjs:8` as a high-impact bottleneck. It disables WebP/AVIF conversion, responsive srcset, lazy-load, and blur placeholders globally. Hero and experience-page images serve full-resolution originals to every viewport. Recoverable LCP: ~200–500ms on image-heavy pages.

**Decoupled from beforeInteractive demote (po-001's other half):** beforeInteractive for GA4/GTM is the documented accepted decision in **ADR-006** ("GA4 beforeInteractive after three failed approaches"). Reverting it requires a new ADR. This spec covers only the image half.

Source: po-001 Secondary #2.

## Acceptance criteria

- [ ] `images: { unoptimized: true }` is removed from `next.config.mjs`.
- [ ] `next.config.mjs` has a `remotePatterns` entry for any external image hostname used in `<Image>` components (FareHarbor CDN, any CMS, etc.). Grep `<Image src=` and `<img src=` for `http` strings; add each domain.
- [ ] Above-the-fold hero `<Image>` components have the `priority` prop set.
- [ ] `next build` passes with no image optimization errors.
- [ ] Lighthouse LCP on `/en` (mobile, throttled) improves by ≥ 150 ms vs baseline (measure before + after).

## Implementation notes

- File to touch: `next.config.mjs`.
- Common candidate hero components for `priority`: `components/hero.tsx`, `app/[locale]/page.tsx`, `app/[locale]/tours/page.tsx`.
- If `unoptimized: true` was originally set to dodge a deployment issue (e.g., Vercel image limits), document the reason in the commit / ADR before removing.

## Out of scope

- beforeInteractive script-strategy demote (locked by ADR-006 — requires a new ADR to revisit).
- Alpaca card `<img>` → `<Image>` migration (covered in ep-001 G-08, separate spec).
- Removing `'use client'` from static components (po-001 Secondary #1 — larger refactor).
