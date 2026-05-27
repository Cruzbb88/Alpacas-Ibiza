/**
 * Tests for /api/log-error payload validation logic.
 * Route never throws — returns 204 silently for all error cases.
 * These tests exercise the field-truncation and size-cap rules in isolation.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/** Mirror of the route's truncation logic so we can unit-test it without HTTP. */
function processPayload(raw: string): {
  ok: boolean
  message?: string
  stack?: string
  path?: string
} {
  if (raw.length > 4096) return { ok: false }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(raw)
  } catch {
    return { ok: false }
  }

  const message = typeof payload.message === 'string' ? payload.message.slice(0, 500) : 'unknown'
  const stack = typeof payload.stack === 'string' ? payload.stack.slice(0, 2000) : ''
  const path = typeof payload.pathname === 'string' ? payload.pathname.replace(/[^\x20-\x7E]/g, '').slice(0, 200) : ''

  return { ok: true, message, stack, path }
}

describe('log-error payload validation', () => {
  it('rejects payload over 4KB', () => {
    const oversized = JSON.stringify({ message: 'x'.repeat(5000) })
    assert.ok(oversized.length > 4096)
    const result = processPayload(oversized)
    assert.equal(result.ok, false)
  })

  it('truncates message to 500 chars', () => {
    const longMessage = 'A'.repeat(800)
    const raw = JSON.stringify({ message: longMessage, stack: '', pathname: '/', type: 'error' })
    const result = processPayload(raw)
    assert.equal(result.ok, true)
    assert.equal(result.message?.length, 500)
    assert.equal(result.message, 'A'.repeat(500))
  })

  it('truncates stack to 2000 chars', () => {
    const longStack = 'B'.repeat(3000)
    const raw = JSON.stringify({ message: 'err', stack: longStack, pathname: '/', type: 'error' })
    const result = processPayload(raw)
    assert.equal(result.ok, true)
    assert.equal(result.stack?.length, 2000)
    assert.equal(result.stack, 'B'.repeat(2000))
  })

  it('returns ok:false for invalid JSON', () => {
    const result = processPayload('not-json{{{')
    assert.equal(result.ok, false)
  })

  it('defaults message to "unknown" when missing', () => {
    const raw = JSON.stringify({ pathname: '/', type: 'error' })
    const result = processPayload(raw)
    assert.equal(result.ok, true)
    assert.equal(result.message, 'unknown')
  })

  it('strips non-ASCII chars from pathname', () => {
    // é (U+00E9) is outside [0x20–0x7E] and should be stripped
    const raw = JSON.stringify({ message: 'err', pathname: '/héllo', type: 'error' })
    const result = processPayload(raw)
    assert.equal(result.ok, true)
    assert.equal(result.path, '/hllo')
  })
})
