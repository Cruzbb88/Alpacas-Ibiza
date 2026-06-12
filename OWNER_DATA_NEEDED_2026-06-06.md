# Owner Data Needed — 2026-06-06

Everything below is blocked on you (the owner). Code is built and waiting; each item states what data is needed, where it goes, and what breaks without it.

---

## Tier 1 — Site won't work in prod without these (8 keys)

| Key | What / Where to get | Why it matters |
|---|---|---|
| `RESEND_API_KEY` | Resend dashboard → API Keys → Create | Contact form / all transactional emails don't send |
| `CONTACT_EMAIL` | Your email address (e.g. `hello@alpacasibiza.com`) | No recipient for form submissions; falls back to hardcoded default |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Auth sessions broken / insecure |
| `NEXTAUTH_URL` | Your production URL: `https://alpacasibiza.com` | Auth redirect callbacks broken in production |
| `ADMIN_USERNAME` | Choose a non-obvious username (not "admin") | Admin login non-functional |
| `ADMIN_PASSWORD` | 16+ chars, random | Admin login non-functional |
| `FAREHARBOR_WEBHOOK_SECRET` | Generate: `openssl rand -hex 32`. Give to FareHarbor support when setting webhooks. | Webhook endpoint returns 503 (fail-closed — blocks booking reminders) |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Cron routes unprotected or blocked — weekly digest, birthday cards, milestones, renewals never fire |

Set all 8 in Vercel dashboard → Settings → Environment Variables before first deploy.

---

## Tier 2 — Feature dark until owner activates

### Payment

| Key | What / Where | Why |
|---|---|---|
| `PAYMENT_VENDOR` | `mollie` (recommended) or `stripe` | Adopt CTAs fall back to mailto without this |
| `MOLLIE_API_KEY` | Mollie dashboard → Developers → API keys (after KYC) | Mollie checkout 503; adopt → mailto |
| `MOLLIE_WEBHOOK_SECRET` | Generate: `openssl rand -hex 32`. Set in Vercel, give Mollie the path `/api/mollie-webhook?secret=<this>` | Mollie webhook fail-closed — no adopt confirmation, no dunning |
| `MOLLIE_PROFILE_ID` | Mollie dashboard → Profile | Advanced Mollie config |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys | Stripe checkout 503 (if Stripe path chosen) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → reveal secret | Stripe webhook fail-closed |
| `STRIPE_ADOPT_PRICE_ID_MONTHLY` | Create €75/month recurring product in Stripe → copy Price ID | Monthly adopt tier 503 |
| `STRIPE_ADOPT_PRICE_ID_YEARLY` | Create €900/year recurring product in Stripe → copy Price ID | Yearly adopt tier 503 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → Publishable key | Stripe.js client-side elements dark |
| `STRIPE_MEMBERSHIP_PRICE_ID` | Create annual pass price in Stripe → copy Price ID | `/membership` checkout 503 |
| `STRIPE_JUNIOR_PRICE_ID` | Create junior tier price in Stripe → copy Price ID | `/api/junior-checkout` 503 |

### FareHarbor

