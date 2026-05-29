/**
 * Webhook → DB upsert helpers.
 *
 * Wired into app/api/mollie-webhook/route.ts (and, when Stripe is the active
 * vendor, app/api/stripe-webhook/route.ts). Every helper here follows the
 * three project conventions:
 *
 *   1. Fail-quiet on no DB. When DATABASE_URL is unset, `getDb()` returns null
 *      and these helpers return null without touching anything. This is the
 *      contract that lets the current Mollie-iteration admin dashboards keep
 *      working until Cruz provisions Neon/Supabase.
 *
 *   2. Fail-quiet on DB errors. A transient Postgres outage MUST NOT 500 the
 *      webhook — Mollie would retry the event for 18h and re-fire downstream
 *      side effects (welcome emails, owner notifications). We log via the
 *      provided request logger and return null; the in-memory trackers + the
 *      authoritative vendor API stay as fallback truth.
 *
 *   3. Idempotent INSERTs via ON CONFLICT DO UPDATE / ON CONFLICT DO NOTHING.
 *      Mollie webhook retries (and our own re-marking on partial failures)
 *      will hit the unique index without throwing. recordPaymentEvent uses
 *      DO NOTHING because the event log is append-only — a duplicate delivery
 *      should be a silent no-op (the route already returns idempotent:true).
 *
 * IDs are constructed as `<vendor>_<vendorId>` so callers can dedup by id
 * before this layer is even consulted. recordPaymentEvent's id format is
 * `<vendor>_evt_<timestamp>_<hash>` so the same idempotency_key from two
 * deliveries collides on the unique index even when the synthetic id differs.
 */
import { sql, eq } from 'drizzle-orm'
import { getDb } from './client.ts'
import {
  customers,
  subscriptions,
  paymentEvents,
  type NewCustomer,
  type NewSubscription,
  type NewPaymentEvent,
} from './schema.ts'
import { makeRequestLogger } from '../request-id.ts'

// ── Module-scope logger ──────────────────────────────────────────────────────
//
// We don't have a request context inside the helpers themselves (callers may
// invoke them from cron jobs, batch scripts, or webhooks). The route logger
// is the source of truth for per-request log correlation; this module logger
// is fallback for non-request callers and rare error paths.
const log = makeRequestLogger('db/upsert-from-webhook', 'module')

// ── Mollie shapes (minimal — match the SDK surface we actually read) ─────────
//
// We don't import @mollie/api-client types here because:
//   (a) the SDK is an optional dynamic import elsewhere in the codebase
//       (lib/integrations/payment-mollie.ts) — pulling it as a value import
//       would defeat that.
//   (b) we only read a handful of fields, and stringly-typing them inline
//       matches the pattern in app/api/mollie-webhook/route.ts.

export interface MollieCustomerShape {
  id: string
  email?: string | null
  name?: string | null
}

// ── Stripe shapes (minimal — match the SDK surface we actually read) ─────────
//
// Same rationale as MollieCustomerShape above: we don't import `stripe`'s
// types because the SDK is dynamically loaded in the route. The Stripe Checkout
// session / customer / subscription objects are massive — we mirror only the
// fields the upsert helpers actually use.

export interface StripeCustomerShape {
  id: string
  email?: string | null
  name?: string | null
}

export interface StripeSubscriptionShape {
  id: string
  customer: string
  status: string
  /**
   * Stripe items[].price.unit_amount is in MINOR units already (cents). When
   * caller already knows the recurring amount, pass it through; otherwise we
   * default to 0 (the row is still useful for status + customer linkage).
   */
  amountMinor?: number | null
  currency?: string | null
  /**
   * 'month' | 'year' — Stripe Price.recurring.interval. When known, used by
   * deriveTierFromStripeInterval; otherwise we fall back to metadata.tier.
   */
  interval?: 'month' | 'year' | string | null
  canceledAt?: number | string | null
  metadata?: {
    product?: string
    tier?: 'monthly' | 'yearly'
    alpacaSlug?: string
    giftRecipientEmail?: string
  } | null
}

