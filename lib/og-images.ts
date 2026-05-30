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

/**
 * Generic OG image generator — branded gradient, no owner asset needed.
 * Accepts optional ?title= and ?subtitle= query params.
 */
export const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/og`

/**
 * Build a dynamic OG URL for a named page.
 * Falls back to the bare generator when title/subtitle are omitted.
 */
function ogUrl(title: string, subtitle?: string): string {
  const u = new URL(`${SITE_BASE_URL}/og`)
  u.searchParams.set('title', title)
  if (subtitle) u.searchParams.set('subtitle', subtitle)
  return u.toString()
}

/** Slug → absolute OG image URL. Dynamic generator used until owner provides images. */
const OG_IMAGES: Record<string, string> = {
  home:           ogUrl('Alpacas Ibiza', "Ibiza's first alpaca farm · Es Currals"),
  tours:          ogUrl('Book a Tour', 'Walk with alpacas on Ibiza · Es Currals'),
  alpacas:        ogUrl('Meet the Herd', 'Every alpaca has a name and a story'),
  adopt:          ogUrl('Adopt an Alpaca', 'Support the herd · Alpacas Ibiza'),
  about:          ogUrl('Our Story', 'Alpacas Ibiza · Es Currals'),
  sustainability: ogUrl('Sustainability', 'Eco-conscious alpaca farming on Ibiza'),
  weddings:       ogUrl('Weddings & Events', 'Celebrate with alpacas · Alpacas Ibiza'),
  yoga:           ogUrl('Alpaca Yoga', 'Sunrise yoga with alpacas · Ibiza'),
  workshops:      ogUrl('Workshops', 'Hands-on farm experiences · Alpacas Ibiza'),
  gifts:          ogUrl('Gift Experiences', 'Give the gift of alpacas · Ibiza'),
  journal:        ogUrl('Journal', 'Stories from the farm · Alpacas Ibiza'),
  media:          ogUrl('Media', 'Press & photos · Alpacas Ibiza'),
  press:          ogUrl('Press', 'In the news · Alpacas Ibiza'),
  'press-kit':    ogUrl('Press Kit', 'Media resources · Alpacas Ibiza'),
  weaving:        ogUrl('Wishfulfilling Weaving', "Handwoven scarves from our herd's fleece · Es Currals"),
  'weaving/collection': ogUrl('Weaving Collection', 'Handcrafted textiles from Alpacas Ibiza'),
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
