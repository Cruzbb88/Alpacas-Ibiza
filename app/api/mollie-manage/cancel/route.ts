import type { MollieClient } from '@mollie/api-client'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyMollieCancelToken } from '@/lib/mollie-manage-token'
import { handleMollieSubscriptionCanceled } from '@/lib/payment-handlers'
import { sendEmail } from '@/lib/mailer'
import { SITE_BASE_URL } from '@/lib/config'
import { htmlMollieManagePage } from '@/lib/mollie-html-response'
import { isSameOriginPost } from '@/lib/same-origin-guard'

const CANCEL_CSS = `
  button.danger{background:#a44;color:#fff;border:0;padding:12px 24px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
  button.danger:hover{background:#933}
`.trim()

function htmlPage(title: string, body: string, status: number) {
  return htmlMollieManagePage(title, body, status, { extraCss: CANCEL_CSS })
}

/**
 * /api/mollie-manage/cancel?token=<signed-token>
 *
 * Two-step cancel flow to defeat email link-scanner replay attacks (Outlook
 * Safe-Links, Mimecast, Proofpoint, antivirus pre-fetch). The token-bearing
 * URL is a CAPABILITY — without this confirmation step a scanner pre-fetching
 * the link cancels the donor's subscription before they consciously click.
 *
 *   GET  → renders an HTML confirmation page with a POST form (no side-effect).
 *   POST → verifies token, calls mollie.customerSubscriptions.cancel(),
 *          notifies the owner, renders the success page.
 *
 * Failure modes (both methods):
 *   - Missing/bad token  → 400 with "Link invalid or expired" page.
 *   - Mollie API error   → 502 with "Try again or email us" page.
 *
 * Renders inline HTML so the donor sees confirmation directly (no JSON dump).
 */

async function fetchMollieCustomer(
  customerId: string,
  mollie: MollieClient | null,
): Promise<{ email: string | null; name: string | null }> {
  if (!mollie) return { email: null, name: null }
  try {
    const customer = await mollie.customers.get(customerId)
    return {
      email: typeof customer?.email === 'string' ? customer.email : null,
      name: typeof customer?.name === 'string' ? customer.name : null,
    }
  } catch {
    return { email: null, name: null }
  }
}

