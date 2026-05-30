# Owner Launch Runbook
**Generated:** 2026-05-29 — consolidates 9 cycles of build work into a single launch checklist.

This is the runbook to take the site from "code complete" to "live in production." Items are sorted by category and ranked LAUNCH-BLOCKING vs DEGRADED vs POLISH.

Every item here is an **owner action** — no code changes are needed for any of them. The code is wired and waiting; you are filling in content, credentials, and decisions.

---

## 1. BLOCKING — site cannot launch without these

### 1a. Legal & compliance (LEGAL_CONTENT_LIVE flag)

The three legal pages exist and are gated. Until real text is dropped in, each renders a safe "content pending" placeholder. Setting `LEGAL_CONTENT_LIVE=true` is the final flip once text is live.

- [ ] Privacy policy: open `translations/en.json`, replace `[UNMAPPED` placeholder in `legal.privacy.body` with lawyer-approved text. See `docs/LEGAL_DROP_IN.md` for exact key path and format.
- [ ] Terms of Service: same file, `legal.terms.body`
- [ ] Cookie policy: same file, `legal.cookies.body`
- [ ] Repeat for all locales: `de.json`, `nl.json`, `es.json`, `fr.json`, `it.json` (locales without translation can keep the sentinel — page still renders safe placeholder)
- [ ] Set `LEGAL_CONTENT_LIVE=true` in Vercel env once all three en.json keys are real text
- [ ] Spanish CIF (tax ID): open `lib/tenants/alpacasibiza.ts`, set `cif: 'BXXXXXXXX'` — footer legal row auto-appears when this is non-null
- [ ] Registered business name and full physical address: same file, `address` field — required by Spain LSSI-CE Art. 10
- [ ] Impressum / Aviso Legal page: Spain LSSI-CE requires a dedicated legal-notice page. Text goes in `translations/en.json` `legal.impressum.body` (check `docs/LEGAL_DROP_IN.md` for current status of this key).
- [ ] GDPR consent checkbox on newsletter form, gift flow, and adopt CTA — currently absent. Owner confirms the copy; developer wires the checkbox. Mark only when a developer has verified the checkbox is live.

**Why blocking:** GA4 + GTM + Resend + Vercel are all running without a lawful-basis disclosure. This is GDPR Art. 13/14 non-compliance for an EU/Spain business. No placeholder text is safe to ship publicly.

---

### 1b. Stripe production keys (if using Stripe as payment vendor)

Default vendor per code is **Mollie** (ADR 019). If owner selects Stripe instead (`PAYMENT_VENDOR=stripe`), all items in this block are required.

- [ ] Create Stripe account at https://stripe.com
- [ ] Verify business identity (Es Currals SL or registered entity) and add bank account for payouts
- [ ] Create Product "Adopt-a-Paca Monthly" → Recurring Price €75/month → copy Price ID
- [ ] Create Product "Adopt-a-Paca Yearly" → One-time Price €900 → copy Price ID
- [ ] Enable Customer Portal: Stripe Dashboard → Settings → Billing Portal → enable Subscription cancel, payment method update, plan change
- [ ] Register webhook endpoint: Dashboard → Developers → Webhooks → Add endpoint → `https://alpacasibiza.com/api/stripe-webhook` → select `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.deleted`
- [ ] Decide on Stripe Tax (EU VAT): Dashboard → Tax → enable if you want automatic VAT calculation. Without it, prices shown are VAT-inclusive and no line-item breakdown is shown.

**Vercel env vars required (set in Project → Settings → Environment Variables):**
```
PAYMENT_VENDOR=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...         # from Stripe Dashboard → Webhooks → your endpoint
STRIPE_ADOPT_PRICE_ID_MONTHLY=price_... # the monthly Price ID you created above
STRIPE_ADOPT_PRICE_ID_YEARLY=price_...  # the yearly Price ID
```

**Verify:** Click Adopt CTA → should redirect to Stripe Checkout (not mailto:).

---

### 1c. Mollie production keys (if using Mollie as payment vendor — recommended)

Mollie SEPA Direct Debit costs €0.25/charge vs Stripe's ~€1.75 at €75/month. At 50 donors that is ~€900/year saved, plus lower involuntary churn (IBAN mandates don't expire like cards).

