/**
 * SocialProofStrip — server component that renders live social-proof counts.
 *
 * Fetches data via /api/social-proof (ISR 30 min). Renders two variants:
 *   compact — single line: "🌿 12 visits this week · 14 adopters"
 *   full    — 3-up row with icons + counts + labels
 *
 * If source === 'unconfigured', renders a tasteful fallback with no fake numbers.
 */

import { getTranslations } from 'next-intl/server'
import type { SocialProofData } from '@/app/api/social-proof/route'
import { getDefaultTenant } from '@/lib/tenants/server'
import { getActiveAdopterCount } from '@/lib/adopters/count'
import { FareHarborAdapter } from '@/lib/booking-engine/fareharbor-adapter'
import { raceWithTimeout } from '@/lib/fetch'

export interface SocialProofStripProps {
  variant?: 'compact' | 'full'
  className?: string
}

/** Directly fetch social-proof data server-side (no HTTP round-trip). */
async function getSocialProofData(): Promise<SocialProofData> {
  const cacheUntil = new Date(Date.now() + 1800 * 1000).toISOString()

  const { count: totalAdopters } = await getActiveAdopterCount()

  const appKey = process.env.FAREHARBOR_APP_KEY ?? ''
  const userKey = process.env.FAREHARBOR_USER_KEY ?? ''

  if (!appKey || !userKey) {
    return { lastWeekBookings: 0, thisWeekBookings: 0, totalAdopters, source: 'unconfigured', cacheUntil }
  }

  const tenant = getDefaultTenant()
  const adapter = new FareHarborAdapter(tenant)

  const now = new Date()
  const isoDate = (d: Date) => d.toISOString().split('T')[0]
  const pastStart = isoDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  const pastEnd = isoDate(now)
  const futureStart = isoDate(now)
  const futureEnd = isoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))

  const itemIds = Object.values(tenant.fareHarbor.itemIds)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .slice(0, 3)

  // Each race gets its own independent timer so a slow first fetch doesn't cause
  // the second race to resolve instantly via a shared timeout (lib/fetch.ts).
  const [pastResult, futureResult] = await Promise.all([
    raceWithTimeout(adapter.getAvailability(itemIds, { start: pastStart, end: pastEnd }), 3000),
    raceWithTimeout(adapter.getAvailability(itemIds, { start: futureStart, end: futureEnd }), 3000),
  ])

  if (pastResult === null && futureResult === null) {
    return { lastWeekBookings: 0, thisWeekBookings: 0, totalAdopters, source: 'fallback', cacheUntil }
  }

  const countDates = (slots: import('@/lib/booking-engine/_types').AvailabilitySlot[] | null): number => {
    if (!slots || slots.length === 0) return 0
    return new Set(slots.map(s => s.date)).size
  }

  return {
    lastWeekBookings: countDates(pastResult as import('@/lib/booking-engine/_types').AvailabilitySlot[] | null),
    thisWeekBookings: countDates(futureResult as import('@/lib/booking-engine/_types').AvailabilitySlot[] | null),
    totalAdopters,
    source: 'fareharbor',
    cacheUntil,
  }
}

export async function SocialProofStrip({ variant = 'full', className = '' }: SocialProofStripProps) {
  const translate = await getTranslations()
  const data = await getSocialProofData()

  // Graceful fallback — no fake numbers when FareHarbor is unconfigured or timed out.
  if (data.source === 'unconfigured' || data.source === 'fallback') {
    return (
      <div
        className={`w-full text-center py-3 px-4 bg-card border border-border rounded-lg text-sm text-muted-foreground ${className}`}
        aria-label="Social proof"
      >
        {translate('socialProof.fallback')}
      </div>
    )
  }

  if (variant === 'compact') {
    const visitsText = translate('socialProof.visitsThisWeek', { count: data.lastWeekBookings })
    const adoptersText = translate('socialProof.adoptersCount', { count: data.totalAdopters })
    return (
      <div
        className={`w-full text-center py-2 px-4 bg-card border border-border rounded-lg text-sm text-muted-foreground ${className}`}
        aria-label="Social proof"
      >
        🌿 {visitsText} · {adoptersText}
      </div>
    )
  }

  // full variant — 3-up row
  return (
    <div
      className={`w-full bg-card border border-border rounded-xl px-4 py-5 ${className}`}
      aria-label="Social proof"
    >
      <div className="flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
        {/* Visits this week */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl" aria-hidden="true">🌿</span>
          <span className="text-2xl font-bold text-foreground">{data.lastWeekBookings}</span>
          <span className="text-xs text-muted-foreground max-w-[120px]">
            {translate('socialProof.visitsThisWeek', { count: data.lastWeekBookings })}
          </span>
        </div>

        <div className="hidden sm:block w-px h-10 bg-border" aria-hidden="true" />

        {/* Upcoming tours */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl" aria-hidden="true">📅</span>
          <span className="text-2xl font-bold text-foreground">{data.thisWeekBookings}</span>
          <span className="text-xs text-muted-foreground max-w-[120px]">
            {translate('socialProof.toursUpcoming', { count: data.thisWeekBookings })}
          </span>
        </div>

        <div className="hidden sm:block w-px h-10 bg-border" aria-hidden="true" />

        {/* Active adopters */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl" aria-hidden="true">🦙</span>
          <span className="text-2xl font-bold text-foreground">{data.totalAdopters}</span>
          <span className="text-xs text-muted-foreground max-w-[120px]">
            {translate('socialProof.adoptersCount', { count: data.totalAdopters })}
          </span>
        </div>
      </div>
    </div>
  )
}
