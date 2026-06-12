# Completion Audit — 2026-06-06

## Verdict

NOT DONE — 9 code items remaining

---

## Bucket A: ALREADY BUILT (no action)

### Pages (43 routes)
1. Home `/` — hero, dual CTA, choice paths, newsletter, JSON-LD, reviews
2. Tours `/tours` — FareHarbor calendar, FAQ, 6 reviews, adopt cross-sell, structured data
3. Adopt-a-Paca `/adopt` — full Mollie/Stripe checkout, EU Art 16(m) waiver, referral, quiz, gift flow, cert preview, billing portal (`app/[locale]/adopt/page.tsx`)
4. Alpacas herd `/alpacas` — 14 named alpacas, bilingual bios, CDN portraits, filter, fun-fact carousel (`app/[locale]/alpacas/page.tsx`)
5. Alpaca profile `/alpacas/[slug]` — Animal + AboutPage JSON-LD, adopt CTA, peer grid (`app/[locale]/alpacas/[slug]/page.tsx`)
6. Journal index `/journal` — card grid, server search, reading-progress, TOC, RSS link (`app/[locale]/journal/page.tsx`)
7. Journal post `/journal/[slug]` — BlogPosting JSON-LD, share, related posts (`app/[locale]/journal/[slug]/page.tsx`)
8. Contact `/contact` — production-grade form, OSM map, Turnstile, honeypot, rate-limit, GDPR (`app/[locale]/contact/page.tsx`)
9. About `/about` — Founder Person JSON-LD, values, origin story (`app/[locale]/about/page.tsx`)
10. Shop hub `/shop` — 4 categories, ItemList JSON-LD (`app/[locale]/shop/page.tsx`)
11. Shop: Alcaca `/shop/alcaca` — origin story, 2 real CDN photos, 3 tiers (`app/[locale]/shop/alcaca/page.tsx`)
12. Shop: Woven `/shop/woven` — 6 SKUs, inquiry CTA (`app/[locale]/shop/woven/page.tsx`)
13. Shop: Commission `/shop/commission` — bespoke form, budget slider, reference URLs, localStorage draft (`app/[locale]/shop/commission/page.tsx`)
14. Gifts `/gifts` — 4-step wizard, FareHarbor + Stripe/Mollie routing (`app/[locale]/gifts/page.tsx`)
15. Skein sponsorship `/skein` — 14-alpaca picker, Stripe one-off checkout, gift toggle, thank-you (`app/[locale]/skein/page.tsx`)
16. Weaving `/weaving` — studio history, process, cross-sell (`app/[locale]/weaving/page.tsx`)
17. Weaving collection `/weaving/collection` — 6-card grid, inquiry CTAs (`app/[locale]/weaving/collection/page.tsx`)
18. Experiences hub `/experiences` — 7-experience compare, vibe badges, ExperienceCompare (`app/[locale]/experiences/page.tsx`)
19. Corporate team-building `/experiences/corporate-team-building` — bespoke CorporateEnquiryForm, itinerary, FAQ (`app/[locale]/experiences/corporate-team-building/page.tsx`)
20. Romantic sunset `/experiences/romantic-sunset` — proposal upsell section, fail-open CTA (`app/[locale]/experiences/romantic-sunset/page.tsx`)
21. Family farm days `/experiences/family-farm-days` — education + safety sections, FAQ (`app/[locale]/experiences/family-farm-days/page.tsx`)
22. Yoga `/yoga` — verified €30/1h15m/max 6/Wed+Sat, schemas, FareHarbor CTA (`app/[locale]/yoga/page.tsx`)
23. Workshops `/workshops` — curriculum, HowTo JSON-LD, FAQ (`app/[locale]/workshops/page.tsx`)
24. Weddings `/weddings` — 5 use-case cards, FAQPage JSON-LD, OG image (`app/[locale]/weddings/page.tsx`)
25. Sustainability `/sustainability` — 6 prose cards, herd pill-cloud, AwardsBadges slot (`app/[locale]/sustainability/page.tsx`)
26. Gifts page `/gifts` — full wizard with ConsentNotice, GDPR consent inline
27. Visit `/visit` — GPS, car/bus/airport directions, accessibility, OSM map component (`app/[locale]/visit/page.tsx`)
28. Press `/press` — 6-outlet roster, conditional live-grid (`app/[locale]/press/page.tsx`)
29. Media gallery `/media` — lightbox, keyboard nav, captions, fail-quiet empty state (`app/[locale]/media/page.tsx`)
30. Privacy, Terms, Cookies, Impressum — auto-draft policy engine, `LEGAL_CONTENT_LIVE` gate (`app/[locale]/privacy/`, `terms/`, `cookies/`, `impressum/`)
31. My adoption `/my-adoption` — donor portal, payment history, referral badge (`app/[locale]/my-adoption/page.tsx`)
32. Cancel feedback `/cancel-feedback` — survey form, log-only handler
33. Newsletter confirmed + unsubscribed pages
34. Offline page (`app/[locale]/offline/page.tsx`)
35. Sitemap visual `/sitemap` — human-readable page (`app/[locale]/sitemap/page.tsx`)
36. Press-kit `/press-kit` — downloadable assets page (`app/[locale]/press-kit/page.tsx`)
37. Share adoption `/share-adoption` — referral-code share flow
38. Recover certificate `/recover-certificate` — email-oracle flow
39. Search index page (`app/search-index/page.tsx`)
40. 404 page (`app/[locale]/not-found.tsx`), global error boundary (`app/global-error.tsx`)
41. Admin: login, analytics, env-check, email-previews, monitoring, content, env-check, setup, today, suppressions, migration, quarterly-update, birthday-test, launch-readiness, alpaca photo manager (17 admin pages)
42. Admin analytics sub-pages: dunning, VAT, subscriptions, events, referrals

