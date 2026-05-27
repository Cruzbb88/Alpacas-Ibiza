/**
 * Booking engine abstraction types.
 *
 * Rationale: ps-003-2026-05-27-booking-engine.md — Stay on FareHarbor (Strategy A, 78%).
 * This interface is a future-proof seam, NOT an invitation to build alternatives.
 *
 * Tripwires that would justify moving to Strategy D (Stripe + custom calendar):
 *   1. FareHarbor net fees exceed ~8%
 *   2. ≥3 tenants join within 18 months and FareHarbor per-account model becomes a headache
 *   3. FareHarbor drops or breaks the /external/v1 availability API or webhook contract
 *
 * Until a tripwire fires, FareHarborAdapter is the only concrete implementation.
 */

import type { Tenant } from '@/lib/tenants/_types'

export type BookingEngineKind =
  | 'fareharbor'
  | 'own'                    // DEFER UNTIL TRIPWIRE — see ps-003 Strategy B (~27% composite score)
  | 'stripe-checkout-hybrid' // DEFER UNTIL TRIPWIRE — see ps-003 Strategy D (~54% composite score)
  | 'none'

export interface AvailabilitySlot {
  date: string       // ISO date (YYYY-MM-DD)
  startTime: string  // Full ISO datetime (e.g. 2026-06-01T10:00:00+02:00)
  itemId: string
  spotsLeft: number | null  // null = unknown / live data unavailable
}

export interface BookingEngine {
  readonly kind: BookingEngineKind
  /** Generate a deep-link to the booking surface for a category or tour. */
  getBookingUrl(category: string, options?: { fullItems?: boolean }): string
  /** Best-effort live availability. Returns empty array if not supported. */
  getAvailability(itemIds: string[], dateRange: { start: string; end: string }): Promise<AvailabilitySlot[]>
}

// Re-export Tenant so adapter files have a single import surface.
export type { Tenant }
