/**
 * Tests for lib/referral-codes.ts
 *
 * Covers:
 *   - Determinism (same input → same output across calls)
 *   - Format (matches /^[A-Z0-9]{6}$/)
 *   - Independence (different customerId → different code)
 *   - Empty input rejection
 *   - Format-validator pass / fail cases
 *   - Lowercase normalisation in verify
 *   - Key sensitivity (changing the signing key changes the code)
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { generateReferralCode, verifyReferralCode, REFERRAL_CODE_LENGTH } from './referral-codes.ts'

const TEST_KEY = 'test-signing-key-for-referral-codes-tests'

before(() => {
  process.env.NEWSLETTER_SIGNING_KEY = TEST_KEY
})

after(() => {
  delete process.env.NEWSLETTER_SIGNING_KEY
})

describe('generateReferralCode', () => {
  it('returns a 6-char code matching /^[A-Z2-7]{6}$/ (base32 alphabet subset of A-Z0-9)', () => {
    const code = generateReferralCode('cus_abc123')
    assert.equal(code.length, REFERRAL_CODE_LENGTH)
    // Base32 alphabet (RFC 4648) is A-Z2-7. /^[A-Z0-9]{6}$/ is the broader
    // format check used by verifyReferralCode — both must pass.
    assert.match(code, /^[A-Z2-7]{6}$/)
    assert.match(code, /^[A-Z0-9]{6}$/)
  })

  it('is deterministic — same input yields identical output across calls', () => {
    const a = generateReferralCode('cus_steady')
    const b = generateReferralCode('cus_steady')
    const c = generateReferralCode('cus_steady')
    assert.equal(a, b)
    assert.equal(b, c)
  })

  it('produces different codes for different customer IDs (no trivial collisions)', () => {
    const a = generateReferralCode('cus_aaa')
    const b = generateReferralCode('cus_bbb')
    const c = generateReferralCode('cus_ccc')
    assert.notEqual(a, b)
    assert.notEqual(b, c)
    assert.notEqual(a, c)
  })

  it('trims whitespace — surrounding spaces yield the same code as the trimmed input', () => {
    const clean = generateReferralCode('cus_xyz')
    const padded = generateReferralCode('   cus_xyz   ')
    assert.equal(clean, padded)
  })

  it('throws on empty / whitespace-only customerId (refuses to emit a "guest" code)', () => {
    assert.throws(() => generateReferralCode(''))
    assert.throws(() => generateReferralCode('   '))
    // @ts-expect-error: explicitly probe the null-coalescing branch
    assert.throws(() => generateReferralCode(null))
    // @ts-expect-error: explicitly probe the undefined branch
    assert.throws(() => generateReferralCode(undefined))
  })

  it('is sensitive to the signing key — rotating the key shifts the code', () => {
    const before = generateReferralCode('cus_keytest')
    process.env.NEWSLETTER_SIGNING_KEY = 'a-different-key-for-rotation-check'
    try {
      const after = generateReferralCode('cus_keytest')
      assert.notEqual(before, after, 'rotating signing key must change the code')
    } finally {
      process.env.NEWSLETTER_SIGNING_KEY = TEST_KEY
    }
  })
})

describe('verifyReferralCode — format guard', () => {
  it('returns the (uppercased) code for a valid 6-char A-Z0-9 string', () => {
    assert.equal(verifyReferralCode('ABC123'), 'ABC123')
    assert.equal(verifyReferralCode('ZZZZZZ'), 'ZZZZZZ')
    assert.equal(verifyReferralCode('234567'), '234567')
  })

  it('normalises lowercase to uppercase before passing', () => {
    assert.equal(verifyReferralCode('abc123'), 'ABC123')
    assert.equal(verifyReferralCode('zZzZzZ'), 'ZZZZZZ')
  })

  it('rejects wrong-length strings (under, over, empty)', () => {
    assert.equal(verifyReferralCode(''), null)
    assert.equal(verifyReferralCode('ABC12'), null)        // 5
    assert.equal(verifyReferralCode('ABC1234'), null)      // 7
    assert.equal(verifyReferralCode('ABCDEFGHIJKLMNOP'), null) // way over
  })

  it('rejects disallowed characters (punctuation, whitespace, unicode)', () => {
    assert.equal(verifyReferralCode('ABC-12'), null)
    assert.equal(verifyReferralCode('ABC 12'), null)
    assert.equal(verifyReferralCode('ABC!23'), null)
    assert.equal(verifyReferralCode('ABCñ23'), null)
    assert.equal(verifyReferralCode('ABC_23'), null)
  })

  it('rejects non-string inputs (null, undefined, number-ish)', () => {
    assert.equal(verifyReferralCode(null), null)
    assert.equal(verifyReferralCode(undefined), null)
    // @ts-expect-error: probe the typeof !== string guard
    assert.equal(verifyReferralCode(123456), null)
    // @ts-expect-error: probe the typeof !== string guard
    assert.equal(verifyReferralCode({}), null)
  })

  it('roundtrips: every generated code passes verifyReferralCode', () => {
    for (const cust of ['cus_a', 'cus_bb', 'cus_ccc', 'cus_donor-001', 'cus_VeryLongIdWithMixedCase_2026']) {
      const code = generateReferralCode(cust)
      assert.equal(verifyReferralCode(code), code, `generated code ${code} must pass verify`)
    }
  })
})
