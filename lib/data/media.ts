/**
 * Photo gallery and media assets for Alpacas Ibiza.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ACTIVATE A PHOTO — single-file edit:
 *
 *   Step 1: Drop file at:
 *             public/images/gallery/<id>.webp   (or .jpg / .png)
 *
 *   Step 2: Add one entry to the `media` array below with status: 'live':
 *
 *     { id: 'farm-morning-01',
 *       photoUrl: '/images/gallery/farm-morning-01.webp',
 *       caption: 'Morning light on the herd',
 *       category: 'farm',
 *       status: 'live' },
 *
 *   Optional fields: credit, dateTaken (ISO), featured
 *   No other file needs touching.
 *
 * Component fail-quiet: PhotoGallery returns null in production when the
 * filtered set is empty. Dev mode shows a dashed amber hint box instead.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Categories:
 *   'farm'     — farm landscape, finca life, morning/sunset shots
 *   'alpacas'  — individual alpaca portraits, herd shots
 *   'weaving'  — loom, in-progress weaving, finished pieces
 *   'events'   — weddings, photoshoots, corporate visits, family days
 *   'press'    — magazine/newspaper spreads featuring the farm
 *   'general'  — anything that doesn't fit above
 */

export type MediaStatus = 'pending' | 'live'
export type MediaCategory = 'farm' | 'alpacas' | 'weaving' | 'events' | 'press' | 'general'

export interface MediaItem {
  id: string
  photoUrl: string | null
  caption?: string
  credit?: string
  category: MediaCategory
  dateTaken?: string  // ISO date string e.g. '2024-07-15'
  featured?: boolean  // surface above the fold or on home page
  status: MediaStatus
}

/**
 * Owner-provided photos. Empty until owner drops files into
 * public/images/gallery/ and adds entries here with status: 'live'.
 *
 * UNMAPPED — no photos invented. Every entry must be owner-supplied.
 */
export const media: MediaItem[] = [
  // Example (uncomment + customise when first photo is ready):
  // { id: 'farm-morning-01', photoUrl: '/images/gallery/farm-morning-01.webp',
  //   caption: 'Morning light on the herd', category: 'farm', status: 'live' },
]

/** Returns all live media, optionally filtered by category. */
export function liveMedia(category?: MediaCategory): MediaItem[] {
  return media.filter(
    (m) => m.status === 'live' && m.photoUrl !== null && (!category || m.category === category),
  )
}

/** True when at least one photo is live (any category). */
export function hasLiveMedia(): boolean {
  return media.some((m) => m.status === 'live' && m.photoUrl !== null)
}
