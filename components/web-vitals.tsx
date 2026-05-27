'use client'
import { useReportWebVitals } from 'next/web-vitals'

/**
 * Reports Core Web Vitals to GA4 via gtag. Runs once on the client (Next's hook
 * handles dedupe + sampling internally).
 *
 * GA4 receives one event per metric per page navigation:
 *   - 'web_vitals' with parameters: { metric_name, metric_value, metric_id, metric_rating }
 *
 * No PII; values are floating-point millisecond/score numbers. Respects
 * Consent Mode v2 — if analytics_storage='denied', gtag silently drops.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return
    window.gtag('event', 'web_vitals', {
      metric_name: metric.name,
      metric_value: Math.round(metric.value * 1000) / 1000, // round to 3dp
      metric_id: metric.id,
      metric_rating: metric.rating,  // 'good' | 'needs-improvement' | 'poor'
      metric_delta: metric.delta,
      metric_navigation_type: metric.navigationType,
    })
  })
  return null
}
