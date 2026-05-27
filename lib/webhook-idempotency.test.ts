import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { isAlreadyProcessed, __resetWebhookIdempotency } from './webhook-idempotency.ts'

describe('isAlreadyProcessed', () => {
  beforeEach(() => __resetWebhookIdempotency())

  it('returns false on first call (new event)', () => {
    assert.equal(isAlreadyProcessed('evt_test_1'), false)
  })

  it('returns true on second call (same event)', () => {
    isAlreadyProcessed('evt_test_2')
    assert.equal(isAlreadyProcessed('evt_test_2'), true)
  })

  it('different events are tracked independently', () => {
    isAlreadyProcessed('evt_a')
    assert.equal(isAlreadyProcessed('evt_b'), false)
  })

  it('reset clears all tracked events', () => {
    isAlreadyProcessed('evt_x')
    __resetWebhookIdempotency()
    assert.equal(isAlreadyProcessed('evt_x'), false)
  })
})
