export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { PaymentReceipt } from '@/components/donor-portal/receipt-pdf'
import type { ReceiptProps, ReceiptLineItem } from '@/components/donor-portal/receipt-pdf'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitiseDisplayName } from '@/lib/html'
import { alpacasibiza } from '@/lib/tenants/alpacasibiza'

// ── ID format guards ─────────────────────────────────────────────────────────
/** Stripe checkout session IDs */
const STRIPE_SESSION_RE = /^cs_(test_|live_)?[A-Za-z0-9]+$/
/** Mollie payment IDs */
const MOLLIE_PAYMENT_RE = /^tr_[A-Za-z0-9]+$/

type IdKind = 'stripe' | 'mollie'

function classifyId(id: string): IdKind | null {
  if (STRIPE_SESSION_RE.test(id)) return 'stripe'
  if (MOLLIE_PAYMENT_RE.test(id)) return 'mollie'
  return null
}

// ── Zero-decimal currencies (Stripe canonical list) ───────────────────────
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
])

/**
 * Format a Stripe minor-unit amount (cents) to a display string.
 * Zero-decimal currencies pass through unchanged.
 */
function formatStripeAmount(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor == null) return '—'
  const cur = (currency ?? 'eur').toLowerCase()
  if (ZERO_DECIMAL_CURRENCIES.has(cur)) return String(amountMinor)
  return (amountMinor / 100).toFixed(2)
}

// ── Dynamic PDF renderer import ──────────────────────────────────────────────
async function importReactPdf() {
  try {
    return await import('@react-pdf/renderer')
  } catch {
    return null
  }
}

// ── Business identity from tenant config ─────────────────────────────────────
const BUSINESS_NAME = alpacasibiza.legalName
const BUSINESS_ADDRESS = [
  alpacasibiza.address.streetAddress,
  alpacasibiza.address.addressLocality,
  alpacasibiza.address.postalCode,
  alpacasibiza.address.addressCountry,
].join(', ')
// CIF is confirmed in tenant config — null-safe, omitted from PDF if absent
const BUSINESS_VAT_OR_CIF: string | null = alpacasibiza.cif ?? null

// ── Receipt number derivation ────────────────────────────────────────────────
function receiptNumber(id: string): string {
  return `R-${id.slice(-8).toUpperCase()}`
}

// ── Issued date formatting ────────────────────────────────────────────────────
function formatIssuedDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  // ID format guard — reject anything that isn't a recognised payment identifier
  const idKind = classifyId(sessionId)
  if (!idKind) {
    return NextResponse.json({ code: 'INVALID_SESSION_ID' }, { status: 400 })
  }

  // Rate limit: 20 reads per IP per 5 minutes
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `donor-receipt:${ip}`, limit: 20, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    )
  }

  // PDF renderer — fail-closed if package is missing
  const pdfLib = await importReactPdf()
  if (!pdfLib) {
    console.warn('[donor-receipt] @react-pdf/renderer missing — returning 503')
    return NextResponse.json({ ok: false, code: 'PDF_SDK_MISSING' }, { status: 503 })
  }

  // ── Build receipt props from the appropriate payment provider ────────────
  let receiptProps: ReceiptProps

  try {
    if (idKind === 'stripe') {
      receiptProps = await buildStripeReceipt(sessionId)
    } else {
      receiptProps = await buildMollieReceipt(sessionId)
    }
  } catch (err) {
    // Anti-oracle: never leak whether a payment ID exists — always 404
    console.warn('[donor-receipt] payment fetch failed', err instanceof Error ? err.message : String(err))
    return NextResponse.json({ code: 'SESSION_NOT_FOUND' }, { status: 404 })
  }

  // ── Render PDF ─────────────────────────────────────────────────────────────
  try {
    const element = React.createElement(PaymentReceipt, receiptProps) as unknown as React.ReactElement<DocumentProps>
    const stream = await pdfLib.renderToStream(element)
    const filename = `receipt-${receiptProps.receiptNumber}.pdf`

    // @ts-expect-error renderToStream returns a Node.js Readable; Response accepts it on Node runtime
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (err) {
    console.error('[donor-receipt] PDF render error', err)
    return NextResponse.json({ ok: false, code: 'PDF_RENDER_ERROR' }, { status: 500 })
  }
}

