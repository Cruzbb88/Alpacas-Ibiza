import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { verifyTurnstile } from '@/lib/turnstile'
import { detectHoneypot } from '@/lib/honeypot'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { escapeHtml, sanitizeHeader } from '@/lib/html'
import { isValidEmail } from '@/lib/validate-email'

const TO_EMAIL = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

export async function POST(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('contact', reqId)
    try {
        const body = await request.json()
        const { name, email, subject, message, 'cf-turnstile-response': captchaToken } = body

        // Cap input lengths server-side. Client form has its own limits but a
        // direct API caller could send a 10MB payload that bypasses all guards
        // until escapeHtml — wasted CPU + log noise. RFC 5321 email cap is 320.
        const MAX_NAME = 200, MAX_EMAIL = 320, MAX_SUBJ = 200, MAX_MSG = 4000
        if (
            (name && String(name).length > MAX_NAME) ||
            (email && String(email).length > MAX_EMAIL) ||
            (subject && String(subject).length > MAX_SUBJ) ||
            (message && String(message).length > MAX_MSG)
        ) {
            return attachRequestId(NextResponse.json({ error: 'Input too long' }, { status: 400 }), reqId)
        }

        if (detectHoneypot(body, 'company_url')) {
            log.warn('Bot submission blocked', { route: '/api/contact' })
            return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
        }

        if (!name || !email || !message) {
            return attachRequestId(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), reqId)
        }

        // IP rate-limit — 5 req / 5 min (blocks burst from a single IP)
        const ip = getClientIp(request)
        const ipResult = rateLimit({ key: `contact:${ip}`, limit: 5, windowMs: 5 * 60 * 1000 })
        if (!ipResult.allowed) {
            return attachRequestId(
                NextResponse.json({ error: 'Too many requests' }, {
                    status: 429,
                    headers: { 'Retry-After': String(Math.ceil(ipResult.resetMs / 1000)) },
                }),
                reqId
            )
        }

        const captcha = await verifyTurnstile(captchaToken, ip)
        if (!captcha.ok) {
            return attachRequestId(
                NextResponse.json(
                    { error: 'Captcha verification failed', reason: captcha.reason },
                    { status: 400 }
                ),
                reqId
            )
        }

        // XSS escape user-controlled fields before HTML interpolation (failsafe map CLAUDE.md).
        const safeName = escapeHtml(name)
        const safeEmail = escapeHtml(email)
        const safeSubject = escapeHtml(subject ?? '')
        const safeMessage = escapeHtml(message)
        // CRLF strip on header-bound values to block SMTP header injection.
        const headerName = sanitizeHeader(name)
        const headerSubject = subject ? sanitizeHeader(subject) : ''
        // replyTo regex validation — graceful degrade (omit if invalid).
        const validReplyTo = isValidEmail(email)

        await sendEmail({
            to: TO_EMAIL,
            ...(validReplyTo ? { replyTo: email } : {}),
            subject: headerSubject ? `[Contact] ${headerSubject}` : `[Contact] New message from ${headerName}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;width:120px">Name:</td><td style="padding:8px">${safeName}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr><td style="padding:8px;font-weight:bold">Subject:</td><td style="padding:8px">${safeSubject || '—'}</td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#f5f5dc;border-radius:8px">
            <strong>Message:</strong>
            <p style="white-space:pre-wrap;margin-top:8px">${safeMessage}</p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px">Sent via alpacasibiza.com contact form</p>
        </div>
      `,
        })

        // sendEmail will throw on error; if we reach here it succeeded

        return attachRequestId(NextResponse.json({ success: true }), reqId)
    } catch (err) {
        log.error('Unexpected error', { err: String(err) })
        return attachRequestId(NextResponse.json({ error: 'Internal server error' }, { status: 500 }), reqId)
    }
}