- [ ] Create Mollie account at https://www.mollie.com (Spain or NL company both supported)
- [ ] Complete KYC (typically 1-2 business days)
- [ ] Dashboard → Payment methods → enable: SEPA Direct Debit, Cards, iDEAL (Dutch), Bancontact (Belgian)
- [ ] Dashboard → Developers → API keys → copy live key (`live_xxx`)
- [ ] Generate webhook secret locally: `openssl rand -hex 32` (64-char hex string)
- [ ] `pnpm add @mollie/api-client` on first deploy (SDK is dynamically imported; build works without it)

**Vercel env vars:**
```
PAYMENT_VENDOR=mollie
MOLLIE_API_KEY=live_xxx
MOLLIE_WEBHOOK_SECRET=<the 64-char hex>
```

**No webhook URL registration in Mollie dashboard needed** — the code passes the webhook URL inline per-payment.

**Verify:** Adopt CTA → Mollie hosted checkout. In test mode: `MOLLIE_API_KEY=test_xxx`, complete test SEPA mandate, confirm subscription creates in Mollie dashboard.

---

### 1d. Owner contact email (CONTACT_EMAIL)

This single env var controls where the following go:
- Contact form submissions
- Commission inquiries
- Owner adoption notifications (new donor signed up)
- Dunning escalation alerts (donor payment failing)
- Weekly MRR digest
- GDPR deletion request emails

```
CONTACT_EMAIL=you@alpacasibiza.com
```

---

### 1e. Tier 1 secrets — must be set before any production deploy

The code has fail-CLOSED guards: if any of these are missing, the feature returns 503 or rejects login. There are no insecure defaults.

```
RESEND_API_KEY=re_...           # Resend dashboard → API Keys
NEXTAUTH_SECRET=<32+ random>    # generate: openssl rand -base64 32
ADMIN_USERNAME=<not "admin">    # admin dashboard login
ADMIN_PASSWORD=<16+ chars>      # admin dashboard password
NEXTAUTH_URL=https://alpacasibiza.com
FAREHARBOR_WEBHOOK_SECRET=<random>   # generate: openssl rand -hex 32
CRON_SECRET=<random>                 # generate: openssl rand -hex 32
```

**Verify:** Visit `/admin/env-check` after deploy (requires admin login). Shows SET/UNSET per tier with masked previews and generates a ready-to-paste template for unset vars.

---

### 1f. Resend sender domain authentication

Every donor email sends from `noreply@alpacasibiza.com`. Without DNS authentication, Gmail and Outlook will spam-folder adoption welcome emails — donors think payment failed.

- [ ] Resend dashboard → Domains → Add Domain → `alpacasibiza.com`
- [ ] Resend provides 3 DNS records (SPF, DKIM, DMARC) — paste each into your domain registrar (Namecheap, GoDaddy, Cloudflare DNS, etc.)
- [ ] Resend dashboard → Domains → alpacasibiza.com → wait for all 3 checks to turn green (usually 5-30 minutes)

**Verify:** `dig TXT alpacasibiza.com` returns `v=spf1 include:_spf.resend.com ~all`. Resend dashboard shows all 3 green.

---

### 1g. Resend bounce + complaint webhook

Prevents sender-reputation damage. Without this, a typo'd email address gets retried on every webhook delivery.

- [ ] Resend dashboard → Webhooks → Add Endpoint → `https://alpacasibiza.com/api/resend-webhook`
- [ ] Select events: `email.bounced` AND `email.complained` only
- [ ] Copy the signing secret (starts `whsec_`) and set in Vercel env: `RESEND_WEBHOOK_SECRET=whsec_...`

**Verify:** Resend dashboard → Send test event → confirm route returns 200.

---

## 2. DEGRADED — site launches; these features are dark until set

### 2a. FareHarbor item IDs (per-tour Book buttons)

Without these, every "Book Now" button falls back to the main FareHarbor calendar (fail-open — not inert). Set them to send each button to the specific tour.

- [ ] Log into FareHarbor admin → Items → click each item → copy the numeric ID from the URL (`/items/<ID>/`)

