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
 * Reset the "already ran" guard. @internal — for tests only.
 */
export function __reset(): void {
  _ran = false
}

/**
 * Treat env values as "unset" if they're empty, undefined, or hold a
 * placeholder sentinel (e.g. `TODO_PASTE_FROM_FAREHARBOR` in .env.local.example).
 * Without this, `FAREHARBOR_ITEM_TOUR_MEET_HERD=TODO_PASTE_ITEM_ID` would be truthy
 * and silently suppress the missing-config warn.
 * @internal — exported for tests
 */
export function isSet(key: string): boolean {
  const v = process.env[key]
  if (!v) return false
  if (v.startsWith('TODO_') || v === '__OWNER_INPUT_REQUIRED__') return false
  return true
}

export function validateEnv(): void {
  // Server-only, runs once per process
  if (typeof window !== 'undefined') return
  if (_ran) return
  _ran = true

  // ── Tier 1 — hard requirement ────────────────────────────────────────────
  // Missing any of these in production means something will break or be unsafe.
  // Key list lives in TIER1_KEYS (exported) so /api/health can reference it.
  const tier1Impact: Record<string, string> = {
    RESEND_API_KEY:            'contact form emails will not send',
    CONTACT_EMAIL:             'form submissions have no recipient (falls back to hardcoded default)',
    NEXTAUTH_SECRET:           'auth sessions are insecure / broken',
    NEXTAUTH_URL:              'auth redirect callbacks break in production',
    ADMIN_USERNAME:            'admin login non-functional',
    ADMIN_PASSWORD:            'admin login non-functional',
    FAREHARBOR_WEBHOOK_SECRET: 'webhook endpoint returns 503 (fail-closed)',
    CRON_SECRET:               'cron routes unprotected or blocked',
  }

  for (const key of TIER1_KEYS) {
    const impact = tier1Impact[key] ?? key
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

  // Turnstile (warn once for the pair)
  if (!isSet('TURNSTILE_SECRET_KEY') || !isSet('NEXT_PUBLIC_TURNSTILE_SITE_KEY')) {
    console.warn(
      '[validateEnv] Tier 2 unset (graceful, but feature dark): TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY — forms unprotected'
    )
  }

  // FareHarbor API credentials (warn once for the pair)
  if (!isSet('FAREHARBOR_APP_KEY') || !isSet('FAREHARBOR_USER_KEY')) {
    console.warn(
      '[validateEnv] Tier 2 unset (graceful, but feature dark): FAREHARBOR_APP_KEY / FAREHARBOR_USER_KEY — live spots-left widget hidden'
    )
  }

  // FareHarbor tour item IDs (warn collectively if any unset)
  // Names must stay in sync with config.ts FAREHARBOR_ITEM_TOUR_* exports.
  const fareharborItems = [
    'FAREHARBOR_ITEM_TOUR_MEET_HERD',
    'FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP',
    'FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE',
    'FAREHARBOR_ITEM_TOUR_PHOTO_SESSION',
    'FAREHARBOR_ITEM_YOGA',
  ]
  const missingItems = fareharborItems.filter((k) => !isSet(k))
  if (missingItems.length > 0) {
    console.warn(
      `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingItems.join(', ')} — per-tour Book buttons fall back to main calendar`
    )
  }

  // Experience item IDs: weddings, business incentives, romantic sunset, family farm days
  const experienceItems = [
    'FAREHARBOR_ITEM_WEDDINGS',
    'FAREHARBOR_ITEM_BUSINESS_INCENTIVES',
    'FAREHARBOR_ITEM_ROMANTIC_SUNSET',
    'FAREHARBOR_ITEM_FAMILY_FARM_DAYS',
  ]
  const missingExperienceItems = experienceItems.filter((k) => !isSet(k))
  if (missingExperienceItems.length > 0) {
    console.warn(
      `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingExperienceItems.join(', ')} — ` +
      'experience-page Book buttons fall back to main calendar. ' +
      'OWNER_INPUT_NEEDED: create items in FareHarbor admin → Items, then set these vars.'
    )
  }

  // Gift-card item ID (warn if unset; CTA falls back to main calendar)
  if (!isSet('FAREHARBOR_ITEM_GIFT_CARD')) {
    console.warn(
      '[validateEnv] Tier 2 unset (graceful, but feature dark): FAREHARBOR_ITEM_GIFT_CARD — ' +
      '/gifts CTA falls back to main FareHarbor calendar. ' +
      'OWNER_INPUT_NEEDED: create a Gift Card item in FareHarbor admin → Items → Gift Cards, then set this var.'
    )
  }

  // Payment vendor for Adopt-a-Paca (warn if unset; defaults to mailto)
  if (!isSet('PAYMENT_VENDOR')) {
    console.warn(
      '[validateEnv] Tier 2 unset (graceful): PAYMENT_VENDOR — adopt CTA falls back to mailto:. Set to stripe|fareharbor|mollie to activate checkout.'
    )
  }

  // Stripe Checkout (Strategy D per ps-003-2026-05-27-payment-rails.md).
  // Only warn when PAYMENT_VENDOR=stripe; irrelevant otherwise.
  if (isSet('PAYMENT_VENDOR') && process.env.PAYMENT_VENDOR === 'stripe') {
    const stripeKeys = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'STRIPE_ADOPT_PRICE_ID_MONTHLY',
      'STRIPE_ADOPT_PRICE_ID_YEARLY',
    ]
    const missingStripe = stripeKeys.filter((k) => !isSet(k))
    if (missingStripe.length > 0) {
      console.warn(
        `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingStripe.join(', ')} — ` +
        'Stripe Checkout inactive; adopt CTA falls back to mailto:. ' +
        'OWNER_INPUT_NEEDED: create prices in Stripe dashboard, then set these vars.'
      )
    }
  }

  // Mollie Payments + Subscriptions (SEPA Direct Debit primary path).
  // Only warn when PAYMENT_VENDOR=mollie; irrelevant otherwise.
  if (isSet('PAYMENT_VENDOR') && process.env.PAYMENT_VENDOR === 'mollie') {
    const mollieKeys = ['MOLLIE_API_KEY', 'MOLLIE_WEBHOOK_SECRET']
    const missingMollie = mollieKeys.filter((k) => !isSet(k))
    if (missingMollie.length > 0) {
      console.warn(
        `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingMollie.join(', ')} — ` +
        'Mollie checkout inactive; adopt CTA falls back to mailto:. ' +
        'OWNER_INPUT_NEEDED: create Mollie account, copy API key + generate webhook secret, then set these vars.'
      )
    }
  }

  // Adopt-a-Paca discount codes (warn collectively; graceful degrade — email still sends)
  const discountCodeKeys = ['ADOPT_DISCOUNT_CODE_WEAVING_10', 'ADOPT_DISCOUNT_CODE_FARMSHOP_15']
  const missingDiscountCodes = discountCodeKeys.filter((k) => !isSet(k))
  if (missingDiscountCodes.length > 0) {
    console.warn(
      `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingDiscountCodes.join(', ')} — ` +
      'adopt discount-codes email will show placeholder text instead of real codes. ' +
      'OWNER_INPUT_NEEDED: create codes in Stripe / shop platform, then set these vars.'
    )
  }

  // GA4 service account (warn collectively)
  const ga4Keys = ['GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY']
  const missingGa4 = ga4Keys.filter((k) => !isSet(k))
  if (missingGa4.length > 0) {
    console.warn(
      `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingGa4.join(', ')} — admin analytics dashboard dark`
    )
  }

  // Google Places (warn collectively)
  const placesKeys = ['GOOGLE_PLACES_API_KEY', 'GOOGLE_PLACES_PLACE_ID']
  const missingPlaces = placesKeys.filter((k) => !isSet(k))
  if (missingPlaces.length > 0) {
    console.warn(
      `[validateEnv] Tier 2 unset (graceful, but feature dark): ${missingPlaces.join(', ')} — review badge hidden`
    )
  }

  // Newsletter double opt-in signing key (Tier 2 — falls back to NEXTAUTH_SECRET)
  if (!isSet('NEWSLETTER_SIGNING_KEY')) {
    console.warn(
      '[validateEnv] Tier 2 unset (graceful): NEWSLETTER_SIGNING_KEY — ' +
      'newsletter confirmation tokens will be signed with NEXTAUTH_SECRET as fallback. ' +
      'Set a dedicated key to allow independent rotation.'
    )
  }
}
