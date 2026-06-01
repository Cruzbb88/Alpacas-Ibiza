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

export const ALPACAS: Alpaca[] = [
  { id: 'barbarella', name: 'Barbarella', bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'avalon',     name: 'Avalon',     bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'bardot',     name: 'Bardot',     bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED — born 19 Jan 2022 per bio; owner to confirm YYYY-MM-DD
  { id: 'chet',       name: 'Chet',       bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED — born 20 Nov 2020 per bio; owner to confirm
  { id: 'dusty',      name: 'Dusty',      bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'fela',       name: 'Fela',       bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'fonda',      name: 'Fonda',      bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'lewis',      name: 'Lewis',      bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'marron',     name: 'Marron',     bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'mojo',       name: 'Mojo',       bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'moloko',     name: 'Moloko',     bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'nelson',     name: 'Nelson',     bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'suki',       name: 'Suki',       bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED
  { id: 'toots',      name: 'Toots',      bio: null, image: null, birthDate: null }, // OWNER_INPUT_NEEDED — born 3 Feb 2021 per bio; owner to confirm
]
