import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { verifyTurnstile } from '@/lib/turnstile'

const TO_EMAIL = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, description, 'cf-turnstile-response': captchaToken } = body

        if (!name || !email || !description) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
        const captcha = await verifyTurnstile(captchaToken, ip)
        if (!captcha.ok) {
            return NextResponse.json(
                { error: 'Captcha verification failed', reason: captcha.reason },
                { status: 400 }
            )
        }

        await sendEmail({
            to: TO_EMAIL,
            replyTo: email,
            subject: `[Commission Inquiry] New request from ${name}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#556B2F">✨ New Commission Inquiry</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;font-weight:bold;width:120px">Name:</td><td style="padding:8px">${name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold">Email:</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#f5f5dc;border-radius:8px">
            <strong>Project Description:</strong>
            <p style="white-space:pre-wrap;margin-top:8px">${description}</p>
          </div>
          <p style="color:#888;font-size:12px;margin-top:24px">Sent via alpacasibiza.com commission form</p>
        </div>
      `,
        })

        // success if we get here

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[commission] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
