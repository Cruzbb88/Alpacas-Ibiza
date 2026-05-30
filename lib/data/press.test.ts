/**
 * Tests for lib/data/press.ts
 *
 * Covers the PressLogos component's core dependency: hasLivePress().
 * Fail-quiet contract: hasLivePress() returns false until owner provides logo files.
 *
 * Run with: node --test --experimental-strip-types lib/data/press.test.ts
 * (Not in the package.json glob — see note below.)
 *
 * NOTE: The npm test glob covers lib/*.test.ts and lib/integrations/*.test.ts and
 * lib/tenants/*.test.ts but not lib/data/*.test.ts. This file is placed alongside
 * the source for discoverability; run it directly or extend the glob in package.json.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { press, hasLivePress } from './press.ts'

describe('hasLivePress', () => {
  // The test environment never sets logoUrl on any entry — they all start as null.
  // We mutate the array in-place for positive tests, then restore it.

  it('returns false when all entries have logoUrl === null (initial / unfilled state)', () => {
    // Confirm all entries start null — as documented in OWNER_INPUT_NEEDED.md
    const allNull = press.every((p) => p.logoUrl === null)
    assert.ok(allNull, 'Expected all press entries to have logoUrl === null initially')
    assert.equal(hasLivePress(), false, 'hasLivePress() must return false when no logos are set')
  })

  it('returns true when at least one entry has a non-null logoUrl', () => {
    // Temporarily set a logoUrl on the first entry, then restore it.
    const first = press[0]
    const original = first.logoUrl
    try {
      // Cast to mutable to allow mutation for test purposes
      ;(first as { logoUrl: string | null }).logoUrl = '/images/press/test.svg'
      assert.equal(hasLivePress(), true, 'hasLivePress() must return true when at least one logoUrl is set')
    } finally {
      ;(first as { logoUrl: string | null }).logoUrl = original
    }
  })

  it('returns false again after logoUrl is restored to null', () => {
    // Verify the array is back to pristine state after previous test
    assert.equal(hasLivePress(), false, 'hasLivePress() should be false after restoring null logoUrl')
  })
})

describe('press array structure', () => {
  it('has at least one entry', () => {
    assert.ok(press.length > 0, 'press array must contain at least one entry')
  })

  it('every entry has required string fields: id and outlet', () => {
    for (const entry of press) {
      assert.equal(typeof entry.id, 'string', `entry.id must be a string, got ${typeof entry.id} for entry: ${JSON.stringify(entry)}`)
      assert.ok(entry.id.length > 0, `entry.id must not be empty for entry: ${JSON.stringify(entry)}`)
      assert.equal(typeof entry.outlet, 'string', `entry.outlet must be a string for id="${entry.id}"`)
      assert.ok(entry.outlet.length > 0, `entry.outlet must not be empty for id="${entry.id}"`)
    }
  })

  it('every entry has status of "pending" or "live"', () => {
    const validStatuses = new Set(['pending', 'live'])
    for (const entry of press) {
      assert.ok(
        validStatuses.has(entry.status),
        `entry.status must be "pending" or "live" for id="${entry.id}", got "${entry.status}"`
      )
    }
  })

  it('every entry has logoUrl that is null or a non-empty string', () => {
    for (const entry of press) {
      if (entry.logoUrl !== null) {
        assert.equal(typeof entry.logoUrl, 'string', `logoUrl must be string or null for id="${entry.id}"`)
        assert.ok(entry.logoUrl.length > 0, `logoUrl must not be empty string for id="${entry.id}"`)
      }
    }
  })

  it('every entry has articleUrl that is null or a non-empty string', () => {
    for (const entry of press) {
      if (entry.articleUrl !== null) {
        assert.equal(typeof entry.articleUrl, 'string', `articleUrl must be string or null for id="${entry.id}"`)
        assert.ok(entry.articleUrl.length > 0, `articleUrl must not be empty string for id="${entry.id}"`)
      }
    }
  })

  it('all entry ids are unique (no duplicates)', () => {
    const ids = press.map((p) => p.id)
    const uniqueIds = new Set(ids)
    assert.equal(
      uniqueIds.size,
      ids.length,
      `Duplicate ids found in press array: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')}`
    )
  })
})
