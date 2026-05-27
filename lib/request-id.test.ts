import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getRequestId, attachRequestId } from './request-id.ts'

describe('getRequestId', () => {
  it('reuses a valid client-supplied X-Request-ID', () => {
    const req = new Request('http://x.test', { headers: { 'x-request-id': 'abc123def456' } })
    assert.equal(getRequestId(req), 'abc123def456')
  })

  it('generates a new ID when no header supplied', () => {
    const req = new Request('http://x.test')
    const id = getRequestId(req)
    assert.ok(id.length >= 12)
    assert.match(id, /[a-z0-9-]+/)
  })

  it('rejects an invalid client-supplied ID (too short)', () => {
    const req = new Request('http://x.test', { headers: { 'x-request-id': 'abc' } })
    const id = getRequestId(req)
    assert.notEqual(id, 'abc')
  })

  it('rejects an invalid client-supplied ID (special chars)', () => {
    const req = new Request('http://x.test', { headers: { 'x-request-id': '<script>alert(1)</script>' } })
    const id = getRequestId(req)
    assert.doesNotMatch(id, /<script>/)
  })

  it('generated IDs are unique across rapid successive calls', () => {
    const a = getRequestId(new Request('http://x.test'))
    const b = getRequestId(new Request('http://x.test'))
    assert.notEqual(a, b)
  })
})

describe('attachRequestId', () => {
  it('sets the X-Request-ID header on the response', () => {
    const r = new Response('ok')
    const out = attachRequestId(r, 'test-id-123')
    assert.equal(out.headers.get('X-Request-ID'), 'test-id-123')
  })
})
