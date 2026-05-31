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

---

## Integrated this cycle (2026-05-31 — prose integration pass)

### Fields populated

| File | Field | Source | Value |
|---|---|---|---|
| `lib/tenants/alpacasibiza.ts` | `cif` | `/algemene-voorwaarden` — "VAT: ESY6917111J" | `'Y6917111J'` (ES prefix stripped) |
| `lib/tenants/alpacasibiza.ts` | `address.streetAddress` | `/algemene-voorwaarden` — "C/3 Bungalow Park 22, 07850 San Carlos" | `'C/3 Bungalow Park 22'` |
| `lib/tenants/alpacasibiza.ts` | `address.addressLocality` | same — locality updated from area to actual place name | `'San Carlos'` |
| `lib/tenants/alpacasibiza.ts` | `address.postalCode` | same — live site says 07850; prior value was 07819 | `'07850'` (⚠️ conflict — owner to confirm) |

### Keys NOT populated this cycle and why

| Key | Reason |
|---|---|
| `nl.json weaving.processStep*Body` | Inventory body extract for `/informatie-weaving` is English-language summary only — no verbatim Dutch paragraphs quoted. Rule 5 prohibits paraphrase. |
| `nl.json weaving.studioHistoryBody` | Same — no verbatim Dutch source in inventory for that copy block. |
| `en.json about.*.OWNER_REVIEW_TRANSLATION` | These were populated in the prior cycle and flagged for owner review. The `OWNER_REVIEW_TRANSLATION` suffix is a review flag, not a sentinel — content is already present. |
| `sustainability.landBody` UNMAPPED | Finca size in hectares is not stated anywhere on the live site. Still requires owner input. |
| `visit.*` UNMAPPED distances | Travel times/distances not in live site content. Owner input needed. |
| `about.metaTitle` in nl.json | UI string, not site copy — not in inventory scope. |
| Tenant `legalName` update | Full legal entity from inventory is "Sandra De Wilde — Es Currals Alpacas Ibiza & Wishfulfilling Weaving". Current value (`'Es Currals Alpacas Ibiza'`) is the trading name only. Expanding to include personal name has legal implications — flagged for owner to confirm with their Spanish advisor. |

### tsc result

`pnpm tsc --noEmit` — **0 errors** after all changes.

---

## Integrated this cycle (2026-05-31 — brand assets pass)

### Fields populated

| File | Field | Source | Before | After |
|---|---|---|---|---|
| `lib/tenants/alpacasibiza.ts` | `logoUrl` | `handoff/LIVE_SITE_BRAND_ASSETS.md` §1 — Header (primary) CDN URL extracted from homepage HTML | `null` | `'https://images.squarespace-cdn.com/content/v1/63f5dee81e8cfc3a0d2638e3/db346187-6229-47b0-b5d1-57ba89a893d1/LOGO-alpacas-ibiza-DEF.png'` |

### Slots NOT updated this cycle and why

| Slot | Reason |
|---|---|
| `lib/brand.ts` — all color constants | Squarespace 7.1 does not render the brand palette as static CSS. Zero hex values extractable from the 564 KB homepage fetch. Colors remain owner-input-blocked. Owner must run the DevTools snippet in `handoff/LIVE_SITE_BRAND_ASSETS.md` §"Get the palette yourself" and paste the output. Rule 5 holds — no approximation. |
| `app/globals.css` — `--primary`, `--accent`, `--background`, etc. | Same reason — no verified hex/HSL source values in scrape file. |
| `app/[locale]/page.tsx` Hero `backgroundImage` prop | No hero photo URL in scrape file. `LIVE_SITE_CONTENT_INVENTORY.md` has image URLs but no single designated hero asset was identified in `LIVE_SITE_BRAND_ASSETS.md`. |
| `lib/tenants/alpacasibiza.ts` — `faviconUrl` | Field is not present on the `Tenant` interface (specs reference it but `_types.ts` does not define it). No favicon URL in scrape file regardless. |
| Fonts (`freight-text-pro`, `Cabin`) | Font names identified but no font slots exist in `lib/brand.ts` or `lib/tenants/alpacasibiza.ts`. `freight-text-pro` requires Adobe Fonts subscription — not free. No code change warranted without owner decision and font-slot spec. |

