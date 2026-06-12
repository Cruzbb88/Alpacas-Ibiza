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
// Photos self-hosted from the live alpacasibiza.com site (2026-06-06) — the
// owner's own photography, copied into the repo so the gallery survives the old
// Squarespace site being taken down. Captions describe what each photo shows
// (no marketing copy invented). Owner can re-caption / add more any time.
export const media: MediaItem[] = [
  { id: 'herd-chicas', photoUrl: '/images/gallery/farm-wide.jpg', caption: 'The herd at Es Currals', category: 'alpacas', status: 'live', featured: true },
  { id: 'farm-02', photoUrl: '/images/gallery/farm-02.jpg', caption: 'Farm life at Es Currals', category: 'farm', status: 'live' },
  { id: 'farm-03', photoUrl: '/images/gallery/farm-03.jpg', caption: 'The finca', category: 'farm', status: 'live' },
  { id: 'farm-05', photoUrl: '/images/gallery/farm-05.jpg', caption: 'Alpacas in the paddock', category: 'farm', status: 'live' },
  { id: 'farm-07', photoUrl: '/images/gallery/farm-07.jpg', caption: 'A day on the farm', category: 'farm', status: 'live' },
  { id: 'weaving-15', photoUrl: '/images/gallery/weaving-15.jpg', caption: 'Handwoven alpaca textiles', category: 'weaving', status: 'live' },
  { id: 'nelson-fibre', photoUrl: '/images/gallery/nelson-fibre.jpg', caption: 'Alpaca fibre from our own herd', category: 'weaving', status: 'live' },
  { id: 'wedding-49', photoUrl: '/images/gallery/wedding-49.jpg', caption: 'Weddings & photoshoots at the farm', category: 'events', status: 'live' },
  { id: 'yoga-53', photoUrl: '/images/gallery/yoga-53.jpg', caption: 'Alpaca yoga in the paddock', category: 'events', status: 'live' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Virtual Farm Tour
//
// HOW TO ACTIVATE A STOP — single-file edit:
//
//   Step 1: Drop photo at public/images/virtual-tour/<id>.webp (or .jpg/.png)
//   Step 2: Update the stop below: set imageSrc to the path, status to 'live'
//
//   No other file needs touching.
//
// VirtualFarmTour component fail-quiet: renders null in production when
// filtered set (status=live AND imageSrc!=null) is empty. Dev shows amber hint.
// ─────────────────────────────────────────────────────────────────────────────

export interface VirtualTourStop {
  id: string
  label: string             // e.g. "Main pasture" / "Weaving studio"
  description: string       // 1-2 sentences
  imageSrc: string | null   // null until owner adds photo
  status: 'live' | 'draft'
}

/**
 * Owner-provided virtual tour stops. All draft until owner drops files into
 * public/images/virtual-tour/ and sets imageSrc + status: 'live'.
 *
 * UNMAPPED — no photos invented. Every imageSrc must be owner-supplied.
 */
export const virtualTour: VirtualTourStop[] = [
  {
    id: 'pasture',
    label: 'Main Pasture',
    description: 'The heart of Es Currals — where the herd roams, grazes, and suns themselves throughout the day.',
    imageSrc: null,
    status: 'draft',
  },
  {
    id: 'studio',
    label: 'Weaving Studio',
    description: 'Our on-farm studio where raw alpaca fibre is turned into hand-woven textiles using traditional techniques.',
    imageSrc: null,
    status: 'draft',
  },
  {
    id: 'alpaca-paddock',
    label: 'Alpaca Paddock',
    description: 'The shaded paddock where visitors meet the alpacas up close — perfect for photos and quiet connection.',
    imageSrc: null,
    status: 'draft',
  },
  {
    id: 'garden',
    label: 'Finca Garden',
    description: 'The terraced gardens surrounding the finca, planted with Mediterranean herbs, fruit trees, and wildflowers.',
    imageSrc: null,
    status: 'draft',
  },
  {
    id: 'view',
    label: 'Ibiza Countryside View',
    description: 'A panoramic view across the San Carlos valley — pine forests, red earth, and the distant shimmer of the sea.',
    imageSrc: null,
    status: 'draft',
  },
]

/** Returns live virtual tour stops that have an imageSrc set. */
export function liveVirtualTourStops(): VirtualTourStop[] {
  return virtualTour.filter((s) => s.status === 'live' && s.imageSrc !== null)
}

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
