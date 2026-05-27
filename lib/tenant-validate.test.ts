/**
 * Tests for lib/tenants/validate.ts
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 *
 * Strategy:
 *   - alpacasibiza and exampleVineyard must pass with 0 errors.
 *   - Each other test mutates a single field on a valid baseline; expects exactly
 *     1 error mentioning the right field so rules are isolated.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Tenant } from './tenants/_types.ts'
import { validateTenant } from './tenants/validate.ts'
import { alpacasibiza } from './tenants/alpacasibiza.ts'
import { exampleVineyard } from './tenants/example.ts'

// ── Baseline fixture ───────────────────────────────────────────────────────────
// A structurally valid tenant used as the "happy path" to mutate per test.

const BASE: Tenant = {
  slug: 'test-tenant',
  brandName: 'Test Tenant',
  legalName: 'Test Tenant Ltd.',
  cif: null,
  tagline: 'Testing',
  siteUrl: 'https://test.example.com',
  hosts: ['test.example.com'],
  contactEmail: 'contact@test.example.com',
  noreplyEmail: null,
  phoneE164: null,
  whatsappE164: null,
  address: {
    streetAddress: '1 Test Street',
    addressLocality: 'Testville',
    addressRegion: 'Test Region',
    addressCountry: 'ES',
    postalCode: '12345',
  },
  geo: { latitude: 39.0, longitude: -3.0 },
  mapsQuery: 'Test Tenant, Testville',
  brandColors: {
    primary: '#556B2F',
    secondary: '#F5F5DC',
    themeColor: '#6da855',
  },
  logoUrl: null,
  ogImageUrl: null,
  social: {},
  fareHarbor: {
    shortname: 'test-tenant',
    flowId: '1234567',
    itemIds: {
      tourMeetHerd: undefined,
      tourWeavingWorkshop: undefined,
      tourFarmExperience: undefined,
      tourPhotoSession: undefined,
      yoga: undefined,
      woven: undefined,
      commission: undefined,
      alcaca: undefined,
    },
  },
  analytics: { ga4MeasurementId: null, gtmContainerId: null },
  locales: ['en', 'es'],
  defaultLocale: 'en',
}

/** Merge overrides onto BASE (shallow at top level, deep for nested objects). */
function tenant(overrides: Partial<Tenant>): Tenant {
  return { ...BASE, ...overrides } as Tenant
}

// ── Canonical tenants ──────────────────────────────────────────────────────────

describe('canonical tenants pass validation', () => {
  it('alpacasibiza validates OK', () => {
    const result = validateTenant(alpacasibiza)
    assert.deepEqual(result.errors, [], `unexpected errors: ${result.errors.join('; ')}`)
    assert.equal(result.ok, true)
  })

  it('exampleVineyard validates OK', () => {
    const result = validateTenant(exampleVineyard)
    assert.deepEqual(result.errors, [], `unexpected errors: ${result.errors.join('; ')}`)
    assert.equal(result.ok, true)
  })
})

// ── Slug ──────────────────────────────────────────────────────────────────────