### API routes (57 routes)
43. Contact, Commission, Newsletter (double opt-in + confirm + unsubscribe), GDPR request, OG, social-proof, availability, Google reviews, FareHarbor webhook, Stripe checkout + webhook + billing portal, Mollie checkout + webhook + manage + cancel + update-payment, adopt-certificate, adopt-count, adopt-deferred-gifts (stub — see D), adopt-milestone-emails, adopt-quarterly-update, adopt-renewal-reminders, alpaca-birthday-cards, calendar/renewal, checkout-session, donor-receipt, email-preferences, health, healthz, launch-readiness, log-error, owner-digest, owner-mrr-digest, recover-certificate, reminder, resend-webhook, review-request, search, setup-probe, skein-checkout, stripe-webhook, admin/send-test-email, admin/content-stage, admin/replay-event, admin/suppressions, admin/quarterly-update, admin/alpacas/upload

### Infrastructure
44. XML sitemap (`app/sitemap.ts`), image sitemap (`sitemap-images.xml/route.ts`), news sitemap (`sitemap-news.xml/route.ts`), robots.txt (`app/robots.ts` — blocks non-prod)
45. PWA manifest + service worker (`app/manifest.ts`, `public/sw.js`), iOS/Android icon generation (`app/icon-192.tsx`, `app/icon-maskable.tsx`, `app/apple-icon.tsx`)
46. OG image generation: root OG (`app/og/route.tsx`, `app/opengraph-image.tsx`), per-page opengraph-image.tsx for adopt, alpacas, tours, journal/[slug], sustainability, weddings, workshops, yoga, plus per-alpaca slug
47. Cookie consent: vanilla-cookieconsent v3 wired (`components/cookie-consent-v3.tsx`), type shim (`types/vanilla-cookieconsent.d.ts`)
48. Multi-language: 6 locales (en/nl/de/es/fr/it), next-intl v4 wired, all routes locale-prefixed, hreflang, sitemap per-locale
49. Structured data / JSON-LD: LocalBusiness, TouristAttraction, FAQPage, BlogPosting, Course, HowTo, Product, Offer, Person, Animal, SportsActivityLocation, Event schemas
50. Security: CSP (report-only), HSTS, X-Frame, Referrer-Policy, Permissions-Policy, rate limiting, honeypot, Turnstile/reCAPTCHA, XSS escaping, CRLF guard, `safeEqual()` timing-safe compare, 97 documented failsafes
51. Payment: Mollie + Stripe direct dual-vendor with fail-quiet adapters, webhook idempotency (4d TTL), dunning failure tracker, owner escalation notify (Slack/Telegram/Discord/generic), VAT tracker (EU OSS), billing portal email-oracle, 14 unit tests
52. Email: Resend transactional, mailer audit ring buffer, 7 email template types with List-Unsubscribe headers, client-error reporter, send-test-email admin route
53. Env validation: `lib/validate-env.ts` Tier 1/2 checks, `/admin/env-check`, `/healthz` endpoint
54. Search: Pagefind-compatible `/api/search`, `app/search-index/page.tsx`, `lib/search/build-index.ts`
55. Accessibility: skip links, ARIA, `alt` text, keyboard nav on pickers/galleries, `aria-pressed` on chips
56. Analytics: GA4 `G-Y946QDVVQV` + GTM `GTM-KR3CGLS6` wired, consent gate, admin analytics page
57. Monitoring: `/admin/monitoring` — mailer audit + client error feed, `/api/admin/replay-event`
58. Referral system: HMAC-signed codes, `generateReferralCode` in `lib/referral-codes.ts`, wired to checkout routes and my-adoption portal
59. Gift adoption: `AdoptGiftAdoption` component, gift flow in `/gifts`, `decideGiftSchedule` helper, gift metadata threading in checkout routes
60. Drizzle DB schema + client (`lib/db/schema.ts`, `lib/db/client.ts`) with migrations; read-subscriptions + read-events helpers

