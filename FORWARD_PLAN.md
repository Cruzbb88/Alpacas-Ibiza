# Forward Plan — Alpacas Ibiza
_Generated 2026-05-30 by overlord. Single source of truth for outstanding work._
_This file sits alongside `OWNER_LAUNCH_RUNBOOK.md` and `OWNER_INPUT_NEEDED.md` as a consolidated index. Do not delete those files — they carry the full step-by-step detail. This file is the one-page view Cruz or the owner reads once to know what still needs to happen._

---

## Last 5 commits
```
e1897b7 fix(overlord): 6 parallel-Sonnet batches — i18n + canonical + a11y + trust
081ce76 fix(human-audit): real-user breakage shipped to e8e297c sibling batch
cf46daa test(meta): per-page meta audit script
c529750 test(e2e): all-pages smoke spec + curl page-check script
e8e297c fix(audit-batch): real bugs visible to donors + dead crons + XSS gate + referral loss
```

---

## SECTION 1 — LAUNCH-BLOCKING (cannot go live without these)

Items that either (a) constitute an active legal risk or (b) render the site non-functional for real users.

- **Legal pages — real text must replace placeholders before the site is public.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1a`, `translations/en.json` keys `legal.privacy.body`, `legal.terms.body`, `legal.cookies.body`, `legal.impressum.body`.
  The pages exist and are gated behind `LEGAL_CONTENT_LIVE=false`. GA4 + GTM + Resend + FareHarbor all run without a lawful-basis disclosure. Spain LSSI-CE Art. 10 requires an Aviso Legal / Impressum page.
  How to resolve: Drop lawyer-approved copy into the four en.json keys (paths documented in `docs/LEGAL_DROP_IN.md`), repeat for the 5 other locales, then set `LEGAL_CONTENT_LIVE=true` in Vercel env. Optionally use the in-site admin content editor at `/admin/content`.

- **Spanish legal identity — CIF, business name, and physical address missing from footer.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1a`, `lib/tenants/alpacasibiza.ts` fields `cif`, `address`.
  Footer legal row auto-appears only when `cif` is non-null.
  How to resolve: Owner provides CIF (format `BXXXXXXXX`), registered business name, and full physical address. Developer sets those fields in `lib/tenants/alpacasibiza.ts`.

