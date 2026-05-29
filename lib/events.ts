/**
 * Typed in-process event bus for domain events emitted by webhook handlers.
 *
 * Why this exists
 * ---------------
 * `lib/payment-handlers.ts` is 1373 lines and growing because every new
 * side-effect (welcome email, owner notify, VAT record, dunning escalation,
 * idempotency mark, future DB upsert, analytics ping…) was bolted into the
 * giant `handle*` functions inline. That coupling makes:
 *
 *   - Adding a new side-effect = editing the giant handler.
 *   - Testing a single side-effect = simulating a full Stripe / Mollie webhook.
 *   - Future re-use across vendors = copy-pasting the wiring per-vendor.
 *
 * Industry pattern (Stripe-internal, Shopify, Linear): the webhook handler
 * emits ONE normalized domain event; independent subscribers handle their
 * slice. We're staging that migration here — this bus is purely ADDITIVE
 * alongside the existing inline calls. A later spec will remove the inline
 * calls once each subscriber has parity.
 *
 * Design constraints
 * ------------------
 *   1. SYNC fan-out. The webhook response timing is load-bearing (Mollie / Stripe
 *      retry on slow responses). `emit()` must not change the handler's latency
 *      profile. Subscribers that need async work wrap their body in `void asyncFn()`.
 *   2. NEVER throws. One bad subscriber must not cascade into the handler
 *      returning 500 → vendor re-delivers → duplicate side-effects. We use
 *      `Promise.allSettled` semantics for sync handlers (try/catch per call) so
 *      every subscriber gets a turn regardless of upstream throws.
 *   3. HMR-safe. globalThis-pinned singleton (same shape as
 *      `lib/payment-failure-tracker.ts`) so subscribers registered at module load
 *      survive Next.js hot-reload during dev.
 *   4. Vendor-agnostic payloads. Events carry NORMALIZED fields only — no raw
 *      Stripe.Session / Mollie.Payment objects. This is the load-bearing
 *      decoupling: a subscriber written today still works if we swap payment
 *      processors tomorrow, and tests can construct event payloads by hand
 *      without importing vendor SDK types.
 */

import type { FailureSeverity } from './payment-failure-tracker.ts'

// ── Event payload union ──────────────────────────────────────────────────────

export type PaymentVendor = 'stripe' | 'mollie'
export type AdoptionTier = 'monthly' | 'yearly'

/**
 * Emitted at the end of a successful first-payment flow:
 *   - Stripe `checkout.session.completed`
 *   - Mollie `payment.paid` (monthly-first OR yearly-oneoff)
 *
 * Carries the minimum a subscriber needs to send a welcome, record VAT,
 * notify the owner, or upsert a CRM row. PII fields (customerEmail,
 * customerName) are present — subscribers may choose to mask before logging.
 */
export interface AdoptionStartedEvent {
  type: 'adoption.started'
  vendor: PaymentVendor
  /** Stripe session.id, Mollie payment.id, etc. — stable across retries. */
  paymentId: string
  /** Vendor customer id when known (Stripe `cus_*`, Mollie `cst_*`). */
  customerId: string | null
  customerEmail: string | null
  customerName: string | null
  tier: AdoptionTier
  /** Alpaca slug the donor selected; `null` = "pick for me". */
  alpacaSlug: string | null
  /** True if checkout went through the gift wizard. */
  isGift: boolean
  /**
   * Total amount in EUR major (e.g. 75 or 900). Normalised from Stripe minor
   * units / Mollie string-decimal at emit time so subscribers do not branch.
   */
  amountEur: number | null
  /** ISO-3166-1 alpha-2 country when known (often missing for SEPA). */
  customerCountry: string | null
  /** Locale the donor checked out in (e.g. 'en-GB', 'es-ES'). */
  locale: string | null
}

/**
 * Emitted at the end of a successful first-payment flow when the donor's
 * subscription is now active and welcome / owner-notify have ALREADY fired
 * (subscribers are additive — see file header). This is the "all side
 * effects are done" hook for analytics + future DB upserts.
 */
export interface AdoptionCompletedEvent {
  type: 'adoption.completed'
  vendor: PaymentVendor
  paymentId: string
  customerId: string | null
  customerEmail: string | null
  tier: AdoptionTier
  alpacaSlug: string | null
  isGift: boolean
  amountEur: number | null
  customerCountry: string | null
  locale: string | null
}

/**
 * Emitted when a recurring charge fails (Stripe `invoice.payment_failed`,
 * Mollie `payment.failed`). Subscribers might: bump CRM "at risk" flag,
 * push to Slack, schedule outreach, etc. Note: existing dunning escalation
 * via `lib/owner-notify.ts` STAYS inline — this event is additive.
 */
export interface PaymentFailedEvent {
  type: 'payment.failed'
  vendor: PaymentVendor
  paymentId: string
  customerId: string | null
  customerEmail: string | null
  /** Severity from `lib/payment-failure-tracker.ts` after this fail. */
  severity: FailureSeverity
  /** Consecutive-failure count for this customer (1, 2, 3+). */
  failureCount: number
  /** Tier when known (subs may be on a yearly that didn't renew). */
  tier: AdoptionTier | null
}

