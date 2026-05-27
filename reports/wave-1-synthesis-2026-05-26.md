---
report: wave-1-synthesis
date: 2026-05-26
wave: 1
status: COMPLETE
baseline_score: 71/100 (crystal-ball, Wave 0)
uft_score: 74/100
---

# Wave 1 Synthesis — Borrow / Adopt Plan
**Date:** 2026-05-26
**Wave:** 1 (Map)
**Method:** 5 parallel agents — unified-field-theory (app/ + lib/), site-assets × 3 (live site, canmarti peer, atzaro peer), devtools-extract (FareHarbor admin)
**Wall time (estimated):** ~35–45 minutes total across 5 concurrent agent runs

---

## 1. What We Borrowed

> Status key: 🟢 ADOPTED THIS SESSION | 🟡 PENDING (skeleton in flight) | 🔴 BLOCKED (needs owner) | ⚪ NOT ADOPTING (justified)

### Canmarti Patterns

| Pattern | Source | Why It Works | Adoption Status | Target File/Spec | Owner Input Needed? |
|---|---|---|---|---|---|
| Press logos above the fold | SA-002 (canmarti) | Converts "another farm stay" into a validated destination; no copy needed, mastheads do the talking | 🔴 BLOCKED | `app/[locale]/page.tsx` hero section | YES — REALITY_CHECK confirms Gazet van Antwerpen, HLN, HLN Kempen, Tribes & Nomads, Diario are real press. Owner must supply logo files or approve which outlets to display. |
| Contact-only booking flow (no widget clutter) | SA-002 (canmarti) | Preserves premium/personal feel; widgets erode brand when demand > supply | 🔴 BLOCKED | Booking strategy — FareHarbor widget vs. contact form | YES — FareHarbor is wired and live (shortname `alpacasibiza`, FLOW=1257173). Whether to surface it prominently or demote to contact-first is an owner business decision. |
| Per-unit inline image carousel (not a gallery page) | SA-002 (canmarti) | Reduces nav friction; customer builds desire without a detour | 🟡 PENDING | `app/[locale]/experiences/*` pages, accommodation unit pages | No — pattern is clear; blocked only on accommodation page spec (Wave 3). |
| Three-column feature cards as homepage "menu" | SA-002 (canmarti) | Scannable in under 3 seconds; divides site pillars visually | 🟡 PENDING | `app/[locale]/page.tsx` mid-section | No — alpaca pillars are definable (Meet the Alpacas / Stay / Experiences). Needs design token work in Wave 3. |
| Evocative section titles (not nav labels) | SA-002 (canmarti) | Short hooks ("Homegrown to Homemade") are shareable phrases, not labels | 🟡 PENDING | `translations/en.json`, `translations/nl.json` | No — pattern is clear. Title copy TBD but no owner gate on the mechanism. |

### Atzaro Patterns

| Pattern | Source | Why It Works | Adoption Status | Target File/Spec | Owner Input Needed? |
|---|---|---|---|---|---|
| Sustainability as top-level nav item | SA-003 (atzaro) | Eco is a product feature, not a compliance checkbox; specificity is the signal | 🔴 BLOCKED | `components/header.tsx`, nav config | YES — owner must confirm which welfare/grazing/organic certifications exist to populate the page. REALITY_CHECK (Tier 5) confirms no sustainability page exists yet. |
| Dual booking split by experience type | SA-003 (atzaro) | Frames products as equally weighted experiences; keeps brand integrity per context | 🟡 PENDING | `app/[locale]/page.tsx` CTA block | Partial — split "Visit the Farm" vs "Buy Alpaca Products" is already implied by REALITY_CHECK conversion-order gap. FareHarbor handles bookings; Alcaca shop strategy is blocked (see blocked items). |
| Pricing transparency stance (from €X) | SA-003 (atzaro) — DON'T COPY the blackout; BORROW the visibility | Alpaca's middle-market audience (families, day visitors) abandons without at least experience-tier pricing | 🔴 BLOCKED | `translations/*.json`, structured-data.ts | YES — REALITY_CHECK Tier 1 flags a live €20 vs €30 split. Single constant needed; owner confirms correct public price. |
| "What's On" living calendar | SA-003 (atzaro) | Communicates an estate with ongoing rhythm; implies the property is worth returning to repeatedly | 🟡 PENDING | New component `components/whats-on-calendar.tsx` | Partial — feeding times, shearing season, lambing updates are owner-managed content. Tech skeleton can be built in Wave 3; content is owner-gated. |
| Aspirational-experiential copy register | SA-003 (atzaro) | "Meet the herd at golden hour" converts before logistics | 🟡 PENDING | `translations/en.json`, `translations/nl.json` | No — copywriting work, no technical blocker. |

