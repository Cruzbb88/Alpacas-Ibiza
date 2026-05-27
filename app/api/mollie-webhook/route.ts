import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/secrets'
import {
  getMollieClient,
  getMollieWebhookUrl,
  molliePaymentProvider,
} from '@/lib/integrations/payment-mollie'
import { ADOPT_PRICE_MONTHLY_EUR } from '@/lib/config'
import { sendEmail } from '@/lib/mailer'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import {
  handleMolliePaymentPaid,
  type MolliePaymentLike,
} from '@/lib/payment-handlers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * POST /api/mollie-webhook?secret=<MOLLIE_WEBHOOK_SECRET>
 *
 * Mollie webhook receiver. Different security model from Stripe:
 *   - Mollie does NOT sign webhooks (no HMAC header).
 *   - Defence layer 1: URL-path secret matched constant-time (safeEqual).
 *   - Defence layer 2: payment ID re-fetched via authenticated Mollie API.
 *
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 *   This webhook handles OWN revenue ONLY (Adopt-a-Paca).
 *
 * Dispatch logic lives in lib/payment-handlers.ts (handleMolliePaymentPaid)
 * per ADR 016. Route is a thin shell: verify → call handler → log.
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-webhook', reqId)

  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET!

  const providedSecret = new URL(request.url).searchParams.get('secret')
  if (!safeEqual(providedSecret, webhookSecret)) {
    log.warn('URL secret mismatch — returning 401.')
    return attachRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), reqId)
  }

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!

  // Body is form-encoded `id=tr_xxx`, NOT JSON.
  const rawBody = await request.text()
  if (!rawBody) {
    return attachRequestId(NextResponse.json({ error: 'Empty body' }, { status: 400 }), reqId)
  }

  // Verify by fetching the payment from Mollie API.
  const provider = molliePaymentProvider()
  const verified = await provider.verifyWebhook(rawBody, null)
  if (!verified.ok || !verified.event) {
    return attachRequestId(NextResponse.json({ error: 'Invalid webhook' }, { status: 401 }), reqId)
  }

  const event = verified.event as { type: string; payment: MolliePaymentLike }
  const payment = event.payment
  log.info(
    `${event.type} id=${payment.id} status=${payment.status} sequenceType=${payment.sequenceType ?? 'n/a'}`,
  )

  // Construct one Mollie client for any post-verify SDK calls. Cached factory.
  const mollie = await getMollieClient(apiKey)

  // Only paid events have a domain handler. Other terminal/transient states
  // log-and-return (Mollie will fire again on terminal transition).
  if (payment.status !== 'paid') {
    if (payment.status === 'failed' || payment.status === 'expired' || payment.status === 'canceled') {
      log.warn(`Payment ${payment.id} ended in ${payment.status}; no follow-up action.`)
    } else {
      log.info(`Payment ${payment.id} status=${payment.status}; awaiting terminal state.`)
    }
    return attachRequestId(NextResponse.json({ received: true }), reqId)
  }

  try {
    const result = await handleMolliePaymentPaid(payment, {
      sendEmail,
      fetchCustomer: (customerId) => fetchMollieCustomer(customerId, mollie),
      createSubscription: (p) => createMonthlySubscription(p, mollie, webhookSecret),
    })

    const level = result.reason === 'ok' ? 'log' : result.reason === 'missing-email' || result.reason === 'unmatched' ? 'warn' : 'error'
    const msg = `flow=${result.flow} reason=${result.reason}`
    if (level === 'warn') log.warn(msg, result.meta)
    else if (level === 'error') log.error(msg, result.meta)
    else log.info(msg, result.meta)
  } catch (err) {
    // handleMolliePaymentPaid only throws when createSubscription throws.
    // Returning 500 triggers Mollie retry (exponential up to 18h) — desired
    // because without the subscription, donor won't auto-charge next month.
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Subscription creation failed for payment ${payment.id}`, { message })
    return attachRequestId(NextResponse.json({ error: 'Processing failed' }, { status: 500 }), reqId)
  }

  return attachRequestId(NextResponse.json({ received: true }), reqId)
}

// ── Mollie SDK adapters (route-local; depend on the live `mollie` client) ────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MollieClient = any

async function fetchMollieCustomer(
  customerId: string,
  mollie: MollieClient | null,
): Promise<{ email: string | null; name: string | null }> {
  if (!mollie) return { email: null, name: null }
  try {
    const customer = await mollie.customers.get(customerId)
    return {
      email: typeof customer?.email === 'string' ? customer.email : null,
      name: typeof customer?.name === 'string' ? customer.name : null,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[mollie-webhook] Customer fetch failed for ${customerId}: ${msg}`)
    return { email: null, name: null }
  }
}

async function createMonthlySubscription(
  payment: MolliePaymentLike,
  mollie: MollieClient | null,
  webhookSecret: string,
): Promise<void> {
  if (!mollie) {
    console.error('[mollie-webhook] @mollie/api-client not installed — cannot create subscription. Run: pnpm add @mollie/api-client')
    return // Don't throw — SDK absence is a deploy issue, retrying won't help.
  }
  if (!payment.customerId) {
    console.error('[mollie-webhook] Cannot create subscription — missing customerId.')
    return
  }
  const subscription = await mollie.customers_subscriptions.create({
    customerId: payment.customerId,
    amount: { value: ADOPT_PRICE_MONTHLY_EUR.toFixed(2), currency: 'EUR' },
    interval: '1 month',
    description: 'Adopt-a-Paca — monthly subscription',
    webhookUrl: getMollieWebhookUrl(webhookSecret),
    metadata: {
      product: 'adopt-a-paca',
      tier: 'monthly',
      tenantId: payment.metadata?.tenantId ?? 'alpacasibiza',
      seedPaymentId: payment.id,
    },
  })
  // Note: these helpers lack reqId context — they're route-local SDK adapters.
  // The outer POST handler already logs with reqId before calling these.
  console.log(
    `[mollie-webhook] Created subscription id=${subscription.id} customer=${payment.customerId} amount=${ADOPT_PRICE_MONTHLY_EUR}/mo`,
  )
  // Throws on Mollie API failure → route returns 500 → Mollie retries.
}
