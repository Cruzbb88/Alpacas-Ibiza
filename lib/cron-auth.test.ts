/**
 * Regression tests for cron-auth.ts shipped in commit 1561178.
 *
 * Pins the Bearer-only auth contract for owner-mrr-digest:
 *   - Bearer header must match exactly (case-sensitive prefix)
 *   - ?secret= query string must NOT authenticate (logged by edge proxies)
 *   - missing env or missing header → false (no log spam, no 500)
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { verifyCronSecret } from './cron-auth.ts'

const ORIGINAL_SECRET = process.env.CRON_SECRET

function makeRequest(headers: Record<string, string> = {}, url = 'https://x.test/api/owner-mrr-digest'): Request {
  return new Request(url, { headers })
}

describe('verifyCronSecret', () => {
  before(() => {
    process.env.CRON_SECRET = 'shh-correct-secret-32-chars-abcdef'
  })
  after(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = ORIGINAL_SECRET
  })

  it('accepts a request with correct Authorization: Bearer <secret>', () => {
    assert.equal(verifyCronSecret(makeRequest({ authorization: 'Bearer shh-correct-secret-32-chars-abcdef' })), true)
  })

  it('rejects a request with wrong Bearer token', () => {
    assert.equal(verifyCronSecret(makeRequest({ authorization: 'Bearer wrong-secret' })), false)
  })

  it('rejects a request with NO authorization header', () => {
    assert.equal(verifyCronSecret(makeRequest({})), false)
  })

  it('rejects lowercase "bearer" prefix (case-sensitive on prefix)', () => {
    assert.equal(verifyCronSecret(makeRequest({ authorization: 'bearer shh-correct-secret-32-chars-abcdef' })), false)
  })

  it('rejects "Bearer" prefix without a space', () => {
    assert.equal(verifyCronSecret(makeRequest({ authorization: 'Bearershh-correct-secret-32-chars-abcdef' })), false)
  })

  it('rejects ?secret=<correct> in query string (Bearer-only by design)', () => {
    assert.equal(
      verifyCronSecret(makeRequest({}, 'https://x.test/api/owner-mrr-digest?secret=shh-correct-secret-32-chars-abcdef')),
      false,
    )
  })

  it('rejects empty token after Bearer prefix', () => {
    assert.equal(verifyCronSecret(makeRequest({ authorization: 'Bearer ' })), false)
  })

  it('returns false when CRON_SECRET env is unset (does not throw)', () => {
    delete process.env.CRON_SECRET
    try {
      assert.equal(verifyCronSecret(makeRequest({ authorization: 'Bearer anything' })), false)
    } finally {
      process.env.CRON_SECRET = 'shh-correct-secret-32-chars-abcdef'
    }
  })
})