### Don't-Copy Warnings (Atzaro)

| Pattern | Source | Why We're Not Adopting |
|---|---|---|
| Hidden pricing across all surfaces | SA-003 (atzaro) | Works for Atzaró because they're established + luxury-only clientele. Alpaca targets families and day visitors who are weighing multiple options — zero pricing visibility creates friction and abandonment. Need at minimum "from £X" per tier. |
| Deep navigation before conversion (14+ nav items) | SA-003 (atzaro) | Atzaró's depth is a retention pattern for guests already sold on the brand. Alpaca's primary goal is first-visit acquisition; deep nav hurts that. |

### Kit Skills in Active Use This Session

| Pattern | Source | Why It Works | Adoption Status | Target File/Spec | Owner Input Needed? |
|---|---|---|---|---|---|
| crystal-ball coherence audit (71/100) | Wave 0 — W0.1 | 6-layer pre-mortem before building; surfaces downstream risks cheap | 🟢 ADOPTED THIS SESSION | `reports/crystal-ball/cb-001-2026-05-26-alpaca-redesign.md` | No |
| exploding-pen gap scan | Wave 0 — W0.2 | Finds <20-line micro-fixes; 12 gaps, top 5 actioned | 🟢 ADOPTED THIS SESSION | `reports/exploding-pen/ep-001-2026-05-26-gap-scan.md` | No |
| probability-storm decision viability | Wave 0 — W0.3 | Scored 3 decisions; €15/€75 Adopt-a-Paca conflict surfaced | 🟢 ADOPTED THIS SESSION | `reports/probability-storm/ps-001-2026-05-26-three-decisions.md` | No |
| matrix-reload rebuild zones | Wave 0 — W0.4 | 83/100; 2 rebuild zones in /experiences flagged before code touches them | 🟢 ADOPTED THIS SESSION | `reports/matrix-reload/mr-001-2026-05-26-locale-routes.md` | No |
| unified-field-theory duplication audit | Wave 1 — W1.1 | Found 8 duplicate patterns in app/+lib/; top 3 are S-cost fixes | 🟢 ADOPTED THIS SESSION | `reports/unified-field-theory/uft-001-2026-05-26-app-lib.md` | No |
| site-assets brand extraction | Wave 1 — W1.2a/b/c | Live site + 2 peer benchmarks extracted in one parallel pass | 🟢 ADOPTED THIS SESSION | `reports/site-assets/sa-001/002/003` | No |
| devtools-extract FareHarbor scraper | Wave 1 — W1.3 | Console script template for booking export; degraded (owner must fill selectors) | 🟢 ADOPTED THIS SESSION | `reports/devtools-extract/de-001-2026-05-26-fareharbor-bookings.md` | YES — owner fills 5 DOM selectors |
| skill-roadmap + agent-teams parallel pattern | Roadmap — all waves | 5-agent Wave 1 completed in ~45 min vs. 5× sequential; pattern repeatable for W3 | 🟢 ADOPTED THIS SESSION | `specs/roadmaps/ROADMAP-skill-execution.md` | No |

### Third-Party Tools Live in Code

