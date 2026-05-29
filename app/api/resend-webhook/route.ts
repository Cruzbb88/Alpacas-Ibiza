import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { suppressEmail } from '@/lib/email-suppression'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

/**
 * POST /api/resend-webhook
 *
 * Receives Resend webhook events (https://resend.com/docs/dashboard/webhooks).
 * We listen for two events that matter for sender reputation:
 *
 *   - `email.bounced` (hard bounce only — `bounce_type === 'hard'`) →
 *     add recipient to suppression. Future sends are skipped by lib/mailer.ts.
 *
 *   - `email.complained` → add recipient to suppression with `complaint`
 *     reason (stronger than hard-bounce — never overridable except by manual
 *     admin unsuppress).
 *
 * Soft bounces are NOT suppressed — Resend retries them internally and
 * blocking the recipient would lose legitimate sends to e.g. temporarily-
 * full mailboxes.
 *
 * Signature verification
 * ----------------------
 * Resend uses Svix-style signing. Headers we read:
 *   svix-id, svix-timestamp, svix-signature
 *
 * `svix-signature` is a space-separated list of `v1,<base64-hmac>` pairs
 * (Svix supports multiple versions for key rotation). We compute the
 * expected HMAC and constant-time-compare against EVERY listed signature.
 *
 * Fail-CLOSED on missing/wrong signature → 401. Fail-CLOSED on missing env
 * var → 503 (Cruz hasn't wired the secret yet; better to refuse than to
 * silently accept unverified bounces).
 *
 * Fail-QUIET on every internal error after signature passes — Resend retries
 * on non-2xx. Returning 500 because a single bad payload would re-trigger
 * the same bad payload forever.
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('resend-webhook', reqId)

  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    log.warn('RESEND_WEBHOOK_SECRET unset — refusing webhook (fail-CLOSED).')
    return attachRequestId(
      NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 }),
      reqId,
    )
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignatureHeader = request.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignatureHeader) {
    return attachRequestId(
      NextResponse.json({ error: 'Missing svix headers' }, { status: 401 }),
      reqId,
    )
  }

  // Replay-window guard. Svix recommends ±5 minutes; we use the same window.
  const timestampSec = parseInt(svixTimestamp, 10)
  if (!Number.isFinite(timestampSec)) {
    return attachRequestId(
      NextResponse.json({ error: 'Malformed svix-timestamp' }, { status: 401 }),
      reqId,
    )
  }
  const nowSec = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSec - timestampSec) > 5 * 60) {
    log.warn('svix-timestamp outside replay window', { skewSec: nowSec - timestampSec })
    return attachRequestId(
      NextResponse.json({ error: 'Timestamp outside replay window' }, { status: 401 }),
      reqId,
    )
  }

  const rawBody = await request.text()

  // Svix signing format: HMAC-SHA256 of `${svixId}.${svixTimestamp}.${rawBody}`.
  // Secret is base64 with a "whsec_" prefix to strip.
  const cleanSecret = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`
  let expectedDigest: Buffer
  try {
    const keyBuf = Buffer.from(cleanSecret, 'base64')
    expectedDigest = createHmac('sha256', keyBuf).update(signedPayload).digest()
  } catch (err) {
    log.error('HMAC computation failed', { err: String(err) })
    return attachRequestId(
      NextResponse.json({ error: 'Signature verification failed' }, { status: 401 }),
      reqId,
    )
  }

  // svix-signature header is space-separated `v1,<base64>` pairs. Compare
  // expected against each — constant-time, length-checked.
  const candidates = svixSignatureHeader
    .split(' ')
    .map((entry) => entry.trim())
    .filter((entry) => entry.startsWith('v1,'))
    .map((entry) => entry.slice('v1,'.length))

  const matched = candidates.some((candidate) => {
    let candidateBuf: Buffer
    try {
      candidateBuf = Buffer.from(candidate, 'base64')
    } catch {
      return false
    }
    if (candidateBuf.length !== expectedDigest.length) return false
    return timingSafeEqual(candidateBuf, expectedDigest)
  })

  if (!matched) {
    log.warn('No svix-signature candidate matched')
    return attachRequestId(
      NextResponse.json({ error: 'Signature verification failed' }, { status: 401 }),
      reqId,
    )
  }

  // ── Signature verified — parse event ─────────────────────────────────────
  let event: { type?: string; data?: { email?: string; to?: string[]; bounce?: { type?: string } } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    log.warn('Invalid JSON body (signature was valid)')
    // Fail-quiet so Resend doesn't retry: a malformed body would just re-fail.
    return attachRequestId(NextResponse.json({ ok: true, ignored: 'invalid-json' }), reqId)
  }

  const eventType = event.type
  // Resend payloads put recipient in `data.to: string[]` or sometimes `data.email`.
  const recipient =
    (Array.isArray(event.data?.to) && event.data.to[0]) ||
    (typeof event.data?.email === 'string' ? event.data.email : '')

  if (!recipient || recipient.length === 0) {
    log.warn('Event has no recipient', { eventType })
    return attachRequestId(NextResponse.json({ ok: true, ignored: 'no-recipient' }), reqId)
  }

  switch (eventType) {
    case 'email.bounced': {
      // Only suppress HARD bounces — soft bounces are transient.
      const bounceType = event.data?.bounce?.type
      if (bounceType === 'hard') {
        suppressEmail(recipient, 'hard-bounce')
        log.info('Suppressed (hard-bounce)', { recipient_first4: recipient.slice(0, 4) + '…' })
      } else {
        log.info('Soft bounce — NOT suppressed', { bounceType })
      }
      break
    }
    case 'email.complained': {
      suppressEmail(recipient, 'complaint')
      log.info('Suppressed (complaint)', { recipient_first4: recipient.slice(0, 4) + '…' })
      break
    }
    default:
      // Other event types (delivered, opened, clicked, etc.) — ack but no action.
      log.info('Acked non-suppression event', { eventType })
  }

  return attachRequestId(NextResponse.json({ ok: true }), reqId)
}
