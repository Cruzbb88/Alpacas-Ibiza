import { NextResponse } from 'next/server'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isEmbeddedCheckout } from '@/lib/checkout-mode'

/**
 * POST /api/mollie-checkout/confirm
 *
 * Defence-in-depth verification for the Mollie embedded checkout flow. After
 * mollie.createToken() resolves client-side and the donor submits the
 * Components form, EmbeddedMollieCheckout POSTs `{ paymentId, token? }` here
 * so the server re-fetches the Payment from Mollie's authenticated API and
 * confirms its status === 'paid' before flipping the UI to the thank-you
 * state.
 *
 * The webhook (/api/mollie-webhook) remains the source of truth for downstream
 * effects: welcome email, subscription provisioning, owner notification. This
 * route is a UX safety belt — it prevents showing "success" if Mollie's JS SDK
 * lies (network race, rogue tampering, method that requires further action).
 *
 * The `token` field is accepted for API parity with Mollie Components' token
 * model but is informational only: a Mollie payment's status comes from the
 * authenticated `payments.get()` call, never the client SDK's claim. We
 * pattern-validate it (`tkn_xxx` or `card_xxx`) but do not pass it back to
 * Mollie — the token has already been consumed when createToken() resolved.
 *
 * Fail-CLOSED behaviour matches /api/mollie-checkout/intent:
 *   - CHECKOUT_MODE !== 'embedded'  → 404
 *   - MOLLIE_API_KEY unset          → 503
 *   - @mollie/api-client missing    → 503 MOLLIE_SDK_MISSING
 *   - 5 req / 1 min IP burst        → 429 (higher than intent because the page
 *                                     may legitimately poll on slow networks)
 *   - Mollie API error              → 502
 *   - Anything else                 → { ok: false, status }
 */

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-checkout-confirm', reqId)

  if (!isEmbeddedCheckout()) {
    return attachRequestId(
      NextResponse.json({ error: 'Not found' }, { status: 404 }),
      reqId,
    )
  }

  const ip = getClientIp(request)
  const rl = rateLimit({ key: `mollie-checkout-confirm:${ip}`, limit: 5, windowMs: 60 * 1000 })
  if (!rl.allowed) {
    log.warn('IP rate-limit hit', { ip, retryAfterSec: Math.ceil(rl.resetMs / 1000) })
    return attachRequestId(
      NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
      ),
      reqId,
    )
  }

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!

  let paymentId: string | null = null
  try {
    const body = await request.json()
    if (typeof body?.paymentId === 'string') {
      // Mollie payment IDs follow `tr_<alphanum>` (transactions) or
      // `sub_<alphanum>` (subscriptions). Mirrors the regex in
      // lib/integrations/payment-mollie.ts verifyWebhook.
      if (/^(tr|sub)_[A-Za-z0-9]+$/.test(body.paymentId)) {
        paymentId = body.paymentId
      }
    }
    // `token` is parsed and pattern-validated but never trusted as proof of
    // payment — payments.get() is the only authoritative source. We accept it
    // so the client can POST the Components SDK's createToken() result for
    // diagnostic logging without us having to retro-spec the contract.
    if (typeof body?.token === 'string' && !/^(tkn|card|tok)_[A-Za-z0-9]+$/.test(body.token)) {
      log.warn('confirm received malformed token — ignoring (status fetch authoritative)')
    }
  } catch {
    return attachRequestId(NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }), reqId)
  }
  if (!paymentId) {
    return attachRequestId(
      NextResponse.json({ error: 'paymentId required' }, { status: 400 }),
      reqId,
    )
  }

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('mollie SDK not installed.')
    return attachRequestId(
      NextResponse.json(
        { error: 'Payment SDK not installed', code: 'MOLLIE_SDK_MISSING' },
        { status: 503 },
      ),
      reqId,
    )
  }

  try {
    const payment = (await mollie.payments.get(paymentId)) as unknown as { id: string; status: string }
    const ok = payment.status === 'paid'
    log.info('Mollie Payment verified', { id: payment.id, status: payment.status, ok })
    return attachRequestId(
      NextResponse.json({ ok, status: payment.status }),
      reqId,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('Mollie Payment retrieval failed', { message })
    return attachRequestId(
      NextResponse.json(
        { error: 'Failed to verify Mollie Payment', detail: message },
        { status: 502 },
      ),
      reqId,
    )
  }
}
