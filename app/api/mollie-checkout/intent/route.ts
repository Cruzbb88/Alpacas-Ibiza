import { NextResponse } from 'next/server'
import { getMollieClient, getMollieWebhookUrl } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503, extractLocaleFromReferer } from '@/lib/route-helpers'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'
import { parseGiftFields, type ParsedGiftFields } from '@/lib/gift-fields'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { ADOPT_PRICE_MONTHLY_EUR, ADOPT_PRICE_YEARLY_EUR, SITE_BASE_URL } from '@/lib/config'
import { isEmbeddedCheckout } from '@/lib/checkout-mode'

/**
 * POST /api/mollie-checkout/intent
 *
 * Stage 1-2 of the embedded checkout migration (docs/embedded-checkout-migration.md).
 *
 * Creates a Mollie Payment with method=null so the donor can pick card / iDEAL /
 * SEPA inside the Mollie Components form mounted client-side. Returns the
 * paymentId + profileId so the EmbeddedMollieCheckout component can construct
 * a Mollie() instance and mount the named slots.
 *
 * Different from the existing hosted /api/mollie-checkout route in two key ways:
 *   1. Does NOT return checkoutUrl (no hosted redirect). Instead returns the
 *      profileId + paymentId so the client mounts Mollie Components.
 *   2. Gated on CHECKOUT_MODE === 'embedded' (404 otherwise) so probing the
 *      route cannot reveal its presence during hosted-mode operation.
 *
 * Fail-CLOSED behaviour:
 *   - CHECKOUT_MODE !== 'embedded'         → 404 (route pretends not to exist)
 *   - MOLLIE_API_KEY unset                 → 503
 *   - MOLLIE_WEBHOOK_SECRET unset          → 503 (mandate requires verifiable webhook)
 *   - MOLLIE_PROFILE_ID unset              → 503 MOLLIE_PROFILE_ID_UNSET
 *                                            (Components SDK needs the public profile ID,
 *                                            NOT the API key, exposed to the browser).
 *   - @mollie/api-client missing           → 503 MOLLIE_SDK_MISSING
 *   - Mollie API error                     → 502
 *   - Bad tier / malformed JSON            → 400
 *   - 3 requests / 5 min IP burst          → 429 + Retry-After (matches existing
 *                                            /api/mollie-checkout + /api/checkout/intent)
 *
 * Webhook remains the source of truth for subscription state (per ADR 016).
 * This route only creates the payment shell; donor enters the card / SEPA
 * details inside Mollie Components and the webhook fires payment.paid once
 * Mollie has captured the funds.
 *
 * SECURITY HARD RULE per ps-003: OWN revenue only.
 */

interface MollieGiftMetadata {
  gift_recipient_email: string
  gift_recipient_name: string
  gift_sender_name: string
  gift_message: string
  gift_send_date?: string
}

function toMollieGiftMetadata(g: ParsedGiftFields): MollieGiftMetadata {
  return {
    gift_recipient_email: g.recipientEmail,
    gift_recipient_name: g.recipientName,
    gift_sender_name: g.senderName,
    gift_message: g.message,
    ...(g.sendDate ? { gift_send_date: g.sendDate } : {}),
  }
}

/**
 * Mollie amounts are decimal strings in major units ("75.00") — opposite of
 * Stripe which uses integer minor units. Source-of-truth still lib/config.ts.
 */
function amountForTier(tier: AdoptTier): string {
  return (tier === 'monthly' ? ADOPT_PRICE_MONTHLY_EUR : ADOPT_PRICE_YEARLY_EUR).toFixed(2)
}