| Key | What / Where | Why |
|---|---|---|
| `FAREHARBOR_APP_KEY` | Email `support@fareharbor.com` requesting External API access | Live "X spots left" widget dark |
| `FAREHARBOR_USER_KEY` | Same as above | Same |
| `FAREHARBOR_ITEM_TOUR_MEET_HERD` | FareHarbor dashboard → Items → copy numeric ID | Meet-the-Herd Book button → main calendar fallback |
| `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP` | Same | Weaving Workshop Book button → fallback |
| `FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE` | Same | Farm Experience Book button → fallback |
| `FAREHARBOR_ITEM_TOUR_PHOTO_SESSION` | Same | Photo Session Book button → fallback |
| `FAREHARBOR_ITEM_YOGA` | Same | Yoga filtered booking → fallback |
| `FAREHARBOR_ITEM_WEDDINGS` | Same | Weddings CTA → fallback |
| `FAREHARBOR_ITEM_BUSINESS_INCENTIVES` | Same | Corporate CTA → fallback |
| `FAREHARBOR_ITEM_ROMANTIC_SUNSET` | Same | Romantic Sunset CTA → fallback |
| `FAREHARBOR_ITEM_FAMILY_FARM_DAYS` | Same | Family Farm Days CTA → fallback |
| `FAREHARBOR_ITEM_GIFT_CARD` | Same | Gifts page CTA → fallback |
| `FAREHARBOR_ITEM_PHOTOSHOOTS` | Same | Photoshoots CTA → fallback |
| `FAREHARBOR_ITEM_ADOPT_MONTHLY` | Same | Adopt monthly FareHarbor item (if PAYMENT_VENDOR=fareharbor) |
| `FAREHARBOR_ITEM_ADOPT_YEARLY` | Same | Adopt yearly FareHarbor item (if PAYMENT_VENDOR=fareharbor) |
| `FAREHARBOR_ITEM_WOVEN` | Same | Woven goods shop CTA → fallback |
| `FAREHARBOR_ITEM_COMMISSION` | Same | Commission shop CTA → fallback |
| `FAREHARBOR_ITEM_ALCACA` | Same | Alcaca goods CTA → fallback |
| `FAREHARBOR_ITEM_ID` | Generic FareHarbor item ID | Availability widget dark |
| `FAREHARBOR_SHORTNAME` | Your FareHarbor shortname (`alpacasibiza` unless changed) | Defaults to `alpacasibiza` — only override if changed |

### Analytics / GA4

| Key | What / Where | Why |
|---|---|---|
| `GA4_PROPERTY_ID` | GCP Console → Analytics → Property ID | In-site analytics dashboard dark |
| `GA4_CLIENT_EMAIL` | GCP Console → IAM → service account email | Same |
| `GA4_PRIVATE_KEY` | GCP Console → Service account → JSON key → `private_key` field | Same |

### Google Places (reviews badge)

| Key | What / Where | Why |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | GCP Console → APIs → Places API (New) → Credentials | Live star-rating badge hidden |
| `GOOGLE_PLACES_PLACE_ID` | developers.google.com/maps/documentation/places → search "Alpacas Ibiza" | Same |
| `GOOGLE_MAPS_EMBED_API_KEY` | GCP Console → Maps Embed API → Credentials | Google map falls back to OpenStreetMap (OSM still works without key) |

### Captcha / bot protection

| Key | What / Where | Why |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | dash.cloudflare.com → Turnstile → create site → Site Key | Forms unprotected |
| `TURNSTILE_SECRET_KEY` | Same → Secret Key | Same |
| `CAPTCHA_PROVIDER` | Set to `turnstile` (default) or `recaptcha` | Selects which adapter; leave unset to use Turnstile |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA console (only if `CAPTCHA_PROVIDER=recaptcha`) | reCAPTCHA widget dark |
| `RECAPTCHA_SECRET_KEY` | Same | reCAPTCHA verification fails |

### Campaign banners (3 slots — home / tours / yoga)

