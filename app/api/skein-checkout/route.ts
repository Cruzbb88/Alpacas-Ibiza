import { NextResponse } from 'next/server'
import { SITE_BASE_URL, SKEIN_SPONSORSHIP_PRICE_EUR } from '@/lib/config'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { requireEnvOrReturn503, extractLocaleFromReferer } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * GET /api/skein-checkout?alpaca=<slug>&locale=<locale>
 *
 * Creates a Stripe Checkout session for the Name-Your-Skein spring-shearing
 * sponsorship product. Single one-off payment (mode: 'payment'), NOT a
 * subscription — this is a seasonal product, not recurring.
 *
 * Mirrors /api/checkout shape:
 *   - Stripe SDK dynamic import (503 if missing)
 *   - STRIPE_SECRET_KEY required (503 if unset — fail-CLOSED)
 *   - IP rate limit: 3 req / 5 min (same as checkout + billing-portal)
 *   - success_url / cancel_url use SITE_BASE_URL (ADR 017 — never Origin header)
 *   - Validates alpaca slug via findAlpacaName; null → "any" (pick-for-me)
 *   - Inline price_data (no pre-created Stripe price ID required)
 *
 * SECURITY: SITE_BASE_URL only for redirects — never request.headers.get('origin').
 */
export async function GET(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('skein-checkout', reqId)

  // ── IP rate limit ────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `skein-checkout:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
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

  // ── Stripe env gate ──────────────────────────────────────────────────────
  const secretGate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
  if (secretGate) return attachRequestId(secretGate, reqId)
  const secretKey = process.env.STRIPE_SECRET_KEY!

  // ── Parse query params ───────────────────────────────────────────────────
  const url = new URL(request.url)
  const rawAlpaca = url.searchParams.get('alpaca')

  // Validate alpaca slug against canonical roster. 'any' → null (pick-for-me).
  // Unknown / forged slugs are silently treated as pick-for-me to prevent
  // arbitrary text reaching Stripe metadata.
  const alpacaSlug: string | null =
    rawAlpaca && rawAlpaca !== 'any' && findAlpacaName(rawAlpaca) ? rawAlpaca : null
  const alpacaDisplayName: string | null = alpacaSlug ? findAlpacaName(alpacaSlug) : null

  // Locale — prefer explicit ?locale= param, fall back to Referer header.
  // extractLocaleFromReferer returns a validated string from the allowlist (defaults 'en').
  const rawLocale = url.searchParams.get('locale')
  const LOCALE_ALLOWLIST = ['en', 'nl', 'es', 'de', 'it', 'fr']
  const refererLocale = extractLocaleFromReferer(request.headers.get('referer'))
  const locale: string =
    rawLocale && LOCALE_ALLOWLIST.includes(rawLocale)
      ? rawLocale
      : refererLocale

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
  const alpacaQueryParam = alpacaDisplayName
    ? `?alpaca=${encodeURIComponent(alpacaDisplayName)}`
    : ''
  const successUrl = `${SITE_BASE_URL}/${locale}/skein/thank-you${alpacaQueryParam}`
  const cancelUrl = `${SITE_BASE_URL}/${locale}/skein?cancelled=1`

  const currentYear = new Date().getFullYear()
  const productName = alpacaDisplayName
    ? `Skein sponsorship — ${alpacaDisplayName} (${currentYear})`
    : `Skein sponsorship — spring shearing (${currentYear})`

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // one-off, NOT subscription
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: SKEIN_SPONSORSHIP_PRICE_EUR * 100, // cents
            product_data: {
              name: productName,
              description: 'Spring shearing sponsorship. Spun wool ships in October.',
            },
          },
        },
      ],
      metadata: {
        product_type: 'skein-sponsorship',
        alpaca: alpacaSlug ?? '',
        skein_year: String(currentYear),
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

    log.info('Skein checkout session created', {
      sessionId: session.id,
      alpacaSlug,
      locale,
    })

    return attachRequestId(NextResponse.redirect(session.url, 303), reqId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Stripe session creation failed', { message })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to create checkout session', detail: message },
        { status: 502 },
      ),
      reqId,
    )
  }
}