---

## Bucket B: OWNER_INPUT (Cruz must supply, AI cannot)

1. **Legal copy** — Privacy Policy, Terms of Service, Cookie Policy, Impressum body text must be lawyer-approved before `LEGAL_CONTENT_LIVE=true`. Placeholder auto-drafts exist; legal review required. (`translations/en.json` keys `legal.privacy.body`, `legal.terms.body`, etc.)
2. **EU withdrawal-waiver copy** — `adopt.legal.withdrawalWaiver` in translations. EU consumer-law lawyer must approve exact text; pre-ticked/bundled acceptance invalidates the waiver. (`components/adopt/checkout-gate.tsx`)
3. **Payment vendor KYC + live API keys** — Mollie: complete KYC at mollie.com, generate `MOLLIE_API_KEY` + `MOLLIE_WEBHOOK_SECRET`. OR Stripe: create account, get `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`. Without these every Adopt CTA silently falls back to mailto.
4. **Stripe price IDs for adopt tiers** (if Stripe path chosen) — create recurring €75/mo and €900/yr products in Stripe Dashboard; set `STRIPE_ADOPT_PRICE_ID_MONTHLY` + `STRIPE_ADOPT_PRICE_ID_YEARLY`.
5. **Tier 1 secrets** — generate and set in Vercel env: `RESEND_API_KEY`, `CONTACT_EMAIL`, `NEXTAUTH_SECRET`, `ADMIN_USERNAME` (not "admin"), `ADMIN_PASSWORD` (16+ chars), `NEXTAUTH_URL`, `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET`.
6. **Resend domain DKIM/SPF/DMARC** — add 3 DNS records at domain registrar; without these every adopt/reminder/review email lands in spam.
7. **Vercel deployment + domain DNS cutover** — create Vercel account, connect repo, paste env vars, point `alpacasibiza.com` A + CNAME at Vercel. Full runbook: `OWNER_LAUNCH_RUNBOOK.md`.
8. **Real photography** — hero images for 20+ pages are CSS gradient placeholders; alpaca picker shows emoji for 12/14 (CDN URLs exist but picker component reads from a null source — see D5); zero gallery photos (`public/images/gallery/.gitkeep`); no hero images in `public/images/heroes/`.
9. **Tour pricing per type** — comparison table shows "Contact for details" for all 4 tours (Meet Herd, Weaving Workshop, Farm Experience, Photo Session); competitor norm is "from €X/person". Owner confirms prices.
10. **FareHarbor item IDs** — 14 IDs needed for per-tour Book buttons. Only adopt item 577841 confirmed. All others require FareHarbor admin dashboard login. IDs: `FAREHARBOR_ITEM_TOUR_MEET_HERD`, `FAREHARBOR_ITEM_YOGA`, `FAREHARBOR_ITEM_GIFT_CARD`, `FAREHARBOR_ITEM_WEDDINGS`, `FAREHARBOR_ITEM_ROMANTIC_SUNSET`, `FAREHARBOR_ITEM_FAMILY_FARM_DAYS`, `FAREHARBOR_ITEM_BUSINESS_INCENTIVES`, `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP`, `FAREHARBOR_ITEM_ALCACA`, `FAREHARBOR_ITEM_WOVEN`, `FAREHARBOR_ITEM_COMMISSION`, `FAREHARBOR_ITEM_PHOTOSHOOTS` (plus 2 tour variants).
11. **Cloudflare Turnstile keys** — 5-min setup at dash.cloudflare.com; set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. Without these all forms (contact, newsletter, commission, GDPR, adopt) are unprotected.
12. **Google Places API key + Place ID** — enables live star rating badge on tours/home/adopt/contact pages. Requires GCP account + Places API.
13. **Cancellation policy confirmation** — "Free cancellation up to 24h" is hard-coded on every Book CTA; must match FareHarbor backend setting exactly.
14. **Wedding/photoshoot pricing decisions** — 7 UNMAPPED: pricing model, alpacas included, travel radius, handler cost, photographer arrangement, off-site, hero photo. (`app/[locale]/weddings/page.tsx`)
15. **Adopt discount codes** — `ADOPT_DISCOUNT_CODE_WEAVING_10` + `ADOPT_DISCOUNT_CODE_FARMSHOP_15` must be created in booking/shop system. Until set, welcome email says "codes arriving within 48h".
16. **Deferred-gift product decisions** (owner decision blocks code completion — see D8): (a) certificate shows donor or recipient name? (b) welcome goes to recipient on delivery date or to donor immediately? (c) cancellation cascade if recipient declines?
17. **Owner escalation channel** — set at least one of `OWNER_SLACK_WEBHOOK_URL`, `OWNER_TELEGRAM_BOT_TOKEN`+`OWNER_TELEGRAM_CHAT_ID`, or `OWNER_GENERIC_WEBHOOK_URL`; without this dunning escalations are silently discarded.
18. **GA4 analytics access** — invite owner email to GA4 property as Viewer, OR set `GA4_PROPERTY_ID`+`GA4_CLIENT_EMAIL`+`GA4_PRIVATE_KEY` for in-site dashboard.
19. **Vercel plan confirmation** — 7 cron jobs in `vercel.json`; Vercel Hobby supports only 2. Owner must confirm Vercel Pro plan or 5 crons (milestone/quarterly/renewal/deferred-gifts/birthday-cards) silently never fire.
20. **Press logos + article URLs** — 6 outlets seeded in `lib/data/press.ts`; all `logoUrl` are null; `public/images/press/` is empty. Owner supplies SVG logos with permission to use.
21. **Weaving collection product list** — 6 cards show `[UNMAPPED — product name N]`; owner supplies names, photos, prices, enquiry routing preference.
22. **Alpaca bios sign-off** — 14 EN bios are auto-translated with `OWNER_REVIEW_TRANSLATION` flag; owner must review. (`lib/tenants/alpacasibiza-content.ts`)
23. **Postal code confirmation** — 07850 (live terms) vs 07819 (old config); currently set to 07850 in tenant config with a conflict warning. Owner confirms. (`lib/tenants/alpacasibiza.ts`)
24. **Phone number confirmation** — +32 475 58 65 44 (Belgian) confirmed live; owner decision whether a Spanish +34 number should also be shown.
25. **Language strategy decision** — 6 locales configured; 170 `__UNTRANSLATED__` keys in each of de/it/fr. Owner decides: prune IT+FR, commission translation, or accept sentinel fallbacks. (`i18n.config.ts`)
26. **FareHarbor API access (Pro plan)** — "X spots left" live urgency widget requires email to support@fareharbor.com requesting `FAREHARBOR_APP_KEY` + `FAREHARBOR_USER_KEY`.
27. **Healthchecks.io / UptimeRobot** — cron dead-man switch and uptime monitoring require external accounts; owner creates and sets `HEARTBEAT_*` env vars.
28. **Brand color owner sign-off** — accent darkened from #DD7F3C → #AD561A for WCAG AA; flagged "OWNER REVIEW NEEDED" in `CLAUDE.md`. (`app/globals.css`, `lib/brand.ts`)

