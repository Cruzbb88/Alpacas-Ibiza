# Nav Accessibility Audit — 2026-06-09

## 1. Live alpacasibiza.com nav (WebFetch)

**Desktop/Mobile nav:** Home · Over ons (About) · Wishfulfilling Weaving · Alpaca's · Activiteiten (Tours / Weddings / Adopt / Yoga / Workshops / Business / Alcaca) · Contact · Language selector · "Plan je bezoek" CTA

**Footer:** "Plan je bezoek" booking link · Terms & Conditions · Instagram · Facebook

Note: live site has a shallow flat nav (6 top-level items) but uses sub-menus heavily. Our redesign is English-first and uses a flat single-level nav.

---

## 2. Current Next.js nav + footer inventory (before fixes)

### Header NAV_ITEMS (before)
Tours · Visit · Alpacas · Adopt · Shop · About · Journal · Contact

### Footer Explore col (before)
Tours · Alpacas · Adopt · Sustainability · Journal · About · Contact

### Footer Shop col (before)
Woven Collection · Custom Commission · Alpaca Manure · Gifts

### Footer legal strip
Privacy · Terms · Cookies · Impressum

---

## 3. Gap matrix

| Feature | Audience | Before | Action |
|---|---|---|---|
| `/experiences` + sub-pages | Visitors | Not in nav or footer | **Added to header NAV_ITEMS** |
| `/weaving` + `/weaving/collection` | Visitors | Footer missing; nav key existed but not wired | **Added to header NAV_ITEMS + footer Shop col** |
| `/gifts` | Gift buyers | In footer Shop col only | **Added to header NAV_ITEMS** |
| `/membership` | Visitors (when live) | No nav/footer surface | **Added to footer Explore (env-gated MEMBERSHIP_LIVE)** |
| `/herd-family` | Monthly adopters | No nav/footer surface | **Added to footer Explore (env-gated HERD_FAMILY_LIVE)** |
| `/redeem-voucher` | Gift recipients | Unreachable from any page | **Added to footer Shop col + /gifts page bottom CTA** |
| `/newsletter/archive` | Newsletter subscribers | Not linked anywhere public | **Added to footer Explore col** |
| `/preferences` | Email subscribers (token-gated) | Wired in transactional emails only | **Added to footer Donors section** |
| `/my-adoption` | Donors | Email-only | **Added to footer Donors section** |
| `/recover-certificate` | Adopters | Linked from /adopt only | **Added to footer Donors section** |
| `/press` · `/press-kit` · `/media` | Press/media | No footer links | **Added Press section to footer** |
| `/sitemap` | Any | Not linked from nav/footer | **Added to footer Info section** |
| `/visit` | Visitors | Only in header | **Added to footer Info section + sitemap.ts** |
| `/skein` | Visitors/donors | Not in sitemap.ts | **Added to sitemap.ts** |
| `/weaving/collection` | Visitors | Not in sitemap.ts | **Added to sitemap.ts** |
| `/redeem-voucher` (sitemap) | Gift recipients | Not in sitemap.ts | **Added to sitemap.ts** |
| `/press` (sitemap) | Press/SEO | Not in sitemap.ts | **Added to sitemap.ts** |
| Admin sub-pages (analytics/dunning, analytics/vat, analytics/events, analytics/referrals, analytics/subscriptions, birthday-test) | Admin/Owner | Not in admin dashboard | **Added to admin/page.tsx ADMIN_LINKS** |
| `HERD_FAMILY_LIVE` export | Config | Not exported from lib/config.ts | **Added export to lib/config.ts** |

---

## 4. Fixes applied

### Files touched:

| File | Change |
|---|---|
| `components/header.tsx:24-33` | Added `experiences`, `weaving`, `gifts` to NAV_ITEMS (11 items total) |
| `components/footer.tsx` | Added HERD_FAMILY_LIVE + MEMBERSHIP_LIVE import; added `experiences`, `herd-family` (env-gated), `membership` (env-gated), `newsletter/archive` to Explore col; added `weaving` + `redeem-voucher` to Shop col; added Donors/Press/Info secondary utility row |
| `app/[locale]/gifts/page.tsx` | Added `Link` import + "Already have a voucher? Redeem it here" section at page bottom |
| `app/sitemap.ts` | Added `/visit`, `/weaving`, `/weaving/collection`, `/skein`, `/redeem-voucher`, `/press` routes |
| `lib/structured-data.ts` | `siteNavigationSchema` expanded from 10 → 14 items (added experiences, visit, weaving, gifts) |
| `lib/config.ts` | Added `export const HERD_FAMILY_LIVE` |
| `app/admin/page.tsx` | Added 5 analytics sub-pages + birthday-test to ADMIN_LINKS |
| `lib/structured-data.test.ts` | Updated "emits 10 items" → "emits 14 items" to match new nav count |
| `translations/en.json` | Added nav keys: `experiences`, `membership`, `herdFamily`; footer keys: `newsletterArchive`, `herdFamily`, `membership`, `redeemVoucher`, `donors`, `myAdoption`, `emailPreferences`, `recoverCertificate`, `press`, `pressRoom`, `pressKit`, `mediaGallery`, `info`, `siteMap`; gifts keys: `redeemPrompt`, `redeemLink` |
| `translations/nl.json` | Added same keys with Dutch translations (nav + footer + gifts) |
| `translations/de.json` | Added nav + footer keys with `__UNTRANSLATED__` sentinel |
| `translations/es.json` | Added nav + footer keys with `__UNTRANSLATED__` sentinel |
| `translations/fr.json` | Added nav + footer keys with `__UNTRANSLATED__` sentinel |
| `translations/it.json` | Added nav + footer keys with `__UNTRANSLATED__` sentinel |

---

## 5. Env-gated links

| Link | Env var | Behaviour when unset |
|---|---|---|
| Footer `/membership` | `MEMBERSHIP_LIVE=true` | Hidden (conditional render) |
| Footer `/herd-family` | `HERD_FAMILY_LIVE=true` | Hidden (conditional render) |
| `/membership` page itself | `MEMBERSHIP_LIVE=true` | `notFound()` (404) |
| `/herd-family` page itself | `HERD_FAMILY_LIVE=true` | `notFound()` (404) |

---

## 6. Summary counts

- **Gaps found:** 18 (nav surfaces + sitemap + admin links + missing config export)
- **Nav items added to header:** 3 (experiences, weaving, gifts)
- **Footer links added:** 12 (experiences, herd-family, membership, newsletter/archive, redeem-voucher, weaving, my-adoption, preferences, recover-certificate, press, press-kit, media, sitemap, visit)
- **Sitemap routes added:** 6 (visit, weaving, weaving/collection, skein, redeem-voucher, press)
- **siteNavigationSchema updated:** yes (10 → 14 items)
- **Admin links added:** 6 (subscriptions, dunning, vat, referrals, events, birthday-test)
- **i18n keys added:** en=17, nl=17, de/es/fr/it=17 sentinel each
- **tsc result:** 0 errors
- **test result:** 827 pass / 0 fail (fixed 1 test asserting old nav count)
