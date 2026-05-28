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

  // Find Mollie customer by email. Mollie's API has no email filter, so we
  // walk the customer list via the SDK's async iterator (HelpfulIterator,
  // supports .find directly). Owners growing past ~500 customers should
  // migrate to a DB-backed lookup. The iterator paginates internally; the
  // cap below stops scanning past 1k records to bound wall-clock.
  const lowerEmail = email.toLowerCase()
  let customerId: string | null = null
  try {
    const hit = await mollie.customers.iterate({}).take(1000).find(
      (c) => typeof c.email === 'string' && c.email.toLowerCase() === lowerEmail,
    )
    customerId = hit?.id ?? null
  } catch (err) {
    log.error('Mollie customers.iterate failed', { message: err instanceof Error ? err.message : String(err) })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  if (!customerId) {
    log.info('mollie-manage: no customer for email', { email_first4: email.slice(0, 4) + '…' })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  // List the donor's subscriptions and keep those they can still self-cancel.
  // 'active' = currently auto-charging. 'pending' = SEPA mandate being
  // confirmed (1-3 days for first SEPA); donors in buyer's-remorse during
  // mandate setup must be able to cancel BEFORE the first pull. Anything else
  // (canceled, suspended, completed) is excluded — nothing to cancel.
  const cancellableStatuses = new Set(['active', 'pending'])
  const cancellableSubs: Array<{ id: string; amount: { value: string; currency: string }; interval: string; status: string }> = []
  try {
    for await (const sub of mollie.customerSubscriptions.iterate({ customerId }).take(100)) {
      if (sub.status && cancellableStatuses.has(sub.status)) {
        cancellableSubs.push({
          id: sub.id,
          amount: sub.amount,
          interval: sub.interval,
          status: sub.status,
        })
      }
    }
  } catch (err) {
    log.error('Mollie customerSubscriptions.iterate failed', { message: err instanceof Error ? err.message : String(err) })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  if (cancellableSubs.length === 0) {
    log.info('mollie-manage: no cancellable subs for customer', { customerId })
    return attachRequestId(GENERIC_OK(), reqId)
  }
  const activeSubs = cancellableSubs

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
