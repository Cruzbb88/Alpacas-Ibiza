import { NextResponse } from 'next/server'
import { getMollieClient, getMollieWebhookUrl } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyMollieUpdatePaymentToken } from '@/lib/mollie-manage-token'
import { SITE_BASE_URL } from '@/lib/config'
import { escapeHtml } from '@/lib/html'

/**
 * GET /api/mollie-manage/update-payment?token=<update-payment-signed-token>
 *
 * Re-mandate flow. Mollie has no "update payment method" subscription patch —
 * the donor has to confirm a new SEPA mandate. The recommended pattern:
 *
 *   1. Create a new Payment with sequenceType='first' on the existing
 *      customerId. The amount matches the subscription's current charge so
 *      the donor doesn't see a surprise €0.01 verification line.
 *   2. Mollie redirects the donor to a hosted checkout where they confirm
 *      the SEPA mandate (or pay by card, which Mollie also accepts).
 *   3. On payment.paid for this new first-payment, the webhook handler reads
 *      `metadata.seedSubscriptionId` + `metadata.action === 'update-payment'`
 *      and PATCHes the existing subscription's mandateId to the new payment's
 *      mandateId — future auto-charges flow through the new mandate.
 *
 * If the new payment fails, the subscription stays on the broken mandate
 * (no worse than before). The donor can retry from the same email link
 * until the 7-day TTL expires.
 *
 * Failure modes:
 *   - Missing/bad token → 400 with "Link invalid" page
 *   - Expired token     → 410 with "Link expired" page
 *   - Mollie API down   → 502 with "Try again" page
 *   - Otherwise         → 303 redirect to Mollie checkout
 */

function htmlPage(title: string, body: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title} — Alpacas Ibiza</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<style>
  body{font-family:system-ui,sans-serif;background:#f9f9f9;color:#2d2d2d;margin:0;padding:48px 24px;line-height:1.5}
  main{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  h1{color:#556B2F;font-size:24px;margin:0 0 16px}
  a{color:#556B2F}
  .muted{color:#888;font-size:13px;margin-top:24px}
</style>
</head>
<body><main>${body}<p class="muted">Alpacas Ibiza · <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> · <a href="${SITE_BASE_URL}">${SITE_BASE_URL}</a></p></main></body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-manage-update-payment', reqId)

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET!

  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return attachRequestId(htmlPage(
      'Link invalid',
      `<h1>Link invalid</h1><p>This update-payment link is missing the token. Please request a fresh management email from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`,
      400,
    ), reqId)
  }

  const payload = verifyMollieUpdatePaymentToken(token)
  if (!payload) {
    return attachRequestId(htmlPage(
      'Link expired',
      `<h1>This link has expired</h1><p>Update-payment links are valid for 7 days. Request a fresh one from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`,
      410,
    ), reqId)
  }

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('mollie SDK not installed')
    return attachRequestId(htmlPage(
      'Service unavailable',
      `<h1>Service temporarily unavailable</h1><p>Please try again shortly or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
      503,
    ), reqId)
  }

  type SubscriptionLite = {
    id: string
    status?: string
    amount?: { value: string; currency: string }
    interval?: string
    description?: string
    metadata?: { product?: string; tier?: string; tenantId?: string; alpaca?: string }
  }

  let sub: SubscriptionLite
  try {
    sub = (await mollie.customerSubscriptions.get(payload.subscriptionId, {
      customerId: payload.customerId,
    })) as unknown as SubscriptionLite
  } catch (err) {
    log.error('Mollie customerSubscriptions.get failed', { message: err instanceof Error ? err.message : String(err) })
    return attachRequestId(htmlPage(
      'Subscription not found',
      `<h1>Subscription not found</h1><p>We couldn't look up that subscription. Email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> and we'll sort it out.</p>`,
      502,
    ), reqId)
  }

  if (!sub.amount) {
    return attachRequestId(htmlPage(
      'Cannot update right now',
      `<h1>Cannot update right now</h1><p>Subscription is missing pricing information. Please email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
      502,
    ), reqId)
  }

  // Build a new first-payment that establishes a fresh mandate on the same
  // customer. The webhook handler will see `metadata.action === 'update-payment'`
  // + `metadata.seedSubscriptionId` and patch the existing sub's mandateId.
  const returnUrl = `${SITE_BASE_URL}/api/mollie-manage/status?token=${encodeURIComponent(token)}`
  try {
    const paymentArgs = {
      amount: sub.amount,
      description: `${sub.description ?? 'Adopt-a-Paca'} — payment method update`,
      redirectUrl: returnUrl,
      webhookUrl: getMollieWebhookUrl(webhookSecret),
      customerId: payload.customerId,
      sequenceType: 'first',
      metadata: {
        product: 'adopt-a-paca',
        tier: sub.metadata?.tier ?? 'monthly',
        tenantId: sub.metadata?.tenantId ?? 'alpacasibiza',
        // The two flags the webhook handler keys off to perform the patch.
        action: 'update-payment',
        seedSubscriptionId: payload.subscriptionId,
        ...(sub.metadata?.alpaca ? { alpaca: sub.metadata.alpaca } : {}),
      },
    }
    const payment = (await mollie.payments.create(
      paymentArgs as unknown as Parameters<typeof mollie.payments.create>[0],
    )) as unknown as {
      id: string
      getCheckoutUrl?: () => string | undefined
      _links?: { checkout?: { href?: string } }
    }
    const checkoutUrl =
      typeof payment.getCheckoutUrl === 'function'
        ? payment.getCheckoutUrl()
        : payment._links?.checkout?.href
    if (!checkoutUrl) {
      log.error('Mollie payment created but no checkout URL returned', { paymentId: payment.id })
      return attachRequestId(htmlPage(
        'Cannot update right now',
        `<h1>Cannot update right now</h1><p>Mollie didn't return a checkout URL. Please try again or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
        502,
      ), reqId)
    }
    log.info('update-payment first-payment created', { paymentId: payment.id, subscriptionId: payload.subscriptionId })
    return NextResponse.redirect(checkoutUrl, 303)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Mollie payments.create failed for update-payment', { message })
    return attachRequestId(htmlPage(
      'Cannot update right now',
      `<h1>Cannot update right now</h1>
       <p>Mollie returned an error. Please try again in a minute, or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>
       <p class="muted">Reference: <code>${escapeHtml(payload.subscriptionId)}</code></p>`,
      502,
    ), reqId)
  }
}
