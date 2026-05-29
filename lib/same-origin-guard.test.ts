/**
 * Regression tests for same-origin-guard.ts shipped in commit 1561178.
 *
 * Pins the CSRF defence pattern used by mollie-manage POST routes (cancel,
 * update-payment, status). A leaked capability token must NOT be replayable
 * from an attacker-hosted form.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSameOriginPost } from './same-origin-guard.ts'
import { SITE_BASE_URL } from './config.ts'

function req(originHeader: string | null): Request {
  const headers: Record<string, string> = {}
  if (originHeader !== null) headers.origin = originHeader
  return new Request('https://x.test/api/mollie-manage/cancel', {
    method: 'POST',
    headers,
  })
}

describe('isSameOriginPost', () => {
  it('allows POST with Origin matching SITE_BASE_URL', () => {
    assert.equal(isSameOriginPost(req(SITE_BASE_URL)), true)
  })

  it('REJECTS POST with NO Origin header (token-replay defence per peer-review 2026-05-29)', () => {
    // Prior bug: allow-on-missing let curl-with-leaked-token POST the cancel
    // endpoint and proceed. Modern browsers always send Origin on POST.
    assert.equal(isSameOriginPost(req(null)), false)
  })

  it('rejects POST from attacker.com origin', () => {
    assert.equal(isSameOriginPost(req('https://attacker.com')), false)
  })

  it('rejects POST from a subdomain that is not SITE_BASE_URL', () => {
    assert.equal(isSameOriginPost(req('https://evil.alpacasibiza.com')), false)
  })

  it('rejects POST from the http:// version when SITE_BASE_URL is https://', () => {
    if (SITE_BASE_URL.startsWith('https://')) {
      const httpVersion = 'http://' + SITE_BASE_URL.slice('https://'.length)
      assert.equal(isSameOriginPost(req(httpVersion)), false)
    }
  })

})
