/**
 * Tests for alpaca-gallery-store.
 *
 * Covers the merge helper + getMergedAlpacaGallery's empty-state contract.
 * The store itself is exercised through its public interface so a future
 * DB-backed swap is covered by the same tests.
 */

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  alpacaGalleryStore,
  getMergedAlpacaGallery,
  mergeStaticAndUploads,
  type AlpacaUpload,
} from './alpaca-gallery-store.ts'

const UNKNOWN_SLUG = '__test_unknown_slug__'

async function resetSlug(slug: string): Promise<void> {
  const existing = await alpacaGalleryStore.list(slug)
  for (const u of existing) {
    await alpacaGalleryStore.remove(slug, u.url)
  }
}

describe('mergeStaticAndUploads', () => {
  it('returns empty array when both inputs empty', () => {
    assert.deepEqual(mergeStaticAndUploads([], []), [])
  })

  it('returns empty array when static is null/undefined and uploads empty', () => {
    assert.deepEqual(mergeStaticAndUploads(null, []), [])
    assert.deepEqual(mergeStaticAndUploads(undefined, []), [])
  })

  it('lists static gallery photos before uploads', () => {
    const upload: AlpacaUpload = {
      url: 'https://blob/2.webp',
      alt: 'upload',
      uploadedAt: '2026-05-29T00:00:00Z',
    }
    const out = mergeStaticAndUploads(
      [{ src: '/images/static/1.webp', alt: 'static' }],
      [upload],
    )
    assert.equal(out.length, 2)
    assert.equal(out[0].src, '/images/static/1.webp')
    assert.equal(out[1].src, 'https://blob/2.webp')
  })

  it('flattens upload shape to {src, alt}', () => {
    const out = mergeStaticAndUploads(null, [
      { url: 'https://blob/x', alt: 'x-alt', uploadedAt: '2026-01-01' },
    ])
    assert.deepEqual(out, [{ src: 'https://blob/x', alt: 'x-alt' }])
  })
})

describe('getMergedAlpacaGallery', () => {
  beforeEach(async () => {
    await resetSlug(UNKNOWN_SLUG)
  })

  it('returns empty array when no uploads exist for the slug', async () => {
    // Slug is intentionally outside the roster so the static side is also empty.
    // Tenant chain is unavailable under node --test; the helper catches and
    // falls through to the store, which has nothing for this slug → [].
    const result = await getMergedAlpacaGallery(UNKNOWN_SLUG)
    assert.deepEqual(result, [])
  })

  it('reflects an upload added to the store', async () => {
    await alpacaGalleryStore.add(UNKNOWN_SLUG, {
      url: 'https://blob/added',
      alt: 'added-alt',
      uploadedAt: new Date().toISOString(),
    })
    const result = await getMergedAlpacaGallery(UNKNOWN_SLUG)
    assert.equal(result.length, 1)
    assert.equal(result[0].src, 'https://blob/added')
    assert.equal(result[0].alt, 'added-alt')
  })
})

describe('alpacaGalleryStore (MemoryStore)', () => {
  beforeEach(async () => {
    await resetSlug(UNKNOWN_SLUG)
  })

  it('list() returns empty array for an unknown slug', async () => {
    const out = await alpacaGalleryStore.list(UNKNOWN_SLUG)
    assert.deepEqual(out, [])
  })

  it('add() then list() returns the upload', async () => {
    const upload: AlpacaUpload = {
      url: 'https://blob/a',
      alt: 'a',
      uploadedAt: '2026-05-29T00:00:00Z',
    }
    await alpacaGalleryStore.add(UNKNOWN_SLUG, upload)
    const out = await alpacaGalleryStore.list(UNKNOWN_SLUG)
    assert.equal(out.length, 1)
    assert.equal(out[0].url, 'https://blob/a')
  })

  it('add() de-dupes on URL', async () => {
    const upload: AlpacaUpload = {
      url: 'https://blob/dup',
      alt: 'dup',
      uploadedAt: '2026-05-29T00:00:00Z',
    }
    await alpacaGalleryStore.add(UNKNOWN_SLUG, upload)
    await alpacaGalleryStore.add(UNKNOWN_SLUG, upload)
    const out = await alpacaGalleryStore.list(UNKNOWN_SLUG)
    assert.equal(out.length, 1)
  })

  it('remove() returns true when the URL existed, false otherwise', async () => {
    const upload: AlpacaUpload = {
      url: 'https://blob/rm',
      alt: 'rm',
      uploadedAt: '2026-05-29T00:00:00Z',
    }
    await alpacaGalleryStore.add(UNKNOWN_SLUG, upload)
    assert.equal(await alpacaGalleryStore.remove(UNKNOWN_SLUG, 'https://blob/rm'), true)
    assert.equal(await alpacaGalleryStore.remove(UNKNOWN_SLUG, 'https://blob/rm'), false)
  })
})
