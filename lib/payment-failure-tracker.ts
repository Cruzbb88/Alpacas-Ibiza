/**
 * Consecutive payment-failure tracker per customer.
 *
 * Stripe has Smart Retries built-in; Mollie does not. SEPA failures cluster
 * (insufficient funds → fail → user gets paid → next charge passes), but a
 * customer with 2+ consecutive fails is almost always actually lapsing. This
 * tracker lets the failure handler escalate:
 *
 *   1st fail → normal donor email + owner notification
 *   2nd fail → owner gets a warning email ("at-risk donor")
 *   3rd fail → owner gets an "action required" email; subscription will pause
 *
 * Counter resets to 0 on the next successful charge for the same customer.
 *
 * Same in-memory tradeoff as lib/webhook-idempotency.ts (ADR 001):
 *   - Process-scoped (cold start = counter resets to 0)
 *   - TTL purge prevents unbounded growth (60 days — longer than a typical
 *     SEPA retry window, shorter than a year)
 *   - Acceptable for current scale; upgrade to Vercel KV when volume justifies
 *
 * Key shape: `<vendor>:<customerId>` so Stripe + Mollie counters never collide
 * even if customer IDs reuse prefixes.
 */

const TTL_MS = 60 * 24 * 60 * 60 * 1000 // 60 days

interface CounterEntry {
  count: number
  lastFailureAt: number
  lastSuccessAt: number | null
}

const globalForStore = globalThis as unknown as {
  __paymentFailureStore?: Map<string, CounterEntry>
}
const _store: Map<string, CounterEntry> =
  globalForStore.__paymentFailureStore ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForStore.__paymentFailureStore = _store
}

function purge(now: number): void {
  for (const [k, entry] of _store) {
    if (now - entry.lastFailureAt > TTL_MS) _store.delete(k)
  }
}

export type FailureSeverity = 'first' | 'at-risk' | 'action-required'

/**
 * Increment the failure count for a customer and return the resulting severity.
 *
 * 1 = 'first'             (normal donor email)
 * 2 = 'at-risk'           (owner gets a warning)
 * 3+ = 'action-required'  (owner needs to follow up; subscription likely lost)
 */
export function recordFailure(vendor: 'stripe' | 'mollie', customerId: string): {
  count: number
  severity: FailureSeverity
} {
  const now = Date.now()
  purge(now)
  const key = `${vendor}:${customerId}`
  const prev = _store.get(key)
  const count = (prev?.count ?? 0) + 1
  _store.set(key, {
    count,
    lastFailureAt: now,
    lastSuccessAt: prev?.lastSuccessAt ?? null,
  })
  const severity: FailureSeverity =
    count === 1 ? 'first' : count === 2 ? 'at-risk' : 'action-required'
  return { count, severity }
}

/**
 * Reset the failure counter on a successful payment. Call from the success
 * handler so a donor who recovers after a fail doesn't carry stale state.
 */
export function resetFailures(vendor: 'stripe' | 'mollie', customerId: string): void {
  const key = `${vendor}:${customerId}`
  const prev = _store.get(key)
  _store.set(key, {
    count: 0,
    lastFailureAt: prev?.lastFailureAt ?? 0,
    lastSuccessAt: Date.now(),
  })
}

/**
 * Read the current count without mutating. Useful for read-only checks
 * (e.g. the status page showing "you have 2 failed attempts on record").
 */
export function getFailureCount(vendor: 'stripe' | 'mollie', customerId: string): number {
  return _store.get(`${vendor}:${customerId}`)?.count ?? 0
}

/** @internal — for tests */
export function __resetPaymentFailureTracker(): void {
  _store.clear()
}
