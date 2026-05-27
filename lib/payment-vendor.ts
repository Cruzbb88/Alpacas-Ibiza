/**
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 * Single-account stripeAdapter() = OWN revenue ONLY (Adopt-a-Paca, farm tours).
 * Collecting on behalf of tenants REQUIRES Stripe Connect (stripeConnectAdapter).
 * Routing tenant-customer money through this adapter = unlicensed money transmission.
 */

/**
 * payment-vendor.ts — Adopt-a-Paca payment abstraction.
 *
 * OWNER_INPUT_NEEDED: set PAYMENT_VENDOR in .env.local to activate a real
 * checkout flow. Until then the adopt page CTA falls back to mailto: (current
 * behaviour) — no user-visible regression.
 *
 * Supported values for PAYMENT_VENDOR:
 *   mailto      — contact email only (default / current behaviour)
 *   stripe      — requires STRIPE_SECRET_KEY + STRIPE_ADOPT_PRICE_ID_MONTHLY
 *                 + STRIPE_ADOPT_PRICE_ID_YEARLY + STRIPE_WEBHOOK_SECRET
 *   fareharbor  — requires FAREHARBOR_ITEM_ADOPT_MONTHLY + FAREHARBOR_ITEM_ADOPT_YEARLY
 *   mollie      — requires MOLLIE_API_KEY + MOLLIE_ADOPT_PRODUCT_ID
 *
 * Adding a new vendor: implement PaymentAdapter, add a case to getPaymentAdapter().
 */

export type PaymentVendor =
  | 'mailto'
  | 'stripe'
  | 'stripe-connect'
  | 'fareharbor'
  | 'mollie'
  | 'unconfigured'

/**
 * Adopt-a-Paca subscription tier. Single source of truth across:
 * - checkout + mollie-checkout routes (tier query/body validation)
 * - PaymentAdapter.buildAdoptCheckoutUrl
 * - email templates (welcomeAdoptionEmailHtml, welcomeAdoptionSubject)
 * - handleStripeCheckoutCompleted handler
 * - lib/integrations/payment-mollie.ts (productId overload)
 */
export type AdoptTier = 'monthly' | 'yearly'

export function isAdoptTier(value: unknown): value is AdoptTier {
  return value === 'monthly' || value === 'yearly'
}

/**
 * Canonical mailto fallback URL — shown when no payment vendor is configured
 * or when a vendor's createCheckoutSession returns unconfigured.
 */
export const ADOPT_FALLBACK_MAILTO =
  'mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry'

export interface AdoptCheckoutOpts {
  /**
   * Optional alpaca slug chosen on the /adopt picker. When set, threaded into
   * the resulting checkout URL as `&alpaca=<slug>` so the route handler can
   * stamp it onto provider metadata. Caller MUST have already validated against
   * the canonical roster — the adapter does not re-validate.
   */
  alpaca?: string
}

export interface PaymentAdapter {
  vendor: PaymentVendor
  /**
   * Return a URL the user should be sent to in order to complete adoption
   * checkout, or null if the required env vars are not yet set.
   * Callers MUST fall back to mailto: when null is returned.
   */
  buildAdoptCheckoutUrl(tier: 'monthly' | 'yearly', opts?: AdoptCheckoutOpts): string | null
}

