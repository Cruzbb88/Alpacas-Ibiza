/**
 * FareHarborAdapter — the only concrete BookingEngine implementation.
 *
 * ps-003 verdict: Strategy A (Stay on FareHarbor) scored 78% composite.
 */

import {
  getFareHarborEmbedUrl,
  getFareHarborItemUrl,
} from '@/lib/config'
import { fetchWithTimeout } from '@/lib/fetch'
import type { BookingEngine, BookingEngineKind, AvailabilitySlot, Tenant } from './_types'

export class FareHarborAdapter implements BookingEngine {
  readonly kind: BookingEngineKind = 'fareharbor'

  constructor(private readonly tenant: Tenant) {}

  /**
   * Returns a FareHarbor booking URL for the given category string.
   *
   * Category is matched against tenant.fareHarbor.itemIds keys (e.g. 'tourMeetHerd',
   * 'woven', 'commission'). Unknown categories fall back to the base embed URL,
   * preserving the existing lib/config.ts fail-open behavior.
   */
  getBookingUrl(category: string, options?: { fullItems?: boolean }): string {
    const ids = this.tenant.fareHarbor.itemIds

    // Map caller-supplied category strings to the tenant's item ID map.
    // Keys mirror the TenantFareHarbor.itemIds shape in lib/tenants/_types.ts.
    const itemId: string | undefined = (ids as Record<string, string | undefined>)[category]

    return getFareHarborItemUrl(itemId, options)
  }

  /**
   * Fetches live per-item availability from FareHarbor for the given item PKs
   * and date range.
   *
   * - Up to 3 items are queried (mirrors previous route cap).
   * - Uses Promise.allSettled so one failing item never aborts the whole fetch.
   * - Returns raw AvailabilitySlot[] — no caching, no response shaping.
   *   The 1800s ISR cache lives at the route level per ADR-008.
   * - Reads FAREHARBOR_APP_KEY / FAREHARBOR_USER_KEY from env (configuration,
   *   not business logic — adapter remains cache-agnostic and shape-agnostic).
   */
  async getAvailability(
    itemIds: string[],
    dateRange: { start: string; end: string },
  ): Promise<AvailabilitySlot[]> {
    const shortname = this.tenant.fareHarbor.shortname
    const appKey = process.env.FAREHARBOR_APP_KEY ?? ''
    const userKey = process.env.FAREHARBOR_USER_KEY ?? ''

    if (!appKey || !userKey) return []

    const results = await Promise.allSettled(
      itemIds.slice(0, 3).map((itemPk) =>
        fetchWithTimeout(
          `https://fareharbor.com/api/external/v1/companies/${shortname}/items/${itemPk}/minimal/availabilities/date-range/${dateRange.start}/${dateRange.end}/`,
          {
            headers: {
              'X-FareHarbor-API-App': appKey,
              'X-FareHarbor-API-User': userKey,
            },
          },
        ).then((r) => (r.ok ? r.json() : null)),
      ),
    )

    const slots: AvailabilitySlot[] = []
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.availabilities?.length) {
        for (const avail of r.value.availabilities) {
          if (avail.capacity > 0) {
            slots.push({
              date: (avail.start_at as string).split('T')[0],
              startTime: avail.start_at as string,
              itemId: String(avail.item?.pk ?? ''),
              spotsLeft: avail.capacity as number,
            })
          }
        }
      } else if (r.status === 'rejected') {
        console.error('FareHarbor item availability fetch failed:', r.reason)
      }
    }
    return slots
  }
}

/**
 * Convenience: build a FareHarbor embed URL without a tenant object (for
 * call sites that still use config.ts directly and haven't migrated yet).
 * Wraps getFareHarborEmbedUrl so booking-engine consumers have one import.
 */
export { getFareHarborEmbedUrl }