**Vercel env vars to set:**
```
FAREHARBOR_ITEM_TOUR_MEET_HERD=<numeric>
FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP=<numeric>
FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE=<numeric>
FAREHARBOR_ITEM_TOUR_PHOTO_SESSION=<numeric>
FAREHARBOR_ITEM_YOGA=<numeric>              # if yoga sessions are on FareHarbor
FAREHARBOR_ITEM_GIFT_CARD=<numeric>         # FareHarbor → Build → Gift Cards
FAREHARBOR_ITEM_WEDDINGS=<numeric>
FAREHARBOR_ITEM_PHOTOSHOOTS=<numeric>
FAREHARBOR_ITEM_ROMANTIC_SUNSET=<numeric>
FAREHARBOR_ITEM_FAMILY_FARM_DAYS=<numeric>
FAREHARBOR_ITEM_BUSINESS_INCENTIVES=<numeric>
FAREHARBOR_ITEM_WOVEN=<numeric>
FAREHARBOR_ITEM_ALCACA=<numeric>
FAREHARBOR_ITEM_COMMISSION=<numeric>
```

### 2b. FareHarbor API access (live "spots left" widget + owner digest real data)

- [ ] Email `support@fareharbor.com`: "Please grant External API access for alpacasibiza. We need app key and user key."
- [ ] Once received, set in Vercel env:
  ```
  FAREHARBOR_APP_KEY=<from FareHarbor support>
  FAREHARBOR_USER_KEY=<from FareHarbor support>
  ```
- [ ] Ask FareHarbor support to configure webhook POST events:
  - `booking.created` → `POST https://alpacasibiza.com/api/reminder` (sends 48h-before reminder email)
  - `availability.completed` → `POST https://alpacasibiza.com/api/review-request` (sends post-tour review request)
  - Include header `x-webhook-secret: <FAREHARBOR_WEBHOOK_SECRET>` (the random string you generated in 1e)

### 2c. Cloudflare Turnstile (bot protection on contact, newsletter, commission forms)

Without this, forms work but are unprotected. Takes 5 minutes.

- [ ] https://dash.cloudflare.com → Turnstile → Add site → choose "Managed" widget
- [ ] Set domain to `alpacasibiza.com`
- [ ] Copy Site Key (public) and Secret Key (private)