- **GDPR consent checkbox absent from newsletter, gift, and adopt flows.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1a`.
  Currently absent. GDPR Art. 7 requires freely given, specific, informed consent before collecting personal data for marketing.
  How to resolve: Owner confirms checkbox copy; developer wires checkbox to form submissions. Mark done only after a developer verifies the checkbox is live.

- **Payment vendor — Mollie or Stripe keys required for adopt-a-paca to work.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1b` (Stripe) and `§1c` (Mollie, recommended).
  Without `MOLLIE_API_KEY` + `MOLLIE_WEBHOOK_SECRET` (or equivalent Stripe vars), every Adopt CTA silently falls back to a `mailto:` link. Zero revenue flows.
  How to resolve: Owner picks vendor. Mollie recommended (€0.25/charge vs Stripe €1.75; SEPA mandates don't expire). Complete KYC, copy live API key, generate webhook secret (`openssl rand -hex 32`), set `PAYMENT_VENDOR=mollie MOLLIE_API_KEY=live_xxx MOLLIE_WEBHOOK_SECRET=<hex>` in Vercel env. Full clickpath: `OWNER_LAUNCH_RUNBOOK.md §6`.

- **Stripe price IDs — required if choosing Stripe as payment vendor.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1b`, `CANT_BE_DONE.md` "Stripe product / price ID creation".
  `STRIPE_ADOPT_PRICE_ID_MONTHLY` and `STRIPE_ADOPT_PRICE_ID_YEARLY` must be created in the Stripe dashboard. Checkout returns 503 without them.
  How to resolve: Stripe Dashboard → Products → Add product → Recurring €75/mo → copy Price ID. Repeat for €900/yr one-time. Paste into Vercel env vars. Owner picks: ___ (Stripe or Mollie).

- **Tier 1 secrets — site is unsafe or non-functional without all of these set in Vercel env.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1e`, `lib/validate-env.ts`.
  Missing vars trigger fail-CLOSED guards (503 responses or admin login blocked). No defaults exist.
  How to resolve: Set all of the following in Vercel Project → Settings → Environment Variables (Production):
  ```
  RESEND_API_KEY        (Resend dashboard → API Keys)
  CONTACT_EMAIL         (where owner receives booking inquiries + alerts)
  NEXTAUTH_SECRET       (openssl rand -base64 32)
  ADMIN_USERNAME        (not "admin")
  ADMIN_PASSWORD        (16+ chars)
  NEXTAUTH_URL          https://alpacasibiza.com
  FAREHARBOR_WEBHOOK_SECRET  (openssl rand -hex 32)
  CRON_SECRET           (openssl rand -hex 32)
  ```
  Verify at runtime: visit `/admin/env-check` after deploy.

- **Resend sender domain authentication — emails land in spam without this.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §1f`.
  Every adoption welcome, quarterly update, and reminder email sends from `noreply@alpacasibiza.com`. Without DKIM/SPF/DMARC DNS records, Gmail and Outlook spam-folder them. Donors think payment failed.
  How to resolve: Resend dashboard → Domains → Add `alpacasibiza.com` → paste 3 DNS records into domain registrar → wait for 3 green checks. Also set up bounce+complaint webhook (§1g) and set `RESEND_WEBHOOK_SECRET=whsec_...` in Vercel.

- **Vercel deployment and domain cutover.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2k`, `CANT_BE_DONE.md` "Domain DNS coordination".
  The site is not live until: Vercel account created, repo connected, all Tier 1 + Tier 2 env vars pasted, custom domain `alpacasibiza.com` pointed at Vercel via A + CNAME records.
  How to resolve: Full step-by-step at `OWNER_LAUNCH_RUNBOOK.md §2k`. DNS cutover runbook at `docs/deploy/cutover.md` (if it exists) or follow the Vercel domain setup UI. Run at a low-traffic window after lowering TTL 24h ahead.

- **Phone number to display — currently showing a Belgian mobile.**
  Referenced: `OWNER_INPUT_NEEDED.md §"Phone contact method"`, `OWNER_LAUNCH_RUNBOOK.md §4d`.
  Footer and WhatsApp CTA currently use `+32 475 58 65 44`. If this is not the correct public-facing number for Ibiza operations, calls and WhatsApp messages go to the wrong destination.
  How to resolve: Owner confirms this is the correct number, or provides a Spanish +34 number. Developer updates `lib/tenants/alpacasibiza.ts` phone field. Owner picks: ___

- **Cancellation policy and tour prices — currently showing placeholder values.**
  Referenced: `OWNER_INPUT_NEEDED.md §"Cancellation policy"` and `§"Pricing"`, `OWNER_LAUNCH_RUNBOOK.md §4c`.
  "Free cancellation up to 24h before your visit" is hard-coded on every Book CTA. This must match the FareHarbor backend setting exactly. Tour cards show no "from €X/person" anchor (10-15% conversion lift if added).
  How to resolve: Owner confirms (a) exact cancellation window — currently showing 24h — and whether partial refunds apply; (b) starting prices for each of the 4 tours (Meet the Herd, Weaving Workshop, Farm Experience, Photo Session) and whether peak/off-season pricing differs.

---

## SECTION 2 — POST-LAUNCH QUALITY (within first week)

Features that degrade the experience or suppress revenue if left unset after launch.

- **FareHarbor item IDs — every "Book this tour" button falls back to the main calendar without them.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2a`, `lib/config.ts getFareHarborTourUrl()`.
  Without per-tour IDs, Book buttons send every user to the generic FareHarbor calendar (not broken, but loses conversion). 14 item IDs needed.
  How to resolve: FareHarbor admin → Items → click each item → copy numeric ID from URL. Set in Vercel env: `FAREHARBOR_ITEM_TOUR_MEET_HERD`, `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP`, `FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE`, `FAREHARBOR_ITEM_TOUR_PHOTO_SESSION`, `FAREHARBOR_ITEM_YOGA`, `FAREHARBOR_ITEM_GIFT_CARD`, `FAREHARBOR_ITEM_WEDDINGS`, `FAREHARBOR_ITEM_PHOTOSHOOTS`, `FAREHARBOR_ITEM_ROMANTIC_SUNSET`, `FAREHARBOR_ITEM_FAMILY_FARM_DAYS`, `FAREHARBOR_ITEM_BUSINESS_INCENTIVES`, `FAREHARBOR_ITEM_WOVEN`, `FAREHARBOR_ITEM_ALCACA`, `FAREHARBOR_ITEM_COMMISSION`.

- **FareHarbor API access (Pro plan) — "X spots left" widget and owner digest are dark without it.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2b`, `CANT_BE_DONE.md` "FareHarbor API operations".
  Live availability widget and real booking numbers in the weekly digest both require `FAREHARBOR_APP_KEY` + `FAREHARBOR_USER_KEY`. Currently stubs.
  How to resolve: Email `support@fareharbor.com`: "Please grant External API access for alpacasibiza. We need app key and user key." Once received, set both in Vercel env. Also ask FareHarbor to configure webhook POSTs (details in §2b).

- **Cloudflare Turnstile — contact, newsletter, commission forms are unprotected without it.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2c`.
  Forms work but accept any bot submission. 5-minute setup; free tier.
  How to resolve: dash.cloudflare.com → Turnstile → Add site → domain `alpacasibiza.com` → Managed widget → copy Site Key + Secret Key → set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Vercel env.

- **Cron dead-man's switch — silent cron failures send no alert without Healthchecks.io.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2g`.
  Three Vercel Cron jobs run the MRR digest, owner digest, and quarterly adopter email. If Vercel stops firing them, nothing alerts the owner.
  How to resolve: Create free account at healthchecks.io → create 3 checks → set `HEARTBEAT_OWNER_MRR_DIGEST_URL`, `HEARTBEAT_OWNER_DIGEST_URL`, `HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL` in Vercel env.

- **Owner escalation alerting — dunning failures are silently discarded without at least one channel.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2f`.
  When a donor's payment fails twice or more, the code escalates via `lib/owner-notify.ts`. Without at least one channel set, the escalation is swallowed.
  How to resolve: Set at least one of: `OWNER_SLACK_WEBHOOK_URL`, `OWNER_TELEGRAM_BOT_TOKEN` + `OWNER_TELEGRAM_CHAT_ID`, or `OWNER_GENERIC_WEBHOOK_URL`.

- **Google Places integration — star rating badge on tours page is null without it.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2d`.
  `GoogleReviewsBadge` renders null until `GOOGLE_PLACES_API_KEY` + `GOOGLE_PLACES_PLACE_ID` are set.
  How to resolve: GCP Console → enable "Places API (New)" → create API key restricted to `alpacasibiza.com` → find Place ID via Google's Place ID Finder for "Alpacas Ibiza" → set both vars in Vercel env.

- **Adopt discount codes — welcome email shows a placeholder until codes exist.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2h`, `lib/email-templates.ts buildAdoptDiscountCodesEmail()`.
  The welcome-email auto-sends a discount-codes follow-up 5 minutes after adoption. Until the env vars are set, the email says "codes arriving within 48h" — creates a support burden.
  How to resolve: Create a 10% discount code in the weaving shop/booking system → `ADOPT_DISCOUNT_CODE_WEAVING_10=<code>`. Create a 15% code in the farm shop → `ADOPT_DISCOUNT_CODE_FARMSHOP_15=<code>`.

- **GA4 analytics access for the owner.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2e`.
  The owner currently has no way to see site analytics.
  How to resolve: Option A (3 min): analytics.google.com → Admin → Account Access Management → Add user → owner's Google email, role: Viewer. Option B (in-site dashboard): set `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` from a GCP service account. Owner picks: ___

- **Uptime monitoring — `/healthz` is wired but no external pinger exists.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2l`.
  How to resolve: Create free UptimeRobot account → monitor `https://alpacasibiza.com/healthz` → alert to `CONTACT_EMAIL`.

- **Yoga page — exact session time, off-season schedule, yoga mat provision, instructor name.**
  Referenced: `app/[locale]/yoga/page.tsx:11-17`, `OWNER_INPUT_NEEDED.md §"FareHarbor configuration"`.
  Price (€30), duration (1h 15min), max 6 participants, and Wed/Sat schedule are verified from the live site. The 4 UNMAPPED fields above still show placeholder text in the OwnerConfirmBanner.
  How to resolve: Owner provides the 4 answers; developer replaces UNMAPPED sentinels and removes the OwnerConfirmBanner for this page.

- **Weddings/photoshoots page — 7 UNMAPPED owner decisions.**
  Referenced: `app/[locale]/weddings/page.tsx:264-274`.
  Pricing model (flat rate vs per-hour), number of alpacas included, travel radius, handler cost, photographer arrangement, off-site venue support, and hero photo are all UNMAPPED. Page renders "Contact us for details" placeholders.
  How to resolve: Owner answers each question; developer fills the relevant fields and removes the OwnerConfirmBanner. Owner picks: pricing model ___, alpacas included ___, travel radius ___ km, handler included ___, photographer BYO/supplied ___, off-site delivery ___.

- **Gift adoption — 3 product decisions blocking the deferred-gifts cron.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §7`, `app/api/adopt-deferred-gifts/route.ts:34-35`.
  The gift scheduling infrastructure is built. The cron shell at `/api/adopt-deferred-gifts` is a stub that returns `dispatched: 0` until the 3 decisions are made and a developer wires the handler.
  How to resolve: Owner decides: (a) which name appears on the certificate — donor or recipient? (b) does the welcome email go to recipient on delivery date, or to donor immediately? (c) does cancellation cascade if recipient declines? Developer then wires `handleGiftWelcomeForDate()` into the cron.

---

## SECTION 3 — POLISH / NICE-TO-HAVE

Items that increase conversion or trust but don't block launch.

- **Real photos across all pages — every hero and alpaca card currently uses a gradient fallback.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §4a`, `CANT_BE_DONE.md` "Image asset existence".
  All image slots have fail-quiet fallbacks. Nothing breaks. Real photos lift conversion significantly.
  How to resolve: Owner supplies assets; drop into `public/images/` at the paths in the runbook table (§4a). Key slots: `public/images/heroes/farm.webp` (home), `heroes/yoga.webp`, `heroes/workshop.webp`, `heroes/weddings.webp`, `alpacas/<slug>.webp` (14 alpacas), `gallery/*.webp`. Also: `corporate-hero.webp` and `family-hero.webp` referenced in experiences pages do not exist.

- **Per-alpaca bios, personalities, and fun facts (14 alpacas).**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §4b`, `lib/tenants/alpacasibiza-content.ts`.
  Every alpaca `bio`, `personality`, `colorDescriptor`, `breed`, and `funFact` is currently null (UNMAPPED sentinel). The fun-fact carousel and personality-match filter render as empty until populated.
  How to resolve: Owner provides bio, personality tag, color, breed, and one-sentence fun fact for each of the 14 alpacas. Developer enters into `lib/tenants/alpacasibiza-content.ts`.

- **Weaving page — studio history, 4 process steps, and 3 studio photos UNMAPPED.**
  Referenced: `app/[locale]/weaving/page.tsx:4-6`, `translations/en.json:1301-1314`.
  The weaving page renders these as inline `[UNMAPPED — ...]` placeholders visible to real visitors in the OwnerConfirmBanner. Non-en locales carry the same sentinels.
  How to resolve: Owner provides: founding/studio history paragraph; details on shearing season, washing, spinning, and loom type; 3 photos (studio interior, loom in action, finished scarves) dropped at `public/images/weaving/`.

- **Weaving collection — 6 product cards are all placeholders.**
  Referenced: `app/[locale]/weaving/collection/page.tsx:51-138`.
  All 6 product cards show `[UNMAPPED — product name N]` and no photos. The enquiry flow also needs confirmation (mailto vs `/commission` route).
  How to resolve: Owner provides product names, photos (`public/images/weaving/<product>.webp`), prices, and enquiry routing preference. Owner picks enquiry flow: mailto:info@alpacasibiza.com or /commission? ___

- **Team bios for the About page.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §4e`, `OWNER_INPUT_NEEDED.md §"Team bios"`.
  About page has placeholder team entries. Humanizes the business; major trust lever.
  How to resolve: Owner provides full name, role, 2-3 sentence bio, and headshot per person → drop photos at `public/images/team/<name>.webp`.

- **Testimonials — German names may have ASCII-mangled umlauts.**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §4j`, `lib/data/testimonials.ts`.
  6 testimonials are seeded. Verena's name may show `ue`/`ae` instead of correct umlauts after migration.
  How to resolve: Owner reviews all 6 testimonials at `/tours`. Fix any mangled chars directly in `lib/data/testimonials.ts`.

- **Journal / blog (currently empty-state), Events calendar (renders null), Awards badges (renders null).**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §4g`, `§4h`, `§4i`.
  Three components render null or empty-state until populated. No code change needed — owner supplies content and developer adds entries to `lib/data/journal.ts`, `lib/data/events.ts`, `lib/data/awards.ts` with `status: 'live'`.
  How to resolve: Owner decides whether to populate these at launch or leave them dark. Owner picks: journal at launch ___, events at launch ___, awards at launch ___

- **Press logos — `PressLogos` renders null; 6 outlet slots seeded but all logoUrl are null.**
  Referenced: `lib/data/press.ts:46-82`, `OWNER_LAUNCH_RUNBOOK.md §4a`.
  Component renders null until at least one SVG logo exists at `public/images/press/<outlet>.svg`.
  How to resolve: Owner confirms which press outlets to feature + written permission to use their logos → drops SVG files. Developer sets the outlet names and article URLs in `lib/data/press.ts`.

- **Brand color lock — three different greens currently ship; owner sign-off pending.**
  Referenced: `lib/brand.ts:4-37`, `app/globals.css:43`, `CANT_BE_DONE.md` "Brand-color owner lock".
  Accent color was darkened from `#DD7F3C` to `#AD561A` for WCAG AA compliance (now 7.2:1 on white vs 2.93:1 before). `themeColor` `#6da855` diverges from primary `#556B2F` and may be intentional or a copy-paste error. Owner must sign off before the `CLAUDE.md` "Pending designer review" flag is cleared.
  How to resolve: Owner reviews CTAs and heading colors, confirms the deep burnt-orange accent and dark olive primary are acceptable. If different hex values are wanted, see `lib/brand.ts` update instructions (edit 3 hex values → update CSS vars in `globals.css`).

- **Campaign banner (optional adopt impact-multiplier push).**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2j`, `components/adopt/campaign-banner.tsx`.
  Banner renders null until `ADOPT_CAMPAIGN_HEADLINE` and `ADOPT_CAMPAIGN_END_DATE` are set. Auto-expires.
  How to resolve: Set `ADOPT_CAMPAIGN_HEADLINE`, `ADOPT_CAMPAIGN_SUBLINE`, and `ADOPT_CAMPAIGN_END_DATE` in Vercel env when a seasonal push is active.

- **Newsletter list management (optional SendGrid integration).**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §2i`.
  Resend handles transactional email. SendGrid is optional for marketing list management.
  How to resolve: Owner decides whether to use SendGrid for bulk campaigns. If yes, set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_LIST_ID`. Owner picks: ___

- **Renewal reminder discount code (FareHarbor).**
  Referenced: `OWNER_LAUNCH_RUNBOOK.md §3a`.
  Renewal reminder emails can include a `RETURN10` discount code. Until set, the email still sends but without the code.
  How to resolve: Create `RETURN10` code in FareHarbor → set `FAREHARBOR_DISCOUNT_CODE_RETURN10=RETURN10` in Vercel env.

---

## SECTION 4 — TECHNICAL DEBT (recorded, not blocking)

Code-level limitations documented in ADRs. No owner input required. Upgrade when volume justifies.

- **In-memory rate limiting is process-scoped (single Vercel instance only).**
  Referenced: `lib/rate-limit.ts`, `docs/adr/011-in-memory-rate-limit-vs-kv.md`.
  5 req/5 min per IP on contact/newsletter/commission forms. Does not coordinate across Vercel instances. Acceptable below ~50 req/min.
  How to resolve when needed: Migrate to Vercel KV (`@vercel/kv`) using the interface already designed in ADR 011.

- **In-memory webhook idempotency loses state on cold start.**
  Referenced: `lib/webhook-idempotency.ts`, `docs/adr/001-resend-scheduled-sends.md`.
  Stripe/Mollie event dedup Map is process-scoped (4-day TTL). A cold start (redeploy) can re-process a webhook. At most one stale email per redeploy.
  How to resolve when needed: Migrate `webhookIdempotencyStore` to Vercel KV.

- **In-memory booking schedule store loses state on cold start.**
  Referenced: `lib/booking-schedule-store.ts` (implied by ADR 001), `docs/adr/001-resend-scheduled-sends.md`.
  Same tradeoff as webhook idempotency — Resend `scheduledAt` emails survive independently, but the local store of "what was scheduled" is ephemeral.
  How to resolve when needed: Migrate to Vercel KV.

- **Stripe Connect deferred — multi-tenant revenue sharing not active.**
  Referenced: `lib/payment-vendor.ts:153`, `lib/integrations/payment-stripe-connect.ts`.
  `PAYMENT_VENDOR=stripe-connect` routes to a guard adapter that throws. This is intentional: activating it requires a signed platform agreement.
  How to resolve: Defer until tenant #1 signs a platform agreement. Developer removes the guard and wires the Connect adapter at that point.

- **Subscription renewal event (`invoice.payment_succeeded`) does not update a DB record.**
  Referenced: `app/api/stripe-webhook/route.ts:184`.
  Code logs the renewal but has a `// TODO: update subscription status in DB on renewal` comment. Currently there is no external database — all subscription state is in Stripe/Mollie. Not a problem until a DB layer is added.
  How to resolve: Add a DB layer (Vercel KV, Postgres, or Supabase) and wire `handleStripeInvoicePaymentSucceeded` to update subscription status.

- **`format-price.ts` and `retry.ts` are test-only utilities not wired into any UI.**
  Referenced: `lib/format-price.ts:1`, `lib/retry.ts:1`.
  Both files carry `// TODO: used only in tests; wire into UI or remove if obsolete.`
  How to resolve: Wire `formatPrice` into tour card price display when owner provides tour prices (Section 1). Wire `withRetry` into FareHarbor availability fetch when API keys are provisioned. Or delete if permanently unused.

- **`theme-color` hex diverges from primary brand color — may be intentional or a copy-paste.**
  Referenced: `lib/brand.ts:36-39`.
  `BRAND_THEME_COLOR_HEX = '#6da855'` (lighter green) vs `BRAND_PRIMARY_HEX = '#556B2F'` (olive). The `themeColor` controls the mobile browser chrome / PWA titlebar.
  How to resolve: Owner confirms whether the lighter green is intentional for the mobile titlebar. If not, update `BRAND_THEME_COLOR_HEX` to match primary. Noted as OWNER_INPUT_NEEDED before PWA work begins.

- **Quarterly update email herd-news block is a placeholder pending owner content.**
  Referenced: `lib/email-templates-retention.ts:83-88`.
  The `buildQuarterlyUpdateEmail` function renders an `[Owner action: supply a short seasonal update...]` block in the email body. The cron fires; the email sends; the content block is a placeholder.
  How to resolve: Owner supplies a seasonal update paragraph before each quarterly send. A `QUARTERLY_UPDATE_BODY_<QUARTER>` env var pattern is already documented in the template comment.

- **Unsubscribe audit log is not wired to a persistent store.**
  Referenced: `app/api/newsletter/unsubscribe/route.ts:16`.
  Comment notes: "OWNER_INPUT_NEEDED: wire to persistent store if needed." Currently logs only to Vercel Function Logs.
  How to resolve: If GDPR erasure audit trail is required, wire the unsubscribe event to Vercel KV or a DB table.

---

## SECTION 5 — KNOWN LIMITS (CANT_BE_DONE referents)

Full detail in `CANT_BE_DONE.md`. Summary of immovable limits:

| Limit | Re-check trigger |
|---|---|
| FareHarbor availability / item IDs cannot be read without Pro API credentials | Owner emails FareHarbor support; keys provisioned |
| Exact brand hex values from the live Squarespace site are unresolvable by WebFetch | Owner pastes confirmed hex values from brand spec |
| Domain DNS cutover to Vercel requires owner action at the registrar | Owner confirms DNS records updated and Vercel cert shows "Valid" |
| Stripe product / price IDs must be created in the owner's Stripe dashboard | Owner creates products and sets `STRIPE_ADOPT_PRICE_ID_*` in Vercel |
| GA4 / GTM event firing can only be verified on a production deploy with GTM Preview mode | First Vercel preview deploy + owner opens GTM Preview mode |
| Lighthouse / Core Web Vitals scores require a deployed URL | Vercel preview deploy + Lighthouse in CI |
| E2E tests require a deployed URL and headless browser | Vercel preview deploy |
| FareHarbor admin dashboard operations require an owner-authenticated browser session | Permanently delegated to owner (security model) |
| Admin credential verification on Vercel requires dashboard read access | Owner shares redacted env-var inventory OR pre-deploy CI hook added |
| Decision-decay scoring from historical sessions unavailable (no Cortex, first session) | 5+ sessions completed locally OR Cortex policy lifted |
| git blame / churn history unavailable (no `.git/` at session root) | `git init` run and history committed |

---

_For section-by-section step-by-step instructions, see `OWNER_LAUNCH_RUNBOOK.md`._
_For items flagged as permanently infeasible, see `CANT_BE_DONE.md`._
_For the original owner-input inventory (historical), see `OWNER_INPUT_NEEDED.md`._

---

## 2026-05-31 — Post-scrape gap recheck

Source: `handoff/LIVE_SITE_CONTENT_INVENTORY.md` (full 32-page scrape of alpacasibiza.com, scraped 2026-05-31).

**Pre-scrape owner-blocked gap count: 28**
**Post-scrape true-owner-action count: 17** (11 gaps satisfied or moved to "integration pending")

---

### Newly satisfied / data-exists-integration-pending

| Gap | Pre-scrape status | Post-scrape status | Evidence |
|---|---|---|---|
| Founder names (San De Wilde + Bart) | UNMAPPED | Data exists — integration pending | `/wie-zijn-wij`: H4 "Bart (Oprichter & eigenaar) / San (Oprichter & eigenares)"; legal name Sandra De Wilde on VAT reg |
| Physical address (LSSI-CE Art. 10) | UNMAPPED in `lib/tenants/alpacasibiza.ts` `address` | Data exists — integration pending | `/algemene-voorwaarden`: C/3 Bungalow Park 22, 07850 San Carlos, Baleares, España. Code currently has partial "San Carlos" only. |
| CIF / tax ID | `cif: null` in `lib/tenants/alpacasibiza.ts` | Data exists — integration pending | VAT: **ESY6917111J** extracted from `/algemene-voorwaarden`. Field still `null` in code — developer must set `cif: 'ESY6917111J'`. |
| Legal entity name | UNMAPPED | Data exists — integration pending | Sandra De Wilde — Es Currals Alpacas Ibiza & Wishfulfilling Weaving (from terms page) |
| All 14 alpaca bios (localizedBio) | `bio: null`, `localizedBio` absent | Populated in code | `lib/tenants/alpacasibiza-content.ts` now has NL (verbatim) + EN (translated, OWNER_REVIEW_TRANSLATION flag set) for all 14. Note: `bio` field is still `null` — only `localizedBio` is populated. |
| All 14 alpaca portrait images | `image: null` | CDN URLs set in code | All 14 full-size Squarespace CDN URLs in `lib/tenants/alpacasibiza-content.ts`. Owner must confirm licence/usage rights before launch. |
| Alpaca fun_fact + personality (carousel + filter) | UNMAPPED | Populated in code | All 14 entries have `fun_fact` and `personality` set; filter chips are now functional. |
| Phone number confirmation | Belgian +32 475 58 65 44 — unconfirmed | Confirmed | Live site footer uses same number. Still needs owner decision: is +32 the correct public-facing number for Ibiza operations? Confirmed it is live; owner sign-off pending. |
| Yoga schedule, instructor, price, duration, capacity | UNMAPPED | Data exists — integration pending | `/alpaca-yoga`: Wed + Sat mornings, Elena (10+ yr Hatha Yoga), €30/person, 1h 15m, max 6 pax, private sessions on request. Matches 5 of the 9 UNMAPPED yoga fields. |
| Weaving studio copy (history, process, loom name) | UNMAPPED | Data exists — integration pending | `/informatie-weaving`: San started 2013, Swedish loom named "Big Ben" from 92-yr-old master weaver, natural dyes (hibiscus, avocado), full process narrative extracted. |
| FareHarbor account + flow ID | flow=1257173 hardcoded; adoption item=577841 unconfirmed | Confirmed on live site | All booking buttons use `flow=1257173`; adoption product `items/577841` confirmed from homepage link. Remaining item IDs (yoga, weddings, workshops, etc.) still unresolvable — FH embeds are JS-rendered. |

---

### Still true owner action required

| Gap | Category | Why scrape cannot resolve it |
|---|---|---|
| Privacy policy / Terms / Cookies / Impressum body text | BLOCKING (LEGAL) | Not on live site. Lawyer-approved copy required. `LEGAL_CONTENT_LIVE` stays false. |
| GDPR consent checkbox (newsletter, gift, adopt flows) | BLOCKING (LEGAL) | Owner must confirm checkbox copy; developer wires it. |
| Payment vendor setup (Mollie KYC + live API key, or Stripe) | BLOCKING (REVENUE) | Requires owner to create accounts, complete KYC, generate live keys. |
| Tier 1 secrets (RESEND_API_KEY, NEXTAUTH_SECRET, ADMIN_*, CRON_SECRET, FAREHARBOR_WEBHOOK_SECRET) | BLOCKING (INFRA) | Requires owner to provision Resend account and generate secure random values. |
| Resend sender domain DKIM/SPF/DMARC | BLOCKING (DELIVERABILITY) | DNS records must be set at owner's registrar. |
| Vercel deployment + domain DNS cutover | BLOCKING (INFRA) | Owner must create Vercel account, connect repo, set env vars, update DNS. |
| FareHarbor item IDs (yoga, weddings, workshops, business, gift, romantic-sunset, family-farm-days, alcaca, woven, commission, photoshoots) | POST-LAUNCH | FH embed pages are JS-rendered. Only item 577841 (adopt) confirmed. Owner must log into FH admin dashboard. |
| Cloudflare Turnstile site key + secret key | POST-LAUNCH | Requires Cloudflare account + domain registration. |
| Google Places API key + Place ID | POST-LAUNCH | Requires GCP account + Places API billing. |
| Wedding/photoshoot pricing model | POST-LAUNCH | Live site says "contact us" — owner decision needed on flat rate vs per-hour, alpacas included, travel radius, handler cost. |
| Workshop pricing | POST-LAUNCH | Live site says "on request". Owner must supply price or confirm "on request" is intended in redesign. |
| Weaving collection product titles + prices | POLISH | Collection page is JS-rendered Squarespace commerce — prices not in SSR HTML. Owner must provide product list. |
| Team headshots (San, Bart portrait photos) | POLISH | Owner photos exist on live site but are Squarespace CDN assets — licence for redesign use unconfirmed. Owner must supply or approve. |
| CIF integration into code | INTEGRATION (1 line) | `lib/tenants/alpacasibiza.ts` line 31: change `cif: null` to `cif: 'ESY6917111J'`. Data extracted; just needs developer to apply. |
| Full address integration into code | INTEGRATION (1 edit) | `address.streetAddress` is 'San Carlos' — needs 'C/3 Bungalow Park 22'. `addressLocality` should be 'San Carlos' (07850). Postal code 07819 in code vs 07850 in terms — discrepancy, owner must confirm. |
| Owner escalation channel (Slack / Telegram / webhook) | POST-LAUNCH | Owner must set up at least one channel and provide the webhook URL. |
| Adopt discount codes (weaving 10%, farm shop 15%) | POST-LAUNCH | Owner must create codes in booking/shop system. |

---

### Items confirmed NOT gaps (scrape verified they are correct in code)

| Item | Verified |
|---|---|
| Adopt price €75/month or €900/year | Live site `/adopt-a-paca` confirms both amounts match `lib/config.ts` constants |
| FareHarbor shortname `alpacasibiza` | Confirmed across all 32 pages |
| GA4 `G-Y946QDVVQV` hardcoded | Live site uses same pixel (GTM container loads it) |
| ContactEmail `info@alpacasibiza.com` | Confirmed on `/contact` |
| Instagram `@wishfulfillingweaving` | Confirmed as primary handle on live site |
| Facebook `100066379310193` | Confirmed on live site |
| Phone +32 475 58 65 44 | Confirmed as live site number |
| Adopt benefits (6 tours, 5 kg manure, photo session, 10% weaving discount, 15% farm shop discount, keychain, framed photo, calendar) | All 8 match `/adopt-a-paca` verbatim |

---

### Two-line developer actions unlocked by scrape (no owner input needed)

1. `lib/tenants/alpacasibiza.ts` line 31: `cif: null` → `cif: 'ESY6917111J'` (from `/algemene-voorwaarden`)
2. `lib/tenants/alpacasibiza.ts` address block: `streetAddress: 'C/3 Bungalow Park 22'`, `postalCode: '07850'` (verify 07819 vs 07850 discrepancy with owner before applying)
