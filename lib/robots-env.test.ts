import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isProductionEnv } from './robots-env.ts'

describe('isProductionEnv', () => {
  it('production when VERCEL_ENV is production', () => {
    assert.equal(isProductionEnv('https://other.com', 'production'), true)
  })
  it('production when siteUrl matches canonical alpacasibiza.com', () => {
    assert.equal(isProductionEnv('https://alpacasibiza.com'), true)
  })
  it('NOT production for preview', () => {
    assert.equal(isProductionEnv('https://x.vercel.app', 'preview'), false)
  })
  it('NOT production for unrecognized siteUrl', () => {
    assert.equal(isProductionEnv('http://localhost:3000'), false)
  })
})
