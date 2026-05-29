/**
 * Drizzle ORM schema for the customer / subscription / payment-event persistence
 * layer.
 *
 * Purpose: replace the per-request Mollie API iteration done by the admin
 * dashboards (subscriptions / dunning / VAT) with a local Postgres mirror that
 * webhook upserts keep up to date. Patreon / Memberful follow the same pattern:
 * webhooks are the source of truth, admin pages read the local DB.
 *
 * Activation contract (see ./client.ts):
 *   - DATABASE_URL set    → schema is live; webhook handler upserts into it;
 *                           admin pages read from it.
 *   - DATABASE_URL unset  → every helper that touches the DB no-ops and returns
 *                           null. The existing Mollie-iteration code paths keep
 *                           working unchanged. Migration to local-DB-first is
 *                           additive — no behaviour breaks before Cruz
 *                           provisions Neon/Supabase.
 *
 * This layer obsoletes the in-memory tradeoff documented in
 * docs/adr/001-resend-scheduled-sends.md (and copied into payment-failure-tracker.ts
 * / webhook-idempotency.ts / vat-tracker.ts). Once DATABASE_URL is set in
 * production those Map-backed stores become a hot-cache layer on top of the
 * authoritative DB — same surface, durable backing store, cold-start safe.
 *
 * Conventions:
 *   - Primary keys are `text` so we can encode `<vendor>_<vendorId>` directly
 *     (no surrogate uuid hop). Lets us upsert from a webhook payload without
 *     a SELECT round-trip.
 *   - All monetary values are integer EUR cents (minor units). Matches
 *     vat-tracker.ts and avoids decimal drift.
 *   - `deleted_at` enables Article 17 GDPR soft-delete: erasure requests null
 *     the email + name and set deleted_at; the row stays so VAT-OSS aggregates
 *     remain accurate for the 7-year accounting retention window.
 *   - Vendor enum mirrors `lib/payment-vendor.ts` ('stripe' | 'mollie'). The
 *     fareharbor / mailto / stripe-connect vendors don't persist customers
 *     (they pre-date the abstraction or never create a Mollie/Stripe customer
 *     object), so they're deliberately excluded from this enum.
 */
import {
  pgEnum,
  pgTable,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

// ── Enums ────────────────────────────────────────────────────────────────────

export const vendorEnum = pgEnum('vendor', ['stripe', 'mollie'])
export const tierEnum = pgEnum('tier', ['monthly', 'yearly'])

// ── customers ────────────────────────────────────────────────────────────────
//
// One row per (vendor, vendor_customer_id). Primary key is `${vendor}_${vendor_customer_id}`
// (e.g. "mollie_cst_xyz", "stripe_cus_abc") so webhook upserts can target by
// id without a lookup. `vendor_customer_id` is also persisted as its own column
// so we can JOIN cleanly on the raw vendor id (the prefixed PK has different
// semantics — local identity vs vendor identity).
//
// `email` is lowercased on upsert (caller's responsibility) and indexed because
// dunning + VAT dashboards look up customers by email when a Mollie webhook
// lands with no vendor customer id (rare — yearly one-off payments).
//
// `deleted_at` non-null = GDPR Article 17 erasure performed. Queries must
// filter `WHERE deleted_at IS NULL` for active datasets.

export const customers = pgTable(
  'customers',
  {
    id: text('id').primaryKey(),
    vendor: vendorEnum('vendor').notNull(),
    vendorCustomerId: text('vendor_customer_id').notNull(),
    email: text('email'),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    vendorIdUnique: uniqueIndex('customers_vendor_vendor_customer_id_unique').on(
      t.vendor,
      t.vendorCustomerId,
    ),
    emailIdx: index('customers_email_idx').on(t.email),
  }),
)

// ── subscriptions ────────────────────────────────────────────────────────────
//
// One row per (vendor, vendor_subscription_id). FK to customers via the
// prefixed local id so soft-delete cascades are consistent.
//
// `status` is the raw vendor status string (Stripe: 'active' | 'past_due' |
// 'canceled' | ...; Mollie: 'active' | 'pending' | 'canceled' | 'completed' |
// 'suspended'). Kept as free-text because the two vendors don't share an enum
// and dashboards already render the raw value.
//
// `amount_eur_minor` snapshots the recurring amount at adoption time so VAT-OSS
// and MRR queries don't have to look up the vendor's current price object.
//
// `last_failure_at` + `failure_count` are mirror columns for payment-failure-tracker.
// Once this DB layer goes live the in-memory tracker becomes a hot cache and the
// authoritative counter lives here (cold-start safe).

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    vendor: vendorEnum('vendor').notNull(),
    vendorSubscriptionId: text('vendor_subscription_id').notNull(),
    status: text('status').notNull(),
    tier: tierEnum('tier').notNull(),
    amountEurMinor: integer('amount_eur_minor').notNull(),
    alpacaSlug: text('alpaca_slug'),
    giftRecipientEmail: text('gift_recipient_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0),
  },
  (t) => ({
    vendorIdUnique: uniqueIndex(
      'subscriptions_vendor_vendor_subscription_id_unique',
    ).on(t.vendor, t.vendorSubscriptionId),
    customerIdx: index('subscriptions_customer_id_idx').on(t.customerId),
    statusIdx: index('subscriptions_status_idx').on(t.status),
  }),
)

// ── payment_events ───────────────────────────────────────────────────────────
//
// Append-only event log. One row per webhook delivery we accepted. The
// `idempotency_key` unique constraint replaces the in-memory Map in
// lib/webhook-idempotency.ts — a duplicate webhook delivery will collide on
// the unique index and the INSERT will be a no-op (the route still returns
// 200 idempotent).
//
// `payload_json` is the raw vendor event body as text. We keep it for
// reconciliation — when an admin reports a missing subscription we can replay
// the event without re-fetching from the vendor.
//
// `event_type` is the raw vendor string ('payment.paid', 'payment.failed',
// 'subscription.created', 'checkout.session.completed', ...). Free-text so we
// don't have to bump an enum every time Mollie or Stripe adds an event.

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id').references(() => customers.id),
    subscriptionId: text('subscription_id').references(() => subscriptions.id),
    vendor: vendorEnum('vendor').notNull(),
    eventType: text('event_type').notNull(),
    payloadJson: text('payload_json').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
    idempotencyKey: text('idempotency_key').notNull(),
  },
  (t) => ({
    idempotencyUnique: uniqueIndex('payment_events_idempotency_key_unique').on(
      t.idempotencyKey,
    ),
    customerIdx: index('payment_events_customer_id_idx').on(t.customerId),
    subscriptionIdx: index('payment_events_subscription_id_idx').on(t.subscriptionId),
    typeIdx: index('payment_events_event_type_idx').on(t.eventType),
  }),
)

// ── Type exports ─────────────────────────────────────────────────────────────
//
// Inferred row types — use these in handler signatures so callers don't import
// drizzle directly.

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type PaymentEvent = typeof paymentEvents.$inferSelect
export type NewPaymentEvent = typeof paymentEvents.$inferInsert
