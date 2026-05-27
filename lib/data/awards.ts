/**
 * Awards, certifications, and trust badges.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ACTIVATE A BADGE — single-file edit:
 *
 *   Step 1: Drop logo file at:
 *             public/images/awards/<id>.svg   (PNG also accepted)
 *
 *   Step 2: Add entry below (or edit an existing 'pending' entry):
 *             set logoUrl: '/images/awards/<id>.svg'
 *             set status: 'live'
 *             optionally add verifyUrl to deep-link to the issuing org's page
 *
 *   Example:
 *     Before:
 *       { id: 'tripadvisor-travelers-choice', name: 'Travelers\' Choice',
 *         issuer: 'TripAdvisor', category: 'travel-award', year: 2024,
 *         verifyUrl: null, logoUrl: null, status: 'pending' },
 *
 *     After:
 *       { id: 'tripadvisor-travelers-choice', name: 'Travelers\' Choice',
 *         issuer: 'TripAdvisor', category: 'travel-award', year: 2024,
 *         verifyUrl: 'https://www.tripadvisor.com/...',
 *         logoUrl: '/images/awards/tripadvisor-travelers-choice.svg',
 *         status: 'live' },
 *
 *   verifyUrl is optional — omit (null) if no public verification page exists.
 *
 * Categories help filter within AwardsBadges:
 *   tourism        — local tourism body recognition (e.g. Visit Ibiza)
 *   sustainability — eco, organic, or environmental certifications
 *   animal-welfare — animal care / welfare schemes
 *   travel-award   — booking / review platform awards (TripAdvisor, etc.)
 *   other          — anything else
 *
 * Component fail-quiet: AwardsBadges returns null in production until at least
 * one entry has logoUrl !== null AND status === 'live'. Dev mode shows a dashed
 * amber hint box instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type AwardStatus = 'pending' | 'live'
export type AwardCategory = 'tourism' | 'sustainability' | 'animal-welfare' | 'travel-award' | 'other'

export interface Award {
  id: string
  name: string
  issuer: string
  category: AwardCategory
  year?: number
  verifyUrl: string | null  // null until owner provides; deep-link to verification page when known
  logoUrl: string | null    // null until owner provides logo file
  status: AwardStatus
}

export const awards: Award[] = [
  // Owner adds entries here. Empty until certs/awards are confirmed.
  // DO NOT invent award names — add only awards the farm actually holds.
]

export function liveAwards(category?: AwardCategory): Award[] {
  return awards.filter(
    (a) => a.logoUrl !== null && a.status === 'live' && (!category || a.category === category)
  )
}

export function hasLiveAwards(): boolean {
  return awards.some((a) => a.logoUrl !== null && a.status === 'live')
}
