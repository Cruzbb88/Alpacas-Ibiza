import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isValidEmail } from '@/lib/validate-email'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { escapeHtml, sanitizeHeader } from '@/lib/html'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { maskCustomerId } from '@/lib/log-pii'
import { checkPublicFormGuard } from '@/lib/public-form-guard'

/**
 * POST /api/gdpr-request
 *
 * Accepts a user's request for data export OR deletion under GDPR Articles
 * 15 (export) and 17 (deletion). Body: { type: 'export' | 'deletion', email,
 * details?, 'cf-turnstile-response': token, business_name: '' }
 *
 * The site doesn't have a customer DB yet, so this just emails the request to
 * the owner who must fulfill manually within 30 days (GDPR legal window).
 * When a DB is added later, this route gets a server-side fulfillment branch.
 *
 * Failsafes:
 *   - Rate-limit: 3 requests / hour per IP (legitimate users don't repeat)
 *   - Turnstile required
 *   - Honeypot
 *   - Email validation
 *   - 200 OK even on rate-limit (don't leak state)
 */

const TO_EMAIL = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('gdpr-request', reqId)

  // IP rate-limit first (original order preserved — different from other public forms)
  const ip = getClientIp(request)
  const rateResult = rateLimit({ key: `gdpr:${ip}`, limit: 3, windowMs: 60 * 60 * 1000 })
  if (!rateResult.allowed) {
    log.warn('rate-limited', { ip: ip.slice(0, 7) + '…' })
    return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }), reqId)
  }

  // Guard: honeypot → Turnstile (IP rate-limit already done above, skipIpRateLimit=true)
  const guard = await checkPublicFormGuard(request, body, {
    routeName: 'gdpr',
    honeypotField: 'business_name',
    skipIpRateLimit: true,
  })

  if (!guard.allowed) {
    if (guard.reason === 'honeypot') {
      log.warn('honeypot tripped')
      return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
    }
    // turnstile-failed — preserve original 400 shape
    return attachRequestId(
      NextResponse.json({ error: 'Captcha verification failed', reason: guard.captchaReason }, { status: 400 }),
      reqId,
    )
  }

  const type = body.type
  if (type !== 'export' && type !== 'deletion') {
    return attachRequestId(
      NextResponse.json({ error: 'type must be "export" or "deletion"' }, { status: 400 }),
      reqId,
    )
  }

  const email = body.email
  if (!isValidEmail(email)) {
    return attachRequestId(
      NextResponse.json({ error: 'Valid email required' }, { status: 400 }),
      reqId,
    )
  }

  const details = typeof body.details === 'string' ? body.details.slice(0, 2000) : ''
  const headerEmail = sanitizeHeader(email)
  const escapedEmail = escapeHtml(email)
  const escapedDetails = escapeHtml(details)
  const escapedType = type.toUpperCase()

  // Best-effort data-discovery for the owner email. This is NOT a deletion —
  // it just answers "what records exist for this email?" so the owner can
  // quickly find the IDs to act on within the 30-day Article 17 window. All
  // SDK calls wrapped in try/catch — a failure here must not break the
  // user-facing acknowledgement. Mollie iteration is capped at 200 (same
  // ceiling as /api/mollie-manage) to bound owner-facing latency.
  let mollieDiscovery = ''
  try {
    const apiKey = process.env.MOLLIE_API_KEY
    if (apiKey) {
      const mollie = await getMollieClient(apiKey)
      if (mollie) {
        const lowerEmail = email.toLowerCase()
        const hit = await mollie.customers.iterate({}).take(200).find(
          (c) => typeof c.email === 'string' && c.email.toLowerCase() === lowerEmail,
        )
        if (hit?.id) {
          mollieDiscovery = `<p><strong>Mollie customer found:</strong> <code>${escapeHtml(hit.id)}</code><br/>
            Delete via Mollie dashboard → Customers → ${escapeHtml(hit.id)} → Delete (cascades subscriptions).</p>`
          log.info('gdpr-request: mollie match', { customer: maskCustomerId(hit.id) })
        } else {
          mollieDiscovery = '<p><em>No Mollie customer found for this email (scanned latest 200).</em></p>'
        }
      }
    }
  } catch (err) {
    log.warn('mollie discovery failed', { err: String(err) })
    mollieDiscovery = '<p><em>Mollie discovery failed — check dashboard manually.</em></p>'
  }

  try {
    await sendEmail({
      to: TO_EMAIL,
      replyTo: headerEmail,
      subject: `[GDPR ${escapedType}] Request from ${headerEmail}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">GDPR ${escapedType} request</h2>
          <p><strong>Request type:</strong> ${escapedType === 'EXPORT' ? 'Data export (Article 15)' : 'Data deletion (Article 17)'}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapedEmail}">${escapedEmail}</a></p>
          ${details ? `<p><strong>Additional details:</strong></p><p style="white-space:pre-wrap">${escapedDetails}</p>` : ''}
          <hr />
          <h3 style="color:#556B2F;font-size:14px">Data discovery</h3>
          ${mollieDiscovery}
          <p><em>Stripe / FareHarbor / Resend / GA still require manual lookup — see
          <code>docs/gdpr-deletion-runbook.md</code>.</em></p>
          <hr />
          <p style="color:#888;font-size:12px">
            Legal deadline: respond within 30 days (GDPR Articles 12, 15, 17).
            Reply directly to the requester at the email above when fulfilled.
          </p>
          <p style="color:#888;font-size:10px">Request ID: ${reqId}</p>
        </div>
      `,
    })
  } catch (err) {
    log.error('email send failed', { err: String(err) })
    return attachRequestId(
      NextResponse.json({ error: 'Could not deliver request — please email info@alpacasibiza.com directly' }, { status: 500 }),
      reqId,
    )
  }

  log.info('GDPR request received', { type: escapedType, email_first4: email.slice(0, 4) + '…' })
  return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
}