**Vercel env vars:**
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
TURNSTILE_SECRET_KEY=<secret key>
```

### 2d. Google Places integration (live star rating on tours page)

The `GoogleReviewsBadge` component is wired but renders null until configured.

- [ ] https://console.cloud.google.com → APIs & Services → Enable "Places API (New)"
- [ ] Credentials → Create API key → restrict to `alpacasibiza.com`
- [ ] https://developers.google.com/maps/documentation/places/web-service/place-id → search "Alpacas Ibiza" → copy Place ID

**Vercel env vars:**
```
GOOGLE_PLACES_API_KEY=<key>
GOOGLE_PLACES_PLACE_ID=<place_id>
```

### 2e. Admin analytics dashboard (GA4 in-site view)

Two options — pick one:

**Option A (recommended — 3 minutes):** Invite the owner to GA4 directly.
- analytics.google.com → Admin → Account Access Management → Add user → owner's Google email, role: Viewer

**Option B (in-site branded dashboard):** Requires service account setup:
- Cloud Console → Create service account with Viewer on the GA4 property
- Generate JSON key → extract `client_email` and `private_key`

**Vercel env vars for Option B:**
```
GA4_PROPERTY_ID=<property id from GA4 Admin>
GA4_CLIENT_EMAIL=<service account email>
GA4_PRIVATE_KEY=<private key (paste exactly including \n)>
```

### 2f. Owner escalation alerting (dunning failures)

When a donor's payment fails twice or more, the code escalates. Without at least one channel set, escalations are silently discarded.

**Vercel env vars (set at least one):**
```
OWNER_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...    # Slack → Apps → Incoming Webhooks
OWNER_TELEGRAM_BOT_TOKEN=<token>                                # optional: Telegram Bot API
OWNER_TELEGRAM_CHAT_ID=<chat_id>                                # optional: pair with above
OWNER_GENERIC_WEBHOOK_URL=https://...                           # optional: any POST webhook
```

### 2g. Cron dead-man's switch (Healthchecks.io)

Three Vercel Cron jobs run weekly/quarterly. If Vercel stops firing them silently, nothing alerts. Healthchecks.io free tier (20 checks) is sufficient.

- [ ] Sign up at https://healthchecks.io
- [ ] Create 3 checks:
  - "owner-mrr-digest" — cron `0 6 * * 1`, grace 1h
  - "owner-digest" — cron `0 9 * * 1`, grace 1h
  - "adopt-quarterly-update" — cron `0 9 1 1,4,7,10 *`, grace 24h

**Vercel env vars:**
```
HEARTBEAT_OWNER_MRR_DIGEST_URL=https://hc-ping.com/<uuid>
HEARTBEAT_OWNER_DIGEST_URL=https://hc-ping.com/<uuid>
HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL=https://hc-ping.com/<uuid>
```

### 2h. Adopt discount codes (weaving + farm shop)

The welcome email to new adopters promises discount codes. Until set, the email shows "codes arriving within 48h" placeholder text.

- [ ] Create a 10% discount code in your weaving shop or booking system → set `ADOPT_DISCOUNT_CODE_WEAVING_10=<code>`
- [ ] Create a 15% discount code in the farm shop → set `ADOPT_DISCOUNT_CODE_FARMSHOP_15=<code>`

### 2i. Optional newsletter infrastructure (SendGrid list management)

Resend handles transactional email. SendGrid is optional for marketing list management.

```
SENDGRID_API_KEY=<key>
SENDGRID_FROM_EMAIL=info@alpacasibiza.com
SENDGRID_LIST_ID=<contact list id>
```

### 2j. Campaign banner (time-limited adopt push)

Renders a prominent impact-multiplier banner on the Adopt page. Auto-expires when end date passes. Completely optional; site is fine without it.

```
ADOPT_CAMPAIGN_HEADLINE=<short headline e.g. "Double your impact this June">
ADOPT_CAMPAIGN_SUBLINE=<optional subline copy>
ADOPT_CAMPAIGN_END_DATE=2026-06-30   # ISO date — banner hides automatically after this
```

### 2k. Vercel deployment and domain

- [ ] Create Vercel account at https://vercel.com and connect it to the GitHub repository
- [ ] Paste all env vars from sections 1 and 2 into Vercel → Project → Settings → Environment Variables (Production scope)
- [ ] Add custom domain `alpacasibiza.com` in Vercel → Project → Settings → Domains
- [ ] Update DNS at your domain registrar: add the A and CNAME records Vercel provides
- [ ] Verify `alpacasibiza.com` resolves to the Vercel deployment

### 2l. Uptime monitoring

The `/healthz` endpoint is built and returns 503 when Tier 1 env is missing. No external monitor is pinging it yet.

- [ ] https://uptimerobot.com (free tier, 50 monitors, 5-min interval)
- [ ] Add monitor for `https://alpacasibiza.com/healthz`
- [ ] Set alert contact to `CONTACT_EMAIL` + optional Telegram/Slack

---

## 3. POLISH — optional, improves but not required

### 3a. Adopt renewal reminder FareHarbor discount codes

The renewal reminder email (sent 7 days before annual renewal) can include a discount code.

```
FAREHARBOR_DISCOUNT_CODE_RETURN10=RETURN10   # optional FareHarbor code for returning guests
```

### 3b. Google Maps embed (Directions section)

The map on the About/Contact page falls back to OpenStreetMap if this is unset. OSM requires no credentials and always renders.

```
GOOGLE_MAPS_EMBED_API_KEY=<key>   # optional: upgrades map to styled Google embed
```

### 3c. Newsletter token signing key rotation

The newsletter HMAC confirmation tokens fall back to `NEXTAUTH_SECRET` if this is unset (safe — Tier 1 key is always available). Set it only if you want to rotate newsletter tokens independently of the admin session secret.

```
NEWSLETTER_SIGNING_KEY=<random 32+ chars>
```

### 3d. Stripe price overrides for staging

Only for test/staging environments — do not set in production. Overrides the hardcoded €75/€900 defaults.

```
ADOPT_PRICE_MONTHLY_EUR=75    # only for staging; prod uses lib/config.ts constants
ADOPT_PRICE_YEARLY_EUR=900
```

---

## 4. Content the owner provides

### 4a. Photos (drop into `public/images/`)

All images are wired with fail-quiet fallbacks. Nothing breaks without them — placeholders or gradients show. Real photos lift conversion significantly.