---

## Bucket C: VERIFIED-CANT-BE-DONE-LOCALLY

1. **E2E browser tests** — require deployed URL + headless browser; deferred per `CANT_BE_DONE.md`.
2. **Stripe live-key smoke test** — requires owner's authenticated Stripe dashboard to create products and test charges.
3. **DNS records** — Vercel domain cutover requires owner login at domain registrar (One.com or equivalent).
4. **GA4 / GTM event-firing verification** — requires production deploy + GTM Preview mode + browser-side gtag observation; code shape confirmed correct.
5. **Lighthouse / Core Web Vitals scores** — requires deployed URL; image optimization code-ready (`next.config.mjs` `images.unoptimized` was already flipped per spec 008 done).
6. **FareHarbor item IDs via DevTools** — FareHarbor embed pages are JS-rendered; item IDs cannot be read from SSR HTML without authenticated FareHarbor admin session.
7. **Admin credential verification on Vercel** — requires owner's Vercel dashboard read access.
8. **Resend DKIM/SPF verification** — DNS propagation requires owner action at registrar.
9. **Exact brand hex values from live Squarespace site** — CSS is bundled and unresolvable by WebFetch.
10. **Mollie OAuth (tenant platform)** — spec 009 (Mollie Connect tenant activation) explicitly gated on "first tenant signs"; do not build speculatively.

