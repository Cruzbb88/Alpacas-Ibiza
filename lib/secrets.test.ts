import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { safeEqual } from './secrets.ts'

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    assert.equal(safeEqual('abc', 'abc'), true)
  })

  it('returns true for identical long strings', () => {
    const s = 'x'.repeat(1000)
    assert.equal(safeEqual(s, s), true)
  })

  it('returns false for different strings of same length', () => {
    assert.equal(safeEqual('abc', 'abd'), false)
  })

  it('returns false for different strings of different length', () => {
    assert.equal(safeEqual('short', 'much-longer-string'), false)
  })

  it('returns false when a is null', () => {
    assert.equal(safeEqual(null, 'abc'), false)
  })

  it('returns false when b is null', () => {
    assert.equal(safeEqual('abc', null), false)
  })

  it('returns false when a is undefined', () => {
    assert.equal(safeEqual(undefined, 'abc'), false)
  })

  it('returns false when b is undefined', () => {
    assert.equal(safeEqual('abc', undefined), false)
  })

  it('returns false when a is empty string', () => {
    // empty string is falsy — treated same as unset
    assert.equal(safeEqual('', 'abc'), false)
  })

  it('returns false when b is empty string', () => {
    assert.equal(safeEqual('abc', ''), false)
  })

  it('returns false when both are null', () => {
    assert.equal(safeEqual(null, null), false)
  })

  it('returns false when both are empty string', () => {
    assert.equal(safeEqual('', ''), false)
  })
})