| Slot | Path | Notes |
|---|---|---|
| Home hero | `public/images/heroes/farm.webp` | 1920×1080 min |
| Yoga hero | `public/images/heroes/yoga.webp` | |
| Workshop hero | `public/images/heroes/workshop.webp` | |
| Weddings hero | `public/images/heroes/weddings.webp` | |
| Per-alpaca portraits | `public/images/alpacas/<slug>.webp` | 14 alpacas — see `lib/data/alpacas.ts` for slugs |
| Gallery photos | `public/images/gallery/*.webp` | Any count — add entries to `lib/data/media.ts` with `status: 'live'` |
| Press logos | `public/images/press/<outlet>.svg` | 6 outlets seeded in `lib/data/press.ts`; component renders null until at least 1 logo exists |
| OG default image | `public/images/og-default.webp` | 1200×630 — auto-generated OG route already exists, this is optional override |

**RESOLVED:** OG images no longer require a custom asset per page — the `/og` route auto-generates them from page metadata. This was an open item in the old OWNER_INPUT_NEEDED.md.

### 4b. Per-alpaca data (`lib/tenants/alpacasibiza-content.ts`)

14 alpacas are seeded with placeholder bios. For each alpaca, supply:

- `bio`: 2-3 paragraphs
- `personality`: one of: `calm / playful / bold / shy / sociable / independent` (matches filter chips on `/alpacas`)
- `colorDescriptor`: e.g. `white / grey / brown / mixed`
- `breed`: `huacaya` or `suri`
- `funFact`: one sentence — powers the homepage carousel

### 4c. Tour prices and cancellation policy

Anchor prices on tour cards (e.g. "from €35/person") lift conversion 10-15%. For each of the 4 tours:

- [ ] **Meet the Herd**: starting price per adult? Per child?
- [ ] **Weaving Workshop**: price?
- [ ] **Farm Experience**: price?
- [ ] **Photo Session**: price?
- [ ] Are prices different in peak vs off-season?
- [ ] Confirm cancellation window: currently showing **"Free cancellation up to 24h"** — confirm this matches FareHarbor backend setting exactly.

### 4d. Phone number

Currently the footer uses **+32 475 58 65 44** (Belgian mobile). Confirm:

- [ ] Is this the correct number to display for Ibiza operations?
- [ ] Or should a Spanish +34 number be used instead? If yes, provide it.

### 4e. Team bios

The About page has placeholders for team members. Provide for each person:
- Full name
- Role
- 2-3 sentence bio
- Portrait photo (drop at `public/images/team/<name>.webp`)

### 4f. Yoga schedule and instructor

The `/yoga` page shows Wed/Sat as a placeholder schedule. Confirm:

- [ ] Schedule days and start time
- [ ] Instructor name (for translations `yoga.instructor`)
- [ ] `FAREHARBOR_ITEM_YOGA=<id>` to activate direct booking button

### 4g. Journal / blog posts (`lib/data/journal.ts`)

The journal page renders an empty state until posts are added. To publish a post:
- Add entry to `lib/data/journal.ts` with `status: 'live'`
- Drop hero image at `public/images/journal/<slug>.webp`
- Body uses double newline for paragraphs (no MDX required)

### 4h. Events / What's On (`lib/data/events.ts`)

The `EventsCalendar` component renders null until events are live. Add entries with `status: 'live'`. Recurrence format: `'weekly:wed,sat'` or `'monthly:1st-sat'`.

### 4i. Awards and certifications (`lib/data/awards.ts`)

The `AwardsBadges` component renders null until entries are live. Categories: `tourism / sustainability / animal-welfare / travel-award`. Drop logos at `public/images/awards/<id>.svg`.

### 4j. Testimonials verification (`lib/data/testimonials.ts`)

6 testimonials are seeded from the tours page. Verify the German names were not mangled (Verena's umlauts may have been ASCII'd to `ue`/`ae` during migration — restore if needed by editing the file directly).

---

## 5. Stripe Dashboard setup (web UI, not env)

Step-by-step clickpath if using Stripe as payment vendor:

