/**
 * Thin adapter that converts a payment event into a recordSale() call.
 *
 * This module owns the contract for wiring VAT recording into the webhook
 * routes (app/api/mollie-webhook/route.ts, app/api/stripe-webhook/route.ts).
 * The webhook routes will call recordVatFromPayment() once a payment is
 * confirmed paid — they import and call this; they do NOT call vat-tracker
 * directly, so the amount-parsing and country-lookup logic lives in one place.
 *
 * Wire-up example (mollie-webhook):
 *   import { recordVatFromPayment } from '@/lib/vat-recorder'
 *   // inside handleMolliePaymentPaid:
 *   recordVatFromPayment({
 *     amountEur: payment.amount.value,   // "75.00"
 *     customerCountry: payment.billingAddress?.country,
 *     attemptId: payment.id,
 *     yearEpoch: payment.paidAt ? new Date(payment.paidAt).getTime() : undefined,
 *   })
 *
 * Wire-up example (stripe-webhook):
 *   import { recordVatFromPayment } from '@/lib/vat-recorder'
 *   // inside handleStripeCheckoutCompleted:
 *   recordVatFromPayment({
 *     amountEur: (session.amount_total ?? 0) / 100,
 *     customerCountry: session.customer_details?.address?.country ?? undefined,
 *     attemptId: session.id,
 *     yearEpoch: Date.now(),
 *   })
 *
 * Design decisions:
 *   - Fail-quiet: never throws. VAT tracking is observational; a bug here
 *     must NEVER break the payment webhook response (which would cause Mollie
 *     to retry and double-charge).
 *   - Unknown country: falls back to 'XX' (not an EU member state) so the
 *     sale is recorded but never counted toward the OSS cross-border total.
 *     The admin dashboard flags these rows for manual review.
 *   - Amount parsing: Mollie sends "75.00" (string, EUR major); Stripe sends
 *     integer cents; callers normalise to string-or-number EUR major before
 *     calling here, and this module converts to minor (× 100, Math.round).
 */

import { recordSale } from './vat-tracker.ts'

export interface VatPaymentInput {
  /** Sale amount in EUR major — e.g. "75.00" or 75 (both accepted). */
  amountEur: string | number
  /**
   * ISO 3166-1 alpha-2 country code of the buyer. Undefined / empty string
   * when not available from the payment processor (common for SEPA mandates
   * where the billing address is not collected). Falls back to 'XX'.
   */
  customerCountry?: string
  /**
   * Stable dedup key for this payment event. Use the payment processor's
   * payment ID (Mollie `tr_xxx`, Stripe `pi_xxx` or `cs_xxx`).
   */
  attemptId: string
  /**
   * UNIX epoch ms of the payment date. When undefined the current time is
   * used, attributing the sale to the current calendar year.
   */
  yearEpoch?: number
}

/**
 * Record a confirmed payment for EU VAT OSS threshold tracking.
 *
 * Safe to call from webhook handlers — never throws, never blocks.
 */
export function recordVatFromPayment(input: VatPaymentInput): void {
  try {
    const amountMajor =
      typeof input.amountEur === 'string'
        ? Number.parseFloat(input.amountEur)
        : input.amountEur

    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
      console.warn('[vat-recorder] skipping sale: invalid amountEur', {
        amountEur: input.amountEur,
        attemptId: input.attemptId,
      })
      return
    }

    const amountMinor = Math.round(amountMajor * 100)
    const countryISO2 =
      typeof input.customerCountry === 'string' && input.customerCountry.length === 2
        ? input.customerCountry.toUpperCase()
        : 'XX'

    recordSale(input.yearEpoch, countryISO2, amountMinor, input.attemptId)
  } catch (err) {
    // Last-resort guard: swallow all errors so the webhook 200 is never
    // compromised by a bug in VAT tracking code.
    console.error('[vat-recorder] unexpected error — sale not recorded', err)
  }
}
