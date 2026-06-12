/**
 * Herd Diary events — per-animal lifecycle feed for Alpacas Ibiza.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO PUBLISH AN EVENT — single-file edit:
 *
 *   Step 1 (optional): Drop photo at:
 *             public/images/herd-events/<id>.webp
 *
 *   Step 2: Add one entry to the `herdEvents` array below with status: 'live':
 *
 *     {
 *       id: 'bardot-shorn-2026-spring',
 *       date: '2026-04-15',
 *       title: 'Bardot — spring shearing',
 *       body: 'Bardot came off the shearing table looking three sizes smaller and twice as fast.',
 *       alpacaSlugs: ['bardot'],
 *       imageSrc: '/images/herd-events/bardot-shorn-2026-spring.webp',
 *       kind: 'shearing',
 *       status: 'live',
 *     },
 *
 *   No other file needs touching. The /herd-diary index and each alpaca slug
 *   page pick up new entries automatically.
 *
 * Notes:
 *   - `id` must be URL-safe: lowercase, hyphens only, no spaces.
 *   - `alpacaSlugs` must be IDs from lib/data/alpacas.ts (e.g. 'bardot', 'chet').
 *   - `body` is plain text — 1-3 sentences. No markdown parsed.
 *   - `imageSrc` is optional. Null → no image rendered.
 *   - Set `status: 'draft'` to write without publishing.
 *   - Events are sorted newest-first by `date` in both feed views.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FAILSAFE: `liveHerdEvents()` and `liveHerdEventsByAlpaca()` return [] when
 * the array is empty. All callers render null when the returned array is empty.
 * No fake events — owner adds real ones.
 */

export type HerdEventKind =
  | 'milestone'
  | 'medical'
  | 'birth'
  | 'shearing'
  | 'visit'
  | 'photo'
  | 'general'

export type HerdEventStatus = 'live' | 'draft'

export interface HerdEvent {
  /** Stable slug, e.g. 'bardot-shorn-2026-spring' */
  id: string
  /** ISO date — YYYY-MM-DD */
  date: string
  /** Headline visible to public */
  title: string
  /** Body — 1-3 sentences */
  body: string
  /** Which alpaca(s) the event is about — slugs from lib/data/alpacas.ts */
  alpacaSlugs: string[]
  /** Optional path under public/images/herd-events/ */
  imageSrc: string | null
  /** Event category — for filtering / icon hint */
  kind: HerdEventKind
  /** Owner sets to 'live' when ready to publish */
  status: HerdEventStatus
}

/**
 * Owner-provided events. Empty until owner adds entries with status: 'live'.
 * UNMAPPED — no events invented. Every entry must be owner-supplied.
 */
export const herdEvents: HerdEvent[] = []

/** Returns all live events, sorted newest-first. */
export function liveHerdEvents(): HerdEvent[] {
  return herdEvents
    .filter((e) => e.status === 'live')
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Returns live events for a specific alpaca slug, sorted newest-first. */
export function liveHerdEventsByAlpaca(alpacaSlug: string): HerdEvent[] {
  return liveHerdEvents().filter((e) => e.alpacaSlugs.includes(alpacaSlug))
}
