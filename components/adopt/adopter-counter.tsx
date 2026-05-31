/**
 * AdopterCounter — social-proof widget showing how many of the herd already
 * have a sponsor.
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
import { getTranslations } from 'next-intl/server'

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

export async function AdopterCounter({ total, adopted, heading, className }: AdopterCounterProps) {
  const translate = await getTranslations()
  const safeTotal = Math.max(0, Math.floor(total))
  const safeAdopted = Math.max(0, Math.min(Math.floor(adopted), safeTotal))
  const remaining = safeTotal - safeAdopted
  const pct = safeTotal === 0 ? 0 : Math.round((safeAdopted / safeTotal) * 100)

  const headingText = heading ?? translate('adopt.counter.heading')

  let microcopy: string
  if (safeTotal === 0) {
    microcopy = translate('adopt.counter.empty')
  } else if (safeAdopted === safeTotal) {
    microcopy = translate('adopt.counter.full')
  } else if (pct >= 90) {
    // ICU plural: "Only # alpaca(s) still need a sponsor"
    microcopy = translate('adopt.counter.almostFull',{ remaining })
  } else if (pct >= 50) {
    // ICU plural: "More than half ... # still waiting"
    microcopy = translate('adopt.counter.overHalf',{ remaining })
  } else {
    // ICU plural: "# of {total} available"
    microcopy = translate('adopt.counter.plenty',{ remaining, total: safeTotal })
  }

  const ariaLabel =
    safeTotal === 0
      ? translate('adopt.counter.ariaEmpty')
      : translate('adopt.counter.ariaPopulated',{ adopted: safeAdopted, total: safeTotal, pct })

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
