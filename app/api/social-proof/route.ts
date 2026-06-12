/**
 * GET /api/social-proof
 *
 * Returns aggregated social-proof counts for the "X visits this week /
 * Y tours booked" widget on tour + adopt + homepage surfaces.
 *
 * ISR-friendly: export revalidate = 1800 (30 min).
 * CDN cache: s-maxage=1800, stale-while-revalidate=86400.
 *
 * Failsafe: if FareHarbor keys are unset → source='unconfigured', booking
 * counts = 0, adopter count still comes from payment vendor.
 * No fake numbers are ever returned.
 */

import { NextResponse } from 'next/server'
import { getActiveAdopterCount } from '@/lib/adopters/count'
import { getDefaultTenant } from '@/lib/tenants/server'
import { FareHarborAdapter } from '@/lib/booking-engine/fareharbor-adapter'
import { raceWithTimeout } from '@/lib/fetch'

export const revalidate = 1800

export interface SocialProofData {
  /** Tours with availability in the past 7 days (completed / recently active). */
  lastWeekBookings: number
  /** Tours with open slots in the next 7 days. */
  thisWeekBookings: number
  /** Current active adopter count from payment vendor. */
  totalAdopters: number
  source: 'fareharbor' | 'unconfigured' | 'fallback'
  /** ISO timestamp — tells CDN/client until when data is fresh. */
  cacheUntil: string
}

/** ISO date string helper (YYYY-MM-DD). */
function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export async function GET(): Promise<NextResponse> {
  const cacheUntil = new Date(Date.now() + 1800 * 1000).toISOString()

  // --- adopter count (vendor-agnostic) ---
  const { count: totalAdopters } = await getActiveAdopterCount()

  // --- FareHarbor key guard ---
  const appKey = process.env.FAREHARBOR_APP_KEY ?? ''
  const userKey = process.env.FAREHARBOR_USER_KEY ?? ''

  if (!appKey || !userKey) {
    const body: SocialProofData = {
      lastWeekBookings: 0,
      thisWeekBookings: 0,
      totalAdopters,
      source: 'unconfigured',
      cacheUntil,
    }
    return NextResponse.json(body, {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    })
  }

  // --- FareHarbor availability fetch (3-second timeout via adapter) ---
  const tenant = getDefaultTenant()
  const adapter = new FareHarborAdapter(tenant)

  const now = new Date()
  const pastStart = isoDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  const pastEnd = isoDate(now)
  const futureStart = isoDate(now)
  const futureEnd = isoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))

  // Pull item IDs from tenant config — the first 3 available ones.
  const itemIds = Object.values(tenant.fareHarbor.itemIds)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .slice(0, 3)

  // Parallel fetches: past week (proxy for completed tours) + next week (upcoming).
  // Each call internally uses fetchWithTimeout (5s). We wrap in a 3-second race
  // via the shared raceWithTimeout helper (lib/fetch.ts). Each race gets its own
  // independent timer so a slow first fetch doesn't resolve the second instantly.
  const [pastResult, futureResult] = await Promise.all([
    raceWithTimeout(adapter.getAvailability(itemIds, { start: pastStart, end: pastEnd }), 3000),
    raceWithTimeout(adapter.getAvailability(itemIds, { start: futureStart, end: futureEnd }), 3000),
  ])

  if (pastResult === null && futureResult === null) {
    // Both timed out — return a graceful fallback so the widget still renders.
    const body: SocialProofData = {
      lastWeekBookings: 0,
      thisWeekBookings: 0,
      totalAdopters,
      source: 'fallback',
      cacheUntil,
    }
    return NextResponse.json(body, {
      status: 200,
      headers: { 'cache-control': 'no-store' },
    })
  }

  // Count distinct dates that had availability slots (1 slot = 1 tour day).
  const countDates = (slots: import('@/lib/booking-engine/_types').AvailabilitySlot[] | null): number => {
    if (!slots || slots.length === 0) return 0
    return new Set(slots.map(s => s.date)).size
  }

  const lastWeekBookings = countDates(pastResult as import('@/lib/booking-engine/_types').AvailabilitySlot[] | null)
  const thisWeekBookings = countDates(futureResult as import('@/lib/booking-engine/_types').AvailabilitySlot[] | null)

  const body: SocialProofData = {
    lastWeekBookings,
    thisWeekBookings,
    totalAdopters,
    source: 'fareharbor',
    cacheUntil,
  }

  return NextResponse.json(body, {
    status: 200,
    headers: { 'cache-control': 's-maxage=1800, stale-while-revalidate=86400' },
  })
}