| Key | What / Where | Why |
|---|---|---|
| `CAMPAIGN_HOME_LIVE` | Set `true` to show banner | Banner hidden until this + headline are set |
| `CAMPAIGN_HOME_HEADLINE` | Your headline text (e.g. "Shearing season open!") | Banner headline |
| `CAMPAIGN_HOME_BODY` | Optional body text | Optional |
| `CAMPAIGN_HOME_CTA_HREF` | CTA link URL | Optional |
| `CAMPAIGN_HOME_CTA_LABEL` | CTA button label | Optional |
| `CAMPAIGN_TOURS_LIVE` | `true` to activate tours banner | Same pattern |
| `CAMPAIGN_TOURS_HEADLINE` | Headline | Same |
| `CAMPAIGN_TOURS_BODY` / `_CTA_HREF` / `_CTA_LABEL` | Optional body + CTA | Optional |
| `CAMPAIGN_YOGA_LIVE` | `true` to activate yoga banner | Same pattern |
| `CAMPAIGN_YOGA_HEADLINE` / `_BODY` / `_CTA_HREF` / `_CTA_LABEL` | Headline + optional | Same |
| `ADOPT_CAMPAIGN_HEADLINE` | Adopt-page time-boxed headline | Adopt campaign banner hidden until set |
| `ADOPT_CAMPAIGN_SUBLINE` | Optional subline | Optional |
| `ADOPT_CAMPAIGN_END_DATE` | ISO date e.g. `2026-09-01` | Banner auto-hides after this date |

### Bundle CTAs (tours page)

| Key | What / Where | Why |
|---|---|---|
| `BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR` | EUR discount amount (e.g. `10`) | Bundle CTA hidden until set (0 hides it) |
| `BUNDLE_TOUR_PLUS_YOGA_URL` | FareHarbor bundle URL or tour URL | Same |
| `BUNDLE_ADOPT_PLUS_TOUR_DISCOUNT_EUR` | EUR discount amount | Same |
| `BUNDLE_ADOPT_PLUS_TOUR_URL` | FareHarbor bundle URL | Same |

### Membership / Annual Pass

| Key | What / Where | Why |
|---|---|---|
| `MEMBERSHIP_LIVE` | `true` to publish `/membership` page | Page 404s until set |
| `MEMBERSHIP_PRICE_EUR` | Annual pass price in EUR (e.g. `249`) | Price shows 0 |
| `STRIPE_MEMBERSHIP_PRICE_ID` | Stripe dashboard → create annual pass price | Membership checkout 503 |

### Herd Family / Junior tier

| Key | What / Where | Why |
|---|---|---|
| `HERD_FAMILY_LIVE` | `true` to publish `/herd-family` | Page 404s |
| `JUNIOR_TIER_LIVE` | `true` to show JuniorTierCard on /adopt | Card hidden |
| `JUNIOR_TIER_PRICE_EUR` | Junior tier price in EUR | 0 hides card |
| `STRIPE_JUNIOR_PRICE_ID` | Stripe dashboard → create junior price | Junior checkout 503 |

### Referrer reward

| Key | What / Where | Why |
|---|---|---|
| `REFERRER_REWARD_LIVE` | `true` to activate reward emails | Reward emails suppressed |
| `REFERRER_REWARD_DISCOUNT_CODE` | Stripe coupon or shop code (e.g. `FRIEND10`) | Reward email suppressed if unset |
| `REFERRER_REWARD_DESCRIPTION` | Short description e.g. `"1 month free"` | Reward email suppressed if unset |

### Seasonal pricing

| Key | What / Where | Why |
|---|---|---|
| `TOUR_SEASONAL_WINDOWS` | JSON array of SeasonalPriceWindow — see `lib/config.ts` for shape | Seasonal price ladder dark; single price shown |

### Adopt discount codes

| Key | What / Where | Why |
|---|---|---|
| `ADOPT_DISCOUNT_CODE_WEAVING_10` | Create 10% discount code in your booking/shop system | Welcome email says "codes arriving within 48h" |
| `ADOPT_DISCOUNT_CODE_FARMSHOP_15` | Create 15% discount code in your shop | Same |

### Skein sponsorship (seasonal)

| Key | What / Where | Why |
|---|---|---|
| `SKEIN_CALLOUT_LIVE` | `true` during shearing season | Homepage callout + Skein nav sub-item hidden |
| `SKEIN_PRICE_EUR` | Price override (default €200) | Only needed if changing from €200 |

### Legal

| Key | What / Where | Why |
|---|---|---|
| `LEGAL_CONTENT_LIVE` | `true` once lawyer-approved copy is in translations JSON | Legal pages show "content pending" placeholder |

