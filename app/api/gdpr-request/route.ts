import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimit } from '@/lib/rate-limit'
import { isValidEmail } from '@/lib/validate-email'
import { detectHoneypot } from '@/lib/honeypot'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { escapeHtml } from '@/lib/html'

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

  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown'

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

  // Honeypot
  if (detectHoneypot(body, 'business_name')) {
    log.warn('honeypot tripped')
    return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
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

  const captchaToken = body['cf-turnstile-response']
  const captcha = await verifyTurnstile(typeof captchaToken === 'string' ? captchaToken : null, ip)
  if (!captcha.ok) {
    return attachRequestId(
      NextResponse.json({ error: 'Captcha verification failed', reason: captcha.reason }, { status: 400 }),
      reqId,
    )
  }

  const details = typeof body.details === 'string' ? body.details.slice(0, 2000) : ''
  const escapedEmail = escapeHtml(email)
  const escapedDetails = escapeHtml(details)
  const escapedType = type.toUpperCase()

  try {
    await sendEmail({
      to: TO_EMAIL,
      replyTo: email,
      subject: `[GDPR ${escapedType}] Request from ${escapedEmail}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">GDPR ${escapedType} request</h2>
          <p><strong>Request type:</strong> ${escapedType === 'EXPORT' ? 'Data export (Article 15)' : 'Data deletion (Article 17)'}</p>
          <p><strong>Email:</strong> <a href="mailto:${escapedEmail}">${escapedEmail}</a></p>
          ${details ? `<p><strong>Additional details:</strong></p><p style="white-space:pre-wrap">${escapedDetails}</p>` : ''}
          <hr />
          <p style="color:#888;font-size:12px">
            Legal deadline: respond within 30 days (GDPR Articles 12, 15, 17). Without a customer DB,
            data sources to check: Resend (newsletter subscribers, email log), FareHarbor (booking history
            if API access is set up), Google Analytics (anonymized), Stripe / Mollie (Adopt-a-Paca
            subscribers if any). Reply directly to the requester at the email above.
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