export interface MollieSubscriptionShape {
  id: string
  customerId: string
  status: string
  amount?: { value: string; currency: string } | null
  // Mollie SDK exposes interval as a free-form string like "1 month" or "12 months".
  interval?: string | null
  canceledAt?: string | null
  metadata?: {
    product?: string
    tier?: 'monthly' | 'yearly'
    alpacaSlug?: string
    giftRecipientEmail?: string
  } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** "mollie_cst_xyz" — stable across vendors. */
function localCustomerId(vendor: 'mollie' | 'stripe', vendorCustomerId: string): string {
  return `${vendor}_${vendorCustomerId}`
}

/** "mollie_sub_xyz". */
function localSubscriptionId(vendor: 'mollie' | 'stripe', vendorSubscriptionId: string): string {
  return `${vendor}_${vendorSubscriptionId}`
}

/**
 * Mollie sends EUR amounts as decimal strings ("75.00"). Convert to integer
 * cents matching the rest of the codebase (vat-tracker.ts, config.ts). Falls
 * back to 0 on parse failure rather than throwing — a malformed amount is
 * better mirrored as 0 than blocking the upsert.
 */
function eurStringToMinor(value: string | null | undefined): number {
  if (!value) return 0
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100)
}

/**
 * Mollie's `interval` strings: "1 month" → 'monthly', "12 months" / "1 year"
 * → 'yearly'. We can't always infer from the amount alone (someone might
 * one-day price a monthly tier at €900), so the metadata.tier field is
 * preferred when present.
 */
function deriveTier(
  metadataTier: 'monthly' | 'yearly' | undefined,
  interval: string | null | undefined,
): 'monthly' | 'yearly' {
  if (metadataTier === 'monthly' || metadataTier === 'yearly') return metadataTier
  if (!interval) return 'monthly'
  const lower = interval.toLowerCase()
  if (lower.includes('year') || lower.includes('12 month')) return 'yearly'
  return 'monthly'
}

/**
 * Stripe Price.recurring.interval is 'month' | 'year'. Same metadata-tier
 * override rule as Mollie — metadata wins when present (someone can ship a
 * yearly tier at a monthly cadence for a promo and we'd want to honour the
 * label).
 */
function deriveTierFromStripeInterval(
  metadataTier: 'monthly' | 'yearly' | undefined,
  interval: string | null | undefined,
): 'monthly' | 'yearly' {
  if (metadataTier === 'monthly' || metadataTier === 'yearly') return metadataTier
  if (!interval) return 'monthly'
  const lower = interval.toLowerCase()
  if (lower.includes('year')) return 'yearly'
  return 'monthly'
}

// ── upsertCustomerFromMollie ─────────────────────────────────────────────────

/**
 * Idempotently mirror a Mollie customer into the local customers table.
 *
 * Returns the local customer id (`mollie_<id>`) on success, null when the DB
 * is unavailable (DATABASE_URL unset OR transient connection error).
 *
 * Email is lowercased on the way in so the indexed lookup in admin dashboards
 * is case-insensitive without a functional index.
 */
export async function upsertCustomerFromMollie(
  customer: MollieCustomerShape,
): Promise<string | null> {
  const db = getDb()
  if (!db) return null

  const id = localCustomerId('mollie', customer.id)
  const email = typeof customer.email === 'string' ? customer.email.toLowerCase() : null
  const name = typeof customer.name === 'string' ? customer.name : null

  const row: NewCustomer = {
    id,
    vendor: 'mollie',
    vendorCustomerId: customer.id,
    email,
    name,
  }

  try {
    await db
      .insert(customers)
      .values(row)
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          email,
          name,
          updatedAt: sql`now()`,
        },
      })
    return id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`upsertCustomerFromMollie failed for ${customer.id}`, { message })
    return null
  }
}

// ── upsertSubscriptionFromMollie ─────────────────────────────────────────────

/**
 * Idempotently mirror a Mollie subscription. Caller is responsible for having
 * upserted the customer FIRST (or for the customer already existing) — the
 * customer_id FK will reject the insert otherwise. The handler does this in
 * sequence: customer → subscription.
 *
 * `canceledAt` is parsed from Mollie's ISO timestamp; an invalid/missing date
 * is stored as null. `failureCount` is NOT touched on upsert because Mollie
 * doesn't supply it — the payment-failure-tracker mirror updates it via a
 * separate UPDATE when failures land.
 */
export async function upsertSubscriptionFromMollie(
  sub: MollieSubscriptionShape,
): Promise<string | null> {
  const db = getDb()
  if (!db) return null

  const id = localSubscriptionId('mollie', sub.id)
  const customerId = localCustomerId('mollie', sub.customerId)
  const amountEurMinor = eurStringToMinor(sub.amount?.value)
  const tier = deriveTier(sub.metadata?.tier, sub.interval ?? null)
  const canceledAt = sub.canceledAt ? safeParseDate(sub.canceledAt) : null

  const row: NewSubscription = {
    id,
    customerId,
    vendor: 'mollie',
    vendorSubscriptionId: sub.id,
    status: sub.status,
    tier,
    amountEurMinor,
    alpacaSlug: sub.metadata?.alpacaSlug ?? null,
    giftRecipientEmail: sub.metadata?.giftRecipientEmail ?? null,
    canceledAt,
  }

  try {
    await db
      .insert(subscriptions)
      .values(row)
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: {
          status: sub.status,
          amountEurMinor,
          tier,
          alpacaSlug: row.alpacaSlug,
          giftRecipientEmail: row.giftRecipientEmail,
          canceledAt,
        },
      })
    return id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`upsertSubscriptionFromMollie failed for ${sub.id}`, { message })
    return null
  }
}

