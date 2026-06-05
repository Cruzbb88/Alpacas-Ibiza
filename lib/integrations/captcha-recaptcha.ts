/**
 * Google reCAPTCHA v3 CaptchaProvider adapter.
 *
 * Failsafe contract (mirrors captcha-turnstile.ts exactly):
 * - No secret configured: verify() returns { ok: true } (fail-OPEN dev/preview)
 *   with a prod console.warn so misconfig is visible.
 * - Network error in production: fail-CLOSED. In development: fail-OPEN.
 * - publicSiteKey(): returns null if unconfigured — widget renders nothing.
 *
 * Score threshold: RECAPTCHA_MIN_SCORE env var (default 0.5).
 * Both success===true AND score>=threshold must pass.
 *
 * Docs: https://developers.google.com/recaptcha/docs/v3#site_verify_response
 */

import type { CaptchaProvider } from './_types'
import { fetchWithTimeout } from '@/lib/fetch'

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

interface RecaptchaV3Response {
  success: boolean
  score: number
  action: string
  challenge_ts: string
  hostname: string
  'error-codes'?: string[]
}

export function recaptchaCaptchaProvider(): CaptchaProvider {
  return {
    kind: 'recaptcha',

    async verify(
      token: string | undefined | null,
      remoteIp?: string | null,
    ): Promise<{ ok: true } | { ok: false; reason: string }> {
      const secret = process.env.RECAPTCHA_SECRET_KEY

      // No secret configured — fail-open (dev/preview), warn in prod.
      if (!secret) {
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            '[recaptcha] RECAPTCHA_SECRET_KEY unset — bot protection DISABLED. Set the env var to enable.',
          )
        }
        return { ok: true }
      }

      if (!token) return { ok: false, reason: 'missing_token' }

      const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? '0.5')

      const body = new URLSearchParams()
      body.set('secret', secret)
      body.set('response', token)
      if (remoteIp) body.set('remoteip', remoteIp)

      try {
        const res = await fetchWithTimeout(VERIFY_URL, { method: 'POST', body }, 5000)
        const data = (await res.json()) as RecaptchaV3Response

        if (!data.success) {
          return { ok: false, reason: (data['error-codes'] ?? ['unknown']).join(',') }
        }
        if (data.score < minScore) {
          return { ok: false, reason: `score_too_low:${data.score}` }
        }
        return { ok: true }
      } catch (err) {
        console.error('[recaptcha] verify failed:', err)
        // Fail closed in prod, fail open in dev (mirrors Turnstile behaviour).
        return process.env.NODE_ENV === 'production'
          ? { ok: false, reason: 'verify_network_error' }
          : { ok: true }
      }
    },

    publicSiteKey(): string | null {
      return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? null
    },
  }
}
