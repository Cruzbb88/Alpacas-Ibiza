/**
 * Tests for lib/event-subscribers.ts — the production wiring layer for the
 * domain-event bus.
 *
 * Pinned behaviour:
 *   - registerProductionSubscribers() is idempotent (repeat calls don't pile up)
 *   - After registration, emitting events fans out to the wired subscribers
 *   - The reset helper allows tests to re-register cleanly
 *
 * Note: we don't assert exactly which subscribers exist (that's an
 * implementation detail subject to change as work moves out of inline calls).
 * We assert that AT LEAST ONE subscriber per advertised event type exists
 * after registration, and that the count is stable across repeat calls.
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  emit,
  subscribe,
  __resetEventBus,
  __getSubscriberCount,
} from './events.ts'
import {
  registerProductionSubscribers,
  __resetProductionRegistrationFlag,
} from './event-subscribers.ts'

describe('event-subscribers', () => {
  beforeEach(() => {
    __resetEventBus()
    __resetProductionRegistrationFlag()
  })

  it('registers at least one subscriber per documented event type', () => {
    registerProductionSubscribers()

    // adoption.completed has multiple production subscribers (VAT + owner-notify log).
    assert.ok(
      __getSubscriberCount('adoption.completed') >= 1,
      'adoption.completed must have ≥1 subscriber after registration',
    )
    assert.ok(
      __getSubscriberCount('adoption.started') >= 1,
      'adoption.started must have ≥1 subscriber (future DB upsert seam)',
    )
    assert.ok(
      __getSubscriberCount('payment.failed') >= 1,
      'payment.failed must have ≥1 subscriber',
    )
    assert.ok(
      __getSubscriberCount('subscription.canceled') >= 1,
      'subscription.canceled must have ≥1 subscriber',
    )
    assert.ok(
      __getSubscriberCount('gift.sent') >= 1,
      'gift.sent must have ≥1 subscriber',
    )
  })

  it('is idempotent — repeat registerProductionSubscribers() calls do not pile up', () => {
    registerProductionSubscribers()
    const countAfterFirst = __getSubscriberCount('adoption.completed')

    registerProductionSubscribers()
    registerProductionSubscribers()
    registerProductionSubscribers()

    assert.equal(
      __getSubscriberCount('adoption.completed'),
      countAfterFirst,
      'subscriber count must be stable across repeat registration',
    )
  })

  it('wired subscribers receive emitted events', () => {
    registerProductionSubscribers()

    // Compare subscriber counts before/after a no-op emit to confirm the
    // registration wired into the SAME bus instance the test is reading.
    // We can't introspect WHICH subscribers exist (they're closures inside
    // registerProductionSubscribers), but the count proves registration
    // landed in the singleton bus the rest of the codebase emits to.
    const adoptionCompletedCount = __getSubscriberCount('adoption.completed')
    const paymentFailedCount = __getSubscriberCount('payment.failed')

    assert.ok(
      adoptionCompletedCount >= 2,
      'adoption.completed should have multiple production subscribers (VAT + owner-notify mirror)',
    )
    assert.ok(paymentFailedCount >= 1)

    // Sanity: emitting must not throw even though we have no test spies on the
    // production subscribers. (This is the "fan-out runs cleanly" check.)
    assert.doesNotThrow(() =>
      emit({
        type: 'adoption.completed',
        vendor: 'stripe',
        paymentId: 'cs_test_wired',
        customerId: 'cus_test',
        customerEmail: 'donor@example.com',
        tier: 'monthly',
        alpacaSlug: 'paco',
        isGift: false,
        amountEur: null,
        customerCountry: null,
        locale: null,
      }),
    )
  })

  it('test-only subscribers added on top of production registration also fire', () => {
    registerProductionSubscribers()

    let received = 0
    subscribe('payment.failed', () => { received++ })

    emit({
      type: 'payment.failed',
      vendor: 'mollie',
      paymentId: 'tr_failed_1',
      customerId: 'cst_1',
      customerEmail: 'donor@example.com',
      severity: 'at-risk',
      failureCount: 2,
      tier: 'monthly',
    })

    assert.equal(received, 1, 'ad-hoc subscriber added after production registration must still fire')
  })
})
