/**
 * Provider registry — resolves a Tenant config to a bundle of concrete providers.
 *
 * Usage in server components:
 *   import { getProviders } from '@/lib/integrations'
 *   const providers = getProviders(tenant)
 *   const bookingUrl = providers.booking.embedUrl({ fullItems: true })
 *
 * Adding a new provider implementation:
 *   1. Add the kind to the union in `_types.ts` (e.g. 'bokun').
 *   2. Implement the adapter in this folder (e.g. `booking-bokun.ts`).
 *   3. Add a case in the switch below.
 *   4. Tenants can now select it via `tenant.integrations.booking.kind === 'bokun'`.
 *
 * NOTE: tenant integration selection (`tenant.integrations.*.kind`) is NOT yet
 * in the Tenant interface — the framework currently selects defaults per
 * existing alpaca behavior. The next migration step is to add an `integrations`
 * object to Tenant; see `specs/saas-framework/003-integration-adapters.md`.
 */

import type {
  TenantProviders,
  BookingProvider,
  EmailProvider,
  CaptchaProvider,
  AnalyticsProvider,
} from './_types'
import type { PaymentProvider } from './payment'
import type { Tenant } from '@/lib/tenants/_types'

import { fareHarborBookingProvider } from './booking-fareharbor'
import { manualInquiryBookingProvider } from './booking-manual-inquiry'
import { resendEmailProvider } from './email-resend'
import { consoleOnlyEmailProvider } from './email-console-only'
import { turnstileCaptchaProvider } from './captcha-turnstile'
import { recaptchaCaptchaProvider } from './captcha-recaptcha'
import { noCaptchaProvider } from './captcha-none'
import { ga4GtmAnalyticsProvider } from './analytics-ga4-gtm'
import { makeMapProvider } from './map'
import type { MapProvider } from './map'
import { staticTypescriptContentProvider } from './content-static-typescript'
import type { ContentProvider } from './content'
import { alpacasibizaContent } from '@/lib/tenants/alpacasibiza-content'
import { exampleContent } from '@/lib/tenants/example-content'

import { manualMailtoPaymentProvider } from './payment-manual-mailto'
import { fareHarborPassthroughPaymentProvider } from './payment-fareharbor-passthrough'
import { stripeDirectPaymentProvider } from './payment-stripe-direct'
import { molliePaymentProvider } from './payment-mollie'

export type { BookingProvider, EmailProvider, CaptchaProvider, AnalyticsProvider, TenantProviders } from './_types'
export type { PaymentProvider, PaymentProviderKind } from './payment'
export type { MapProvider, MapProviderKind } from './map'
export type { ContentProvider, ContentProviderKind } from './content'

/**
 * Resolve providers for a tenant.
 *
 * Default selections (pending tenant-level `integrations` config):
 * - booking: fareharbor (alpaca-era default)
 * - email: resend if RESEND_API_KEY is set, otherwise console-only
 * - captcha: turnstile if NEXT_PUBLIC_TURNSTILE_SITE_KEY set, otherwise none
 * - analytics: ga4-gtm (always, since the IDs live in the tenant config)
 * - content: static-typescript, selected by tenant slug
 * - payment: manual-mailto (default); tenant.payment.kind selects adapter
 */
export function getProviders(tenant: Tenant): TenantProviders {
  const booking: BookingProvider =
    tenant.fareHarbor.shortname.length > 0
      ? fareHarborBookingProvider(tenant)
      : manualInquiryBookingProvider(tenant)

  const email: EmailProvider = process.env.RESEND_API_KEY
    ? resendEmailProvider(tenant)
    : consoleOnlyEmailProvider()

  // Captcha adapter selection.
  // Priority order:
  //   1. CAPTCHA_PROVIDER env var (explicit override: 'turnstile' | 'recaptcha' | 'none')
  //   2. Legacy auto-detect: turnstile if NEXT_PUBLIC_TURNSTILE_SITE_KEY is set
  //   3. Default: turnstile (back-compat — matching existing behaviour)
  const captchaProvider = process.env.CAPTCHA_PROVIDER ?? (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? 'turnstile' : 'turnstile'
  )
  const captcha: CaptchaProvider = (() => {
    switch (captchaProvider) {
      case 'recaptcha':
        return recaptchaCaptchaProvider()
      case 'none':
        return noCaptchaProvider()
      case 'turnstile':
      default:
        return turnstileCaptchaProvider()
    }
  })()

  const analytics: AnalyticsProvider = ga4GtmAnalyticsProvider(tenant)

  // Default: osm-iframe (no API key required — always renders a map).
  // Switch to 'google-embed' when GOOGLE_MAPS_EMBED_API_KEY is set and desired.
  const map: MapProvider = makeMapProvider(
    process.env.GOOGLE_MAPS_EMBED_API_KEY ? 'google-embed' : 'osm-iframe',
  )

  // Content selection by slug — Phase 1 static-typescript approach.
  // When a new tenant is onboarded: add its slug + content module here.
  const content: ContentProvider = (() => {
    switch (tenant.slug) {
      case 'example-vineyard':
        return staticTypescriptContentProvider(exampleContent)
      case 'alpacasibiza':
      default:
        return staticTypescriptContentProvider(alpacasibizaContent)
    }
  })()

  // Payment adapter — driven by tenant.payment.kind; defaults to manual-mailto.
  // stripe-connect guard: loud warning + fallback if accidentally activated early.
  const payment: PaymentProvider = (() => {
    const kind = tenant.payment?.kind ?? 'manual-mailto'
    switch (kind) {
      case 'stripe-direct':
        return stripeDirectPaymentProvider()
      case 'fareharbor-passthrough':
        return fareHarborPassthroughPaymentProvider(booking)
      case 'mollie':
        return molliePaymentProvider()
      case 'stripe-connect':
        // DEFER UNTIL TENANT #1 SIGNS — see ps-003. Fall back to manual-mailto.
        console.error(
          '[getProviders] stripe-connect selected but not yet implemented. ' +
          'Falling back to manual-mailto. DEFER UNTIL TENANT #1 SIGNS.'
        )
        return manualMailtoPaymentProvider()
      case 'manual-mailto':
      default:
        return manualMailtoPaymentProvider()
    }
  })()

  return { tenant, booking, email, captcha, analytics, map, content, payment }
}
