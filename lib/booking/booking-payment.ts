/**
 * Vendor-NEUTRAL booking checkout creation (spec-011 §C/§D). Creates a one-off
 * payment for a held booking via whichever processor `PAYMENT_VENDOR` selects —
 * the same swap-by-env contract the Adopt flow already uses (ADR-019: Mollie is
 * the default; Stripe is the opt-in). So the owner can settle on Stripe OR Mollie
 * and the booking flow follows, no code change.
 *
 * One-off, NOT a subscription: a tour is paid once. Both branches carry
 * `metadata.booking_id` so the matching webhook (stripe / mollie) settles the
 * held seat. Fail-closed: returns a typed error (never a fabricated URL) when the
 * chosen vendor is unconfigured.
 */
import type { Booking } from '@/lib/db/schema'
import { SITE_BASE_URL } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { getMollieClient, getMollieWebhookUrl } from '@/lib/integrations/payment-mollie'
import { raceWithTimeout } from '@/lib/fetch'
import { makeRequestLogger } from '@/lib/request-id'

const log = makeRequestLogger('booking-payment', 'create')

export type BookingCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: string; status: number }

function bookingUrls(locale: string, bookingId: string) {
  return {
    success: `${SITE_BASE_URL}/${locale}/tours/thank-you?booking=${encodeURIComponent(bookingId)}`,
    cancel: `${SITE_BASE_URL}/${locale}/tours?cancelled=1`,
  }
}

function partyLabel(n: number): string {
  return `${n} guest${n === 1 ? '' : 's'}`
}

/** Create a checkout for a held booking via the configured PAYMENT_VENDOR. */
export async function createBookingCheckout(args: {
  booking: Booking
  locale: string
}): Promise<BookingCheckoutResult> {
  const vendor = (process.env.PAYMENT_VENDOR ?? 'mollie').toLowerCase() // ADR-019 default
  if (vendor === 'mollie') return createMollieBookingCheckout(args)
  if (vendor === 'stripe') return createStripeBookingCheckout(args)
  // mailto / fareharbor / stripe-connect can't take an in-house one-off charge.
  return { ok: false, code: 'UNSUPPORTED_VENDOR', status: 503 }
}

/**
 * Refund a booking payment, routing by the paymentRef prefix (vendor-neutral):
 *   pi_… → Stripe PaymentIntent refund · tr_… → Mollie full refund.
 * Idempotent at the vendor (Stripe idempotencyKey; Mollie is status-deduped).
 * Returns true on success; false (with a logged error) on any failure so the
 * caller can owner-alert rather than throw. Used by self-service cancellation.
 */
export async function refundBookingPayment(paymentRef: string): Promise<boolean> {
  if (paymentRef.startsWith('pi_')) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) return false
    const factory = await importStripe()
    if (!factory) return false
    const stripe = factory(secretKey, { apiVersion: '2024-06-20', timeout: 10_000 })
    try {
      await stripe.refunds.create(
        { payment_intent: paymentRef },
        { idempotencyKey: `booking-refund-${paymentRef}` },
      )
      return true
    } catch (e) {
      log.error('[booking] Stripe refund failed', { paymentRef, error: e instanceof Error ? e.message : String(e) })
      return false
    }
  }
  if (paymentRef.startsWith('tr_')) {
    const apiKey = process.env.MOLLIE_API_KEY
    if (!apiKey) return false
    const mollie = await getMollieClient(apiKey)
    if (!mollie) return false
    try {
      // 10s timeout (parity with the Mollie checkout path) — the client has no
      // built-in one, so a hung refund can't pin the cancel route. (gd-031)
      const done = await raceWithTimeout(
        (mollie as unknown as {
          payments: { refunds: { create: (a: unknown) => Promise<unknown> } }
        }).payments.refunds.create({ paymentId: paymentRef }),
        10_000,
      )
      if (!done) {
        log.error('[booking] Mollie refund timed out', { paymentRef })
        return false
      }
      return true
    } catch (e) {
      log.error('[booking] Mollie refund failed', { paymentRef, error: e instanceof Error ? e.message : String(e) })
      return false
    }
  }
  log.error('[booking] refund: unrecognized paymentRef prefix', { paymentRef })
  return false
}

