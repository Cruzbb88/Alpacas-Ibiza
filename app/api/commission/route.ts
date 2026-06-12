import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { escapeHtml, sanitizeHeader } from '@/lib/html'
import { isValidEmail } from '@/lib/validate-email'
import { checkPublicFormGuard } from '@/lib/public-form-guard'

const TO_EMAIL = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

export async function POST(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('commission', reqId)
    try {
        const body = await request.json()
        const { name, email, description } = body

        // Guard: honeypot → IP rate-limit → Turnstile
        // honeypot returns 200, rate-limit returns 429, Turnstile returns 400.
        const guard = await checkPublicFormGuard(request, body, {
            routeName: 'commission',
            honeypotField: 'phone_extension',
            rateLimitPerIp: { limit: 5, windowMs: 5 * 60_000 },
        })

        if (!guard.allowed) {
            if (guard.reason === 'honeypot') {
                log.warn('Bot submission blocked', { route: '/api/commission' })
                return attachRequestId(NextResponse.json({ success: true }, { status: 200 }), reqId)
            }
            if (guard.reason === 'rate-limit-ip') {
                return attachRequestId(
                    NextResponse.json({ error: 'Too many requests' }, {
                        status: 429,
                        headers: { 'Retry-After': String(Math.ceil((guard.ipResetMs ?? 0) / 1000)) },
                    }),
                    reqId,
                )
            }
            // turnstile-failed
            return attachRequestId(
                NextResponse.json(
                    { error: 'Captcha verification failed', reason: guard.captchaReason },
                    { status: 400 },
                ),
                reqId,
            )
        }

        if (!name || !email || !description) {
            return attachRequestId(NextResponse.json({ error: 'Missing required fields' }, { status: 400 }), reqId)
        }

        const safeName = escapeHtml(name)
        const safeEmail = escapeHtml(email)
        const safeDescription = escapeHtml(description)
        const headerName = sanitizeHeader(name)
        const validReplyTo = isValidEmail(email)

        await sendEmail({
            to: TO_EMAIL,
            ...(validReplyTo ? { replyTo: email } : {}),
            subject: `[Commission Inquiry] New request from ${headerName}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">✨ New Commission Inquiry</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;width:120px">Name:</td><td style="padding:8px">${safeName}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#f5f5dc;border-radius:8px">
            <strong>Project Description:</strong>
            <p style="white-space:pre-wrap;margin-top:8px">${safeDescription}</p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px">Sent via alpacasibiza.com commission form</p>
        </div>
      `,
        })

        // success if we get here

        return attachRequestId(NextResponse.json({ success: true }), reqId)
    } catch (err) {
        log.error('Unexpected error', { err: String(err) })
        return attachRequestId(NextResponse.json({ error: 'Internal server error' }, { status: 500 }), reqId)
    }
}