/**
 * Emitted when a subscription is cancelled — either by donor action or by
 * the processor giving up after retries. Subscribers might: archive the row,
 * trigger a winback campaign, update churn analytics.
 */
export interface SubscriptionCanceledEvent {
  type: 'subscription.canceled'
  vendor: PaymentVendor
  /** Stripe subscription.id, Mollie subscription.id. */
  subscriptionId: string
  customerId: string | null
  customerEmail: string | null
  tier: AdoptionTier | null
  /** Stripe surfaces a `cancellation_details.reason`; Mollie does not. */
  reason: string | null
}

/**
 * Emitted when a gift adoption's scheduled welcome email is dispatched to the
 * recipient. Separate from `adoption.started` so analytics can distinguish
 * "purchased" from "delivered to recipient". For now this is the same wire
 * point as adoption.started (gifts emit BOTH on purchase); a future spec
 * will defer this until the scheduled email actually fires.
 */
export interface GiftSentEvent {
  type: 'gift.sent'
  vendor: PaymentVendor
  paymentId: string
  /** Recipient (NOT buyer) email — buyer is in adoption.started.customerEmail. */
  recipientEmail: string
  recipientName: string | null
  senderName: string | null
  tier: AdoptionTier
  alpacaSlug: string | null
}

export type DomainEvent =
  | AdoptionStartedEvent
  | AdoptionCompletedEvent
  | PaymentFailedEvent
  | SubscriptionCanceledEvent
  | GiftSentEvent

export type DomainEventType = DomainEvent['type']

// ── Subscriber registry (globalThis-pinned, HMR-safe) ────────────────────────

/**
 * Subscriber map keyed by event type. Values are arrays because multiple
 * subscribers may register for the same event (e.g. VAT recorder +
 * analytics ping both listen to adoption.completed).
 *
 * Same globalThis-pinning trick as lib/payment-failure-tracker.ts: in dev
 * mode Next.js hot-reload re-imports modules but globalThis persists, so
 * subscribers registered once at module load survive HMR. In production
 * this is a no-op (modules load once).
 */
type Subscriber<T extends DomainEventType = DomainEventType> = (
  event: Extract<DomainEvent, { type: T }>,
) => void

const globalForBus = globalThis as unknown as {
  __domainEventSubscribers?: Map<DomainEventType, Set<Subscriber>>
}

const _subscribers: Map<DomainEventType, Set<Subscriber>> =
  globalForBus.__domainEventSubscribers ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForBus.__domainEventSubscribers = _subscribers
}

/**
 * Synchronously fan an event out to every subscriber registered for its type.
 *
 * Contract:
 *   - NEVER throws upward. Each subscriber is wrapped in try/catch and a
 *     failure logs `console.error` but does NOT prevent later subscribers
 *     from running. This is the load-bearing isolation guarantee — one bad
 *     subscriber MUST NOT cause the webhook to return 500.
 *   - Synchronous. Subscribers that need async work should wrap with
 *     `void asyncFn()` so the bus itself stays sync. We do not await
 *     anything because awaiting would change the webhook response timing.
 *   - Order is registration order within a type, but cross-type ordering
 *     is meaningless (each emit() is one event of one type).
 */
export function emit(event: DomainEvent): void {
  const subscribers = _subscribers.get(event.type)
  if (!subscribers || subscribers.size === 0) return
  for (const subscriber of subscribers) {
    try {
      // Cast is sound: subscribers were registered against this exact `type`
      // via the typed subscribe<T>() API below, so the runtime guarantee
      // matches the static narrowing.
      ;(subscriber as Subscriber)(event)
    } catch (err) {
      // Per-subscriber isolation — log and continue. We never re-throw.
      console.error('[events] subscriber threw — continuing fan-out', {
        eventType: event.type,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/**
 * Register a handler for a specific event type. Returns an unsubscribe
 * function (the function-as-disposer pattern used by Node's EventEmitter
 * helpers, React useEffect, and most modern pub/sub libs).
 *
 * Typed at the type-parameter level so handlers receive the narrowed event:
 *
 *   subscribe('adoption.started', (e) => {
 *     // e is typed as AdoptionStartedEvent — no manual narrowing needed.
 *     console.log(e.tier, e.amountEur)
 *   })
 */
export function subscribe<T extends DomainEventType>(
  type: T,
  handler: (event: Extract<DomainEvent, { type: T }>) => void,
): () => void {
  let set = _subscribers.get(type)
  if (!set) {
    set = new Set()
    _subscribers.set(type, set)
  }
  // Cast to the erased Subscriber type for storage — re-narrowed at emit().
  const erased = handler as unknown as Subscriber
  set.add(erased)
  return () => {
    const current = _subscribers.get(type)
    if (current) current.delete(erased)
  }
}

/**
 * @internal — for tests. Clears all subscribers across all event types.
 * Production code should never call this; HMR persistence relies on
 * subscribers staying registered across re-imports.
 */
export function __resetEventBus(): void {
  _subscribers.clear()
}

/**
 * @internal — for tests. Returns the count of registered subscribers for a
 * given event type. Useful to assert idempotent registration in
 * `registerProductionSubscribers()` tests.
 */
export function __getSubscriberCount(type: DomainEventType): number {
  return _subscribers.get(type)?.size ?? 0
}
