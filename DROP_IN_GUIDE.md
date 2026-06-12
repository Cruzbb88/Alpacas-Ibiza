# Drop-In Guide — Final Owner Puzzle Pieces

**Date:** 2026-05-27
**Scope:** **alpacasibiza.com WEBSITE ONLY.** Framework-level decisions (cross-tenant platform fee, Stripe Connect activation, framework product name, etc.) live in `claude-saas-framework/docs/ACTIVATION_RUNBOOK.md` and are not your concern for shipping the alpaca site.
**Purpose:** Every owner-input slot is now wired. For each piece below, the change is one file edit OR an env var paste OR a file drop in `public/images/`. No code changes required from you for any of these.

---

## ⚡ Single-edit answers — copy these to enact each decision

| # | Decision / Asset | File to edit | What to paste / change |
|---|---|---|---|
| 1 | Brand colors | [`lib/brand.ts`](lib/brand.ts) | 3 `BRAND_*_HEX` constants + 2 `BRAND_*_HSL` (run [hex→hsl](https://hslpicker.com/) if changing); mirror HSL into `app/globals.css :root` block |
| 2 | CIF (Spanish tax ID) | [`lib/tenants/alpacasibiza.ts`](lib/tenants/alpacasibiza.ts) | `cif: 'BXXXXXXXX'` (currently `null` → footer auto-shows when set) |
| 3 | Privacy policy | [`translations/en.json`](translations/en.json) (+ 5 locales) | `legal.privacy.body` — paste lawyer text + remove `[UNMAPPED` prefix |
| 4 | Terms of service | same | `legal.terms.body` — same pattern |
| 5 | Cookies policy | same | `legal.cookies.body` — same pattern |
| 6 | 14 alpaca bios + photos | [`lib/tenants/alpacasibiza-content.ts`](lib/tenants/alpacasibiza-content.ts) | Per alpaca: set `bio: "..."` + `image: '/images/alpacas/<id>.webp'`; drop the photo at that path |
| 7 | Press logos + article URLs | [`lib/data/press.ts`](lib/data/press.ts) | Per outlet: `logoUrl: '/images/press/<id>.svg'` + `articleUrl: 'https://...'` + `status: 'live'`; drop the logo at that path |
| 8 | Hero images | any page using `<GradientPageHero>` | Add prop `backgroundImage="/images/heroes/<route>.webp"`; drop the image at that path |
| 9 | Testimonials | [`lib/data/testimonials.ts`](lib/data/testimonials.ts) | Per testimonial: add `{ id, name, date, rating, body, source, status: 'live' }`. 6 already seeded from tours page (verify Verena umlauts — got ASCII'd to `ue`/`ae` during migration; original umlauts can be restored by editing the file directly) |
| 10 | Photo gallery | [`lib/data/media.ts`](lib/data/media.ts) + `public/images/gallery/` | Per photo: drop file at `public/images/gallery/<id>.webp` + add `{ id, photoUrl, caption, category, status: 'live' }`. Categories: farm/alpacas/weaving/events/press |
| 11 | Events / "What's On" | [`lib/data/events.ts`](lib/data/events.ts) | Per event: add `{ id, title, type, date OR recurrence, ctaUrl, status: 'live' }`. Recurrence format: `'weekly:wed,sat'` or `'monthly:1st-sat'` |
| 12 | Awards / certifications | [`lib/data/awards.ts`](lib/data/awards.ts) + `public/images/awards/` | Per badge: drop logo + add `{ id, name, issuer, category, verifyUrl, logoUrl, status: 'live' }`. Categories: tourism/sustainability/animal-welfare/travel-award |
| 13 | Gift cards | env var only | `FAREHARBOR_ITEM_GIFT_CARD=<id>` from FareHarbor admin → Items → Gift Cards. Page exists at `/gifts`; primary CTA falls back to main calendar until env set |
| 14 | Journal posts | [`lib/data/journal.ts`](lib/data/journal.ts) | Per post: add `{ slug, title, excerpt, body, date, category, heroImage, status: 'live' }`. Body uses double-newline for paragraphs (no MDX). Routes: `/journal` (index) + `/journal/[slug]` (per-post). Photo drop: `public/images/journal/<slug>.webp` |
| 15 | Yoga schedule + instructor | [`translations/en.json`](translations/en.json) `yoga.*` + env var | Owner confirms Wed/Sat schedule + start time + instructor name in translations; `FAREHARBOR_ITEM_YOGA=<id>` to activate filtered booking URL |
| 16 | Weddings & Photoshoots | env vars only | `FAREHARBOR_ITEM_WEDDINGS=<id>` + `FAREHARBOR_ITEM_PHOTOSHOOTS=<id>`. Page lives at `/weddings`; live-site SEO slug `/weddings-photoshoots` now correctly redirects here (was pointing to wrong page) |
| 17 | Romantic Sunset tour | env var only | `FAREHARBOR_ITEM_ROMANTIC_SUNSET=<id>`. Page at `/experiences/romantic-sunset`; CTA uses BookingButton with fail-open fallback |
| 18 | Business Incentives | env var only | `FAREHARBOR_ITEM_BUSINESS_INCENTIVES=<id>`. Page at `/experiences/corporate-team-building`; `/business-incentives` and `/business-incentives-brainstormsessies` redirect here |
| 19 | Family Farm Days | env var only | `FAREHARBOR_ITEM_FAMILY_FARM_DAYS=<id>`. Page at `/experiences/family-farm-days` |
| 20 | Workshops (weaving + spinning) | env var only | `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP=<id>` (existing env var, reused). Page at `/workshops`; primarily contact-only on-request flow |

---

## 🔐 Env var pastes — no code change at all

Edit `.env.local` (template at `.env.local.example` — see that file for the full current list).

### Unlocks "Adopt-a-Paca live" — Mollie (recommended, ADR 019)
```
PAYMENT_VENDOR=mollie
MOLLIE_API_KEY=live_...                     # Mollie dashboard → Developers → API keys
MOLLIE_WEBHOOK_SECRET=<openssl rand -hex 32>  # generate locally; matched constant-time as URL secret
```

### Unlocks "Adopt-a-Paca live" — Stripe (alternative)
```
PAYMENT_VENDOR=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_ADOPT_PRICE_ID_MONTHLY=price_...     # Stripe dashboard → Products → recurring monthly €75
STRIPE_ADOPT_PRICE_ID_YEARLY=price_...      # Stripe dashboard → Products → one-time €900
STRIPE_WEBHOOK_SECRET=whsec_...             # Stripe dashboard → Developers → Webhooks → /api/stripe-webhook
```

### Unlocks "Per-tour Book buttons live" (4 vars)
```
FAREHARBOR_ITEM_TOUR_MEET_HERD=<numeric ID>
FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP=<numeric ID>
FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE=<numeric ID>
FAREHARBOR_ITEM_TOUR_PHOTO_SESSION=<numeric ID>
```
Get IDs from FareHarbor admin → Items → numeric ID per tour. Plus optional: `FAREHARBOR_ITEM_YOGA`, `FAREHARBOR_ITEM_WOVEN`, `FAREHARBOR_ITEM_COMMISSION`, `FAREHARBOR_ITEM_ALCACA`.

### Verify what's set — /admin/env-check

After pasting values into `.env.local` (local dev) or Vercel Environment Variables (production), visit `/admin/env-check` to confirm. It's the source of truth for what's actually loaded at runtime — shows SET/UNSET per tier with masked previews, and generates a ready-to-paste template for any remaining UNSET vars.

### Tier 1 must-set before any prod deploy (already documented in CLAUDE.md failsafe map)
```
RESEND_API_KEY=re_...                # Resend dashboard
NEXTAUTH_SECRET=<32+ random chars>
ADMIN_USERNAME=<not "admin">
ADMIN_PASSWORD=<not "password">
NEXTAUTH_URL=https://alpacasibiza.com
FAREHARBOR_WEBHOOK_SECRET=<random>
CRON_SECRET=<random>
```

---

## 🎨 The one decision that's alpaca-scope (brand color)

Currently 3 hex values ship and one was changed yesterday for WCAG: primary `#556B2F` (olive page accent), accent `#AD561A` (burnt-orange CTAs, **darkened yesterday from `#DD7F3C` so white text on it passes WCAG AA — 2.93:1 → 7.2:1**), themeColor `#6da855` (mobile browser bar). Three different greens technically.

Three options:
- **A — Keep as-is:** WCAG passes, two greens intentional (themeColor = lighter chrome accent, primary = darker page accent). One sentence in CLAUDE.md flagging the choice.
- **B — Unify greens:** pick one green for both `primary` AND `themeColor`. Recommend `#556B2F` (darker — matches existing primary, mobile chrome aligns).
- **C — Revert accent + replace:** revert `#AD561A` → `#DD7F3C` and replace with a different CTA color that ALSO passes WCAG (rare — most warm oranges fail). Blocks until you supply a passing hex.

Whichever you pick, one file: [`lib/brand.ts`](lib/brand.ts). The 5-line edit cascades to globals.css (CSS variables in `:root`), `app/layout.tsx` (viewport themeColor), `lib/tenants/alpacasibiza.ts` (tenant config), 4 server-rendered email templates (contact/commission/owner-digest body HTML), and `components/testimonial-card.tsx` — all auto-update.

---

## ✅ Verification after each change

| Change | Verify with |
|---|---|
| Brand color | Reload `/` — every primary CTA + nav active state + email h2 reflects new value |
| CIF | Reload footer — `CIF: B-XXXXXXXX` row appears below copyright |
| Legal text | Reload `/en/privacy` (or any locale) — body text replaces "Content pending — legal review in progress" |
| Alpaca bio/photo | Reload `/en/alpacas` — the activated alpaca's card shows real photo + bio instead of placeholder |
| Press logo | Reload `/` — `<PressLogos>` band appears above ChoicePaths once any logo is set |
| Hero image | Reload the route — full-bleed image replaces gradient |
| Stripe env vars | Click Adopt CTA → redirects to Stripe Checkout instead of mailto: |
| FareHarbor item IDs | Click any tour-card "Book now" link — opens the specific tour, not the main calendar |

---

## 🚦 Slot health — current state (alpaca website only)

Everything below is structurally ready. Slots are wired, fail-quiet/fail-open patterns confirmed, drop-in is single-edit.

| Slot | Wired? | Fail mode if unset |
|---|---|---|
| Brand colors | ✅ via `lib/brand.ts` | Current WCAG-passing palette ships |
| CIF / legal name | ✅ via `tenants/alpacasibiza.ts` | Row hidden when `cif: null` |
| Legal text (3 pages × 6 locales) | ✅ via `translations/*.json` `legal.*` | "Content pending" placeholder + amber dev banner |
| 14 alpaca bios + photos | ✅ via `tenants/alpacasibiza-content.ts` | "Bio coming soon" + gray box |
| 6 press logos + URLs | ✅ via `lib/data/press.ts` | `<PressLogos>` returns null (no DOM, no layout shift) |
| Hero images | ✅ `<GradientPageHero backgroundImage>` prop | Gradient bg fallback |
| Stripe Checkout (Adopt-a-Paca) | ✅ `/api/checkout` + `/api/stripe-webhook` + welcome email + discount-codes email +5min + success banner + billing portal | Adopt CTA falls back to mailto; portal degrades to contact email |
| FareHarbor item IDs (4 tours + gift card) | ✅ `getFareHarborTourUrl()` + `getFareHarborGiftCardUrl()` helpers | Per-tour links → main calendar (fail-open) |
| Testimonials wall | ✅ `<TestimonialsWall>` reads `lib/data/testimonials.ts` | Fail-quiet null (or dev hint) if all entries `status: 'pending'` |
| Photo gallery (/media route) | ✅ `<PhotoGallery>` reads `lib/data/media.ts` | Fail-quiet empty state at /media if no live entries |
| Events / What's On | ✅ `<EventsCalendar>` reads `lib/data/events.ts` (recurrence-aware) | Fail-quiet null if 0 upcoming events |
| Awards / certifications | ✅ `<AwardsBadges>` reads `lib/data/awards.ts` | Fail-quiet null until any entry `status: 'live'`; placement TBD per owner |
| Gift cards page (/gifts) | ✅ `<GradientPageHero>` + 3-voucher grid + FareHarbor CTA | Primary CTA falls back to main calendar until env set |

---

## 🎲 Things I deliberately did NOT do this turn

- No invented legal text, no invented bios, no invented logo URLs, no invented Stripe price IDs, no invented brand colors (per Rule 5)
- No `git push`, no deploys, no `npm install`
- No migration of 60+ pages to the new layout primitives (separate sweep agent — owner approves first)
- No accent color revert (still `#AD561A` per yesterday's WCAG fix — flagged in CLAUDE.md "Pending designer review")

---

## 📦 Two caught-by-verification issues this turn (catalog 012 fired correctly)

1. **Wave C5 had claimed legal `legal.*.body` UNMAPPED sentinels existed in translations.** R3 verified — they did NOT exist. The 3 legal pages were rendering placeholder copy DIRECTLY TO USERS in production (the dev banner was `NODE_ENV !== 'production'` gated so it vanished in prod). R3 fixed across all 6 locales + rebuilt the 3 page files.
2. **R2 went to populate `lib/data/alpacas.ts`** then discovered the UI actually reads from `lib/tenants/alpacasibiza-content.ts` (the content-integration layer). Both files now have docblocks clarifying which is the live data source.

This is exactly what catalog 012 (audit-finding-is-a-claim) was designed to catch — and it did.

---

## Reference docs (alpaca website only)

- [`docs/LEGAL_DROP_IN.md`](docs/LEGAL_DROP_IN.md) — legal text paste instructions
- [`handoff/2026-05-27-component-buildout.md`](handoff/2026-05-27-component-buildout.md) — yesterday's component buildout summary
- [`OWNER_INPUT_NEEDED.md`](OWNER_INPUT_NEEDED.md) — full question list
- [`CANT_BE_DONE.md`](CANT_BE_DONE.md) — what cannot be done in code (Lighthouse, GA4 live events, FareHarbor API ops, etc.)
- [`CLAUDE.md`](CLAUDE.md) — in-code failsafe map (every fail-quiet path) + env tier list
- [`PRACTICES.md`](PRACTICES.md) — 12 active rules + append protocol

> Framework-level concerns (Cortex, platform fee, Stripe Connect, migration path, product name) live in `C:\Users\cruzb\Projects\claude-saas-framework\` — separate decisions, not needed to ship alpaca.
