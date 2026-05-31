# Live-site content migration — owner review packet
**Date:** 2026-05-31  
**For:** Owner (San & Bart)  
**Reading time:** ~10 minutes  
**Purpose:** confirm what we pulled from your live site into the new site, flag what still needs your input.

---

## 1. Summary — what landed today

We scraped 29 of 32 pages on alpacasibiza.com (your live site) and migrated your own existing copy into the new site instead of leaving placeholders. Specifically:

- **14 alpaca bios** moved into the new site's data file (`lib/tenants/alpacasibiza-content.ts`). Your Dutch is preserved exactly as written; English is a fresh translation we did for you.
- **About page** — your founding story (Belgian arrival, 2019, 5 original alpacas, Maria, farm name) is now the about-page body.
- **Sustainability page** — your welfare philosophy, wool processing chain, and natural-dye process are now the sustainability-page body.
- **Alcaca Oro Negro** — the alpaca-manure product line we'd built with invented placeholder prices (€15/€45/€140) is now using your real brand name, origin story, and three tier names from your live site.

Nothing was changed about *how* the site works. This was a content drop only. Code-level functionality (checkout, emails, etc.) is unchanged.

---

## 2. Per-alpaca review

All 14 bios have your Dutch text untouched, plus a fresh English translation. The English translations need your eyes — they preserve facts (gender, role, naming origin) and try to match a warm, hand-made tone, but voice is yours to confirm.

| # | Alpaca | EN translation | Colour field | Notes |
|---|---|---|---|---|
| 1 | Avalon | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 2 | Barbarella | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 3 | Bardot | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 4 | Chet | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 5 | Dusty | needs owner review | filled from bio | |
| 6 | Fela | needs owner review | filled from bio | |
| 7 | Fonda | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 8 | Lewis | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 9 | Marron | needs owner review | filled from bio | |
| 10 | Mojo | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 11 | Moloko | needs owner review | filled from bio | NL bio in the scrape was thin — please confirm full Dutch text from your Squarespace editor |
| 12 | Nelson | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |
| 13 | Suki | needs owner review | filled from bio | |
| 14 | Toots | needs owner review | **needs confirmation** | bio doesn't mention fleece colour |

**9 of 14 alpacas need colour confirmed.** We didn't invent — if your written bio doesn't say "grey" or "brown," we left the field empty. Send any of these as: `Avalon: grey` or similar in your reply.

---

## 3. About page review

Six text blocks on the About page now carry your real copy instead of placeholders:

- **`storyText`** — your founding narrative (Belgian arrival, August 2019, 5 alpacas, Maria, farm-name etymology)
- **`weavingDescription`** — link to Wishfulfilling Weaving as a parallel craft business
- **`welfare.description`** — animal welfare philosophy paragraph
- **`sustainability.description`** — wool processing chain summary
- **`quality.description`** — natural dye process summary
- **`community.description`** — community / local-source values

Both languages — Dutch verbatim, English translated. Read the English copy on `/en/about` once we deploy and tell us anything that doesn't sound like you.

---

## 4. Sustainability page review

Six body fields populated from your live site:

- **`welfareBody`** — extended welfare paragraph
- **`craftBody`** — wool-to-textile craft chain
- **`dyesBody`** — natural dye process
- **`wasteBody`** — closed-loop / waste philosophy
- **`landBody`** — *still placeholder — needs your finca size in hectares* ⚠️
- **`sourcingBody`** — local sourcing & supplier values

One item still needs you: **finca size in hectares**. Your live site doesn't state it. Send: `finca size: X hectares`.

---

## 5. Alcaca Oro Negro review

The shop page for your fertilizer product now uses:

- **Brand name:** Alcaca Oro Negro (as on your live site)
- **Story:** the Andean "black gold" origin narrative
- **Tier names:**
  - Mini Bag — 125 g
  - Standard Bags — various sizes
  - Bulk Order — hundreds of kg

⚠️ **Prices were invented in our redesign and have been removed.** All three tiers now say "Price on request" with a contact CTA. Please send current prices in your reply, e.g.:

```
Mini Bag 125g: €X
Standard Bag (specify size): €X
Bulk Order: starts at €X / kg
```

---

## 6. Image asset decision

Your existing alpaca portraits (14) and Alcaca product photos (2) currently reference your Squarespace CDN — i.e. the URLs point at the images Squarespace is hosting for you today.

This works for launch, but you should pick how to handle them before we cut over:

| Option | What it means | Trade-off |
|---|---|---|
| **(a) Keep Squarespace URLs** | We reference your existing CDN. Works as-is. | If you cancel Squarespace, the images disappear. |
| **(b) Re-host to our Vercel deploy** | We download your photos and serve them from the new site. | One-time effort, full control. **Recommended.** |
| **(c) Use a third-party CDN (Cloudinary, etc.)** | Separate image service for faster loads. | Adds another bill. Only worth it past ~50k visitors/month. |

We recommend **(b)** for launch. Send: `option (b)` and we'll do it.

---

## 7. One small asset rename

Your Toots portrait file in Squarespace is named **`TOOTS-needwork+kopie.jpg`** — there's a typo ("needwork" instead of "needswork"). Harmless, but if you rename it in your Squarespace media manager before we cut over, we'll pick up the new name in the migration.

(Not urgent. Just flagging because we'd rather you fix the typo at the source than carry it forward.)

---

## 8. What's still owner-input-blocked

The migration today closed roughly half of the launch-content blockers. Here's what survived this round and still needs you:

| # | Item | Why | What to send |
|---|---|---|---|
| 1 | Fleece colours for 9 alpacas | bios don't mention | per-alpaca list |
| 2 | Finca size in hectares | live site doesn't state it | `finca size: X hectares` |
| 3 | Alcaca Oro Negro prices per tier | live site doesn't list current prices | per-tier prices |
| 4 | Withdrawal-waiver copy (legal review) | EU Directive 2011/83 Art 16(m) | approved copy text after legal review |
| 5 | Locale decision (ADR 025) | redesign has 6 locales; live has 2 (NL+EN) | yes/no: collapse to 2 |
| 6 | Three photos for `/visit` page | new page, no existing equivalent | shots of: car arrival, farm gate, path to the herd |
| 7 | Photo migration option (Section 6 above) | (a), (b), or (c) | letter choice |
| 8 | Per-tour FareHarbor item IDs | for the FareHarbor-fallback adapter during migration | from your FareHarbor dashboard |
| 9 | Stripe live API keys + price IDs | so the new checkout actually charges | after Stripe Atlas / EU entity completes |
| 10 | DNS records at One.com (SPF / DKIM / DMARC) | so emails reach Gmail/Outlook | run `docs/runbooks/EMAIL_DNS_SETUP.md` |

Items 4, 8, 9, 10 each have their own runbook in `docs/runbooks/` — `EMAIL_DNS_SETUP.md` and `FAREHARBOR_MIGRATION_PLAYBOOK.md` are step-by-step.

---

## Approval

If any of the above needs revision, paste the specific item and the change you want.
