# Task Radar — Alpacas Ibiza Unfinished Work
**Scan date:** 2026-05-26
**Scan level:** L1 Quick
**Sources:** OWNER_INPUT_NEEDED.md, INTEGRATION_CHECKLIST.md, PLAN.md, REALITY_CHECK.md, VERIFICATION_RESULTS.md, CLAUDE.md env tiers, code grep (TODO/FIXME/placeholder/UNMAPPED)

---

## Eisenhower Matrix

| Task | Source | Q |
|---|---|---|
| **Privacy Policy / Terms / Cookies — generic placeholder text, GDPR legal risk for EU business** | OWNER_INPUT_NEEDED.md:70-76, INTEGRATION_CHECKLIST.md Phase 6 | Q1 |
| **ADMIN_USERNAME + ADMIN_PASSWORD default `admin`/`password` — security risk before prod deploy** | OWNER_INPUT_NEEDED.md:148-149, CLAUDE.md Tier 1 | Q1 |
| **Tour price split: `translations/en.json` says €30, `lib/structured-data.ts:94` says €20 — incorrect structured data live** | PLAN.md A1, REALITY_CHECK.md Tier 1, VERIFICATION_RESULTS #1 | Q1 |
| **Hardcoded `reviewCount: '127'` / `ratingValue: '5'` in structured data — integrity risk if Google cross-checks** | PLAN.md A6, REALITY_CHECK.md Tier 5, VERIFICATION_RESULTS #2 | Q1 |
| **Dead non-localized routes (`app/shop/*`, `app/about`, `app/contact`) with USD prices and invented team names — silently diverging dead code** | PLAN.md A3, VERIFICATION_RESULTS #5 | Q1 |
| **All 14 alpaca bios + photos are `null` (UNMAPPED) — `/alpacas` page renders with empty cards** | `lib/data/alpacas.ts:5,12`, PLAN.md A5, OWNER_INPUT_NEEDED.md:21 | Q1 |
| **RESEND_API_KEY + CONTACT_EMAIL — Tier 1 required; without them transactional email throws** | CLAUDE.md Tier 1, `lib/mailer.ts:40-42` | Q1 |
| **Adopt-a-Paca page completely missing — live site has real €75/mo pricing, active revenue line** | REALITY_CHECK.md Tier 2, VERIFICATION_RESULTS #10 | Q1 |
| **Cancellation policy copy says "24h" — must match FareHarbor flow setting exactly; currently unverified** | OWNER_INPUT_NEEDED.md:38-41 | Q2 |
| **Language strategy unresolved: 6 locales configured, `en` default, GB flag — live site is Dutch-first; IT/FR untranslated** | OWNER_INPUT_NEEDED.md:14-18, PLAN.md C1, VERIFICATION_RESULTS #7 | Q2 |
| **GTM container conflict: INTEGRATION_STATUS + PLAN reference `GTM-NJRGZPGS` (primary); code only loads FareHarbor's `GTM-KR3CGLS6`** | OWNER_INPUT_NEEDED.md:32-35, CLAUDE.md open-question | Q2 |
| **Woven item prices (€45–€180) are UNMAPPED — live site has no prices, owner sign-off needed before public display** | REALITY_CHECK.md Tier 3, VERIFICATION_RESULTS #5 | Q2 |
| **Alcaca DTC prices (€15/€45/€140) are UNMAPPED — no live price exists to anchor against** | REALITY_CHECK.md Tier 3 | Q2 |
| **Tour pricing per experience type missing (anchor price on cards) — conversion lift item per OWNER_INPUT_NEEDED** | OWNER_INPUT_NEEDED.md:44-51 | Q2 |
| **Home conversion order (Tour→Woven→Commission→Alcaca) contradicts README priority order** | PLAN.md A2, VERIFICATION_RESULTS #3 | Q2 |
| **INTEGRATION_CHECKLIST Phases 4 + 5 still show unchecked (GA4, email) — stale, misleads future contributors** | PLAN.md A4, VERIFICATION_RESULTS #4 | Q2 |
| **FareHarbor per-tour item IDs (`FAREHARBOR_ITEM_*`) not yet set — per-tour Book buttons inert** | OWNER_INPUT_NEEDED.md:98-103, CLAUDE.md Tier 2 | Q2 |
| **Turnstile keys unset — forms completely unprotected by bot detection in prod** | OWNER_INPUT_NEEDED.md:157-163, CLAUDE.md Tier 2 | Q2 |
| **Vercel deploy + custom domain not done; strong admin creds not set in Vercel dashboard** | OWNER_INPUT_NEEDED.md:145-149 | Q2 |
| **Spanish legal requirements missing from footer (CIF, registered name, address)** | OWNER_INPUT_NEEDED.md:78-83 | Q2 |
| **Alpaca yoga page absent — live site has real price (€30/person, max 6)** | REALITY_CHECK.md Tier 2 | Q2 |
| **Wedding / photoshoots page absent — live site has it as distinct revenue line** | REALITY_CHECK.md Tier 2 | Q2 |
| **Invented experience routes (`/experiences/romantic-sunset`, `/family-farm-days`) not on live site — unconfirmed product lines** | REALITY_CHECK.md Tier 2 | Q3 |
| **Resend domain verification not done — emails go from Resend default domain, not alpacasibiza.com** | OWNER_INPUT_NEEDED.md:151-155 | Q3 |
| **Cron service for weekly owner digest not wired (Vercel Cron or UptimeRobot)** | OWNER_INPUT_NEEDED.md:165-170 | Q3 |
| **Google Reviews badge scaffolded but `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` not set — badge hidden** | OWNER_INPUT_NEEDED.md:138-143, CLAUDE.md Tier 2 | Q3 |
| **README sitemap stale — lists 11 routes; tree has 17 user-facing + 2 admin** | REALITY_CHECK.md Tier 1 | Q3 |
| **No Google Maps embed on Contact page — standard for appointment-only venue** | REALITY_CHECK.md Tier 5 | Q3 |
| **No sustainability page — peer norm across all 5 comparable agritourism sites** | REALITY_CHECK.md Tier 5 | Q4 |
| **Phone number unverified — Belgian +32 mobile shown; may need Spanish +34** | OWNER_INPUT_NEEDED.md:53-57 | Q4 |
| **No Open Graph image `/public/images/og-default.webp` — social preview missing** | OWNER_INPUT_NEEDED.md:264 | Q4 |
| **Wishfulfilling Weaving positioning undecided — sub-brand or top-level route?** | OWNER_INPUT_NEEDED.md:26-29, PLAN.md C3 | Q4 |

---

## Quadrant counts
- **Q1 (Do Now — Urgent + Important):** 8 items
- **Q2 (Schedule — Important, Not Urgent):** 14 items
- **Q3 (Delegate — Urgent, Not Important):** 6 items
- **Q4 (Eliminate/Defer):** 4 items

---

## Q1+Q2 Top 5 (highest combined risk × effort ratio)

1. **[Q1] Dead non-localized routes with USD prices + invented team names** — silently ship incorrect pricing/content if redirect logic ever changes. Delete now. (`app/shop/*`, `app/about`, `app/contact`)
2. **[Q1] Tour price €20/€30 split in structured data** — Schema.org validators and aggregators (farmexperiencestours.com) already show the conflict. Fix: one constant in `lib/config.ts`, update `lib/structured-data.ts:94`.
3. **[Q1] Privacy/Terms/Cookies are placeholder text** — GDPR legal risk for EU-registered business; launch blocker.
4. **[Q1] Adopt-a-Paca page absent** — live site runs it as active €75/mo revenue; redesign has zero route for it.
5. **[Q2] Language strategy unresolved** — 6 locales, wrong default, wrong flag, IT/FR untranslated. Affects SEO, first-impression locale, and translation maintenance burden.
