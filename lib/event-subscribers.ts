/**
 * Production wiring for the domain-event bus (lib/events.ts).
 *
 * Each subscriber owns one concern and reads ONLY the normalized fields it
 * cares about from the event payload. This is the migration seam: today the
 * subscribers are thin wrappers around existing inline helpers (VAT recorder,
 * owner-notify, future DB upsert hook); a future spec will move the actual
 * work out of `lib/payment-handlers.ts` and into these subscribers, then
 * remove the inline calls.
 *
 * Why a separate registration module
 * ----------------------------------
 * Subscribers must register BEFORE any webhook fires. We do that by importing
 * this module from the webhook routes (or `instrumentation.ts`) and calling
 * `registerProductionSubscribers()` once. The function is idempotent — guarded
 * by a globalThis flag — so it's safe to call from multiple entrypoints and
 * survives HMR without double-registering.
 *
 * Sync-safety contract
 * --------------------
 * Subscribers are called synchronously from `emit()` inside webhook handlers.
 * If a subscriber needs async work (DB write, HTTP call), it MUST wrap with
 * `void asyncFn()` so the bus call site doesn't block. The bus itself stays
 * sync to avoid changing webhook response timing (Mollie/Stripe retry on slow
 * responses). Errors inside the async lambda are caught by the bus's
 * per-subscriber try/catch; errors after the sync lambda returns become
 * unhandledRejection — so each async wrapper SHOULD do its own try/catch.
 */

import { subscribe } from './events.ts'
import { recordVatFromPayment } from './vat-recorder.ts'

const globalForReg = globalThis as unknown as {
  __domainEventSubscribersRegistered?: boolean
}

/**
 * Idempotently register every production subscriber. Safe to call from
 * multiple entrypoints (webhook routes, instrumentation, tests) — repeat
 * calls are no-ops via the globalThis flag.
 *
 * In dev mode the flag persists across HMR (same trick as
 * lib/payment-failure-tracker.ts) so we don't pile up duplicate subscribers
 * every time a route re-imports.
 */
export function registerProductionSubscribers(): void {
  if (globalForReg.__domainEventSubscribersRegistered) return
  globalForReg.__domainEventSubscribersRegistered = true

  // ── VAT recorder ──────────────────────────────────────────────────────────
  // Fires on adoption.completed (NOT adoption.started — VAT should record only
  // after the payment is fully settled and other side-effects have succeeded).
  // recordVatFromPayment is already fail-quiet by contract; we still wrap in
  // try/catch as a belt-and-braces guard so a thrown error in vat-tracker
  // can NEVER reach the bus's logger and look like a bus bug.
  subscribe('adoption.completed', (event) => {
    try {
      if (event.amountEur == null) return
      recordVatFromPayment({
        amountEur: event.amountEur,
        customerCountry: event.customerCountry ?? undefined,
        attemptId: event.paymentId,
        yearEpoch: Date.now(),
      })
    } catch (err) {
      console.error('[event-subscribers] vat-recorder failed', {
        paymentId: event.paymentId,
        err: err instanceof Error ? err.message : String(err),
      })
    }
  })

  // ── Owner-notify hook (observation only for now) ──────────────────────────
  // The actual owner welcome email still fires inline inside
  // handleStripeCheckoutCompleted / handleMolliePaymentPaid (via deps.ownerEmail).
  // This subscriber is the seam where that work WILL move once we're confident
  // the bus is wired everywhere. Today it just logs so we can prove parity in
  // staging (every inline owner notify should be paired with one of these logs).
  subscribe('adoption.completed', (event) => {
    if (!process.env.CONTACT_EMAIL) return
    console.info('[event-subscribers] adoption.completed observed', {
      vendor: event.vendor,
      paymentId: event.paymentId,
      tier: event.tier,
      isGift: event.isGift,
    })
  })

  // ── Future DB upserter hook (no-op for now) ───────────────────────────────
  // When we add a `subscribers` table (Postgres / Vercel KV / whatever), this
  // is where the upsert lives. Today it's intentionally a no-op so the wiring
  // point is documented in code and tests can assert the subscription exists.
  // DO NOT inline DB work here without first wrapping in `void asyncFn()` and
  // an inner try/catch — see file header.
  subscribe('adoption.started', (_event) => {
    // void upsertSubscriberRecord(_event)  ← when we have a DB
  })

  // ── Payment-failed mirror (observation only for now) ─────────────────────
  // Existing dunning escalation (owner-notify.ts, donor email) STAYS inline in
  // handleStripeInvoicePaymentFailed / handleMolliePaymentFailed. This is the
  // future home for Slack pings, CRM "at risk" flag bumps, analytics events.
  subscribe('payment.failed', (event) => {
    console.info('[event-subscribers] payment.failed observed', {
      vendor: event.vendor,
      paymentId: event.paymentId,
      severity: event.severity,
      failureCount: event.failureCount,
    })
  })

  // ── Subscription-canceled mirror (observation only for now) ──────────────
  // Future: winback campaign trigger, churn analytics upsert.
  subscribe('subscription.canceled', (event) => {
    console.info('[event-subscribers] subscription.canceled observed', {
      vendor: event.vendor,
      subscriptionId: event.subscriptionId,
      reason: event.reason,
    })
  })

  // ── Gift-sent mirror (observation only for now) ──────────────────────────
  // Today emits at purchase time alongside adoption.started for gifts. Future:
  // separate emit at scheduled-send time so analytics distinguish bought-vs-delivered.
  subscribe('gift.sent', (event) => {
    console.info('[event-subscribers] gift.sent observed', {
      vendor: event.vendor,
      paymentId: event.paymentId,
      tier: event.tier,
    })
  })
}

/**
 * @internal — for tests. Clears the registration flag so subsequent calls to
 * `registerProductionSubscribers()` will register again. Tests should call
 * `__resetEventBus()` from events.ts BEFORE this to drop the old handlers.
 */
export function __resetProductionRegistrationFlag(): void {
  globalForReg.__domainEventSubscribersRegistered = false
}
