/**
 * Unit tests for lib/validate-email.ts
 *
 * Framework: Vitest (mirrors node:test originals in validate-email.test.ts).
 */

import { describe, it, expect } from 'vitest'
import { isValidEmail } from './validate-email.ts'

describe('isValidEmail', () => {
  it('returns true for a standard valid address', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
  })

  it('returns false when @ is absent', () => {
    expect(isValidEmail('userexample.com')).toBe(false)
  })

  it('returns false when TLD is absent (no dot after @)', () => {
    expect(isValidEmail('user@example')).toBe(false)
  })

  it('returns false when TLD is only 1 character', () => {
    expect(isValidEmail('user@example.c')).toBe(false)
  })

  it('returns true when value has leading/trailing whitespace (trims before testing)', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true)
  })

  it('returns false for null', () => {
    expect(isValidEmail(null)).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isValidEmail(42)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })

  it('returns true for a subdomain address', () => {
    expect(isValidEmail('user@mail.example.co.uk')).toBe(true)
  })

  it('returns false for address with embedded spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
  })
})
