'use client'
import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { hasAnalyticsConsent } from '@/lib/consent-gate'

/**
 * Vercel-first-party tracking.
 *   - SpeedInsights: unconditional — Web Vitals only, no fingerprinting,
 *     no GDPR/PECR concern.
 *   - Analytics: consent-gated (PECR) — fires a pageview beacon on every
 *     route change. Rendered only after the visitor has accepted analytics
 *     via the CookieConsent banner.
 *
 * Both components are no-ops outside Vercel deploys (they check
 * process.env.VERCEL_ENV internally).
 */
export function VercelInstrumentation() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    // Read consent on mount (handles users who already accepted).
    setConsented(hasAnalyticsConsent())

    // Re-check when the user interacts with the cookie banner in THIS tab.
    // CookieConsentBanner writes 'ai_cookie_consent_v1' to localStorage on
    // every consent event — listening to the 'storage' event on `window` would
    // only fire for CROSS-tab writes. For same-tab writes we use a custom
    // 'cookieConsentUpdated' event dispatched by the banner instead.
    function handleConsentUpdate() {
      setConsented(hasAnalyticsConsent())
    }
    window.addEventListener('cookieConsentUpdated', handleConsentUpdate)
    return () => {
      window.removeEventListener('cookieConsentUpdated', handleConsentUpdate)
    }
  }, [])

  return (
    <>
      {consented && <Analytics />}
      <SpeedInsights />
    </>
  )
}
