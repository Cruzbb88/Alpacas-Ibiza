/**
 * Public-form guard stack — shared by contact, commission, waitlist, gdpr-request.
 *
 * Runs: honeypot → IP rate-limit → per-email rate-limit (optional) →
 *       Turnstile/reCAPTCHA.
 *
 * CRITICAL: this helper returns a VERDICT only. Each route is responsible for
 * its own Response shape and status codes so the existing failsafe contracts
 * (honeypot → 200, rate-limit → 429 or 200, Turnstile → 400 or 200) remain
 * exactly as they were before extraction.
 */

import { detectHoneypot } from '@/lib/honeypot'
import { rateLimit, rateLimitByEmail, getClientIp } from '@/lib/rate-limit'
import { verifyHumanToken } from '@/lib/turnstile'

export interface PublicFormGuardOpts {
  /** e.g. 'contact' — used as rate-limit key prefix */
  routeName: string
  /** hidden field name: 'company_url' | 'phone_extension' | 'business_name' */
  honeypotField: string
  /** default: { limit: 5, windowMs: 5 * 60_000 } */
  rateLimitPerIp?: { limit: number; windowMs: number }
  /** Set true when the caller already ran IP rate-limit before calling this helper */
  skipIpRateLimit?: boolean
  /** optional; default off */
  rateLimitPerEmail?: { email: string; limit: number; windowMs: number }
  /** default true */
  requireTurnstile?: boolean
}

export type PublicFormGuardReason =
  | 'honeypot'
  | 'rate-limit-ip'
  | 'rate-limit-email'
  | 'turnstile-failed'

export interface PublicFormGuardResult {
  allowed: boolean
  reason?: PublicFormGuardReason
  /** ms until IP rate-limit window resets (only present on 'rate-limit-ip') */
  ipResetMs?: number
  /** captcha failure reason string (only present on 'turnstile-failed') */
  captchaReason?: string
}

export async function checkPublicFormGuard(
  request: Request,
  body: Record<string, unknown>,
  opts: PublicFormGuardOpts,
): Promise<PublicFormGuardResult> {
  // 1. Honeypot
  if (detectHoneypot(body, opts.honeypotField)) {
    return { allowed: false, reason: 'honeypot' }
  }

  // 2. IP rate-limit (skip when caller has already enforced it)
  const ip = getClientIp(request)
  if (!opts.skipIpRateLimit) {
    const ipOpts = opts.rateLimitPerIp ?? { limit: 5, windowMs: 5 * 60_000 }
    const ipResult = rateLimit({ key: `${opts.routeName}:${ip}`, ...ipOpts })
    if (!ipResult.allowed) {
      return { allowed: false, reason: 'rate-limit-ip', ipResetMs: ipResult.resetMs }
    }
  }

  // 3. Per-email rate-limit (optional)
  if (opts.rateLimitPerEmail) {
    const { email, limit, windowMs } = opts.rateLimitPerEmail
    const emailResult = rateLimitByEmail({ email, limit, windowMs })
    if (!emailResult.allowed) {
      return { allowed: false, reason: 'rate-limit-email' }
    }
  }

  // 4. Turnstile / reCAPTCHA
  const requireTurnstile = opts.requireTurnstile !== false
  if (requireTurnstile) {
    const captchaToken = body['cf-turnstile-response']
    const captcha = await verifyHumanToken(
      typeof captchaToken === 'string' ? captchaToken : null,
      ip,
    )
    if (!captcha.ok) {
      return { allowed: false, reason: 'turnstile-failed', captchaReason: captcha.reason }
    }
  }

  return { allowed: true }
}
