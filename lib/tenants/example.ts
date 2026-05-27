/**
 * Example second tenant — NOT for production.
 *
 * Existence purpose: prove the framework abstracts. This tenant uses different
 * brand, contact, geo, and (eventually) a different BookingProvider — if the
 * code can render this tenant alongside `alpacasibiza` without forking, the
 * abstraction works.
 *
 * To activate: import + register in `registry.ts`. Currently UNREGISTERED so
 * production builds don't accidentally serve "Vineyard Acres" content.
 *
 * Safety: every UNMAPPED-style field is null so the framework's existing
 * graceful-degradation paths exercise correctly.
 */

import type { Tenant } from './_types'

export const exampleVineyard: Tenant = Object.freeze({
  // ── Identity ────────────────────────────────────────────────────────────────
  slug: 'example-vineyard',
  brandName: 'Vineyard Acres',
  legalName: 'Vineyard Acres Demo S.L.',
  cif: null, // demo tenant — UNMAPPED
  tagline: 'A family vineyard in the Spanish countryside — demo tenant for the framework',
  siteUrl: 'https://example-vineyard.alpacaplatform.com',
  hosts: Object.freeze([
    'example-vineyard.alpacaplatform.com',
  ]),

  // ── Contact ─────────────────────────────────────────────────────────────────
  contactEmail: 'hello@example-vineyard.test',
  noreplyEmail: null,
  phoneE164: '+34000000000',
  whatsappE164: null, // demo tenant has no WhatsApp

  // ── Location ────────────────────────────────────────────────────────────────
  address: Object.freeze({
    streetAddress: '1 Vineyard Lane',
    addressLocality: 'Toledo',
    addressRegion: 'Castilla–La Mancha',
    addressCountry: 'ES',
    postalCode: '45001',
  }),
  geo: Object.freeze({ latitude: 39.8628, longitude: -4.0273 }),
  mapsQuery: 'Vineyard Acres Demo, Toledo, Spain',

  // ── Brand ───────────────────────────────────────────────────────────────────
  brandColors: Object.freeze({
    primary: '#722F37',   // burgundy
    secondary: '#F5E6CA', // cream
    themeColor: '#722F37',
  }),
  logoUrl: null,
  ogImageUrl: null,

  // ── Social ──────────────────────────────────────────────────────────────────
  social: Object.freeze({
    instagramUrl: null,
    facebookUrl: null,
    googleReviewUrl: null,
    twitterHandle: null, // demo tenant — UNMAPPED
  }),

  // ── FareHarbor ──────────────────────────────────────────────────────────────
  // Empty shortname signals "use manual-inquiry booking provider" per
  // lib/integrations/index.ts getProviders() default selection rules.
  fareHarbor: Object.freeze({
    shortname: '',
    flowId: '',
    itemIds: Object.freeze({
      tourMeetHerd: undefined,
      tourWeavingWorkshop: undefined,
      tourFarmExperience: undefined,
      tourPhotoSession: undefined,
      yoga: undefined,
      woven: undefined,
      commission: undefined,
      alcaca: undefined,
    }),
  }),

  // ── Analytics ───────────────────────────────────────────────────────────────
  analytics: Object.freeze({
    ga4MeasurementId: null,
    gtmContainerId: null,
  }),

  // ── i18n ────────────────────────────────────────────────────────────────────
  // Demo tenant defaults to Spanish-first to prove locale per-tenant works.
  locales: Object.freeze(['es', 'en'] as const),
  defaultLocale: 'es',
} as const satisfies Tenant)