1. https://stripe.com → Create account → Verify business (Es Currals SL or registered entity)
2. Dashboard → Bank accounts → Add bank account for payouts
3. Dashboard → Products → Add product → "Adopt-a-Paca Monthly" → Recurring price → €75 / month → Save → copy **Price ID**
4. Dashboard → Products → Add product → "Adopt-a-Paca Yearly" → One-time price → €900 → Save → copy **Price ID**
5. Dashboard → Settings → Billing Portal → Enable → check: Cancel subscriptions, Update payment method, Change plan
6. Dashboard → Developers → Webhooks → Add endpoint → URL: `https://alpacasibiza.com/api/stripe-webhook` → Events: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.deleted`
7. Copy **Signing secret** (`whsec_...`) from the webhook endpoint detail page → set as `STRIPE_WEBHOOK_SECRET`
8. Optional: Dashboard → Tax → Enable Stripe Tax for automatic EU VAT on each charge

---

## 6. Mollie Dashboard setup (web UI, not env)

Step-by-step clickpath if using Mollie (recommended):

1. https://www.mollie.com → Create account → Submit KYC (1-2 business days)
2. Dashboard → Payment methods → Enable SEPA Direct Debit, Visa/Mastercard, iDEAL, Bancontact
3. Dashboard → Developers → API keys → Copy live key (`live_xxx`) → set as `MOLLIE_API_KEY`
4. Run `openssl rand -hex 32` locally → set as `MOLLIE_WEBHOOK_SECRET`
5. Dashboard → Developers → Test mode → Use `test_xxx` key to run a complete SEPA subscription test before going live
6. Dashboard → Payments → expand the test payment → "Webhook deliveries" tab → confirm 200 OK

**No webhook URL registration required in Mollie dashboard** — the code passes the webhook URL inline per-payment.

---

## 7. Gift adoption — owner decisions needed before wiring

The `AdoptGiftAdoption` flow captures recipient name, email, and delivery date and passes them into Stripe/Mollie metadata. The scheduling infrastructure is built. Three product decisions are outstanding before the welcome email can be wired:

- [ ] **Which name appears on the certificate?** Donor's name ("From: Rafael") or recipient's name ("This adoption belongs to: Maria")?
- [ ] **When does the welcome email go?** To the recipient on the delivery date, or to the donor immediately on purchase?
- [ ] **Does cancellation cascade?** If a donor cancels before the delivery date, does the recipient gift cancel too, or does it convert to a one-off?

Once decided, the developer wires `handleStripeCheckoutCompleted` / `handleMolliePaymentPaid` to call `decideGiftSchedule(metadata)` and build the `buildGiftWelcomeEmail` branch in `lib/email-templates.ts`. All scaffolding exists — these are the only owner decisions blocking it.

---

## 8. Per-cycle release notes

Brief summary of what shipped across the 9 cycles of work:

| Cycle | Date | What shipped |
|---|---|---|
| 1 | 2026-05-26 | Crystal-ball audit (71/100), exploding-pen gap scan, 8 ADRs, 8 specs, SIPOC booking flow, performance audit, a11y foundation, site-assets competitive analysis. Established Wave structure. |
| 2 | 2026-05-27 | Layout primitives (`PageSection`, `SectionHeading`, `GradientPageHero`), route infra (loading/error segments), 7 a11y fixes (lang, zoom, aria-current, contrast), mobile responsive fixes, PressLogos wired, SEO metadata on 6 dark routes, `romantic-sunset` rebuilt from broken state. CTA accent color WCAG fix (`#DD7F3C` → `#AD561A`). |
| 3 | 2026-05-27 | Completion wave: 23 task-radar items resolved. `corporate-team-building` token-swapped (42 raw hex → 0). Layout primitive migration across 17 routes. 5 helper components placed. Foreground contrast WCAG fix. Adopt `<main>` nesting fixed. Reduced-motion media query added. |
| 4 | 2026-05-27 | Mollie SEPA Direct Debit wired as payment vendor alongside Stripe. `payment-vendor.ts` strategy pattern. `mollie-checkout` + `mollie-webhook` routes (NEW). Adopt price constants single-sourced (€75/€900). Adopt benefit copy live (7 confirmed benefits). Welcome email on first adoption (Stripe + Mollie both). |
| 5 | 2026-05-27 | Security sweep: open-redirect via Origin header fixed on all 3 checkout routes. Stripe Connect guard adapter (no silent fallthrough). Stripe handler extracted to pure function (`handleStripeCheckoutCompleted`) + 14 unit tests. 345 tests passing. CLAUDE.md failsafe map corrected and expanded. |
| 6 | 2026-05-28 | Wave-4 launch-readiness audit: a11y, SEO, performance, i18n, error handling gaps surfaced and fixed. Wave-5 architecture shifts: payment handler extraction parity (Mollie). Billing-portal email-oracle (prevents customer enumeration). `SITE_BASE_URL` sweep across 13 files. Stripe + Mollie webhook idempotency. Rate limits on checkout routes. |
| 7 | 2026-05-29 | 8-agent security + fix batch: P0 fail-quiet/fail-CLOSED gaps closed (webhooks, billing portal, gift flow). 45 regression tests. VAT tracker (`lib/vat-tracker.ts`). Dunning escalation system (`lib/payment-failure-tracker.ts`). Owner notify fan-out (`lib/owner-notify.ts`). Suppression list (bounce + complaint). MRR digest cron. Admin subscriptions page. |
| 8 | 2026-05-29 | Quarterly adopter update cron + admin compose UI. GA4 funnel events through adopt flow. Donor self-service portal (`/my-adoption`). Resend bounce + complaint webhook. Admin suppression-list view + manual unsuppress. Quarterly farm-news composition (admin compose + preview). |
| 9 | 2026-05-29 | LTV loop: renewal reminder cron (`/api/adopt-renewal-reminders`), referral coupon system (`lib/payment-handlers-referral.ts`), referral landing UI, campaign banner component. Abandoned-cart recovery (`checkout.session.expired`). Mollie manage routes (`cancel`, `update-payment`, `status`). Peer-review batch: CSRF Origin-null fixed, dead refund ternary fixed, `resetFailures` product-scoped, 648 total tests. |

