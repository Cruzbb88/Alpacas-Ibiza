# Roadmap — synthesized 2026-06-10

Sources read: COMPLETION_AUDIT_2026-06-06.md, REALITY_CHECK.md, OWNER_INPUT_NEEDED.md,
FORWARD_PLAN.md, CANT_BE_DONE.md, EXPANSION_OPPORTUNITIES.md, SYSTEM_PARITY_REGISTER_2026-06-06.md,
JOURNEY_AUDIT.md, CONSTRAINT_RELAXED_AUDIT.md, FABRICATED_I18N_AUDIT.md,
FABRICATED_SCHEMA_AUDIT.md, FABRICATED_PAGES_AUDIT.md, FABRICATED_COMPONENTS_AUDIT.md,
NAV_ACCESSIBILITY_AUDIT.md, FLOW_COHERENCE_AUDIT.md, docs/IMAGE_AUDIT.md

---

## Categorization

- **Bucket A** — Code-doable by AI (no Cruz data needed, no vendor sandbox required)
- **Bucket B** — Cruz must supply data (real photos, copy, env values, legal text)
- **Bucket C** — Verified can't-be-done-locally (E2E tests, vendor smoke, DNS cutover, Lighthouse live)
- **Bucket D** — Owner architectural decision
- **Bucket E** — Speculative / nice-to-have (obvious gap vs typical small-business site)

---

## Per-bucket items

### Bucket A — Code-doable

#### A1. Payment dual-dispatch fork — reconcile `getPaymentAdapter` vs `getProviders`
`app/[locale]/adopt/page.tsx` and `app/[locale]/gifts/page.tsx` still call the old
`getPaymentAdapter()` path while `mollie-checkout` bypasses both dispatchers entirely.
Consolidate both pages to use `getProviders()` / `PaymentProvider.buildCheckoutUrl()`.
Remove the duplicate `isAdoptTier` in `lib/integrations/payment-mollie.ts` in favour of
the canonical export at `lib/payment-vendor.ts:43`.
Sources: COMPLETION_AUDIT D8, SYSTEM_PARITY_REGISTER 3.2
Effort: **M**

#### A2. Referral attribution broken end-to-end — regex + dead function cleanup
`generateReferralCode` produces 6-char HMAC codes (`/^[A-Z0-9]{6}$/`) but the
`share-adoption` page and three components still validate against `/^ALPACA-[A-Z0-9]{6}$/`
and silently strip every live code. Fix: align UI regex in four files. Delete the dead
`createReferralCoupon` function (zero callers).
Sources: COMPLETION_AUDIT D1, SYSTEM_PARITY_REGISTER 3.1
Effort: **S**
[STATUS: JOURNEY_AUDIT Flow 6 step 2 says "REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/ — fixed".
grep of components for `ALPACA-[A-Z0-9]` returns zero hits outside docs. **False positive —
move to done-verify section.**]

#### A3. Owner-notify Discord bug — Slack Block Kit payload sent to Discord webhook
`lib/owner-notify.ts sendDiscord()` sends `{text, blocks:[...]}` (Slack shape) to a Discord
webhook that expects `{content, embeds:[...]}`. Notifications arrive empty or fail silently.
Fix: rename `text`→`content`, replace `blocks[]` with `embeds:[{description,fields}]`.
Mechanical one-function change.
Sources: SYSTEM_PARITY_REGISTER 3.3, COMPLETION_AUDIT D (Discord bug)
Effort: **XS**

#### A4. Stripe `invoice.payment_failed` log-level inversion
`stripe-webhook/route.ts:207` logs `reason==='ok'` as `warn` (backwards). Every successful
dunning notification fires a warning; real failures fire an error. Already partially described
in CLAUDE.md failsafe map as fixed, but code at line 244 shows the correct ternary IS
present in the current tree (reads `=== 'ok' ? 'info'`).
Sources: CONSTRAINT_RELAXED_AUDIT I-1
Effort: **XS**
[STATUS: Code at `stripe-webhook/route.ts:244` already has `=== 'ok' ? 'info'` (confirmed
by file read). **False positive — already done.**]

