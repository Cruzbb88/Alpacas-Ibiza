/**
 * Events calendar — "What's On" at Alpacas Ibiza.
 *
 * To activate an event:
 *   1. Add an entry below with status: 'live'
 *   2. Set `date` (ISO) for one-off OR `recurrence` for recurring
 *      (e.g. 'weekly:wed' or 'weekly:wed,sat' or 'monthly:1st-sat')
 *   3. Component filters past events automatically and sorts upcoming
 *
 * ONE-EDIT EXAMPLE — add this block to the `events` array and set status: 'live':
 *
 *   {
 *     id: 'yoga-weekly',
 *     title: 'Alpaca Yoga',
 *     type: 'yoga',
 *     date: null,
 *     recurrence: 'weekly:wed,sat',
 *     durationMinutes: 75,
 *     capacity: 6,
 *     priceLabel: '€30/person',
 *     description: 'Hatha yoga among the herd. Includes herbal tea.',
 *     ctaUrl: 'mailto:info@alpacasibiza.com?subject=Alpaca Yoga booking',
 *     ctaLabel: 'Book a session',
 *     status: 'live',
 *   },
 *
 * Types: 'yoga' | 'workshop' | 'wedding' | 'photoshoot' | 'open-day' | 'private' | 'other'
 */

export type EventStatus = 'pending' | 'live' | 'cancelled'
export type EventType = 'yoga' | 'workshop' | 'wedding' | 'photoshoot' | 'open-day' | 'private' | 'other'

export interface EventItem {
  id: string
  title: string
  description?: string
  type: EventType
  /** ISO datetime for one-off events; null for recurring (use `recurrence` instead) */
  date: string | null
  /** Optional recurrence rule. Format: 'weekly:wed' | 'weekly:wed,sat' | 'monthly:1st-sat' | 'monthly:15th' */
  recurrence?: string | null
  /** Optional duration in minutes — for "3 hours" displays */
  durationMinutes?: number
  /** Optional max capacity */
  capacity?: number
  /** Optional price hint (e.g. "€30/person") */
  priceLabel?: string
  /** Optional CTA URL — FareHarbor link OR contact mailto OR external */
  ctaUrl?: string | null
  /** Optional CTA label */
  ctaLabel?: string
  status: EventStatus
}

export const events: EventItem[] = [
  // Owner-provided. Examples:
  // { id: 'yoga-weekly', title: 'Alpaca Yoga', type: 'yoga',
  //   date: null, recurrence: 'weekly:wed,sat',
  //   durationMinutes: 75, capacity: 6, priceLabel: '€30/person',
  //   description: 'Hatha yoga among the herd. Includes herbal tea.',
  //   ctaUrl: 'mailto:info@alpacasibiza.com?subject=Alpaca Yoga booking',
  //   ctaLabel: 'Book a session', status: 'live' },
]

export function upcomingEvents(): EventItem[] {
  const now = new Date()
  const upcoming = events.filter((e) => {
    if (e.status !== 'live') return false
    if (e.recurrence) return true // recurring shows always
    if (!e.date) return false
    return new Date(e.date) >= now
  })
  return upcoming.sort((a, b) => {
    // Recurring events sort to top; one-offs sorted by date asc
    if (a.recurrence && !b.recurrence) return -1
    if (!a.recurrence && b.recurrence) return 1
    if (!a.date || !b.date) return 0
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}

export function hasUpcomingEvents(): boolean {
  return upcomingEvents().length > 0
}
