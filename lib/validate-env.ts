/**
 * validateEnv — startup env-var visibility check.
 *
 * Logs once per process on server boot.
 * Never throws — operator sees warnings, site keeps running.
 * Never prints secret values — only var names and feature impact.
 *
 * Tiers from CLAUDE.md "Env var deploy tiers":
 *   Tier 1 — MUST set before prod (site breaks or is unsafe)
 *   Tier 2 — fail-open / graceful (feature dark until set)
 */

let _ran = false

// ── Tier 2 var definitions ────────────────────────────────────────────────────
// Single source of truth consumed by validateEnv() (boot-log) and /admin/env-check.

export interface EnvVar {
  key: string
  notes: string
}

export const TIER2_VARS: EnvVar[] = [
  { key: 'TURNSTILE_SECRET_KEY',           notes: 'Pair with NEXT_PUBLIC_TURNSTILE_SITE_KEY — forms unprotected if unset' },
  { key: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', notes: 'Pair with TURNSTILE_SECRET_KEY' },
  { key: 'FAREHARBOR_APP_KEY',             notes: 'Pair with FAREHARBOR_USER_KEY — live spots widget dark if unset' },
  { key: 'FAREHARBOR_USER_KEY',            notes: 'Pair with FAREHARBOR_APP_KEY' },
  { key: 'FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP', notes: 'Weaving-workshop Book button → main calendar fallback if unset' },
  { key: 'FAREHARBOR_ITEM_YOGA',                  notes: 'Yoga filtered booking → main calendar fallback if unset' },
  { key: 'FAREHARBOR_ITEM_WEDDINGS',              notes: 'Weddings CTA → main calendar fallback if unset' },
  { key: 'FAREHARBOR_ITEM_BUSINESS_INCENTIVES',   notes: 'Business incentives CTA → main calendar fallback if unset' },
  { key: 'FAREHARBOR_ITEM_ROMANTIC_SUNSET',       notes: 'Romantic sunset CTA → main calendar fallback if unset' },
  { key: 'FAREHARBOR_ITEM_FAMILY_FARM_DAYS',      notes: 'Family farm days CTA → main calendar fallback if unset' },
  { key: 'FAREHARBOR_ITEM_GIFT_CARD',             notes: '/gifts CTA → main calendar fallback if unset' },
  { key: 'GA4_PROPERTY_ID',     notes: 'GA4 service account — admin analytics dark if unset' },
  { key: 'GA4_CLIENT_EMAIL',    notes: 'GA4 service account' },
  { key: 'GA4_PRIVATE_KEY',     notes: 'GA4 service account' },
  { key: 'GOOGLE_PLACES_API_KEY', notes: 'Google Places — review badge hidden if unset' },
  { key: 'GOOGLE_PLACES_PLACE_ID', notes: 'Google Places — review badge hidden if unset' },
  { key: 'NEWSLETTER_SIGNING_KEY', notes: 'Falls back to NEXTAUTH_SECRET if unset; set for independent rotation' },
  { key: 'STRIPE_SECRET_KEY',              notes: 'Stripe checkout 503 if unset; adopt CTA → mailto fallback' },
  { key: 'STRIPE_WEBHOOK_SECRET',          notes: 'Stripe webhook fail-CLOSED if unset' },
  { key: 'STRIPE_ADOPT_PRICE_ID_MONTHLY',  notes: 'Monthly adopt tier 503 if unset (PAYMENT_VENDOR=stripe)' },
  { key: 'STRIPE_ADOPT_PRICE_ID_YEARLY',   notes: 'Yearly adopt tier 503 if unset (PAYMENT_VENDOR=stripe)' },
  { key: 'MOLLIE_API_KEY',         notes: 'Mollie checkout 503 if unset (PAYMENT_VENDOR=mollie)' },
  { key: 'MOLLIE_WEBHOOK_SECRET',  notes: 'Mollie webhook fail-CLOSED if unset (PAYMENT_VENDOR=mollie)' },
  { key: 'PAYMENT_VENDOR',         notes: 'stripe | mollie | empty → mailto fallback' },
  { key: 'ADOPT_DISCOUNT_CODE_WEAVING_10',  notes: 'Discount email shows placeholder if unset' },
  { key: 'ADOPT_DISCOUNT_CODE_FARMSHOP_15', notes: 'Discount email shows placeholder if unset' },
  { key: 'ALPACA_CAM_EMBED_URL', notes: 'Live cam section hidden on homepage until set; use YouTube/Twitch/Vimeo embed URL' },
  { key: 'REFERRER_REWARD_LIVE',             notes: 'Master gate for donor referral reward emails — set to "true" to activate; defaults off' },
  { key: 'REFERRER_REWARD_DISCOUNT_CODE',    notes: 'Reward discount code sent to referrer on successful referral conversion (e.g. Stripe Coupon or shop code); reward email suppressed if unset' },
  { key: 'REFERRER_REWARD_DESCRIPTION',      notes: 'Short description of the reward shown in the email (e.g. "1 month off your adoption"); reward email suppressed if unset' },
  // ── Build #4 — Generic campaign banner (per-slot) ─────────────────────────
  { key: 'CAMPAIGN_HOME_LIVE',          notes: 'Campaign banner on homepage — set to "true" to activate (also needs CAMPAIGN_HOME_HEADLINE)' },
  { key: 'CAMPAIGN_HOME_HEADLINE',      notes: 'Campaign banner headline for homepage slot' },
  { key: 'CAMPAIGN_HOME_BODY',          notes: 'Campaign banner body text for homepage slot (optional)' },
  { key: 'CAMPAIGN_HOME_CTA_HREF',      notes: 'Campaign banner CTA link for homepage slot (optional)' },
  { key: 'CAMPAIGN_HOME_CTA_LABEL',     notes: 'Campaign banner CTA label for homepage slot (optional)' },
  { key: 'CAMPAIGN_TOURS_LIVE',         notes: 'Campaign banner on tours page — set to "true" to activate' },
  { key: 'CAMPAIGN_TOURS_HEADLINE',     notes: 'Campaign banner headline for tours slot' },
  { key: 'CAMPAIGN_TOURS_BODY',         notes: 'Campaign banner body text for tours slot (optional)' },
  { key: 'CAMPAIGN_TOURS_CTA_HREF',     notes: 'Campaign banner CTA link for tours slot (optional)' },
  { key: 'CAMPAIGN_TOURS_CTA_LABEL',    notes: 'Campaign banner CTA label for tours slot (optional)' },
  { key: 'CAMPAIGN_YOGA_LIVE',          notes: 'Campaign banner on yoga page — set to "true" to activate' },
  { key: 'CAMPAIGN_YOGA_HEADLINE',      notes: 'Campaign banner headline for yoga slot' },
  { key: 'CAMPAIGN_YOGA_BODY',          notes: 'Campaign banner body text for yoga slot (optional)' },
  { key: 'CAMPAIGN_YOGA_CTA_HREF',      notes: 'Campaign banner CTA link for yoga slot (optional)' },
  { key: 'CAMPAIGN_YOGA_CTA_LABEL',     notes: 'Campaign banner CTA label for yoga slot (optional)' },
  // ── Build #8 — Tour bundle CTA ────────────────────────────────────────────
  { key: 'BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR',  notes: 'Bundle discount EUR — tour + yoga; 0 hides CTA (OWNER_INPUT_NEEDED)' },
  { key: 'BUNDLE_TOUR_PLUS_YOGA_URL',           notes: 'FareHarbor bundle item or tour URL for tour+yoga combo' },
  { key: 'BUNDLE_ADOPT_PLUS_TOUR_DISCOUNT_EUR', notes: 'Bundle discount EUR — adopt + tour; 0 hides CTA (OWNER_INPUT_NEEDED)' },
  { key: 'BUNDLE_ADOPT_PLUS_TOUR_URL',          notes: 'FareHarbor bundle URL for adopt+tour combo' },
  // ── Build #1 — Annual Farm Pass (Membership) ──────────────────────────────
  { key: 'MEMBERSHIP_LIVE',              notes: 'Set to "true" to activate /membership page and homepage callout; defaults off' },
  { key: 'MEMBERSHIP_PRICE_EUR',         notes: 'Annual farm pass price in EUR; 0 hides page (OWNER_INPUT_NEEDED)' },
  { key: 'STRIPE_MEMBERSHIP_PRICE_ID',   notes: 'Pre-created Stripe Price ID for annual pass; membership-checkout 503 if unset' },
  // ── Build #2 — Redeem Voucher ─────────────────────────────────────────────
  { key: 'VALID_VOUCHER_CODES',          notes: 'Comma-separated list of valid voucher codes for /redeem-voucher scaffold; all codes invalid if unset' },
  // ── Seasonal pricing scaffold ─────────────────────────────────────────────
  { key: 'TOUR_SEASONAL_WINDOWS',        notes: 'JSON array of SeasonalPriceWindow — tour seasonal pricing ladder (e.g. off-peak €18, peak €21.19); SeasonalPriceList renders null until set' },
  // ── Build: Herd Family monthly-tier landing ────────────────────────────────
  { key: 'HERD_FAMILY_LIVE',             notes: 'Set to "true" to publish /herd-family monthly-tier landing page (defaults off, page 404s)' },
  // ── Build: Junior / kids membership tier ──────────────────────────────────
  { key: 'JUNIOR_TIER_LIVE',             notes: 'Set to "true" to activate JuniorTierCard on /adopt and /api/junior-checkout route; defaults off, card renders null' },
  { key: 'JUNIOR_TIER_PRICE_EUR',        notes: 'Junior tier price in EUR; 0 hides card (OWNER_INPUT_NEEDED)' },
  { key: 'STRIPE_JUNIOR_PRICE_ID',       notes: 'Pre-created Stripe Price ID for junior tier; junior-checkout 503 if unset' },

  // ── FareHarbor — per-tour item IDs (missing from prior audit) ────────────
  { key: 'FAREHARBOR_ITEM_TOUR_MEET_HERD',      notes: 'Meet-the-Herd tour Book button → main calendar fallback if unset (OWNER_INPUT_NEEDED: copy from FareHarbor dashboard)' },
  { key: 'FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE', notes: 'Farm-Experience tour Book button → main calendar fallback if unset (OWNER_INPUT_NEEDED)' },
  { key: 'FAREHARBOR_ITEM_TOUR_PHOTO_SESSION',   notes: 'Photo-Session tour Book button → main calendar fallback if unset (OWNER_INPUT_NEEDED)' },
  { key: 'FAREHARBOR_ITEM_PHOTOSHOOTS',          notes: 'Photoshoots CTA → main calendar fallback if unset' },
  // ── FareHarbor — shop catalog item IDs (ADR 004) ─────────────────────────
  { key: 'FAREHARBOR_ITEM_WOVEN',      notes: 'Woven-goods shop item → FareHarbor catalog CTA dark if unset (PAYMENT_VENDOR=fareharbor)' },
  { key: 'FAREHARBOR_ITEM_COMMISSION', notes: 'Commission-item shop CTA → FareHarbor catalog dark if unset (PAYMENT_VENDOR=fareharbor)' },
  { key: 'FAREHARBOR_ITEM_ALCACA',     notes: 'Alcaca-goods shop item → FareHarbor catalog CTA dark if unset (PAYMENT_VENDOR=fareharbor)' },
  // ── FareHarbor — availability API (Pro plan, optional) ───────────────────
  { key: 'FAREHARBOR_SHORTNAME',  notes: 'Server-side shortname for /api/availability; defaults to alpacasibiza if unset' },
  { key: 'FAREHARBOR_ITEM_ID',    notes: 'Generic FareHarbor item ID for /api/availability single-item queries; availability widget dark if unset' },
  // ── FareHarbor — adopt-a-paca item IDs ───────────────────────────────────
  { key: 'FAREHARBOR_ITEM_ADOPT_MONTHLY', notes: 'Monthly adopt-a-paca FareHarbor item → adopt CTA falls back if unset (only used when PAYMENT_VENDOR=fareharbor)' },
  { key: 'FAREHARBOR_ITEM_ADOPT_YEARLY',  notes: 'Yearly adopt-a-paca FareHarbor item → adopt CTA falls back if unset (only used when PAYMENT_VENDOR=fareharbor)' },

  // ── CAPTCHA / bot protection ──────────────────────────────────────────────
  { key: 'CAPTCHA_PROVIDER',              notes: 'Selects captcha adapter: turnstile (default) | recaptcha | none. Swap by config, not code.' },
  { key: 'RECAPTCHA_SECRET_KEY',          notes: 'Google reCAPTCHA v3 server secret — required when CAPTCHA_PROVIDER=recaptcha; fail-open + prod warn if unset' },
  { key: 'NEXT_PUBLIC_RECAPTCHA_SITE_KEY', notes: 'Google reCAPTCHA v3 site key — required when CAPTCHA_PROVIDER=recaptcha' },
  { key: 'RECAPTCHA_MIN_SCORE',           notes: 'reCAPTCHA v3 score threshold (0.0–1.0); requests below this score rejected; default 0.5, raise to 0.7 for stricter protection' },

  // ── SendGrid newsletter list management (optional) ────────────────────────
  { key: 'SENDGRID_API_KEY',    notes: 'SendGrid API key — newsletter subscriber list sync dark if unset; Resend handles owner-notification either way' },
  { key: 'SENDGRID_FROM_EMAIL', notes: 'SendGrid sender address for list-management emails' },
  { key: 'SENDGRID_LIST_ID',    notes: 'SendGrid contact-list ID for newsletter subscriber sync' },

  // ── Site origin / URL ─────────────────────────────────────────────────────
  { key: 'NEXT_PUBLIC_SITE_URL', notes: 'Override site base URL per deployment (e.g. preview URL); leave blank on prod — code defaults to https://alpacasibiza.com (lib/config.ts)' },

  // ── Pricing overrides ─────────────────────────────────────────────────────
  { key: 'YOGA_PRICE_EUR',             notes: 'Override yoga session price in EUR; defaults to constant in lib/config.ts — set only to change without redeploying' },
  { key: 'ADOPT_PRICE_MONTHLY_EUR',    notes: 'Override monthly adopt price in EUR; defaults to lib/config.ts ADOPT_PRICE_MONTHLY_EUR (75)' },
  { key: 'ADOPT_PRICE_YEARLY_EUR',     notes: 'Override yearly adopt price in EUR; defaults to lib/config.ts ADOPT_PRICE_YEARLY_EUR (900)' },

  // ── Owner real-time escalation notifications ──────────────────────────────
  { key: 'OWNER_SLACK_WEBHOOK_URL',     notes: 'Slack incoming-webhook URL — failure-tracker fires on severity transitions to at-risk/action-required; silent if unset' },
  { key: 'OWNER_TELEGRAM_BOT_TOKEN',    notes: 'Telegram bot token — pair with OWNER_TELEGRAM_CHAT_ID; both must be set together for Telegram escalation' },
  { key: 'OWNER_TELEGRAM_CHAT_ID',      notes: 'Telegram chat ID — pair with OWNER_TELEGRAM_BOT_TOKEN' },
  { key: 'OWNER_NOTIFY_DISCORD_URL',    notes: 'Discord incoming-webhook URL — failure-tracker escalation notifications; silent if unset' },
  { key: 'OWNER_GENERIC_WEBHOOK_URL',   notes: 'Generic webhook for custom integrations (Zapier/n8n/Make); receives EscalationNotification JSON; silent if unset' },

  // ── Resend + FareHarbor webhook secrets ───────────────────────────────────
  { key: 'RESEND_WEBHOOK_SECRET',           notes: 'Resend bounce/complaint webhook signing secret — route is fail-CLOSED (returns 503 if unset); protects sender reputation' },
  { key: 'REMINDER_WEBHOOK_SECRET',         notes: 'FareHarbor per-route webhook secret for /api/reminder — fail-OPEN (accepts any POST if unset). Generate: openssl rand -hex 32' },
  { key: 'REVIEW_REQUEST_WEBHOOK_SECRET',   notes: 'FareHarbor per-route webhook secret for /api/review-request — fail-OPEN (accepts any POST if unset)' },

  // ── Feature flags / legal ─────────────────────────────────────────────────
  { key: 'LEGAL_CONTENT_LIVE', notes: 'Set to "true" once lawyer-approved copy is in translations JSON; legal pages render "content pending" placeholder until set' },

  // ── Cron heartbeats (dead-man\'s-switch) ──────────────────────────────────
  { key: 'HEARTBEAT_OWNER_MRR_DIGEST_URL',        notes: 'healthchecks.io ping URL for /api/owner-mrr-digest cron; silent if unset — cron runs but monitor won\'t alert on silence' },
  { key: 'HEARTBEAT_OWNER_DIGEST_URL',            notes: 'healthchecks.io ping URL for /api/owner-digest cron' },
  { key: 'HEARTBEAT_ADOPT_QUARTERLY_UPDATE_URL',  notes: 'healthchecks.io ping URL for /api/adopt-quarterly-update cron' },
  { key: 'HEARTBEAT_ADOPT_MILESTONE_EMAILS_URL',  notes: 'healthchecks.io ping URL for /api/adopt-milestone-emails cron' },

  // ── Skein sponsorship (seasonal) ─────────────────────────────────────────
  { key: 'SKEIN_CALLOUT_LIVE', notes: 'Set to "true" during shearing season — enables homepage callout + Skein nav sub-item; defaults off' },

  // ── Google Maps embed ─────────────────────────────────────────────────────
  { key: 'GOOGLE_MAPS_EMBED_API_KEY', notes: 'Google Maps embed API key — renders Google map instead of OSM fallback; OSM used if unset (no credentials needed)' },

  // ── Payment client / config ───────────────────────────────────────────────
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', notes: 'Stripe publishable key for client-side Stripe.js; Stripe elements dark if unset' },
  { key: 'MOLLIE_PROFILE_ID',                  notes: 'Mollie profile ID — used for advanced Mollie config; checkout degrades if unset' },
  { key: 'CHECKOUT_MODE',                      notes: 'Override checkout flow; leave unset for the default vendor-selected mode' },

  // ── Owner notifications ───────────────────────────────────────────────────
  { key: 'OWNER_EMAIL', notes: 'Owner notification email address — falls back to CONTACT_EMAIL if unset' },

  // ── Adopt campaign banner ─────────────────────────────────────────────────
  { key: 'ADOPT_CAMPAIGN_HEADLINE', notes: 'Adopt page time-boxed campaign headline — campaign banner hidden until set (also needs ADOPT_CAMPAIGN_END_DATE)' },
  { key: 'ADOPT_CAMPAIGN_SUBLINE',  notes: 'Adopt page campaign subline (optional)' },
  { key: 'ADOPT_CAMPAIGN_END_DATE', notes: 'ISO date string for adopt campaign end — campaign auto-hides after this date' },

  // ── Vercel Blob storage ───────────────────────────────────────────────────
  { key: 'BLOB_READ_WRITE_TOKEN', notes: 'Vercel Blob store token — auto-provided when store attached; set manually only for self-hosted blob storage' },
]

/**
 * Tier 1 keys — MUST be set before production.
 * Exported so /api/health can check them without duplicating the list.
 * @internal — exported for /api/health and tests
 */
export const TIER1_KEYS: ReadonlyArray<string> = [
  'RESEND_API_KEY',
  'CONTACT_EMAIL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'FAREHARBOR_WEBHOOK_SECRET',
  'CRON_SECRET',
]

/**
 * Per-key impact prose — what breaks if this Tier 1 key is unset.
 * Single source of truth; consumed by validateEnv() (boot-log) and the
 * /admin/env-check UI. Lowercase phrasing fits both mid-sentence log output
 * and sentence-cased UI render (capitalize-first-letter at the render site).
 */
export const TIER1_IMPACT: Record<string, string> = {
  RESEND_API_KEY:            'contact form emails will not send',
  CONTACT_EMAIL:             'form submissions have no recipient (falls back to hardcoded default)',
  NEXTAUTH_SECRET:           'auth sessions are insecure / broken',
  NEXTAUTH_URL:              'auth redirect callbacks break in production',
  ADMIN_USERNAME:            'admin login non-functional',
  ADMIN_PASSWORD:            'admin login non-functional',
  FAREHARBOR_WEBHOOK_SECRET: 'webhook endpoint returns 503 (fail-closed)',
  CRON_SECRET:               'cron routes unprotected or blocked',
}

/**
 * Reset the "already ran" guard. @internal — for tests only.
 */
export function __reset(): void {
  _ran = false
}

/**
 * Treat env values as "unset" if they're empty, undefined, or hold a
 * placeholder sentinel (e.g. `TODO_PASTE_FROM_FAREHARBOR` in .env.local.example).
 * Without this, `FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP=TODO_PASTE_ITEM_ID` would be truthy
 * and silently suppress the missing-config warn.
 * @internal — exported for tests
 */
export function isSet(key: string): boolean {
  const v = process.env[key]
  if (!v) return false
  if (v.startsWith('TODO_') || v === '__OWNER_INPUT_REQUIRED__') return false
  return true
}

/** True iff every Tier 1 env var is set (excluding TODO_/sentinel placeholders). */
export function isTier1Ready(): boolean {
  return TIER1_KEYS.every(isSet)
}

export function validateEnv(): void {
  // Server-only, runs once per process
  if (typeof window !== 'undefined') return
  if (_ran) return
  _ran = true

  // ── Tier 1 — hard requirement ────────────────────────────────────────────
  // Missing any of these in production means something will break or be unsafe.
  // Key list lives in TIER1_KEYS (exported) so /api/health can reference it.
  for (const key of TIER1_KEYS) {
    const impact = TIER1_IMPACT[key] ?? key
    if (!isSet(key)) {
      const msg = `[validateEnv] Tier 1 missing (will break or be unsafe): ${key} — ${impact}. This is a hard problem.`
      if (process.env.NODE_ENV === 'production') {
        console.error(msg)
      } else {
        console.warn(msg)
      }
    }
  }

  // ── Tier 2 — fail-open / graceful ────────────────────────────────────────
  // Missing these means a feature silently degrades; the rest of the site works.
  // Key list lives in TIER2_VARS (exported) so /admin/env-check UI stays in sync.
  for (const { key, notes } of TIER2_VARS) {
    if (!isSet(key)) {
      console.warn(
        `[validateEnv] Tier 2 unset (graceful, but feature dark): ${key} — ${notes}`
      )
    }
  }
}

/**
 * Read CONTACT_EMAIL safely — treats TODO_* sentinels as unset (same logic as
 * isSet()). Falls back to the hardcoded farm default so replyTo / From headers
 * are never populated with a placeholder string even when an owner pastes
 * CONTACT_EMAIL=TODO_SET_ME without removing the sentinel.
 */
export function getContactEmail(): string {
  return isSet('CONTACT_EMAIL') ? process.env.CONTACT_EMAIL! : 'info@alpacasibiza.com'
}
