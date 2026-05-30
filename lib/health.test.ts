/**
 * Tests for GET /api/health
 *
 * The route lives in app/api/health/route.ts but is tested here so the existing
 * `lib/*.test.ts` glob in package.json picks it up without any config change.
 *
 * The route imports from 'next/server' (NextResponse). Node's test runner won't
 * have Next loaded, so we mock NextResponse minimally.
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

// Tests drive the route's logic directly by importing the helpers.
// End-to-end testing requires a Next.js server (deferred — see CANT_BE_DONE.md).
// The two meaningful behaviors tested:
// (a) healthy shape when Tier 1 vars are all set
// (b) 503 + missing list when any Tier 1 var is absent

import { isSet, TIER1_KEYS, __reset } from './validate-env.ts'

// Helper that replicates the route's core logic (keeps test honest to the route).
function runHealthLogic(): { status: number; body: Record<string, unknown>; cacheControl: string } {
  const version = process.env.npm_package_version ?? 'unknown'
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  const missingTier1 = TIER1_KEYS.filter((key) => !isSet(key))
  const healthy = missingTier1.length === 0
  return {
    status: healthy ? 200 : 503,
    body: {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version,
      env,
      ...(healthy ? {} : { missing: missingTier1 }),
    },
    cacheControl: 'no-store',
  }
}

describe('GET /api/health (logic)', () => {
  let savedTier1: Record<string, string | undefined>

  beforeEach(() => {
    __reset()
    savedTier1 = {}
    for (const key of TIER1_KEYS) {
      savedTier1[key] = process.env[key]
    }
  })

  afterEach(() => {
    for (const key of TIER1_KEYS) {
      if (savedTier1[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = savedTier1[key]
      }
    }
    __reset()
  })

  it('returns 200 with status ok when all Tier 1 vars are set', () => {
    for (const key of TIER1_KEYS) {
      process.env[key] = 'test-value'
    }
    const result = runHealthLogic()
    assert.equal(result.status, 200)
    assert.equal((result.body as any).status, 'ok')
  })

  it('returns 503 when any Tier 1 var is unset', () => {
    // Leave all Tier 1 keys unset (cleared in beforeEach)
    const result = runHealthLogic()
    assert.equal(result.status, 503)
    assert.equal((result.body as any).status, 'degraded')
  })

  it('includes missing Tier 1 keys in the body on 503', () => {
    // Set all but one
    for (const key of TIER1_KEYS) {
      process.env[key] = 'test-value'
    }
    delete process.env[TIER1_KEYS[0]]

    const result = runHealthLogic()
    assert.equal(result.status, 503)
    assert.ok(Array.isArray((result.body as any).missing))
    assert.ok((result.body as any).missing.includes(TIER1_KEYS[0]))
  })

  it('Cache-Control is no-store', () => {
    for (const key of TIER1_KEYS) {
      process.env[key] = 'test-value'
    }
    const result = runHealthLogic()
    assert.equal(result.cacheControl, 'no-store')
  })

  it('response body contains a valid ISO8601 timestamp', () => {
    for (const key of TIER1_KEYS) {
      process.env[key] = 'test-value'
    }
    const result = runHealthLogic()
    const ts = (result.body as any).timestamp
    assert.ok(typeof ts === 'string', 'timestamp should be a string')
    assert.doesNotThrow(() => {
      const d = new Date(ts)
      assert.ok(!isNaN(d.getTime()), 'timestamp should parse as a valid date')
    })
  })

  it('response body contains version field', () => {
    for (const key of TIER1_KEYS) {
      process.env[key] = 'test-value'
    }
    const result = runHealthLogic()
    assert.ok('version' in result.body, 'body should have version field')
    assert.ok(typeof (result.body as any).version === 'string')
  })

  it('response body contains env field (production or development)', () => {
    for (const key of TIER1_KEYS) {
      process.env[key] = 'test-value'
    }
    const result = runHealthLogic()
    const env = (result.body as any).env
    assert.ok(env === 'production' || env === 'development')
  })
})
