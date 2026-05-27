import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/secrets'
import {
  getMollieClient,
  getMollieWebhookUrl,
  molliePaymentProvider,
} from '@/lib/integrations/payment-mollie'
import { ADOPT_PRICE_MONTHLY_EUR } from '@/lib/config'
import { sendEmail } from '@/lib/mailer'
import { welcomeAdoptionEmailHtml, welcomeAdoptionSubject } from '@/lib/email-templates'
import { escapeHtml } from '@/lib/html'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'

/**
 * POST /api/mollie-webhook?secret=<MOLLIE_WEBHOOK_SECRET>
 *
 * Mollie webhook receiver. Different security model from Stripe:
 *   - Mollie does NOT sign webhooks (no HMAC header).
 *   - Defence layer 1: URL-path secret matched constant-time (safeEqual).
 *   - Defence layer 2: payment ID re-fetched via authenticated Mollie API —
 *     spoofed IDs for someone else's account 404.
 *
 * On first.paid (mandate created): server creates a Subscription so Mollie
 * starts auto-charging on schedule.
 *
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 *   This webhook handles OWN revenue ONLY (Adopt-a-Paca).
 */

export async function POST(request: Request) {
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return webhookSecretGate
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET!

  const providedSecret = new URL(request.url).searchParams.get('secret')
  if (!safeEqual(providedSecret, webhookSecret)) {
    console.warn('[mollie-webhook] URL secret mismatch — returning 401.')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return apiKeyGate
  const apiKey = process.env.MOLLIE_API_KEY!

  // Body is form-encoded `id=tr_xxx`, NOT JSON.
  const rawBody = await request.text()
  if (!rawBody) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 })
  }

  // Verify by fetching the payment from Mollie API.
  const provider = molliePaymentProvider()
  const result = await provider.verifyWebhook(rawBody, null)
  if (!result.ok || !result.event) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 })
  }

  const event = result.event as { type: string; payment: MolliePaymentLike }
  const payment = event.payment
  console.log(
    `[mollie-webhook] ${event.type} id=${payment.id} status=${payment.status} sequenceType=${payment.sequenceType ?? 'n/a'}`,
  )

  // Construct one Mollie client for any post-verify SDK calls in this request
  // (subscription create, customer fetch). Cached factory means this is cheap.
  const mollie = await getMollieClient(apiKey)
  // mollie === null means SDK not installed — we already verified the payment,
  // so the immediate request succeeds; secondary actions (subscription/customer)
  // will warn-and-skip below.

  try {
    if (payment.status === 'paid') {
      await handlePaidPayment(payment, mollie, webhookSecret)
    } else if (payment.status === 'failed' || payment.status === 'expired' || payment.status === 'canceled') {
      console.warn(`[mollie-webhook] Payment ${payment.id} ended in ${payment.status}; no follow-up action.`)
    } else {
      console.log(`[mollie-webhook] Payment ${payment.id} status=${payment.status}; awaiting terminal state.`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[mollie-webhook] Error processing payment ${payment.id}:`, message)
    // Return 500 so Mollie retries (exponential up to 18hr).
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Domain logic ────────────────────────────────────────────────────────────

/**
 * Minimal subset of the Mollie Payment shape used here. Avoids depending on
 * @mollie/api-client types since the SDK is dynamically imported.
 */
type MolliePaymentLike = {
  id: string
  status: string
  sequenceType?: 'oneoff' | 'first' | 'recurring'
  customerId?: string
  mandateId?: string
  metadata?: {
    product?: string
    tier?: 'monthly' | 'yearly'
    tenantId?: string
  } | null
  amount?: { value: string; currency: string }
  /** Mollie sets this for yearly one-off when billingEmail is passed at create-time. */
  billingEmail?: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MollieClient = any

async function handlePaidPayment(
  payment: MolliePaymentLike,
  mollie: MollieClient | null,
  webhookSecret: string,
): Promise<void> {
  const tier = payment.metadata?.tier
  const isAdopt = payment.metadata?.product === 'adopt-a-paca'

  if (isAdopt && tier === 'monthly' && payment.sequenceType === 'first' && payment.customerId) {
    // Subscription create + customer fetch are independent — fire in parallel.
    // Saves ~200-400ms per first.paid webhook (~50% of the path).
    // createMonthlySubscription throws on failure to trigger Mollie retry;
    // Promise.all propagates that intent.
    const [, { email, name }] = await Promise.all([
      createMonthlySubscription(payment, mollie, webhookSecret),
      fetchCustomer(payment.customerId, mollie),
    ])
    await sendWelcomeIfPossible(payment, tier, email, name)
    return
  }

  if (isAdopt && tier === 'yearly') {
    console.log(`[mollie-webhook] Yearly Adopt-a-Paca payment confirmed id=${payment.id}.`)
    await sendWelcomeIfPossible(payment, tier, payment.billingEmail ?? null, null)
    return
  }

  if (payment.sequenceType === 'recurring') {
    console.log(
      `[mollie-webhook] Monthly subscription renewal confirmed id=${payment.id} customer=${payment.customerId}. No welcome email (renewal, not first payment).`,
    )
    return
  }

  console.log(`[mollie-webhook] Paid payment id=${payment.id} not matched to a known product flow.`)
}

/**
 * Mollie one-off payments expose `billingEmail` directly. Monthly first payments
 * have only a customerId — we must fetch the Customer to get their email/name.
 * Returns null fields if the customer can't be fetched (logged + fail-quiet).
 */
async function fetchCustomer(
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

/**
 * Fail-quiet welcome email send — webhook returns 200 so Mollie doesn't retry-spam donor.
 */
async function sendWelcomeIfPossible(
  payment: MolliePaymentLike,
  tier: 'monthly' | 'yearly',
  email: string | null,
  name: string | null,
): Promise<void> {
  if (!email) {
    console.warn(`[mollie-webhook] No email available for payment ${payment.id} — no welcome email sent.`)
    return
  }
  try {
    await sendEmail({
      to: email,
      subject: welcomeAdoptionSubject(tier),
      html: welcomeAdoptionEmailHtml({
        escapedName: name ? escapeHtml(name) : undefined,
        tier,
        processor: 'Mollie',
        paymentRef: payment.id,
      }),
    })
    console.log(`[mollie-webhook] Welcome email sent to ${email} (tier=${tier})`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[mollie-webhook] Welcome email FAILED for ${email}: ${msg}`)
  }
}

async function createMonthlySubscription(
  payment: MolliePaymentLike,
  mollie: MollieClient | null,
  webhookSecret: string,
): Promise<void> {
  if (!mollie) {
    console.error('[mollie-webhook] @mollie/api-client not installed — cannot create subscription. Run: pnpm add @mollie/api-client')
    return
  }
  if (!payment.customerId) {
    console.error('[mollie-webhook] Cannot create subscription — missing customerId.')
    return
  }
  try {
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
    console.log(
      `[mollie-webhook] Created subscription id=${subscription.id} customer=${payment.customerId} amount=${ADOPT_PRICE_MONTHLY_EUR}/mo`,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[mollie-webhook] Subscription creation failed for customer ${payment.customerId}: ${message}`)
    throw err
  }
}
