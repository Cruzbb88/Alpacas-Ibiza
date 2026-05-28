import { NextResponse } from 'next/server'
import { SITE_BASE_URL } from '@/lib/config'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyTurnstile } from '@/lib/turnstile'
import { detectHoneypot } from '@/lib/honeypot'
import { rateLimit, rateLimitByEmail, getClientIp } from '@/lib/rate-limit'
import { isValidEmail } from '@/lib/validate-email'
import { sendEmail } from '@/lib/mailer'
import { buildMollieManageEmail } from '@/lib/email-templates'
import { signMollieCancelToken } from '@/lib/mollie-manage-token'

/**
 * POST /api/mollie-manage
 *
 * Mollie equivalent of /api/billing-portal. Mollie has no hosted billing
 * portal — donors can't self-serve through a Mollie-branded page. We replace
 * that with a token-gated cancel link emailed to the address the donor enters.
 *
 * Accepts: { email: string; locale?: string; 'cf-turnstile-response'?: string }
 * Returns: ALWAYS `{ ok: true }` 200 on any valid input.
 *
 * Privacy: response shape NEVER differs between subscriber vs non-subscriber
 * (same email-oracle closure as the Stripe billing-portal route). Cancel links
 * are delivered via email side-channel only.
 *
 * Defence layers:
 *   1. MOLLIE_API_KEY gate — 503 if unset (fail-CLOSED).
 *   2. Honeypot `website` field — silent 200 on bot.
 *   3. IP rate limit — 3 req / 5 min per IP.
 *   4. Per-email rate limit — 2 req / 1 hour.
 *   5. Turnstile bot check.
 *   6. Email side-channel — cancel link only leaves via the donor's inbox.
 *
 * Fail-CLOSED on the env gate. Fail-QUIET on everything else.
 */

const GENERIC_OK = () => NextResponse.json({ ok: true }, { status: 200 })

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-manage', reqId)

  const apiKeyGate = requireEnvOrReturn503(
    'MOLLIE_API_KEY',
    'Subscription portal is unavailable — contact info@alpacasibiza.com to manage your subscription.',
    { code: 'MOLLIE_NOT_CONFIGURED' },
  )
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!

  let body: { email?: string; locale?: string; 'cf-turnstile-response'?: string; website?: string } = {}
  try {
    body = await request.json()
  } catch {
    return attachRequestId(GENERIC_OK(), reqId)
  }
  const { email, 'cf-turnstile-response': captchaToken } = body

  if (detectHoneypot(body, 'website')) {
    log.warn('Bot submission blocked', { route: '/api/mollie-manage' })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  const ip = getClientIp(request)
  const ipResult = rateLimit({ key: `mollie-manage:${ip}`, limit: 3, windowMs: 5 * 60 * 1000 })
  if (!ipResult.allowed) {
    log.warn('IP rate limit hit', { ip, retryAfterSec: Math.ceil(ipResult.resetMs / 1000) })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  if (!email || !isValidEmail(email)) {
    return attachRequestId(GENERIC_OK(), reqId)
  }

  const emailResult = rateLimitByEmail({ email, limit: 2, windowMs: 60 * 60 * 1000 })
  if (!emailResult.allowed) {
    log.warn('email rate limit hit', {
      email_first4: email.slice(0, 4) + '…',
      retryAfterSec: Math.ceil(emailResult.resetMs / 1000),
    })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  const captcha = await verifyTurnstile(captchaToken, ip)
  if (!captcha.ok) {
    log.warn('Turnstile failed', { reason: captcha.reason })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('mollie SDK not installed. Run: pnpm add @mollie/api-client')
    return attachRequestId(GENERIC_OK(), reqId)
  }

  // Find Mollie customer by email. Mollie's list/get APIs don't filter by email
  // server-side — we iterate, capped at 250 for safety. Owners with that many
  // customers should migrate to a DB-backed lookup before scaling further.
  let customerId: string | null = null
  try {
    const customers = await mollie.customers.list({ limit: 250 })
    const hit = (customers ?? []).find(
      (c: { email?: string }) => typeof c.email === 'string' && c.email.toLowerCase() === email.toLowerCase(),
    )
    customerId = hit?.id ?? null
  } catch (err) {
    log.error('Mollie customers.list failed', { message: err instanceof Error ? err.message : String(err) })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  if (!customerId) {
    log.info('mollie-manage: no customer for email', { email_first4: email.slice(0, 4) + '…' })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  // List active subscriptions for that customer. Anything not 'active' is
  // silently filtered — donor can't cancel something already canceled.
  let activeSubs: Array<{ id: string; amount: { value: string; currency: string }; interval: string; status: string }> = []
  try {
    const subs = await mollie.customers_subscriptions.list({ customerId, limit: 50 })
    activeSubs = (subs ?? []).filter((s: { status?: string }) => s.status === 'active')
  } catch (err) {
    log.error('Mollie subscriptions.list failed', { message: err instanceof Error ? err.message : String(err) })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  if (activeSubs.length === 0) {
    log.info('mollie-manage: no active subs for customer', { customerId })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  try {
    const { subject, html } = buildMollieManageEmail({
      subscriptions: activeSubs.map(s => {
        const token = signMollieCancelToken(customerId!, s.id)
        return {
          id: s.id,
          amount: `${s.amount.value} ${s.amount.currency}`,
          interval: s.interval,
          cancelUrl: `${SITE_BASE_URL}/api/mollie-manage/cancel?token=${encodeURIComponent(token)}`,
        }
      }),
    })
    await sendEmail({ to: email, subject, html })
  } catch (err) {
    log.error('sendEmail failed for mollie-manage link', { message: err instanceof Error ? err.message : String(err) })
    // Still return generic 200 — never reveal that customer existed but email failed.
  }

  return attachRequestId(GENERIC_OK(), reqId)
}
