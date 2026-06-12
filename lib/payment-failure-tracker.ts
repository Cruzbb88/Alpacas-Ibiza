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

import { createTtlStore } from './in-process-ttl-store.ts'

const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days — aligns with realistic SEPA dunning cycles

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

// Attempt-dedup TTL: shorter than the counter TTL. Just needs to outlast the
// webhook retry window (Stripe ~3d, Mollie ~18h). 4 days is safe.
const _attempts = createTtlStore({
  ttlMs: 4 * 24 * 60 * 60 * 1000,
  globalKey: '__paymentFailureAttempts',
})

function purge(now: number): void {
  for (const [k, entry] of _store) {
    if (now - entry.lastFailureAt > TTL_MS) _store.delete(k)
  }
  _attempts.purge(now)
}

/**
 * Severity levels for payment failure escalation.
 *
 * 'none' is a special sentinel returned by recordFailure when a dedup-hit
 * occurs on a counter that was already reset to 0 (donor recovered). Callers
 * should treat 'none' as a no-op — no email, no escalation. Added 2026-06-05
 * to prevent late Mollie re-deliveries from falsely re-sending "payment failed"
 * emails to donors who already recovered (peer review item 4).
 */
export type FailureSeverity = 'none' | 'first' | 'at-risk' | 'action-required'

function severityFor(count: number): FailureSeverity {
  return count === 1 ? 'first' : count === 2 ? 'at-risk' : 'action-required'
}

/**
 * Increment the failure count for a customer ONCE per attemptId and return the
 * resulting severity. Repeated calls with the same attemptId are no-ops that
 * return the existing count — critical because webhook retries (Stripe ~3d
 * window, Mollie ~18h) would otherwise re-increment a single failure into
 * an inflated severity.
 *
 * @param vendor      'stripe' | 'mollie'
 * @param customerId  the customer-id this failure is attributed to
 * @param attemptId   stable identifier for this failure event (the dedupKey
 *                    `<vendor>:<paymentId>:failed` from the webhook route is
 *                    a perfect fit). Same attemptId across retries → no double
 *                    increment.
 */
export function recordFailure(
  vendor: 'stripe' | 'mollie',
  customerId: string,
  attemptId?: string,
): {
  count: number
  severity: FailureSeverity
  isFirstRecord: boolean
} {
  const now = Date.now()
  purge(now)
  const key = `${vendor}:${customerId}`
  const prev = _store.get(key)

  // If this attempt has already been counted, return the existing state
  // (severity ladder unchanged). This is the load-bearing fix for webhook
  // retries inflating severity. Without it, a single Resend outage during a
  // payment.failed delivery turns into an "at-risk" → "action-required"
  // ladder on the very next Mollie retry.
  //
  // Edge case (peer review 2026-05-29 item 4; fixed 2026-06-05): if the donor
  // recovered (resetFailures set count=0) but the attempt-dedup key is still
  // alive within its 4-day TTL, a late Mollie re-delivery would hit this
  // branch and return severity='first' using Math.max(1, 0)=1 — falsely
  // triggering a "payment failed" email after the donor already recovered.
  // Return severity='none' when count=0 so callers can distinguish the
  // already-recovered case from a genuine first-time failure.
  if (attemptId && _attempts.has(`${key}:${attemptId}`)) {
    const count = prev?.count ?? 0
    if (count === 0) {
      // Counter was reset (donor recovered). Return 'none' so callers skip
      // emitting payment-failed emails and notifications.
      return { count: 0, severity: 'none' as FailureSeverity, isFirstRecord: false }
    }
    return { count, severity: severityFor(count), isFirstRecord: false }
  }

  const count = (prev?.count ?? 0) + 1
  _store.set(key, {
    count,
    lastFailureAt: now,
    lastSuccessAt: prev?.lastSuccessAt ?? null,
  })
  if (attemptId) _attempts.set(`${key}:${attemptId}`, now)
  const severity = severityFor(count)
  const prevSeverity = (prev?.count ?? 0) === 0 ? null : severityFor(prev!.count)
  if (prevSeverity !== severity) {
    console.warn('[payment-failure-tracker] severity transition', {
      vendor, customerId, count, severity, prevSeverity,
    })
  }
  return { count, severity, isFirstRecord: true }
}

/**
 * The prior failure state passed to the onReset callback.
 * Lets callers send a "we saved your adoption" email only when a real
 * recovery occurred (prevCount > 0), not on clean renewals.
 */
export interface PriorFailureState {
  vendor: 'stripe' | 'mollie'
  customerId: string
  prevCount: number
  lastFailureAt: number
}

/**
 * Reset the failure counter on a successful payment. Call from the success
 * handler so a donor who recovers after a fail doesn't carry stale state.
 *
 * @param onReset  Optional callback fired ONLY when there was a prior failure
 *                 (prevCount > 0). Use this to send a dunning-recovery
 *                 confirmation email. The callback is fire-and-forget — its
 *                 promise is awaited but errors are swallowed so the caller's
 *                 webhook 200 contract is never broken.
 */
export async function resetFailures(
  vendor: 'stripe' | 'mollie',
  customerId: string,
  opts?: { onReset?: (state: PriorFailureState) => Promise<void> | void },
): Promise<void> {
  const key = `${vendor}:${customerId}`
  const prev = _store.get(key)
  _store.set(key, {
    count: 0,
    lastFailureAt: prev?.lastFailureAt ?? 0,
    lastSuccessAt: Date.now(),
  })
  const prevCount = prev?.count ?? 0
  if (prevCount > 0) {
    console.info('[payment-failure-tracker] reset', {
      vendor, customerId, prevCount,
    })
    if (opts?.onReset) {
      try {
        await opts.onReset({
          vendor,
          customerId,
          prevCount,
          lastFailureAt: prev!.lastFailureAt,
        })
      } catch (err) {
        console.warn('[payment-failure-tracker] onReset callback threw', {
          vendor, customerId, error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
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
  _attempts.clear()
}

/**
 * @internal — admin dunning dashboard only. DO NOT call from webhook handlers
 * or application logic. Returns a read-only snapshot of the in-memory store
 * with severity derived from the current count. Cold-start caveat: process-
 * scoped store (ADR 001) resets on Lambda restart.
 */
export function _internalGetStoreSnapshot(): ReadonlyArray<{
  vendor: 'stripe' | 'mollie'
  customerId: string
  count: number
  lastFailureAt: number
  lastSuccessAt: number | null
  severity: FailureSeverity
}> {
  const now = Date.now()
  purge(now)
  const result: Array<{
    vendor: 'stripe' | 'mollie'
    customerId: string
    count: number
    lastFailureAt: number
    lastSuccessAt: number | null
    severity: FailureSeverity
  }> = []
  for (const [key, entry] of _store) {
    // Skip recovered entries (count === 0). They've been reset by resetFailures()
    // and should not appear in dunning views — severityFor(0) falls through to
    // 'action-required' which is incorrect for a recovered donor.
    if (entry.count === 0) continue
    const colonIdx = key.indexOf(':')
    const vendor = key.slice(0, colonIdx) as 'stripe' | 'mollie'
    const customerId = key.slice(colonIdx + 1)
    result.push({
      vendor,
      customerId,
      count: entry.count,
      lastFailureAt: entry.lastFailureAt,
      lastSuccessAt: entry.lastSuccessAt,
      severity: severityFor(entry.count),
    })
  }
  return result
}
