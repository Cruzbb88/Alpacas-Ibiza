/**
 * stripe-connect PaymentProvider adapter.
 *
 * DEFER UNTIL TENANT #1 SIGNS — see ps-003-2026-05-27-payment-rails.md Strategy E.
 *
 * SECURITY HARD RULE:
 *   Collecting tenant customer money through single-account stripeDirectPaymentProvider
 *   = unlicensed money transmission. This adapter is the correct path for tenant revenue.
 *   It must NOT be activated until Stripe Connect Express onboarding is implemented
 *   and the first paying tenant has signed a platform agreement.
 *
 * This adapter THROWS on createCheckoutSession to prevent accidental activation.
 * The throw is intentional and load-bearing — do NOT remove it.
 *
 * If PAYMENT_VENDOR=stripe-connect is set today, getProviders() will detect it
 * and log a loud warning, then fall back to manual-mailto.
 */

import type { PaymentProvider, CheckoutResult, WebhookResult, CreateCheckoutOpts } from './payment'

export function stripeConnectPaymentProvider(): PaymentProvider {
  return {
    kind: 'stripe-connect',

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async createCheckoutSession(_opts: CreateCheckoutOpts): Promise<CheckoutResult> {
      throw new Error(
        '[stripe-connect] DEFER UNTIL TENANT #1 SIGNS. ' +
        'Stripe Connect Express onboarding not implemented. ' +
        'See ps-003-2026-05-27-payment-rails.md Strategy E. ' +
        'Use stripeDirectPaymentProvider() for own-revenue flows (Adopt-a-Paca).'
      )
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async verifyWebhook(_rawBody: string, _signature: string | null): Promise<WebhookResult> {
      // Fail-CLOSED: Connect webhooks are not implemented.
      return { ok: false }
    },
  }
}
