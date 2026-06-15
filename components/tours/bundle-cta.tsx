/**
 * Tour bundle CTA — env-gated.
 *
 * Reads BUNDLE_* from lib/config.ts. Renders null when discount === 0 OR url unset.
 * Owner activates by setting BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR + BUNDLE_TOUR_PLUS_YOGA_URL
 * (or the adopt-plus-tour equivalents) without a deploy.
 *
 * Failsafe: renders null when config missing — no broken CTAs.
 */

import Link from 'next/link'
import {
  BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR,
  BUNDLE_TOUR_PLUS_YOGA_URL,
  BUNDLE_ADOPT_PLUS_TOUR_DISCOUNT_EUR,
  BUNDLE_ADOPT_PLUS_TOUR_URL,
} from '@/lib/config'
import { SeasonalPriceList } from '@/components/seasonal-price-list'
import type { SeasonalPriceWindow } from '@/components/seasonal-price-list'

export type BundleSlot = 'tour-yoga' | 'adopt-tour'

interface BundleCtaProps {
  slot: BundleSlot
  className?: string
  /** Optional seasonal pricing windows. When provided, rendered below the offer label. */
  seasonalWindows?: SeasonalPriceWindow[]
}

/**
 * Server component — reads env config at request time.
 */
export function BundleCta({ slot, className, seasonalWindows }: BundleCtaProps) {
  let discount: number
  let url: string | undefined
  let offerLabel: string

  if (slot === 'tour-yoga') {
    discount = BUNDLE_TOUR_PLUS_YOGA_DISCOUNT_EUR
    url = BUNDLE_TOUR_PLUS_YOGA_URL
    offerLabel = `Save €${discount} — book tour + yoga together`
  } else {
    discount = BUNDLE_ADOPT_PLUS_TOUR_DISCOUNT_EUR
    url = BUNDLE_ADOPT_PLUS_TOUR_URL
    offerLabel = `Save €${discount} — book tour + adoption together`
  }

  // Fail-open: no CTA when unset (matches SKEIN_CALLOUT_LIVE pattern)
  if (discount === 0 || !url) return null

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 ${className ?? ''}`}
    >
      <div className="flex-1 min-w-0 text-center sm:text-left">
        <p className="text-sm font-bold text-foreground">{offerLabel}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Limited-availability combo — book both in one step.
        </p>
        {/* Seasonal pricing — additive only; current offer label unchanged when absent */}
        <SeasonalPriceList windows={seasonalWindows ?? null} variant="inline" className="mt-1" />
      </div>
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 transition-colors"
      >
        Book bundle →
      </Link>
    </div>
  )
}
