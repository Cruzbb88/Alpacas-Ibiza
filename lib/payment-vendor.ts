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

// ── Provider imports for delegation ───────────────────────────────────────────
// These are imported so the legacy adapter shims can delegate URL-building to
// the canonical PaymentProvider implementations. The adapters remain the public
// API for page-level consumers (no change to call sites).
import { stripeDirectPaymentProvider } from './integrations/payment-stripe-direct.ts'
import { molliePaymentProvider } from './integrations/payment-mollie.ts'

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
 * Canonical mailto fallback URL. Defined in the dependency-free leaf
 * lib/adopt-fallback.ts and re-exported here for back-compat with the many
 * call sites that import it from payment-vendor. The leaf breaks the
 * payment-vendor ↔ payment-stripe-direct circular import (TDZ build failure).
 */
import { ADOPT_FALLBACK_MAILTO } from './adopt-fallback.ts'
export { ADOPT_FALLBACK_MAILTO }

export interface AdoptCheckoutOpts {
  /**
   * Optional alpaca slug chosen on the /adopt picker. When set, threaded into
   * the resulting checkout URL as `&alpaca=<slug>` so the route handler can
   * stamp it onto provider metadata. Caller MUST have already validated against
   * the canonical roster — the adapter does not re-validate.
   */
  alpaca?: string
  /**
   * Gift recipient name — set when the donor is purchasing a gift adoption.
   * Threaded as `&gift_name=<value>` so the checkout route can read it and
   * attach it to Stripe/Mollie session metadata. Caller provides pre-validated
   * value from the gift wizard form (AdoptGiftAdoption).
   */
  giftName?: string
  /**
   * Gift recipient email — checkout route routes the welcome email here instead
   * of to the buyer when this field is present.
   */
  giftEmail?: string
  /**
   * ISO date string (yyyy-mm-dd) or named slot ('now' | 'christmas' | 'birthday').
   * Checkout route passes to Resend scheduledAt to control delivery timing.
   */
  giftDeliver?: string
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

function appendGiftQuery(url: string, opts?: AdoptCheckoutOpts): string {
  if (!opts) return url
  let result = url
  if (opts.giftName) result += `&gift_name=${encodeURIComponent(opts.giftName)}`
  if (opts.giftEmail) result += `&gift_email=${encodeURIComponent(opts.giftEmail)}`
  if (opts.giftDeliver) result += `&gift_deliver=${encodeURIComponent(opts.giftDeliver)}`
  return result
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
  // Lazily instantiate the provider so it does not create a logger at module
  // load time. The provider is the canonical home of URL-building logic;
  // this adapter is a thin compat shim for legacy callers.
  const provider = stripeDirectPaymentProvider()

  return {
    vendor: 'stripe',
    buildAdoptCheckoutUrl(tier, opts) {
      // Delegate to the PaymentProvider.buildCheckoutUrl implementation so there
      // is ONE source of URL-building logic per vendor (provider), with the
      // adapter as a backward-compat shim. Fallback to the original inline logic
      // if buildCheckoutUrl is not defined (future-proof guard).
      if (provider.buildCheckoutUrl) {
        return provider.buildCheckoutUrl({
          mode: tier === 'monthly' ? 'adopt-monthly' : 'adopt-yearly',
          alpaca: opts?.alpaca,
          giftName: opts?.giftName,
          giftEmail: opts?.giftEmail,
          giftDeliver: opts?.giftDeliver,
        })
      }

      // Original inline logic (fallback — should not be reached post-migration).
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

      const base = appendAlpacaQuery(`/api/checkout?tier=${tier}`, opts?.alpaca)
      return appendGiftQuery(base, opts)
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
  // Lazily instantiate the provider so it does not create a logger at module
  // load time. The provider is the canonical home of URL-building logic;
  // this adapter is a thin compat shim for legacy callers.
  const provider = molliePaymentProvider()

  return {
    vendor: 'mollie',
    buildAdoptCheckoutUrl(tier, opts) {
      // Delegate to the PaymentProvider.buildCheckoutUrl implementation so there
      // is ONE source of URL-building logic per vendor (provider), with the
      // adapter as a backward-compat shim. Fallback to the original inline logic
      // if buildCheckoutUrl is not defined (future-proof guard).
      if (provider.buildCheckoutUrl) {
        return provider.buildCheckoutUrl({
          mode: tier === 'monthly' ? 'adopt-monthly' : 'adopt-yearly',
          alpaca: opts?.alpaca,
          giftName: opts?.giftName,
          giftEmail: opts?.giftEmail,
          giftDeliver: opts?.giftDeliver,
        })
      }

      // Original inline logic (fallback — should not be reached post-migration).
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

      const base = appendAlpacaQuery(`/api/mollie-checkout?tier=${tier}`, opts?.alpaca)
      return appendGiftQuery(base, opts)
    },
  }
}

// ── Public factory ────────────────────────────────────────────────────────────

/**
 * Read PAYMENT_VENDOR from env and return the appropriate adapter.
 *
 * Default flipped to `mollie` per ADR 019 — Mollie SEPA Direct Debit costs
 * ~€0.25 per €75/mo charge vs Stripe's ~€1.75, saving ~€18/yr per donor
 * (~€1,800/yr at 100 donors). The Mollie adapter still falls back gracefully
 * to mailto if MOLLIE_API_KEY / MOLLIE_WEBHOOK_SECRET are unset, so the
 * one-liner activation flow is preserved.
 *
 * Owner one-line overrides:
 *   PAYMENT_VENDOR=mollie     → DEFAULT — Mollie checkout (low fees, SEPA)
 *   PAYMENT_VENDOR=stripe     → Stripe Checkout (Strategy D, higher fees)
 *   PAYMENT_VENDOR=fareharbor → FareHarbor passthrough
 *   PAYMENT_VENDOR=mailto     → contact-only fallback (no live payments)
 *
 * PAYMENT_VENDOR=stripe-connect is blocked until tenant #1 signs (see above).
 */
export function getPaymentAdapter(): PaymentAdapter {
  const vendor = (process.env.PAYMENT_VENDOR ?? 'mollie') as PaymentVendor

  switch (vendor) {
    case 'stripe':
      return stripeAdapter()
    case 'stripe-connect':
      return stripeConnectVendorGuardAdapter()
    case 'fareharbor':
      return fareharborAdapter()
    case 'mailto':
      return mailtoAdapter
    case 'mollie':
    default:
      return mollieAdapter()
  }
}
