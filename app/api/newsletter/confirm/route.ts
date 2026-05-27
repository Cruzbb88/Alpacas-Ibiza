/**
 * GET /api/newsletter/confirm?token=<signed-token>
 *
 * Double opt-in step 2: verify HMAC token → subscribe to SendGrid → redirect.
 *
 * Responses:
 *   303 → /newsletter-confirmed?email=...   (valid token, subscription created)
 *   410 Gone                                (valid sig, but expired)
 *   400 Bad Request                         (invalid signature or malformed token)
 *
 * Failsafes:
 *   - HMAC verified with safeEqual (timing-safe) before any action taken
 *   - SendGrid failure is logged + non-fatal (confirmation page still shown)
 *   - Never returns 500 on a bad token — that would be a success oracle
 */
import { NextResponse } from 'next/server'
import { subscribe } from '@/lib/newsletter'
import { verifyNewsletterToken, isExpiredNewsletterToken } from '@/lib/newsletter-token'
import { escapeHtml } from '@/lib/html'
import { SITE_BASE_URL } from '@/lib/config'
import { sendEmail } from '@/lib/mailer'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''

  // Attempt verification first
  const payload = verifyNewsletterToken(token)

  if (!payload) {
    // Distinguish expired (410) from tampered/invalid (400)
    const expired = token.length > 0 && isExpiredNewsletterToken(token)
    if (expired) {
      return new NextResponse(
        expiredHtml(),
        { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }
    return new NextResponse(
      invalidHtml(),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  // Valid token — subscribe to SendGrid
  const result = await subscribe(payload.email)
  if (!result.success) {
    console.warn('[newsletter/confirm] SendGrid subscribe failed:', result.message)
    // Non-fatal — still confirm to user; operator can re-process
  }

  // Notify owner of new confirmed subscriber
  try {
    await sendEmail({
      subject: `[Newsletter] New confirmed subscriber: ${payload.email}`,
      html: `<p>Newsletter double opt-in confirmed for: <strong>${escapeHtml(payload.email)}</strong></p>`,
    })
  } catch (notifyErr) {
    console.warn('[newsletter/confirm] owner notification failed:', notifyErr)
  }

  // Redirect to confirmation landing page
  const confirmed = new URL(`${SITE_BASE_URL}/newsletter-confirmed`)
  confirmed.searchParams.set('email', payload.email)

  return NextResponse.redirect(confirmed.toString(), { status: 303 })
}

function expiredHtml(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Link Expired</title>
<style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#333}
h1{color:#AD561A}a{color:#556B2F}</style></head><body>
<h1>Link expired</h1>
<p>This confirmation link has expired (links are valid for 7 days).</p>
<p>Please <a href="${escapeHtml(SITE_BASE_URL)}/#newsletter">resubscribe</a> to get a fresh link.</p>
</body></html>`
}

function invalidHtml(): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invalid Link</title>
<style>body{font-family:sans-serif;max-width:480px;margin:80px auto;padding:0 16px;color:#333}
h1{color:#AD561A}a{color:#556B2F}</style></head><body>
<h1>Invalid confirmation link</h1>
<p>This link is not valid. It may have been copied incorrectly.</p>
<p>Please <a href="${escapeHtml(SITE_BASE_URL)}/#newsletter">subscribe again</a> to receive a new link.</p>
</body></html>`
}
