import { describe, it, expect } from 'vitest'
import { safeEqual } from './secrets.ts'

describe('safeEqual', () => {
  it('returns true for identical strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
  })

  it('returns true for identical long strings', () => {
    const s = 'x'.repeat(1000)
    expect(safeEqual(s, s)).toBe(true)
  })

  it('returns false for different strings of same length', () => {
    expect(safeEqual('abc', 'abd')).toBe(false)
  })

  it('returns false for different strings of different length', () => {
    expect(safeEqual('short', 'much-longer-string')).toBe(false)
  })

  it('returns false when a is null', () => {
    expect(safeEqual(null, 'abc')).toBe(false)
  })

  it('returns false when b is null', () => {
    expect(safeEqual('abc', null)).toBe(false)
  })

  it('returns false when a is undefined', () => {
    expect(safeEqual(undefined, 'abc')).toBe(false)
  })

  it('returns false when b is undefined', () => {
    expect(safeEqual('abc', undefined)).toBe(false)
  })

  it('returns false when a is empty string', () => {
    // empty string is falsy — treated same as unset
    expect(safeEqual('', 'abc')).toBe(false)
  })

  it('returns false when b is empty string', () => {
    expect(safeEqual('abc', '')).toBe(false)
  })

  it('returns false when both are null', () => {
    expect(safeEqual(null, null)).toBe(false)
  })

  it('returns false when both are empty string', () => {
    expect(safeEqual('', '')).toBe(false)
  })
})