function descriptionForTier(tier: AdoptTier): string {
  return tier === 'monthly'
    ? 'Adopt-a-Paca — monthly subscription'
    : 'Adopt-a-Paca — yearly support'
}

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-checkout-intent', reqId)

  // Gate 1: CHECKOUT_MODE must be embedded. Until Stage 5 cutover this returns
  // 404 so probes can't tell the route exists.
  if (!isEmbeddedCheckout()) {
    return attachRequestId(
      NextResponse.json({ error: 'Not found' }, { status: 404 }),
      reqId,
    )
  }

  // Gate 2: IP rate-limit. Mirrors /api/mollie-checkout (3 req / 5 min).
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `mollie-checkout-intent:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  // Gate 3: required envs.
  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)
  // Mollie Components needs the public profile ID (pfl_xxx) exposed to the
  // browser to instantiate Mollie(). The API key MUST NOT be exposed.
  const profileGate = requireEnvOrReturn503('MOLLIE_PROFILE_ID', 'Payment profile not configured')
  if (profileGate) return attachRequestId(profileGate, reqId)

  const apiKey = process.env.MOLLIE_API_KEY!
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET!
  const profileId = process.env.MOLLIE_PROFILE_ID!
  // Mollie API keys are prefixed live_ / test_. The latter is the embedded
  // SDK's "testmode" toggle — surface it so the client mounts the test banner.
  const testmode = apiKey.startsWith('test_')

  // Parse + validate body.
  let tier: AdoptTier | null = null
  let alpacaSlugRaw: string | null = null
  let giftFields: ParsedGiftFields | null = null
  let referredBy: string | null = null
  try {
    const body = await request.json()
    if (isAdoptTier(body?.tier)) tier = body.tier
    if (typeof body?.alpaca === 'string') alpacaSlugRaw = body.alpaca
    // Embedded path was silently dropping ?ref= attribution — hosted route
    // writes metadata.referredBy but the intent route omitted it.
    if (typeof body?.ref === 'string') {
      const { verifyReferralCode } = await import('@/lib/referral-codes')
      referredBy = verifyReferralCode(body.ref)
    }
    // Mirror the Stripe intent route: accept gift as nested object OR flat gift_*.
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

  // Locale used for the Mollie hosted-fallback redirectUrl (the return-page if
  // donor refreshes mid-flow). Mirror /api/mollie-checkout.
  const locale = extractLocaleFromReferer(request.headers.get('referer'))
  const redirectUrl = `${SITE_BASE_URL}/${locale}/adopt?checkout=mollie-embedded-return&tier=${tier}`

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('mollie SDK not installed.')
    return attachRequestId(
      NextResponse.json(
        { error: 'Payment SDK not installed', code: 'MOLLIE_SDK_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }

  try {
    // method=null → donor picks the method inside Mollie Components. The SDK's
    // strict types are built for the hosted-redirect happy path; cast through
    // unknown at the boundary, same pattern as payment-mollie.ts.
    const paymentArgs: Record<string, unknown> = {
      amount: { value: amountForTier(tier), currency: 'EUR' },
      description: descriptionForTier(tier),
      redirectUrl,
      webhookUrl: getMollieWebhookUrl(webhookSecret),
      // sequenceType for monthly is 'first' (mandate-creating). The webhook
      // handler creates the Subscription on payment.paid. Yearly is 'oneoff'.
      sequenceType: tier === 'monthly' ? 'first' : 'oneoff',
      // method=null in the JSON sense — omit so Mollie defaults to "let donor pick".
      // For Components flows we additionally pass `method` slot inside the client
      // SDK when createToken() resolves to a specific method.
      metadata: {
        product: 'adopt-a-paca',
        tier,
        checkout_mode: 'embedded',
        ...(alpacaSlug ? { alpaca: alpacaSlug } : {}),
        ...(referredBy ? { referredBy } : {}),
        ...(giftFields ? toMollieGiftMetadata(giftFields) : {}),
      },
    }

    // Monthly = first payment of a mandate → needs a Customer attached.
    if (tier === 'monthly') {
      const customerArgs = {
        metadata: { tenantId: 'alpacasibiza', tier },
      } as unknown as Parameters<typeof mollie.customers.create>[0]
      const customer = await mollie.customers.create(customerArgs)
      paymentArgs.customerId = customer.id
    }

    const payment = (await mollie.payments.create(
      paymentArgs as unknown as Parameters<typeof mollie.payments.create>[0],
    )) as unknown as { id: string }

    if (!payment?.id) {
      log.error('Mollie returned a Payment with no id')
      return attachRequestId(
        NextResponse.json({ error: 'Payment created but no id returned' }, { status: 502 }),
        reqId,
      )
    }

    return attachRequestId(
      NextResponse.json({
        paymentId: payment.id,
        profileId,
        testmode,
        locale,
      }),
      reqId,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Mollie Payment creation failed', { message })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to create Mollie Payment', detail: message },
        { status: 502 },
      ),
      reqId,
    )
  }
}
