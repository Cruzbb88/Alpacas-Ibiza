/**
 * No-CAPTCHA provider — for tenants that opt out of bot protection
 * (e.g. low-traffic, behind their own firewall, or in dev/preview).
 *
 * Failsafe: always returns { ok: true } from verify(). Widget renders nothing.
 * USE WITH CAUTION — leaves forms unprotected.
 */

import type { CaptchaProvider } from './_types'

export function noCaptchaProvider(): CaptchaProvider {
  return {
    kind: 'none',
    async verify() {
      return { ok: true }
    },
    publicSiteKey() {
      return null
    },
  }
}
