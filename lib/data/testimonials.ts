/**
 * Customer testimonials. Owner adds entries via single per-row edit.
 *
 * HOW TO ACTIVATE A TESTIMONIAL -- single-file edit:
 *
 *   Step 1: Add a new entry (or set an existing entry to status: 'live')
 *   Step 2: Wall renders newest first by `date` desc (ISO YYYY-MM-DD)
 *   Step 3: Optional `photoUrl` if guest provides headshot; component falls back to initials
 *
 * UNMAPPED sentinel policy (PRACTICES.md Rule 5):
 * - rating: null for all seeded entries -- individual star ratings are NOT
 *   owner-confirmed. (Live site shows aggregate 5/127; REALITY_CHECK.md line 122
 *   flags this as stale/misleading.) Do NOT invent per-review ratings.
 * - avatarUrl: null for all -- no headshot photos are available.
 * - date: ISO dates where known from live site; null where not confirmed (UNMAPPED).
 *
 * Seed: 6 entries migrated verbatim from app/[locale]/tours/page.tsx
 * (was hardcoded inline). These are real Facebook reviews already in production.
 * No text was invented or modified.
 */

export type TestimonialStatus = 'pending' | 'live'

export interface Testimonial {
  id: string
  name: string
  /** ISO date (YYYY-MM-DD) used for sort; null = UNMAPPED (date not confirmed). */
  date: string | null
  /** Per-review star rating. null = UNMAPPED (not owner-confirmed). */
  rating: 1 | 2 | 3 | 4 | 5 | null
  body: string
  source?: 'facebook' | 'google' | 'tripadvisor'
  /** Language the review was written in (BCP47). */
  locale?: string
  photoUrl?: string | null
  status: TestimonialStatus
}

export const testimonials: Testimonial[] = [
  // Seed: migrated verbatim from app/[locale]/tours/page.tsx
  // Dates from tours/page.tsx where given; others from prior data file.
  // No ratings were added -- individual ratings are UNMAPPED per PRACTICES.md Rule 5.
  {
    id: 'sue-rose-2025-10',
    name: 'Sue Rose',
    date: '2025-10-12',
    rating: null,
    body: "I visited at the end of August and had a fantastic time! Ibiza has so much to offer in addition to the music and I would highly recommend a visit to see the beautiful Alpacas. You can feed them and learn so much about these amazing animals. I was warmly welcomed and had such a valuable experience. Go and see them - you'll love it and them!",
    source: 'facebook',
    locale: 'en',
    photoUrl: null,
    status: 'live',
  },
  {
    id: 'verena-r-kaiser-2025-08',
    name: 'Verena R Kaiser',
    date: '2025-08-16',
    rating: null,
    body: 'Wir waren zu Besuch bei den süßen, flauschigen Alpakas. Ein super nettes Pärchen führt dich durch die Gehege der Alpakas mit tollen Informationen über diese Tiere. Du hast die Möglichkeit die Tiere zu füttern, streicheln und auch ein AlpakaBussi zu geben. Die Tiere sind sehr zutraulich und freuen sich riesig über deine Nähe und Futter. Es war eine tolle Erfahrung und ich kann sie nur jedem empfehlen, der auf Ibiza ist.',
    source: 'facebook',
    locale: 'de',
    photoUrl: null,
    status: 'live',
  },
  {
    id: 'gemma-muldoon-2025-05',
    name: 'Gemma Muldoon',
    date: '2025-05-13',
    rating: null,
    body: 'I made a group booking for 6 of us for Friday 9th May. Bart got in touch to let me know that they were actually closed that day because they were shearing the Alpacas. He then kindly offered to accommodate us the day before even though the farm was closed, it was really kind of him to do so. The experience itself was amazing. Bart was so knowledgeable and friendly and the Alpacas were so sweet. All the Alpacas are very well cared for and adore Bart which shows how much he loves them.',
    source: 'facebook',
    locale: 'en',
    photoUrl: null,
    status: 'live',
  },
  {
    id: 'renate-hoofddorp-2025-02',
    name: 'Renate Hoofddorp',
    date: '2025-02-19',
    rating: null,
    body: "Heel leuk om te doen met onze 2 jongens van 12 jaar oud maar eigenlijk leuk voor alle leeftijden. Wij wisten eigenlijk niets van Alpaca's, was heel interessant! precies een uur bezig geweest.",
    source: 'facebook',
    locale: 'nl',
    photoUrl: null,
    status: 'live',
  },
  {
    id: 'sven-van-hees-2024-05',
    name: 'Sven Van Hees',
    date: '2024-05-09',
    rating: null,
    body: 'Highly recommended! Bart & San run a fantastic operation. The ultimate Chill Out experience.',
    source: 'facebook',
    locale: 'en',
    photoUrl: null,
    status: 'live',
  },
  {
    id: 'paul-walker-2024-04',
    name: 'Paul Walker',
    date: '2024-04-08',
    rating: null,
    body: "Went September 23, amazing tour, Bart is so knowledgeable and friendly. If you have a car it's a must.",
    source: 'facebook',
    locale: 'en',
    photoUrl: null,
    status: 'live',
  },
]

/** Returns entries with status 'live', sorted newest first by date. */
export function liveTestimonials(): Testimonial[] {
  return testimonials
    .filter((t) => t.status === 'live')
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return b.date.localeCompare(a.date)
    })
}

export function hasLiveTestimonials(): boolean {
  return testimonials.some((t) => t.status === 'live')
}

// Legacy export -- kept for any existing consumers of the old TESTIMONIALS array.
// New code should use liveTestimonials() instead.
export const TESTIMONIALS = testimonials.map((t) => ({
  author: t.name,
  date: t.date,
  rating: t.rating,
  body: t.body,
  source: t.source,
  avatarUrl: t.photoUrl ?? null,
}))