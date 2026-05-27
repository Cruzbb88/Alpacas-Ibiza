import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { verifyTurnstile } from '@/lib/turnstile'
import { detectHoneypot } from '@/lib/honeypot'
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

        if (detectHoneypot(body, 'company_url')) {
            log.warn('Bot submission blocked', { route: '/api/contact' })
            return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
        }

        if (!name || !email || !message) {
            return attachRequestId(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), reqId)
        }

        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
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
