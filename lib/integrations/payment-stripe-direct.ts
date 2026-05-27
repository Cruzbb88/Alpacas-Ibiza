/**
 * stripe-direct PaymentProvider adapter.
 *
 * Single-account Stripe Checkout (Strategy D per ps-003-2026-05-27-payment-rails.md).
 * Handles OWN revenue only (e.g. Adopt-a-Paca). NEVER for tenant customer money.
 *
 * SECURITY HARD RULE per ps-003:
 *   This adapter = single Stripe account = owner is Merchant of Record.
 *   Routing tenant customer money through here = unlicensed money transmission.
 *   Use stripe-connect adapter for tenant revenue (DEFER UNTIL TENANT #1 SIGNS).
 *
 * Failsafe — createCheckoutSession:
 *   Returns { unconfigured: true, fallbackUrl } if STRIPE_SECRET_KEY or productId unset.
 *   Never throws on missing config.
 *
 * Failsafe — verifyWebhook:
 *   Returns { ok: false } if STRIPE_WEBHOOK_SECRET unset (fail-CLOSED).
 *   Mirrors app/api/stripe-webhook fail-closed pattern (CLAUDE.md failsafe map row 35).
 *
 * Dynamic import guard: `stripe` SDK imported at runtime so the build succeeds
 * even when the package is not yet installed (owner-controlled deploy step).
 */

import type { PaymentProvider, CheckoutResult, WebhookResult, CreateCheckoutOpts } from './payment'
import { importStripe } from './stripe-sdk.ts'
import { ADOPT_FALLBACK_MAILTO } from '../payment-vendor.ts'

const FALLBACK_MAILTO = ADOPT_FALLBACK_MAILTO

export function stripeDirectPaymentProvider(opts?: {
  /** Override mailto fallback URL. */
  fallbackUrl?: string
}): PaymentProvider {
  const fallbackUrl = opts?.fallbackUrl ?? FALLBACK_MAILTO

  return {
    kind: 'stripe-direct',

    async createCheckoutSession(checkoutOpts: CreateCheckoutOpts): Promise<CheckoutResult> {
      const secretKey = process.env.STRIPE_SECRET_KEY
      if (!secretKey) {
        console.warn(
          '[stripe-direct] STRIPE_SECRET_KEY unset — falling back to mailto.'
        )
        return { unconfigured: true, fallbackUrl }
      }

      if (!checkoutOpts.productId) {
        console.warn(
          '[stripe-direct] productId (Stripe Price ID) not provided — falling back to mailto.'
        )
        return { unconfigured: true, fallbackUrl }
      }

      const stripeFactory = await importStripe()
      if (!stripeFactory) {
        console.error('[stripe-direct] stripe SDK not installed. Run: pnpm add stripe')
        return { unconfigured: true, fallbackUrl }
      }
      const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

      // Determine mode from Price ID prefix heuristic or use payment as default.
      // Subscription prices are created with mode: 'subscription'; one-time with 'payment'.
      // The caller should pass the correct price ID per tier; we trust Stripe to
      // reject a mismatch. For safety, default to 'payment' (one-time).
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: checkoutOpts.productId, quantity: 1 }],
        success_url: checkoutOpts.returnUrl,
        cancel_url: checkoutOpts.returnUrl,
        billing_address_collection: 'auto',
        automatic_tax: { enabled: false }, // OWNER_INPUT_NEEDED: enable once Stripe Tax activated
        ...(checkoutOpts.customerEmail
          ? { customer_email: checkoutOpts.customerEmail }
          : {}),
        metadata: {
          tenantId: checkoutOpts.tenantId,
        },
      })

      if (!session.url) {
        throw new Error('[stripe-direct] Stripe returned a session with no URL')
      }

      return { url: session.url }
    },

    async verifyWebhook(rawBody: string, signature: string | null): Promise<WebhookResult> {
      // Fail-CLOSED: if secret unset, reject all webhooks.
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!webhookSecret) {
        console.error(
          '[stripe-direct] STRIPE_WEBHOOK_SECRET unset — returning ok:false (fail-closed).'
        )
        return { ok: false }
      }

      if (!signature) {
        return { ok: false }
      }

      const secretKey = process.env.STRIPE_SECRET_KEY
      if (!secretKey) {
        return { ok: false }
      }

      const stripeFactory = await importStripe()
      if (!stripeFactory) return { ok: false }
      const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

      try {
        const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
        return { ok: true, event }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn('[stripe-direct] Webhook signature verification failed:', message)
        return { ok: false }
      }
    },
  }
}