---

## Bucket D: STILL CODE-WORK (AI should do)

1. **Referral attribution broken end-to-end** — `generateReferralCode` produces 6-char HMAC codes (`/^[A-Z0-9]{6}$/`) but four UI components validate against `/^ALPACA-[A-Z0-9]{6}$/`, silently stripping every valid code before it reaches checkout. Fix: change the regex in `components/share-buttons.tsx:14`, `components/donor-portal/share-cta.tsx:37`, `components/adopt/referral-applied-banner.tsx:7`, `app/[locale]/share-adoption/page.tsx:30` from `ALPACA-[A-Z0-9]{6}` → `[A-Z0-9]{6}`. Dead function `createReferralCoupon` in `lib/payment-handlers-referral.ts` has zero callers; delete it. Q1 yes, Q2 yes (regex + delete), Q3 yes (every referral share silently loses attribution).

2. **`recover-certificate` missing Turnstile + per-email rate-limit** — Route scans Stripe + Mollie customer lists for any submitted email with no CAPTCHA. Billing-portal and mollie-manage both have Turnstile + per-email rate-limit for the same oracle pattern; recover-certificate has neither. Fix: add `verifyHumanToken(request)` call and `rateLimitByEmail({limit:2, windowMs:3600000})` consistent with sibling routes. (`app/api/recover-certificate/route.ts`). Q1 yes (IP RL + honeypot exist as gate), Q2 yes, Q3 yes (security surface exposed to bots).

