export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { buildICS } from '@/lib/calendar/ics'
import type { ICSEvent } from '@/lib/calendar/ics'

const SESSION_ID_RE = /^cs_(test_|live_)?[A-Za-z0-9]+$/

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  // Format guard — reject anything that doesn't look like a Stripe session ID.
  if (!SESSION_ID_RE.test(sessionId)) {
    return NextResponse.json({ code: 'INVALID_SESSION_ID' }, { status: 400 })
  }

  // Rate limit: 20 reads per IP per 5 minutes.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `calendar-renewal:${ip}`, limit: 20, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    )
  }

  // Stripe SDK — mirror adopt-certificate pattern.
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    console.warn('[calendar/renewal] stripe SDK not installed')
    return NextResponse.json({ code: 'STRIPE_SDK_MISSING' }, { status: 503 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json({ code: 'STRIPE_UNCONFIGURED' }, { status: 503 })
  }

  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  try {
    // Expand subscription so we can read current_period_end + metadata.tier.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    const customerEmail =
      session.customer_details?.email ??
      (typeof session.customer === 'object' && session.customer !== null && 'email' in session.customer
        ? (session.customer as { email?: string | null }).email
        : null) ??
      null

    // Resolve subscription period end + tier from the expanded subscription.
    const sub = session.subscription
    let renewalDate: Date | null = null
    let tier: string | null = null

    if (sub && typeof sub === 'object' && 'current_period_end' in sub) {
      // current_period_end is a Unix timestamp (seconds).
      const periodEnd = (sub as { current_period_end: number }).current_period_end
      renewalDate = new Date(periodEnd * 1000)
      tier = (sub as { metadata?: { tier?: string } }).metadata?.tier ?? session.metadata?.tier ?? null
    } else {
      // Fallback: no subscription on session (one-off) — use session metadata tier + 1 year from now.
      tier = session.metadata?.tier ?? null
      if (tier === 'yearly') {
        renewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      } else {
        renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }

    const isYearly = tier === 'yearly'
    const recurrence: 'YEARLY' | 'MONTHLY' = isYearly ? 'YEARLY' : 'MONTHLY'

    // Build a unique UID scoped to this session.
    const dateIso = renewalDate.toISOString().slice(0, 10)
    const uid = `renewal-${sessionId}-${dateIso}@alpacasibiza.com`

    // Description includes email if available so the donor knows which account
    // it refers to. No PII beyond what the donor already supplied to Stripe.
    const emailSuffix = customerEmail ? ` (${customerEmail})` : ''
    const description =
      `Your Alpacas Ibiza adoption${emailSuffix} renews on this date. ` +
      `Visit alpacasibiza.com to manage your adoption.`

    const event: ICSEvent = {
      uid,
      startUtc: renewalDate,
      summary: 'Alpaca adoption renewal — Es Currals',
      description,
      url: 'https://alpacasibiza.com',
      organiserEmail: 'info@alpacasibiza.com',
      organiserName: 'Alpacas Ibiza',
      recurrence,
      // 7-day-before + 1-day-before reminders.
      reminderMinutesBefore: [10080, 1440],
    }

    const ics = buildICS(event)

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="alpaca-adoption-renewal.ics"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.warn('[calendar/renewal] retrieve failed', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ code: 'SESSION_NOT_FOUND' }, { status: 404 })
  }
}
