/**
 * Unit tests for lib/validate-email.ts
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isValidEmail } from './validate-email.ts'

describe('isValidEmail', () => {
    it('returns true for a standard valid address', () => {
        assert.equal(isValidEmail('user@example.com'), true)
    })

    it('returns false when @ is absent', () => {
        assert.equal(isValidEmail('userexample.com'), false)
    })

    it('returns false when TLD is absent (no dot after @)', () => {
        assert.equal(isValidEmail('user@example'), false)
    })

    it('returns false when TLD is only 1 character', () => {
        assert.equal(isValidEmail('user@example.c'), false)
    })

    it('returns true when value has leading/trailing whitespace (trims before testing)', () => {
        assert.equal(isValidEmail('  user@example.com  '), true)
    })

    it('returns false for null', () => {
        assert.equal(isValidEmail(null), false)
    })

    it('returns false for a number', () => {
        assert.equal(isValidEmail(42), false)
    })

    it('returns false for empty string', () => {
        assert.equal(isValidEmail(''), false)
    })

    it('returns true for a subdomain address', () => {
        assert.equal(isValidEmail('user@mail.example.co.uk'), true)
    })

    it('returns false for address with embedded spaces', () => {
        assert.equal(isValidEmail('user @example.com'), false)
    })
})
