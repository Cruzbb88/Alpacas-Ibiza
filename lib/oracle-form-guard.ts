/**
 * Oracle-form guard — always-200 email-oracle closure helper.
 *
 * Used by: billing-portal, recover-certificate.
 * (mollie-manage is excluded per constraint.)
 *
 * Contract: every code-path through this wrapper returns exactly
 * `{ ok: true }` 200. The caller's `onAllowed` callback is invoked
 * only when all guards pass; its return value is discarded.
 *
 * Defence layers (in order):
 *   1. Honeypot  — bots filling hidden field → silent 200
 *   2. IP rate-limit
 *   3. Email validation (requires `isValidEmail` call on opts.email)
 *   4. Per-email rate-limit
 *   5. Turnstile / reCAPTCHA
 *
 * CRITICAL: the always-200 contract is PROVABLY uniform because this function
 * owns the outer return — callers cannot accidentally diverge on different
 * guard paths and leak enumeration state.
 */

import { detectHoneypot } from '@/lib/honeypot'
import { rateLimit, rateLimitByEmail, getClientIp } from '@/lib/rate-limit'
import { verifyHumanToken } from '@/lib/turnstile'
import { isValidEmail } from '@/lib/validate-email'
import { NextResponse } from 'next/server'

export interface OracleGuardOpts {
  /** e.g. 'billing-portal' — used as rate-limit key prefix */
  routeName: string
  /** hidden field name — bots fill it, humans never see it */
  honeypotField: string
  /** IP rate-limit (default: 3 req / 5 min) */
  rateLimitPerIp?: { limit: number; windowMs: number }
  /** Per-email rate-limit (default: 2 req / 1 h) */
  rateLimitPerEmail?: { limit: number; windowMs: number }
}

const ALWAYS_OK = () => NextResponse.json({ ok: true }, { status: 200 })

/**
 * Run all oracle guards and, if they pass, invoke `onAllowed`.
 * Always returns `{ ok: true }` 200 regardless of the outcome.
 */
export async function withAlwaysOk200<T>(
  request: Request,
  body: Record<string, unknown>,
  opts: OracleGuardOpts,
  onAllowed: () => Promise<T>,
): Promise<Response> {
  // 1. Honeypot
  if (detectHoneypot(body, opts.honeypotField)) {
    return ALWAYS_OK()
  }

  // 2. IP rate-limit
  const ip = getClientIp(request)
  const ipOpts = opts.rateLimitPerIp ?? { limit: 3, windowMs: 5 * 60_000 }
  const ipResult = rateLimit({ key: `${opts.routeName}:${ip}`, ...ipOpts })
  if (!ipResult.allowed) {
    return ALWAYS_OK()
  }

  // 3. Email validation
  const emailRaw = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isValidEmail(emailRaw)) {
    return ALWAYS_OK()
  }

  // 4. Per-email rate-limit
  const emailOpts = opts.rateLimitPerEmail ?? { limit: 2, windowMs: 60 * 60_000 }
  const emailResult = rateLimitByEmail({ email: emailRaw, ...emailOpts })
  if (!emailResult.allowed) {
    return ALWAYS_OK()
  }

  // 5. Turnstile / reCAPTCHA
  const captchaToken = body['cf-turnstile-response']
  const captcha = await verifyHumanToken(
    typeof captchaToken === 'string' ? captchaToken : null,
    ip,
  )
  if (!captcha.ok) {
    return ALWAYS_OK()
  }

  // All guards passed — invoke caller logic. Any thrown error is swallowed
  // because the always-200 contract must hold even on unexpected errors.
  try {
    await onAllowed()
  } catch {
    // Intentionally swallowed — never reveal customer existence or errors.
  }

  return ALWAYS_OK()
}