### Vouchers

| Key | What / Where | Why |
|---|---|---|
| `VALID_VOUCHER_CODES` | Comma-separated list e.g. `WELCOME10,IBIZA25` | All codes invalid if unset |

### Pricing overrides (only if changing from defaults)

| Key | Default | Override |
|---|---|---|
| `YOGA_PRICE_EUR` | 30 | Set only to change without redeploying |
| `ADOPT_PRICE_MONTHLY_EUR` | 75 | Set only for staging tests |
| `ADOPT_PRICE_YEARLY_EUR` | 900 | Set only for staging tests |

### Owner notifications / escalation

| Key | What / Where | Why |
|---|---|---|
| `OWNER_EMAIL` | Your email — falls back to `CONTACT_EMAIL` | Owner notification address |
| `OWNER_SLACK_WEBHOOK_URL` | Slack → Apps → Incoming Webhooks → create | Dunning escalations silently discarded |
| `OWNER_TELEGRAM_BOT_TOKEN` | BotFather on Telegram → create bot | Same |
| `OWNER_TELEGRAM_CHAT_ID` | Pair with bot token | Same |
| `OWNER_NOTIFY_DISCORD_URL` | Discord → Server Settings → Integrations → Webhooks | Same |
| `OWNER_GENERIC_WEBHOOK_URL` | Zapier/n8n/Make webhook URL | Same |

### Cron heartbeats (dead-man switches)

| Key | What / Where | Why |
|---|---|---|
| `HEARTBEAT_OWNER_MRR_DIGEST_URL` | healthchecks.io → create check → copy ping URL | Cron runs but monitor won't alert on silence |
| `HEARTBEAT_OWNER_DIGEST_URL` | Same | Same |
| `HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL` | Same | Same |
| `HEARTBEAT_ADOPT_MILESTONE_EMAILS_URL` | Same | Same |

### Resend / email

| Key | What / Where | Why |
|---|---|---|
| `NEWSLETTER_SIGNING_KEY` | `openssl rand -hex 32` | Falls back to NEXTAUTH_SECRET if unset; set for independent rotation |
| `SENDGRID_API_KEY` | SendGrid dashboard → API Keys | Newsletter subscriber list sync dark |
| `SENDGRID_FROM_EMAIL` | Your sender address | Same |
| `SENDGRID_LIST_ID` | SendGrid → Contacts → Lists → copy ID | Same |
| `RESEND_WEBHOOK_SECRET` | Resend dashboard → Webhooks → configure → copy signing secret | Resend bounce/complaint webhook 503 (fail-closed) |
| `REMINDER_WEBHOOK_SECRET` | Generate: `openssl rand -hex 32`. Give to FareHarbor when setting up reminder webhook. | Fail-open without (any POST accepted) |
| `REVIEW_REQUEST_WEBHOOK_SECRET` | Same | Same |

### Live cam

| Key | What / Where | Why |
|---|---|---|
| `ALPACA_CAM_EMBED_URL` | YouTube/Twitch/Vimeo embed URL for the live farm cam | Cam section hidden on homepage |

### Vercel / infrastructure

| Key | What / Where | Why |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Auto-provided when Vercel Blob store attached | Only needed for self-hosted blob storage |
| `NEXT_PUBLIC_SITE_URL` | Leave blank on prod; set for preview deploys (e.g. `https://staging-xxx.vercel.app`) | Defaults to `https://alpacasibiza.com` |
| `CHECKOUT_MODE` | Leave unset; override only to change checkout flow | Controls checkout routing |

---

## Content needed from owner

### Photography (must replace placeholders)

