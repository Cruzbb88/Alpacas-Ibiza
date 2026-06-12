/**
 * Tests for lib/donor-receipt-token.ts — locks the HMAC capability-token
 * contract: roundtrip, sessionId binding, tampered signature, expiry,
 * scope-guard (cross-use with mollie-manage tokens must fail), oversized
 * input DoS guard.
 *
 * Exploding-pen gd-022 (ep-007).
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { signDonorReceiptToken, verifyDonorReceiptToken } from './donor-receipt-token.ts'
import { signMollieCancelToken } from './mollie-manage-token.ts'

const TEST_KEY = 'test-signing-key-for-donor-receipt-hmac-tests'

before(() => {
  process.env.NEWSLETTER_SIGNING_KEY = TEST_KEY
})

after(() => {
  delete process.env.NEWSLETTER_SIGNING_KEY
})

describe('signDonorReceiptToken + verifyDonorReceiptToken', () => {
  it('roundtrip: sign then verify returns the original sessionId', () => {
    const sessionId = 'cs_live_abc123XYZ'
    const token = signDonorReceiptToken(sessionId)
    const result = verifyDonorReceiptToken(token, sessionId)
    assert.ok(result !== null, 'expected non-null result')
    assert.equal(result!.sessionId, sessionId)
    assert.equal(result!.scope, 'receipt')
  })

  it('binds to sessionId — same token, different sessionId, returns null', () => {
    const token = signDonorReceiptToken('cs_live_abc')
    assert.equal(verifyDonorReceiptToken(token, 'cs_live_other'), null)
  })

  it('tampered signature returns null', () => {
    const token = signDonorReceiptToken('cs_live_abc')
    const tampered = token.slice(0, -2) + (token.slice(-2) === 'AA' ? 'BB' : 'AA')
    assert.equal(verifyDonorReceiptToken(tampered, 'cs_live_abc'), null)
  })

  it('expired token returns null', () => {
    const expired = signDonorReceiptToken('cs_live_abc', -1)
    assert.equal(verifyDonorReceiptToken(expired, 'cs_live_abc'), null)
  })

  it('mollie-manage cancel token rejected at receipt-scope verify (scope-guard)', () => {
    const crossScope = signMollieCancelToken('cst_x', 'sub_x')
    // Even if attacker substitutes a valid HMAC from another scope, scope guard rejects.
    assert.equal(verifyDonorReceiptToken(crossScope, 'cs_live_abc'), null)
  })

  it('oversized token (>2048 bytes) returns null without HMAC compute (DoS guard)', () => {
    const huge = 'A'.repeat(2049)
    assert.equal(verifyDonorReceiptToken(huge, 'cs_live_abc'), null)
  })

  it('empty token returns null', () => {
    assert.equal(verifyDonorReceiptToken('', 'cs_live_abc'), null)
  })

  it('token without dot separator returns null', () => {
    assert.equal(verifyDonorReceiptToken('no-dot-here', 'cs_live_abc'), null)
  })

  it('default TTL is 60 days', () => {
    const token = signDonorReceiptToken('cs_live_abc')
    const result = verifyDonorReceiptToken(token, 'cs_live_abc')
    assert.ok(result !== null)
    const exp = new Date(result!.expiresAt).getTime()
    const fiftyNineDays = 59 * 24 * 60 * 60 * 1000
    const sixtyOneDays = 61 * 24 * 60 * 60 * 1000
    assert.ok(exp > Date.now() + fiftyNineDays, 'expiry should be ~60 days out')
    assert.ok(exp < Date.now() + sixtyOneDays)
  })
})
