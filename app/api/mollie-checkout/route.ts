import { NextResponse } from 'next/server'
import { molliePaymentProvider } from '@/lib/integrations/payment-mollie'
import { SITE_BASE_URL } from '@/lib/config'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'
import { isValidEmail } from '@/lib/validate-email'

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
  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return apiKeyGate
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return webhookSecretGate

  let tier: AdoptTier | null = null
  let customerEmail: string | undefined
  if (method === 'GET') {
    const raw = new URL(request.url).searchParams.get('tier')
    if (isAdoptTier(raw)) tier = raw
  } else {
    try {
      const body = (await request.json()) as Record<string, unknown>
      if (isAdoptTier(body?.tier)) tier = body.tier
      if (typeof body?.email === 'string' && isValidEmail(body.email)) {
        customerEmail = body.email
      }
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
  }
  if (!tier) {
    return NextResponse.json({ error: 'tier must be "monthly" or "yearly"' }, { status: 400 })
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
  })

  if ('unconfigured' in result) {
    return NextResponse.json(
      {
        error: 'Payment provider not configured',
        code: 'MOLLIE_UNCONFIGURED',
        fallbackUrl: result.fallbackUrl,
      },
      { status: 503 },
    )
  }

  if (method === 'GET') return NextResponse.redirect(result.url, 303)
  return NextResponse.json({ url: result.url })
}
