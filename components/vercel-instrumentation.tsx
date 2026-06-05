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
    setConsented(hasAnalyticsConsent())
  }, [])

  return (
    <>
      {consented && <Analytics />}
      <SpeedInsights />
    </>
  )
}
