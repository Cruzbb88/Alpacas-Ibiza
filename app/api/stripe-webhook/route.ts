import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { sendEmail } from '@/lib/mailer'
import {
  handleStripeCheckoutCompleted,
  handleStripeInvoicePaymentFailed,
  handleStripeSubscriptionDeleted,
} from '@/lib/payment-handlers'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { isAlreadyProcessed, markProcessed } from '@/lib/webhook-idempotency'

/**
 * POST /api/stripe-webhook
 *
 * Verifies Stripe webhook signature and processes Stripe events.
 *
 * Fail-CLOSED: if STRIPE_WEBHOOK_SECRET is unset → 503.
 * Mirror of app/api/fareharbor-webhook/route.ts:66-72 fail-closed pattern.
 *
 * Stripe signature verification requires the RAW request body (not parsed JSON).
 * Next.js App Router gives us request.text() for that.
 *
 * Dynamic import guard: `stripe` SDK imported at runtime so the build
 * succeeds even if the package is not yet installed.
 *
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 *   This webhook handles OWN revenue ONLY (Adopt-a-Paca).
 *   NEVER process tenant customer events here — use Connect webhooks for that.
 */

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('stripe-webhook', reqId)

  // Fail-CLOSED on both env vars. Mirrors fareharbor-webhook pattern.
  const webhookSecretGate = requireEnvOrReturn503('STRIPE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  const secretKey = process.env.STRIPE_SECRET_KEY!

  // Stripe REQUIRES the exact raw bytes for signature verification — do NOT call .json() first.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return attachRequestId(NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 }), reqId)
  }

  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('stripe SDK not installed. Run: pnpm add stripe (owner-controlled deploy step).')
    return attachRequestId(
      NextResponse.json(
        { error: 'Payment SDK not installed', code: 'STRIPE_SDK_MISSING' },
        { status: 503 }
      ),
      reqId
    )
  }
  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // ── 4. Verify signature ───────────────────────────────────────────────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('Signature verification failed', { message })
    return attachRequestId(NextResponse.json({ error: 'Invalid signature' }, { status: 401 }), reqId)
  }

  // ── 5. Idempotency guard — Stripe retries for up to 3 days ──────────────
  if (isAlreadyProcessed(event.id)) {
    log.info('event already processed — skipping', { eventId: event.id })
    return attachRequestId(
      NextResponse.json({ ok: true, idempotent: true }, { status: 200 }),
      reqId,
    )
  }

  // ── 6. Log all events (no DB yet) ────────────────────────────────────────
  log.info(`Received event: ${event.type} id=${event.id}`)

  // ── 7. Event dispatch ─────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        log.info('checkout.session.completed', {
          id:           session.id,
          tier:         session.metadata?.tier,
          customer:     session.customer,
          subscription: session.subscription,
          email:        session.customer_details?.email,
          amountTotal:  session.amount_total,
          currency:     session.currency,
        })
        // Pure handler covers welcome + discount-codes emails (fail-quiet both).
        // Never throws — webhook always returns 200 to prevent Stripe retry-spam.
        // Unit-tested in lib/payment-handlers.test.ts.
        // The Stripe SDK's Session type is a strict superset of our minimal
        // StripeCheckoutSessionLike. Cast through unknown to make that
        // subset boundary explicit (and let tsc still catch any handler
        // access to fields the like-shape doesn't declare).
        const handlerResult = await handleStripeCheckoutCompleted(
          session as unknown as Parameters<typeof handleStripeCheckoutCompleted>[0],
          { sendEmail, ownerEmail: process.env.CONTACT_EMAIL },
        )
        if (handlerResult.reason !== 'ok') {
          const level = handlerResult.reason === 'missing-email' || handlerResult.reason === 'invalid-tier' ? 'warn' : 'error'
          const msg = `checkout.session.completed handler result: ${handlerResult.reason}`
          if (level === 'warn') log.warn(msg, handlerResult.meta)
          else log.error(msg, handlerResult.meta)
        } else {
          log.info(
            `welcome sent + codes scheduled at ${handlerResult.codesScheduledAt}; owner notified=${handlerResult.ownerNotified}`,
            handlerResult.meta,
          )
        }
        // TODO: persist adoption record to DB when DB is wired (assign alpaca, etc.)
        break
      }

      case 'invoice.paid': {
        // Monthly subscription renewal
        const invoice = event.data.object
        // Stripe deprecated invoice.subscription in newer API versions; read via
        // a loose record cast to keep the log line working across versions.
        const invoiceLoose = invoice as unknown as Record<string, unknown>
        log.info('invoice.paid (subscription renewal)', {
          id:           invoice.id,
          subscription: invoiceLoose.subscription,
          customer:     invoice.customer,
          amountPaid:   invoice.amount_paid,
          currency:     invoice.currency,
        })
        // TODO: update subscription status in DB on renewal.
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        // Pure handler — donor email ("update your card") + owner notification.
        // Both fail-quiet; webhook returns 200 (Stripe Smart Retries handles retry).
        const failedResult = await handleStripeInvoicePaymentFailed(
          invoice as unknown as Parameters<typeof handleStripeInvoicePaymentFailed>[0],
          { sendEmail, ownerEmail: process.env.CONTACT_EMAIL },
        )
        const level = failedResult.reason === 'ok' ? 'warn' : 'error'
        const msg = `invoice.payment_failed handler reason=${failedResult.reason}`
        if (level === 'warn') log.warn(msg, failedResult.meta)
        else log.error(msg, failedResult.meta)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        // Pure handler — notifies owner so they can follow up if cancellation
        // reason is recoverable (payment_failed, cancellation_requested).
        // Fail-quiet on send error.
        const cancelResult = await handleStripeSubscriptionDeleted(
          subscription as unknown as Parameters<typeof handleStripeSubscriptionDeleted>[0],
          { sendEmail, ownerEmail: process.env.CONTACT_EMAIL },
        )
        const msg = `customer.subscription.deleted handler reason=${cancelResult.reason}`
        if (cancelResult.reason === 'ok' || cancelResult.reason === 'not-adoption') {
          log.info(msg, cancelResult.meta)
        } else {
          log.warn(msg, cancelResult.meta)
        }
        break
      }

      default:
        // Log unhandled events; do not error — Stripe will retry on non-2xx.
        log.info(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Error processing ${event.type}`, { message })
    // Return 500 so Stripe retries — do not silently swallow processing errors.
    // CRITICAL: do NOT markProcessed — the 500 lets Stripe retry, which only
    // helps if the event isn't blocked by an idempotency hit on next attempt.
    return attachRequestId(NextResponse.json({ error: 'Event processing failed' }, { status: 500 }), reqId)
  }

  // All handlers completed without throwing — mark processed AFTER success.
  markProcessed(event.id)
  return attachRequestId(NextResponse.json({ received: true }), reqId)
}