### tsc result

`pnpm tsc --noEmit` — **0 errors**.

---

## Approval

If any of the above needs revision, paste the specific item and the change you want.

---

## 2026-05-31 (evening) — new features built

After the morning content drop, the team built and shipped 10 user-facing features. Everything below is on the new site, build-green, and ready for your approval at cutover.

### 1. What was built today

| # | Feature | Where it lives | Owner content needed? |
|---|---|---|---|
| 1 | **WhatsApp button** — floating, sitewide, opens chat with pre-filled greeting | every page (locale layout) | confirm +34 number is current ⚠️ |
| 2 | **Calendar (.ics) download** for renewal — donors add their renewal date to Google/Apple/Outlook with 7-day + 1-day reminders, yearly/monthly recurrence | adopt-thank-you success state | no — automatic |
| 3 | **Spots-left urgency banner** — "Only N spots in the next 7 days" pulled from FareHarbor availability | 7 tour pages (yoga / workshops / weddings / 3 experiences / tours hub) | needs `FAREHARBOR_ITEM_*` env vars |
| 4 | **Tour → adopt cross-sell** — "Coming back often? Adopt — tours included for the year" | same 7 tour pages | placeholder photo until you approve option (b) re-host |
| 5 | **Withdrawal-waiver checkout gate** — EU Directive 2011/83 Art 16(m) compliance | adopt page tier cards | final copy needs legal sign-off |
| 6 | **Site-wide search** — Cmd/⌘K modal, indexes all 14 alpacas + every page | header (every locale) | no — automatic |
| 7 | **`/admin` index nav** — 11 admin tools now discoverable instead of memorising URLs | `/admin` | no — automatic |
| 8 | **`/visit` page** — directions, parking, accessibility, cancellation, photos. Matches the dominant CTA on your live site ("Plan je bezoek") | `/visit` | 3 photos (arrival / gate / herd path) |
| 9 | **`/recover-certificate` flow** — donor lost their welcome email, enters email, gets cert re-sent (anti-enumeration always-200) | `/recover-certificate` | no — automatic |
| 10 | **Cancelled-checkout state** — donor closes payment window, lands on "no charge — try again / tell us what happened" instead of confused on `/adopt` | adopt thank-you component | no — automatic |

### 2. Critical fix to flag ⚠️

The WhatsApp number in the redesign was set to **+32 475 58 65 44** — a Belgian mobile inherited from an earlier tenant template (probably while you were in Belgium pre-2019). Every WhatsApp button click was opening a chat to the wrong country.

We fixed it to **+34 689 446 781**, pulled from Article 2 of your live site's `/algemene-voorwaarden` page.

**You need to confirm:** is +34 689446781 the current active WhatsApp number you want visitors to reach? If you've changed numbers since the T&C was written, send the correct one.

### 3. What still needs your content

- **#1 WhatsApp** — only needs you to confirm the number above is right
- **#3 Spots-left widget** — needs `FAREHARBOR_ITEM_*` env vars from your FareHarbor dashboard (per-tour item IDs — we couldn't extract these from the live HTML; flagged in the morning packet §8 item 8)
- **#4 Tour-to-adopt cross-sell** — uses a placeholder photo until you pick option (b) photo re-host in morning packet §6
- **#5 Withdrawal-waiver** — needs your final approved legal copy (morning packet §8 item 4)
- **#8 Visit page** — 3 photos (morning packet §8 item 6)

Everything else (calendar .ics, search, admin nav, certificate recovery, cancelled state) is fully working with zero content from you.

### 4. One-line summary

> We pulled your existing copy + built 10 new features today. Build is green. You owe us palette colours (DevTools snippet in `handoff/LIVE_SITE_BRAND_ASSETS.md`), confirmation of the +34 689 446 781 WhatsApp number, plus the 10 items already listed in §8 of the morning packet.

---

## 2026-05-31 (round 3 — late evening) — full live-site transfer continued

Continued pulling from your live site without you in the loop. Everything below landed on the new site, build green.

### Transfer log this round

