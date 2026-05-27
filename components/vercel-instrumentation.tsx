'use client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

/**
 * Vercel-first-party tracking. Both components are no-ops outside Vercel
 * deploys (they check process.env.VERCEL_ENV internally). No GDPR concern
 * before consent — Vercel Analytics is cookieless by default.
 */
export function VercelInstrumentation() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
