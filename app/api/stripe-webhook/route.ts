import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { handleStripeCheckoutCompleted } from '@/lib/payment-handlers'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'

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
  // Fail-CLOSED on both env vars. Mirrors fareharbor-webhook pattern.
  const webhookSecretGate = requireEnvOrReturn503('STRIPE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return webhookSecretGate
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return secretGate
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
  const secretKey = process.env.STRIPE_SECRET_KEY!

  // Stripe REQUIRES the exact raw bytes for signature verification — do NOT call .json() first.
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    console.error('[stripe-webhook] stripe SDK not installed. Run: pnpm add stripe (owner-controlled deploy step).')
    return NextResponse.json(
      { error: 'Payment SDK not installed', code: 'STRIPE_SDK_MISSING' },
      { status: 503 }
    )
  }
  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // ── 4. Verify signature ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[stripe-webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ── 5. Log all events (no DB yet) ────────────────────────────────────────
  console.log(`[stripe-webhook] Received event: ${event.type} id=${event.id}`)

  // ── 6. Event dispatch ─────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        console.log('[stripe-webhook] checkout.session.completed', {
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
        const handlerResult = await handleStripeCheckoutCompleted(session, { sendEmail })
        if (handlerResult.reason !== 'ok') {
          const level = handlerResult.reason === 'missing-email' || handlerResult.reason === 'invalid-tier' ? 'warn' : 'error'
          const msg = `[stripe-webhook] checkout.session.completed handler result: ${handlerResult.reason}`
          if (level === 'warn') console.warn(msg, handlerResult.meta)
          else console.error(msg, handlerResult.meta)
        } else {
          console.log(
            `[stripe-webhook] welcome sent + codes scheduled at ${handlerResult.codesScheduledAt}`,
            handlerResult.meta,
          )
        }
        // TODO: persist adoption record to DB when DB is wired (assign alpaca, etc.)
        break
      }

      case 'invoice.paid': {
        // Monthly subscription renewal
        const invoice = event.data.object
        console.log('[stripe-webhook] invoice.paid (subscription renewal)', {
          id:           invoice.id,
          subscription: invoice.subscription,
          customer:     invoice.customer,
          amountPaid:   invoice.amount_paid,
          currency:     invoice.currency,
        })
        // TODO: update subscription status in DB on renewal.
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        console.warn('[stripe-webhook] invoice.payment_failed', {
          id:           invoice.id,
          subscription: invoice.subscription,
          customer:     invoice.customer,
        })
        // TODO: mark subscription as past_due in DB; optionally notify owner.
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        console.log('[stripe-webhook] customer.subscription.deleted (cancellation)', {
          id:       subscription.id,
          customer: subscription.customer,
          reason:   subscription.cancellation_details?.reason,
        })
        // TODO: mark adoption as cancelled in DB; optionally notify owner.
        break
      }

      default:
        // Log unhandled events; do not error — Stripe will retry on non-2xx.
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[stripe-webhook] Error processing ${event.type}:`, message)
    // Return 500 so Stripe retries — do not silently swallow processing errors.
    return NextResponse.json({ error: 'Event processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

