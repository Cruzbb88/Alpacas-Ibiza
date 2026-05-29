import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  suppressEmail,
  isSuppressed,
  getSuppression,
  unsuppressEmail,
  listSuppressions,
  __resetSuppressionStore,
} from './email-suppression.ts'

describe('email-suppression', () => {
  beforeEach(() => __resetSuppressionStore())

  it('suppressEmail makes isSuppressed return true (case-insensitive)', () => {
    suppressEmail('Donor@Example.COM', 'hard-bounce')
    assert.equal(isSuppressed('donor@example.com'), true)
    assert.equal(isSuppressed('Donor@Example.COM'), true)
    assert.equal(isSuppressed('DONOR@EXAMPLE.COM'), true)
  })

  it('unsuppressed addresses return false', () => {
    assert.equal(isSuppressed('not-suppressed@example.com'), false)
  })

  it('complaint reason wins over hard-bounce (precedence)', () => {
    suppressEmail('x@y.com', 'hard-bounce')
    suppressEmail('x@y.com', 'complaint')
    assert.equal(getSuppression('x@y.com')?.reason, 'complaint')
  })

  it('hard-bounce does NOT downgrade existing complaint', () => {
    suppressEmail('x@y.com', 'complaint')
    suppressEmail('x@y.com', 'hard-bounce')
    assert.equal(getSuppression('x@y.com')?.reason, 'complaint')
  })

  it('manual reason is the weakest — does not override anything', () => {
    suppressEmail('x@y.com', 'hard-bounce')
    suppressEmail('x@y.com', 'manual')
    assert.equal(getSuppression('x@y.com')?.reason, 'hard-bounce')
  })

  it('empty / whitespace email is ignored', () => {
    suppressEmail('', 'hard-bounce')
    suppressEmail('   ', 'hard-bounce')
    assert.equal(listSuppressions().length, 0)
  })

  it('unsuppressEmail removes a previously-suppressed address', () => {
    suppressEmail('x@y.com', 'hard-bounce')
    assert.equal(unsuppressEmail('x@y.com'), true)
    assert.equal(isSuppressed('x@y.com'), false)
    // Removing an already-absent address returns false.
    assert.equal(unsuppressEmail('x@y.com'), false)
  })

  it('listSuppressions returns newest first', async () => {
    suppressEmail('first@y.com', 'hard-bounce')
    // Tiny pause so addedAt timestamps differ.
    await new Promise((r) => setTimeout(r, 5))
    suppressEmail('second@y.com', 'complaint')
    const list = listSuppressions()
    assert.equal(list[0].email, 'second@y.com')
    assert.equal(list[1].email, 'first@y.com')
  })
})