| Item | Where it goes | Why |
|---|---|---|
| Hero image for homepage | `public/images/heroes/home.webp` (or pass URL to hero component) | Gradient placeholder shows now |
| Hero images for 20+ pages | `public/images/heroes/<page>.webp` per page | Same |
| 4 tour-specific photos | Tour cards on /tours and ExperienceCards | Placeholder blocks |
| 6 shop product photos (woven goods) | `public/images/shop/woven-<n>.webp` | Shop cards show farm photos as stand-ins |
| Team photos (San + Bart) | `lib/tenants/alpacasibiza-content.ts` founders array | About page shows no team portrait |
| Open Graph default image | `public/images/og-default.webp` (1200×630) | Social sharing uses code-generated placeholder |
| Gallery photos (all categories) | `public/images/gallery/` — currently empty `.gitkeep` | Gallery page empty |
| Press outlet logos (SVG) | `public/images/press/<outlet-slug>.svg` | Press section renders null |

### Alpaca data (14 alpacas)

| Item | Where it goes | Why |
|---|---|---|
| Birth dates (YYYY-MM-DD) for all 14 | `lib/data/alpacas.ts` — `birthDate` field per alpaca | Birthday card cron sends no emails; admin birthday-test page shows "0 birthdays" |
| Short bios (1–3 sentences each) | `lib/tenants/alpacasibiza-content.ts` — `localizedBio.en` per alpaca | Alpaca cards show no bio |
| Bio translations (NL at minimum) | Same file, `localizedBio.nl` | Dutch alpaca pages empty |
| Alpaca portraits already wired via CDN — confirm URLs still live | `lib/tenants/alpacasibiza-content.ts` — `image` field | Picker shows emoji for 12/14 if CDN returns 404 |

### Herd Diary

| Item | Where it goes | Why |
|---|---|---|
| Diary entries (any events) | `lib/data/herd-events.ts` — add objects with `status: 'live'` | Herd diary page shows empty state |

### Journal / blog

| Item | Where it goes | Why |
|---|---|---|
| Real posts | `lib/data/journal.ts` — change `status` from `'draft'` to `'live'` | Journal page shows "Stories coming soon" |

### Newsletter archive

| Item | Where it goes | Why |
|---|---|---|
| Past issue summaries | `lib/data/newsletter-issues.ts` — add entries | Archive page shows "First issue coming soon" |

### Greeting cards

| Item | Where it goes | Why |
|---|---|---|
| Card designs (at least 1) | `lib/data/greeting-cards.ts` — add entries with `status: 'live'` | GreetingCardPicker renders null in adopt gift flow |

### Virtual farm tour

| Item | Where it goes | Why |
|---|---|---|
| Photos for 5 tour stops + `status: 'live'` | `lib/data/media.ts` — virtualTour stops | VirtualFarmTour renders null |

### Press

| Item | Where it goes | Why |
|---|---|---|
| Press mention entries with `logoUrl` set | `lib/data/press.ts` — set `status: 'live'` + `logoUrl` | PressLogos renders null |

### Events calendar

| Item | Where it goes | Why |
|---|---|---|
| Upcoming events | `lib/data/events.ts` — add entries with `status: 'live'` | EventsCalendar renders null |

---

## Legal content (counsel-reviewed)

| Item | Where it goes | Why |
|---|---|---|
| Privacy Policy body | `translations/en.json` → `legal.privacy.body` | GDPR risk — placeholder draft shows |
| Terms of Service body | `translations/en.json` → `legal.terms.body` | Same |
| Cookie Policy body | `translations/en.json` → `legal.cookies.body` | Same |
| Impressum body | `translations/en.json` → `legal.impressum.body` | Same |
| EU Art 16(m) withdrawal waiver copy | `translations/en.json` → `adopt.legal.withdrawalWaiver` + `adopt.legal.waiverRequired` | Pre-ticked/wrong wording invalidates waiver under EU Directive 2011/83 |
| Dutch translations of all legal copy | `translations/nl.json` same keys | Dutch visitors see EN legal text |
| Final flip to activate | Set `LEGAL_CONTENT_LIVE=true` in Vercel | Legal pages stay "pending" until this flag is set |

