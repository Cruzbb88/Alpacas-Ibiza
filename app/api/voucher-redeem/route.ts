import { NextResponse } from 'next/server'
import { checkPublicFormGuard } from '@/lib/public-form-guard'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { escapeHtml } from '@/lib/html'
import { sendEmail } from '@/lib/mailer'
import { getContactEmail } from '@/lib/validate-env'

/**
 * POST /api/voucher-redeem
 *
 * Scaffold voucher redemption endpoint. Validates a code against
 * VALID_VOUCHER_CODES (owner-set comma-separated env var).
 *
 * ANTI-ENUMERATION: always returns HTTP 200 with { ok: true }.
 * The `valid` field in the body tells the UI whether the code was
 * accepted, but the HTTP status never differs so scanners cannot
 * enumerate valid codes via status codes.
 *
 * If valid → emails the owner with the redemption attempt details.
 * If invalid → silently returns { ok: true, valid: false }.
 *
 * Security: honeypot + Turnstile + per-IP rate-limit via checkPublicFormGuard.
 *
 * Failsafe: always-200 anti-enumeration (mirrors billing-portal oracle pattern).
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('voucher-redeem', reqId)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    log.warn('malformed JSON body')
    // Still return 200 — anti-enumeration
    return attachRequestId(NextResponse.json({ ok: true, valid: false }), reqId)
  }

  // ── Guard stack: honeypot + IP rate-limit + Turnstile ────────────────────
  const guard = await checkPublicFormGuard(request, body, {
    routeName: 'voucher-redeem',
    honeypotField: 'business_name',
    rateLimitPerIp: { limit: 5, windowMs: 5 * 60_000 },
    requireTurnstile: true,
  })

  if (!guard.allowed) {
    // Anti-enumeration: always 200 even on honeypot / rate-limit / captcha fail
    log.warn('guard blocked', { reason: guard.reason })
    return attachRequestId(NextResponse.json({ ok: true, valid: false }), reqId)
  }

  // ── Extract and sanitise code ────────────────────────────────────────────
  const rawCode = typeof body.code === 'string' ? body.code.trim() : ''
  if (!rawCode || rawCode.length > 64) {
    return attachRequestId(NextResponse.json({ ok: true, valid: false }), reqId)
  }

  // ── Validate against owner-configured codes ──────────────────────────────
  const envCodes = process.env.VALID_VOUCHER_CODES ?? ''
  const validCodes = envCodes
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)

  const normalised = rawCode.toUpperCase()
  const isValid = validCodes.length > 0 && validCodes.includes(normalised)

  if (isValid) {
    // ── Notify owner of redemption attempt ────────────────────────────────
    const ownerEmail = getContactEmail()
    const safeCode = escapeHtml(rawCode)

    try {
      await sendEmail({
        to: ownerEmail,
        subject: `Voucher redeemed: ${safeCode}`,
        html: `
          <p>A voucher code was redeemed on the website.</p>
          <p><strong>Code:</strong> ${safeCode}</p>
          <p>The visitor has been shown success messaging and instructed to check their email for next steps.</p>
          <p>Please follow up manually to complete the redemption process until the full voucher system is built.</p>
        `,
      })
    } catch (err) {
      // Fail-quiet: owner notification failure does not affect the user response
      log.warn('owner notification failed after voucher redemption', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    log.info('voucher redeemed', { code: normalised })
    return attachRequestId(NextResponse.json({ ok: true, valid: true }), reqId)
  }

  // Invalid code — return success shape to prevent enumeration
  log.info('voucher not found', { codeLength: rawCode.length })
  return attachRequestId(NextResponse.json({ ok: true, valid: false }), reqId)
}
