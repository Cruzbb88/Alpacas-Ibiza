import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LEGAL_PAGE_META, findLegalMeta } from './data/legal-meta.ts'

describe('LEGAL_PAGE_META', () => {
  it('contains all 3 required slugs', () => {
    const slugs = LEGAL_PAGE_META.map(m => m.slug)
    assert.ok(slugs.includes('privacy'), 'missing privacy')
    assert.ok(slugs.includes('terms'), 'missing terms')
    assert.ok(slugs.includes('cookies'), 'missing cookies')
  })

  it('all updatedAt values are valid ISO 8601 dates', () => {
    for (const meta of LEGAL_PAGE_META) {
      const ts = Date.parse(meta.updatedAt)
      assert.ok(!isNaN(ts), `updatedAt "${meta.updatedAt}" for slug "${meta.slug}" is not a valid date`)
    }
  })

  it('all version fields match semver pattern', () => {
    const semver = /^\d+\.\d+\.\d+$/
    for (const meta of LEGAL_PAGE_META) {
      assert.match(meta.version, semver, `version "${meta.version}" for slug "${meta.slug}" is not semver`)
    }
  })
})

describe('findLegalMeta', () => {
  it('returns the privacy entry', () => {
    const result = findLegalMeta('privacy')
    assert.ok(result !== null)
    assert.equal(result.slug, 'privacy')
  })

  it('returns the terms entry', () => {
    const result = findLegalMeta('terms')
    assert.ok(result !== null)
    assert.equal(result.slug, 'terms')
  })

  it('returns the cookies entry', () => {
    const result = findLegalMeta('cookies')
    assert.ok(result !== null)
    assert.equal(result.slug, 'cookies')
  })

  // TypeScript prevents non-slug strings at compile time, but test the null path
  // via a cast to verify the runtime guard holds.
  it('returns null for an unknown slug', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = findLegalMeta('nonexistent' as any)
    assert.equal(result, null)
  })
})
