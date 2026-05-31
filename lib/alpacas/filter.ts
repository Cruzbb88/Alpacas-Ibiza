/**
 * Pure filter helpers for the alpaca listing page.
 *
 * No 'use client' — safe to import from both server components and
 * client components. Extracted from alpaca-search-filter.tsx so the
 * server page does not drag the client component graph into the server
 * bundle.
 */

export const FILTER_PERSONALITIES = ['calm', 'playful', 'bold', 'shy', 'sociable', 'independent'] as const
// Derived from the union of distinct color words present across the 14-animal roster:
// white (Dusty, Lewis/milk white, Nelson/white with orange tint),
// grey  (Barbarella/light rose grey, Bardot/greyish-brown),
// brown (Bardot/greyish-brown, Fela, Marron, Mojo/brown tones),
// fawn  (Suki/medium fawn),
// orange (Toots/orange-reddish).
// 'mixed' removed — matched zero animals in the real roster.
export const FILTER_COLORS = ['white', 'grey', 'brown', 'fawn', 'orange'] as const
export const FILTER_BREEDS = ['huacaya', 'suri'] as const

export type PersonalityFilter = typeof FILTER_PERSONALITIES[number]
export type ColorFilter = typeof FILTER_COLORS[number]
export type BreedFilter = typeof FILTER_BREEDS[number]

/**
 * Parse a comma-joined URL param value into a trimmed, non-empty string array.
 * e.g. "calm,playful" → ["calm", "playful"]
 */
export function parseListParam(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * Apply URL filter state to an animal roster.
 *
 * Matching is case-insensitive substring on personality/color/breed strings.
 * Empty filter set on a dimension = no filter for that dimension (passes through).
 */
export function filterAlpacas<T extends { personality?: string | null; color?: string | null; breed?: string | null }>(
  animals: ReadonlyArray<T>,
  filters: { p?: string[]; c?: string[]; b?: string[] },
): T[] {
  const personalities = (filters.p ?? []).map((s) => s.toLowerCase())
  const colors = (filters.c ?? []).map((s) => s.toLowerCase())
  const breeds = (filters.b ?? []).map((s) => s.toLowerCase())
  return animals.filter((a) => {
    if (personalities.length > 0) {
      const p = (a.personality ?? '').toLowerCase()
      if (!personalities.some((needle) => p.includes(needle))) return false
    }
    if (colors.length > 0) {
      const c = (a.color ?? '').toLowerCase()
      if (!colors.some((needle) => c.includes(needle))) return false
    }
    if (breeds.length > 0) {
      const b = (a.breed ?? '').toLowerCase()
      if (!breeds.some((needle) => b.includes(needle))) return false
    }
    return true
  })
}
