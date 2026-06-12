
import { makeRequestLogger } from './request-id.ts'
import type { SeasonalPriceWindow } from '@/components/seasonal-price-list'

const log = makeRequestLogger('config', '')

// central config helpers for environment-driven constants

/**
 * Adopt-a-Paca campaign banner — env-gated. All three must be set for the banner
 * to render; unset = `null` and `<CampaignBanner>` returns null (fail-open).
 * End date is parsed as ISO; past dates auto-hide the banner.
 */
export const CAMPAIGN_HEADLINE: string | null = process.env.ADOPT_CAMPAIGN_HEADLINE ?? null
export const CAMPAIGN_SUBLINE: string | null = process.env.ADOPT_CAMPAIGN_SUBLINE ?? null
export const CAMPAIGN_END_DATE: string | null = process.env.ADOPT_CAMPAIGN_END_DATE ?? null

/**
 * Tour bundle / experience package pricing — env-gated.
 * Owner flips these to activate "Book both and save €X" CTAs on tours + yoga pages.
 * Renders null when discount === 0 OR url unset (fail-open).
 * Pattern: same ADOPT_DISCOUNT_CODE_* env-gate approach.
 */
// Fix 4: guard against NaN from malformed env vars (e.g. Number('abc') === NaN).
// `=== 0` does not catch NaN; Number.isFinite correctly rejects it.
// Both bundle discount constants use the same pattern.
const _rawBundleTourYoga = Number(process.env.BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR ?? 0)
export const BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR = Number.isFinite(_rawBundleTourYoga) && _rawBundleTourYoga > 0 ? _rawBundleTourYoga : 0
export const BUNDLE_TOUR_PLUS_YOGA_URL = process.env.BUNDLE_TOUR_PLUS_YOGA_URL  // FareHarbor bundle item or specific tour
const _rawBundleAdoptTour = Number(process.env.BUNDLE_ADOPT_PLUS_TOUR_DISCOUNT_EUR ?? 0)
export const BUNDLE_ADOPT_PLUS_TOUR_DISCOUNT_EUR = Number.isFinite(_rawBundleAdoptTour) && _rawBundleAdoptTour > 0 ? _rawBundleAdoptTour : 0
export const BUNDLE_ADOPT_PLUS_TOUR_URL = process.env.BUNDLE_ADOPT_PLUS_TOUR_URL

/**
 * Canonical site origin — used in metadata, sitemap, hreflang, structured data, OG URLs.
 * `NEXT_PUBLIC_SITE_URL` allows preview/staging override without code change. Never has trailing slash.
 */
export const SITE_BASE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alpacasibiza.com').replace(/\/$/, '')

/**
 * Pricing constants — single source of truth. Editable here only.
 *
 * PROVENANCE (corrected 2026-06-06):
 *   - TOUR_BASE_PRICE_EUR €21.19 — OWNER-SOURCED from the live FareHarbor booking
 *     widget (fareharbor.com/embeds/book/alpacasibiza, "Alpaca Tour · From €21.19
 *     · All Ages · 1 hour"), rendered in a real browser. This is the price a
 *     customer actually pays. The previous €30 was a THIRD-PARTY AGGREGATOR's
 *     marked-up reseller number (farmexperiencestours.com) — wrong; removed.
 *   - YOGA_PRICE_EUR €30 — from the live /alpaca-yoga page. (FareHarbor yoga
 *     price not separately re-confirmed; if it differs, FareHarbor wins.)
 */
export const TOUR_BASE_PRICE_EUR = 21.19
export const YOGA_PRICE_EUR: number =
  process.env.YOGA_PRICE_EUR ? Number(process.env.YOGA_PRICE_EUR) : 30

/**
 * Skein sponsorship price.
 * Single-payment product: sponsor an alpaca's spring shearing → receive spun wool.
 * Tier 2 env var: SKEIN_PRICE_EUR defaults €200; override for staging tests.
 */
const _rawSkeinPrice = parseInt(process.env.SKEIN_PRICE_EUR ?? '200', 10)
export const SKEIN_SPONSORSHIP_PRICE_EUR = Number.isFinite(_rawSkeinPrice) && _rawSkeinPrice > 0 ? _rawSkeinPrice : 200

/**
 * Annual Farm Pass (Membership) — env-gated. Mirrors Skein pattern.
 * MEMBERSHIP_LIVE=true activates the /membership page and homepage callout.
 * STRIPE_MEMBERSHIP_PRICE_ID is the pre-created Stripe Price ID for the annual pass.
 * MEMBERSHIP_PRICE_EUR defaults 0 (hidden) until owner sets both keys.
 */
