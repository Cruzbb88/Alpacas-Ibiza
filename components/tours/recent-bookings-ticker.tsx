'use client'

/**
 * RecentBookingsTicker — rotating social-proof banner on /tours.
 *
 * Data sources (in priority order):
 *   1. Live FareHarbor bookings (TODO: wire when FAREHARBOR_APP_KEY is set —
 *      currently not fetched; that API call lives server-side; for now falls
 *      through to static pool).
 *   2. Static pool in lib/data/social-proof.ts (owner-populated, starts empty).
 *
 * Renders null when the pool is empty — page looks clean before the owner
 * adds entries. Never invents names or cities (PRACTICES.md Rule 5).
 *
 * Display format:
 *   "Anna from Amsterdam booked the Meet the Herd tour"
 *   "Lucas from Madrid booked yesterday"
 *   "Sophie from Berlin booked the Weaving Workshop"
 *
 * Rotation: advances every ROTATE_MS milliseconds, cross-fades with CSS
 * opacity transition. Pauses on hover / focus (a11y).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { recentBookings } from '@/lib/data/social-proof'
import type { TourSlug } from '@/lib/data/social-proof'

// ── Constants ────────────────────────────────────────────────────────────────

const ROTATE_MS = 4_000

// Human-readable tour names keyed by slug.
const TOUR_LABELS: Record<TourSlug, string> = {
  'meet-herd': 'the Meet the Herd tour',
  'weaving-workshop': 'the Weaving Workshop',
  'farm-experience': 'the Farm Experience',
  'photo-session': 'the Photo Session',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildMessage(entry: (typeof recentBookings)[number]): string {
  const tourLabel = TOUR_LABELS[entry.tour] ?? 'a tour'
  if (entry.daysAgo === 1) {
    return `${entry.firstName} from ${entry.city} booked yesterday`
  }
  if (entry.daysAgo <= 0) {
    return `${entry.firstName} from ${entry.city} just booked ${tourLabel}`
  }
  return `${entry.firstName} from ${entry.city} booked ${tourLabel}`
}

// ── Component ────────────────────────────────────────────────────────────────

export function RecentBookingsTicker() {
  // Render nothing when the pool is empty.
  if (recentBookings.length === 0) return null

  return <TickerInner entries={recentBookings} />
}

interface TickerInnerProps {
  entries: typeof recentBookings
}

function TickerInner({ entries }: TickerInnerProps) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const pausedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    if (pausedRef.current) return
    // Fade out
    setVisible(false)
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % entries.length)
      setVisible(true)
    }, 300) // matches CSS transition duration
  }, [entries.length])

  useEffect(() => {
    if (entries.length <= 1) return
    const interval = setInterval(advance, ROTATE_MS)
    return () => {
      clearInterval(interval)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [advance, entries.length])

  const pause = () => { pausedRef.current = true }
  const resume = () => { pausedRef.current = false }

  const entry = entries[index]
  const message = buildMessage(entry)

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="w-full flex items-center justify-center gap-2 rounded-full bg-primary/8 border border-primary/15 px-4 py-2 text-sm text-foreground/80"
    >
      {/* Alpaca icon — decorative */}
      <span aria-hidden="true" className="text-base leading-none select-none">🦙</span>

      <span
        className="transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
        aria-label={message}
      >
        {message}
      </span>

      {/* Dot indicator — shows position in pool when more than 1 entry */}
      {entries.length > 1 && (
        <span className="ml-auto flex gap-1" aria-hidden="true">
          {entries.map((_, i) => (
            <span
              key={i}
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                i === index ? 'bg-primary' : 'bg-primary/25'
              }`}
            />
          ))}
        </span>
      )}
    </div>
  )
}
