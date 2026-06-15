/**
 * Booking engine factory.
 *
 * Current FareHarbor consumers keep working unchanged:
 *   - app/api/availability/route.ts      — live availability proxy (do NOT modify)
 *   - app/api/fareharbor-webhook/route.ts — booking lifecycle events (do NOT modify)
 *   - lib/config.ts                       — embed URL helpers (do NOT modify)
 *
 * Migration path for future PRs (only when a ps-003 tripwire fires):
 *   1. Move per-item availability fetch from app/api/availability/route.ts into
 *      FareHarborAdapter.getAvailability() — route delegates here.
 *   2. Route components through getBookingEngine(tenant).getBookingUrl() instead
 *      of calling lib/config.ts helpers directly.
 *   3. Swap the adapter returned here (FareHarborAdapter → StripeHybridAdapter)
 *      behind a feature flag — existing routes stay intact during shadow run.
 *
 * ps-003 tripwires (owner decision — CAN'T DO WITHOUT HELP):
 *   T1. FareHarbor net fees exceed ~8%
 *   T2. ≥3 tenants within 18 months AND FareHarbor per-account model becomes
 *       a billing or admin headache (owner must set the exact tenant-count threshold)
 *   T3. FareHarbor drops or breaks /external/v1 availability API or webhook contract
 *       (synthetic monitor on /api/availability catches this in <24h per ps-003 §3-Step)
 */

import type { Tenant } from '@/lib/tenants/_types'
import type { BookingEngine } from './_types'
import { FareHarborAdapter } from './fareharbor-adapter'
import { InHouseAdapter } from './inhouse-adapter'
import { NullAdapter } from './null-adapter'

export type { BookingEngine, BookingEngineKind, AvailabilitySlot } from './_types'

/**
 * Returns the appropriate BookingEngine for a tenant.
 *
 * Today: FareHarbor if the tenant has a shortname, NullAdapter otherwise.
 * Flagged: BOOKING_ENGINE=inhouse routes the read/availability path to the
 * in-house store (Strategy B seam). Defaults OFF — existing behavior unchanged.
 * Future: swap adapter here (one line) when a tripwire fires — no call-site changes.
 */
export function getBookingEngine(tenant: Tenant): BookingEngine {
  // Read the flag directly, the same way this factory already branches on env.
  if (process.env.BOOKING_ENGINE === 'inhouse') {
    return new InHouseAdapter()
  }
  if (tenant.fareHarbor.shortname) {
    return new FareHarborAdapter(tenant)
  }
  return new NullAdapter(tenant)
}
