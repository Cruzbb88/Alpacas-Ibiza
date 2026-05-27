import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { lookupByHost, lookupBySlug } from './registry.ts'

describe('lookupByHost', () => {
  it('resolves the canonical alpacasibiza host', () => {
    const t = lookupByHost('alpacasibiza.com')
    assert.ok(t !== null)
    assert.equal(t!.slug, 'alpacasibiza')
  })

  it('resolves the www variant', () => {
    const t = lookupByHost('www.alpacasibiza.com')
    assert.ok(t !== null)
    assert.equal(t!.slug, 'alpacasibiza')
  })

  it('resolves the platform subdomain', () => {
    const t = lookupByHost('alpacasibiza.alpacaplatform.com')
    assert.ok(t !== null)
    assert.equal(t!.slug, 'alpacasibiza')
  })

  it('strips port suffix before lookup', () => {
    const t = lookupByHost('alpacasibiza.com:443')
    assert.ok(t !== null)
    assert.equal(t!.slug, 'alpacasibiza')
  })

  it('returns null for an unknown host', () => {
    assert.equal(lookupByHost('unknown.example.com'), null)
  })

  it('returns null for empty string', () => {
    assert.equal(lookupByHost(''), null)
  })
})

describe('lookupBySlug', () => {
  it('finds the alpacasibiza tenant', () => {
    const t = lookupBySlug('alpacasibiza')
    assert.ok(t !== null)
    assert.equal(t!.brandName, 'Alpacas Ibiza')
  })

  it('returns null for unknown slug', () => {
    assert.equal(lookupBySlug('nonexistent'), null)
  })
})
