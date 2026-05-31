/**
 * Content provider tests.
 *
 * Tests the static-typescript content adapter + both tenant content modules.
 * All tests run without Next.js — pure TypeScript, no DOM, no network.
 *
 * Test runner: node --experimental-strip-types --test (package.json "test" script).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Import tenant content modules directly (no adapter needed for shape assertions).
import { alpacasibizaContent } from './tenants/alpacasibiza-content.ts'
import { exampleContent } from './tenants/example-content.ts'

// Import adapter to verify the provider contract.
import { staticTypescriptContentProvider } from './integrations/content-static-typescript.ts'

// ── alpacasibiza-content ──────────────────────────────────────────────────────

describe('alpacasibiza-content module', () => {
  it('lists exactly 14 animals', () => {
    assert.equal(alpacasibizaContent.animals.length, 14)
  })

  it('every animal has a non-empty name', () => {
    for (const animal of alpacasibizaContent.animals) {
      assert.ok(
        typeof animal.name === 'string' && animal.name.length > 0,
        `animal id "${animal.id}" has empty name`,
      )
    }
  })

  it('every animal has kind === "animal"', () => {
    for (const animal of alpacasibizaContent.animals) {
      assert.equal(animal.kind, 'animal')
    }
  })

  it('every animal has bio === null (UNMAPPED sentinel)', () => {
    for (const animal of alpacasibizaContent.animals) {
      assert.equal(
        animal.bio,
        null,
        `animal "${animal.id}" has non-null bio — do not invent values`,
      )
    }
  })

  it('every animal image is null OR a verified live-site URL (no invented values)', () => {
    // Images, when set, MUST point at a real CDN URL sourced from the live
    // alpacasibiza.com site (see handoff/LIVE_SITE_CONTENT_INVENTORY.md
    // scraped 2026-05-31). The rule that matters is "don't invent" — not
    // "must be null forever". Allow null OR Squarespace CDN URLs.
    for (const animal of alpacasibizaContent.animals) {
      if (animal.image === null) continue
      assert.match(
        animal.image,
        /^https:\/\/images\.squarespace-cdn\.com\/content\/v1\//,
        `animal "${animal.id}" image must be null or a real Squarespace CDN URL — got: ${animal.image}`,
      )
    }
  })

  it('has exactly 4 experiences (Meet the Herd, Weaving Workshop, Farm Experience, Photo Session)', () => {
    assert.equal(alpacasibizaContent.experiences.length, 4)
    const ids = alpacasibizaContent.experiences.map((e) => e.id)
    assert.ok(ids.includes('meet-the-herd'))
    assert.ok(ids.includes('weaving-workshop'))
    assert.ok(ids.includes('farm-experience'))
    assert.ok(ids.includes('photo-session'))
  })

  it('every experience has priceEur === null (UNMAPPED)', () => {
    for (const exp of alpacasibizaContent.experiences) {
      assert.equal(
        exp.priceEur,
        null,
        `experience "${exp.id}" has non-null priceEur — do not invent prices`,
      )
    }
  })

  it('every experience has durationMin === null (UNMAPPED)', () => {
    for (const exp of alpacasibizaContent.experiences) {
      assert.equal(exp.durationMin, null)
    }
  })

  it('every experience has capacity === null (UNMAPPED)', () => {
    for (const exp of alpacasibizaContent.experiences) {
      assert.equal(exp.capacity, null)
    }
  })

  it('products list is empty (shop routes through FareHarbor)', () => {
    assert.equal(alpacasibizaContent.products.length, 0)
  })

  it('team list is empty (owner photos UNMAPPED)', () => {
    assert.equal(alpacasibizaContent.team.length, 0)
  })

  it('reviews list is empty (gated on GOOGLE_PLACES_API_KEY)', () => {
    assert.equal(alpacasibizaContent.reviews.length, 0)
  })

  it('reviews is an array, not undefined or null', () => {
    assert.ok(Array.isArray(alpacasibizaContent.reviews))
  })
})

// ── example-content ───────────────────────────────────────────────────────────

describe('example-content module (Vineyard Acres)', () => {
  it('lists exactly 3 grape varieties as animals', () => {
    assert.equal(exampleContent.animals.length, 3)
  })

  it('every grape variety has kind === "animal"', () => {
    for (const animal of exampleContent.animals) {
      assert.equal(animal.kind, 'animal')
    }
  })

  it('grape variety names include Tempranillo, Garnacha, Verdejo', () => {
    const names = exampleContent.animals.map((a) => a.name)
    assert.ok(names.includes('Tempranillo'))
    assert.ok(names.includes('Garnacha'))
    assert.ok(names.includes('Verdejo'))
  })

  it('lists exactly 3 products (wine bottles)', () => {
    assert.equal(exampleContent.products.length, 3)
  })

  it('every product has kind === "product"', () => {
    for (const product of exampleContent.products) {
      assert.equal(product.kind, 'product')
    }
  })

  it('every product has priceEur === null (UNMAPPED for demo tenant)', () => {
    for (const product of exampleContent.products) {
      assert.equal(
        product.priceEur,
        null,
        `product "${product.id}" has non-null priceEur — do not invent prices`,
      )
    }
  })

  it('experiences list is empty for demo tenant', () => {
    assert.equal(exampleContent.experiences.length, 0)
  })

  it('no alpaca-specific content (proves abstraction)', () => {
    const allNames = [
      ...exampleContent.animals.map((a) => a.name.toLowerCase()),
      ...exampleContent.products.map((p) => p.name.toLowerCase()),
    ]
    for (const name of allNames) {
      assert.ok(
        !name.includes('alpaca'),
        `Vineyard Acres content contains "alpaca": "${name}"`,
      )
    }
  })
})

// ── staticTypescriptContentProvider adapter ───────────────────────────────────

describe('staticTypescriptContentProvider adapter', () => {
  it('kind is "static-typescript"', () => {
    const provider = staticTypescriptContentProvider(alpacasibizaContent)
    assert.equal(provider.kind, 'static-typescript')
  })

  it('listAnimals() returns the 14 alpacas', () => {
    const provider = staticTypescriptContentProvider(alpacasibizaContent)
    assert.equal(provider.listAnimals().length, 14)
  })

  it('listReviews() returns [] (not undefined) for alpacasibiza', () => {
    const provider = staticTypescriptContentProvider(alpacasibizaContent)
    const reviews = provider.listReviews()
    assert.ok(Array.isArray(reviews))
    assert.equal(reviews.length, 0)
  })

  it('listProducts() returns 3 entries for example tenant', () => {
    const provider = staticTypescriptContentProvider(exampleContent)
    assert.equal(provider.listProducts().length, 3)
  })

  it('experience with priceEur === null does not have a numeric price', () => {
    const provider = staticTypescriptContentProvider(alpacasibizaContent)
    const experiences = provider.listExperiences()
    assert.ok(experiences.length > 0)
    for (const exp of experiences) {
      // Verify the object shape — UI must check for null before rendering price.
      assert.equal(exp.priceEur, null)
      // Confirm that attempting to render priceEur naively would NOT produce a number.
      assert.ok(typeof exp.priceEur !== 'number')
    }
  })

  it('adapter defends against missing arrays (partial module)', () => {
    // Simulate a partially-authored content module missing some arrays.
    const partial = {
      animals: [],
      experiences: [],
      // products, team, reviews intentionally absent
    } as any
    const provider = staticTypescriptContentProvider(partial)
    // Must not throw, must return [].
    assert.deepEqual(provider.listProducts(), [])
    assert.deepEqual(provider.listTeam(), [])
    assert.deepEqual(provider.listReviews(), [])
  })
})
