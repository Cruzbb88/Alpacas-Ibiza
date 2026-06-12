/**
 * Central FareHarbor product registry.
 *
 * Single source of truth that maps every bookable product slug to its FareHarbor
 * item ID constant. All booking CTAs on the site resolve their URL here.
 *
 * Fail-open by design: an unset item ID (undefined env var) falls back to the
 * main FareHarbor calendar — the CTA is never inert.
 * Named in CLAUDE.md failsafe map: "BookingButton / getProductBookingUrl fail-open"
 */
import {
  getFareHarborEmbedUrl,
  getFareHarborItemUrl,
  FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP,
  FAREHARBOR_ITEM_YOGA,
  FAREHARBOR_ITEM_WEDDINGS,
  FAREHARBOR_ITEM_PHOTOSHOOTS,
  FAREHARBOR_ITEM_BUSINESS_INCENTIVES,
  FAREHARBOR_ITEM_GIFT_CARD,
  FAREHARBOR_ITEM_ROMANTIC_SUNSET,
  FAREHARBOR_ITEM_FAMILY_FARM_DAYS,
} from './config.ts'

/**
 * All bookable FareHarbor product slugs.
 * 'general' = no specific item — resolves to the main calendar.
 */
export type FareHarborProduct =
  // 'meet-herd' / 'farm-experience' / 'photo-session' removed 2026-06-06 —
  // AI-fabricated tour types. FareHarbor has ONE "Alpaca Tour" (→ 'general' /
  // base calendar). 'weaving-workshop' kept: the real /workshops page uses it.
  | 'weaving-workshop'
  | 'yoga'
  | 'weddings'
  | 'photoshoots'
  | 'business-incentives'
  | 'gift-card'
  | 'romantic-sunset'
  | 'family-farm-days'
  | 'general'

/**
 * Maps each product slug to its env-var item ID.
 * undefined = not yet wired; getProductBookingUrl() will fall back to main calendar.
 */
const PRODUCT_ITEM_IDS: Record<FareHarborProduct, string | undefined> = {
  'weaving-workshop':     FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP,
  'yoga':                 FAREHARBOR_ITEM_YOGA,
  'weddings':             FAREHARBOR_ITEM_WEDDINGS,
  'photoshoots':          FAREHARBOR_ITEM_PHOTOSHOOTS,
  'business-incentives':  FAREHARBOR_ITEM_BUSINESS_INCENTIVES,
  'gift-card':            FAREHARBOR_ITEM_GIFT_CARD,
  'romantic-sunset':      FAREHARBOR_ITEM_ROMANTIC_SUNSET,
  'family-farm-days':     FAREHARBOR_ITEM_FAMILY_FARM_DAYS,
  'general':              undefined,
}

/**
 * Resolve the FareHarbor booking URL for a product slug.
 * Unknown slug OR unset item ID both fall back to the main calendar URL.
 * The CTA is never inert.
 */
export function getProductBookingUrl(product: FareHarborProduct): string {
  const itemId = PRODUCT_ITEM_IDS[product]
  if (!itemId) return getFareHarborEmbedUrl()
  return getFareHarborItemUrl(itemId)
}

/**
 * Whether a product has its item ID configured (i.e. will link to a specific
 * item calendar rather than the main fallback).
 * Useful for conditional UI or logging only — not required for BookingButton to work.
 */
export function isProductWired(product: FareHarborProduct): boolean {
  return Boolean(PRODUCT_ITEM_IDS[product])
}
