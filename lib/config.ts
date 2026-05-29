
import { makeRequestLogger } from './request-id.ts'

const log = makeRequestLogger('config', '')

// central config helpers for environment-driven constants

/**
 * Canonical site origin — used in metadata, sitemap, hreflang, structured data, OG URLs.
 * `NEXT_PUBLIC_SITE_URL` allows preview/staging override without code change. Never has trailing slash.
 */
export const SITE_BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alpacasibiza.com').replace(/\/$/, '')

/**
 * Pricing constants — single source of truth. Editable here only.
 * Verified live (REALITY_CHECK Tier 2 / VERIFICATION_RESULTS).
 */
export const TOUR_BASE_PRICE_EUR = 30
export const YOGA_PRICE_EUR: number =
  process.env.YOGA_PRICE_EUR ? Number(process.env.YOGA_PRICE_EUR) : 30

/**
 * Adopt-a-Paca tiers. Verified vs live Adopt landing — €75/mo or €900/yr prepaid.
 * Mollie + Stripe webhooks read these for subscription creation.
 */
export const ADOPT_PRICE_MONTHLY_EUR: number =
  process.env.ADOPT_PRICE_MONTHLY_EUR ? Number(process.env.ADOPT_PRICE_MONTHLY_EUR) : 75
export const ADOPT_PRICE_YEARLY_EUR: number =
  process.env.ADOPT_PRICE_YEARLY_EUR ? Number(process.env.ADOPT_PRICE_YEARLY_EUR) : 900

// Production sanity check — warn on server if FareHarbor shortname isn't
// explicitly set, so prod with a misconfigured env falls back to a demo account
// silently instead of visibly failing.
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME) {
    log.warn('[fareharbor] NEXT_PUBLIC_FAREHARBOR_SHORTNAME unset in production — falling back to hardcoded default. Check your deploy env vars.')
}

/**
 * FareHarbor booking embed URL generator.
 *
 * Uses NEXT_PUBLIC_FAREHARBOR_SHORTNAME so it can be read client-side.
 * Falls back to the demo account "alpacasibiza" if not set.
 */
export function getFareHarborEmbedUrl(options?: { fullItems?: boolean }) {
  const shortname =
    process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME || 'alpacasibiza'
  const params = []
  if (options?.fullItems) params.push('full-items=yes')
  const query = params.length ? `?${params.join('&')}` : ''
  return `https://fareharbor.com/embeds/book/${shortname}/${query}`
}

export const FAREHARBOR_BOOKING_URL = getFareHarborEmbedUrl({ fullItems: true })

// item-specific environment variables (optional)
// All undefined when env var missing — getFareHarborItemUrl(undefined) falls back to base calendar.
export const FAREHARBOR_ITEM_WOVEN = process.env.FAREHARBOR_ITEM_WOVEN
export const FAREHARBOR_ITEM_COMMISSION = process.env.FAREHARBOR_ITEM_COMMISSION
export const FAREHARBOR_ITEM_ALCACA = process.env.FAREHARBOR_ITEM_ALCACA

// ── Per-tour item IDs (canonical naming — match lib/validate-env.ts Tier 2) ──
export const FAREHARBOR_ITEM_TOUR_MEET_HERD         = process.env.FAREHARBOR_ITEM_TOUR_MEET_HERD
export const FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP  = process.env.FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP
export const FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE   = process.env.FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE
export const FAREHARBOR_ITEM_TOUR_PHOTO_SESSION     = process.env.FAREHARBOR_ITEM_TOUR_PHOTO_SESSION

// ── Activity item IDs (yoga / weddings / experiences / gifts) ──
export const FAREHARBOR_ITEM_YOGA                = process.env.FAREHARBOR_ITEM_YOGA
export const FAREHARBOR_ITEM_WEDDINGS            = process.env.FAREHARBOR_ITEM_WEDDINGS
export const FAREHARBOR_ITEM_PHOTOSHOOTS         = process.env.FAREHARBOR_ITEM_PHOTOSHOOTS
export const FAREHARBOR_ITEM_ROMANTIC_SUNSET     = process.env.FAREHARBOR_ITEM_ROMANTIC_SUNSET
export const FAREHARBOR_ITEM_FAMILY_FARM_DAYS    = process.env.FAREHARBOR_ITEM_FAMILY_FARM_DAYS
export const FAREHARBOR_ITEM_BUSINESS_INCENTIVES = process.env.FAREHARBOR_ITEM_BUSINESS_INCENTIVES
export const FAREHARBOR_ITEM_GIFT_CARD           = process.env.FAREHARBOR_ITEM_GIFT_CARD

/**
 * Return a booking URL for a specific item; falls back to base booking URL.
 */
export function getFareHarborItemUrl(itemId?: string, options?: { fullItems?: boolean }) {
  const base = getFareHarborEmbedUrl(options)
  if (itemId) {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}items=${encodeURIComponent(itemId)}`
  }
  return base
}

/**
 * Convenience for category-specific item vars.
 */
export function getFareHarborCategoryUrl(category: 'woven' | 'commission' | 'alcaca') {
  switch (category) {
    case 'woven':
      return getFareHarborItemUrl(FAREHARBOR_ITEM_WOVEN)
    case 'commission':
      return getFareHarborItemUrl(FAREHARBOR_ITEM_COMMISSION)
    case 'alcaca':
      return getFareHarborItemUrl(FAREHARBOR_ITEM_ALCACA)
  }
}
