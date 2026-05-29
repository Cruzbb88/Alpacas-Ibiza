/**
 * DB read helpers for the admin analytics pages.
 *
 * Activation contract — mirrors lib/db/upsert-from-webhook.ts:
 *   - DATABASE_URL set    → returns rows from the local Postgres mirror.
 *   - DATABASE_URL unset  → returns null. Caller falls back to per-request
 *                           Mollie API iteration (the current source of truth
 *                           until Cruz provisions Neon/Supabase).
 *
 * Why null instead of `[]`?
 *   The empty-array case is ambiguous: "DB is live but really has no rows" vs
 *   "DB is dormant, fall back to Mollie iteration". Callers need to distinguish
 *   to render the "Source: DB" vs "Source: Mollie live" indicator. Returning
 *   null is the explicit skip signal; `[]` legitimately means an empty live DB.
 *
 * Fail-quiet on DB errors. A transient connection blip during an admin page
 * load should NOT 500 the page — return null and the page falls back to the
 * Mollie iteration path, same as if the DB had never been wired.
 */
import { eq, isNull, and, desc } from 'drizzle-orm'
import { getDb } from './client.ts'
import { customers, subscriptions } from './schema.ts'
import { makeRequestLogger } from '../request-id.ts'

const log = makeRequestLogger('db/read-subscriptions', 'module')

/**
 * Row shape returned to admin pages. Matches the fields the existing
 * subscriptions dashboard reads from the Mollie iteration — same column names
 * so the rendering code stays uniform across both sources.
 *
 * `amountEur` is decoded back to major units (75.00) because the dashboard's
 * `monthlyContribution` helper parses a Number, not minor units.
 */
export interface DbSubscriptionRow {
  id: string
  vendor: 'stripe' | 'mollie'
  vendorSubscriptionId: string
  customerId: string | null
  customerEmail: string | null
  customerName: string | null
  status: string
  tier: 'monthly' | 'yearly'
  amountEur: number
  amountCurrency: 'EUR'
  /** Mollie-style free-text interval — synthesised so dashboard helpers work uniformly. */
  interval: string
  alpacaSlug: string | null
  createdAt: string | null
  canceledAt: string | null
}

/**
 * List active subscriptions joined with their customer rows.
 *
 * Filters:
 *   - subscriptions.status === 'active' (matches the dashboard's `isActive` for
 *     the strict revenue-bearing case; the dashboard separately re-bucket
 *     'pending' rows when iterating Mollie — for the DB path we surface only
 *     active and leave the more nuanced bucketing to a future spec).
 *   - customers.deleted_at IS NULL (GDPR Article 17 erasure — never surface a
 *     deleted customer's row in admin analytics).
 *
 * Returns rows newest-first by subscriptions.created_at so the dashboard's
 * detail table reads top-to-bottom most-recent.
 */
export async function listActiveSubscriptionsFromDb(): Promise<
  DbSubscriptionRow[] | null
> {
  const db = getDb()
  if (!db) return null

  try {
    const rows = await db
      .select({
        id: subscriptions.id,
        vendor: subscriptions.vendor,
        vendorSubscriptionId: subscriptions.vendorSubscriptionId,
        customerLocalId: subscriptions.customerId,
        customerEmail: customers.email,
        customerName: customers.name,
        status: subscriptions.status,
        tier: subscriptions.tier,
        amountEurMinor: subscriptions.amountEurMinor,
        alpacaSlug: subscriptions.alpacaSlug,
        createdAt: subscriptions.createdAt,
        canceledAt: subscriptions.canceledAt,
        customerDeletedAt: customers.deletedAt,
      })
      .from(subscriptions)
      .innerJoin(customers, eq(customers.id, subscriptions.customerId))
      .where(
        and(
          eq(subscriptions.status, 'active'),
          isNull(customers.deletedAt),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))

    return rows.map((r) => ({
      id: r.id,
      vendor: r.vendor as 'stripe' | 'mollie',
      vendorSubscriptionId: r.vendorSubscriptionId,
      customerId: r.customerLocalId,
      customerEmail: r.customerEmail,
      customerName: r.customerName,
      status: r.status,
      tier: r.tier as 'monthly' | 'yearly',
      amountEur: (r.amountEurMinor ?? 0) / 100,
      amountCurrency: 'EUR' as const,
      // Synthesise a free-text interval so the dashboard's monthlyContribution
      // helper works without a branch. 'month' / 'year' are the canonical
      // Mollie interval substrings the helper already searches for.
      interval: r.tier === 'yearly' ? '12 months' : '1 month',
      alpacaSlug: r.alpacaSlug,
      createdAt: r.createdAt ? r.createdAt.toISOString() : null,
      canceledAt: r.canceledAt ? r.canceledAt.toISOString() : null,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error('listActiveSubscriptionsFromDb failed; falling back to Mollie iteration', { message })
    return null
  }
}