---

## 9. What was DEPRECATED or RESOLVED since original OWNER_INPUT_NEEDED.md

These items appeared in `OWNER_INPUT_NEEDED.md` but have been resolved in code. No owner action needed.

| Original item | Status | How resolved |
|---|---|---|
| OG image `/public/images/og-default.webp` required per page | RESOLVED — auto-generated | `/og` route generates OG images from page metadata. Custom asset is optional override only. |
| "GTM-NJRGZPGS" primary GTM container open question | RESOLVED — was never in codebase | Verified via VERIFICATION_RESULTS search. Only `GTM-KR3CGLS6` is wired. The "primary GTM" question is moot unless owner supplies a separate container ID. |
| Adopt-a-Paca price €15/month | RESOLVED — corrected to €75/month | Live-verified. Single source of truth in `lib/config.ts` `ADOPT_PRICE_MONTHLY_EUR`. |
| Adopt payment vendor decision pending | RESOLVED — code supports both | `PAYMENT_VENDOR=mollie` or `PAYMENT_VENDOR=stripe`. Default is Mollie (ADR 019). Owner sets the env var; no code change needed. |
| Welcome email template needed | RESOLVED — shipped | `buildWelcomeAdoptionEmail` in `lib/email-templates.ts`. Fires on `checkout.session.completed` (Stripe) and `first.paid` (Mollie). |
| Discount-codes email "send codes manually" | RESOLVED — automated | Discount-codes email auto-sends +5 min after welcome. Still needs `ADOPT_DISCOUNT_CODE_WEAVING_10` and `ADOPT_DISCOUNT_CODE_FARMSHOP_15` env vars set (see section 2h). |
| FareHarbor reminder email webhook | RESOLVED — built | `/api/reminder` route receives `booking.created` webhook. Owner still needs to ask FareHarbor support to configure the webhook URL (section 2b). |
| FareHarbor review-request email webhook | RESOLVED — built | `/api/review-request` route receives `availability.completed` webhook. Same — FareHarbor support must configure it. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` default `admin`/`password` warning | RESOLVED — fail-CLOSED | Login returns null (no access) if either env var is unset. There is no default credential. |
| Cron service for weekly digest | RESOLVED — wired in vercel.json | Vercel Cron configured. MRR digest Mondays 06:00 UTC, owner digest Mondays 09:00 UTC. Owner still needs to set `CRON_SECRET` (section 1e). |
| Booking idempotency (duplicate reminder on webhook retry) | RESOLVED — in-memory guard | `lib/webhook-idempotency.ts` prevents duplicate processing. |
| CSP headers | RESOLVED — Report-Only mode | Security headers including CSP Report-Only on all routes via `next.config.mjs`. ADR 010. |
| Rate limiting on forms | RESOLVED — in-memory | Sliding window 5 req/5 min per IP on contact, newsletter, commission. ADR 011. |
| `replyTo` header injection risk | RESOLVED | Email regex guard in contact and commission routes. |
| Honeypot bot protection | RESOLVED | Off-screen honeypot field on all 3 forms (`company_url`, `phone_extension`, `business_name`). |
| Newsletter double opt-in | RESOLVED | HMAC-signed stateless token; subscribe only on /confirm. GDPR + PECR compliant. |
| Right to erasure (GDPR Art. 17) | PARTIALLY RESOLVED | `/api/gdpr-request` now auto-discovers Mollie customer IDs. Stripe + Resend + FareHarbor still require manual lookup. See `docs/LAUNCH_BLOCKERS.md` section 7 for owner runbook. |

---

## Quick-reference: all env vars by tier

### Tier 1 — site breaks or is unsafe without these
```
RESEND_API_KEY
CONTACT_EMAIL
NEXTAUTH_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
NEXTAUTH_URL
FAREHARBOR_WEBHOOK_SECRET
CRON_SECRET
```

### Tier 2 — site launches; specific features dark until set
```
# Payment (choose one vendor)
PAYMENT_VENDOR                        # "mollie" or "stripe"
MOLLIE_API_KEY
MOLLIE_WEBHOOK_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_ADOPT_PRICE_ID_MONTHLY
STRIPE_ADOPT_PRICE_ID_YEARLY