---

## Pricing decisions

| Decision | Where to apply | Current state |
|---|---|---|
| Confirm tour price €21.19 is correct (not €30) | Already set in `lib/config.ts` `TOUR_BASE_PRICE_EUR` — verify | Code uses €21.19 per FareHarbor; old config comment said €30 |
| Workshop prices (weaving, corporate, romantic, family) | `lib/data/experiences.ts` or `lib/config.ts` per type | All show "Contact for details" |
| Wedding price / pricing model | `app/[locale]/weddings/page.tsx` UNMAPPED block | 7 unmapped fields |
| Photoshoot price + inclusions | Weddings/experiences data | UNMAPPED |
| Cancellation policy duration (24h / 48h / non-refundable) | `translations/en.json` → cancellation copy + Terms | Hardcoded "24h" — must match FareHarbor setting |
| Annual Pass price | `MEMBERSHIP_PRICE_EUR` env var | No default — page hidden |
| Junior tier price | `JUNIOR_TIER_PRICE_EUR` env var | No default — card hidden |
| Seasonal pricing windows | `TOUR_SEASONAL_WINDOWS` JSON | Seasonal ladder hidden |
| Bundle discounts (EUR amounts + URLs for 2 combos) | `BUNDLE_*` env vars | Both CTAs hidden |

---

## Approval / activation flags (flip `true` to publish)

| Flag | What activates | Set when |
|---|---|---|
| `SKEIN_CALLOUT_LIVE` | Homepage skein callout + Skein nav sub-item | Shearing season |
| `MEMBERSHIP_LIVE` | `/membership` page + homepage callout | Membership price + Stripe ID both set |
| `HERD_FAMILY_LIVE` | `/herd-family` landing page | Ready to take inquiries |
| `JUNIOR_TIER_LIVE` | JuniorTierCard on /adopt + checkout route | Price + Stripe ID both set |
| `REFERRER_REWARD_LIVE` | Referrer reward emails on new conversions | Discount code + description both set |
| `CAMPAIGN_HOME_LIVE` | Homepage campaign banner | Headline set |
| `CAMPAIGN_TOURS_LIVE` | Tours page campaign banner | Headline set |
| `CAMPAIGN_YOGA_LIVE` | Yoga page campaign banner | Headline set |
| `LEGAL_CONTENT_LIVE` | Legal page body copy goes live | Lawyer-approved copy in translations JSON |

---

## Vendor accounts to open (must be done by owner)