// ── upsertCustomerFromStripe ─────────────────────────────────────────────────

/**
 * Idempotently mirror a Stripe customer into the local customers table.
 *
 * Mirrors `upsertCustomerFromMollie`: returns the local customer id
 * (`stripe_<id>`) on success, null when the DB is unavailable.
 *
 * Email is lowercased for case-insensitive email-indexed lookups in admin
 * dashboards. ON CONFLICT DO UPDATE so a returning customer with an updated
 * email/name (e.g. they edited it in the Stripe billing portal) gets the
 * mirror refreshed.
 */
export async function upsertCustomerFromStripe(
  customer: StripeCustomerShape,
): Promise<string | null> {
  const db = getDb()
  if (!db) return null

  const id = localCustomerId('stripe', customer.id)
  const email = typeof customer.email === 'string' ? customer.email.toLowerCase() : null
  const name = typeof customer.name === 'string' ? customer.name : null

  const row: NewCustomer = {
    id,
    vendor: 'stripe',
    vendorCustomerId: customer.id,
    email,
    name,
  }

  try {
    await db
      .insert(customers)
      .values(row)
      .onConflictDoUpdate({
        target: customers.id,
        set: {
          email,
          name,
          updatedAt: sql`now()`,
        },
      })
    return id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`upsertCustomerFromStripe failed for ${customer.id}`, { message })
    return null
  }
}

// ── upsertSubscriptionFromStripe ─────────────────────────────────────────────

/**
 * Idempotently mirror a Stripe subscription. Caller upserts the customer
 * FIRST so the FK doesn't reject (mirrors the Mollie helper's contract).
 *
 * `canceledAt` arrives from Stripe as a Unix epoch (seconds) on
 * customer.subscription.deleted events, but we accept ISO strings too in
 * case a caller pre-formatted. `failureCount` is NOT touched here — that's
 * payment-failure-tracker's mirror column.
 */
export async function upsertSubscriptionFromStripe(
  sub: StripeSubscriptionShape,
): Promise<string | null> {
  const db = getDb()
  if (!db) return null

  const id = localSubscriptionId('stripe', sub.id)
  const customerId = localCustomerId('stripe', sub.customer)
  const amountEurMinor = typeof sub.amountMinor === 'number' && Number.isFinite(sub.amountMinor)
    ? sub.amountMinor
    : 0
  const tier = deriveTierFromStripeInterval(sub.metadata?.tier, sub.interval ?? null)
  const canceledAt = stripeTimestampToDate(sub.canceledAt)

  const row: NewSubscription = {
    id,
    customerId,
    vendor: 'stripe',
    vendorSubscriptionId: sub.id,
    status: sub.status,
    tier,
    amountEurMinor,
    alpacaSlug: sub.metadata?.alpacaSlug ?? null,
    giftRecipientEmail: sub.metadata?.giftRecipientEmail ?? null,
    canceledAt,
  }

  try {
    await db
      .insert(subscriptions)
      .values(row)
      .onConflictDoUpdate({
        target: subscriptions.id,
        set: {
          status: sub.status,
          amountEurMinor,
          tier,
          alpacaSlug: row.alpacaSlug,
          giftRecipientEmail: row.giftRecipientEmail,
          canceledAt,
        },
      })
    return id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`upsertSubscriptionFromStripe failed for ${sub.id}`, { message })
    return null
  }
}

// ── softDeleteSubscription ───────────────────────────────────────────────────

/**
 * Mark a subscription as deleted on a `customer.subscription.deleted` event.
 *
 * Schema has no `deleted_at` column on `subscriptions` — only `canceled_at`
 * and `status`. We set `status='canceled'` + `canceled_at=now()` if not
 * already populated. This is the closest the current schema gets to a
 * soft-delete: the row stays for accounting retention, but admin queries
 * filtering on `status='active'` will exclude it.
 *
 * Idempotent: if the subscription doesn't exist (event landed before any
 * other webhook upserted it), the UPDATE is a no-op. The caller has already
 * recordPaymentEvent'd the raw event log; reconstruction can replay from
 * there later.
 */
