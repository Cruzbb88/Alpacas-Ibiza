/**
 * Tenant type definitions.
 *
 * All fields are readonly — tenant configs are frozen at module load time
 * and must never be mutated at runtime. Safe for concurrent requests.
 *
 * mr-002-2026-05-27-tenant-zone.md  (interface contract sketch)
 * sb-001-2026-05-27-multi-tenant.md (no module-scope mutable caching)
 */

// ── Sub-types ─────────────────────────────────────────────────────────────────

export interface TenantAddress {
  readonly streetAddress: string
  readonly addressLocality: string
  readonly addressRegion: string
  readonly addressCountry: string
  readonly postalCode: string
}

export interface TenantGeo {
  readonly latitude: number
  readonly longitude: number
}

export interface TenantBranding {
  /**
   * Primary brand color (hex).
   * NOTE: may differ from themeColor; see OWNER_INPUT_NEEDED block in alpacasibiza.ts.
   */
  readonly primary: string
  readonly secondary: string
  /**
   * <meta name="theme-color"> value.
   * OWNER_INPUT_NEEDED: currently differs from `primary` — owner must resolve.
   */
  readonly themeColor: string
}

export interface TenantSocial {
  readonly instagramUrl?: string | null
  readonly facebookUrl?: string | null
  readonly googleReviewUrl?: string | null
  readonly youtubeUrl?: string | null
  readonly tiktokUrl?: string | null
  /**
   * Twitter/X handle with @ prefix (e.g. '@alpacasibiza').
   * null = UNMAPPED — owner must supply when account is verified.
   * Used for twitter:creator and twitter:site meta tags.
   */
  readonly twitterHandle?: string | null
}

export interface TenantFareHarbor {
  /** FareHarbor account shortname (used in embed URLs). */
  readonly shortname: string
  /** Default booking flow ID. */
  readonly flowId: string
  /**
   * Per-tour FareHarbor item IDs.
   * undefined = OWNER_INPUT_NEEDED — falls back to base calendar URL (fail-open).
   */
  readonly itemIds: {
    readonly tourMeetHerd: string | undefined
    readonly tourWeavingWorkshop: string | undefined
    readonly tourFarmExperience: string | undefined
    readonly tourPhotoSession: string | undefined
    readonly yoga: string | undefined
    readonly woven: string | undefined
    readonly commission: string | undefined
    readonly alcaca: string | undefined
  }
}

export interface TenantAnalytics {
  /** GA4 measurement ID (hardcoded pixel, not a secret). */
  readonly ga4MeasurementId: string | null
  /** GTM container ID loaded in <head>. */
  readonly gtmContainerId: string | null
}

export interface TenantPayment {
  /**
   * Which payment adapter to use for this tenant.
   * Defaults to 'manual-mailto' when omitted.
   * 'stripe-connect' is blocked until TENANT #1 SIGNS — see ps-003.
   */
  readonly kind: 'stripe-direct' | 'stripe-connect' | 'mollie' | 'fareharbor-passthrough' | 'manual-mailto'
  /**
   * Platform-specific product/price IDs.
   * For stripe-direct: Stripe Price IDs.
   * For mollie: Mollie product IDs.
   * OWNER_INPUT_NEEDED: create these in the respective payment dashboard.
   */
  readonly productIds?: {
    readonly adopt?: {
      /** Stripe Price ID or Mollie product ID for monthly subscription. */
      readonly monthly?: string
      /** Stripe Price ID or Mollie product ID for yearly one-time payment. */
      readonly yearly?: string
    }
  }
}

// ── Root Tenant interface ─────────────────────────────────────────────────────

export interface Tenant {
  // Identity
  readonly slug: string
  readonly brandName: string
  readonly legalName: string
  /**
   * Spanish tax ID (Código de Identificación Fiscal).
   * null = UNMAPPED — owner must supply before launch.
   * OWNER_INPUT_NEEDED: required by Spanish law for commercial websites.
   */
  readonly cif: string | null
  readonly tagline: string
  readonly siteUrl: string
  /** All hostnames that map to this tenant (used by registry.ts). */
  readonly hosts: readonly string[]

  // Contact
  readonly contactEmail: string
  /**
   * No-reply / transactional sender address.
   * UNMAPPED on alpacasibiza — see alpacasibiza.ts for fallback note.
   */
  readonly noreplyEmail: string | null
  readonly phoneE164: string | null
  readonly whatsappE164: string | null

  // Location
  readonly address: TenantAddress
  readonly geo: TenantGeo
  /** Raw query string for Google Maps / Place searches. */
  readonly mapsQuery: string

  // Brand
  readonly brandColors: TenantBranding
  /** Public URL to the primary logo asset. null = UNMAPPED (owner must supply). */
  readonly logoUrl: string | null
  /** Public URL to the default OG image. null = UNMAPPED (owner must supply). */
  readonly ogImageUrl: string | null

  // Social
  readonly social: TenantSocial

  // Integrations
  readonly fareHarbor: TenantFareHarbor
  readonly analytics: TenantAnalytics
  /**
   * Payment provider selection. Optional — defaults to 'manual-mailto' when absent.
   * Existing tenants (e.g. alpacasibiza) omit this field; no breaking change.
   */
  readonly payment?: TenantPayment

  // i18n
  readonly locales: readonly string[]
  readonly defaultLocale: string

  /**
   * Optional: slug key identifying the tenant's content module.
   * When absent, getProviders() falls back to slug-based selection.
   * Phase 1: the slug switch in lib/integrations/index.ts handles selection.
   * Phase 2 (future): this field drives dynamic import of the module.
   *
   * Convention: value matches the tenant slug (e.g. 'alpacasibiza').
   * The mapping slug → file lives in lib/integrations/index.ts.
   */
  readonly contentModule?: string
}
