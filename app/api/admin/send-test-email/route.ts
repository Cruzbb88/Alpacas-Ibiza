/**
 * POST /api/admin/send-test-email
 *
 * Sends a real test email via Resend so the owner can verify the
 * RESEND_API_KEY + domain-verification are working end-to-end.
 *
 * Auth:      getServerSession(auth) gate — 401 if no session (admin only)
 * Rate:      5 attempts per hour per IP (in-memory, process-scoped)
 * Fail-CLOSED if RESEND_API_KEY is unset → 503 RESEND_UNCONFIGURED
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { sendEmail } from '@/lib/mailer'
import { isValidEmail } from '@/lib/validate-email'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const DEFAULT_RECIPIENT = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

export async function POST(request: Request): Promise<NextResponse> {
  // ── Auth gate ────────────────────────────────────────────────────────────
  const session = await getServerSession(auth)
  if (!session) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
  }

  // ── Fail-CLOSED: RESEND_API_KEY must be present ──────────────────────────
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, code: 'RESEND_UNCONFIGURED' },
      { status: 503 },
    )
  }

  // ── Rate limit: 5 per hour per IP ────────────────────────────────────────
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `send-test-email:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) },
      },
    )
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    // empty body is fine — we fall back to CONTACT_EMAIL
  }

  const rawTo = typeof body.to === 'string' ? body.to.trim() : DEFAULT_RECIPIENT
  const to = isValidEmail(rawTo) ? rawTo : DEFAULT_RECIPIENT

  // ── Build test email ─────────────────────────────────────────────────────
  const sentAt = new Date().toISOString()
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Alpacas Ibiza — test email</title></head>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:40px auto;padding:0 24px;color:#111827">
  <h1 style="font-size:22px;font-weight:800;margin-bottom:8px">Alpacas Ibiza — test email</h1>
  <p style="color:#6b7280;font-size:14px;margin-bottom:24px">
    This message confirms that <strong>Resend</strong> is configured correctly
    and the <code>RESEND_API_KEY</code> environment variable is active.
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr>
      <td style="padding:8px 0;color:#6b7280;width:120px">Sent at</td>
      <td style="padding:8px 0;font-weight:600">${sentAt}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#6b7280">Recipient</td>
      <td style="padding:8px 0;font-weight:600">${to}</td>
    </tr>
  </table>
  <p style="margin-top:32px;font-size:12px;color:#9ca3af">
    Sent from the Alpacas Ibiza admin panel. If you did not request this,
    you can safely ignore it.
  </p>
</body>
</html>
`.trim()

  // ── Send ─────────────────────────────────────────────────────────────────
  try {
    await sendEmail({
      subject: 'Alpacas Ibiza — test email',
      html,
      to,
    })

    return NextResponse.json({ ok: true, sentAt })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[send-test-email] Resend error:', message)
    return NextResponse.json(
      { ok: false, code: 'SEND_FAILED' },
      { status: 502 },
    )
  }
}
