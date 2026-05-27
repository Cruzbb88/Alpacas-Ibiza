/**
 * AdopterCounter — social-proof widget showing how many of the herd already
 * have a sponsor.
 *
 * No DB today, so the count is derived from the content provider's animals
 * list with an `isAdopted` flag (currently a static field; will hook into
 * the adoption DB when that lands). Falls back gracefully when all flags
 * are absent or when the herd is empty.
 *
 * Renders:
 *   - Big number (X of N)
 *   - Inline progress bar
 *   - Reassurance / scarcity microcopy that adapts to the % adopted:
 *       <50%  → "Plenty of alpacas still need a sponsor"
 *       50–90% → "More than half of the herd already have a sponsor"
 *       >=90% → "Almost every alpaca has a sponsor — pick fast"
 *       100% → "Every alpaca has a sponsor — join the waitlist"
 *
 * Always renders something — never returns null. Empty herd = quiet info copy.
 */

import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

export interface AdopterCounterProps {
  locale: Locale
  /** Total alpacas in the herd. */
  total: number
  /** How many of them have an active sponsor. Clamped to [0, total]. */
  adopted: number
  /** Optional explicit heading override (rarely needed — defaults to translated copy). */
  heading?: string
  /** Optional `className` for the outer wrapper. */
  className?: string
}

export function AdopterCounter({ locale, total, adopted, heading, className }: AdopterCounterProps) {
  const translate = t(locale)
  const safeTotal = Math.max(0, Math.floor(total))
  const safeAdopted = Math.max(0, Math.min(Math.floor(adopted), safeTotal))
  const remaining = safeTotal - safeAdopted
  const pct = safeTotal === 0 ? 0 : Math.round((safeAdopted / safeTotal) * 100)

  const headingText = heading ?? translate('adopt.counter.heading', 'The herd, by the numbers')

  let microcopy: string
  if (safeTotal === 0) {
    microcopy = translate(
      'adopt.counter.empty',
      'Roster being prepared — check back soon.',
    )
  } else if (safeAdopted === safeTotal) {
    microcopy = translate(
      'adopt.counter.full',
      'Every alpaca has a sponsor right now. Join the waitlist and we\'ll match you when a spot opens.',
    )
  } else if (pct >= 90) {
    microcopy = translate(
      'adopt.counter.almostFull',
      `Only ${remaining} alpaca${remaining === 1 ? '' : 's'} still need a sponsor — pick yours fast.`,
    )
  } else if (pct >= 50) {
    microcopy = translate(
      'adopt.counter.overHalf',
      `More than half of the herd already have a sponsor. ${remaining} still waiting.`,
    )
  } else {
    microcopy = translate(
      'adopt.counter.plenty',
      `Plenty of alpacas still need a sponsor. ${remaining} of ${safeTotal} available.`,
    )
  }

  const ariaLabel =
    safeTotal === 0
      ? translate('adopt.counter.ariaEmpty', 'Adopter count, herd being prepared')
      : translate(
          'adopt.counter.ariaPopulated',
          `${safeAdopted} of ${safeTotal} alpacas have a sponsor (${pct} percent).`,
        )

  return (
    <section
      aria-labelledby="adopter-counter-heading"
      className={`bg-card rounded-2xl border border-border p-6 sm:p-8 ${className ?? ''}`}
    >
      <h2 id="adopter-counter-heading" className="text-sm font-semibold uppercase tracking-wide text-foreground/60 mb-3">
        {headingText}
      </h2>

      <div className="flex items-baseline gap-3 mb-4" aria-label={ariaLabel}>
        <span className="text-5xl font-bold text-primary tabular-nums">{safeAdopted}</span>
        <span className="text-2xl text-foreground/60 tabular-nums">/ {safeTotal}</span>
        <span className="text-sm text-foreground/60 ml-auto">{pct}%</span>
      </div>

      {/* Progress bar — purely visual; the numeric values above are the source of truth */}
      <div
        className="w-full h-2 rounded-full bg-secondary/60 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-sm text-foreground/80 mt-4">{microcopy}</p>
    </section>
  )
}
