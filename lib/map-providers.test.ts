/**
 * Unit tests for lib/integrations/map.ts
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 * No mocking framework needed — tests manipulate process.env directly and restore
 * the original value after each case.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { makeMapProvider } from './integrations/map.ts'

// ── osm-iframe adapter ────────────────────────────────────────────────────────

describe('osm-iframe adapter', () => {
  const provider = makeMapProvider('osm-iframe')

  it('kind is osm-iframe', () => {
    assert.equal(provider.kind, 'osm-iframe')
  })

  describe('embedUrl', () => {
    it('returns a URL containing openstreetmap.org/export/embed.html', () => {
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(
        url.includes('openstreetmap.org/export/embed.html'),
        `Expected openstreetmap.org/export/embed.html in: ${url}`,
      )
    })

    it('encodes the latitude in the URL', () => {
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(url.includes('38.9861'), `Expected lat 38.9861 in: ${url}`)
    })

    it('encodes the longitude in the URL', () => {
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(url.includes('1.5228'), `Expected lng 1.5228 in: ${url}`)
    })

    it('includes marker param', () => {
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(url.includes('marker'), `Expected marker param in: ${url}`)
    })

    it('accepts a custom zoom level', () => {
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228, zoom: 16 })
      assert.ok(url.includes('zoom=16'), `Expected zoom=16 in: ${url}`)
    })
  })

  describe('linkUrl', () => {
    it('returns an OpenStreetMap URL', () => {
      const url = provider.linkUrl({ lat: 38.9861, lng: 1.5228, query: 'foo' })
      assert.ok(
        url.includes('openstreetmap.org'),
        `Expected openstreetmap.org in: ${url}`,
      )
    })

    it('URL-encodes a query with spaces', () => {
      const url = provider.linkUrl({
        lat: 38.9861,
        lng: 1.5228,
        query: 'Alpacas Ibiza Santa Eulària',
      })
      assert.ok(
        url.includes('Alpacas%20Ibiza') || url.includes('Alpacas+Ibiza'),
        `Expected URL-encoded query in: ${url}`,
      )
    })

    it('URL-encodes a query with special characters', () => {
      const url = provider.linkUrl({
        lat: 38.9861,
        lng: 1.5228,
        query: 'foo & bar',
      })
      // Ampersand must be encoded
      assert.ok(
        !url.includes(' & '),
        `Raw ampersand should not appear in: ${url}`,
      )
    })

    it('URL-encodes a simple query string', () => {
      const url = provider.linkUrl({ lat: 38.9861, lng: 1.5228, query: 'foo' })
      assert.ok(url.includes('foo'), `Expected query in: ${url}`)
    })
  })
})

// ── google-embed adapter ─────────────────────────────────────────────────────

describe('google-embed adapter', () => {
  describe('embedUrl falls back to OSM when key is unset', () => {
    let savedKey: string | undefined

    before(() => {
      savedKey = process.env.GOOGLE_MAPS_EMBED_API_KEY
      delete process.env.GOOGLE_MAPS_EMBED_API_KEY
    })

    after(() => {
      if (savedKey !== undefined) {
        process.env.GOOGLE_MAPS_EMBED_API_KEY = savedKey
      } else {
        delete process.env.GOOGLE_MAPS_EMBED_API_KEY
      }
    })

    it('returns an openstreetmap.org URL when API key is absent', () => {
      const provider = makeMapProvider('google-embed')
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(
        url.includes('openstreetmap.org'),
        `Expected openstreetmap.org fallback in: ${url}`,
      )
    })
  })

  describe('embedUrl uses Google when key is set', () => {
    let savedKey: string | undefined

    before(() => {
      savedKey = process.env.GOOGLE_MAPS_EMBED_API_KEY
      process.env.GOOGLE_MAPS_EMBED_API_KEY = 'test-api-key-123'
    })

    after(() => {
      if (savedKey !== undefined) {
        process.env.GOOGLE_MAPS_EMBED_API_KEY = savedKey
      } else {
        delete process.env.GOOGLE_MAPS_EMBED_API_KEY
      }
    })

    it('returns a google.com URL when API key is present', () => {
      const provider = makeMapProvider('google-embed')
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(
        url.includes('google.com'),
        `Expected google.com URL when key is set: ${url}`,
      )
    })

    it('includes the API key in the URL', () => {
      const provider = makeMapProvider('google-embed')
      const url = provider.embedUrl({ lat: 38.9861, lng: 1.5228 })
      assert.ok(
        url.includes('test-api-key-123'),
        `Expected API key in URL: ${url}`,
      )
    })
  })

  describe('linkUrl', () => {
    it('returns a google.com/maps URL', () => {
      const provider = makeMapProvider('google-embed')
      const url = provider.linkUrl({ lat: 38.9861, lng: 1.5228, query: 'foo' })
      assert.ok(
        url.includes('google.com/maps'),
        `Expected google.com/maps in: ${url}`,
      )
    })
  })
})

// ── makeMapProvider defaults ──────────────────────────────────────────────────

describe('makeMapProvider default', () => {
  it('defaults to osm-iframe when no kind is passed', () => {
    const provider = makeMapProvider()
    assert.equal(provider.kind, 'osm-iframe')
  })
})
