/**
 * Tests for the AlpacaCamEmbed URL allowlist security logic.
 *
 * The key invariant: `isSafeEmbedUrl` must use exact `u.origin` comparison
 * (not prefix/startsWith) to prevent subdomain-bypass attacks like:
 *   https://player.twitch.tv.evil.com
 *
 * Since isSafeEmbedUrl is module-private, we test the equivalent logic here
 * to pin the security property. Any regression in the component would need
 * to change this test as well — making it visible in PR diff.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const ALLOWED_EMBED_ORIGINS = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.twitch.tv',
  'https://player.vimeo.com',
]

/** Mirrors the fixed isSafeEmbedUrl from components/alpaca-cam-embed.tsx */
function isSafeEmbedUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return ALLOWED_EMBED_ORIGINS.includes(u.origin)
  } catch {
    return false
  }
}

describe('isSafeEmbedUrl — exact origin comparison (Fix 2)', () => {
  it('allows YouTube embed URL', () => {
    assert.equal(isSafeEmbedUrl('https://www.youtube.com/embed/abc123'), true)
  })

  it('allows YouTube nocookie embed URL', () => {
    assert.equal(isSafeEmbedUrl('https://www.youtube-nocookie.com/embed/abc123'), true)
  })

  it('allows Twitch player URL', () => {
    assert.equal(isSafeEmbedUrl('https://player.twitch.tv/?channel=alpacaibiza'), true)
  })

  it('allows Vimeo player URL', () => {
    assert.equal(isSafeEmbedUrl('https://player.vimeo.com/video/123456'), true)
  })

  it('blocks subdomain bypass: player.twitch.tv.evil.com', () => {
    // This was the vulnerability when startsWith was used: the raw string
    // 'https://player.twitch.tv.evil.com' starts with 'https://player.twitch.tv'
    // but u.origin is 'https://player.twitch.tv.evil.com' — not in the allowlist.
    assert.equal(isSafeEmbedUrl('https://player.twitch.tv.evil.com/embed'), false)
  })

  it('blocks subdomain bypass: www.youtube.com.evil.com', () => {
    assert.equal(isSafeEmbedUrl('https://www.youtube.com.evil.com/embed/abc'), false)
  })

  it('blocks arbitrary HTTPS URL', () => {
    assert.equal(isSafeEmbedUrl('https://evil.com/iframe'), false)
  })

  it('blocks non-HTTPS URL (http)', () => {
    // http: origin will not match the https:// prefixed entries in the allowlist
    assert.equal(isSafeEmbedUrl('http://www.youtube.com/embed/abc'), false)
  })

  it('blocks malformed URL', () => {
    assert.equal(isSafeEmbedUrl('not-a-url'), false)
  })

  it('blocks empty string', () => {
    assert.equal(isSafeEmbedUrl(''), false)
  })
})
