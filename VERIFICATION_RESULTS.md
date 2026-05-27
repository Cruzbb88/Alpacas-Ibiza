# Verification Results — Are These Findings Real?

**Method:** 6 parallel Sonnet agents, each given ONE claim from PLAN.md/REALITY_CHECK.md and told to independently verify against the actual code/live site without trusting prior reports.

**Date:** 2026-05-26

## Verdict summary

| # | Claim | Verdict |
|---|---|---|
| 1 | Tour price split: €30 in copy vs €20 in structured data, no central constant | ✅ **PROVEN** |
| 2 | Hardcoded `reviewCount: '127'` and `ratingValue: '5'` in lib/structured-data.ts | ✅ **PROVEN** |
| 3 | Home order (Tour→Woven→Commission→Alcaca) ≠ README priority (Tour→Alcaca→Commission→Woven) | ✅ **PROVEN** |
| 4 | README/CHECKLIST are stale; INTEGRATION_STATUS supersedes them | ⚠️ **PARTIALLY-WRONG** — see below |
| 5 | Non-localized routes (`app/shop/*`, `app/about`, `app/contact`) are dead duplicates with drift | ✅ **PROVEN (with stronger evidence than I had)** |
| 6 | 14 named alpacas absent from redesign codebase | ✅ **PROVEN** — 0 hits in source |
| 7 | 6 locales (en/de/it/es/nl/fr), `en` default, GB flag (🇬🇧) for English | ✅ **PROVEN** |
| 8 | Live site is Dutch-primary | ✅ **PROVEN** |
| 9 | Live `/onze-alpacas` lists exactly 14 alpacas, names match | ✅ **PROVEN** — exact match |
| 10 | Live adoption €75/mo or €900/yr | ✅ **PROVEN** — "Je betaalt 75€ per maand" / "(900€ vooraf voor het hele jaar)" |
| 11 | Live yoga €30/person, 1h15min | ✅ **PROVEN** — "30€ per persoon voor een Alpaca Yoga-sessie van 1u 15 minuten" |
| 12 | OWNER_INPUT_NEEDED.md has Adopt at L154 (€15/mo), press at L218, FareHarbor item IDs in 🟡 | ✅ **PROVEN** — all 6 citations correct |
| 13 | OWNER_INPUT_NEEDED.md does NOT cover language strategy, individual alpacas, or Wishfulfilling brand positioning | ✅ **PROVEN** |

**Net: 12/13 PROVEN, 1/13 needs correction, 0/13 delusions.**

---

## The one correction

### Claim 4 — INTEGRATION_STATUS framing was backwards

I called INTEGRATION_STATUS_2026-04-20.md the "newer source of truth." It is actually the **oldest** of the three docs by file modification time:

- `README.md` — 2026-10-02
- `INTEGRATION_CHECKLIST.md` — 2026-06-03
- `INTEGRATION_STATUS_2026-04-20.md` — 2026-04-20

Also wrong: I framed README/CHECKLIST as "claiming SendGrid is wired." They don't — they list it as a future option ("Set up email backend (SendGrid, Mailgun, etc.)"). The Resend-vs-SendGrid contradiction is between **what the code does** and **what the docs flag as TODO**, not between two doc claims.

**What's still true:**
- INTEGRATION_STATUS_2026-04-20.md correctly documents shop as `⚪ N/A by design`, FareHarbor as wired, Resend as live.
- README & CHECKLIST still don't reflect what's actually been built since April 2026.
- The newer mtime on README doesn't mean it was updated to reflect reality — it just means it was touched. **File mtime alone isn't proof of content currency.**

**PRACTICES.md Rule 9 must update** to: don't assume newest-mtime = source-of-truth. Read content + check whether it references current state.

---

## Stronger evidence for Claim 5 (duplicate routes)

The dead-code conclusion is now MORE certain — there are **two layers** blocking the unprefixed routes:

1. `next.config.mjs:9-32` — 301 redirects fire FIRST in the Next.js request pipeline.
2. `middleware.ts:60-66` — redirect fires as a backup.

Drift evidence:
- `app/shop/woven/page.tsx`: **USD prices, 8 products** ($89.99, $189.99, $129.99, $59.99, $49.99, $99.99, $24.99, $159.99)
- `app/[locale]/shop/woven/page.tsx`: **EUR prices, 6 products** (€45, €180, €95, €65, €150, €120)
- Different currency, different SKU count, no overlap on product names like "Alpaca Blend Socks" / "Terracotta Belt."

`app/about/page.tsx` hardcodes team names Maria, Diego, Elena that don't exist on the live site. The localized about page uses i18n-driven content with breadcrumbs. **These are not the same page in two languages — they're two different drafts.**

---

## What the verification confirms about the system

- **Sonnet for parallel scans is the right tool** (per memory `feedback_model_selection`). 6 agents, ~3 minutes wall time, independent verdicts with file:line evidence. Sequential would've taken 15+ minutes and been one POV.
- **My initial REALITY_CHECK.md was 85% right** (12/13 by item count). The error wasn't hallucination — it was assuming a dated filename meant "most recent."
- **PLAN.md's Track A items all stand** (A1, A2, A3, A5, A6 verified; A4 needs reframing because INTEGRATION_STATUS doesn't supersede the newer-dated docs).

---

## Actions taken

1. ✅ PLAN.md A4 reframed (banner approach still valid, but don't claim INTEGRATION_STATUS is "the source of truth" — it's older than the docs it contradicts).
2. ✅ PRACTICES.md Rule 9 updated: mtime ≠ truth.
3. ✅ PRACTICES.md Rule 10 added: verify cross-cutting claims with parallel Sonnet agents before publishing.

---

## How to re-run this verification

Each agent prompt in `REALITY_CHECK_PROMPTS.md` is parameterized. For verification specifically, the pattern is:

```
You are given ONE claim. Independently verify by reading actual files/URLs.
Do NOT trust prior reports.
Output exactly:
  VERDICT: PROVEN | WRONG | PARTIALLY-WRONG
  Evidence:
  - file:line — "<verbatim quote>"
  Notes:
```

Spawn one agent per claim. Run in parallel. Synthesize into this file.
