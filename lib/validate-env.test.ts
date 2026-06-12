import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { isSet, validateEnv, __reset, TIER1_KEYS } from './validate-env.ts'

// isSet reads process.env[key], so we manipulate the env directly.
// Each test uses a unique key name to avoid cross-contamination.

describe('isSet', () => {
  it('returns false for a key that is not set (undefined)', () => {
    const key = '__TEST_UNSET_KEY_UNDEFINED__'
    delete process.env[key]
    assert.equal(isSet(key), false)
  })

  it('returns false for an empty string value', () => {
    const key = '__TEST_EMPTY_STRING__'
    process.env[key] = ''
    try {
      assert.equal(isSet(key), false)
    } finally {
      delete process.env[key]
    }
  })

  it('returns false for TODO_PASTE_ITEM_ID sentinel', () => {
    const key = '__TEST_TODO_PASTE_ITEM_ID__'
    process.env[key] = 'TODO_PASTE_ITEM_ID'
    try {
      assert.equal(isSet(key), false)
    } finally {
      delete process.env[key]
    }
  })

  it('returns false for TODO_PASTE_FROM_FAREHARBOR sentinel', () => {
    const key = '__TEST_TODO_FAREHARBOR__'
    process.env[key] = 'TODO_PASTE_FROM_FAREHARBOR'
    try {
      assert.equal(isSet(key), false)
    } finally {
      delete process.env[key]
    }
  })

  it('returns false for any TODO_ prefixed value', () => {
    const key = '__TEST_TODO_ANY__'
    process.env[key] = 'TODO_SOMETHING_ELSE_ENTIRELY'
    try {
      assert.equal(isSet(key), false)
    } finally {
      delete process.env[key]
    }
  })

  it('returns false for __OWNER_INPUT_REQUIRED__ sentinel', () => {
    const key = '__TEST_OWNER_INPUT__'
    process.env[key] = '__OWNER_INPUT_REQUIRED__'
    try {
      assert.equal(isSet(key), false)
    } finally {
      delete process.env[key]
    }
  })

  it('returns true for a real-looking API key', () => {
    const key = '__TEST_REAL_KEY__'
    process.env[key] = 're_abc123XYZ'
    try {
      assert.equal(isSet(key), true)
    } finally {
      delete process.env[key]
    }
  })

  it('returns true for a real-looking secret string', () => {
    const key = '__TEST_REAL_SECRET__'
    process.env[key] = 'my-super-secret-value-xyz'
    try {
      assert.equal(isSet(key), true)
    } finally {
      delete process.env[key]
    }
  })

  it('returns true for a UUID-style value', () => {
    const key = '__TEST_UUID__'
    process.env[key] = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    try {
      assert.equal(isSet(key), true)
    } finally {
      delete process.env[key]
    }
  })

  it('does NOT treat "todo_lower" as a sentinel (case-sensitive TODO_ check)', () => {
    // The code uses startsWith('TODO_') which is case-sensitive
    // 'todo_paste' does NOT start with 'TODO_' → isSet should return true
    const key = '__TEST_TODO_LOWER__'
    process.env[key] = 'todo_paste_something'
    try {
      assert.equal(isSet(key), true)
    } finally {
      delete process.env[key]
    }
  })
})

// ── validateEnv() tests ──────────────────────────────────────────────────────
// The _ran flag is module-level; __reset() clears it between tests.
// Tier 1 keys are pinned from TIER1_KEYS so if the list changes, tests update.