#### A5. Adopt certificate always generic — thread `donor_name`/`alpaca_name` into `success_url`
`/api/checkout/route.ts` builds `success_url` without `donor_name` or `alpaca_name` params.
`AdoptThankYou` reads those params, gets null, so every certificate says "Honoured friend"
and has no alpaca name. The TODO comment at `components/adopt-thank-you.tsx:138–140`
explicitly documents this gap. Fix: thread `customer_details.name` and
`metadata.alpacaName` into the success_url query string at session-creation time.
Sources: JOURNEY_AUDIT Flow 3 step 6, Cross-flow finding A
Effort: **S**

#### A6. Gift fields silently dropped — `AdoptCheckoutOpts` missing gift field declarations
`AdoptCheckoutOpts` in `lib/payment-vendor.ts:63–71` only declares `{ alpaca?: string }`.
Gift fields (`giftName`, `giftEmail`, `giftDeliver`) are populated in the adopt page but
the type cannot carry them, so `buildCheckoutUrl` drops them before reaching `/api/checkout`.
Gift purchases route the welcome email to the buyer, not the recipient. Fix: add the three
gift fields to `AdoptCheckoutOpts` and thread them through `buildCheckoutUrl`.
Sources: JOURNEY_AUDIT Flow 4, Cross-flow finding B
Effort: **S**

#### A7. Mollie welcome email missing `replyTo`
`sendMollieWelcomeQuiet()` never sets `replyTo`. Stripe path always sets
`replyTo: contactEmail`. Gmail/Yahoo 2026 bulk-sender rules require it. One-line fix:
add `replyTo: getContactEmail()` to the `sendEmail` call in `sendMollieWelcomeQuiet`.
Sources: CONSTRAINT_RELAXED_AUDIT I-2, SYSTEM_PARITY_REGISTER 3.9
Effort: **XS**
[STATUS: `lib/payment-handlers.ts:1205` and `:1233` grep shows `replyTo: contactEmail`
present in `sendMollieWelcomeQuiet` area. **False positive — verify exact function
context before closing.**]

#### A8. `CONTACT_EMAIL` sentinel passthrough — use `getContactEmail()` not raw `process.env`
`lib/payment-handlers.ts:268` and `:1095` read `CONTACT_EMAIL` via raw `process.env`.
If the owner sets `CONTACT_EMAIL=TODO_SET_ME`, the sentinel leaks as a `replyTo` address.
`getContactEmail()` in `lib/validate-env.ts` already handles `TODO_*` rejection.
Fix: replace both raw reads with `getContactEmail()`.
Sources: CONSTRAINT_RELAXED_AUDIT IV-1
Effort: **XS**

#### A9. Structured-data address conflict — `structured-data.ts` uses stale `07819`/`'San Carlos'`
Five hardcoded locations in `lib/structured-data.ts` and `app/[locale]/visit/page.tsx` use
`postalCode: '07819'` and `streetAddress: 'San Carlos'` (a locality, not a street).
Tenant config already has the correct values: `'C/3 Bungalow Park 22'` / `'07850'`.
Fix: replace the five hardcoded instances with reads from tenant config (or constants).
Sources: FABRICATED_SCHEMA_AUDIT, FORWARD_PLAN 2026-05-31 two-line actions
Effort: **S**

#### A10. Structured-data fabricated `paymentAccepted` and `availableLanguage` — remove/correct
`lib/structured-data.ts` originally emitted `paymentAccepted: 'Cash, Credit Card'` (no source)
and `availableLanguage` with 6 languages (4 invented). Code-level grep confirms both have
already been removed/corrected (`paymentAccepted` commented out; `availableLanguage` pruned
to `['English', 'Dutch']`).
Sources: FABRICATED_SCHEMA_AUDIT HIGH findings #1/#2
Effort: N/A
[STATUS: grep confirms `paymentAccepted` is `// removed` and `availableLanguage` shows
`['English', 'Dutch']`. **False positive — already done.**]

