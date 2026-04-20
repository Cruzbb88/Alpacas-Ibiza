import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { subscribe } from '@/lib/newsletter'
import { verifyTurnstile } from '@/lib/turnstile'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, 'cf-turnstile-response': captchaToken } = body
    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
    const captcha = await verifyTurnstile(captchaToken, ip)
    if (!captcha.ok) {
      return NextResponse.json(
        { error: 'Captcha verification failed', reason: captcha.reason },
        { status: 400 }
      )
    }

    // attempt to subscribe to SendGrid list
    const result = await subscribe(email)
    if (!result.success) {
      console.warn('[newsletter] subscription failed', result.message)
      // still continue, maybe provider down
    }

    // notify owner of new signup
    await sendEmail({
      subject: `[Newsletter] New subscriber: ${email}`,
      html: `<p>New newsletter signup: <strong>${email}</strong></p>`,
    })

    // optionally send a confirmation to subscriber
    try {
      await sendEmail({
        to: email,
        subject: `You're subscribed!`,
        html: `<p>Thanks for subscribing to the Alpacas Ibiza newsletter. We'll keep you posted with farm news, new products, and special offers.</p>`,
      })
    } catch (subErr) {
      console.warn('[newsletter] confirmation email failed', subErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[newsletter] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
