/**
 * SeasonalPriceList — server component, render-null-when-empty.
 *
 * Patterned on Atzaró competitor card layout (€210 pp early season → €240 pp peak).
 * Owner activates by providing windows via getTourSeasonalWindows() in lib/config.ts.
 *
 * Failsafe: renders null when windows is null/undefined/empty — never renders
 * a broken price ladder.
 */

import { formatPrice } from '@/lib/format-price'

export interface SeasonalPriceWindow {
  /** Short label shown next to the price, e.g. "Early season" / "Peak" / "Winter". Optional. */
  label?: string
  /** ISO date YYYY-MM-DD. Inclusive. */
  startDate: string
  /** ISO date YYYY-MM-DD. Inclusive. */
  endDate: string
  /** Price in EUR. Rendered with locale-aware formatting (en: "€210", nl: "€ 210"). */
  priceEur: number
}

export interface SeasonalPriceListProps {
  /** Optional headline like "Per person, per day". Omitted when null. */
  caption?: string
  windows: SeasonalPriceWindow[] | null | undefined
  /** Display variant — 'inline' for cards (single line), 'stacked' for hero sections. Default 'inline'. */
  variant?: 'inline' | 'stacked'
  className?: string
}

/** Format a date range as "Apr–May" or "Jun–Sep" using the site default locale en-GB. */
function formatDateRange(startDate: string, endDate: string): string {
  try {
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    const fmt = new Intl.DateTimeFormat('en-GB', { month: 'short' })
    const startMon = fmt.format(start)
    const endMon = fmt.format(end)
    return startMon === endMon ? startMon : `${startMon}–${endMon}`
  } catch {
    return `${startDate}–${endDate}`
  }
}

/** Format price with no decimals when whole; locale default en. */
function formatWindowPrice(priceEur: number): string {
  const isWhole = Number.isInteger(priceEur)
  return formatPrice(priceEur, 'en', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  })
}

/**
 * SeasonalPriceList — renders null when windows is null/undefined/empty.
 * Sorts windows by startDate ascending before render.
 */
export function SeasonalPriceList({
  caption,
  windows,
  variant = 'inline',
  className,
}: SeasonalPriceListProps) {
  if (!windows || windows.length === 0) return null

  const sorted = [...windows].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  )

  if (variant === 'inline') {
    return (
      <p
        aria-label="Seasonal pricing list"
        className={`text-sm text-foreground/70 ${className ?? ''}`}
      >
        {caption && (
          <span className="mr-1 font-medium text-foreground/60">{caption}</span>
        )}
        {sorted.map((w, i) => (
          <span key={`${w.startDate}-${w.endDate}`}>
            {i > 0 && (
              <span aria-hidden="true" className="mx-1 text-foreground/40">
                ·
              </span>
            )}
            <span className="font-semibold text-primary">
              {formatWindowPrice(w.priceEur)}
            </span>
            {' '}
            <span>
              ({formatDateRange(w.startDate, w.endDate)})
            </span>
          </span>
        ))}
      </p>
    )
  }

  // variant === 'stacked'
  return (
    <div
      aria-label="Seasonal pricing list"
      className={`w-full ${className ?? ''}`}
    >
      {caption && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground/50">
          {caption}
        </p>
      )}
      <dl className="divide-y divide-border">
        {sorted.map((w) => (
          <div
            key={`${w.startDate}-${w.endDate}`}
            className="flex items-center justify-between py-2 text-sm"
          >
            <dt className="flex flex-col gap-0.5">
              {w.label && (
                <span className="font-medium text-foreground">{w.label}</span>
              )}
              <span className="text-foreground/60">
                {formatDateRange(w.startDate, w.endDate)}
              </span>
            </dt>
            <dd className="font-semibold text-primary">
              {formatWindowPrice(w.priceEur)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
