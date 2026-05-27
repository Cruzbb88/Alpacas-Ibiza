/**
 * Tests for adopt-checkout-state helpers.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseCheckoutState, inferTier } from './adopt-checkout-state.ts'

/** Minimal URLSearchParams stub used in tests. */
function params(record: Record<string, string>): { get(k: string): string | null } {
  return { get: (k: string) => record[k] ?? null }
}

describe('parseCheckoutState', () => {
  it('returns success for checkout=success', () => {
    assert.equal(parseCheckoutState(params({ checkout: 'success' })), 'success')
  })

  it('returns cancelled for checkout=cancelled', () => {
    assert.equal(parseCheckoutState(params({ checkout: 'cancelled' })), 'cancelled')
  })

  it('returns idle when checkout param is absent', () => {
    assert.equal(parseCheckoutState(params({})), 'idle')
  })

  it('returns idle for unexpected checkout value', () => {
    assert.equal(parseCheckoutState(params({ checkout: 'pending' })), 'idle')
  })
})

describe('inferTier', () => {
  it('returns yearly when tier=yearly', () => {
    assert.equal(inferTier(params({ tier: 'yearly' })), 'yearly')
  })

  it('returns monthly when tier=monthly', () => {
    assert.equal(inferTier(params({ tier: 'monthly' })), 'monthly')
  })

  it('defaults to monthly when tier param is absent', () => {
    assert.equal(inferTier(params({})), 'monthly')
  })

  it('defaults to monthly for unexpected tier value', () => {
    assert.equal(inferTier(params({ tier: 'enterprise' })), 'monthly')
  })

  it('defaults to monthly when tier is empty string', () => {
    assert.equal(inferTier(params({ tier: '' })), 'monthly')
  })
})
