import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { getCheckoutMode, isEmbeddedCheckout } from './checkout-mode.ts'

// Save + restore the original env value so unrelated tests don't leak state.
const originalMode = process.env.CHECKOUT_MODE

beforeEach(() => {
  delete process.env.CHECKOUT_MODE
})

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.CHECKOUT_MODE
  } else {
    process.env.CHECKOUT_MODE = originalMode
  }
})

describe('getCheckoutMode — default', () => {
  it('returns "hosted" when CHECKOUT_MODE is unset', () => {
    assert.equal(getCheckoutMode(), 'hosted')
  })

  it('returns "hosted" when CHECKOUT_MODE is an empty string', () => {
    process.env.CHECKOUT_MODE = ''
    assert.equal(getCheckoutMode(), 'hosted')
  })
})

describe('getCheckoutMode — explicit values', () => {
  it('returns "embedded" when CHECKOUT_MODE=embedded', () => {
    process.env.CHECKOUT_MODE = 'embedded'
    assert.equal(getCheckoutMode(), 'embedded')
  })

  it('returns "hosted" when CHECKOUT_MODE=hosted', () => {
    process.env.CHECKOUT_MODE = 'hosted'
    assert.equal(getCheckoutMode(), 'hosted')
  })
})

describe('getCheckoutMode — invalid values reject to hosted', () => {
  it('collapses typo "embed" to "hosted"', () => {
    process.env.CHECKOUT_MODE = 'embed'
    assert.equal(getCheckoutMode(), 'hosted')
  })

  it('collapses random value to "hosted"', () => {
    process.env.CHECKOUT_MODE = 'something-else'
    assert.equal(getCheckoutMode(), 'hosted')
  })

  it('is case-sensitive — "EMBEDDED" collapses to "hosted"', () => {
    process.env.CHECKOUT_MODE = 'EMBEDDED'
    assert.equal(getCheckoutMode(), 'hosted')
  })
})

describe('isEmbeddedCheckout', () => {
  it('returns false by default', () => {
    assert.equal(isEmbeddedCheckout(), false)
  })

  it('returns true when CHECKOUT_MODE=embedded', () => {
    process.env.CHECKOUT_MODE = 'embedded'
    assert.equal(isEmbeddedCheckout(), true)
  })

  it('returns false for invalid values', () => {
    process.env.CHECKOUT_MODE = 'embed'
    assert.equal(isEmbeddedCheckout(), false)
  })
})
