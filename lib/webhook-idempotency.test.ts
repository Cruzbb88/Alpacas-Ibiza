import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { isAlreadyProcessed, markProcessed, __resetWebhookIdempotency } from './webhook-idempotency.ts'

describe('isAlreadyProcessed + markProcessed', () => {
  beforeEach(() => __resetWebhookIdempotency())

  it('isAlreadyProcessed returns false for an unseen event', () => {
    assert.equal(isAlreadyProcessed('evt_test_1'), false)
  })

  it('isAlreadyProcessed does NOT mark the event (must call markProcessed explicitly)', () => {
    // The old API marked-on-check, which silently swallowed Stripe/Mollie
    // retries when the first attempt failed transiently. Check that the new
    // API requires an explicit mark.
    isAlreadyProcessed('evt_no_mark')
    assert.equal(isAlreadyProcessed('evt_no_mark'), false, 'must not auto-mark on check')
  })

  it('markProcessed flips subsequent isAlreadyProcessed to true', () => {
    markProcessed('evt_done')
    assert.equal(isAlreadyProcessed('evt_done'), true)
  })

  it('different events are tracked independently', () => {
    markProcessed('evt_a')
    assert.equal(isAlreadyProcessed('evt_b'), false)
  })

  it('reset clears all tracked events', () => {
    markProcessed('evt_x')
    __resetWebhookIdempotency()
    assert.equal(isAlreadyProcessed('evt_x'), false)
  })
})
