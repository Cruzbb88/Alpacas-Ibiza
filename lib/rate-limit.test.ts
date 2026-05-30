import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'crypto'
import { rateLimit, rateLimitByEmail, __resetEmailRateLimit } from './rate-limit.ts'

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const key = `test-allow-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      const result = rateLimit({ key, limit: 3, windowMs: 60_000 })
      assert.equal(result.allowed, true, `Request ${i + 1} should be allowed`)
    }
  })

  it('rejects request at limit + 1', () => {
    const key = `test-reject-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      rateLimit({ key, limit: 3, windowMs: 60_000 })
    }
    const result = rateLimit({ key, limit: 3, windowMs: 60_000 })
    assert.equal(result.allowed, false, 'Request limit+1 should be rejected')
    assert.equal(result.remaining, 0)
    assert.ok(result.resetMs > 0, 'resetMs should be positive')
  })

  it('resets after the window expires', async () => {
    const windowMs = 50 // 50ms window for speed
    const key = `test-reset-${Date.now()}`

    // Fill the limit
    for (let i = 0; i < 2; i++) {
      rateLimit({ key, limit: 2, windowMs })
    }
    // Confirm blocked
    const blocked = rateLimit({ key, limit: 2, windowMs })
    assert.equal(blocked.allowed, false)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 10))

    // Should be allowed again
    const after = rateLimit({ key, limit: 2, windowMs })
    assert.equal(after.allowed, true, 'Should be allowed after window expires')
  })

  it('different keys do not interfere with each other', () => {
    const ts = Date.now()
    const keyA = `test-keyA-${ts}`
    const keyB = `test-keyB-${ts}`

    // Exhaust keyA
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: keyA, limit: 3, windowMs: 60_000 })
    }
    const blockedA = rateLimit({ key: keyA, limit: 3, windowMs: 60_000 })
    assert.equal(blockedA.allowed, false, 'keyA should be rate limited')

    // keyB should still be free
    const allowedB = rateLimit({ key: keyB, limit: 3, windowMs: 60_000 })
    assert.equal(allowedB.allowed, true, 'keyB should not be affected by keyA')
  })
})

describe('newsletter per-email rate limiting (SHA-256 hashed keys)', () => {
  /** Build the same hashed key the route uses */
  function emailRateLimitKey(email: string): string {
    const normalized = email.toLowerCase().trim()
    const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16)
    return `newsletter-email:${hash}`
  }

  it('same email hits limit after 3 attempts within the window', () => {
    const key = emailRateLimitKey(`victim-${Date.now()}@example.com`)
    for (let i = 0; i < 3; i++) {
      const r = rateLimit({ key, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
      assert.equal(r.allowed, true, `Attempt ${i + 1} should be allowed`)
    }
    const blocked = rateLimit({ key, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
    assert.equal(blocked.allowed, false, '4th attempt should be blocked')
    assert.equal(blocked.remaining, 0)
    assert.ok(blocked.resetMs > 0)
  })

  it('different emails have independent counters', () => {
    const ts = Date.now()
    const keyA = emailRateLimitKey(`alice-${ts}@example.com`)
    const keyB = emailRateLimitKey(`bob-${ts}@example.com`)

    // Exhaust alice
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: keyA, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
    }
    assert.equal(rateLimit({ key: keyA, limit: 3, windowMs: 24 * 60 * 60 * 1000 }).allowed, false, 'alice exhausted')

    // bob unaffected
    assert.equal(rateLimit({ key: keyB, limit: 3, windowMs: 24 * 60 * 60 * 1000 }).allowed, true, 'bob independent')
  })

  it('window expiry resets the per-email counter', async () => {
    const windowMs = 50
    const key = emailRateLimitKey(`expiry-${Date.now()}@example.com`)

    for (let i = 0; i < 3; i++) {
      rateLimit({ key, limit: 3, windowMs })
    }
    assert.equal(rateLimit({ key, limit: 3, windowMs }).allowed, false, 'should be blocked before expiry')

    await new Promise((resolve) => setTimeout(resolve, windowMs + 10))

    assert.equal(rateLimit({ key, limit: 3, windowMs }).allowed, true, 'should be allowed after window expires')
  })

  it('SHA-256 hashed key for same email always maps to same bucket', () => {
    const email = `same-${Date.now()}@example.com`
    const keyFirst = emailRateLimitKey(email)
    const keySecond = emailRateLimitKey(email)
    assert.equal(keyFirst, keySecond, 'same email must produce same rate-limit key')

    // Exhaust via first key reference
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: keyFirst, limit: 3, windowMs: 60_000 })
    }
    // Attempt via second key reference (same value) — must be blocked
    assert.equal(rateLimit({ key: keySecond, limit: 3, windowMs: 60_000 }).allowed, false, 'same bucket must be shared')
  })

  it('email normalization (case + whitespace) maps to same bucket', () => {
    const ts = Date.now()
    const keyLower = emailRateLimitKey(`norm-${ts}@example.com`)
    const keyUpper = emailRateLimitKey(`NORM-${ts}@EXAMPLE.COM`)
    const keySpaced = emailRateLimitKey(`  norm-${ts}@example.com  `)
    assert.equal(keyLower, keyUpper, 'uppercase should normalize to same key')
    assert.equal(keyLower, keySpaced, 'whitespace should normalize to same key')
  })
})

describe('rateLimitByEmail', () => {
  it('allows up to the limit', () => {
    __resetEmailRateLimit()
    for (let i = 0; i < 3; i++) {
      const r = rateLimitByEmail({ email: 'a@example.com' })
      assert.equal(r.allowed, true)
    }
  })

  it('rejects the 4th attempt within the window', () => {
    __resetEmailRateLimit()
    for (let i = 0; i < 3; i++) rateLimitByEmail({ email: 'b@example.com' })
    const r = rateLimitByEmail({ email: 'b@example.com' })
    assert.equal(r.allowed, false)
    assert.equal(r.remaining, 0)
    assert.ok(r.resetMs > 0)
  })

  it('lowercases + trims email before keying (case-insensitive)', () => {
    __resetEmailRateLimit()
    rateLimitByEmail({ email: 'C@example.com' })
    rateLimitByEmail({ email: 'c@example.com' })
    rateLimitByEmail({ email: '  C@EXAMPLE.com  ' })
    const r = rateLimitByEmail({ email: 'c@example.com' })
    assert.equal(r.allowed, false, 'should treat as 4th attempt of same email')
  })

  it('different emails do not interfere', () => {
    __resetEmailRateLimit()
    for (let i = 0; i < 3; i++) rateLimitByEmail({ email: 'd@example.com' })
    const r = rateLimitByEmail({ email: 'e@example.com' })
    assert.equal(r.allowed, true)
  })
})
