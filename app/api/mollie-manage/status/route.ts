import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import {
  verifyMollieStatusToken,
  signMollieCancelToken,
  signMollieUpdatePaymentToken,
} from '@/lib/mollie-manage-token'
import { getFailureCount } from '@/lib/payment-failure-tracker'
import { SITE_BASE_URL } from '@/lib/config'
import { escapeHtml } from '@/lib/html'
import { htmlMollieManagePage } from '@/lib/mollie-html-response'

const STATUS_CSS = `
  h1{font-size:26px;margin:0 0 8px}
  h2{font-size:16px;font-weight:600;color:#555;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.05em}
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
`.trim()

function htmlPage(title: string, body: string, status: number) {
  return htmlMollieManagePage(title, body, status, {
    extraCss: STATUS_CSS,
    mainMaxWidthPx: 640,
  })
}

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
  //
  // CRITICAL: reusing the status-scoped token for the cancel/update buttons would
  // fail scope verification on the destination endpoint (each scope is locked).
  // Sign fresh action-scoped tokens server-side using the customerId + subscriptionId
  // from the already-verified status payload. Short TTL (1h) — the donor just
  // clicked through from the manage email; they should act on these buttons now,
  // not park them in a tab for a week. Original cancel/update links from the
  // manage email still carry the canonical 7-day TTL.
  const isLive = sub.status === 'active' || sub.status === 'pending' || sub.status === 'suspended'
  const oneHourMs = 60 * 60 * 1000
  const cancelTokenEnc = isLive
    ? encodeURIComponent(signMollieCancelToken(payload.customerId, payload.subscriptionId, oneHourMs))
    : null
  const updateTokenEnc = isLive
    ? encodeURIComponent(signMollieUpdatePaymentToken(payload.customerId, payload.subscriptionId, oneHourMs))
    : null
  const actions = isLive
    ? `<div class="actions">
         ${updateTokenEnc ? `<a class="btn primary" href="${SITE_BASE_URL}/api/mollie-manage/update-payment?token=${updateTokenEnc}">Update payment method</a>` : ''}
         ${cancelTokenEnc ? `<a class="btn danger" href="${SITE_BASE_URL}/api/mollie-manage/cancel?token=${cancelTokenEnc}">Cancel adoption</a>` : ''}
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
