import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatPrice } from './format-price.ts'

describe('formatPrice', () => {
  it('formats 30 EUR for en locale', () => {
    const result = formatPrice(30, 'en')
    assert.match(result, /€30|EUR/)
  })

  it('formats 30 EUR for nl locale', () => {
    const result = formatPrice(30, 'nl')
    assert.match(result, /30|€/)
  })

  it('formats 900 EUR for de locale (German uses comma separator)', () => {
    const result = formatPrice(900, 'de')
    assert.ok(result.includes('900'))
  })

  it('honors minimumFractionDigits when set', () => {
    const result = formatPrice(30, 'en', { minimumFractionDigits: 2 })
    assert.match(result, /30\.00/)
  })

  it('falls back gracefully on invalid locale (no throw)', () => {
    assert.doesNotThrow(() => formatPrice(30, 'xx-XX'))
  })

  it('returns a string for any positive number', () => {
    const result = formatPrice(75)
    assert.equal(typeof result, 'string')
    assert.ok(result.length > 0)
  })
})
