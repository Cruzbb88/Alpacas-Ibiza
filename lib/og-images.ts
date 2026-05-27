import { SITE_BASE_URL } from './config'

/**
 * Open Graph image registry.
 *
 * To add a per-page OG image:
 *   1. Drop file at public/images/og/<slug>.webp  (1200×630 recommended)
 *   2. Uncomment the matching line below (or add a new one)
 *   3. The page's generateMetadata already calls getOgImage(slug) — no further
 *      code change needed.
 *
 * Without a per-page entry, getOgImage falls back to DEFAULT_OG_IMAGE.
 * Social platforms render no preview until the file actually exists at the URL —
 * all paths below point at files that are owner-provided; the registry is wired
 * but inert until the file drops.
 */

export const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/images/og/default.webp`

/** Slug → absolute OG image URL. Empty until owner provides images. */
const OG_IMAGES: Record<string, string> = {
  // home:           `${SITE_BASE_URL}/images/og/home.webp`,
  // tours:          `${SITE_BASE_URL}/images/og/tours.webp`,
  // alpacas:        `${SITE_BASE_URL}/images/og/alpacas.webp`,
  // adopt:          `${SITE_BASE_URL}/images/og/adopt.webp`,
  // sustainability: `${SITE_BASE_URL}/images/og/sustainability.webp`,
  // weddings:       `${SITE_BASE_URL}/images/og/weddings.webp`,
  // yoga:           `${SITE_BASE_URL}/images/og/yoga.webp`,
  // workshops:      `${SITE_BASE_URL}/images/og/workshops.webp`,
  // gifts:          `${SITE_BASE_URL}/images/og/gifts.webp`,
  // journal:        `${SITE_BASE_URL}/images/og/journal.webp`,
  // media:          `${SITE_BASE_URL}/images/og/media.webp`,
  // 'press-kit':    `${SITE_BASE_URL}/images/og/press-kit.webp`,
}

export interface OgImageMeta {
  url: string
  width: number
  height: number
  alt: string
}

/**
 * Return OG image metadata for a given route slug.
 * Falls back to DEFAULT_OG_IMAGE when no per-page entry exists.
 *
 * @param slug - Route key matching the keys in OG_IMAGES (e.g. 'tours', 'adopt').
 * @param alt  - Optional alt text override. Defaults to 'Alpacas Ibiza'.
 */
export function getOgImage(slug: string, alt?: string): OgImageMeta {
  return {
    url: OG_IMAGES[slug] ?? DEFAULT_OG_IMAGE,
    width: 1200,
    height: 630,
    alt: alt ?? 'Alpacas Ibiza',
  }
}
