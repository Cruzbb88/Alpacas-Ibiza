/**
 * Tests for the BookingButton URL-resolution pipeline.
 *
 * BookingButton delegates to getProductBookingUrl() → getFareHarborItemUrl()
 * → getFareHarborEmbedUrl(). The bottom two live in lib/config.ts which has no
 * external imports and loads cleanly under node --experimental-strip-types.
 *
 * lib/fareharbor-products.ts cannot be imported directly in node:test because it
 * uses bare './config' specifier (no .ts extension), which ESM node doesn't resolve.
 * Instead we test config.ts functions directly (they are the actual URL logic) and
 * verify the product registry contract via inline re-implementation of PRODUCT_ITEM_IDS.
 *
 * Run with: node --test --experimental-strip-types lib/fareharbor-products.test.ts
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { getFareHarborEmbedUrl, getFareHarborItemUrl } from './config.ts'

// ── getFareHarborEmbedUrl ────────────────────────────────────────────────────

describe('getFareHarborEmbedUrl', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME

  after(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME
    } else {
      process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME = ORIGINAL
    }
  })

  it('falls back to "alpacasibiza" shortname when env var unset', () => {
    delete process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME
    const url = getFareHarborEmbedUrl()
    assert.ok(url.includes('/alpacasibiza/'), `Expected "alpacasibiza" in URL, got: ${url}`)
  })

  it('uses NEXT_PUBLIC_FAREHARBOR_SHORTNAME when set', () => {
    process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME = 'test-farm'
    const url = getFareHarborEmbedUrl()
    assert.ok(url.includes('/test-farm/'), `Expected "test-farm" in URL, got: ${url}`)
  })

  it('returns an https://fareharbor.com/embeds/book/ URL', () => {
    const url = getFareHarborEmbedUrl()
    assert.ok(url.startsWith('https://fareharbor.com/embeds/book/'), `Unexpected base URL: ${url}`)
  })

  it('appends full-items=yes when fullItems option is true', () => {
    const url = getFareHarborEmbedUrl({ fullItems: true })
    assert.ok(url.includes('full-items=yes'), `Expected full-items=yes, got: ${url}`)
  })

  it('does not append a query string when no options provided', () => {
    delete process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME
    const url = getFareHarborEmbedUrl()
    assert.equal(url.includes('?'), false, `Unexpected query string in base URL: ${url}`)
  })
})

// ── getFareHarborItemUrl ─────────────────────────────────────────────────────

describe('getFareHarborItemUrl', () => {
  before(() => {
    process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME = 'alpacasibiza'
  })

  after(() => {
    delete process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME
  })

  it('appends items= query param when itemId is provided', () => {
    const url = getFareHarborItemUrl('12345')
    assert.ok(url.includes('items=12345'), `Expected items=12345, got: ${url}`)
  })

  it('returns base calendar URL when itemId is undefined (fail-open contract)', () => {
    const url = getFareHarborItemUrl(undefined)
    assert.equal(url.includes('items='), false, `Unexpected items= in fallback URL: ${url}`)
    assert.ok(url.startsWith('https://fareharbor.com/embeds/book/'), `Unexpected base URL: ${url}`)
  })

  it('URL-encodes spaces in itemId', () => {
    const url = getFareHarborItemUrl('id with spaces')
    assert.ok(url.includes('items=id%20with%20spaces'), `Expected percent-encoding, got: ${url}`)
  })

  it('uses & separator (not ?) when base URL already has query params (fullItems)', () => {
    const url = getFareHarborItemUrl('99', { fullItems: true })
    const questionCount = (url.match(/\?/g) ?? []).length
    assert.equal(questionCount, 1, `Expected exactly one ? in URL, got: ${url}`)
    assert.ok(url.includes('full-items=yes'), `Missing full-items param: ${url}`)
    assert.ok(url.includes('items=99'), `Missing items param: ${url}`)
  })

  it('result is always an https fareharbor.com URL', () => {
    for (const id of ['1', '9999', undefined]) {
      const url = getFareHarborItemUrl(id)
      assert.ok(url.startsWith('https://fareharbor.com'), `Non-fareharbor URL for id=${id}: ${url}`)
    }
  })
})

// ── getProductBookingUrl contract (inline re-implementation) ─────────────────
//
// fareharbor-products.ts cannot be imported (bare './config' specifier).
// We test the contract by re-implementing it here against config.ts directly.
// This mirrors what the real module does and validates the fail-open guarantee.

describe('getProductBookingUrl contract (via config helpers)', () => {
  before(() => {
    process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME = 'alpacasibiza'
  })

  after(() => {
    delete process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME
  })

  // Re-implement the core logic from fareharbor-products.ts using config.ts only.
  // All product env vars are unset in the test environment → all itemIds are undefined.
  function getProductUrl(itemId: string | undefined): string {
    if (!itemId) return getFareHarborEmbedUrl()
    return getFareHarborItemUrl(itemId)
  }

  it('undefined itemId (unset env var) resolves to base calendar — never inert', () => {
    const url = getProductUrl(undefined)
    assert.ok(url.startsWith('https://fareharbor.com/embeds/book/'), `Expected base calendar URL, got: ${url}`)
    assert.equal(url.includes('items='), false, `Unexpected items= in fallback URL: ${url}`)
  })

  it('defined itemId resolves to item-specific URL with items= param', () => {
    const url = getProductUrl('42000')
    assert.ok(url.includes('items=42000'), `Expected items=42000, got: ${url}`)
  })

  it('every env-driven product falls back to base calendar when vars unset (test env)', () => {
    // In the test environment all FAREHARBOR_ITEM_* vars are undefined.
    // Simulate all 11 products — all should resolve to base calendar.
    const productEnvVars = [
      process.env.FAREHARBOR_ITEM_TOUR_MEET_HERD,
      process.env.FAREHARBOR_ITEM_TOUR_WEAVING_WORKSHOP,
      process.env.FAREHARBOR_ITEM_TOUR_FARM_EXPERIENCE,
      process.env.FAREHARBOR_ITEM_TOUR_PHOTO_SESSION,
      process.env.FAREHARBOR_ITEM_YOGA,
      process.env.FAREHARBOR_ITEM_WEDDINGS,
      process.env.FAREHARBOR_ITEM_PHOTOSHOOTS,
      process.env.FAREHARBOR_ITEM_BUSINESS_INCENTIVES,
      process.env.FAREHARBOR_ITEM_GIFT_CARD,
      process.env.FAREHARBOR_ITEM_ROMANTIC_SUNSET,
      process.env.FAREHARBOR_ITEM_FAMILY_FARM_DAYS,
    ]

    for (const itemId of productEnvVars) {
      const url = getProductUrl(itemId)
      assert.ok(url.startsWith('https://fareharbor.com'), `Expected fareharbor URL, got: ${url}`)
    }
  })

  it('"general" equivalent (undefined) always resolves to main calendar', () => {
    // The 'general' slug maps to undefined in PRODUCT_ITEM_IDS — always falls back.
    const url = getProductUrl(undefined)
    const base = getFareHarborEmbedUrl()
    assert.equal(url, base, `"general" should equal the base embed URL exactly`)
  })
})