export async function softDeleteSubscriptionFromStripe(
  stripeSubscriptionId: string,
): Promise<string | null> {
  const db = getDb()
  if (!db) return null

  const id = localSubscriptionId('stripe', stripeSubscriptionId)
  try {
    await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: sql`coalesce(${subscriptions.canceledAt}, now())`,
      })
      .where(eq(subscriptions.id, id))
    return id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`softDeleteSubscriptionFromStripe failed for ${stripeSubscriptionId}`, { message })
    return null
  }
}

// ── recordPaymentEvent ───────────────────────────────────────────────────────

export interface RecordPaymentEventArgs {
  vendor: 'mollie' | 'stripe'
  eventType: string
  /** Local customer id (with vendor prefix), or null if event isn't customer-scoped. */
  customerId?: string | null
  /** Local subscription id (with vendor prefix), or null. */
  subscriptionId?: string | null
  /** Raw vendor event payload; will be JSON.stringify'd if not already a string. */
  payload: unknown
  /**
   * Stable idempotency key. By convention `<vendor>:<eventId>` or
   * `<vendor>:<paymentId>:<status>` — must match the same key the webhook
   * router uses in lib/webhook-idempotency.ts so the unique index and the
   * in-memory dedup agree.
   */
  idempotencyKey: string
}

/**
 * Append a payment event to the durable log.
 *
 * Returns the local event id on success, null on DB unavailable. ON CONFLICT
 * DO NOTHING on idempotency_key — a duplicate webhook delivery resolves to a
 * null return (caller already knows to treat that as idempotent).
 *
 * Synthetic id format: `<vendor>_evt_<timestamp>_<hash>`. The hash is a short
 * stable suffix derived from the idempotency key so re-runs produce the same
 * id (the unique index on idempotency_key is the real guard; this just keeps
 * the synthetic id deterministic for log correlation).
 */
export async function recordPaymentEvent(
  args: RecordPaymentEventArgs,
): Promise<string | null> {
  const db = getDb()
  if (!db) return null

  const id = synthesizeEventId(args.vendor, args.idempotencyKey)
  const payloadJson =
    typeof args.payload === 'string' ? args.payload : JSON.stringify(args.payload)

  const row: NewPaymentEvent = {
    id,
    vendor: args.vendor,
    eventType: args.eventType,
    customerId: args.customerId ?? null,
    subscriptionId: args.subscriptionId ?? null,
    payloadJson,
    idempotencyKey: args.idempotencyKey,
  }

  try {
    const inserted = await db
      .insert(paymentEvents)
      .values(row)
      .onConflictDoNothing({ target: paymentEvents.idempotencyKey })
      .returning({ id: paymentEvents.id })

    // ON CONFLICT DO NOTHING + .returning() returns the inserted row(s); an
    // empty array means the duplicate path fired. Caller treats null the same
    // way it treats a webhook-idempotency hit.
    if (inserted.length === 0) return null
    return inserted[0]!.id
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error(`recordPaymentEvent failed eventType=${args.eventType}`, { message })
    return null
  }
}

// ── Internals ────────────────────────────────────────────────────────────────

function safeParseDate(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Stripe emits timestamps as Unix epoch SECONDS (not ms) on event payloads.
 * We accept either a number (epoch seconds), a string (ISO 8601), or null.
 * Returns null on any parse failure rather than throwing — a malformed
 * canceledAt should soft-fall-back to "unknown" rather than block the upsert.
 */
function stripeTimestampToDate(ts: number | string | null | undefined): Date | null {
  if (ts == null) return null
  if (typeof ts === 'number') {
    if (!Number.isFinite(ts)) return null
    const d = new Date(ts * 1000)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return safeParseDate(ts)
}

/**
 * Short deterministic suffix derived from the idempotency key. Avoids pulling
 * in a crypto dep for what is effectively just a log-correlation aid (the real
 * uniqueness is enforced by the idempotency_key unique index).
 *
 * Uses a simple FNV-1a 32-bit hash → base36. ~7 chars, no collisions matter.
 */
function synthesizeEventId(vendor: 'mollie' | 'stripe', idempotencyKey: string): string {
  let h = 0x811c9dc5 // FNV offset basis
  for (let i = 0; i < idempotencyKey.length; i++) {
    h ^= idempotencyKey.charCodeAt(i)
    h = Math.imul(h, 0x01000193) // FNV prime
  }
  const hash = (h >>> 0).toString(36)
  return `${vendor}_evt_${Date.now()}_${hash}`
}