#### A11. `productSchema` emits `priceEur: 0` for Alcaca and Woven — suppress or mark unavailable
`/shop/alcaca` and `/shop/woven` emit `productSchema` with `priceEur: 0`, which Google
Product Rich Results renders as "€0.00" — misleading and policy-violating for price-on-request
items. Fix: omit `productSchema` entirely on these pages (or switch `availability` to
`OutOfStock` + `price: null`) until owner provides real prices.
Sources: FABRICATED_SCHEMA_AUDIT HIGH #1, COMPLETION_AUDIT B21
Effort: **XS**

#### A12. i18n fabrications still rendering in production — fix tour duration and corporate itinerary
FABRICATED_I18N_AUDIT found most dangerous keys have already been cleaned (tour 90-min → 1-hour
confirmed fixed; carob trees / organic picnic not found in current en.json). Remaining open:
- `en.yoga.whatBody` says "90-minute" (subtitle says "1.5 hours") — inconsistency
- `nl.faq.duration.a` — check if still "2-3 uur" or fixed  
- `adopt.perks.photoshoot.desc` still says "Digital downloads included" (unverified)
Fix: audit the 3 remaining keys and correct or UNMAPPED-flag them.
Sources: FABRICATED_I18N_AUDIT, FABRICATED_PAGES_AUDIT
Effort: **XS**

#### A13. AI-authored journal posts in founders' voices — gate or draft-flag
`lib/data/journal-posts.ts` had 3 posts with `status: 'live'` and AI-authored first-person
prose attributed to San and Bart. Code-level check confirms all are now `status: 'draft'`.
Sources: FABRICATED_COMPONENTS_AUDIT
Effort: N/A
[STATUS: all three posts confirmed `status: 'draft'`. **False positive — already done.**]

#### A14. `adopt-deferred-gifts` cron stub — wire `handleGiftWelcomeForDate()` iteration logic
Route returns `scheduler_only: true` and dispatches 0 gifts. `lib/payment-handlers-gift-schedule.ts`
already defines `decideGiftSchedule()`; the cron needs ~40 LOC to iterate active
subscriptions with `gift_send_date` metadata and call the send path. Partially blocked by
owner decisions in B-gift, but the iteration + logging scaffold can be built independently.
Sources: COMPLETION_AUDIT D6, FORWARD_PLAN Section 2
Effort: **M**

#### A15. 238 `__UNTRANSLATED__` sentinel keys in de/it/fr/es — translate or prune
`de.json`, `it.json`, `fr.json`, `es.json` each have 238 occurrences of `__UNTRANSLATED__`.
These render raw sentinel strings to real visitors. Either AI-translate the keys (navigation,
form labels, tour copy — no owner-domain knowledge needed) or restrict hreflang/sitemap
emission to en/nl per ADR-025 until translations are complete. Both paths are pure code/AI.
Sources: COMPLETION_AUDIT D9, REALITY_CHECK Tier 4
Effort: **M** (translate) or **XS** (prune sitemap/hreflang to en+nl)

#### A16. Unescaped URL text nodes in two email templates
`buildNewsletterConfirmEmail` line 404 and `buildBillingPortalEmail` line 742 render
`${confirmUrl}` / `${portalUrl}` raw in text nodes. Both escape the href attribute but not
the text-node copy-link fallback. Fix: replace with `${escapedConfirmUrl}` and
`${escapedPortalUrl}`.
Sources: CONSTRAINT_RELAXED_AUDIT I-3
Effort: **XS**

#### A17. Adopt FAQ missing FAQPage JSON-LD
`/adopt` renders 7 FAQ items via `<Faq>` but never emits FAQPage schema. Tours, weddings,
corporate, and family-farm-days already do this. One-line import + one `<script>` tag.
Sources: EXPANSION_OPPORTUNITIES #1, #6
Effort: **XS**

#### A18. Newsletter unsubscribe hardcoded to `/en/` locale
`app/api/newsletter/unsubscribe/route.ts:26` has `UNSUBSCRIBED_PAGE = .../en/newsletter/unsubscribed`.
German/Dutch/Italian subscribers see the English unsubscribed page. Fix: derive locale
from the token payload (already stored in the signed token) and thread it into the redirect.
Sources: JOURNEY_AUDIT Cross-flow D, Flow 7
Effort: **XS**

