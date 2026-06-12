/**
 * Alpaca roster — sourced from live site /onze-alpacas via REALITY_CHECK.md Tier 2.
 * Owner must confirm — births/deaths since last verify.
 *
 * bio and image are null = UNMAPPED until owner provides. Do NOT invent values.
 * See OWNER_INPUT_NEEDED.md for the data collection request.
 *
 * NOTE: This file is a reference roster only.
 * The LIVE DATA SOURCE consumed by the UI is:
 *   lib/tenants/alpacasibiza-content.ts → animals[]
 *
 * To add bios + photos, edit lib/tenants/alpacasibiza-content.ts.
 * See the HOW TO ACTIVATE AN ALPACA docblock at the top of that file.
 */

export interface Alpaca {
  id: string         // slug
  name: string
  bio: string | null // null = UNMAPPED (owner input needed)
  image: string | null
  /**
   * Birth date in YYYY-MM-DD format.
   * null = owner has not yet supplied the date — see OWNER_INPUT_NEEDED.md.
   * Do NOT invent dates.
   */
  birthDate?: string | null
}

/**
 * Resolve an alpaca slug to its display name from the canonical roster.
 * Returns null when the slug is not in the roster — callers MUST treat this
 * as "no specific alpaca chosen" (e.g. user supplied a forged slug, or picker
 * defaulted to "pick for me").
 *
 * Used by the Adopt flow to:
 *   1. Validate `?alpaca=<slug>` query param before passing to Stripe metadata
 *      (untrusted input — rejecting unknown slugs prevents arbitrary text
 *      reaching the Stripe Dashboard metadata viewer).
 *   2. Look up the human-readable name for the welcome email.
 */
export function findAlpacaName(slug: string | null | undefined): string | null {
  if (!slug) return null
  const hit = ALPACAS.find((a) => a.id === slug)
  return hit ? hit.name : null
}

/** CDN base shared by all alpaca portrait thumbnails (from live site inventory). */

export const ALPACAS: Alpaca[] = [
  { id: 'barbarella', name: 'Barbarella', bio: null, image: '/images/alpacas/barbarella.jpg', birthDate: null },
  { id: 'avalon',     name: 'Avalon',     bio: null, image: '/images/alpacas/avalon.jpg', birthDate: null },
  { id: 'bardot',     name: 'Bardot',     bio: null, image: '/images/alpacas/bardot.jpg', birthDate: '2022-01-19' }, // Extracted from bio prose; owner to confirm exact day
  { id: 'chet',       name: 'Chet',       bio: null, image: '/images/alpacas/chet.jpg', birthDate: '2020-11-20' }, // Extracted from bio prose; owner to confirm exact day
  { id: 'dusty',      name: 'Dusty',      bio: null, image: '/images/alpacas/dusty.jpg', birthDate: null },
  { id: 'fela',       name: 'Fela',       bio: null, image: '/images/alpacas/fela.jpg', birthDate: null },
  { id: 'fonda',      name: 'Fonda',      bio: null, image: '/images/alpacas/fonda.jpg', birthDate: null },
  { id: 'lewis',      name: 'Lewis',      bio: null, image: '/images/alpacas/lewis.jpg', birthDate: null },
  { id: 'marron',     name: 'Marron',     bio: null, image: '/images/alpacas/marron.jpg', birthDate: null },
  { id: 'mojo',       name: 'Mojo',       bio: null, image: '/images/alpacas/mojo.jpg', birthDate: null },
  { id: 'moloko',     name: 'Moloko',     bio: null, image: '/images/alpacas/moloko.jpg', birthDate: null },
  { id: 'nelson',     name: 'Nelson',     bio: null, image: '/images/alpacas/nelson.jpg', birthDate: null },
  { id: 'suki',       name: 'Suki',       bio: null, image: '/images/alpacas/suki.jpg', birthDate: null },
  { id: 'toots',      name: 'Toots',      bio: null, image: '/images/alpacas/toots.jpg', birthDate: '2021-02-03' }, // Extracted from bio prose; owner to confirm exact day
]