# Bot protection
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY

# FareHarbor
FAREHARBOR_APP_KEY
FAREHARBOR_USER_KEY
FAREHARBOR_ITEM_TOUR_MEET_HERD
FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP
FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE
FAREHARBOR_ITEM_TOUR_PHOTO_SESSION
FAREHARBOR_ITEM_YOGA
FAREHARBOR_ITEM_GIFT_CARD
FAREHARBOR_ITEM_WEDDINGS
FAREHARBOR_ITEM_PHOTOSHOOTS
FAREHARBOR_ITEM_ROMANTIC_SUNSET
FAREHARBOR_ITEM_FAMILY_FARM_DAYS
FAREHARBOR_ITEM_BUSINESS_INCENTIVES
FAREHARBOR_ITEM_WOVEN
FAREHARBOR_ITEM_ALCACA
FAREHARBOR_ITEM_COMMISSION

# Google
GOOGLE_PLACES_API_KEY
GOOGLE_PLACES_PLACE_ID

# Analytics (in-site dashboard — Option B only)
GA4_PROPERTY_ID
GA4_CLIENT_EMAIL
GA4_PRIVATE_KEY

# Email deliverability
RESEND_WEBHOOK_SECRET                 # Resend bounce+complaint webhook
SENDGRID_API_KEY                      # optional list management
SENDGRID_FROM_EMAIL
SENDGRID_LIST_ID

# Legal
LEGAL_CONTENT_LIVE                    # set "true" once legal text is live

# Owner alerting
OWNER_SLACK_WEBHOOK_URL
OWNER_TELEGRAM_BOT_TOKEN
OWNER_TELEGRAM_CHAT_ID
OWNER_GENERIC_WEBHOOK_URL

# Cron monitoring
HEARTBEAT_OWNER_MRR_DIGEST_URL
HEARTBEAT_OWNER_DIGEST_URL
HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL

# Adopt features
ADOPT_DISCOUNT_CODE_WEAVING_10
ADOPT_DISCOUNT_CODE_FARMSHOP_15
ADOPT_CAMPAIGN_HEADLINE
ADOPT_CAMPAIGN_SUBLINE
ADOPT_CAMPAIGN_END_DATE
```

### Tier 3 — optional polish
```
NEWSLETTER_SIGNING_KEY                # key rotation independence
GOOGLE_MAPS_EMBED_API_KEY             # upgrades map from OSM to Google
```

---

*Use `/admin/env-check` (requires admin login) to see SET/UNSET status for every key at runtime.*
