# Wave 0 — Audit Synthesis

**Date:** 2026-05-26
**Skills run:** crystal-ball (W0.1), exploding-pen (W0.2), probability-storm (W0.3), matrix-reload (W0.4)
**Method:** 4 parallel Sonnet agents, each executing one skill's lightweight mode against the alpaca-farm-redesign project
**Combined wall time:** ~210s (longest agent)

## Score summary

| Skill | Mode | Score | Verdict |
|---|---|---|---|
| Crystal-ball | scan | 71/100 | NEEDS-ATTENTION |
| Exploding-pen | scan | 12 gaps found | actionable |
| Probability-storm | L1+L2 | 56% / 62% / 44% (3 decisions) | conflict surfaced |
| Matrix-reload | default | 83/100 | 2 rebuild zones identified |

## Cross-agent critical finding

**TWO independent agents flagged the same issue:** Adopt-a-Paca is suggested at **€15/mo** in `OWNER_INPUT_NEEDED.md:154-156`, but the live site charges **€75/mo** (or €900/yr prepaid) per VERIFICATION_RESULTS.md. That's a 5x gap. If the owner answers "Yes" using OWNER_INPUT_NEEDED.md as spec, the redesign ships an 80% price cut on a real revenue product without authorization. **This is the highest-priority blocker out of Wave 0.**

## Top 10 findings (ranked by leverage/effort)

| # | Finding | Source | Action |
|---|---|---|---|
| 1 | **€15 vs €75/mo Adopt price conflict** | W0.1 + W0.3 | Fix OWNER_INPUT_NEEDED.md L154-156 — flag conflict, defer to owner |
| 2 | `/api/contact` missing `escapeHtml()` → stored XSS in admin email | W0.2 | Import `escapeHtml` from `lib/html.ts`, wrap 4 fields |
| 3 | `/alpacas` not in sitemap.ts → invisible to Google | W0.2 | Add route to sitemap routes array |
| 4 | DE/IT/ES/FR translations missing `alpacas.*` keys → broken text on 4 locales | W0.1 | Add keys to 4 JSON files (English fallback or translated) |
| 5 | 7 duplicate `BASE_URL` constants across files | W0.2 | Export `SITE_BASE_URL` from `lib/config.ts`, remove duplicates |
| 6 | `experiences/romantic-sunset/page.tsx` pain 70/100 — unfinished, `as any` cast, dead UI | W0.4 | Full file rewrite (~2h) |
| 7 | `experiences/corporate-team-building/page.tsx` pain 74/100 — 42 hardcoded hex values, EN-only FAQ | W0.4 | Design-system + i18n pass (~3h) |
| 8 | GTM-NJRGZPGS open question | W0.1 | Per CLAUDE.md — either delete the reference or add the container |
| 9 | INTEGRATION_CHECKLIST body has stale unchecked boxes despite banner | W0.1 | Body checkboxes flip to ✅ to match banner |
| 10 | `/alpacas` page uses raw `<img>` not `next/Image` | W0.1 | Switch when owner provides photos (no impact while bio/photo=null) |

## Action plan — this session

**Quick wins (executing now, parallel Sonnet agents):**
- Fix #1 — Adopt price correction in OWNER_INPUT_NEEDED.md
- Fix #2 — escapeHtml in /api/contact
- Fix #3 — /alpacas in sitemap.ts
- Fix #4 — alpacas.* keys in 4 translation files
- Fix #5 — SITE_BASE_URL consolidation

**Bigger fixes (deferred to Wave 3):**
- #6 + #7 — matrix-reload's two rebuild zones go to a spec in `specs/todo/` (Wave 3 `/build`)
- #8 GTM-NJRGZPGS — needs owner clarification, stays in OWNER_INPUT
- #9 — doc cleanup, low urgency

## Things Wave 0 couldn't verify alone (real failure modes)

Aggregated "CAN'T DO WITHOUT HELP" lists from all 4 agents:

1. **Cortex history queries** — crystal-ball's L3 Decision Pattern Predictor was skipped (project rule). Decision stability is estimated, not statistical.
2. **No prior crystal-ball runs** — this is cb-001; no trend data.
3. **Live site recrawl** — REALITY_CHECK facts (names, prices, routes) assumed still current; not re-fetched.
4. **GA4 + GTM live event verification** — needs production deploy + Preview mode.
5. **FareHarbor FLOW=1257173 validity** — needs API credentials.
6. **Admin credentials exposure check** — needs Vercel dashboard access.
7. **`public/images/sunset-bg.jpg` existence** — implied missing by `// Placeholder` comment but not filesystem-verified.
8. **`public/images/hero-alpacas.webp` existence** — referenced but only placeholder SVGs found in public/.
9. **Translation key existence across 5 non-EN locales** — `translate('corporate.faq.*')` may render empty on de/it/es/nl/fr.
10. **Git churn data** — no `.git` in this project; can't see which files are frequently touched.
11. **Owner decisions** — Adopt €15-vs-€75 source, language strategy preference, Cortex policy origin.
12. **Visitor language analytics** — GA4 data needed to validate dropping IT/FR vs keeping all 6 locales.

## Roadmap update

W0.1-W0.4 all `[x]` complete. Wave 1 (Map) ready to fire if Cruz signals go. Note: Wave 3 will need a spec file for findings #6 and #7 (the matrix-reload rebuild zones).
