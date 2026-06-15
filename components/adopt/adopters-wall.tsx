/**
 * AdoptersWall — horizontal scrolling chip row on /adopt.
 *
 * Server component (async). No 'use client'.
 *
 * Fetches via getLatestAdopters() (no HTTP round-trip) wrapped in a
 * Promise.race(150ms timeout) — same pattern as AdoptersCounterBadge /
 * adopt/page.tsx cycle-6 fix — so a slow Mollie/Stripe list call never
 * blocks SSR cold-start.
 *
 * Renders null when:
 *   - The latest array is empty (unconfigured / error / timeout / no donors)
 *
 * Chip format:
 *   "🦙 Ana adopted Barbarella"
 *   "🦙 Marco adopted an alpaca"  ← when no alpaca was picked
 *
 * Privacy: first name only. Never invents names.
 */

import { getLatestAdopters } from '@/lib/adopters/latest'

interface AdoptersWallProps {
  /** Optional heading shown above the chip row. Pass null to suppress. */
  heading?: string | null
  /** Optional extra CSS classes on the section wrapper. */
  className?: string
}

export async function AdoptersWall({ heading, className }: AdoptersWallProps = {}) {
  // 150ms race — mirrors adopt/page.tsx + AdoptersCounterBadge pattern.
  const latestPromise = getLatestAdopters()
  const timeoutPromise = new Promise<{ latest: [] }>((resolve) =>
    setTimeout(() => resolve({ latest: [] }), 150),
  )
  const { latest } = await Promise.race([latestPromise, timeoutPromise])

  // Render nothing when the list is empty.
  if (!latest || latest.length === 0) return null

  return (
    <section
      aria-label="Recent alpaca adopters"
      className={`w-full overflow-hidden ${className ?? ''}`}
    >
      {heading !== null && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 px-1">
          {heading ?? 'Recent adopters'}
        </p>
      )}

      {/* Horizontal scroll container — no scrollbar; chips overflow gracefully */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
        role="list"
      >
        {latest.map((adopter, i) => {
          const label = adopter.alpacaName
            ? `🦙 ${adopter.firstName} adopted ${adopter.alpacaName}`
            : `🦙 ${adopter.firstName} adopted an alpaca`

          return (
            <span
              key={i}
              role="listitem"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground/80 shadow-sm"
            >
              {label}
            </span>
          )
        })}
      </div>
    </section>
  )
}