3. **Mollie donor-receipt regex drops `sub_` IDs** — `app/api/donor-receipt/[sessionId]/route.ts:17` has `MOLLIE_PAYMENT_RE = /^tr_[A-Za-z0-9]+$/`, missing `sub_` prefix. A subscription session ID silently fails `classifyId`, returning null and preventing certificate lookup. Fix: change regex to `/^(tr|sub)_[A-Za-z0-9]+$/` to match canonical at `lib/integrations/payment-mollie.ts:326`. Q1 yes, Q2 yes (one-liner), Q3 yes (certificate recovery broken for subscription IDs).

4. **Gift tour price conflict** — Gifts page tour card shows "From €30 / guest" (hardcoded in `gifts/page.tsx:137`), but PEER_COMPARISON audit found this conflicts with €45 shown elsewhere (and gift-flow may have its own price). The `TOUR_BASE_PRICE_EUR = 30` constant exists in `lib/config.ts` per spec 001. Fix: replace the hardcoded string in `app/[locale]/gifts/page.tsx:137` with a reference to `TOUR_BASE_PRICE_EUR`; confirm the `gifts.faq` section in translations is rendered (grep shows 0 FAQ references in the gifts page; FAQ keys exist). Q1 yes, Q2 yes, Q3 yes (price trust is critical on a checkout page).

5. **Adopt/Skein pickers read null image source — CDN photos not wired** — `lib/tenants/alpacasibiza-content.ts` has CDN `image` URLs for all 14 alpacas, but `AlpacaPicker` reads from `ALPACAS` in `lib/data/alpacas.ts` where `image: null`. The picker shows emoji for every alpaca. Fix: thread `localizedBio`/`image` from `alpacasibiza-content.ts` into the picker data source — likely `lib/data/alpacas.ts` or a merged read in the adopt/skein page server components. Q1 yes (scaffolding exists), Q2 yes, Q3 yes (emoji vs portrait is the primary emotional hook for a €75/mo commitment).

6. **`adopt-deferred-gifts` cron is a stub** — Route returns `dispatched: 0, scheduler_only: true` and has a TODO to wire `handleGiftWelcomeForDate()`. `lib/payment-handlers-gift-schedule.ts` already defines `decideGiftSchedule()`; the cron just needs to iterate active Mollie + Stripe subscriptions with `gift_send_date` metadata and call the right send path. This is unblocked code work, **except** for the 3 owner decisions in B16 (who gets the certificate, when the welcome fires, cascade cancellation). If owner answers B16, this is pure AI code. The scaffold is complete; the stub body needs ~40 LOC. Q1 yes (scaffold + helper both exist), Q2 yes (docs + Mollie/Stripe SDK patterns are throughout the codebase), Q3 yes (deferred gift adoptions silently never deliver recipient welcome emails).

7. **Webhook-secret guards still inline in `reminder` + `review-request`** — `requireOptionalWebhookSecret` helper exists in `lib/route-helpers.ts` but has zero callers. Both `app/api/reminder/route.ts:41` and `app/api/review-request/route.ts:36` carry byte-identical inline blocks instead of importing it. `CLAUDE.md` failsafe row 46 falsely claims this is resolved. Fix: replace the inline blocks in both routes with `requireOptionalWebhookSecret(request)` from `lib/route-helpers.ts`. Q1 yes, Q2 yes (the helper is already written), Q3 yes (corrects a documented-false "resolved" record and closes a drift class).

8. **Payment dual-dispatch fork** — Two independent dispatch systems route adoption checkout: old `getPaymentAdapter()` → `PaymentAdapter.buildAdoptCheckoutUrl()` used by `adopt/page.tsx` and `gifts/page.tsx`; new `getProviders()` → `PaymentProvider.createCheckoutSession()` used by admin and sitemap; `mollie-checkout` route bypasses both. Fix: consolidate adopt and gifts pages to use the `getProviders()` + `PaymentProvider` path (or vice versa) so there is one dispatch path. Remove the `isAdoptTier` duplicate in `lib/integrations/payment-mollie.ts` in favour of the canonical `lib/payment-vendor.ts:43` export. Q1 yes, Q2 yes, Q3 yes (two live callers on old contract while a third bypasses both — invisible dispatch divergence).

