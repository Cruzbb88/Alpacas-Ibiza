import { NextResponse } from 'next/server'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyMollieStatusToken } from '@/lib/mollie-manage-token'
import { getFailureCount } from '@/lib/payment-failure-tracker'
import { SITE_BASE_URL } from '@/lib/config'
import { escapeHtml } from '@/lib/html'

/**
 * GET /api/mollie-manage/status?token=<status-signed-token>
 *
 * Read-only subscription summary for a donor. Renders an HTML page showing:
 *   - Tier + amount + interval
 *   - Status (active / pending / suspended / canceled)
 *   - Next charge date (when known)
 *   - Most recent successful charge
 *   - Most recent failed attempt (if any) + consecutive-fail count
 *   - Action buttons: Update payment / Cancel
 *
 * GET is safe to expose to link-scanners (no state mutation). Token-scoped to
 * 'status' so a cancel token cannot be replayed here and vice versa.
 *
 * Failure modes:
 *   - Missing/bad token → 400 with "Link invalid"
 *   - Expired token     → 410 with "Link expired"
 *   - Mollie API down   → 502 with "Try again" page
 *   - Otherwise         → 200 with status page
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
  main{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
  h1{color:#556B2F;font-size:26px;margin:0 0 8px}
  h2{font-size:16px;font-weight:600;color:#555;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.05em}
  a{color:#556B2F}
  .muted{color:#888;font-size:13px;margin-top:24px}
  .grid{display:grid;grid-template-columns:140px 1fr;gap:8px 16px;font-size:14px}
  .grid dt{color:#666}
  .grid dd{margin:0;font-weight:500}
  .badge{display:inline-block;padding:2px 10px;border-radius:99px;font-size:12px;font-weight:600;text-transform:uppercase}
  .badge.active{background:#dcedc8;color:#33691e}
  .badge.pending{background:#fff8e1;color:#7a5500}
  .badge.suspended{background:#ffccbc;color:#bf360c}
  .badge.canceled{background:#eceff1;color:#455a64}
  .actions{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
  .btn{display:inline-block;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600}
  .btn.primary{background:#556B2F;color:#fff}
  .btn.primary:hover{background:#445525}
  .btn.danger{background:#fff;color:#a44;border:1px solid #a44}
  .btn.danger:hover{background:#fff3f3}
  .alert{background:#fff8e1;border-left:4px solid #ffb300;padding:12px 14px;margin:16px 0;color:#7a5500;font-size:14px;border-radius:0 6px 6px 0}
</style>
</head>
<body><main>${body}<p class="muted">Alpacas Ibiza · <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> · <a href="${SITE_BASE_URL}">${SITE_BASE_URL}</a></p></main></body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function formatMolliDate(value: string | undefined | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })
  } catch {
    return value
  }
}

export async function GET(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-manage-status', reqId)

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!

  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return attachRequestId(htmlPage('Link invalid', `<h1>Link invalid</h1><p>This status link is missing the token. Please request a fresh management email from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`, 400), reqId)
  }

  const payload = verifyMollieStatusToken(token)
  if (!payload) {
    return attachRequestId(htmlPage(
      'Link expired',
      `<h1>This link has expired</h1><p>Status links are valid for 7 days. Request a fresh one from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`,
      410,
    ), reqId)
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
    nextPaymentDate?: string
    createdAt?: string
    canceledAt?: string | Date
    metadata?: { tier?: string; alpaca?: string }
  }

  let sub: SubscriptionLite
  try {
    const fetched = await mollie.customerSubscriptions.get(payload.subscriptionId, {
      customerId: payload.customerId,
    })
    sub = fetched as unknown as SubscriptionLite
  } catch (err) {
    log.error('Mollie customerSubscriptions.get failed', { message: err instanceof Error ? err.message : String(err) })
    return attachRequestId(htmlPage(
      'Status unavailable',
      `<h1>Couldn't fetch your subscription status</h1>
       <p>Something went wrong on Mollie's side. Please try again in a minute, or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> for help.</p>
       <p class="muted">Reference: <code>${escapeHtml(payload.subscriptionId)}</code></p>`,
      502,
    ), reqId)
  }

  const statusClass = sub.status === 'active' ? 'active'
    : sub.status === 'pending' ? 'pending'
    : sub.status === 'suspended' ? 'suspended'
    : 'canceled'

  // Build status-aware action buttons. Cancelled subs only show "back to site".
  const tokenEnc = encodeURIComponent(token)
  const isLive = sub.status === 'active' || sub.status === 'pending' || sub.status === 'suspended'
  const cancelUrl = isLive ? `${SITE_BASE_URL}/api/mollie-manage/cancel?token=` : null
  const updateUrl = isLive ? `${SITE_BASE_URL}/api/mollie-manage/update-payment?token=` : null
  const actions = isLive
    ? `<div class="actions">
         ${updateUrl ? `<a class="btn primary" href="${updateUrl}${tokenEnc}">Update payment method</a>` : ''}
         ${cancelUrl ? `<a class="btn danger" href="${cancelUrl}${tokenEnc}">Cancel adoption</a>` : ''}
       </div>`
    : `<div class="actions"><a class="btn primary" href="${SITE_BASE_URL}/en/adopt">Adopt again</a></div>`

  const failureCount = getFailureCount('mollie', payload.customerId)
  const failureAlert = failureCount >= 2
    ? `<div class="alert"><strong>We've had ${failureCount} failed payment attempts.</strong> Your adoption will pause if we can't collect soon. Please update your payment method using the button below.</div>`
    : ''

  const cancelInfo = sub.status === 'canceled'
    ? `<dt>Canceled at</dt><dd>${escapeHtml(formatMolliDate(typeof sub.canceledAt === 'string' ? sub.canceledAt : sub.canceledAt?.toISOString?.() ?? null))}</dd>`
    : ''

  return attachRequestId(htmlPage(
    'Your adoption',
    `<h1>Your adoption</h1>
     <p style="margin:0 0 8px"><span class="badge ${statusClass}">${escapeHtml(sub.status ?? 'unknown')}</span></p>
     <p style="color:#666;margin-bottom:16px">${escapeHtml(sub.description ?? 'Adopt-a-Paca')}</p>
     ${failureAlert}
     <h2>Subscription details</h2>
     <dl class="grid">
       <dt>Tier</dt><dd>${escapeHtml(sub.metadata?.tier ?? '—')}</dd>
       <dt>Amount</dt><dd>${escapeHtml(sub.amount ? `${sub.amount.value} ${sub.amount.currency}` : '—')}</dd>
       <dt>Interval</dt><dd>${escapeHtml(sub.interval ?? '—')}</dd>
       <dt>Next charge</dt><dd>${escapeHtml(formatMolliDate(sub.nextPaymentDate ?? null))}</dd>
       <dt>Adopted alpaca</dt><dd>${escapeHtml(sub.metadata?.alpaca ?? 'Pick for me')}</dd>
       <dt>Started</dt><dd>${escapeHtml(formatMolliDate(sub.createdAt ?? null))}</dd>
       ${cancelInfo}
     </dl>
     ${actions}
     <p class="muted" style="margin-top:16px">Need help? Reply to your welcome email or write to <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
    200,
  ), reqId)
}