/**
 * GET — confirmation form only. No mutation. Safe for link-scanners to hit.
 * The donor must click "Yes, cancel my adoption" which fires POST below.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return htmlPage('Link invalid', `<h1>Link invalid</h1><p>This cancel link is missing the token. Please request a fresh management email from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`, 400)
  }

  const payload = verifyMollieCancelToken(token)
  if (!payload) {
    return htmlPage(
      'Link expired',
      `<h1>This link has expired</h1><p>Cancel links are valid for 7 days. Request a fresh one from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>, or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`,
      410,
    )
  }

  const action = `${SITE_BASE_URL}/api/mollie-manage/cancel`
  return htmlPage(
    'Confirm cancellation',
    `<h1>Cancel your adoption?</h1>
     <p>You're about to stop your monthly Alpacas Ibiza adoption. We'll cancel the recurring SEPA charge and you won't be billed again.</p>
     <p>Any perks you've already received (certificate, photoshoot, fertilizer shipments, tour credits) are yours to keep.</p>
     <form method="POST" action="${action}">
       <input type="hidden" name="token" value="${escapeAttr(token)}" />
       <button type="submit" class="danger">Yes, cancel my adoption</button>
       <a class="cancel" href="${SITE_BASE_URL}/en/adopt">Keep my adoption</a>
     </form>`,
    200,
  )
}

/**
 * POST — the actual cancel. Triggered only by the donor's explicit form click
 * (and not by passive link-scanners that follow GET URLs).
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-manage-cancel', reqId)

  // CSRF defence: see lib/same-origin-guard.ts header for rationale.
  if (!isSameOriginPost(request)) {
    log.warn('Cross-origin POST blocked', { origin: request.headers.get('origin') })
    return attachRequestId(htmlPage('Blocked', `<h1>Blocked</h1><p>This request did not originate from alpacasibiza.com.</p>`, 400), reqId)
  }

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!

  // Token can arrive via form body OR query string (form posts copy it from
  // the GET URL — accept either so prefilled forms keep working).
  let token: string | null = null
  try {
    const form = await request.formData()
    const t = form.get('token')
    if (typeof t === 'string' && t.length > 0) token = t
  } catch {
    // body not form-encoded — fall through to query string.
  }
  if (!token) token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return attachRequestId(htmlPage('Link invalid', `<h1>Link invalid</h1><p>This cancel link is missing the token. Please request a fresh management email from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>.</p>`, 400), reqId)
  }

  const payload = verifyMollieCancelToken(token)
  if (!payload) {
    log.warn('Cancel token invalid or expired')
    return attachRequestId(htmlPage('Link expired', `<h1>This link has expired</h1><p>Cancel links are valid for 7 days. Request a fresh one from the <a href="${SITE_BASE_URL}/en/adopt#manage">adoption page</a>, or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`, 410), reqId)
  }

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('mollie SDK not installed')
    return attachRequestId(htmlPage('Service unavailable', `<h1>Service temporarily unavailable</h1><p>Please try again shortly or email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a>.</p>`, 503), reqId)
  }

  try {
    // SDK signature: cancel(id, {customerId}) — id positional first, NOT
    // `cancel({customerId, id})` as the previous code did. The any-cast hid this.
    // The SDK declares cancel(id, params) -> Promise<Subscription> | void (callback
    // overload). Cast through unknown to pin the Promise overload + the loose
    // shape we read from (canceledAt's runtime shape varies by SDK version).
    const cancelled = (await mollie.customerSubscriptions.cancel(payload.subscriptionId, {
      customerId: payload.customerId,
    })) as unknown as {
      canceledAt?: string | Date
      metadata?: { product?: string; tier?: string; seedPaymentId?: string } | null
    } | undefined
    log.info('subscription canceled', { customerId: payload.customerId, subscriptionId: payload.subscriptionId })

    try {
      const cancelledAtIso =
        cancelled?.canceledAt instanceof Date
          ? cancelled.canceledAt.toISOString()
          : typeof cancelled?.canceledAt === 'string'
            ? cancelled.canceledAt
            : new Date().toISOString()
      await handleMollieSubscriptionCanceled(
        {
          id: payload.subscriptionId,
          customerId: payload.customerId,
          status: 'canceled',
          canceledAt: cancelledAtIso,
          metadata: cancelled?.metadata ?? { product: 'adopt-a-paca' },
        },
        {
          sendEmail,
          fetchCustomer: (id) => fetchMollieCustomer(id, mollie),
          ownerEmail: process.env.CONTACT_EMAIL,
        },
      )
    } catch (notifyErr) {
      log.warn('Owner notification failed; cancel already succeeded', { err: String(notifyErr) })
    }

    return attachRequestId(htmlPage(
      'Adoption canceled',
      `<h1>Your adoption is canceled</h1>
       <p>We've stopped your monthly SEPA charge. No further payments will be taken.</p>
       <p>You'll keep any perks you've already received this year — your certificate, photoshoot, and remaining farm-tour bookings still stand.</p>
       <p>If you cancelled by mistake, email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> and we'll re-enrol you.</p>`,
      200,
    ), reqId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Mollie subscription cancel failed', { message })
    return attachRequestId(htmlPage(
      'Cancel failed',
      `<h1>We couldn't cancel automatically</h1>
       <p>Mollie returned an error. Email <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> and we'll cancel manually within 24 hours.</p>
       <p class="muted">Reference: <code>${escapeText(payload.subscriptionId)}</code></p>`,
      502,
    ), reqId)
  }
}

function escapeAttr(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
}
function escapeText(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c))
}
