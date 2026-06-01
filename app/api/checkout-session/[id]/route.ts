export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitiseDisplayName } from '@/lib/html'

// Real Stripe Checkout Session IDs: cs_test_<50+ chars> or cs_live_<50+ chars>.
// Minimum 20 chars after the prefix prevents trivially-invalid IDs (e.g.
// "cs_test_invalid") from reaching the Stripe SDK / 503 unconfigured gate.
const SESSION_ID_RE = /^cs_(test_|live_)[A-Za-z0-9]{20,}$/

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Format guard — reject anything that doesn't look like a Stripe session ID.
  if (!SESSION_ID_RE.test(id)) {
    return NextResponse.json({ code: 'INVALID_SESSION_ID' }, { status: 400 })
  }

  // Rate limit: 30 reads per IP per 5 minutes — generous for the single
  // legitimate read per donor, still tight enough to prevent bulk enumeration.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `checkout-session:${ip}`, limit: 30, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    )
  }

  // Stripe SDK — mirror adopt-certificate pattern.
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    console.warn('[checkout-session] stripe SDK not installed')
    return NextResponse.json({ code: 'STRIPE_SDK_MISSING' }, { status: 503 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ code: 'STRIPE_UNCONFIGURED' }, { status: 503 })
  }

  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  try {
    // Expand customer so we can fall back to customer.name when
    // customer_details.name is null (e.g. returning customers whose billing
    // name lives on the Customer object, not the checkout session).
    const session = await stripe.checkout.sessions.retrieve(id, {
      expand: ['customer'],
    })

    // Prefer customer_details.name (set during checkout) over the Customer
    // object name (may be from a prior purchase).
    const rawName =
      session.customer_details?.name ??
      (session.customer && typeof session.customer === 'object' && 'name' in session.customer
        ? (session.customer as { name?: string | null }).name
        : null)

    const name = sanitiseDisplayName(rawName)

    return NextResponse.json(
      { name, livemode: session.livemode },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    // Don't leak whether the session exists — always 404.
    console.warn('[checkout-session] retrieve failed', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ code: 'SESSION_NOT_FOUND' }, { status: 404 })
  }
}
