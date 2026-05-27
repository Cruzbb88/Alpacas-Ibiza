/**
 * Cloudflare Turnstile CaptchaProvider adapter.
 *
 * Wraps lib/turnstile.ts so it conforms to CaptchaProvider.
 *
 * Failsafe contract (asymmetric, preserved from existing turnstile.ts):
 * - No secret configured: verify() returns { ok: true } (fail-OPEN dev/preview)
 *   with a prod console.warn so misconfig is visible.
 * - Network error in production: fail-CLOSED. In development: fail-OPEN.
 * - publicSiteKey(): returns null if unconfigured — widget renders nothing.
 */

import type { CaptchaProvider } from './_types'
import { verifyTurnstile } from '@/lib/turnstile'

export function turnstileCaptchaProvider(): CaptchaProvider {
  return {
    kind: 'turnstile',
    verify(token, remoteIp) {
      return verifyTurnstile(token, remoteIp)
    },
    publicSiteKey() {
      return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null
    },
  }
}
