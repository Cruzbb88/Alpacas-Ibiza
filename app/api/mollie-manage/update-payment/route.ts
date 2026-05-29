import { NextResponse } from 'next/server'
import { getMollieClient, getMollieWebhookUrl } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyMollieUpdatePaymentToken } from '@/lib/mollie-manage-token'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { SITE_BASE_URL } from '@/lib/config'
import { escapeHtml } from '@/lib/html'

/**
 * /api/mollie-manage/update-payment?token=<update-payment-signed-token>
 *
 * SEPA re-mandate flow split into GET (confirmation form, no side effects)
 * and POST (creates the Mollie first-payment + redirects to checkout).
 *
 * The GET-side-effect previous version was a vulnerability: corporate link
 * scanners (Outlook Safe-Links, Mimecast, Proofpoint) pre-fetch URLs in
 * inbound mail, which would silently create an orphaned Mollie payment and
 * 303 the scanner to the Mollie checkout. The two-step pattern matches
 * /api/mollie-manage/cancel.
 *
 *   GET  → renders confirmation form, no Mollie API calls.
 *   POST → verifies token, calls mollie.payments.create() with
 *          metadata.action='update-payment' + seedSubscriptionId, then
 *          303-redirects to Mollie's hosted checkout.
 *
 * Rate-limited at 5 req / 60 s per IP to bound the cost of a leaked-token
 * replay attack (each POST creates a Mollie payment, hitting our API quota
 * and accumulating orphan payment objects).
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
  form{margin-top:24px}
  button.primary{background:#556B2F;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
  button.primary:hover{background:#445525}
  a.cancel{display:inline-block;margin-left:12px;color:#888;font-size:14px}
</style>
</head>
<body><main>${body}<p class="muted">Alpacas Ibiza · <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> · <a href="${SITE_BASE_URL}">${SITE_BASE_URL}</a></p></main></body>
</html>`
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
}

/**
 * GET — confirmation form only. Safe for link-scanners (Outlook Safe-Links,
 * Mimecast, Proofpoint, antivirus prefetch). No Mollie API calls.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return htmlPage(
      'Link invalid',
      `<h1>Link invalid</h1><p>This update-payment link is missing the token. Please request a fresh management email from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`,
      400,
    )
  }
  const payload = verifyMollieUpdatePaymentToken(token)
  if (!payload) {
    return htmlPage(
      'Link expired',
      `<h1>This link has expired</h1><p>Update-payment links are valid for 7 days. Request a fresh one from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`,
      410,
    )
  }

  const action = `${SITE_BASE_URL}/api/mollie-manage/update-payment`
  return htmlPage(
    'Update your payment method',
    `<h1>Update your payment method</h1>
     <p>We'll redirect you to Mollie's secure checkout so you can confirm a new SEPA mandate (or pay by card / iDEAL / Bancontact).</p>
     <p>You'll see a charge for the next month's adoption amount — this is the standard mandate-confirmation. Your existing subscription will continue charging automatically from this new payment method going forward.</p>
     <form method="POST" action="${action}">
       <input type="hidden" name="token" value="${escapeAttr(token)}" />
       <button type="submit" class="primary">Continue to secure checkout</button>
       <a class="cancel" href="${SITE_BASE_URL}/en/adopt">Not now</a>
     </form>`,
    200,
  )
}

/**
 * POST — actually creates the Mollie first-payment. Rate-limited.
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-manage-update-payment', reqId)

  // Rate-limit BEFORE any Mollie API call so an attacker with a stolen token
  // cannot burn our quota.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `mollie-update-payment:${ip}`, limit: 5, windowMs: 60_000 })
  if (!rl.allowed) {
    log.warn('IP rate limit hit', { ip, retryAfterSec: Math.ceil(rl.resetMs / 1000) })
    return attachRequestId(htmlPage(
      'Too many attempts',
      `<h1>Too many attempts</h1><p>Please wait a minute and try again, or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
      429,
    ), reqId)
  }

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!
  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET!

  // CSRF: confirm same-origin posting. POSTs from any other origin (rogue
  // cross-site form replaying a stolen token) get rejected.
  const origin = request.headers.get('origin')
  if (origin && origin !== SITE_BASE_URL) {
    log.warn('Cross-origin POST blocked', { origin })
    return attachRequestId(htmlPage('Blocked', `<h1>Blocked</h1><p>This request did not originate from alpacasibiza.com.</p>`, 400), reqId)
  }

  let token: string | null = null
  try {
    const form = await request.formData()
    const t = form.get('token')
    if (typeof t === 'string' && t.length > 0) token = t
  } catch {
    // body not form-encoded
  }
  if (!token) token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return attachRequestId(htmlPage('Link invalid', `<h1>Link invalid</h1><p>Token missing. Please request a fresh management email from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`, 400), reqId)
  }

  const payload = verifyMollieUpdatePaymentToken(token)
  if (!payload) {
    log.warn('Update-payment token invalid or expired')
    return attachRequestId(htmlPage('Link expired', `<h1>This link has expired</h1><p>Update-payment links are valid for 7 days. Request a fresh one from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`, 410), reqId)
  }

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('mollie SDK not installed')
    return attachRequestId(htmlPage('Service unavailable', `<h1>Service temporarily unavailable</h1><p>Please try again shortly or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`, 503), reqId)
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

  // Reject re-mandate attempts on subscriptions that are already canceled —
  // the patch would 422 from Mollie and Mollie would retry the webhook for 18h.
  if (sub.status === 'canceled') {
    return attachRequestId(htmlPage(
      'Subscription is already canceled',
      `<h1>This subscription is already canceled</h1><p>If you'd like to re-enrol, you can <a href="${SITE_BASE_URL}/en/adopt">start a new adoption</a> or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
      400,
    ), reqId)
  }

  const returnUrl = `${SITE_BASE_URL}/en/adopt?mandate=updated`
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
