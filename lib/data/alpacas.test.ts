import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ALPACAS, findAlpacaName } from './alpacas.ts'

describe('findAlpacaName', () => {
  it('returns the display name for a known slug', () => {
    assert.equal(findAlpacaName('bardot'), 'Bardot')
    assert.equal(findAlpacaName('avalon'), 'Avalon')
    assert.equal(findAlpacaName('barbarella'), 'Barbarella')
  })

  it('returns null for an unknown slug (forged URL / typo)', () => {
    assert.equal(findAlpacaName('definitely-not-a-real-alpaca'), null)
    assert.equal(findAlpacaName(''), null)
    assert.equal(findAlpacaName('   '), null)
  })

  it('returns null for nullish input — used by routes that read untrusted query params', () => {
    assert.equal(findAlpacaName(null), null)
    assert.equal(findAlpacaName(undefined), null)
  })

  it('roster has exactly 14 alpacas (live-site count per REALITY_CHECK)', () => {
    assert.equal(ALPACAS.length, 14, 'count must match the herd at Es Currals')
  })

  it('every roster entry resolves through findAlpacaName', () => {
    for (const a of ALPACAS) {
      assert.equal(findAlpacaName(a.id), a.name, `slug ${a.id} must resolve to ${a.name}`)
    }
  })
})
