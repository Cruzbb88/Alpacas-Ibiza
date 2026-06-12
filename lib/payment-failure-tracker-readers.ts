/**
 * Read-only inspection helpers for the payment-failure-tracker store.
 * These functions are for the admin dunning dashboard only — they do NOT
 * mutate state and do NOT import internal Map handles directly.
 *
 * Import side-effects: calling _internalGetStoreSnapshot() triggers a TTL
 * purge of stale entries (harmless, expected).
 */

import { _internalGetStoreSnapshot } from './payment-failure-tracker'

export type DunningEntry = {
  vendor: 'stripe' | 'mollie'
  customerId: string
  count: number
  lastFailureAt: number
  lastSuccessAt: number | null
  severity: 'first' | 'at-risk' | 'action-required' // 'none' never appears in snapshot (store tracks real counts only)
}

/** Entries with severity 'at-risk' OR 'action-required' (count ≥ 2). */
export function listAtRiskDonors(): ReadonlyArray<DunningEntry> {
  return _internalGetStoreSnapshot().filter(
    (e) => e.severity !== 'first',
  ) as ReadonlyArray<DunningEntry>
}

/** Entries with severity 'action-required' only (count ≥ 3). */
export function listActionRequiredDonors(): ReadonlyArray<DunningEntry> {
  return _internalGetStoreSnapshot().filter(
    (e) => e.severity === 'action-required',
  ) as ReadonlyArray<DunningEntry>
}

/**
 * Full snapshot sorted by count descending, then lastFailureAt descending
 * (most-recently-failed within same count bucket first).
 */
export function listAllTracked(): ReadonlyArray<DunningEntry> {
  return (_internalGetStoreSnapshot() as ReadonlyArray<DunningEntry>)
    .slice()
    .sort((a, b) => b.count - a.count || b.lastFailureAt - a.lastFailureAt)
}
