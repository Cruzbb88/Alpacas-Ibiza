/**
 * Provider interfaces — the framework's integration abstraction layer.
 *
 * Every external integration (booking, email, captcha, analytics, payment, etc.)
 * is consumed via one of these provider interfaces. A tenant's config selects
 * which concrete adapter is used:
 *
 *   tenant.integrations.booking.kind === 'fareharbor'  →  FareHarborBookingProvider
 *   tenant.integrations.booking.kind === 'manual'      →  ManualInquiryBookingProvider
 *   tenant.integrations.email.kind   === 'resend'      →  ResendEmailProvider
 *
 * **Failsafe inheritance:** every provider interface documents its failsafe
 * contract (fail-open / fail-closed / throw / silent-noop). Concrete adapters
 * MUST honor that contract — see CLAUDE.md "In-code failsafe map" for the
 * current implementations and the failsafe each one inherits.
 *
 * This file imports NO concrete adapters — those live alongside their respective
 * provider implementations. Importing this file is safe in any environment
 * (Server, Client, Edge, tests).
 */

import type { Tenant } from '@/lib/tenants/_types'
import type { PaymentProvider } from './payment'
import type { MapProvider } from './map'
import type { ContentProvider } from './content'

// ── Provider-class identifiers ────────────────────────────────────────────────

/**
 * Each tenant config picks ONE implementation per provider class.
 * Adding a new implementation = extend the union here + register the adapter.
 */
export type BookingProviderKind = 'fareharbor' | 'bokun' | 'manual-inquiry' | 'noop'
export type EmailProviderKind = 'resend' | 'sendgrid' | 'mailgun' | 'console-only'
export type CaptchaProviderKind = 'turnstile' | 'recaptcha' | 'none'
export type AnalyticsProviderKind = 'ga4-gtm' | 'plausible' | 'none'
export type { MapProviderKind, MapProvider } from './map'
export type { ContentProvider, ContentProviderKind } from './content'
export type { PaymentProvider, PaymentProviderKind } from './payment'

// ── BookingProvider ───────────────────────────────────────────────────────────

/**
 * Abstract booking-flow operations.
 *
 * **Failsafe contract:** fail-quiet on missing credentials.
 * `embedUrl()` and `itemUrl()` MUST always return a usable URL (fall back to
 * a static contact/inquiry URL if no booking system is configured).
 * `availability()` returns `{ configured: false }` rather than throwing.
 */
export interface BookingProvider {
  readonly kind: BookingProviderKind

  /** Generic booking embed URL — the "Book Now" CTA destination. */
  embedUrl(opts?: { fullItems?: boolean }): string

  /** Per-item / per-tour booking URL with fallback to embedUrl. */
  itemUrl(itemId: string | undefined, opts?: { fullItems?: boolean }): string

  /**
   * Fetch upcoming availability across configured items.
   * Returns `{ configured: false }` if no credentials (UI hides date grid).
   */
  availability(opts: {
    fromIso: string
    toIso: string
    maxItems?: number
  }): Promise<
    | { configured: false; reason: string }
    | { configured: true; dates: ReadonlyArray<{ date: string; capacity: number; startTime: string }> }
  >
}

// ── EmailProvider ─────────────────────────────────────────────────────────────

/**
 * Abstract email operations.
 *
 * **Failsafe contract:** `send()` THROWS on error (mirrors current Resend pattern).
 * Routes catch and return 500. No silent failures.
 * `cancelScheduled()` is best-effort — returns `false` on failure but does not throw.
 */
export interface EmailProvider {
  readonly kind: EmailProviderKind

  send(opts: {
    to: string
    subject: string
    html: string
    replyTo?: string
    /** ISO 8601 or natural-language "in 48 hours" — falls back to immediate if unsupported. */
    scheduledAt?: string
    /**
     * When provided, the adapter SHOULD attach RFC 8058 List-Unsubscribe
     * and List-Unsubscribe-Post headers. Required by Gmail/Yahoo 2026 bulk-
     * sender rules for commercial transactional email.
     */
    listUnsubscribeUrl?: string
  }): Promise<{ id: string | null }>

  cancelScheduled(id: string): Promise<boolean>
}

// ── CaptchaProvider ───────────────────────────────────────────────────────────

/**
 * Abstract bot-protection.
 *
 * **Failsafe contract (asymmetric):**
 * - If no secret configured: `verify()` returns `{ ok: true }` (fail-OPEN dev/preview).
 * - In production with no secret: emit a `console.warn` so misconfig is visible.
 * - On network error in production: fail-CLOSED. In development: fail-OPEN.
 *
 * Client-side widget MUST render `null` when the public site key is absent
 * (no half-rendered captcha box).
 */
export interface CaptchaProvider {
  readonly kind: CaptchaProviderKind

  /** Server-side token verification. */
  verify(
    token: string | undefined | null,
    remoteIp?: string | null,
  ): Promise<{ ok: true } | { ok: false; reason: string }>

  /**
   * Public-key getter — used by the client widget to know whether to render.
   * Returns `null` if the provider is unconfigured (widget renders nothing).
   */
  publicSiteKey(): string | null
}

// ── AnalyticsProvider ─────────────────────────────────────────────────────────

/**
 * Abstract conversion-tracking.
 *
 * **Failsafe contract:** silent no-op when unconfigured. Never throws.
 * Track calls in unconfigured tenants just `console.debug(...)`.
 *
 * Implementation note: GA4/GTM containers are client-side only. The server-side
 * surface here is the public ID emitter (consumed by `<Script>` tags in the
 * locale layout).
 */
export interface AnalyticsProvider {
  readonly kind: AnalyticsProviderKind

  /** GA4 measurement ID for client-side gtag init. Null if unconfigured. */
  ga4MeasurementId(): string | null

  /** GTM container ID for client-side dataLayer. Null if unconfigured. */
  gtmContainerId(): string | null
}

// ── Provider bundle for a tenant ──────────────────────────────────────────────

/**
 * The complete set of providers resolved for a tenant. Constructed once per
 * request (or per process, depending on adapter implementation).
 *
 * Server components call:
 *   const providers = getProviders(tenant)
 *   providers.booking.embedUrl({ fullItems: true })
 *   providers.map.embedUrl({ lat: tenant.geo.latitude, lng: tenant.geo.longitude })
 */
export interface TenantProviders {
  readonly tenant: Tenant
  readonly booking: BookingProvider
  readonly email: EmailProvider
  readonly captcha: CaptchaProvider
  readonly analytics: AnalyticsProvider
  /** Map embedding provider. Defaults to osm-iframe (no API key required). */
  readonly map: MapProvider
  /**
   * Per-tenant content provider (animals, experiences, products, team, reviews).
   * All list* methods return ReadonlyArray — never null, never throw.
   */
  readonly content: ContentProvider
  /**
   * Payment provider for checkout flows (Adopt-a-Paca, etc.).
   * Defaults to manual-mailto when tenant.payment is omitted.
   * createCheckoutSession returns { unconfigured: true, fallbackUrl } on missing config.
   */
  readonly payment: PaymentProvider
}
