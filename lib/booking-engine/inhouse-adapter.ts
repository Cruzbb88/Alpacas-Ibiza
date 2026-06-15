/**
 * InHouseAdapter — reads availability from the in-house booking store
 * (lib/booking/store.ts → tour_slots) instead of FareHarbor.
 *
 * Activated by BOOKING_ENGINE=inhouse (see ./index.ts). This is the Strategy B
 * ("own engine") seam from ps-003 — kept behind a flag, defaults OFF.
 *
 * Fail-CLOSED (cb-006 F3): getOpenSlots() returns [] when DATABASE_URL is unset,
 * so getAvailability() yields [] rather than fabricating slots. There is no
 * fail-open path here by construction.
 *
 * getBookingUrl reuses the FareHarbor embed URL — the in-house store currently
 * powers the read/availability path only; the booking surface (checkout) is
 * still FareHarbor until the full Strategy B build lands. NullAdapter-style
 * inert CTAs are avoided by deferring to the existing embed helper.
 */

import { getFareHarborEmbedUrl } from '@/lib/config'
import { getOpenSlots } from '@/lib/booking/store'
import { seatsLeft } from '@/lib/booking/store-logic'
import type { TourSlot } from '@/lib/db/schema'
import type { BookingEngine, BookingEngineKind, AvailabilitySlot } from './_types'

export class InHouseAdapter implements BookingEngine {
  readonly kind: BookingEngineKind = 'own'

  /**
   * No tenant config needed — the in-house store keys off the tour slug itself.
   * Returns the FareHarbor embed URL so the booking CTA is never inert while the
   * checkout surface migration is still pending.
   */
  getBookingUrl(_category: string, options?: { fullItems?: boolean }): string {
    return getFareHarborEmbedUrl(options)
  }

  /**
   * Live availability from the in-house store.
   *
   * - Each itemId is treated as a tour slug → getOpenSlots(slug, range).
   * - Per-slug fetches run under Promise.allSettled so one bad slug never aborts
   *   the whole call (mirrors FareHarborAdapter's per-item fan-out).
   * - `spotsLeft` is computed via seatsLeft() (nets out active holds — cb-006 F7).
   * - dateRange arrives as ISO strings (BookingEngine contract); converted to Date
   *   at this boundary because getOpenSlots expects { start: Date; end: Date }.
   * - Inherently fail-CLOSED: getOpenSlots returns [] without DATABASE_URL.
   */
  async getAvailability(
    itemIds: string[],
    dateRange: { start: string; end: string },
  ): Promise<AvailabilitySlot[]> {
    // Validate the ISO instants before they reach SQL: an unparseable string
    // yields an Invalid Date whose getTime() is NaN, making the gte/lte range
    // comparison undefined at the driver boundary. Fail-closed to [] (the
    // module's documented posture — never fabricate slots) and reject an
    // inverted range too.
    const start = parseInstant(dateRange.start)
    const end = parseInstant(dateRange.end)
    if (!start || !end || start > end) return []
    const range = { start, end }

    const results = await Promise.allSettled(
      itemIds.map((slug) => getOpenSlots(slug, range)),
    )

    const slots: AvailabilitySlot[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const slot of r.value) {
          slots.push(toAvailabilitySlot(slot))
        }
      } else {
        console.error('In-house availability fetch failed:', r.reason)
      }
    }
    return slots
  }
}

/** Parse an ISO instant; null when unparseable so the caller can fail-closed. */
function parseInstant(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Map a persisted TourSlot to the wire AvailabilitySlot shape.
 * startsAt is a timestamptz UTC Date; the ISO string carries the offset so the
 * edge can format it in Europe/Madrid (cb-006 F4). `date` is the UTC calendar day.
 */
function toAvailabilitySlot(slot: TourSlot): AvailabilitySlot {
  const startTime = slot.startsAt.toISOString()
  return {
    date: startTime.split('T')[0],
    startTime,
    itemId: slot.tourSlug,
    spotsLeft: seatsLeft(slot),
  }
}
