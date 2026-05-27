import { describe, it, expect } from 'vitest'
import { createHash } from 'crypto'
import { rateLimit } from './rate-limit.ts'

// Reset the in-memory store between tests by exploiting the globalThis singleton.
// Cast to any to access the private store key.
function resetStore() {
  const g = globalThis as Record<string, unknown>
  delete g['__rateLimitStore']
  // Re-require is not available with strip-types; instead clear via the exported internals.
  // The store is module-level, so we can't clear it without re-import.
  // Workaround: use distinct keys per test to avoid cross-test interference.
}

describe('rateLimit', () => {
  it('allows requests up to the limit', () => {
    const key = `test-allow-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      const result = rateLimit({ key, limit: 3, windowMs: 60_000 })
      expect(result.allowed).toBe(true)
    }
  })

  it('rejects request at limit + 1', () => {
    const key = `test-reject-${Date.now()}`
    for (let i = 0; i < 3; i++) {
      rateLimit({ key, limit: 3, windowMs: 60_000 })
    }
    const result = rateLimit({ key, limit: 3, windowMs: 60_000 })
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetMs).toBeGreaterThan(0)
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
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 10))

    // Should be allowed again
    const after = rateLimit({ key, limit: 2, windowMs })
    expect(after.allowed).toBe(true)
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
    expect(blockedA.allowed).toBe(false)

    // keyB should still be free
    const allowedB = rateLimit({ key: keyB, limit: 3, windowMs: 60_000 })
    expect(allowedB.allowed).toBe(true)
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
      expect(r.allowed).toBe(true)
    }
    const blocked = rateLimit({ key, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.resetMs).toBeGreaterThan(0)
  })

  it('different emails have independent counters', () => {
    const ts = Date.now()
    const keyA = emailRateLimitKey(`alice-${ts}@example.com`)
    const keyB = emailRateLimitKey(`bob-${ts}@example.com`)

    // Exhaust alice
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: keyA, limit: 3, windowMs: 24 * 60 * 60 * 1000 })
    }
    expect(rateLimit({ key: keyA, limit: 3, windowMs: 24 * 60 * 60 * 1000 }).allowed).toBe(false)

    // bob unaffected
    expect(rateLimit({ key: keyB, limit: 3, windowMs: 24 * 60 * 60 * 1000 }).allowed).toBe(true)
  })

  it('window expiry resets the per-email counter', async () => {
    const windowMs = 50
    const key = emailRateLimitKey(`expiry-${Date.now()}@example.com`)

    for (let i = 0; i < 3; i++) {
      rateLimit({ key, limit: 3, windowMs })
    }
    expect(rateLimit({ key, limit: 3, windowMs }).allowed).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, windowMs + 10))

    expect(rateLimit({ key, limit: 3, windowMs }).allowed).toBe(true)
  })

  it('SHA-256 hashed key for same email always maps to same bucket', () => {
    const email = `same-${Date.now()}@example.com`
    const keyFirst = emailRateLimitKey(email)
    const keySecond = emailRateLimitKey(email)
    expect(keyFirst).toBe(keySecond)

    // Exhaust via first key reference
    for (let i = 0; i < 3; i++) {
      rateLimit({ key: keyFirst, limit: 3, windowMs: 60_000 })
    }
    // Attempt via second key reference (same value) — must be blocked
    expect(rateLimit({ key: keySecond, limit: 3, windowMs: 60_000 }).allowed).toBe(false)
  })

  it('email normalization (case + whitespace) maps to same bucket', () => {
    const ts = Date.now()
    const keyLower = emailRateLimitKey(`norm-${ts}@example.com`)
    const keyUpper = emailRateLimitKey(`NORM-${ts}@EXAMPLE.COM`)
    const keySpaced = emailRateLimitKey(`  norm-${ts}@example.com  `)
    expect(keyLower).toBe(keyUpper)
    expect(keyLower).toBe(keySpaced)
  })
})
