import { NextResponse } from 'next/server'
import { SITE_BASE_URL } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'

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
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return secretGate
  const secretKey = process.env.STRIPE_SECRET_KEY!

  let tier: AdoptTier | null = null
  if (method === 'GET') {
    const raw = new URL(request.url).searchParams.get('tier')
    if (isAdoptTier(raw)) tier = raw
  } else {
    try {
      const body = await request.json()
      if (isAdoptTier(body?.tier)) tier = body.tier
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
  }
  if (!tier) {
    return NextResponse.json({ error: 'tier must be "monthly" or "yearly"' }, { status: 400 })
  }

  const priceKey = tier === 'monthly' ? 'STRIPE_ADOPT_PRICE_ID_MONTHLY' : 'STRIPE_ADOPT_PRICE_ID_YEARLY'
  const priceGate = requireEnvOrReturn503(priceKey, 'Payment price not configured for this tier')
  if (priceGate) return priceGate
  const priceId = process.env[priceKey]!

  // SECURITY: SITE_BASE_URL only — never request.headers.get('origin'). See
  // CLAUDE.md failsafe map "Stripe checkout success_url uses SITE_BASE_URL".
  const locale = extractLocaleFromReferer(request.headers.get('referer'))
  const successUrl = `${SITE_BASE_URL}/${locale}/adopt?checkout=success&tier=${tier}`
  const cancelUrl  = `${SITE_BASE_URL}/${locale}/adopt?checkout=cancelled`

  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    console.error('[checkout] stripe SDK not installed. Run: pnpm add stripe (owner-controlled deploy step).')
    return NextResponse.json(
      { error: 'Payment SDK not installed', code: 'STRIPE_SDK_MISSING' },
      { status: 503 }
    )
  }
  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: tier === 'monthly' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: 'auto',
      automatic_tax: { enabled: false }, // OWNER_INPUT_NEEDED: set true once Stripe Tax activated
      metadata: { product: 'adopt-a-paca', tier },
    })
    if (!session.url) {
      console.error('[checkout] Stripe returned a session with no URL', { id: session.id })
      return NextResponse.json({ error: 'Checkout session created but no URL returned' }, { status: 502 })
    }
    if (method === 'GET') return NextResponse.redirect(session.url, 303)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Stripe session creation failed:', message)
    return NextResponse.json(
      { error: 'Failed to create checkout session', detail: message },
      { status: 502 }
    )
  }
}