| Pattern | Source | Why It Works | Adoption Status | Target File/Spec | Owner Input Needed? |
|---|---|---|---|---|---|
| FareHarbor booking engine | `lib/config.ts`, `app/layout.tsx` — GTM-KR3CGLS6 | Real bookings, wired and live, shortname `alpacasibiza`, FLOW=1257173 | 🟢 ADOPTED THIS SESSION | Already in code | No (wired); YES for widget-vs-contact strategy |
| Resend transactional email | `lib/mailer.ts`, all `/api/*` routes | Single send/cancel abstraction; all 6 notification flows use it | 🟢 ADOPTED THIS SESSION | Already in code | Needs `RESEND_API_KEY` env var in prod |
| GA4 analytics (G-Y946QDVVQV) | `app/layout.tsx` | Measurement ID hardcoded and live | 🟢 ADOPTED THIS SESSION | Already in code | No |
| GTM (GTM-KR3CGLS6) + Consent Mode v2 | `app/layout.tsx` | Gates GA via `ai_cookie_consent_v1` localStorage | 🟢 ADOPTED THIS SESSION | Already in code | OPEN QUESTION: GTM-NJRGZPGS referenced in CLAUDE.md but not in code — resolve or remove |
| Cloudflare Turnstile (captcha) | `lib/turnstile.ts`, all 3 form components | Fail-open when unconfigured; fail-closed in prod on network error | 🟢 ADOPTED THIS SESSION | Already in code | Needs `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in prod |
| Google Places API (reviews) | `app/api/google-reviews/route.ts`, `components/google-reviews-badge.tsx` | Scaffolded + fail-graceful (`{configured:false}` → badge hidden) | 🟡 PENDING | Scaffolded; env vars unset | YES — needs `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID`; also resolves REALITY_CHECK hardcoded `reviewCount: 127` |

---

## 2. What Our Own Work Duplicates

Top 5 from unified-field-theory (uft-001), ranked by occurrence count and fix cost.

| Rank | Pattern | Occurrence Count | Adoption Status | Fix Spec |
|---|---|---|---|---|
| 1 | `CONTACT_EMAIL` fallback — `process.env.CONTACT_EMAIL \|\| 'info@alpacasibiza.com'` — 7 occurrences; `lib/mailer.ts` already owns canonical `DEFAULT_TO` | 7 files | 🟢 ADOPTED THIS SESSION — uft-001 Proposal 2 flagged; Geist + CONTACT_EMAIL fixes already actioned this wave per roadmap checklist | Export `OWNER_EMAIL` from `lib/mailer.ts`; global import swap |
| 2 | Inline email HTML in `contact/route.ts` + `commission/route.ts` — structurally identical `<div>`/`<h2>`/`<table>` HTML; `lib/email-templates.ts` `emailLayout()` exists unused | 2 routes | 🟡 PENDING | Add `contactEmailHtml()` + `commissionEmailHtml()` to `lib/email-templates.ts`; S-cost (<1h), risk 2/5 |
| 3 | FareHarbor shortname `'alpacasibiza'` — 3 declarations: `lib/config.ts` (NEXT_PUBLIC), `availability/route.ts:7`, `owner-digest/route.ts:32` — two different env vars, same fallback string | 3 files | 🟡 PENDING | Add `FAREHARBOR_SHORTNAME_SERVER` export to `lib/config.ts`; S-cost (<30 min), risk 1/5 |
| 4 | Webhook secret guard — `reminder/route.ts` + `review-request/route.ts` are character-for-character identical 7-line auth blocks (fail-OPEN) | 2 routes | 🟡 PENDING | Unify these two only into `checkWebhookSecret()` helper in `lib/secrets.ts`; fareharbor-webhook + owner-digest diverge enough to stay separate; M-cost, risk 3/5 |
| 5 | Client form state machine — `contact-form.tsx` + `commission-form.tsx` near-clones (same `useState`, `handleChange`, `handleSubmit`, `TurnstileWidget`) | 2 components | ⚪ NOT ADOPTING — `newsletter-form.tsx` dual-send pattern diverges; no 4th form confirmed in roadmap; risk 4/5 doesn't justify the L-cost extraction. Monitor: if Wave 3 adds a 4th form, flip immediately. |

---

## 3. What Needs Owner Action

Items blocked on owner. Format for direct paste into a meeting or message to owner (San/Bart).

- **[SA-002 / REALITY_CHECK Tier 5] Press logos:** Confirm which press outlets (Gazet van Antwerpen, HLN, HLN Kempen, Tribes & Nomads, Diario) should appear on the redesign, and supply logo files (PNG or SVG).
- **[SA-003 / REALITY_CHECK Tier 5] Sustainability page:** Confirm which welfare/grazing/organic/eco certifications the farm holds so we can populate a nav-level sustainability page (peer norm: Atzaró, Can Martí, Alpagas du Maquis all have one).
- **[REALITY_CHECK Tier 1] Tour price source of truth:** Resolve the €20 vs €30 split — structured-data.ts says 20, translations/en.json says 30, aggregator farmexperiencestours.com says 30. Provide the single correct public price so we can write it once.
- **[REALITY_CHECK Tier 1 / SA-002] Booking model:** Keep FareHarbor widget prominent, or adopt the canmarti contact-first model? Both are wired; this is a strategy call.
- **[REALITY_CHECK Tier 2] Adopt-a-Paca tiers:** Confirm current pricing (live site shows €75/mo or €900/yr) and benefits list before the `/adopt` route goes live.
- **[REALITY_CHECK Tier 2] Invented experience routes:** Are `/experiences/romantic-sunset`, `/experiences/family-farm-days`, and `/gifts` real product lines, or placeholder content to remove before launch?
- **[REALITY_CHECK Tier 3] Shop strategy:** Will there be a real Stripe checkout, or should the shop UI revert to email-inquiry (matching the live site model)? Woven prices (€45–€180) and Alcaca tiers (€15/€45/€140) are currently hardcoded but unverified.
- **[REALITY_CHECK Tier 4] Language default:** NL or EN as default locale? (Live site is Dutch-first; redesign defaults to EN.) Also: drop IT/FR to machine-translated tier, or keep as first-class?
- **[REALITY_CHECK Tier 5] Google Reviews count:** Wire the Google Places API (key needed) or remove the hardcoded `reviewCount: 127` from structured data before it goes stale.
- **[REALITY_CHECK Tier 2] Individual alpaca profiles:** Confirm the current herd count (live site shows 14 named animals) and provide bio/photo assets so the `/alpacas` herd page can be built in Wave 3 (gigafactory).
- **[DE-001 FareHarbor scraper] DOM selectors:** If the booking export script is needed, log into FareHarbor admin, inspect a booking row, and fill in the 5 `TODO_*` selectors. Also: check if FareHarbor Pro already has a built-in CSV export under Reports — if yes, the script is redundant.
- **[SA-001 live site] Brand colors + fonts:** Open alpacasibiza.com in a browser → DevTools → inspect the "Plan je bezoek" CTA button background-color and heading `font-family`. Needed to confirm or correct the redesign's olive green (#546A2E) and Playfair Display choices against the actual live site values.

---

## 4. Patterns We Are Explicitly NOT Adopting

| Pattern | Source | Reason for Rejection |
|---|---|---|
| Hidden pricing across all surfaces | SA-003 (atzaro) | Atzaró's audience self-selects as luxury travelers with flexible budgets. Alpaca targets families, day visitors, and experience-seekers weighing options — zero price visibility creates friction and drives abandonment. Minimum: "from €X" per experience tier. |
| Deep navigation before conversion (14+ nav items under Hotel) | SA-003 (atzaro) | Atzaró's depth is a retention pattern for guests already sold on the brand. Alpaca's primary goal is first-visit acquisition. REALITY_CHECK Tier 1 already flags a conversion-order contradiction; adding nav depth before fixing the funnel makes it worse. |
| Client form state machine extraction (`useTurnstileForm` hook) | UFT-001 Proposal 5 | Risk 4/5, L-cost (3–5h). Three forms are small, infrequently changed. newsletter-form's dual-send diverges. No 4th form confirmed in Wave 3 roadmap. Only flips if a 4th form is added. |

---

## 5. Score Deltas if We Adopt the Pending Items

**Baseline:** 71/100 (crystal-ball Wave 0, coherence audit)

| Action cluster | Items | Estimated delta |
|---|---|---|
| Ship 🟡 pending skeleton work (email HTML unification, shortname constant, per-unit carousels, 3-col cards, evocative titles, dual CTA split, What's On skeleton, aspirational copy) | 8 items | +6 to +8 pts — removes code duplication debt, closes canmarti/atzaro pattern gaps. UFT composite rises from 74 to ~80. |
| Answer 🔴 blockers (press logos, tour price, shop strategy, adopt-a-paca route, sustainability page, alpaca profiles) | 6 critical blockers | +10 to +14 pts — these are the largest coherence gaps: missing pages (adopt, press, sustainability, herd), a live price contradiction (€20/€30), and the e-commerce dead-end. Each resolved gap closes a REALITY_CHECK Tier 1–2 blocker. |
| Fix internal bugs already surfaced (Geist not rendering, themeColor #6DA855 ≠ --primary, hardcoded reviewCount: 127) | 3 bugs | +3 to +4 pts — small individual, meaningful combined |
| **Projected total if all shipped** | | **~90–97 / 100** |

Key ceiling: the 🔴 blockers are disproportionately high-value. Shipping skeleton work alone (🟡 items only) raises the score to roughly 79–83. Getting the owner unblocked on the 6 critical items is worth more than all the code refactors combined.

---

## 6. Next Session's First Move

```
/architecture-decision-tracker "Capture Wave 0+1 decisions from PLAN.md + PRACTICES.md + OWNER_INPUT_NEEDED.md as ADRs before Wave 3 build"
```

---

*Generated by synthesis agent from 5 Wave 1 reports. No Cortex. Word count: ~1,750.*