function appendAlpacaQuery(url: string, alpaca?: string): string {
  if (!alpaca) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}alpaca=${encodeURIComponent(alpaca)}`
}

// ── Mailto adapter (default) ──────────────────────────────────────────────────

const mailtoAdapter: PaymentAdapter = {
  vendor: 'mailto',
  buildAdoptCheckoutUrl(_tier, _opts) {
    // Mailto fallback ignores alpaca choice — the email subject conveys intent;
    // the owner reads the body and follows up. No URL parameters to thread.
    return ADOPT_FALLBACK_MAILTO
  },
}

// ── Stripe adapter ────────────────────────────────────────────────────────────
// Strategy D per ps-003: Hosted Stripe Checkout, single account, owner is MoR.
// OWNER_INPUT_NEEDED: create a Stripe account, add a recurring price for monthly
// (mode: subscription) and a one-time price for yearly (mode: payment), then set:
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//   STRIPE_ADOPT_PRICE_ID_MONTHLY, STRIPE_ADOPT_PRICE_ID_YEARLY

function stripeAdapter(): PaymentAdapter {
  return {
    vendor: 'stripe',
    buildAdoptCheckoutUrl(tier, opts) {
      const priceId =
        tier === 'monthly'
          ? process.env.STRIPE_ADOPT_PRICE_ID_MONTHLY
          : process.env.STRIPE_ADOPT_PRICE_ID_YEARLY
      const secretKey = process.env.STRIPE_SECRET_KEY

      if (!priceId || !secretKey) {
        if (typeof window === 'undefined') {
          // Server-side only to avoid double-logging
          console.warn(
            `[payment-vendor] Stripe selected but STRIPE_ADOPT_PRICE_ID_${tier.toUpperCase()} or STRIPE_SECRET_KEY is unset. Falling back to mailto.`
          )
        }
        return null
      }

      return appendAlpacaQuery(`/api/checkout?tier=${tier}`, opts?.alpaca)
    },
  }
}

// ── Stripe Connect adapter (DEFERRED) ─────────────────────────────────────────
// DEFER UNTIL TENANT #1 SIGNS — see ps-003 Strategy E.
// Using single-account stripeAdapter() for tenant revenue = unlicensed money
// transmission. Connect Express must be used once tenants take customer money.
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function stripeConnectAdapter(): PaymentAdapter {
  // TODO: DEFER UNTIL TENANT #1 SIGNS
  // Implement Stripe Connect Express:
  //   1. Account onboarding via /api/connect/onboard (hosted KYC by Stripe)
  //   2. Payment Intent with application_fee_amount (our platform cut)
  //   3. Webhook for account.updated (connected account state changes)
  //   4. Add to CANT_BE_DONE.md the day this activates: any flow routing tenant
  //      customer money through single-account stripeAdapter() = illegal.
  throw new Error(
    '[payment-vendor] stripeConnectAdapter: DEFER UNTIL TENANT #1 SIGNS. ' +
    'See reports/probability-storm/ps-003-2026-05-27-payment-rails.md Strategy E.'
  )
}

// Adapter for the stripe-connect vendor key. Returns an adapter whose
// buildAdoptCheckoutUrl ALWAYS returns null so CTAs fall back to mailto, while
// loudly logging the DEFER state. The original guard (silent fall-through via
// the switch default) was misleading — claims throw, actually silent. Now
// the switch routes here explicitly.
function stripeConnectVendorGuardAdapter(): PaymentAdapter {
  return {
    vendor: 'stripe-connect',
    buildAdoptCheckoutUrl(_tier) {
      if (typeof window === 'undefined') {
        console.error(
          '[payment-vendor] PAYMENT_VENDOR=stripe-connect is set but Stripe Connect ' +
          'is DEFERRED UNTIL TENANT #1 SIGNS. Adopt CTA falls back to mailto. ' +
          'See reports/probability-storm/ps-003-2026-05-27-payment-rails.md Strategy E.'
        )
      }
      return null
    },
  }
}

// ── FareHarbor adapter ────────────────────────────────────────────────────────
// OWNER_INPUT_NEEDED: FareHarbor supports subscriptions via gift items.
// Get the item IDs from FareHarbor admin → Items.

function fareharborAdapter(): PaymentAdapter {
  const shortname =
    process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME || 'alpacasibiza'

  return {
    vendor: 'fareharbor',
    buildAdoptCheckoutUrl(tier) {
      const itemId =
        tier === 'monthly'
          ? process.env.FAREHARBOR_ITEM_ADOPT_MONTHLY
          : process.env.FAREHARBOR_ITEM_ADOPT_YEARLY

      if (!itemId) {
        if (typeof window === 'undefined') {
          console.warn(
            `[payment-vendor] FareHarbor selected but FAREHARBOR_ITEM_ADOPT_${tier.toUpperCase()} is unset. Falling back to mailto.`
          )
        }
        return null
      }

      return `https://fareharbor.com/embeds/book/${shortname}/?items=${encodeURIComponent(itemId)}`
    },
  }
}

// ── Mollie adapter ────────────────────────────────────────────────────────────
// OWNER_INPUT_NEEDED: Mollie is popular in NL/ES and supports SEPA Direct Debit
// natively. SEPA recurring costs €0.25 flat per charge vs Stripe's ~€1.75 at €75/mo.
//
// Requires:
//   MOLLIE_API_KEY (live_xxx or test_xxx)
//   MOLLIE_WEBHOOK_SECRET (random 32-char hex, used as URL-path secret on webhook)
//
// Pricing comes from lib/config.ts ADOPT_PRICE_*_EUR constants (Rule 6 single
// source of truth). No MOLLIE_ADOPT_PRODUCT_ID needed — Mollie has no Products
// concept; amounts are sent inline on each Payment create call.
//
// Routes through GET /api/mollie-checkout?tier=monthly|yearly which creates the
// Mollie Payment server-side and redirects to Mollie's hosted checkout page.

function mollieAdapter(): PaymentAdapter {
  return {
    vendor: 'mollie',
    buildAdoptCheckoutUrl(tier, opts) {
      const apiKey = process.env.MOLLIE_API_KEY
      const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET

      if (!apiKey || !webhookSecret) {
        if (typeof window === 'undefined') {
          console.warn(
            '[payment-vendor] Mollie selected but MOLLIE_API_KEY or MOLLIE_WEBHOOK_SECRET is unset. Falling back to mailto.'
          )
        }
        return null
      }

      return appendAlpacaQuery(`/api/mollie-checkout?tier=${tier}`, opts?.alpaca)
    },
  }
}

// ── Public factory ────────────────────────────────────────────────────────────

/**
 * Read PAYMENT_VENDOR from env and return the appropriate adapter.
 * Defaults to mailto if unset or unrecognised.
 *
 * One-line activation for the owner:
 *   PAYMENT_VENDOR=stripe   → swap adopt CTA to Stripe Checkout (Strategy D)
 *   PAYMENT_VENDOR=fareharbor → swap adopt CTA to FareHarbor
 *   PAYMENT_VENDOR=mollie   → swap adopt CTA to Mollie
 *
 * PAYMENT_VENDOR=stripe-connect is blocked until tenant #1 signs (see above).
 */
export function getPaymentAdapter(): PaymentAdapter {
  const vendor = (process.env.PAYMENT_VENDOR ?? 'mailto') as PaymentVendor

  switch (vendor) {
    case 'stripe':
      return stripeAdapter()
    case 'stripe-connect':
      return stripeConnectVendorGuardAdapter()
    case 'fareharbor':
      return fareharborAdapter()
    case 'mollie':
      return mollieAdapter()
    case 'mailto':
    default:
      return mailtoAdapter
  }
}
