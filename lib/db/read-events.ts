/**
 * DB read helpers for the admin payment-events page (Stripe-Dashboard-style
 * Events → Resend for our own webhook delivery log).
 *
 * Activation contract — mirrors lib/db/read-subscriptions.ts:
 *   - DATABASE_URL set    → returns rows from payment_events table.
 *   - DATABASE_URL unset  → returns null. The admin page renders an empty
 *                           state explaining how to activate.
 *
 * Why null instead of `[]`?
 *   See the same rationale in read-subscriptions.ts. `[]` legitimately means
 *   "the DB is live but no webhook has ever fired"; null is the explicit
 *   skip signal so the page can show the activation banner instead of the
 *   "all caught up" empty state.
 *
 * Fail-quiet on DB errors. A transient connection blip during an admin page
 * load should NOT 500 the page — return null and the page falls back to the
 * "DB unavailable" banner, same shape as read-subscriptions.ts.
 */
import { desc, eq } from 'drizzle-orm'
import { getDb } from './client.ts'
import { paymentEvents } from './schema.ts'
import { makeRequestLogger } from '../request-id.ts'

const log = makeRequestLogger('db/read-events', 'module')

/**
 * Row shape returned to the events admin page. Mirrors the schema columns the
 * page actually renders — we don't ship `payload_json` here because it can be
 * tens of KB per row and we'd be needlessly inflating the admin page payload
 * (the Replay route fetches it on-demand instead).
 *
 * `processedAt` is decoded to an ISO string so the React table renderer doesn't
 * have to JSON-handle a Date object (the page is a Server Component → string
 * is cheaper across the SC boundary).
 */
export interface PaymentEventRow {
  id: string
  vendor: 'stripe' | 'mollie'
  eventType: string
  customerId: string | null
  subscriptionId: string | null
  idempotencyKey: string
  processedAt: string | null
}

/**
 * List recent payment events, newest first, capped at `limit`.
 *
 * Returns null when DATABASE_URL is unset (or the DB call throws) so the
 * caller can render the activation banner instead of the empty state.
 */
export async function listRecentPaymentEvents(
  limit: number,
): Promise<PaymentEventRow[] | null> {
  const db = getDb()
  if (!db) return null

  try {
    const rows = await db
      .select({
        id: paymentEvents.id,
        vendor: paymentEvents.vendor,
        eventType: paymentEvents.eventType,
        customerId: paymentEvents.customerId,
        subscriptionId: paymentEvents.subscriptionId,
        idempotencyKey: paymentEvents.idempotencyKey,
        processedAt: paymentEvents.processedAt,
      })
      .from(paymentEvents)
      .orderBy(desc(paymentEvents.processedAt))
      .limit(limit)

    return rows.map((r) => ({
      id: r.id,
      vendor: r.vendor as 'stripe' | 'mollie',
      eventType: r.eventType,
      customerId: r.customerId,
      subscriptionId: r.subscriptionId,
      idempotencyKey: r.idempotencyKey,
      processedAt: r.processedAt ? r.processedAt.toISOString() : null,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('listRecentPaymentEvents failed; rendering activation banner instead', { message })
    return null
  }
}

/**
 * Fetch a single payment event by primary key, including the raw payload
 * needed to re-POST it to our webhook URL. Returns null when DATABASE_URL is
 * unset, when the row doesn't exist, or when the DB call throws.
 *
 * Consumed by app/api/admin/replay-event/route.ts.
 */
export interface PaymentEventWithPayload extends PaymentEventRow {
  payloadJson: string
}

export async function getPaymentEventById(
  eventId: string,
): Promise<PaymentEventWithPayload | null> {
  const db = getDb()
  if (!db) return null

  try {
    const rows = await db
      .select({
        id: paymentEvents.id,
        vendor: paymentEvents.vendor,
        eventType: paymentEvents.eventType,
        customerId: paymentEvents.customerId,
        subscriptionId: paymentEvents.subscriptionId,
        idempotencyKey: paymentEvents.idempotencyKey,
        processedAt: paymentEvents.processedAt,
        payloadJson: paymentEvents.payloadJson,
      })
      .from(paymentEvents)
      .where(eq(paymentEvents.id, eventId))
      .limit(1)

    const r = rows[0]
    if (!r) return null
    return {
      id: r.id,
      vendor: r.vendor as 'stripe' | 'mollie',
      eventType: r.eventType,
      customerId: r.customerId,
      subscriptionId: r.subscriptionId,
      idempotencyKey: r.idempotencyKey,
      processedAt: r.processedAt ? r.processedAt.toISOString() : null,
      payloadJson: r.payloadJson,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('getPaymentEventById failed', { message, eventId })
    return null
  }
}

