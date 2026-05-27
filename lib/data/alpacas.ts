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
}

export const ALPACAS: Alpaca[] = [
  { id: 'barbarella', name: 'Barbarella', bio: null, image: null },
  { id: 'avalon',     name: 'Avalon',     bio: null, image: null },
  { id: 'bardot',     name: 'Bardot',     bio: null, image: null },
  { id: 'chet',       name: 'Chet',       bio: null, image: null },
  { id: 'dusty',      name: 'Dusty',      bio: null, image: null },
  { id: 'fela',       name: 'Fela',       bio: null, image: null },
  { id: 'fonda',      name: 'Fonda',      bio: null, image: null },
  { id: 'lewis',      name: 'Lewis',      bio: null, image: null },
  { id: 'marron',     name: 'Marron',     bio: null, image: null },
  { id: 'mojo',       name: 'Mojo',       bio: null, image: null },
  { id: 'moloko',     name: 'Moloko',     bio: null, image: null },
  { id: 'nelson',     name: 'Nelson',     bio: null, image: null },
  { id: 'suki',       name: 'Suki',       bio: null, image: null },
  { id: 'toots',      name: 'Toots',      bio: null, image: null },
]
