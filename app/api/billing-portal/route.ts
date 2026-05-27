import { NextResponse } from 'next/server'
import { SITE_BASE_URL } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'

/**
 * POST /api/billing-portal
 *
 * Returns a Stripe Customer Portal URL so subscribers can self-serve:
 * cancel, update payment method, view invoices — without contacting the owner.
 *
 * Accepts: { email?: string; customer_id?: string; locale?: string }
 * Returns: { url: string } on success, or { error, message } on failure.
 *
 * Fail-CLOSED: returns 503 if STRIPE_SECRET_KEY is unset.
 * Mirror of app/api/checkout/route.ts env-var gate + dynamic import guard.
 *
 * PREREQUISITE (owner action): Enable Customer Portal in Stripe dashboard:
 *   Stripe → Settings → Billing → Customer portal → Activate
 *   https://dashboard.stripe.com/settings/billing/portal
 */

export async function POST(request: Request) {
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Subscription portal is unavailable — contact info@alpacasibiza.com to manage your subscription.', { code: 'STRIPE_NOT_CONFIGURED' })
  if (secretGate) return secretGate
  const secretKey = process.env.STRIPE_SECRET_KEY!

  let body: { email?: string; customer_id?: string; locale?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_JSON', message: 'Invalid JSON body' }, { status: 400 })
  }
  const { email, customer_id, locale } = body
  if (!email && !customer_id) {
    return NextResponse.json(
      { error: 'MISSING_IDENTIFIER', message: 'Provide either email or customer_id.' },
      { status: 400 }
    )
  }

  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    console.error('[billing-portal] stripe SDK not installed. Run: pnpm add stripe (owner-controlled deploy step).')
    return NextResponse.json(
      { error: 'STRIPE_SDK_MISSING', message: 'Server SDK not installed.' },
      { status: 503 }
    )
  }
  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // ── 4. Resolve customer ID ────────────────────────────────────────────────
  let customerId = customer_id
  if (!customerId && email) {
    try {
      const customers = await stripe.customers.list({ email, limit: 1 })
      const customer = customers.data[0]
      if (!customer) {
        return NextResponse.json(
          {
            error: 'CUSTOMER_NOT_FOUND',
            message:
              'No subscription found for that email. Contact info@alpacasibiza.com if you think this is wrong.',
          },
          { status: 404 }
        )
      }
      customerId = customer.id
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[billing-portal] Stripe customers.list failed:', message)
      return NextResponse.json({ error: 'STRIPE_LOOKUP_FAILED', message }, { status: 502 })
    }
  }

  // Locale: body value preferred, else Referer header; both validated against the
  // full 6-locale allowlist from i18n.config.ts (default in extractLocaleFromReferer).
  const allowed = ['en', 'nl', 'es', 'de', 'it', 'fr']
  const safeLocale = locale && allowed.includes(locale)
    ? locale
    : extractLocaleFromReferer(request.headers.get('referer'))
  const returnUrl = `${SITE_BASE_URL}/${safeLocale}/adopt?portal=return`

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[billing-portal] billingPortal.sessions.create failed:', message)
    return NextResponse.json({ error: 'PORTAL_SESSION_FAILED', message }, { status: 502 })
  }
}

