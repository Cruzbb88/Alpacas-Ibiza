import { NextResponse } from 'next/server'
import { molliePaymentProvider } from '@/lib/integrations/payment-mollie'
import { SITE_BASE_URL } from '@/lib/config'
import { isAdoptTier, type AdoptTier } from '@/lib/payment-vendor'
import { extractLocaleFromReferer, requireEnvOrReturn503 } from '@/lib/route-helpers'
import { isValidEmail } from '@/lib/validate-email'
import { getRequestId, attachRequestId } from '@/lib/request-id'
import { findAlpacaName } from '@/lib/data/alpacas'

/** ISO yyyy-mm-dd date pattern for gift_send_date validation. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Mollie metadata values — truncate to 500 chars each. */
function capAt500(s: string): string {
  return s.slice(0, 500)
}

interface GiftFields {
  recipientEmail: string
  recipientName: string
  senderName: string
  message: string
  sendDate?: string
}

/**
 * Parse and validate gift_* params from a flat string map.
 * Returns GiftFields when required fields are valid; null drops the whole block.
 */
function parseGiftFields(
  raw: Record<string, string | null | undefined>,
): GiftFields | null {
  const recipientEmail = (raw.gift_recipient_email ?? '').trim()
  const recipientName = (raw.gift_recipient_name ?? '').trim()
  const senderName = (raw.gift_sender_name ?? '').trim()
  const message = capAt500((raw.gift_message ?? '').trim())
  const sendDate = (raw.gift_send_date ?? '').trim()

  if (!isValidEmail(recipientEmail)) return null
  if (recipientName.length === 0) return null
  // Require at least a 2-character message. Empty string is otherwise truthy
  // and renders as empty quote marks in the gift welcome email. 2 chars is the
  // shortest meaningful gift message ("xx", "💚", "❤️" etc).
  if (message.length < 2) return null
  // Validate sendDate is parseable + within Resend's scheduledAt 30-day cap.
  // A gift date >30 days out would be silently rejected by Resend and the
  // recipient would never get the email. Treat invalid → "send today".
  let validSendDate: string | undefined
  if (sendDate && ISO_DATE_RE.test(sendDate)) {
    const parsed = new Date(`${sendDate}T00:00:00Z`)
    const now = Date.now()
    const maxSchedule = now + 30 * 24 * 60 * 60 * 1000
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() <= maxSchedule && parsed.getTime() >= now - 24 * 60 * 60 * 1000) {
      validSendDate = sendDate
    }
  }

  return {
    recipientEmail: capAt500(recipientEmail),
    recipientName: capAt500(recipientName),
    senderName: capAt500(senderName),
    message,
    ...(validSendDate ? { sendDate: validSendDate } : {}),
  }
}

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
  const reqId = getRequestId(request)

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)

  let tier: AdoptTier | null = null
  let customerEmail: string | undefined
  let alpacaSlugRaw: string | null = null
  let giftFields: GiftFields | null = null
  if (method === 'GET') {
    const url = new URL(request.url)
    const raw = url.searchParams.get('tier')
    if (isAdoptTier(raw)) tier = raw
    alpacaSlugRaw = url.searchParams.get('alpaca')
    giftFields = parseGiftFields({
      gift_recipient_email: url.searchParams.get('gift_recipient_email'),
      gift_recipient_name: url.searchParams.get('gift_recipient_name'),
      gift_sender_name: url.searchParams.get('gift_sender_name'),
      gift_message: url.searchParams.get('gift_message'),
      gift_send_date: url.searchParams.get('gift_send_date'),
    })
  } else {
    try {
      const body = (await request.json()) as Record<string, unknown>
      if (isAdoptTier(body?.tier)) tier = body.tier
      if (typeof body?.email === 'string' && isValidEmail(body.email)) {
        customerEmail = body.email
      }
      if (typeof body?.alpaca === 'string') alpacaSlugRaw = body.alpaca
      giftFields = parseGiftFields({
        gift_recipient_email: typeof body?.gift_recipient_email === 'string' ? body.gift_recipient_email : undefined,
        gift_recipient_name: typeof body?.gift_recipient_name === 'string' ? body.gift_recipient_name : undefined,
        gift_sender_name: typeof body?.gift_sender_name === 'string' ? body.gift_sender_name : undefined,
        gift_message: typeof body?.gift_message === 'string' ? body.gift_message : undefined,
        gift_send_date: typeof body?.gift_send_date === 'string' ? body.gift_send_date : undefined,
      })
    } catch {
      return attachRequestId(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), reqId)
    }
  }
  if (!tier) {
    return attachRequestId(NextResponse.json({ error: 'tier must be "monthly" or "yearly"' }, { status: 400 }), reqId)
  }
  const alpacaSlug = findAlpacaName(alpacaSlugRaw) ? alpacaSlugRaw! : undefined

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
    alpacaSlug,
    ...(giftFields
      ? {
          gift: {
            recipientEmail: giftFields.recipientEmail,
            recipientName: giftFields.recipientName,
            senderName: giftFields.senderName,
            message: giftFields.message,
            sendDate: giftFields.sendDate,
          },
        }
      : {}),
  })

  if ('unconfigured' in result) {
    return attachRequestId(
      NextResponse.json(
        {
          error: 'Payment provider not configured',
          code: 'MOLLIE_UNCONFIGURED',
          fallbackUrl: result.fallbackUrl,
        },
        { status: 503 },
      ),
      reqId
    )
  }

  if (method === 'GET') return attachRequestId(NextResponse.redirect(result.url, 303), reqId)
  return attachRequestId(NextResponse.json({ url: result.url }), reqId)
}