const _rawMembershipPrice = Number(process.env.MEMBERSHIP_PRICE_EUR ?? 0)
export const MEMBERSHIP_PRICE_EUR =
  Number.isFinite(_rawMembershipPrice) && _rawMembershipPrice > 0 ? _rawMembershipPrice : 0
export const MEMBERSHIP_LIVE = process.env.MEMBERSHIP_LIVE === 'true'
export const STRIPE_MEMBERSHIP_PRICE_ID = process.env.STRIPE_MEMBERSHIP_PRICE_ID

/**
 * Herd Family (monthly-tier dedicated landing page) — env-gated.
 * HERD_FAMILY_LIVE=true activates /herd-family nav/footer link and homepage callout.
 */
export const HERD_FAMILY_LIVE = process.env.HERD_FAMILY_LIVE === 'true'

/**
 * Skein seasonal callout / nav item — env-gated.
 * SKEIN_CALLOUT_LIVE=true shows the skein sub-item in the Adopt mega-menu
 * and the homepage callout during shearing season.
 */
export const SKEIN_CALLOUT_LIVE = process.env.SKEIN_CALLOUT_LIVE === 'true'

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
  // The live site routes every booking through flow 1257173
  // (`…/alpacasibiza/?full-items=yes&flow=1257173`). Without the flow id the
  // embed defaults to FareHarbor's generic flow, so our direct booking links
  // diverged from the real booking experience. Env-overridable, hardcoded
  // fallback matches the verified flow id (CLAUDE.md + tenant config).
  const flowId = process.env.NEXT_PUBLIC_FAREHARBOR_FLOW_ID || '1257173'
  const params = []
  if (options?.fullItems) params.push('full-items=yes')
  if (flowId) params.push(`flow=${flowId}`)
  const query = params.length ? `?${params.join('&')}` : ''
  return `https://fareharbor.com/embeds/book/${shortname}/${query}`
}

export const FAREHARBOR_BOOKING_URL = getFareHarborEmbedUrl({ fullItems: true })

// item-specific environment variables (optional)
// All undefined when env var missing — getFareHarborItemUrl(undefined) falls back to base calendar.
export const FAREHARBOR_ITEM_WOVEN = process.env.FAREHARBOR_ITEM_WOVEN
export const FAREHARBOR_ITEM_COMMISSION = process.env.FAREHARBOR_ITEM_COMMISSION
export const FAREHARBOR_ITEM_ALCACA = process.env.FAREHARBOR_ITEM_ALCACA

// ── Weaving-workshop item ID (the real /workshops offering) ──
// The other per-tour IDs (MEET_HERD / FARM_EXPERIENCE / PHOTO_SESSION) were
// removed 2026-06-06 — AI-fabricated tour types; FareHarbor has one Alpaca Tour.
export const FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP  = process.env.FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP

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
 * Junior / kids membership tier — env-gated. Mirrors Membership pattern.
 * JUNIOR_TIER_LIVE=true activates JuniorTierCard on /adopt and /api/junior-checkout.
 * STRIPE_JUNIOR_PRICE_ID is the pre-created Stripe Price ID for the junior tier.
 * JUNIOR_TIER_PRICE_EUR defaults 0 (hidden) until owner sets all three keys.
 */
export const JUNIOR_TIER_LIVE = process.env.JUNIOR_TIER_LIVE === 'true'
export const JUNIOR_TIER_PRICE_EUR = (() => {
  const n = Number(process.env.JUNIOR_TIER_PRICE_EUR ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
})()
export const STRIPE_JUNIOR_PRICE_ID = process.env.STRIPE_JUNIOR_PRICE_ID

/**
 * Optional seasonal pricing windows for the alpaca tour, parsed from a single
 * env var TOUR_SEASONAL_WINDOWS as a JSON array. Owner activates by setting:
 *   TOUR_SEASONAL_WINDOWS='[{"label":"Off-peak","startDate":"2026-11-01","endDate":"2026-03-31","priceEur":18},{"label":"Peak","startDate":"2026-04-01","endDate":"2026-10-31","priceEur":21.19}]'
 * Returns empty array if unset / malformed (fail-quiet).
 */
export function getTourSeasonalWindows(): SeasonalPriceWindow[] {
  const raw = process.env.TOUR_SEASONAL_WINDOWS
  if (!raw || raw.startsWith('TODO_')) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(w => typeof w?.startDate === 'string' && typeof w?.endDate === 'string' && Number.isFinite(w?.priceEur))
  } catch { return [] }
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
