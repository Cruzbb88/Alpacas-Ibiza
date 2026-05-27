/**
 * GA4 + GTM AnalyticsProvider adapter.
 *
 * Returns the tenant's measurement IDs for client-side `<Script>` tag emission.
 * No server-side event ingestion here — that's handled by the GA4 Data API in
 * /api/analytics/data (the admin dashboard route).
 *
 * Failsafe: silent no-op. Returns null IDs if tenant has none — `<Script>` tags
 * should conditionally render only when ID is non-null.
 */

import type { AnalyticsProvider } from './_types'
import type { Tenant } from '@/lib/tenants/_types'

export function ga4GtmAnalyticsProvider(tenant: Tenant): AnalyticsProvider {
  return {
    kind: 'ga4-gtm',
    ga4MeasurementId() {
      return tenant.analytics.ga4MeasurementId
    },
    gtmContainerId() {
      return tenant.analytics.gtmContainerId
    },
  }
}