// ── Stripe path ───────────────────────────────────────────────────────────────
async function buildStripeReceipt(sessionId: string): Promise<ReceiptProps> {
  const { importStripe } = await import('@/lib/integrations/stripe-sdk')
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    throw new Error('STRIPE_SDK_MISSING')
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_UNCONFIGURED')
  }

  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })
  // Expand customer + subscription + line_items for the full receipt picture
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'subscription', 'line_items'],
  })

  if (session.payment_status !== 'paid') throw new Error('SESSION_NOT_PAID')

  const rawDonorName =
    session.customer_details?.name ??
    (session.customer && typeof session.customer === 'object' && 'name' in session.customer
      ? (session.customer as { name?: string | null }).name
      : null) ??
    'Donor'
  // Cap at 80 chars and strip HTML/control chars — attacker can craft a Stripe
  // session with 5000-char metadata that would render a giant text block in react-pdf.
  const donorName = sanitiseDisplayName(rawDonorName) ?? 'Donor'

  const donorEmail =
    session.customer_details?.email ??
    (session.customer && typeof session.customer === 'object' && 'email' in session.customer
      ? (session.customer as { email?: string | null }).email
      : null) ??
    ''

  const tier = (session.metadata?.tier === 'yearly' ? 'yearly' : 'monthly') as 'monthly' | 'yearly'
  const rawAlpacaSlug = session.metadata?.alpaca ?? null
  // Cap alpaca name — also comes from attacker-controlled Stripe session metadata.
  const alpacaSlug = rawAlpacaSlug ? (sanitiseDisplayName(rawAlpacaSlug) ?? null) : null
  const currency = (session.currency ?? 'eur').toUpperCase()
  const amountFormatted = `${formatStripeAmount(session.amount_total, session.currency)} ${currency}`

  const lineItems: ReceiptLineItem[] = [{
    description: tier === 'yearly' ? 'Yearly adoption sponsorship' : 'Monthly adoption sponsorship',
    date: formatIssuedDate(new Date()),
    amount: amountFormatted,
  }]

  return {
    receiptNumber: receiptNumber(sessionId),
    issuedDate: formatIssuedDate(new Date()),
    donorName,
    donorEmail,
    tier,
    alpacaName: alpacaSlug,
    lineItems,
    totalPaid: amountFormatted,
    currency,
    businessName: BUSINESS_NAME,
    businessAddress: BUSINESS_ADDRESS,
    businessVatOrCif: BUSINESS_VAT_OR_CIF,
  }
}

// ── Mollie path ────────────────────────────────────────────────────────────────
async function buildMollieReceipt(paymentId: string): Promise<ReceiptProps> {
  const { getMollieClient } = await import('@/lib/integrations/payment-mollie')

  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) {
    throw new Error('MOLLIE_UNCONFIGURED')
  }

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    throw new Error('MOLLIE_SDK_MISSING')
  }

  const payment = await mollie.payments.get(paymentId)

  if (payment.status !== 'paid') throw new Error('PAYMENT_NOT_PAID')

  // payment.details is a discriminated union across payment methods — not all
  // variants have consumerName. Cast through unknown at the deliberate subset
  // boundary to read the field when present without muting a real type error.
  const detailsAny = payment.details as unknown as Record<string, string | undefined> | undefined
  const rawDonorNameMollie =
    (payment.billingAddress as { organizationName?: string } | undefined)?.organizationName
    ?? detailsAny?.['consumerName']
    ?? 'Donor'
  // Cap at 80 chars and strip HTML/control chars — same attack surface as Stripe path.
  const donorName = sanitiseDisplayName(rawDonorNameMollie) ?? 'Donor'

  // payment.metadata is typed as `{}` by the Mollie SDK — the actual runtime
  // shape is whatever was stored at checkout. Cast to a known minimal shape.
  const meta = payment.metadata as unknown as {
    donorEmail?: string
    tier?: string
    alpaca?: string
  } | undefined

  const donorEmail: string = meta?.donorEmail ?? ''

  const tier: 'monthly' | 'yearly' = meta?.tier === 'yearly' ? 'yearly' : 'monthly'
  const rawAlpacaSlugMollie: string | null = meta?.alpaca ?? null
  // Cap alpaca name — comes from attacker-controlled Mollie payment metadata.
  const alpacaSlug: string | null = rawAlpacaSlugMollie
    ? (sanitiseDisplayName(rawAlpacaSlugMollie) ?? null)
    : null
  const currency = (payment.amount?.currency ?? 'EUR').toUpperCase()
  const amountStr = payment.amount?.value ?? '0.00'
  const amountFormatted = `${amountStr} ${currency}`

  const paidAt = payment.paidAt ? new Date(payment.paidAt) : new Date()

  const lineItems: ReceiptLineItem[] = [{
    description: tier === 'yearly' ? 'Yearly adoption sponsorship' : 'Monthly adoption sponsorship',
    date: formatIssuedDate(paidAt),
    amount: amountFormatted,
  }]

  return {
    receiptNumber: receiptNumber(paymentId),
    issuedDate: formatIssuedDate(new Date()),
    donorName,
    donorEmail,
    tier,
    alpacaName: alpacaSlug,
    lineItems,
    totalPaid: amountFormatted,
    currency,
    businessName: BUSINESS_NAME,
    businessAddress: BUSINESS_ADDRESS,
    businessVatOrCif: BUSINESS_VAT_OR_CIF,
  }
}
