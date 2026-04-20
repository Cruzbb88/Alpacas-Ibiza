
// central config helpers for environment-driven constants

// Production sanity check — warn on server if FareHarbor shortname isn't
// explicitly set, so prod with a misconfigured env falls back to a demo account
// silently instead of visibly failing.
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME) {
    console.warn('[fareharbor] NEXT_PUBLIC_FAREHARBOR_SHORTNAME unset in production — falling back to hardcoded default. Check your deploy env vars.')
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
export const FAREHARBOR_ITEM_WOVEN = process.env.FAREHARBOR_ITEM_WOVEN
export const FAREHARBOR_ITEM_COMMISSION = process.env.FAREHARBOR_ITEM_COMMISSION
export const FAREHARBOR_ITEM_ALCACA = process.env.FAREHARBOR_ITEM_ALCACA

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