9. **170 `__UNTRANSLATED__` keys in de/it/fr locales render to visitors** — 170 keys in each of German, Italian, and French are placeholder sentinels. The site is claimed to support 6 locales but 3 of them show raw `__UNTRANSLATED__: ...` strings to real visitors. This is AI-translatable content (navigation, form labels, tour copy) — no owner-domain knowledge needed beyond what is in `en.json`. Q1 yes (en.json is the source, all keys exist), Q2 yes (standard i18n translation, AI can produce), Q3 yes (SEO liability + user-facing regression). Note: spec 005 (locale strategy) flags this as needing an owner decision on whether to prune IT+FR; if owner chooses to prune, this is a 2-line config change instead; if owner chooses to keep 6 locales, AI translates. Either way it is code-resolvable.

---

## Reasoning notes

**D vs B close calls:**

- **D9 (translations)**: Could be B if the owner decides to prune IT/FR (then it's a 2-line config change). Placed in D because either path (prune OR translate) is pure code/AI work — no owner-domain data is needed for either option. Spec 005 asks for owner input on the *strategy*, but both execution paths are code-only.

- **D6 (deferred-gifts stub)**: The 3 decisions in B16 block the *final wiring*, but the iteration and scheduling logic is independently buildable now. Placed in D because the cron can be partially completed (iterate subs, log which gifts are due today) without the owner decisions, and because any AI can finish the handler the moment B16 is answered.

- **D8 (payment fork)**: Could be argued as "tech debt, not user-facing" and demoted to tech-debt section. Kept in D because two live user-facing callers (`/adopt` and `/gifts`) run on a stale dispatch path while a third route bypasses the dispatcher entirely — this creates an invisible divergence that could prevent a payment path from activating correctly.

- **D5 (picker images)**: The CDN URLs are in `alpacasibiza-content.ts`; the alpacas data file has `image: null`. This is a 1-file data-threading fix, not new content. Owner does not need to supply anything; the images are already scraped and stored. Confirmed as D (code-only bridge, not owner asset).

- **Gifts FAQ (merged into D4)**: PEER_COMPARISON says the `gifts.faq` section has translation keys but nothing renders them. Grep confirms 0 FAQ references in the gifts page file. This is a missing `<FAQ />` component call — pure code — consolidated into D4 alongside the price conflict fix since both touch the same file.

- **Discord notify bug**: SYSTEM_PARITY_REGISTER flagged this as broken (Slack Block Kit sent to Discord). Re-checked `lib/owner-notify.ts` — the fix is already in: `sendDiscord` now correctly uses `{ content, embeds }` not `{ text, blocks }`. Not in D.

- **Experiences i18n keys rendering raw strings**: PEER_COMPARISON (2026-06-05) reported 14 missing keys. Re-check today shows keys are present in `en.json` and the experiences page uses `getTranslations()` correctly. Not in D.

- **Skein /adopt URL bug**: PEER_COMPARISON reported `alpaca-picker.tsx:54` hardcoded `/adopt`. Re-check today shows this was fixed (comment at line 56-57 confirms it now uses `pathname`). Not in D.

- **spec 007 (Stripe keep-warm)** and **spec 009 (Mollie Connect)**: Both have explicit "do not build speculatively" gates (Stripe: "owner picks a vendor"; Mollie Connect: "first tenant signs"). Placed in C, not D.

- **spec 008 (alpaca content pipeline / admin upload)**: The spec describes a full admin upload flow. However, CDN URLs are already scraped into `alpacasibiza-content.ts`, and the admin photo-manager page at `/admin/alpacas/[id]/photos` already exists. This spec is now only needed if the owner wants to upload new photos — an owner-triggered action, not a code gap. Placed in B (owner action), not D.
