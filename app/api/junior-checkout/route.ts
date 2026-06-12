import { NextResponse } from 'next/server'
import { SITE_BASE_URL, STRIPE_JUNIOR_PRICE_ID } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503, extractLocaleFromReferer } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyReferralCode } from '@/lib/referral-codes'

/**
 * POST /api/junior-checkout?locale=<locale>&alpaca=<slug>
 *
 * Creates a Stripe Checkout session for the junior (kids) adoption tier.
 * Monthly recurring subscription using a pre-created Stripe Price ID.
 *
 * Mirrors /api/skein-checkout shape:
 *   - POST only
 *   - IP rate limit: 3 req / 5 min (mirrors skein-checkout)
 *   - 503 if STRIPE_SECRET_KEY unset (fail-CLOSED)
 *   - 503 if STRIPE_JUNIOR_PRICE_ID unset (JUNIOR_PRICE_ID_MISSING)
 *   - Stripe SDK dynamic import (503 if SDK absent — STRIPE_SDK_MISSING)
 *   - Optional `alpaca` query param validated via findAlpacaName
 *   - Optional `referredBy` query param validated via REFERRAL_CODE_RE
 *   - success_url + cancel_url built from SITE_BASE_URL (ADR 017)
 *   - Returns 303 redirect to Stripe Checkout session URL
 *
 * SECURITY: SITE_BASE_URL only for redirects — never request.headers.get('origin').
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('junior-checkout', reqId)

  // ── IP rate limit ────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `junior-checkout:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  // ── Stripe secret key gate ───────────────────────────────────────────────
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)
  const secretKey = process.env.STRIPE_SECRET_KEY!

  // ── Junior Price ID gate ─────────────────────────────────────────────────
  if (!STRIPE_JUNIOR_PRICE_ID) {
    log.warn('STRIPE_JUNIOR_PRICE_ID unset — returning 503')
    return attachRequestId(
      NextResponse.json(
        { error: 'Junior tier not configured', code: 'JUNIOR_PRICE_ID_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }

  // ── Stripe SDK ───────────────────────────────────────────────────────────
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('stripe SDK not installed. Run: pnpm add stripe')
    return attachRequestId(
      NextResponse.json(
        { error: 'Payment SDK not installed', code: 'STRIPE_SDK_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }
  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // ── Parse query params ───────────────────────────────────────────────────
  const url = new URL(request.url)
  const rawAlpaca   = url.searchParams.get('alpaca')
  const rawReferral = url.searchParams.get('referredBy')

  // Validate alpaca slug against canonical roster. Unknown/forged slugs are
  // silently treated as pick-for-me to prevent arbitrary text in Stripe metadata.
  const alpacaSlug: string | null =
    rawAlpaca && rawAlpaca !== 'any' && findAlpacaName(rawAlpaca) ? rawAlpaca : null

  // Validate referral code — format-check only (see referral-codes.ts Rule 3).
  const referredBy: string | null = verifyReferralCode(rawReferral)

  // Locale — prefer explicit ?locale= param, fall back to Referer header.
  const rawLocale = url.searchParams.get('locale')
  const LOCALE_ALLOWLIST = ['en', 'nl', 'es', 'de', 'it', 'fr']
  const refererLocale = extractLocaleFromReferer(request.headers.get('referer'))
  const locale: string =
    rawLocale && LOCALE_ALLOWLIST.includes(rawLocale) ? rawLocale : refererLocale

  // ── Build Checkout session ───────────────────────────────────────────────
  // success_url / cancel_url: SITE_BASE_URL only (ADR 017).
  const successUrl = `${SITE_BASE_URL}/${locale}/adopt?checkout=success`
  // ?checkout=cancelled (not ?cancelled=1): the adopt page reads the `checkout`
  // param to show the cancelled banner — matches the senior-tier cancel_url.
  const cancelUrl  = `${SITE_BASE_URL}/${locale}/adopt?checkout=cancelled`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: STRIPE_JUNIOR_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        tier: 'junior',
        alpaca: alpacaSlug ?? '',
        referredBy: referredBy ?? '',
        locale,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false }, // OWNER_INPUT_NEEDED: set true once Stripe Tax activated
    })

    if (!session.url) {
      log.error('Stripe returned a session with no URL', { id: session.id })
      return attachRequestId(
        NextResponse.json(
          { error: 'Checkout session created but no URL returned' },
          { status: 502 },
        ),
        reqId,
      )
    }

    log.info('Junior checkout session created', {
      sessionId: session.id,
      alpacaSlug,
      referredBy,
      locale,
    })

    return attachRequestId(NextResponse.redirect(session.url, 303), reqId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Stripe session creation failed', { message })
    // Do NOT include raw Stripe error in the public response — would leak
    // internal config (price IDs, test/prod key mismatches, account state).
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to create checkout session', code: 'STRIPE_ERROR' },
        { status: 502 },
      ),
      reqId,
    )
  }
}