describe('validateEnv', () => {
  // Snapshot env values before each test; restore after.
  let savedEnv: Record<string, string | undefined>
  let savedNodeEnv: string | undefined

  beforeEach(() => {
    __reset()
    savedEnv = {}
    savedNodeEnv = process.env.NODE_ENV
    // Save and clear all Tier 1 keys so each test starts clean
    for (const key of TIER1_KEYS) {
      savedEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    // Restore Tier 1 keys
    for (const key of TIER1_KEYS) {
      if (savedEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = savedEnv[key]
      }
    }
    // Restore NODE_ENV (it's read-only in some runtimes, best-effort)
    try {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv
    } catch {
      // ignore
    }
    __reset()
  })

  it('is idempotent — second call logs nothing', (t) => {
    // Set all Tier 1 so only Tier 2 warnings fire; we just verify the count
    for (const key of TIER1_KEYS) {
      process.env[key] = 'set-value'
    }
    // Also set enough Tier 2 to avoid those warns
    process.env.TURNSTILE_SECRET_KEY = 'set'
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'set'
    process.env.FAREHARBOR_APP_KEY = 'set'
    process.env.FAREHARBOR_USER_KEY = 'set'
    process.env.FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP = 'set'
    process.env.PAYMENT_VENDOR = 'set'
    process.env.GA4_PROPERTY_ID = 'set'
    process.env.GA4_CLIENT_EMAIL = 'set'
    process.env.GA4_PRIVATE_KEY = 'set'
    process.env.GOOGLE_PLACES_API_KEY = 'set'
    process.env.GOOGLE_PLACES_PLACE_ID = 'set'

    const warnMock = t.mock.method(console, 'warn', () => {})
    const errorMock = t.mock.method(console, 'error', () => {})

    validateEnv() // first call — _ran becomes true
    const countAfterFirst = warnMock.mock.calls.length + errorMock.mock.calls.length

    validateEnv() // second call — _ran guard exits immediately
    const countAfterSecond = warnMock.mock.calls.length + errorMock.mock.calls.length

    assert.equal(countAfterSecond, countAfterFirst, 'second call must not add any log calls')

    // Cleanup extra env keys
    for (const k of ['TURNSTILE_SECRET_KEY','NEXT_PUBLIC_TURNSTILE_SITE_KEY','FAREHARBOR_APP_KEY',
      'FAREHARBOR_USER_KEY','FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP','PAYMENT_VENDOR',
      'GA4_PROPERTY_ID','GA4_CLIENT_EMAIL',
      'GA4_PRIVATE_KEY','GOOGLE_PLACES_API_KEY','GOOGLE_PLACES_PLACE_ID']) {
      delete process.env[k]
    }
    for (const key of TIER1_KEYS) delete process.env[key]
  })

  it('Tier 1 missing in production → console.error (not console.warn)', (t) => {
    try { (process.env as Record<string, string>).NODE_ENV = 'production' } catch { /* read-only in some environments */ }

    const warnMock = t.mock.method(console, 'warn', () => {})
    const errorMock = t.mock.method(console, 'error', () => {})

    validateEnv()

    // In production, missing Tier 1 keys must use console.error
    const errorCalls = errorMock.mock.calls.map((c) => String(c.arguments[0]))
    const warnCalls = warnMock.mock.calls.map((c) => String(c.arguments[0]))

    const tier1ErrorCalls = errorCalls.filter((m) => m.includes('[validateEnv] Tier 1'))
    const tier1WarnCalls = warnCalls.filter((m) => m.includes('[validateEnv] Tier 1'))

    // Only relevant when NODE_ENV actually took
    if (process.env.NODE_ENV === 'production') {
      assert.ok(tier1ErrorCalls.length > 0, 'production should log Tier 1 via console.error')
      assert.equal(tier1WarnCalls.length, 0, 'production must not use console.warn for Tier 1')
    }
  })

  it('Tier 1 missing in development → console.warn (not console.error)', (t) => {
    try { (process.env as Record<string, string>).NODE_ENV = 'development' } catch { /* read-only */ }

    const warnMock = t.mock.method(console, 'warn', () => {})
    const errorMock = t.mock.method(console, 'error', () => {})

    validateEnv()

    const errorCalls = errorMock.mock.calls.map((c) => String(c.arguments[0]))
    const warnCalls = warnMock.mock.calls.map((c) => String(c.arguments[0]))

    const tier1ErrorCalls = errorCalls.filter((m) => m.includes('[validateEnv] Tier 1'))
    const tier1WarnCalls = warnCalls.filter((m) => m.includes('[validateEnv] Tier 1'))

    if (process.env.NODE_ENV === 'development') {
      assert.ok(tier1WarnCalls.length > 0, 'development should log Tier 1 via console.warn')
      assert.equal(tier1ErrorCalls.length, 0, 'development must not use console.error for Tier 1')
    }
  })

  it('Tier 2 missing → always console.warn regardless of NODE_ENV', (t) => {
    // Set all Tier 1 so only Tier 2 warnings fire
    for (const key of TIER1_KEYS) {
      process.env[key] = 'set-value'
    }
    // Leave Tier 2 keys unset

    const warnMock = t.mock.method(console, 'warn', () => {})
    const errorMock = t.mock.method(console, 'error', () => {})

    validateEnv()

    const warnCalls = warnMock.mock.calls.map((c) => String(c.arguments[0]))
    const errorCalls = errorMock.mock.calls.map((c) => String(c.arguments[0]))

    const tier2Warns = warnCalls.filter((m) => m.includes('[validateEnv] Tier 2'))
    const tier2Errors = errorCalls.filter((m) => m.includes('[validateEnv] Tier 2'))

    assert.ok(tier2Warns.length > 0, 'Tier 2 missing should produce at least one console.warn')
    assert.equal(tier2Errors.length, 0, 'Tier 2 should never use console.error')

    for (const key of TIER1_KEYS) delete process.env[key]
  })

  it('browser guard: returns without logging when typeof window !== undefined', (t) => {
    // Simulate browser environment
    ;(globalThis as any).window = {}

    const warnMock = t.mock.method(console, 'warn', () => {})
    const errorMock = t.mock.method(console, 'error', () => {})

    try {
      validateEnv()
    } finally {
      delete (globalThis as any).window
    }

    assert.equal(warnMock.mock.calls.length, 0, 'no console.warn in browser environment')
    assert.equal(errorMock.mock.calls.length, 0, 'no console.error in browser environment')
  })
})
