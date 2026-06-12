/**
 * manual-mailto PaymentProvider adapter.
 *
 * The framework's default payment adapter. No env vars required.
 * Always returns `{ unconfigured: true, fallbackUrl: 'mailto:...' }` from
 * createCheckoutSession — the caller renders a mailto: CTA instead of a checkout button.
 *
 * Failsafe: verifyWebhook always returns { ok: false } — this adapter has no
 * payment processor so webhook verification is meaningless and should be rejected.
 */

import type { PaymentProvider, CheckoutResult, WebhookResult, CreateCheckoutOpts, BuildCheckoutUrlOpts } from './payment'

const DEFAULT_MAILTO = 'mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry'

export function manualMailtoPaymentProvider(opts?: {
  /** Override the fallback mailto: link. Defaults to info@alpacasibiza.com. */
  mailtoUrl?: string
}): PaymentProvider {
  const fallbackUrl = opts?.mailtoUrl ?? DEFAULT_MAILTO

  return {
    kind: 'manual-mailto',

    async createCheckoutSession(_opts: CreateCheckoutOpts): Promise<CheckoutResult> {
      return { unconfigured: true, fallbackUrl }
    },

    buildCheckoutUrl(_opts: BuildCheckoutUrlOpts): string | null {
      // No payment processor — no checkout URL to build; caller falls back to mailto:.
      return null
    },

    async verifyWebhook(_rawBody: string, _signature: string | null): Promise<WebhookResult> {
      // No payment processor — fail-closed (no legitimate webhooks to accept).
      return { ok: false }
    },
  }
}