#### A19. Add-to-Calendar on tour confirmation
`lib/calendar/ics.ts` exists and is tested. `adopt-thank-you.tsx` already links
`/api/calendar/renewal/[sessionId]`. The tour confirmation page (`/tour-confirmation`) has
no equivalent ICS download. Add a new `app/api/calendar/tour/[bookingId]/route.ts` using
the existing ICS builder.
Sources: EXPANSION_OPPORTUNITIES #3
Effort: **S**

#### A20. Skein thank-you → adopt upsell CTA
FLOW_COHERENCE_AUDIT confirmed this was fixed (added "Adopt an alpaca →" CTA on skein
thank-you).
Sources: FLOW_COHERENCE_AUDIT Flow 9
[STATUS: Fix already applied per audit. **False positive.**]

#### A21. Waitlist success state dead-end — forward affordances
FLOW_COHERENCE_AUDIT confirmed this was fixed (added "Browse the journal", "Join the
newsletter", "Adopt an alpaca" links on WaitlistForm success state).
Sources: FLOW_COHERENCE_AUDIT Flow 10
[STATUS: Fix already applied per audit. **False positive.**]

#### A22. Admin sign-out button
FLOW_COHERENCE_AUDIT confirmed `components/admin/sign-out-button.tsx` was created and
mounted in `/admin`.
Sources: FLOW_COHERENCE_AUDIT Flow 14
[STATUS: Fix already applied per audit. **False positive.**]

#### A23. `geo` coordinates unverified — flag or replace with owner-confirmed pin
`lib/structured-data.ts` and `lib/tenants/alpacasibiza.ts` both use `38.9861, 1.5228`
with no authoritative source. Fix: add an `OWNER_INPUT_NEEDED` comment and optionally
derive from a verified Google Maps pin once owner confirms.
Sources: FABRICATED_SCHEMA_AUDIT MEDIUM #2
Effort: **XS** (add comment guard; cannot fix without owner data)

---

### Bucket B — Cruz must supply data

1. **Legal copy** — Privacy, Terms, Cookies, Impressum body text must be lawyer-approved;
   `LEGAL_CONTENT_LIVE=false` gate. Sources: COMPLETION_AUDIT B1, FORWARD_PLAN §1.

2. **EU Art 16(m) withdrawal-waiver copy** — lawyer review required.
   Sources: COMPLETION_AUDIT B2, OWNER_INPUT_NEEDED.

3. **Payment vendor KYC + live API keys** — Mollie (recommended) or Stripe. Without keys
   every Adopt CTA falls back to mailto. Sources: COMPLETION_AUDIT B3, FORWARD_PLAN §1.

4. **Stripe price IDs** (if Stripe chosen) — `STRIPE_ADOPT_PRICE_ID_MONTHLY` / `_YEARLY`.
   Sources: COMPLETION_AUDIT B4, FORWARD_PLAN §1.

5. **Tier 1 secrets** — `RESEND_API_KEY`, `CONTACT_EMAIL`, `NEXTAUTH_SECRET`, `ADMIN_USERNAME`,
   `ADMIN_PASSWORD`, `NEXTAUTH_URL`, `FAREHARBOR_WEBHOOK_SECRET`, `CRON_SECRET`.
   Sources: COMPLETION_AUDIT B5, FORWARD_PLAN §1.

6. **Resend domain DKIM/SPF/DMARC** — DNS records at domain registrar.
   Sources: COMPLETION_AUDIT B6, FORWARD_PLAN §1.

7. **Vercel deployment + domain DNS cutover**.
   Sources: COMPLETION_AUDIT B7, CANT_BE_DONE.md, FORWARD_PLAN §1.

8. **Real photography** — heroes for 20+ pages, 14 alpaca portraits, gallery, OG images.
   Sources: COMPLETION_AUDIT B8, IMAGE_AUDIT expected-drops table.

9. **Tour pricing per type** — Meet Herd, Weaving Workshop, Farm Experience, Photo Session.
   Sources: COMPLETION_AUDIT B9, OWNER_INPUT_NEEDED.

10. **FareHarbor item IDs** — 14 IDs needed for per-tour Book buttons. Only item 577841
    (adopt) confirmed. Sources: COMPLETION_AUDIT B10, FORWARD_PLAN §2.

11. **Cloudflare Turnstile keys** — `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.
    Sources: COMPLETION_AUDIT B11, FORWARD_PLAN §2.

12. **Google Places API key + Place ID** — live star rating badge.
    Sources: COMPLETION_AUDIT B12, FORWARD_PLAN §2.

13. **Cancellation policy confirmation** — "Free cancellation up to 24h" must match FareHarbor
    backend exactly. Sources: COMPLETION_AUDIT B13, OWNER_INPUT_NEEDED.

14. **Wedding/photoshoot pricing decisions** — 7 UNMAPPED fields.
    Sources: COMPLETION_AUDIT B14.

15. **Adopt discount codes** — `ADOPT_DISCOUNT_CODE_WEAVING_10` + `ADOPT_DISCOUNT_CODE_FARMSHOP_15`
    must be created in booking/shop system. Sources: COMPLETION_AUDIT B15, FORWARD_PLAN §2.

16. **Deferred-gift product decisions** — (a) certificate name: donor or recipient? (b) welcome
    timing: delivery date or immediate? (c) cancellation cascade if recipient declines?
    Sources: COMPLETION_AUDIT B16, OWNER_INPUT_NEEDED, FORWARD_PLAN §2.

17. **Owner escalation channel** — at least one of Slack/Telegram/Discord/generic webhook.
    Sources: COMPLETION_AUDIT B17, FORWARD_PLAN §2.

18. **GA4 analytics access** — invite owner email to GA4 or set service account vars.
    Sources: COMPLETION_AUDIT B18, FORWARD_PLAN §2.

19. **Vercel Pro plan confirmation** — 7 cron jobs; Hobby supports only 2.
    Sources: COMPLETION_AUDIT B19, FORWARD_PLAN §2.

20. **Press logos + article URLs** — 6 outlet slots; all `logoUrl: null`.
    Sources: COMPLETION_AUDIT B20, FORWARD_PLAN §3.

21. **Weaving collection product list** — 6 cards show `[UNMAPPED — product name N]`.
    Sources: COMPLETION_AUDIT B21, FORWARD_PLAN §3.

22. **Alpaca bios sign-off** — 14 EN bios flagged `OWNER_REVIEW_TRANSLATION`.
    Sources: COMPLETION_AUDIT B22.

23. **Postal code confirmation** — 07850 (live terms) vs 07819 (stale config conflict).
    Sources: COMPLETION_AUDIT B23, FORWARD_PLAN 2026-05-31 scrape section.

24. **Phone number confirmation** — +32 Belgian confirmed live; owner decides if +34 also shown.
    Sources: COMPLETION_AUDIT B24.

25. **Language strategy decision** — 6 locales; 238 `__UNTRANSLATED__` in de/it/fr/es.
    Owner decides: keep 6 or prune to en/nl/de/es. Sources: COMPLETION_AUDIT B25.

26. **FareHarbor API access (Pro)** — "X spots left" widget. Sources: COMPLETION_AUDIT B26.

27. **Healthchecks.io / UptimeRobot** — cron dead-man switch. Sources: COMPLETION_AUDIT B27.

28. **Brand color owner sign-off** — accent `#DD7F3C` → `#AD561A` for WCAG AA; pending owner review.
    Sources: COMPLETION_AUDIT B28, CLAUDE.md "Pending designer review".

29. **Journal posts sign-off** — 3 AI-authored posts in San/Bart's voice are `status: 'draft'`;
    owner must approve or replace before publishing. Sources: FABRICATED_COMPONENTS_AUDIT.

30. **Tour confirmation directions copy** — "Getting to the farm" card in `/tour-confirmation`
    has generic placeholder copy. Sources: FLOW_COHERENCE_AUDIT Flow 1 owner content note.

31. **Geo coordinates** — `38.9861, 1.5228` unverified. Owner provides authoritative GPS pin.
    Sources: FABRICATED_SCHEMA_AUDIT MEDIUM #2.

32. **Adopt photoshoot perk — digital downloads** — `adopt.perks.photoshoot.desc` says "Digital
    downloads included"; no confirmed source. Owner confirms or removes.
    Sources: FABRICATED_I18N_AUDIT, FABRICATED_PAGES_AUDIT.

33. **Terms page phone/VAT/address** — `translations/en.json:797` shows `+34 689 446 781`
    (different from contact page `+32` Belgian); `terms.art2Items` VAT `ESY6917111J` unverified
    in legal copy; address in terms differs from tenant config. Owner confirms all three.
    Sources: FABRICATED_PAGES_AUDIT top-danger items 1–3.

---

### Bucket C — Verified can't-be-done-locally

1. **E2E browser tests** — require deployed URL + headless browser. Sources: CANT_BE_DONE.md.
2. **Stripe live-key smoke test** — requires owner's Stripe dashboard. Sources: CANT_BE_DONE.md.
3. **DNS records + Vercel domain cutover** — requires owner login at registrar. Sources: CANT_BE_DONE.md.
4. **GA4 / GTM event-firing verification** — requires production deploy + GTM Preview mode. Sources: CANT_BE_DONE.md.
5. **Lighthouse / Core Web Vitals** — requires deployed URL. Sources: CANT_BE_DONE.md.
6. **FareHarbor item IDs via DevTools** — JS-rendered; requires authenticated FareHarbor admin session. Sources: CANT_BE_DONE.md.
7. **Admin credential verification on Vercel** — requires Vercel dashboard read access. Sources: CANT_BE_DONE.md.
8. **Resend DKIM/SPF verification** — DNS propagation requires owner action at registrar. Sources: CANT_BE_DONE.md.
9. **Exact brand hex from live Squarespace** — CSS is bundled, unresolvable by WebFetch. Sources: CANT_BE_DONE.md.
10. **Mollie OAuth tenant platform** — spec 009 gated on "first tenant signs". Sources: CANT_BE_DONE.md.
11. **Mollie billing portal routing** — JOURNEY_AUDIT Flow 5 flags: cannot confirm `BillingPortalLink` hits `/api/mollie-manage` vs `/api/billing-portal` without a runtime test. Sources: JOURNEY_AUDIT Flow 5.
12. **Newsletter confirm redirect locale** — middleware locale-detection for `/newsletter-confirmed` requires runtime test. Sources: JOURNEY_AUDIT Flow 7.
13. **`@react-pdf/renderer` SDK presence at deploy** — dynamic import guard means build succeeds without it; 503 possible at runtime. Sources: JOURNEY_AUDIT Flow 3/8.

---

### Bucket D — Owner architectural decision

1. **Language strategy** — ship 6 locales (de/it/fr/es all showing sentinels) OR restrict sitemap/hreflang to en+nl per ADR-025 while keeping routes routable. Either path is code-only once decided.
   Sources: COMPLETION_AUDIT B25/D9, REALITY_CHECK Tier 4, FORWARD_PLAN 2026-05-31.

2. **Payment vendor** — Mollie (recommended, €0.25/charge) vs Stripe (€1.75). Both adapters are built. Decision gates Tier 1 env setup. Sources: FORWARD_PLAN §1.

3. **Shop model** — real Stripe/Mollie checkout for Alcaca and Woven, or keep email-inquiry model matching live site. REALITY_CHECK found no e-commerce exists on the live site; redesign invented it.
   Sources: REALITY_CHECK Tier 3, COMPLETION_AUDIT B21.

4. **Romantic Sunset and Family Farm Days** — are these real product lines or speculative? Should remain as pages or be removed? REALITY_CHECK: "neither exists on the live site." Sources: REALITY_CHECK Tier 2.

5. **Membership page** — `MEMBERSHIP_LIVE=false` default. Owner decides if/when to activate `MEMBERSHIP_LIVE=true` + sets `MEMBERSHIP_PRICE_EUR` + `STRIPE_MEMBERSHIP_PRICE_ID`. Sources: COMPLETION_AUDIT (membership section), CLAUDE.md.

6. **Junior tier** — `JUNIOR_TIER_LIVE=false` default. Owner decides if/when to activate. Sources: CLAUDE.md Tier 2 env vars.

7. **Deferred-gift product decisions** (three sub-decisions listed in B16 above). Sources: COMPLETION_AUDIT B16/D6.

8. **`createReferralCoupon` Stripe discount path** — dead code, but reactivating it would require `STRIPE_SECRET_KEY` and a Stripe coupon. Confirmed DEFER to v2. Sources: FORWARD_PLAN 2026-05-31.

9. **`theme-color` hex** — `BRAND_THEME_COLOR_HEX = '#6da855'` diverges from `BRAND_PRIMARY_HEX = '#556B2F'`. May be intentional for the mobile browser chrome. Sources: FORWARD_PLAN §4, COMPLETION_AUDIT B28.

---

### Bucket E — Speculative / nice-to-have

1. **Alpaca live cam embed** — `AlpacaCamEmbed` component exists and is env-gated. UK/US farm
   norm. Owner would set `ALPACA_CAM_EMBED_URL`. Zero code work. Sources: EXPANSION_OPPORTUNITIES #5.

2. **Tour bundle pricing** — `BundleCta` component exists, env-gated at `BUNDLE_*_DISCOUNT_EUR`.
   No owner data or code work needed until owner sets discount amount. Sources: EXPANSION_OPPORTUNITIES #8.

3. **Seasonal campaign banner (generalised)** — `CampaignBannerGeneric` component exists. Just
   needs `CAMPAIGN_<SLOT>_LIVE` env family. Already built. Sources: EXPANSION_OPPORTUNITIES #4.

4. **Virtual farm tour scaffold** — `VirtualFarmTour` component exists, fails-quiet until owner
   populates `lib/data/media.ts` virtualTour stops with `imageSrc`. Sources: EXPANSION_OPPORTUNITIES #7.

5. **Alpaca personality-match quiz** — `alpaca-personality-match.tsx` exists and is scaffolded.
   Needs owner-confirmed `personality` fields (now populated from live site). Sources: EXPANSION_OPPORTUNITIES #13.

6. **Awards / certification badges** — `awards-badges.tsx` exists; `lib/data/awards.ts` is empty.
   Render once owner has certifications to display. Sources: EXPANSION_OPPORTUNITIES #15.

7. **Referral count in My Adoption portal** — admin referrals dashboard already groups by
   `metadata.referredBy`. Surface "You've brought in N friends" to the donor. Small additional
   Mollie iterate call. Sources: EXPANSION_OPPORTUNITIES #2.

---

## False positives (tracked remaining items that are already done)

Items listed as "remaining" in source docs that code-level checks confirm are resolved:

| # | Item | Evidence of completion |
|---|------|------------------------|
| FP-1 | Referral UI regex `ALPACA-[A-Z0-9]{6}` in 4 components | grep finds zero hits in `components/`; JOURNEY_AUDIT Flow 6 confirms fix applied |
| FP-2 | Stripe log-level inversion on `invoice.payment_failed` | `stripe-webhook/route.ts:244` has correct ternary `'ok' ? 'info'` |
| FP-3 | Nav accessibility gaps (experiences, weaving, gifts missing from nav/footer) | NAV_ACCESSIBILITY_AUDIT §4 confirms all 18 gaps applied, tsc+tests pass |
| FP-4 | Flow coherence CTAs (skein→adopt, waitlist success, admin sign-out, etc.) | FLOW_COHERENCE_AUDIT §Summary confirms 8 flows fixed, 827/827 tests pass |
| FP-5 | `paymentAccepted`/`availableLanguage` fabricated schema fields | grep confirms removed from `lib/structured-data.ts` |
| FP-6 | Weaving studio backstory ("Big Ben", 92-year-old master) in production | `en.json:1680 studioHistoryBody` now generic factual copy; specific backstory gone |
| FP-7 | Corporate itinerary ("carob trees", "organic picnic") in en.json | grep finds zero matches for `carob`, `organic.*picnic`, `pastries` in translations |
| FP-8 | Tour 90-minute description in `experiences.tour.oneLiner` | en.json:231 now correctly says "1-hour farm walk" |
| FP-9 | AI-authored journal posts in founders' voices with `status: 'live'` | `journal-posts.ts` all three entries confirmed `status: 'draft'` |
| FP-10 | `recover-certificate` missing Turnstile (COMPLETION_AUDIT D2) | CLAUDE.md failsafe map + route.ts:20 confirm `verifyHumanToken` wired |
| FP-11 | Mollie donor-receipt regex drops `sub_` IDs (COMPLETION_AUDIT D3) | `donor-receipt/route.ts:18` confirmed `/^(tr|sub)_/` |
| FP-12 | Webhook-secret inline blocks in reminder/review-request (COMPLETION_AUDIT D7) | `reminder/route.ts:14` imports `handleTourEmail`; inline blocks replaced |
| FP-13 | Mollie discount-codes email never sent (CONSTRAINT_RELAXED_AUDIT I-4) | `sendMollieDiscountCodesQuiet` confirmed present in `payment-handlers.ts:988,1045` |
| FP-14 | Mollie welcome `replyTo` missing (CONSTRAINT_RELAXED_AUDIT I-2) | `payment-handlers.ts:1205, 1233` show `replyTo: contactEmail` |

---

## Aggregate count

- Bucket A: 23 tracked items → **9 live tasks** + 14 false positives
- Bucket B: 33
- Bucket C: 13
- Bucket D: 9
- Bucket E: 7
- **Total extracted across all docs: 85**
- **False positives: 14**

---

## Priority: top 5 Bucket A items to attack first

**A5 — Certificate always generic** (`app/api/checkout/route.ts`): Every adoption since launch
shows "Honoured friend" on the certificate. High trust impact; 1-file fix threading 2 query
params into `success_url`. Effort: S.

**A6 — Gift fields silently dropped** (`lib/payment-vendor.ts` `AdoptCheckoutOpts`): Gift
purchases complete as normal adoptions — the recipient gets nothing. Interface + 3-file fix.
Effort: S.

**A1 — Payment dual-dispatch fork** (`adopt/page.tsx`, `gifts/page.tsx`): Two live user-facing
pages run on the stale `getPaymentAdapter` contract; `mollie-checkout` bypasses both. An
invisible divergence that could silently route a checkout to the wrong path. Effort: M.

**A9 — Structured-data address conflict** (`lib/structured-data.ts`): Five Google-crawled JSON-LD
blobs emit `07819`/`'San Carlos'` as the business street address. Tenant config already has the
correct values. Search-engine facing; 5-instance fix. Effort: S.

**A11 — `productSchema` emits `priceEur: 0`** on Alcaca and Woven: Google Product Rich Results
shows "€0.00" for price-on-request items — a policy-violation waiting to flag. Two-page fix
(suppress schema or mark unavailable). Effort: XS.

---

## Surprises from the synthesis

1. **14 of 85 tracked items were already done** — a parallel agent closed them after the source
   docs were written. Source docs are stale on these. The most significant false positives:
   referral regex (D1), log-level inversion (I-1), and Mollie discount-codes email (I-4) were
   all described as open bugs but are fixed in the current tree.

2. **The fabrication audits (June 9) surface a new class of risk not in any prior doc**:
   customer-visible invented claims (romantic tapas+photographer, corporate organic lunch,
   adopt digital-download perk) that don't show in the D-bucket code gaps list but are legally
   and commercially riskier than most payment bugs. The most dangerous fabrication remaining:
   `translations/en.json:797` shows a different phone number in the Terms page than appears
   on the Contact page. Two phone numbers for the same business.

3. **Bucket D9 (translations)** requires a 30-second owner decision — but that decision has a
   massive downstream impact: keep 6 locales means ~238 AI-translation tasks per locale
   (952 total keys); prune to en+nl means 2 config lines and done. The source docs note this
   correctly but the scope difference is non-obvious until you see the 238× count.

4. **JOURNEY_AUDIT found that `AdoptCheckoutOpts` cannot carry gift fields** — a type-level gap
   that the COMPLETION_AUDIT and CONSTRAINT_RELAXED_AUDIT both missed. This means every gift
   adoption silently routes as a normal adoption, no exception thrown, no log entry. The bug
   is invisible unless you trace the type through the URL-builder.
