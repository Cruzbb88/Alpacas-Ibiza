import { NextResponse } from 'next/server'
import { SITE_BASE_URL, MEMBERSHIP_PRICE_EUR, STRIPE_MEMBERSHIP_PRICE_ID } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503, extractLocaleFromReferer } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/membership-checkout
 *
 * Creates a Stripe Checkout session for the Annual Farm Pass membership SKU.
 * One-off payment (mode: 'payment') using a pre-created Stripe Price ID
 * (STRIPE_MEMBERSHIP_PRICE_ID). Owner must create the price in the Stripe
 * dashboard and set the env var.
 *
 * Mirrors skein-checkout:
 *   - Stripe SDK dynamic import (503 if missing)
 *   - STRIPE_SECRET_KEY + STRIPE_MEMBERSHIP_PRICE_ID required (503 if unset)
 *   - IP rate limit: 3 req / 5 min
 *   - success_url / cancel_url use SITE_BASE_URL (ADR 017)
 *
 * Failsafe: 503 if STRIPE_SECRET_KEY or STRIPE_MEMBERSHIP_PRICE_ID unset.
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('membership-checkout', reqId)

  // ── IP rate limit ────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `membership-checkout:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  // ── Stripe env gates ─────────────────────────────────────────────────────
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)

  if (!STRIPE_MEMBERSHIP_PRICE_ID) {
    log.error('STRIPE_MEMBERSHIP_PRICE_ID not configured')
    return attachRequestId(
      NextResponse.json(
        { error: 'Membership product not configured', code: 'MEMBERSHIP_PRICE_ID_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }

  const secretKey = process.env.STRIPE_SECRET_KEY!

  // ── Parse locale ─────────────────────────────────────────────────────────
  const url = new URL(request.url)
  const rawLocale = url.searchParams.get('locale')
  const LOCALE_ALLOWLIST = ['en', 'nl', 'es', 'de', 'it', 'fr']
  const refererLocale = extractLocaleFromReferer(request.headers.get('referer'))
  const locale: string =
    rawLocale && LOCALE_ALLOWLIST.includes(rawLocale) ? rawLocale : refererLocale

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

  // ── Build Checkout session ───────────────────────────────────────────────
  // success_url / cancel_url: SITE_BASE_URL only (ADR 017).
  const successUrl = `${SITE_BASE_URL}/${locale}/membership/thank-you`
  const cancelUrl = `${SITE_BASE_URL}/${locale}/membership?cancelled=1`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: STRIPE_MEMBERSHIP_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        product_type: 'annual-farm-pass',
        membership_price_eur: String(MEMBERSHIP_PRICE_EUR),
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

    log.info('Membership checkout session created', { sessionId: session.id, locale })
    return attachRequestId(NextResponse.redirect(session.url, 303), reqId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Stripe session creation failed', { message })
    // Do NOT leak the raw Stripe message to the client (can expose price IDs /
    // account state). Log it server-side; return an opaque code — matches
    // skein-checkout and junior-checkout.
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to create checkout session', code: 'STRIPE_ERROR' },
        { status: 502 },
      ),
      reqId,
    )
  }
}