describe('slug validation', () => {
  it('returns 1 error for an invalid slug with spaces and uppercase', () => {
    const result = validateTenant(tenant({ slug: 'Invalid Slug' }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('slug'), `error should mention slug: ${result.errors[0]}`)
  })
})

// ── siteUrl ───────────────────────────────────────────────────────────────────

describe('siteUrl validation', () => {
  it('returns 1 error when siteUrl uses http instead of https', () => {
    const result = validateTenant(tenant({ siteUrl: 'http://test.example.com' }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('https'), `error should mention https: ${result.errors[0]}`)
  })
})

// ── hosts ─────────────────────────────────────────────────────────────────────

describe('hosts validation', () => {
  it('returns 1 error for an empty hosts array', () => {
    const result = validateTenant(tenant({ hosts: [] }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('hosts'), `error should mention hosts: ${result.errors[0]}`)
  })

  it('returns 1 error when a host entry contains a protocol prefix', () => {
    const result = validateTenant(tenant({ hosts: ['https://test.example.com'] }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('protocol'), `error should mention protocol: ${result.errors[0]}`)
  })
})

// ── contactEmail ──────────────────────────────────────────────────────────────

describe('contactEmail validation', () => {
  it('returns 1 error for a bad email address', () => {
    const result = validateTenant(tenant({ contactEmail: 'not-an-email' }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('contactEmail'), `error should mention contactEmail: ${result.errors[0]}`)
  })
})

// ── brandColors ───────────────────────────────────────────────────────────────

describe('brandColors validation', () => {
  it('returns 1 error per invalid hex slot', () => {
    const result = validateTenant(tenant({
      brandColors: { primary: '#xyz', secondary: '#F5F5DC', themeColor: '#6da855' },
    }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('primary'), `error should mention primary: ${result.errors[0]}`)
  })

  it('returns 3 errors when all hex slots are invalid', () => {
    const result = validateTenant(tenant({
      brandColors: { primary: '#xyz', secondary: 'notahex', themeColor: 'red' },
    }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 3)
  })
})

// ── geo ───────────────────────────────────────────────────────────────────────

describe('geo validation', () => {
  it('returns 1 error when latitude is out of range', () => {
    const result = validateTenant(tenant({ geo: { latitude: 200, longitude: -3.0 } }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('latitude'), `error should mention latitude: ${result.errors[0]}`)
  })

  it('returns 1 error when longitude is out of range', () => {
    const result = validateTenant(tenant({ geo: { latitude: 39.0, longitude: -200 } }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('longitude'), `error should mention longitude: ${result.errors[0]}`)
  })
})

// ── addressCountry ────────────────────────────────────────────────────────────

describe('address.addressCountry validation', () => {
  it('returns 1 error for a non-2-letter country code', () => {
    const result = validateTenant(tenant({
      address: { ...BASE.address, addressCountry: 'ESP' },
    }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('addressCountry'), `error should mention addressCountry: ${result.errors[0]}`)
  })

  it('returns 1 error for a lowercase country code', () => {
    const result = validateTenant(tenant({
      address: { ...BASE.address, addressCountry: 'es' },
    }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
  })
})

// ── locales / defaultLocale ────────────────────────────────────────────────────

describe('locales / defaultLocale validation', () => {
  it('returns 1 error when defaultLocale is not in locales', () => {
    const result = validateTenant(tenant({
      locales: ['en', 'es'],
      defaultLocale: 'pt',
    }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('defaultLocale'), `error should mention defaultLocale: ${result.errors[0]}`)
  })
})

// ── fareHarbor ────────────────────────────────────────────────────────────────

describe('fareHarbor validation', () => {
  it('returns 1 error when shortname is set but flowId is empty', () => {
    const result = validateTenant(tenant({
      fareHarbor: { ...BASE.fareHarbor, shortname: 'myshortname', flowId: '' },
    }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('fareHarbor'), `error should mention fareHarbor: ${result.errors[0]}`)
  })

  it('passes when both shortname and flowId are empty (manual-inquiry tenant)', () => {
    const result = validateTenant(tenant({
      fareHarbor: { ...BASE.fareHarbor, shortname: '', flowId: '' },
    }))
    assert.equal(result.ok, true)
  })
})

// ── E.164 phone numbers ────────────────────────────────────────────────────────

describe('E.164 phone validation', () => {
  it('passes when phoneE164 is null', () => {
    const result = validateTenant(tenant({ phoneE164: null }))
    assert.equal(result.ok, true)
  })

  it('returns 1 error for a phone number missing the + prefix', () => {
    const result = validateTenant(tenant({ phoneE164: '32475586544' }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('phoneE164'), `error should mention phoneE164: ${result.errors[0]}`)
  })

  it('passes when whatsappE164 is null', () => {
    const result = validateTenant(tenant({ whatsappE164: null }))
    assert.equal(result.ok, true)
  })

  it('returns 1 error for an invalid whatsappE164', () => {
    const result = validateTenant(tenant({ whatsappE164: '+1' }))
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 1)
    assert.ok(result.errors[0].includes('whatsappE164'), `error should mention whatsappE164: ${result.errors[0]}`)
  })
})
