import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function validateType(t: unknown): t is 'export' | 'deletion' {
  return t === 'export' || t === 'deletion'
}

describe('GDPR validateType', () => {
  it('accepts export', () => assert.equal(validateType('export'), true))
  it('accepts deletion', () => assert.equal(validateType('deletion'), true))
  it('rejects unknown values', () => assert.equal(validateType('foo'), false))
  it('rejects undefined', () => assert.equal(validateType(undefined), false))
  it('rejects non-string types (security)', () => assert.equal(validateType({ type: 'export' }), false))
})