| Vendor | Action | Keys produced |
|---|---|---|
| **Mollie** | mollie.com → sign up → complete KYC | `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_SECRET` |
| **Stripe** (if Stripe path chosen) | dashboard.stripe.com → create account | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, price IDs |
| **Resend** | resend.com → create account + verify `alpacasibiza.com` domain | `RESEND_API_KEY`; also add DKIM/SPF/DMARC DNS records |
| **Cloudflare Turnstile** | dash.cloudflare.com → Turnstile → register site | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| **FareHarbor** | Email `support@fareharbor.com` requesting External API access | `FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY`; also configure webhooks for reminder + review-request |
| **Google Cloud** | console.cloud.google.com → enable Places API + Maps Embed API + create service account | `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACES_PLACE_ID`, `GOOGLE_MAPS_EMBED_API_KEY`, GA4 service account keys |
| **Vercel** | vercel.com → create account → connect GitHub repo | Required for deploy; paste all env vars above |
| **Healthchecks.io** (optional) | healthchecks.io → create account + checks | `HEARTBEAT_*` env vars |
| **SendGrid** (optional) | sendgrid.com → create account | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_LIST_ID` |
| **Slack / Telegram / Discord** (optional, pick one) | Create incoming webhook in your preferred service | `OWNER_SLACK_WEBHOOK_URL` or Telegram pair or `OWNER_NOTIFY_DISCORD_URL` |

---

## Infrastructure / one-time actions

| Action | Where | Why |
|---|---|---|
| DNS: point `alpacasibiza.com` A record at Vercel | One.com domain manager | Without this, site is not reachable |
| DNS: CNAME `www` → `cname.vercel-dns.com` | One.com | Redirect www → bare domain |
| DNS: MX records | One.com | Email delivery |
| DNS: DKIM record for Resend | One.com → paste record from Resend dashboard | Emails land in spam without SPF/DKIM/DMARC |
| DNS: SPF record | One.com → TXT record | Same |
| DNS: DMARC record | One.com → TXT `_dmarc` | Same |
| Vercel env vars | Vercel dashboard → Settings → Environment Variables | Paste all Tier 1 + Tier 2 keys above |
| Vercel Pro plan | vercel.com/account | 7 cron jobs configured; Hobby plan only supports 2 — remaining 5 silently never fire on Hobby |
| FareHarbor webhooks | Ask FareHarbor support to POST on `booking.created` → `/api/reminder` and `availability.completed` → `/api/review-request` with `x-webhook-secret` header | Reminder emails and review-request emails never send without this |
| Admin credentials | Set `ADMIN_USERNAME` + `ADMIN_PASSWORD` in Vercel BEFORE going live | Default is fail-closed (no default creds) — set these or admin login is broken |
| Postal code confirmation | Confirm: `07850` (live terms) vs `07819` (old config) — currently set `07850` with conflict warning in `lib/tenants/alpacasibiza.ts` | Wrong postcode on legal pages |
| Phone number confirmation | Current: `+32 475 58 65 44` (Belgian). Confirm or supply Spanish +34 number. | Footer + WhatsApp CTA |
| Language strategy | 6 locales configured; DE/IT/FR have 170 `__UNTRANSLATED__` sentinel keys each. Decide: prune IT+FR, commission translation, or accept EN fallbacks. | 3 of 6 locales show broken-looking raw keys |
| Brand color sign-off | Accent darkened from #DD7F3C → #AD561A for WCAG AA. Flagged "OWNER REVIEW NEEDED" in `CLAUDE.md`. | Visual shift from amber to burnt-orange on all CTAs |

---

## Owner decisions blocking code completion

| Decision | File waiting | Impact of no-decision |
|---|---|---|
| Gift adoption: certificate shows donor name or recipient name? | `lib/payment-handlers-gift-schedule.ts` | Deferred-gift cron sends generic certificate |
| Gift adoption: welcome email to recipient on delivery date, or to donor immediately? | Same | Cron stub never fires gift welcome |
| Gift adoption: cancellation cascade if recipient declines? | Same | No cancel path for gift adoptions |
| Four tour "types" (Meet Herd / Weaving / Farm Experience / Photo Session): keep as marketing names or replace with single "Alpaca Tour"? | `lib/data/experiences.ts`, translations, ExperienceCards | Invented taxonomy stays |
| 5-stage timeline on /tours: remove (real tour = 1 hour) or replace with honest 1-hour itinerary? | `app/[locale]/tours/page.tsx` | Misleading all-day timeline stays |
| Experience inclusions (Romantic Sunset cava/tapas/photographer, Corporate lunch/branded-photo, Family snacks): confirm real or strip to "contact for details"? | `translations/en.json`, `nl.json` fabricated keys (see `FABRICATED_I18N_AUDIT.md`) | Customer-facing fabrications stay live |
| Photography package (golden-hour shoots): Yes/No + price + details | `app/[locale]/experiences/` | Photo Session card shows "contact for details" |
| Weaving masterclass (online, recorded): Yes/No + price | `lib/data/experiences.ts` | Not on site |
| Corporate team-building day rate | `app/[locale]/experiences/corporate-team-building/page.tsx` UNMAPPED | Shows "Contact for pricing" |