// ── Mollie (default) ──────────────────────────────────────────────────────────

async function createMollieBookingCheckout({
  booking, locale,
}: { booking: Booking; locale: string }): Promise<BookingCheckoutResult> {
  const apiKey = process.env.MOLLIE_API_KEY
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET
  if (!apiKey || !webhookSecret) return { ok: false, code: 'MOLLIE_UNCONFIGURED', status: 503 }
  const mollie = await getMollieClient(apiKey)
  if (!mollie) return { ok: false, code: 'MOLLIE_SDK_MISSING', status: 503 }

  const { success } = bookingUrls(locale, booking.id)
  try {
    // payments.create has unusable overload typings (Promise<Payment> | void) —
    // cast through unknown to lock the Promise overload, same as payment-mollie.ts.
    // 10s timeout — parity with the Stripe SDK timeout; Mollie's client has no
    // built-in one, so race it so a hung API can't pin the serverless function.
    const payment = (await raceWithTimeout(
      mollie.payments.create({
        amount: { value: (booking.amountEurMinor / 100).toFixed(2), currency: 'EUR' },
        description: `Alpaca farm tour — ${partyLabel(booking.partySize)}`,
        redirectUrl: success,
        webhookUrl: getMollieWebhookUrl(webhookSecret),
        metadata: { booking_id: booking.id, locale, product_type: 'tour-booking' },
      } as unknown as Parameters<typeof mollie.payments.create>[0]) as unknown as Promise<{
        id: string
        getCheckoutUrl?: () => string | undefined
        _links?: { checkout?: { href?: string } }
      }>,
      10_000,
    ))
    if (!payment) {
      log.error('[booking] Mollie payment create timed out')
      return { ok: false, code: 'MOLLIE_TIMEOUT', status: 504 }
    }
    const url =
      typeof payment.getCheckoutUrl === 'function'
        ? payment.getCheckoutUrl()
        : payment._links?.checkout?.href
    if (!url) {
      log.error('[booking] Mollie payment created but no checkout URL', { id: payment.id })
      return { ok: false, code: 'MOLLIE_NO_URL', status: 502 }
    }
    return { ok: true, url }
  } catch (e) {
    log.error('[booking] Mollie payment create failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    return { ok: false, code: 'MOLLIE_ERROR', status: 502 }
  }
}

// ── Stripe (opt-in) ───────────────────────────────────────────────────────────

async function createStripeBookingCheckout({
  booking, locale,
}: { booking: Booking; locale: string }): Promise<BookingCheckoutResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return { ok: false, code: 'STRIPE_UNCONFIGURED', status: 503 }
  const factory = await importStripe()
  if (!factory) return { ok: false, code: 'STRIPE_SDK_MISSING', status: 503 }
  const stripe = factory(secretKey, {
    apiVersion: '2024-06-20',
    timeout: 10_000,
    maxNetworkRetries: 1,
  })

  const { success, cancel } = bookingUrls(locale, booking.id)
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'eur',
              unit_amount: booking.amountEurMinor, // EUR-minor, party-size inclusive
              product_data: {
                name: 'Alpaca farm tour booking',
                description: partyLabel(booking.partySize),
              },
            },
          },
        ],
        metadata: { booking_id: booking.id, product_type: 'tour-booking', locale },
        customer_email: booking.guestEmail ?? undefined,
        success_url: success,
        cancel_url: cancel,
        billing_address_collection: 'auto',
        automatic_tax: { enabled: false },
      },
      { idempotencyKey: `booking-checkout-${booking.id}` },
    )
    if (!session.url) {
      log.error('[booking] Stripe session created but no URL', { id: session.id })
      return { ok: false, code: 'STRIPE_NO_URL', status: 502 }
    }
    return { ok: true, url: session.url }
  } catch (e) {
    log.error('[booking] Stripe session create failed', {
      error: e instanceof Error ? e.message : String(e),
    })
    return { ok: false, code: 'STRIPE_ERROR', status: 502 }
  }
}
