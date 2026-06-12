/**
 * fareharbor-passthrough PaymentProvider adapter.
 *
 * Delegates checkout to the tenant's FareHarbor booking URL.
 * No payment processor involved — FareHarbor handles its own payment.
 * Useful for tenants using FareHarbor for Adopt-a-Paca gift items.
 *
 * OWNER_INPUT_NEEDED: set FAREHARBOR_ITEM_ADOPT_MONTHLY and
 * FAREHARBOR_ITEM_ADOPT_YEARLY in .env.local to activate per-tier URLs.
 * Without those item IDs, falls back to the base FareHarbor calendar URL.
 *
 * Failsafe: verifyWebhook always returns { ok: false } — FareHarbor uses its
 * own webhook route (app/api/fareharbor-webhook) for event processing.
 */

import type { PaymentProvider, CheckoutResult, WebhookResult, CreateCheckoutOpts, BuildCheckoutUrlOpts } from './payment'
import type { BookingProvider } from './_types'

export function fareHarborPassthroughPaymentProvider(
  booking: BookingProvider,
): PaymentProvider {
  return {
    kind: 'fareharbor-passthrough',

    async createCheckoutSession(opts: CreateCheckoutOpts): Promise<CheckoutResult> {
      // productId is used as the FareHarbor item ID when provided.
      const url = opts.productId
        ? booking.itemUrl(opts.productId)
        : booking.embedUrl()

      return { url }
    },

    buildCheckoutUrl(_opts: BuildCheckoutUrlOpts): string | null {
      // FareHarbor checkout requires a session via createCheckoutSession (booking URL
      // comes from the BookingProvider, not a static path). Return null so callers
      // fall back to mailto: or use createCheckoutSession instead.
      return null
    },

    async verifyWebhook(_rawBody: string, _signature: string | null): Promise<WebhookResult> {
      // FareHarbor webhooks are handled by app/api/fareharbor-webhook — not here.
      return { ok: false }
    },
  }
}
