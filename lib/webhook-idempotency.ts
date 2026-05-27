/**
 * In-memory idempotency tracker for webhook events. When the same event_id
 * is seen twice within the TTL, the second invocation is rejected and the
 * caller returns 200 without re-processing.
 *
 * Same in-memory limitation as lib/booking-schedule-store.ts (ADR 001):
 *   - Process-scoped: cold start = re-process risk
 *   - Acceptable for Stripe: their retry window is 3 days but most retries
 *     happen within seconds. Cold-start in a 3-day window is rare.
 *   - Acceptable for Mollie: retries are exponential up to 18h.
 *
 * Upgrade triggers: same as booking-schedule-store — when volume justifies
 * Vercel KV.
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days — longer than Stripe's 3-day retry window

const globalForStore = globalThis as unknown as {
  __webhookIdempotencyStore?: Map<string, number>
}
const _store: Map<string, number> =
  globalForStore.__webhookIdempotencyStore ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForStore.__webhookIdempotencyStore = _store
}

function purge(now: number): void {
  for (const [k, ts] of _store) {
    if (now - ts > TTL_MS) _store.delete(k)
  }
}

/**
 * Returns true if `eventId` has been seen before within TTL.
 * Otherwise marks it as seen and returns false (caller proceeds).
 */
export function isAlreadyProcessed(eventId: string): boolean {
  const now = Date.now()
  purge(now)
  if (_store.has(eventId)) return true
  _store.set(eventId, now)
  return false
}

/** @internal — for tests */
export function __resetWebhookIdempotency(): void {
  _store.clear()
}
