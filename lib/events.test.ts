/**
 * Tests for the typed in-process event bus (lib/events.ts).
 *
 * Pinned behaviour:
 *   - subscribe + emit fires the handler with the typed payload
 *   - multiple subscribers all fire
 *   - one throwing subscriber does not prevent others (Promise.allSettled-style isolation)
 *   - unsubscribe() removes from the list
 *   - emit on a type with no subscribers is a no-op (doesn't throw)
 *   - subscribe with the same handler twice de-duplicates (Set semantics)
 */

import { describe, it, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  emit,
  subscribe,
  __resetEventBus,
  __getSubscriberCount,
  type AdoptionCompletedEvent,
  type PaymentFailedEvent,
} from './events.ts'

describe('events bus', () => {
  beforeEach(() => {
    __resetEventBus()
  })

  it('calls a subscriber with the typed payload after emit', () => {
    const received: AdoptionCompletedEvent[] = []
    subscribe('adoption.completed', (event) => {
      // TS proves event is AdoptionCompletedEvent here; assert runtime shape.
      received.push(event)
    })

    emit({
      type: 'adoption.completed',
      vendor: 'stripe',
      paymentId: 'cs_test_1',
      customerId: 'cus_1',
      customerEmail: 'donor@example.com',
      tier: 'monthly',
      alpacaSlug: 'paco',
      isGift: false,
      amountEur: 75,
      customerCountry: 'ES',
      locale: 'en-GB',
    })

    assert.equal(received.length, 1)
    assert.equal(received[0]!.paymentId, 'cs_test_1')
    assert.equal(received[0]!.tier, 'monthly')
    assert.equal(received[0]!.amountEur, 75)
  })

  it('fires every registered subscriber for the same event type', () => {
    let callsA = 0
    let callsB = 0
    let callsC = 0
    subscribe('adoption.completed', () => { callsA++ })
    subscribe('adoption.completed', () => { callsB++ })
    subscribe('adoption.completed', () => { callsC++ })

    emit({
      type: 'adoption.completed',
      vendor: 'mollie',
      paymentId: 'tr_x',
      customerId: null,
      customerEmail: null,
      tier: 'yearly',
      alpacaSlug: null,
      isGift: false,
      amountEur: 900,
      customerCountry: null,
      locale: null,
    })

    assert.equal(callsA, 1)
    assert.equal(callsB, 1)
    assert.equal(callsC, 1)
  })

  it('isolates a throwing subscriber so others still receive the event', (t) => {
    // Suppress the console.error the bus is contracted to log.
    const errSpy = t.mock.method(console, 'error', () => {})
    let firstCalled = false
    let thirdCalled = false
    subscribe('payment.failed', () => { firstCalled = true })
    subscribe('payment.failed', () => { throw new Error('subscriber boom') })
    subscribe('payment.failed', () => { thirdCalled = true })

    // emit MUST NOT throw upward even though one subscriber threw.
    const event: PaymentFailedEvent = {
      type: 'payment.failed',
      vendor: 'stripe',
      paymentId: 'pi_1',
      customerId: 'cus_1',
      customerEmail: 'donor@example.com',
      severity: 'first',
      failureCount: 1,
      tier: 'monthly',
    }
    assert.doesNotThrow(() => emit(event))

    // Both non-throwing subscribers must still have fired.
    assert.equal(firstCalled, true, 'subscriber before the throw must fire')
    assert.equal(thirdCalled, true, 'subscriber after the throw must still fire')
    // The bus is contracted to log the failure so operators can see it.
    assert.ok(errSpy.mock.callCount() >= 1, 'console.error must be called for the throwing subscriber')
  })

  it('unsubscribe removes the handler from future emits', () => {
    let count = 0
    const unsubscribe = subscribe('adoption.completed', () => { count++ })

    emit({
      type: 'adoption.completed',
      vendor: 'stripe',
      paymentId: 'cs_1',
      customerId: null,
      customerEmail: null,
      tier: 'monthly',
      alpacaSlug: null,
      isGift: false,
      amountEur: null,
      customerCountry: null,
      locale: null,
    })
    assert.equal(count, 1)

    unsubscribe()
    emit({
      type: 'adoption.completed',
      vendor: 'stripe',
      paymentId: 'cs_2',
      customerId: null,
      customerEmail: null,
      tier: 'monthly',
      alpacaSlug: null,
      isGift: false,
      amountEur: null,
      customerCountry: null,
      locale: null,
    })
    assert.equal(count, 1, 'no further calls after unsubscribe')
    assert.equal(__getSubscriberCount('adoption.completed'), 0)
  })

  it('emit on a type with no subscribers does not throw', () => {
    assert.doesNotThrow(() =>
      emit({
        type: 'gift.sent',
        vendor: 'stripe',
        paymentId: 'cs_x',
        recipientEmail: 'r@example.com',
        recipientName: null,
        senderName: null,
        tier: 'monthly',
        alpacaSlug: null,
      }),
    )
  })

  it('subscribers are stored as a Set — same function registered twice fires once', () => {
    let calls = 0
    const handler = () => { calls++ }
    subscribe('adoption.completed', handler)
    subscribe('adoption.completed', handler)
    assert.equal(__getSubscriberCount('adoption.completed'), 1)

    emit({
      type: 'adoption.completed',
      vendor: 'stripe',
      paymentId: 'cs_dup',
      customerId: null,
      customerEmail: null,
      tier: 'monthly',
      alpacaSlug: null,
      isGift: false,
      amountEur: null,
      customerCountry: null,
      locale: null,
    })
    assert.equal(calls, 1, 'duplicate handler registration must not fire twice')
  })

  // Suppress unused-import warning for the mock helper above.
  void mock
})
