import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { detectHoneypot } from './honeypot.ts'

describe('detectHoneypot', () => {
  it('returns false when field is absent', () => {
    assert.equal(detectHoneypot({}, 'company_url'), false)
  })

  it('returns false when field is empty string', () => {
    assert.equal(detectHoneypot({ company_url: '' }, 'company_url'), false)
  })

  it('returns false when field is undefined', () => {
    assert.equal(detectHoneypot({ company_url: undefined }, 'company_url'), false)
  })

  it('returns false when field is null', () => {
    assert.equal(detectHoneypot({ company_url: null }, 'company_url'), false)
  })

  it('returns false when field is false', () => {
    assert.equal(detectHoneypot({ company_url: false }, 'company_url'), false)
  })

  it('returns false when field is 0', () => {
    assert.equal(detectHoneypot({ company_url: 0 }, 'company_url'), false)
  })

  it('returns true when field is a non-empty string (bot filled it)', () => {
    assert.equal(detectHoneypot({ company_url: 'https://spam.example.com' }, 'company_url'), true)
  })

  it('returns true when field is a number (non-zero)', () => {
    assert.equal(detectHoneypot({ company_url: 42 }, 'company_url'), true)
  })

  it('returns true when field is boolean true', () => {
    assert.equal(detectHoneypot({ company_url: true }, 'company_url'), true)
  })

  it('uses the correct field name — different name does not trigger', () => {
    assert.equal(detectHoneypot({ phone_extension: 'filled' }, 'company_url'), false)
  })

  it('works with phone_extension field name', () => {
    assert.equal(detectHoneypot({ phone_extension: '123' }, 'phone_extension'), true)
  })

  it('works with business_name field name', () => {
    assert.equal(detectHoneypot({ business_name: 'ACME Corp' }, 'business_name'), true)
  })
})
