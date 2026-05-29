import { NextResponse } from 'next/server'
import { molliePaymentProvider } from '@/lib/integrations/payment-mollie'
import { SITE_BASE_URL } from '@/lib/config'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'
import { isValidEmail } from '@/lib/validate-email'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'
import { parseGiftFields, type ParsedGiftFields } from '@/lib/gift-fields'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyReferralCode } from '@/lib/referral-codes'

/**
 * GET  /api/mollie-checkout?tier=monthly|yearly
 * POST /api/mollie-checkout  body: { tier, email? }
 *
 * Creates a Mollie Payment server-side (one-off for yearly, first-of-mandate for
 * monthly) and 303-redirects to Mollie's hosted checkout page on success.
 *
 * Fail-CLOSED: 503 if MOLLIE_API_KEY or MOLLIE_WEBHOOK_SECRET unset.
 *
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 *   This route handles OWN revenue ONLY (Adopt-a-Paca).
 *   Tenant revenue requires Stripe Connect — see stripeConnectAdapter in lib/payment-vendor.ts.
 *
 * Mollie vs Stripe model:
 *   Stripe Checkout = preconfigured Price IDs in dashboard, mode=subscription|payment.
 *   Mollie Payments = amount sent inline, sequenceType=oneoff|first determines mandate.
 *   We use sequenceType=first for monthly (mandate→subscription in webhook), oneoff for yearly.
 */

export async function GET(request: Request) {
  return handleCheckout(request, 'GET')
}

export async function POST(request: Request) {
  return handleCheckout(request, 'POST')
}

async function handleCheckout(request: Request, method: 'GET' | 'POST') {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-checkout', reqId)

  // IP rate-limit: each Mollie payments.create costs an API call + creates a
  // payment object. Same 3/5min ceiling as Stripe checkout for parity.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `mollie-checkout:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)

  let tier: AdoptTier | null = null
  let customerEmail: string | undefined
  let alpacaSlugRaw: string | null = null
  let giftFields: ParsedGiftFields | null = null
  // Referrer-tracking code (?ref=XXXXXX) — distinct from any discount/coupon
  // flow. Validated for format only (no signature check); written into
  // payment metadata.referredBy so admin attribution survives the
  // mandate→subscription handoff in the Mollie webhook.
  let referredBy: string | null = null
  if (method === 'GET') {
    const url = new URL(request.url)
    const raw = url.searchParams.get('tier')
    if (isAdoptTier(raw)) tier = raw
    alpacaSlugRaw = url.searchParams.get('alpaca')
    // Accept both the richer multi-field form (gift_recipient_email etc.) and the
    // simplified AdoptGiftAdoption form (gift_name / gift_email / gift_deliver).
    // Richer fields take precedence when both are present.
    giftFields = parseGiftFields({
      gift_recipient_email:
        url.searchParams.get('gift_recipient_email') ??
        url.searchParams.get('gift_email'),
      gift_recipient_name:
        url.searchParams.get('gift_recipient_name') ??
        url.searchParams.get('gift_name'),
      gift_sender_name: url.searchParams.get('gift_sender_name'),
      gift_message: url.searchParams.get('gift_message'),
      gift_send_date:
        url.searchParams.get('gift_send_date') ??
        url.searchParams.get('gift_deliver'),
    })
    referredBy = verifyReferralCode(url.searchParams.get('ref'))
  } else {
    try {
      const body = (await request.json()) as Record<string, unknown>
      if (isAdoptTier(body?.tier)) tier = body.tier
      if (typeof body?.email === 'string' && isValidEmail(body.email)) {
        customerEmail = body.email
      }
      if (typeof body?.alpaca === 'string') alpacaSlugRaw = body.alpaca
      if (typeof body?.ref === 'string') referredBy = verifyReferralCode(body.ref)
      giftFields = parseGiftFields({
        gift_recipient_email: typeof body?.gift_recipient_email === 'string' ? body.gift_recipient_email : undefined,
        gift_recipient_name: typeof body?.gift_recipient_name === 'string' ? body.gift_recipient_name : undefined,
        gift_sender_name: typeof body?.gift_sender_name === 'string' ? body.gift_sender_name : undefined,
        gift_message: typeof body?.gift_message === 'string' ? body.gift_message : undefined,
        gift_send_date: typeof body?.gift_send_date === 'string' ? body.gift_send_date : undefined,
      })
    } catch {
      return attachRequestId(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), reqId)
    }
  }
  if (!tier) {
    return attachRequestId(NextResponse.json({ error: 'tier must be "monthly" or "yearly"' }, { status: 400 }), reqId)
  }
  const alpacaSlug = findAlpacaName(alpacaSlugRaw) ? alpacaSlugRaw! : undefined

  // Server-side log when a ref code is in play — same rationale as the Stripe
  // route: surfaces referral activity in Vercel Function Logs before payment
  // completes, so spikes after a referrer's social post are visible live.
  if (referredBy) {
    log.info('referral attribution attached', { vendor: 'mollie', tier, ref: referredBy })
  }

  // SECURITY: SITE_BASE_URL only — never request.headers.get('origin'). See
  // CLAUDE.md failsafe map "Mollie checkout returnUrl uses SITE_BASE_URL".
  const locale = extractLocaleFromReferer(request.headers.get('referer'))
  const returnUrl = `${SITE_BASE_URL}/${locale}/adopt?checkout=mollie-return&tier=${tier}`

  const provider = molliePaymentProvider()
  const result = await provider.createCheckoutSession({
    tenantId: 'alpacasibiza',
    productId: tier, // overload: tier carried in productId (see payment-mollie.ts header)
    returnUrl,
    customerEmail,
    alpacaSlug,
    locale,
    ...(referredBy ? { referredBy } : {}),
    ...(giftFields
      ? {
          gift: {
            recipientEmail: giftFields.recipientEmail,
            recipientName: giftFields.recipientName,
            senderName: giftFields.senderName,
            message: giftFields.message,
            sendDate: giftFields.sendDate,
          },
        }
      : {}),
  })

  if ('unconfigured' in result) {
    return attachRequestId(
      NextResponse.json(
        {
          error: 'Payment provider not configured',
          code: 'MOLLIE_UNCONFIGURED',
          fallbackUrl: result.fallbackUrl,
        },
        { status: 503 },
      ),
      reqId
    )
  }

  if (method === 'GET') return attachRequestId(NextResponse.redirect(result.url, 303), reqId)
  return attachRequestId(NextResponse.json({ url: result.url }), reqId)
}
