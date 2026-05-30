import { NextResponse } from 'next/server'
import { SITE_BASE_URL } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'
import { parseGiftFields, type ParsedGiftFields } from '@/lib/gift-fields'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyReferralCode } from '@/lib/referral-codes'

/** Stripe metadata shape — snake_case keys, expected by lib/payment-handlers Stripe path. */
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
 * POST /api/checkout
 * GET  /api/checkout?tier=monthly|yearly
 *
 * Creates a Stripe Checkout session server-side (Strategy D per ps-003).
 * Redirects to Stripe's hosted checkout page on success.
 *
 * Fail-closed: returns 503 if STRIPE_SECRET_KEY is unset.
 *
 * Dynamic import guard: the `stripe` npm package is imported at runtime only,
 * so the build succeeds even if the SDK is not yet installed.
 *
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 *   This route handles OWN revenue ONLY (Adopt-a-Paca).
 *   NEVER route tenant customer money through this endpoint.
 *   Tenant revenue requires Stripe Connect — see stripeConnectAdapter TODO
 *   in lib/payment-vendor.ts.
 */

export async function GET(request: Request) {
  return handleCheckout(request, 'GET')
}

export async function POST(request: Request) {
  return handleCheckout(request, 'POST')
}

async function handleCheckout(request: Request, method: 'GET' | 'POST') {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('checkout', reqId)

  // IP rate-limit: each Stripe session.create costs an API call + creates a
  // session object. Without a limit an attacker can burn API quota / cause
  // Stripe-side throttling and break checkout for real donors. Matches the
  // billing-portal route's 3/5min ceiling.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `checkout:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  // Referral code format guard — must match ALPACA-[A-Z0-9]{6}
  const REFERRAL_CODE_RE = /^ALPACA-[A-Z0-9]{6}$/

  let tier: AdoptTier | null = null
  let alpacaSlugRaw: string | null = null
  let giftFields: ParsedGiftFields | null = null
  let referralCode: string | null = null
  // Referrer-tracking code (?ref=XXXXXX, format /^[A-Z0-9]{6}$/) — distinct
  // from the existing ?referral=ALPACA-XXXXXX coupon flow. This one only
  // tags the *referred* subscription's metadata.referredBy for admin
  // attribution; no discount, no Stripe coupon lookup. Credit logic is a
  // follow-up round per the task scope.
  let referredBy: string | null = null
  // EU Directive 2011/83 Art 16(m) waiver — must be '1' (set by CheckoutGate
  // client component). Server-side gate is belt-and-suspenders: the client
  // already blocks the CTA before this route is even called.
  let waiverAccepted = false
  let waiverAcceptedAt = ''
  if (method === 'GET') {
    const url = new URL(request.url)
    const raw = url.searchParams.get('tier')
    if (isAdoptTier(raw)) tier = raw
    alpacaSlugRaw = url.searchParams.get('alpaca')
    const rawReferral = url.searchParams.get('referral')
    if (rawReferral && REFERRAL_CODE_RE.test(rawReferral)) referralCode = rawReferral
    referredBy = verifyReferralCode(url.searchParams.get('ref'))
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
    waiverAccepted = url.searchParams.get('waiver_accepted') === '1'
    const rawTs = url.searchParams.get('waiver_ts') ?? ''
    // Accept only numeric timestamps (epoch ms, up to 16 digits)
    waiverAcceptedAt = /^\d{1,16}$/.test(rawTs) ? rawTs : ''
  } else {
    try {
      const body = await request.json()
      if (isAdoptTier(body?.tier)) tier = body.tier
      if (typeof body?.alpaca === 'string') alpacaSlugRaw = body.alpaca
      const bodyReferral = typeof body?.referral_code === 'string' ? body.referral_code : null
      if (bodyReferral && REFERRAL_CODE_RE.test(bodyReferral)) referralCode = bodyReferral
      if (typeof body?.ref === 'string') referredBy = verifyReferralCode(body.ref)
      giftFields = parseGiftFields({
        gift_recipient_email: typeof body?.gift_recipient_email === 'string' ? body.gift_recipient_email : undefined,
        gift_recipient_name: typeof body?.gift_recipient_name === 'string' ? body.gift_recipient_name : undefined,
        gift_sender_name: typeof body?.gift_sender_name === 'string' ? body.gift_sender_name : undefined,
        gift_message: typeof body?.gift_message === 'string' ? body.gift_message : undefined,
        gift_send_date: typeof body?.gift_send_date === 'string' ? body.gift_send_date : undefined,
      })
      waiverAccepted = body?.waiver_accepted === true || body?.waiver_accepted === '1'
      const bodyTs = typeof body?.waiver_ts === 'string'
        ? body.waiver_ts
        : typeof body?.waiver_ts === 'number'
          ? String(body.waiver_ts as number)
          : ''
      waiverAcceptedAt = /^\d{1,16}$/.test(bodyTs) ? bodyTs : ''
    } catch {
      return attachRequestId(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), reqId)
    }
  }
  if (!tier) {
    return attachRequestId(NextResponse.json({ error: 'tier must be "monthly" or "yearly"' }, { status: 400 }), reqId)
  }

  // EU Directive 2011/83 Art 16(m) server-side gate — belt-and-suspenders.
  // The client CheckoutGate already blocks the CTA; this ensures no session
  // is created for a donor who bypassed the client-side check.
  if (!waiverAccepted) {
    log.warn('Checkout blocked: EU Art 16(m) withdrawal waiver not accepted')
    return attachRequestId(
      NextResponse.json(
        { error: 'Withdrawal waiver must be accepted before checkout (EU Directive 2011/83 Art 16(m))' },
        { status: 400 }
      ),
      reqId
    )
  }

  // Server-side log when a ref code is in play — surfaces referral attempts
  // in Vercel Function Logs BEFORE the donor finishes payment. Admin already
  // gets the post-payment view via the /admin/analytics/referrals page; this
  // line gives a live counter of in-flight checkouts so spikes after a
  // referrer's social post are visible immediately.
  if (referredBy) {
    log.info('referral attribution attached', { vendor: 'stripe', tier, ref: referredBy })
  }

  // Validate alpaca slug against the canonical roster — unknown slugs (forged
  // URLs, typos) are silently dropped so no junk text reaches Stripe metadata.
  // null = "donor didn't pick a specific alpaca; we'll match them".
  const alpacaSlug = findAlpacaName(alpacaSlugRaw) ? alpacaSlugRaw : null

  const priceKey = tier === 'monthly' ? 'STRIPE_ADOPT_PRICE_ID_MONTHLY' : 'STRIPE_ADOPT_PRICE_ID_YEARLY'
  const priceGate = requireEnvOrReturn503(priceKey, 'Payment price not configured for this tier')
  if (priceGate) return attachRequestId(priceGate, reqId)
  const priceId = process.env[priceKey]!

  // SECURITY: SITE_BASE_URL only — never request.headers.get('origin'). See
  // CLAUDE.md failsafe map "Stripe checkout success_url uses SITE_BASE_URL".
  const locale = extractLocaleFromReferer(request.headers.get('referer'))
  // Round-trip the alpaca slug on cancel so the picker stays selected if the
  // donor abandons checkout and comes back. Success URL doesn't need it —
  // the AdoptThankYou screen takes over and reads from Stripe's metadata via webhook.
  const cancelAlpacaQuery = alpacaSlug ? `&alpaca=${encodeURIComponent(alpacaSlug)}` : ''
  const successUrl = `${SITE_BASE_URL}/${locale}/adopt?checkout=success&tier=${tier}`
  const cancelUrl  = `${SITE_BASE_URL}/${locale}/adopt?checkout=cancelled${cancelAlpacaQuery}`

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

  // ── Referral coupon validation ─────────────────────────────────────────────
  // If a referral code was supplied, validate it exists in Stripe and isn't
  // expired before applying. Silently ignored if invalid — never breaks checkout.
  let validatedCouponId: string | null = null
  if (referralCode) {
    try {
      const coupon = await stripe.coupons.retrieve(referralCode) as {
        id: string
        valid: boolean
        redeem_by: number | null
      }
      if (coupon.valid) {
        validatedCouponId = coupon.id
        log.info('referral coupon validated', { couponId: coupon.id })
      } else {
        log.info('referral coupon invalid or expired — ignoring', { code: referralCode })
      }
    } catch {
      // Not found or Stripe error — fail-quiet, don't break checkout.
      log.info('referral coupon not found — ignoring', { code: referralCode })
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier === 'monthly' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false }, // OWNER_INPUT_NEEDED: set true once Stripe Tax activated
      // Apply referral discount — only when a valid coupon was verified above.
      // Stripe only allows `discounts` on checkout sessions when
      // `allow_promotion_codes` is NOT set. Both are mutually exclusive.
      ...(validatedCouponId ? { discounts: [{ coupon: validatedCouponId }] } : {}),
      metadata: {
        product: 'adopt-a-paca',
        tier,
        locale,
        ...(alpacaSlug ? { alpaca: alpacaSlug } : {}),
        ...(giftFields ? toStripeGiftMetadata(giftFields) : {}),
        ...(validatedCouponId ? { referral_code_used: validatedCouponId } : {}),
        // Referrer attribution — distinct from referral_code_used (coupon).
        // referredBy is the referrer's stable HMAC-derived code; the admin
        // referrals page groups subscriptions by this field.
        ...(referredBy ? { referredBy } : {}),
        // EU Directive 2011/83 Art 16(m) audit trail.
        // waiver_accepted is always '1' here (the gate above returns 400 if not).
        waiver_accepted: waiverAccepted ? '1' : '0',
        waiver_accepted_at: waiverAcceptedAt,
      },
    })
    if (!session.url) {
      log.error('Stripe returned a session with no URL', { id: session.id })
      return attachRequestId(
        NextResponse.json({ error: 'Checkout session created but no URL returned' }, { status: 502 }),
        reqId
      )
    }
    if (method === 'GET') return attachRequestId(NextResponse.redirect(session.url, 303), reqId)
    return attachRequestId(NextResponse.json({ url: session.url }), reqId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Stripe session creation failed', { message })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to create checkout session', detail: message },
        { status: 502 }
      ),
      reqId
    )
  }
}
