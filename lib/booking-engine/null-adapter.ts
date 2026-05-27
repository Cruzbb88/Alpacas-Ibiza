/**
 * NullAdapter — zero-configuration fallback when a tenant has no booking engine.
 *
 * Used by getBookingEngine() when tenant.fareHarbor.shortname is absent.
 * Returns a mailto: contact link so the booking CTA is never silently broken.
 *
 * This is NOT a placeholder for Strategy B (own engine) or Strategy D (Stripe hybrid).
 * Those stubs live in their own files if/when a ps-003 tripwire fires.
 *
 * DEFER UNTIL TRIPWIRE:
 *   own-adapter.ts       — Strategy B: full build (~27% composite, wasteful at N=1)
 *   stripe-hybrid-adapter.ts — Strategy D: Stripe Checkout + custom calendar
 *                              (~54% composite, viable only if FH fees >8% OR FH API breaks)
 */

import type { BookingEngine, BookingEngineKind, AvailabilitySlot, Tenant } from './_types'

export class NullAdapter implements BookingEngine {
  readonly kind: BookingEngineKind = 'none'

  constructor(private readonly tenant: Tenant) {}

  /** Mailto fallback — always a working CTA even with no booking system. */
  getBookingUrl(_category: string, _options?: { fullItems?: boolean }): string {
    return `mailto:${this.tenant.contactEmail}`
  }

  /** No availability data without a booking system. */
  async getAvailability(_itemIds: string[], _dateRange: { start: string; end: string }): Promise<AvailabilitySlot[]> {
    return []
  }
}
