/**
 * Generic campaign banner — env-gated per slot.
 *
 * For each slot, reads:
 *   CAMPAIGN_<SLOT>_HEADLINE, CAMPAIGN_<SLOT>_BODY,
 *   CAMPAIGN_<SLOT>_CTA_HREF, CAMPAIGN_<SLOT>_CTA_LABEL, CAMPAIGN_<SLOT>_LIVE
 *
 * Renders null unless CAMPAIGN_<SLOT>_LIVE=true AND headline is non-empty.
 * Matches the SKEIN_CALLOUT_LIVE pattern (see lib/config.ts + CLAUDE.md failsafe map).
 *
 * Failsafe: renders null when env vars unset — no layout shift, no fake content.
 */

import Link from 'next/link'

export interface CampaignBannerGenericProps {
  slot: 'home' | 'tours' | 'adopt-page' | 'yoga'
  className?: string
}

function slotEnvKey(slot: string): string {
  return slot.toUpperCase().replace(/-/g, '_')
}

function getCampaignConfig(slot: string) {
  const key = slotEnvKey(slot)
  return {
    live:     process.env[`CAMPAIGN_${key}_LIVE`] === 'true',
    headline: process.env[`CAMPAIGN_${key}_HEADLINE`] ?? '',
    body:     process.env[`CAMPAIGN_${key}_BODY`]     ?? '',
    ctaHref:  process.env[`CAMPAIGN_${key}_CTA_HREF`] ?? '',
    ctaLabel: process.env[`CAMPAIGN_${key}_CTA_LABEL`] ?? '',
  }
}

/**
 * Server component — reads env at request time (no client JS needed).
 * Use inside a server page or Suspense boundary.
 */
export function CampaignBannerGeneric({ slot, className }: CampaignBannerGenericProps) {
  const cfg = getCampaignConfig(slot)

  // Fail-open: renders null when not live or headline is empty (matches skein pattern)
  if (!cfg.live || !cfg.headline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 text-center sm:text-left ${className ?? ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base font-bold text-primary leading-snug">
          {cfg.headline}
        </p>
        {cfg.body ? (
          <p className="text-xs sm:text-sm text-foreground/70 mt-1">{cfg.body}</p>
        ) : null}
      </div>
      {cfg.ctaHref && cfg.ctaLabel ? (
        <Link
          href={cfg.ctaHref}
          className="shrink-0 inline-flex items-center rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          {cfg.ctaLabel}
        </Link>
      ) : null}
    </div>
  )
}