| What | Source on live site | Where it landed | Status |
|---|---|---|---|
| **Logo PNG** | Squarespace CDN | `public/images/brand/logo.png` (28KB) + wired in header | ✓ live |
| **Typography** | freight-text-pro (paid) + Cabin | Spectral (free substitute) + Cabin via `next/font/google` | ✓ live |
| **T&C — all 18 articles** | /algemene-voorwaarden | `translations/nl.json` `legal.terms.art1..art18` | ✓ Dutch verbatim |
| **Corporate page copy** | /business-incentives-brainstormsessies | `corporate.liveBodyNL` / `EN` | ✓ live |
| **Weddings page** | /weddings-photoshoots | 17 NL keys under `weddings.*` | ✓ live |
| **Weaving studio info** | /informatie-weaving | 24 NL keys (Big Ben loom origin, process, dyes) | ✓ live |
| **Weaving collection intro** | /informatie-weaving-1 | `weaving.collectionSubhead` | ✓ live |
| **About / team confirmed** | /wie-zijn-wij | `about.metaTitle` + confirmation Bart/San bios already present | ✓ live |

### Pages we tried and 404'd

- `/privacy-policy` — 404
- `/privacyverklaring` — 404
- `/cookies` — 404
- `/cookieverklaring` — 404

**The live site has no published privacy or cookie policy.** GDPR + AEPD launch-blocker — needs to be written from scratch (legal copy, not engineer copy).

### Live site bug we noticed

Your `/contact-1` page on alpacasibiza.com contains a literal placeholder: **"Hier nog een tekst voorzien"** ("Text to be provided here"). Probably forgotten Squarespace editor placeholder. Worth deleting or filling before the cutover so it doesn't carry forward in any cached search snippets.

### Translation honesty flag

The Dutch T&C is standard Thuiswinkel boilerplate applying Spanish law (Article 17). Translation into EN/DE/ES/FR/IT was deliberately **left as `__UNTRANSLATED__` sentinels** rather than machine-translated — legal text should be translated by a Dutch+Spanish lawyer, not an AI agent. Either:
- Pay a legal translator (~€200-400 per legal text per locale), OR
- Accept that the new site renders Dutch legal text to non-Dutch speakers (live site does the same today)

---

## NEW: 4 scripts ready for you to paste into Chrome

We made [SQUARESPACE_DEVTOOLS_SCRIPTS.md](../../handoff/SQUARESPACE_DEVTOOLS_SCRIPTS.md) — four 30-second copy-paste console scripts that pull the things public scrape can't reach:

1. **Brand color palette** — auto-extracts every brand color token. Paste into the live site's console.
2. **Full media library** — lists every photo Squarespace is hosting for you, with filenames + dimensions. Paste into your Squarespace dashboard's media manager.
3. **FareHarbor item IDs** — visits-each-page accumulator that builds a tour→ID map across visits. The thing that unblocks every per-tour booking CTA on the new site.
4. **Page slugs incl. drafts** — lists every page (including drafts you may have started and forgotten). Paste into the Pages panel of your Squarespace dashboard.

Total of ~5 minutes of clicking. No command line. Each script copies its result to clipboard — paste back to us. Instructions in the file.

### Why these scripts matter

For (3) FareHarbor IDs especially: that single piece of information is the difference between "every redesign tour button drops you on the master calendar" and "every redesign tour button pre-selects the right tour." We've been blocked on this since cycle 13.

For (1) the palette: this is the last visual gap. Once we have the hex codes the new site is visually 1:1 with your existing brand identity.

### Cumulative content transfer state

Across the three transfer rounds today:
- Alpaca bios: ✓ all 14 transferred
- About / founding story: ✓ transferred
- Sustainability copy: ✓ transferred
- Alcaca product info: ✓ transferred
- T&C: ✓ transferred (NL only — see flag above)
- Privacy policy: ❌ doesn't exist on live site — needs to be written
- Cookie policy: ❌ doesn't exist on live site — needs to be written
- Logo: ✓ downloaded + wired
- Fonts: ✓ free-substituted (Spectral + Cabin)
- Brand colors: ⏳ owner runs script 1
- Media library: ⏳ owner runs script 2
- FareHarbor IDs: ⏳ owner runs script 3
- Draft pages: ⏳ owner runs script 4
- Per-tour content: ✓ transferred
- Per-experience content: ✓ transferred
- Weddings: ✓ transferred
- Weaving: ✓ transferred (studio + process + collection intro)
- Corporate: ✓ transferred
