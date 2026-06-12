/**
 * Alpacas Ibiza — first concrete tenant config.
 *
 * Values sourced from:
 *   - lib/structured-data.ts (address, geo, telephone, email, schema names)
 *   - OWNER_INPUT_NEEDED.md (phone, social, locale strategy)
 *   - CLAUDE.md env-var table (GA4, GTM, FareHarbor shortname/flowId)
 *   - lib/config.ts (FareHarbor shortname, SITE_BASE_URL)
 *   - styles/globals.css + tailwind.config.ts (brand colors)
 *
 * ⚠️  OWNER_INPUT_NEEDED items are flagged inline with comments.
 * ⚠️  UNMAPPED items are null — do NOT invent values.
 *
 * This object is frozen at module load time and is safe for concurrent
 * server requests (no mutable module-scope state — sb-001 compliance).
 */

import type { Tenant } from './_types'
import { BRAND_COLORS } from '../brand.ts'

export const alpacasibiza = Object.freeze({
  // ── Identity ────────────────────────────────────────────────────────────────
  slug: 'alpacasibiza',
  brandName: 'Alpacas Ibiza',
  legalName: 'Es Currals Alpacas Ibiza',
  /**
   * CIF extracted from /algemene-voorwaarden on the live site (2026-05-31).
   * EU VAT ESY6917111J → ES (country prefix) + Y6917111J (Spanish CIF).
   * Source: "VAT: ESY6917111J" in LIVE_SITE_CONTENT_INVENTORY.md.
   * OWNER_INPUT_NEEDED: confirm this is still the active CIF before going live.
   */
  cif: 'Y6917111J',
  /**
   * EU VAT number extracted from live-site /algemene-voorwaarden (2026-05-31).
   * Source: "VAT: ESY6917111J" in LIVE_SITE_CONTENT_INVENTORY.md.
   * OWNER_INPUT_NEEDED: confirm this is still the active VAT number before going live.
   * Terms page omits the VAT line when this is null.
   */
  vatNumber: 'ESY6917111J' as string | null,
  tagline: 'The very first alpaca farm on Ibiza',
  siteUrl: 'https://alpacasibiza.com',
  hosts: Object.freeze([
    'alpacasibiza.com',
    'www.alpacasibiza.com',
    'alpacasibiza.alpacaplatform.com',
  ]),

  // ── Contact ─────────────────────────────────────────────────────────────────
  contactEmail: 'info@alpacasibiza.com',
  /**
   * UNMAPPED — no dedicated no-reply address confirmed.
   * Source: Resend domain verification in OWNER_INPUT_NEEDED.md mentions
   * "hello@alpacasibiza.com" as a future `from` address, but that address is
   * not yet live. Using null here; callers must fall back to contactEmail.
   * OWNER_INPUT_NEEDED: confirm no-reply or transactional sender address.
   */
  noreplyEmail: null,
  phoneE164: '+32475586544',    // Belgian mobile; confirmed in lib/structured-data.ts
  /**
   * WhatsApp Business number confirmed from live-site /algemene-voorwaarden Art 2 (2026-05-31 scrape).
   * Spanish mobile +34 689 446 781 — distinct from the Belgian phoneE164 above.
   * OWNER_INPUT_NEEDED: confirm this is still the active WhatsApp Business number before go-live.
   */
  whatsappE164: '+34689446781', // from live-site /algemene-voorwaarden Art 2 (2026-05-31 scrape)

  // ── Location ────────────────────────────────────────────────────────────────
  address: Object.freeze({
    /**
     * Full street extracted from /algemene-voorwaarden on the live site (2026-05-31).
     * Source: "C/3 Bungalow Park 22, 07850 San Carlos" in LIVE_SITE_CONTENT_INVENTORY.md.
     * ⚠️ POSTAL CODE CONFLICT: live site terms page says 07850; existing tenant config had 07819.
     * OWNER_INPUT_NEEDED: confirm correct postal code before going live.
     */
    streetAddress: 'C/3 Bungalow Park 22',
    addressLocality: 'San Carlos',
    /**
     * structured-data.ts uses 'Islas Baleares' (Spanish); spec says 'Balearic Islands'
     * (English). Both refer to the same region. Using English form here for
     * consistency with the Tenant type; structured-data.ts owns its own locale-specific
     * rendering and is unchanged.
     */
    addressRegion: 'Balearic Islands',
    addressCountry: 'ES',
    /**
     * ⚠️ POSTAL CODE CONFLICT: live site /algemene-voorwaarden says 07850;
     * previous value was 07819. Using inventory value (07850) — owner to confirm.
     */
    postalCode: '07850',
  }),
  // OWNER_VERIFY: lat/lng not authoritatively confirmed; check against Google Maps pin before launch.
  geo: Object.freeze({
    latitude: 38.9861,
    longitude: 1.5228,
  }),
  mapsQuery: 'Alpacas Ibiza, San Carlos, Ibiza',

  // ── Brand ───────────────────────────────────────────────────────────────────
  // ── Brand colors ─ sourced from lib/brand.ts (single source of truth) ─────────
  // To change any value: edit lib/brand.ts, then mirror HSL in app/globals.css.
  // OWNER_INPUT_NEEDED — color inconsistency flagged in lib/brand.ts:
  //   primary '#556B2F' (dark olive) vs themeColor '#6da855' (medium green)
  //   are NOT the same color. Owner must confirm canonical palette.
  brandColors: Object.freeze({
    primary: BRAND_COLORS.primary,
    secondary: BRAND_COLORS.secondary,
    themeColor: BRAND_COLORS.themeColor, // ⚠️ diverges from primary — see lib/brand.ts
  }),
  /**
   * Live site CDN URL — extracted 2026-05-31 from https://www.alpacasibiza.com/
   * via LIVE_SITE_BRAND_ASSETS.md (handoff/LIVE_SITE_BRAND_ASSETS.md §1).
   * File: LOGO-alpacas-ibiza-DEF.png (full-size Squarespace CDN variant).
   * ACTION: per CONTENT-MIGRATION-2026-05-31-OWNER-REVIEW.md §6, owner to decide
   * between keeping this Squarespace CDN URL (a) or self-hosting (b, recommended).
   * Self-hosted from the live site (2026-06-06) so it survives the old
   * Squarespace site being taken down. Was a Squarespace CDN URL that would
   * 404 once the subscription lapses.
   */
  logoUrl: '/images/brand/logo.png',
  /**
   * UNMAPPED — /public/images/heroes/home.jpg listed in OWNER_INPUT_NEEDED.md
   * content shopping list but file does not exist.
   */
  ogImageUrl: null,

  // ── Social ──────────────────────────────────────────────────────────────────
  social: Object.freeze({
    /**
     * ⚠️ INSTAGRAM CONFLICT — OWNER_INPUT_NEEDED:
     *   lib/structured-data.ts  → sameAs: 'https://www.instagram.com/alpacasibiza'
     *   OWNER_INPUT_NEEDED.md   → "Live site treats Wishfulfilling Weaving as co-equal
     *                             brand with its own Instagram @wishfulfillingweaving"
     *   OWNER_INPUT_NEEDED.md   → "Wishfulfilling Weaving — separate brand or sub-brand?"
     *
     * The live alpacasibiza.com appears to use @wishfulfillingweaving as its primary
     * Instagram, but @alpacasibiza may also exist (or be the business account).
     * Using @wishfulfillingweaving here (matching live site behavior per
     * OWNER_INPUT_NEEDED.md). Owner must confirm the canonical handle before any
     * social links go live.
     */
    instagramUrl: 'https://www.instagram.com/wishfulfillingweaving/',
    /**
     * Facebook page confirmed in structured-data.ts sameAs (facebook.com/alpacasibiza)
     * and OWNER_INPUT_NEEDED.md notes the full People URL. Using the People URL
     * as the more specific canonical form.
     */
    facebookUrl: 'https://www.facebook.com/people/Es-Currals-Alpacas-Ibiza/100066379310193/',
    /**
     * UNMAPPED — no confirmed Google review shortlink in source files.
     * The g.page/r/alpacasibiza URL is speculative (not verified in VERIFICATION_RESULTS.md).
     * OWNER_INPUT_NEEDED: confirm Google Business Profile Place ID and review link.
     */
    googleReviewUrl: null,
    /**
     * UNMAPPED — Twitter/X account not confirmed for this tenant.
     * OWNER_INPUT_NEEDED: supply handle (with @ prefix) when account is verified.
     */
    twitterHandle: null,
  }),

  // ── FareHarbor ──────────────────────────────────────────────────────────────
  fareHarbor: Object.freeze({
    shortname: 'alpacasibiza',     // verified in lib/config.ts + CLAUDE.md
    flowId: '1257173',             // verified in CLAUDE.md "Hardcoded in code" section
    itemIds: Object.freeze({
      // All undefined — OWNER_INPUT_NEEDED: FareHarbor admin → Items → numeric ID
      // (see OWNER_INPUT_NEEDED.md "FareHarbor configuration the owner must do")
      // Per lib/config.ts design, undefined falls back to base calendar URL (fail-open).
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
    /**
     * Hardcoded GA4 pixel — not a secret, safe in client bundles.
     * Verified in CLAUDE.md: "Hardcoded in code (no env needed): GA4 pixel G-Y946QDVVQV"
     */
    ga4MeasurementId: 'G-Y946QDVVQV',
    /**
     * FareHarbor's GTM container — the only container currently wired.
     * Verified in CLAUDE.md: "RESOLVED (2026-05-26): GTM-NJRGZPGS does not appear
     * anywhere in the codebase — verified via VERIFICATION_RESULTS search. Only
     * GTM-KR3CGLS6 is wired."
     * OWNER_INPUT_NEEDED: if a separate site-owned GTM container should be added,
     * supply its ID and see OWNER_INPUT_NEEDED.md "GTM container strategy".
     */
    gtmContainerId: 'GTM-KR3CGLS6',
  }),

  // ── Trust / compliance (Build #4 — Spanish regulatory equivalents of WWF UK badge) ──
  /**
   * UNMAPPED — OWNER_INPUT_NEEDED: supply the Consell Insular d'Eivissa Turismo Activo
   * registration number (e.g. "Registro Insular de Turismo de Ibiza XX-XXXXX").
   * Footer renders iff set.
   */
  touristRegistration: null,
  /**
   * UNMAPPED — OWNER_INPUT_NEEDED: supply if the farm holds a carnet de manipulador
   * de alimentos (required for selling farm produce to the public).
   * Footer renders iff set.
   */
  foodHandlingCert: null,
  /**
   * UNMAPPED — OWNER_INPUT_NEEDED: add certifications such as Consell Balear Producció
   * Agraria Ecológica (organic certification, used by Can Martí competitor) when obtained.
   * Format: [{ label: 'Organic Certified', certifier: 'CBPAE', logoSrc: '/images/badges/cbpae.svg' }]
   */
  trustBadges: [],

  // ── i18n ────────────────────────────────────────────────────────────────────
  /**
   * OWNER_INPUT_NEEDED: locale strategy unresolved (see OWNER_INPUT_NEEDED.md
   * "Language strategy"). IT and FR are speculative — no visitor data yet.
   * Mirrors the current middleware.ts locales array exactly.
   */
  locales: Object.freeze(['en', 'de', 'it', 'es', 'nl', 'fr'] as const),
  defaultLocale: 'en',
} as const satisfies Tenant)
