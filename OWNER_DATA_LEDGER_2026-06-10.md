# Owner Data Ledger — everything the site needs that only the owner can supply
**Compiled 2026-06-10.** Exhaustive, file-cited. This is the master "what's missing" list.

This ledger is the definitive answer to: *"the official website should have everything — if it's missing anything it must be clearly noted."* Every item below is either **null / empty / a placeholder / unverified-scraped** in the code, or a **launch decision** only the owner can make. Each row cites `file:line` so it can be filled directly.

**Legend:** ⚠️ launch-blocker · 🟡 needed soon after launch · 🟢 optional/later
**Recoverable?** Some gaps marked **↩ LIVE** can be pulled from the existing live site (alpacasibiza.com) instead of asking the owner — noted where true.

> Companion docs: [OWNER_INPUT_NEEDED.md](OWNER_INPUT_NEEDED.md) (narrative + access/accounts), [OWNER_LAUNCH_RUNBOOK.md](OWNER_LAUNCH_RUNBOOK.md), [ROADMAP_2026-06-09.md](ROADMAP_2026-06-09.md) (build lanes). Where this ledger and OWNER_INPUT_NEEDED disagree, **this ledger is newer** — see §8 corrections.

---

## 0. Live-site → redesign page parity (no whole section is missing)

Every page on the live Dutch site maps to a redesign page. Page coverage is **complete**; the gaps are *content inside* the pages (§1–§7), not missing pages.

| Live page (alpacasibiza.com) | Redesign route | Status |
|---|---|---|
| `/wie-zijn-wij` (who we are) | `/about` | ✓ |
| `/wat-doen-wij` (what we do — overview) | homepage / `/about` | ✓ overview content present |
| `/wat-doen-wij-1` (Media) | `/media` | ✓ page exists — **empty until photos added (§2)** |
| `/informatie-weaving` | `/weaving` | ✓ — studio history UNMAPPED (§7) |
| `/informatie-weaving-1` (Onze collectie) | `/shop/woven` | ✓ — 6 product slots UNMAPPED (§6) |
| `/alpacas-ibiza` | `/about` / homepage | ✓ |
| `/onze-alpacas` (our alpacas) | `/alpacas` + `/alpacas/[slug]` | ✓ — 14 names present, **bios null (§1, ↩ LIVE)** |
| `/weddings-photoshoots` | `/weddings` | ✓ — details "contact us" (§6) |
| `/adopt-a-paca` | `/adopt` | ✓ live (€75/mo · €900/yr) |
| `/alpaca-yoga` | `/yoga` | ✓ **facts verified 2026-06-10** (€30, 1h15m, max 6, Wed/Sat) |
| `/alpaca-yoga-1` (Workshops) | `/workshops` | ✓ — price/group UNMAPPED (§6) |
| `/business-incentives-brainstormsessies` | `/experiences/corporate-team-building` | ✓ — itinerary needs verify (§8) |
| `/weddings-photoshoots-1` (Alcaca) | `/shop/alcaca` | ✓ — prices UNMAPPED (§6) |
| `/contact` | `/contact` | ✓ — directions UNMAPPED (§5) |

---

## 1. Alpacas — bios, birth dates, colours ✅ MOSTLY DONE (verified 2026-06-10)

**Corrected:** the bios are NOT missing. `lib/tenants/alpacasibiza-content.ts` (the content provider the public `/alpacas` + `/alpacas/[slug]` pages read via `listAnimals()`) already has all 14 bios fully populated — Dutch + faithful English `localizedBio`, plus `color`, `personality`, `fun_fact` — recovered from the live individual profile pages and verified to match. The earlier "bio: null" finding was a false alarm: the `bio` field is intentionally null because `localizedBio` is the live source (`resolveAnimalBio()` reads it first).

