import { NextResponse } from 'next/server'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'
import { parseGiftFields, type ParsedGiftFields } from '@/lib/gift-fields'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { ADOPT_PRICE_MONTHLY_EUR, ADOPT_PRICE_YEARLY_EUR } from '@/lib/config'
import { isEmbeddedCheckout } from '@/lib/checkout-mode'
import { verifyReferralCode } from '@/lib/referral-codes'

/**
 * POST /api/checkout/intent
 *
 * Stage 1 of the embedded checkout migration (docs/embedded-checkout-migration.md).
 *
 * Creates a Stripe PaymentIntent for the Adopt-a-Paca flow and returns the
 * client secret so a `<PaymentElement />` mounted on /adopt can confirm it
 * client-side without a hosted-redirect.
 *
 * Fail-CLOSED behaviour:
 *   - CHECKOUT_MODE !== 'embedded'        → 404 (route pretends not to exist)
 *   - STRIPE_SECRET_KEY unset             → 503
 *   - stripe SDK package missing          → 503 STRIPE_SDK_MISSING
 *   - Stripe API error                    → 502
 *   - Bad tier / malformed JSON           → 400
 *   - 3 requests / 5 min IP burst         → 429 + Retry-After (matches existing
 *                                            /api/checkout + /api/billing-portal)
 *
 * Webhook remains the source of truth for subscription state. This route only
 * creates the intent — confirmation runs client-side via stripe.js, then the
 * webhook fires payment_intent.succeeded (one-off yearly tier) or
 * customer.subscription.created (monthly tier via setup_future_usage path).
 *
 * SECURITY HARD RULE per ps-003: OWN revenue only. Tenant-customer money still
 * requires Stripe Connect (see lib/payment-vendor.ts stripeConnectAdapter).
 */

interface StripeGiftMetadata {
  gift_recipient_email: string
  gift_recipient_name: string
  gift_sender_name: string
  gift_message: string
  gift_send_date?: string
}

function toStripeGiftMetadata(g: ParsedGiftFields): StripeGiftMetadata {
  return {
    gift_recipient_email: g.recipientEmail,
    gift_recipient_name: g.recipientName,
    gift_sender_name: g.senderName,
    gift_message: g.message,
    ...(g.sendDate ? { gift_send_date: g.sendDate } : {}),
  }
}

/**
 * Pricing for the PaymentIntent. We charge the same Euro amount the hosted
 * route uses via STRIPE_ADOPT_PRICE_ID_* — but PaymentIntent doesn't accept a
 * price ID, only an amount. The Euro constants in lib/config.ts are the single
 * source of truth (matches CLAUDE.md failsafe row for ADOPT_PRICE_*).
 */
function amountForTier(tier: AdoptTier): number {
  // Stripe amounts are integer cents.
  return tier === 'monthly'
    ? ADOPT_PRICE_MONTHLY_EUR * 100
    : ADOPT_PRICE_YEARLY_EUR * 100
}

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('checkout-intent', reqId)

  // Gate 1: CHECKOUT_MODE must be embedded. Until Stage 5 cutover this returns
  // 404 so probes can't tell the route exists.
  if (!isEmbeddedCheckout()) {
    return attachRequestId(
      NextResponse.json({ error: 'Not found' }, { status: 404 }),
      reqId,
    )
  }

  // Gate 2: IP rate-limit. Mirrors /api/checkout (3 req / 5 min).
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `checkout-intent:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  // Gate 3: secret key required.
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)
  const secretKey = process.env.STRIPE_SECRET_KEY!

  // Parse + validate body.
  let tier: AdoptTier | null = null
  let alpacaSlugRaw: string | null = null
  let giftFields: ParsedGiftFields | null = null
  let referredBy: string | null = null
  try {
    const body = await request.json()
    if (isAdoptTier(body?.tier)) tier = body.tier
    if (typeof body?.alpaca === 'string') alpacaSlugRaw = body.alpaca
    // Embedded path was silently dropping ?ref= attribution — the hosted
    // route writes metadata.referredBy but the intent route omitted it.
    // Now reads the same `ref` field client passes in the JSON body.
    if (typeof body?.ref === 'string') referredBy = verifyReferralCode(body.ref)
    // Embedded path accepts gift fields as a nested object (parsed once on the
    // client) OR as the flat gift_* shape (parity with hosted route).
    if (body?.gift && typeof body.gift === 'object') {
      giftFields = parseGiftFields({
        gift_recipient_email: body.gift.recipientEmail,
        gift_recipient_name: body.gift.recipientName,
        gift_sender_name: body.gift.senderName,
        gift_message: body.gift.message,
        gift_send_date: body.gift.sendDate,
      })
    } else {
      giftFields = parseGiftFields({
        gift_recipient_email: typeof body?.gift_recipient_email === 'string' ? body.gift_recipient_email : undefined,
        gift_recipient_name: typeof body?.gift_recipient_name === 'string' ? body.gift_recipient_name : undefined,
        gift_sender_name: typeof body?.gift_sender_name === 'string' ? body.gift_sender_name : undefined,
        gift_message: typeof body?.gift_message === 'string' ? body.gift_message : undefined,
        gift_send_date: typeof body?.gift_send_date === 'string' ? body.gift_send_date : undefined,
      })
    }
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), reqId)
  }
  if (!tier) {
    return attachRequestId(
      NextResponse.json({ error: 'tier must be "monthly" or "yearly"' }, { status: 400 }),
      reqId,
    )
  }

  // Validate alpaca slug against the canonical roster (same defence as hosted route).
  const alpacaSlug = alpacaSlugRaw && findAlpacaName(alpacaSlugRaw) ? alpacaSlugRaw : null

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
    const intent = await stripe.paymentIntents.create({
      amount: amountForTier(tier),
      currency: 'eur',
      // Let Stripe pick card / SEPA / iDEAL based on donor locale + dashboard
      // payment-method settings (per CLAUDE.md "Mollie SEPA ~€0.25 vs Stripe
      // €1.75" tradeoff — but for embedded, automatic_payment_methods gives us
      // SEPA on the same flow without a second processor).
      automatic_payment_methods: { enabled: true },
      // Monthly tier needs the card saved off-session so the subscription
      // webhook can charge it on renewal. Yearly is a one-off — no future-use
      // intent needed. (Stage 1: PaymentIntent only. Stage 4 may swap monthly
      // to a SetupIntent + Subscription. See migration plan.)
      ...(tier === 'monthly' ? { setup_future_usage: 'off_session' as const } : {}),
      metadata: {
        product: 'adopt-a-paca',
        tier,
        checkout_mode: 'embedded',
        ...(alpacaSlug ? { alpaca: alpacaSlug } : {}),
        ...(referredBy ? { referredBy } : {}),
        ...(giftFields ? toStripeGiftMetadata(giftFields) : {}),
      },
    })

    if (!intent.client_secret) {
      log.error('Stripe returned a PaymentIntent with no client_secret', { id: intent.id })
      return attachRequestId(
        NextResponse.json({ error: 'PaymentIntent created but no client_secret returned' }, { status: 502 }),
        reqId,
      )
    }

    return attachRequestId(
      NextResponse.json({
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
      }),
      reqId,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Stripe PaymentIntent creation failed', { message })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to create PaymentIntent', code: 'STRIPE_ERROR' },
        { status: 502 },
      ),
      reqId,
    )
  }
}
