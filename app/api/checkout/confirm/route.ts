import { NextResponse } from 'next/server'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isEmbeddedCheckout } from '@/lib/checkout-mode'

/**
 * POST /api/checkout/confirm
 *
 * Defence-in-depth verification for the embedded checkout flow. After
 * stripe.confirmPayment resolves client-side, the EmbeddedCheckout component
 * POSTs the paymentIntentId here so the server can re-fetch the intent from
 * Stripe and confirm status === 'succeeded' before flipping the UI to the
 * thank-you state.
 *
 * The webhook (/api/stripe-webhook) remains the source of truth for
 * downstream effects: welcome email, subscription provisioning, owner
 * notification. This route is a UX safety belt — it prevents showing "success"
 * if Stripe's JS SDK lies (network race, rogue tampering, payment method
 * that requires further action that wasn't completed).
 *
 * Fail-CLOSED behaviour matches /api/checkout/intent:
 *   - CHECKOUT_MODE !== 'embedded' → 404
 *   - STRIPE_SECRET_KEY unset      → 503
 *   - stripe SDK missing           → 503 STRIPE_SDK_MISSING
 *   - 5 req / 1 min IP burst       → 429 (higher than intent because the page
 *                                    may legitimately poll on slow networks)
 *   - Stripe API error             → 502
 *   - Anything else                → { ok: false, status }
 */

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('checkout-confirm', reqId)

  if (!isEmbeddedCheckout()) {
    return attachRequestId(
      NextResponse.json({ error: 'Not found' }, { status: 404 }),
      reqId,
    )
  }

  const ip = getClientIp(request)
  const rl = rateLimit({ key: `checkout-confirm:${ip}`, limit: 5, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    log.warn('IP rate-limit hit', { ip, retryAfterSec: Math.ceil(rl.resetMs / 1000) })
    return attachRequestId(
      NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
      ),
      reqId,
    )
  }

  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)
  const secretKey = process.env.STRIPE_SECRET_KEY!

  let paymentIntentId: string | null = null
  try {
    const body = await request.json()
    if (typeof body?.paymentIntentId === 'string') {
      // Stripe payment intent IDs follow `pi_<alphanum>`. Guard against
      // injection of arbitrary strings before any API call (mirrors the Mollie
      // payment-ID injection guard in lib/integrations/payment-mollie.ts).
      if (/^pi_[A-Za-z0-9_]+$/.test(body.paymentIntentId)) {
        paymentIntentId = body.paymentIntentId
      }
    }
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), reqId)
  }
  if (!paymentIntentId) {
    return attachRequestId(
      NextResponse.json({ error: 'paymentIntentId required' }, { status: 400 }),
      reqId,
    )
  }

  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('stripe SDK not installed.')
    return attachRequestId(
      NextResponse.json(
        { error: 'Payment SDK not installed', code: 'STRIPE_SDK_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }
  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const ok = intent.status === 'succeeded'
    log.info('PaymentIntent verified', { id: intent.id, status: intent.status, ok })
    return attachRequestId(
      NextResponse.json({ ok, status: intent.status }),
      reqId,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Stripe PaymentIntent retrieval failed', { message })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to verify PaymentIntent', detail: message },
        { status: 502 },
      ),
      reqId,
    )
  }
}
