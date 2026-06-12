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

import { createTtlStore } from './in-process-ttl-store.ts'

// 4 days — comfortably longer than Stripe's 3-day retry window (1d buffer for
// queue/clock drift) and well above Mollie's 18h. Halves in-memory footprint
// vs the previous 7-day default. Resonance-finder 2026-05-29 finding.
const _store = createTtlStore({
  ttlMs: 4 * 24 * 60 * 60 * 1000,
  globalKey: '__webhookIdempotencyStore',
})

/**
 * Returns true if `eventId` has been seen before within TTL.
 *
 * Does NOT mark — the caller must call `markProcessed(eventId)` AFTER its
 * handler succeeds. Previous API marked-on-check, which meant a transient
 * handler failure left the eventId in the store; the subsequent Mollie/Stripe
 * retry would then be skipped as "idempotent", defeating the retry mechanism.
 */
export function isAlreadyProcessed(eventId: string): boolean {
  return _store.has(eventId)
}

/**
 * Mark an eventId as processed. Call AFTER the handler succeeded (returned 200
 * to the webhook source). Failed handlers must NOT mark — they need the
 * retry to be allowed through.
 */
export function markProcessed(eventId: string): void {
  _store.set(eventId)
}

/** Returns the current number of tracked event IDs (post-purge). For monitoring only. */
export function getSize(): number {
  return _store.size()
}

/** @internal — for tests */
export function __resetWebhookIdempotency(): void {
  _store.clear()
}
