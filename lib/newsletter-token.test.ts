/**
 * Tests for lib/newsletter-token.ts
 * Covers: sign+verify roundtrip, tampered email, expired token, invalid base64.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { signNewsletterToken, verifyNewsletterToken, isExpiredNewsletterToken } from './newsletter-token.ts'

const TEST_KEY = 'test-signing-key-for-newsletter-hmac-tests'

before(() => {
  process.env.NEWSLETTER_SIGNING_KEY = TEST_KEY
})

after(() => {
  delete process.env.NEWSLETTER_SIGNING_KEY
})

describe('signNewsletterToken + verifyNewsletterToken', () => {
  it('roundtrip: sign then verify returns the original email', () => {
    const email = 'herd@alpacasibiza.com'
    const token = signNewsletterToken(email)
    const result = verifyNewsletterToken(token)
    assert.ok(result !== null, 'expected non-null result')
    assert.equal(result!.email, email)
  })

  it('roundtrip: expiresAt is roughly 7 days in the future', () => {
    const token = signNewsletterToken('test@example.com')
    const result = verifyNewsletterToken(token)
    assert.ok(result !== null)
    const exp = new Date(result!.expiresAt).getTime()
    const sixDays = 6 * 24 * 60 * 60 * 1000
    const eightDays = 8 * 24 * 60 * 60 * 1000
    assert.ok(exp > Date.now() + sixDays, 'expiry should be at least 6 days out')
    assert.ok(exp < Date.now() + eightDays, 'expiry should be at most 8 days out')
  })

  it('roundtrip: each token has a unique nonce', () => {
    const t1 = signNewsletterToken('test@example.com')
    const t2 = signNewsletterToken('test@example.com')
    assert.notEqual(t1, t2, 'tokens for same email must differ (nonce)')
  })
})

describe('verifyNewsletterToken — tamper resistance', () => {
  it('returns null when the email in the payload is tampered', () => {
    const token = signNewsletterToken('legit@example.com')
    // Replace the payload portion with one that has a different email
    const [, sigB64] = token.split('.')
    const tamperedPayload = Buffer.from(
      JSON.stringify({ email: 'attacker@evil.com', expiresAt: new Date(Date.now() + 86400000).toISOString(), nonce: 'aaa' })
    ).toString('base64url')
    const tampered = `${tamperedPayload}.${sigB64}`
    assert.equal(verifyNewsletterToken(tampered), null)
  })

  it('returns null when the signature is truncated', () => {
    const token = signNewsletterToken('test@example.com')
    const truncated = token.slice(0, -4)
    assert.equal(verifyNewsletterToken(truncated), null)
  })

  it('returns null when the signature is corrupted', () => {
    const token = signNewsletterToken('test@example.com')
    const corrupt = token.slice(0, -3) + 'XXX'
    assert.equal(verifyNewsletterToken(corrupt), null)
  })

  it('returns null when no dot separator present', () => {
    assert.equal(verifyNewsletterToken('nodotsinhere'), null)
  })
})

describe('verifyNewsletterToken — expired token', () => {
  it('returns null for a token with expiresAt in the past', () => {
    // Sign with a -1ms TTL so it expires immediately
    const token = signNewsletterToken('test@example.com', -1)
    assert.equal(verifyNewsletterToken(token), null)
  })
})

describe('verifyNewsletterToken — invalid input', () => {
  it('returns null for empty string', () => {
    assert.equal(verifyNewsletterToken(''), null)
  })

  it('returns null for garbage base64', () => {
    assert.equal(verifyNewsletterToken('!!!.!!!'), null)
  })

  it('returns null for a dot-only token', () => {
    assert.equal(verifyNewsletterToken('.'), null)
  })

  it('returns null for a valid-looking payload with no expiresAt', () => {
    const payloadB64 = Buffer.from(JSON.stringify({ email: 'x@x.com', nonce: 'abc' })).toString('base64url')
    const sig = 'fakesig'
    assert.equal(verifyNewsletterToken(`${payloadB64}.${sig}`), null)
  })

  it('never throws on arbitrary input', () => {
    const inputs = ['', 'a', '..', '\x00\x01', 'a'.repeat(2000), '🦙🦙.🦙']
    for (const input of inputs) {
      assert.doesNotThrow(() => verifyNewsletterToken(input), `threw on input: ${JSON.stringify(input)}`)
    }
  })
})

describe('isExpiredNewsletterToken', () => {
  it('returns true for a validly-signed but expired token', () => {
    const token = signNewsletterToken('test@example.com', -1)
    assert.equal(isExpiredNewsletterToken(token), true)
  })

  it('returns false for a valid non-expired token', () => {
    const token = signNewsletterToken('test@example.com')
    assert.equal(isExpiredNewsletterToken(token), false)
  })

  it('returns false for a tampered (invalid sig) token', () => {
    const token = signNewsletterToken('test@example.com', -1) // expired
    const corrupt = token.slice(0, -3) + 'XXX'
    assert.equal(isExpiredNewsletterToken(corrupt), false)
  })
})