**Fixed this session:** the donor-portal `/my-adoption` page was reading the always-null `animal.bio` directly, so adopters never saw the bio — now routed through `resolveAnimalBio()` ([my-adoption/page.tsx:194](app/[locale]/my-adoption/page.tsx#L194)).

**What actually remains for the owner (small):**

| Item | File:line | Current | Needed |
|---|---|---|---|
| Birth dates — 11 of 14 | `lib/data/alpacas.ts:50,51,54–62` | `birthDate: null` | DOB `YYYY-MM-DD` — **not published on the live site either**; owner-only. Powers birthday-card cron; harmless if left null |
| Birth dates — Bardot/Chet/Toots | `lib/data/alpacas.ts:52,53,63` | `2022-01-19 / 2020-11-20 / 2021-02-03` (from live bio prose) | Owner confirm exact day |
| EN bio translation sign-off | `lib/tenants/alpacasibiza-content.ts` (each entry flagged `OWNER_REVIEW_TRANSLATION`) | auto-translated from owner's Dutch | Owner proofread (content is real, translation is ours) |
| Fleece colours — Avalon, Chet, Fonda, Moloko | `lib/tenants/alpacasibiza-content.ts` | `color: null` | Genuinely **not stated** on the live profiles — owner-only if wanted |

---

## 2. Photos, media & video ⚠️ (the #1 gap)

The site is built to render-null until real photos exist, so nothing looks broken — but large areas are dark.

| Item | File:line / location | Current | Needed |
|---|---|---|---|
| Home hero / OG share image | `lib/tenants/alpacasibiza.ts:123` (`ogImageUrl: null`) | none | 1200×630 hero/OG image |
| `/media` galleries | `lib/data/media.ts` entries | no `status:'live'` w/ image | Photos → `public/images/gallery/`, set `status:'live'` |
| `/visit` virtual farm tour — 5 stops | `lib/data/media.ts:104,113,119,125,131` | `imageSrc:null`, `status:'draft'` | 5 photos (Main Pasture, Weaving Studio, Paddock, Finca Garden, Countryside) |
| Journal post covers ×3 | `lib/data/journal-posts.ts:89,112,134` | `null` | `.webp` at `public/images/journal/<slug>.webp` |
| Author headshots — San, Bart | `lib/data/journal-posts.ts:60,65` | `null` | Two headshots |
| Team photos + bios (Bart, San) | `lib/tenants/alpacasibiza-content.ts:318` (`team: []`) | empty | Names + portrait + short bio each |
| Press logos ×6 | `lib/data/press.ts:47,54,61,68,75,82` | `logoUrl:null` | SVG/PNG → `public/images/press/<slug>.svg` |
| Greeting-card designs | `lib/data/greeting-cards.ts:37–53` | `[]` | Card thumbnails → `public/images/cards/`, `status:'live'` |
| Shop product photos (woven ×6) | `app/[locale]/shop/woven/page.tsx` slots | UNMAPPED | Photos → `public/images/weaving/` |
| Optional: 15–30 s farm video | hero | none | lifts engagement ~30% |

---

## 3. Prices & FareHarbor item IDs ⚠️

**Verified against live 2026-06-10:** Yoga **€30 / person, 1 h 15 min, max 6, Wed + Sat**. The single Alpaca Tour shows **€21.19** in our OG image — *owner must confirm this is current.*

| Item | File:line | Current | Needed |
|---|---|---|---|
| Alpaca Tour base price | `app/[locale]/tours/opengraph-image.tsx:57` | "From €21.19" | Confirm current price |
| Alcaca (manure) — per tier | `app/[locale]/shop/alcaca/page.tsx:44,51,57,63,83` | "Price on request" / `priceEur:0` | Price per 125 g / bag / bulk |
| Woven goods — 6 items | `app/[locale]/shop/woven/page.tsx:45–49,73` | UNMAPPED / `priceEur:0` | Name + price each |
| Weaving workshop — price/duration/capacity | `lib/tenants/alpacasibiza-content.ts:299–301` | `null` | Price, minutes, max group |
| Weddings/photoshoots — alpaca count, duration, radius, handler | `app/[locale]/weddings/page.tsx:37–43` | "Contact us for details" | Confirm each |
| Workshops — price + max group | `app/[locale]/workshops/page.tsx:52,75` | "Contact for details" | Price, capacity |
| FareHarbor item IDs (all) | `lib/tenants/alpacasibiza.ts:166–176`, `lib/config.ts:125–141` | `undefined` | Numeric IDs from FareHarbor admin → Items (tour, yoga, weaving-workshop, weddings, photoshoots, romantic-sunset, family-farm-days, business-incentives, gift-card, woven, alcaca, commission). Until set, Book buttons fall back to the main calendar |
| Adopt discount codes | env `ADOPT_DISCOUNT_CODE_WEAVING_10`, `..._FARMSHOP_15` | unset | Create in Stripe; new-adopter email shows "within 48 h" until set |
| Tour cancellation policy | every Book CTA | "Free cancellation up to 24h" | Confirm exact policy — **must match FareHarbor setting** |

---

## 4. Legal & company identity ⚠️ (GDPR / Spanish law)

| Item | File:line | Current | Needed |
|---|---|---|---|
| Privacy / Terms / Cookies / Impressum text | `app/[locale]/{privacy,terms,cookies,impressum}/page.tsx` | amber "content pending" notice shown to real visitors; gated by `LEGAL_CONTENT_LIVE` | Lawyer-reviewed copy, then set `LEGAL_CONTENT_LIVE=true` |
| EU Art 16(m) withdrawal waiver copy | `translations/en.json` → `adopt.legal.withdrawalWaiver`; `components/adopt/checkout-gate.tsx` | placeholder; DE/ES/FR/IT `__UNTRANSLATED__` | EU consumer-law lawyer to approve (pre-ticked boxes invalidate it) |
| CIF (Spanish tax ID) | `lib/tenants/alpacasibiza.ts:32` | scraped `Y6917111J` | Owner confirm still active |
| EU VAT number | `lib/tenants/alpacasibiza.ts:39` | scraped `ESY6917111J` | Owner confirm |
| Postal code | `lib/tenants/alpacasibiza.ts:87` | `07850` (was 07819 conflict — 07850 set as canonical) | Owner confirm |
| Turismo Activo registration | `lib/tenants/alpacasibiza.ts:203` | `null` | Registro Insular de Turismo number |
| Carnet manipulador de alimentos | `lib/tenants/alpacasibiza.ts:209` | `null` | Cert number if held |
| Trust badges / eco certs (CBPAE etc.) | `lib/tenants/alpacasibiza.ts:215` | `[]` | Badge logos + numbers (footer trust section hidden until ≥1) |
| Registered business name / address (full) | `lib/tenants/alpacasibiza.ts` | partial | Full legal name + address |

---

## 5. Contact & social ⚠️/🟡

| Item | File:line | Current | Needed |
|---|---|---|---|
| Public phone | `lib/tenants/alpacasibiza.ts:58` | scraped Belgian `+32475586544` | Confirm correct public number |
| WhatsApp | `lib/tenants/alpacasibiza.ts:64` | scraped `+34689446781` | Confirm Spanish WhatsApp Business |
| Transactional sender email | `lib/tenants/alpacasibiza.ts:57` (`noreplyEmail:null`) | none | e.g. `hello@alpacasibiza.com` (after Resend domain verify) |
| Press alias | `app/[locale]/press-kit/page.tsx:235` | falls back to `info@` | Confirm `press@` exists or not |
| Instagram (canonical) | `lib/tenants/alpacasibiza.ts:140` | conflict: `wishfulfillingweaving` vs `@alpacasibiza` | Confirm canonical handle |
| Twitter/X | `lib/tenants/alpacasibiza.ts:157` | `null` | Handle if exists |
| Google review short-link / Place ID | `lib/tenants/alpacasibiza.ts:152` | `null` | Place ID + review link |
| Geo coordinates | `lib/tenants/alpacasibiza.ts:91–93` | `38.9861, 1.5228` unverified | Confirm against Maps pin |
| Directions (Ibiza Town / Santa Eulàlia / airport / bus / What3Words) | `app/[locale]/contact/page.tsx:185,197,209,221` | `[UNMAPPED]` inline | Real drive times, airport km, bus walk, W3W |

---

## 6. Page-level UNMAPPED placeholders visible in dev (owner checklists)

These render `[UNMAPPED]`/owner banners in dev/staging and degrade gracefully in production. Each is a concrete owner to-do.

| Page | File:line | Owner must supply |
|---|---|---|
| `/yoga` banner | `app/[locale]/yoga/page.tsx:282–293` | start time, off-season schedule, mat provision, instructor name+bio, hero photo, FH yoga item ID |
| `/weaving` | `app/[locale]/weaving/page.tsx:108,194–205` | studio history + process steps + 3 hero photos |
| `/sustainability` | `app/[locale]/sustainability/page.tsx:91,164–173` | finca size (hectares), certifications, hero image, alpaca head count |
| `/adopt` banner | `app/[locale]/adopt/page.tsx:550–609` | payment vendor, per-alpaca adopter cap, nav placement |
| `/press-kit` | `app/[locale]/press-kit/page.tsx:38–48,235` | logo pack, photos, fact sheet, founder bio files + `press@` confirm |
| `/contact` | (see §5) | travel directions |
| `/weddings`, `/workshops`, `/shop/*` | (see §3) | prices + logistics |

---

## 7. Content that's empty until owner populates (render-null, no breakage)

| Feature | Data file | Current |
|---|---|---|
| Journal posts | `lib/data/journal-posts.ts:94,113,147` | 3 drafts — set `status:'live'` when approved |
| Newsletter archive | `lib/data/newsletter-issues.ts:36` | `[]` |
| Herd diary events | `lib/data/herd-events.ts:74` | `[]` |
| Social-proof booking ticker | `lib/data/social-proof.ts:58–67` | `[]` (real FareHarbor records) |
| Testimonial ratings/photos | `lib/data/testimonials.ts:47–86` | `rating:null`, `photoUrl:null` (text reviews ARE present) |
| Awards | `lib/data/awards.ts` | `[]` |
| Press article URLs | `lib/data/press.ts:46,53,60,67,74,81` | `null` |

---

## 8. Owner DECISIONS — built features that stay dark until a flag is flipped 🟡

Fully built and tested; the owner decides whether/when to switch each on (env var). Not bugs — launch levers.

| Feature | Flag(s) | Effect when set |
|---|---|---|
| Annual membership `/membership` | `MEMBERSHIP_LIVE=true` + `MEMBERSHIP_PRICE_EUR` + `STRIPE_MEMBERSHIP_PRICE_ID` | 404→live page + checkout |
| Monthly tier `/herd-family` | `HERD_FAMILY_LIVE=true` | 404→live |
| Junior/kids tier on `/adopt` | `JUNIOR_TIER_LIVE=true` + `JUNIOR_TIER_PRICE_EUR` + `STRIPE_JUNIOR_PRICE_ID` | card + checkout |
| Skein sponsorship callout + nav | `SKEIN_CALLOUT_LIVE=true` | homepage callout + nav sub-item |
| Seasonal price ladder | `TOUR_SEASONAL_WINDOWS` (JSON) | off-peak/peak ladder |
| Bundle CTAs (tour+yoga, adopt+tour) | `BUNDLE_*_DISCOUNT_EUR` + `BUNDLE_*_URL` | "book both & save" |
| Campaign banners (home/tours/yoga/adopt) | `CAMPAIGN_*_LIVE` + headline (or `ADOPT_CAMPAIGN_*`) | promo banners |
| Live alpaca cam | `ALPACA_CAM_EMBED_URL` | homepage live embed |
| Referral reward emails | `REFERRER_REWARD_LIVE=true` + code + description | reward emails |
| Voucher redemption | `VALID_VOUCHER_CODES` | valid codes for `/redeem-voucher` |
| Payment vendor | `PAYMENT_VENDOR=mollie\|stripe` + keys | live checkout (else mailto) |

---

## 9. Accounts & access keys the owner must create 🟡
(See OWNER_INPUT_NEEDED.md §"Needed within a month" for the step-by-steps.)

FareHarbor API (app+user key, webhooks, item IDs, gift card) · Stripe **or** Mollie keys + price IDs · Google Places (key+Place ID) · GA4 service account · Cloudflare Turnstile · Resend domain verify · Vercel (env + domain + **strong ADMIN_USERNAME/PASSWORD**) · Tier-1 secrets (`NEXTAUTH_SECRET`, `CRON_SECRET`, `FAREHARBOR_WEBHOOK_SECRET`) · optional SendGrid, owner-notify Slack/Telegram/Discord.

---

## 10. Corrections to older notes (read before trusting OWNER_INPUT_NEEDED.md)

- **Tour taxonomy:** the older doc lists **4 tours** (Meet the Herd / Weaving Workshop / Farm Experience / Photo Session) with "from €35". Reality (FareHarbor + live site): **one "Alpaca Tour"** (1 h, all ages, €21.19) + **Yoga** + **Gift Card**; weaving is a real **workshop**, weddings/photoshoots/business-incentives are separate. Treat the "4 tour" pricing asks as **superseded** — confirm the single tour price instead.
- **Yoga facts:** now verified (€30 / 1 h 15 min / max 6 / Wed+Sat). The "ages 15+" that was in our copy was **fabricated** (not on live) and has been removed.
- **Adopt:** resolved/live (€75 mo · €900 yr) — not an open question, only payment keys remain.
