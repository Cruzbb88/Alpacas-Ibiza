import { describe, it, before, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  safeReferrerHost,
  isBotUA,
  logNotFound,
  _resetDedupeMapForTesting,
} from './notfound-log.ts'

describe('safeReferrerHost', () => {
  it('returns the host for a well-formed URL', () => {
    assert.equal(safeReferrerHost('https://example.com/some/path?q=1'), 'example.com')
  })

  it('returns null for null input', () => {
    assert.equal(safeReferrerHost(null), null)
  })

  it('returns null for a malformed URL — no crash', () => {
    assert.equal(safeReferrerHost('not a url at all'), null)
  })

  it('strips path and query from referrer (host only)', () => {
    assert.equal(safeReferrerHost('https://blog.site.nl/article?utm_source=email'), 'blog.site.nl')
  })
})

describe('isBotUA', () => {
  it('detects Googlebot', () => {
    assert.equal(isBotUA('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true)
  })

  it('detects curl', () => {
    assert.equal(isBotUA('curl/7.81.0'), true)
  })

  it('detects wget', () => {
    assert.equal(isBotUA('Wget/1.21'), true)
  })

  it('returns false for a real browser UA', () => {
    assert.equal(isBotUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'), false)
  })
})

describe('logNotFound', () => {
  let warned: string[] = []

  before(() => {
    // nothing — afterEach cleans up
  })

  afterEach(() => {
    _resetDedupeMapForTesting()
    warned = []
  })

  it('strips query strings from path before logging', () => {
    const messages: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => messages.push(String(args[0]))
    try {
      logNotFound({ pathname: '/en/tours?utm_source=google', referer: null, userAgent: null })
    } finally {
      console.warn = orig
    }
    assert.ok(messages[0].includes('"/en/tours"'), `expected clean path in: ${messages[0]}`)
    assert.ok(!messages[0].includes('?utm_source'), 'query string must be stripped')
  })

  it('deduplicates the same path + referer within TTL — second call does not log', () => {
    const messages: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => messages.push(String(args[0]))
    try {
      logNotFound({ pathname: '/en/missing', referer: 'https://x.com/link', userAgent: null })
      logNotFound({ pathname: '/en/missing', referer: 'https://x.com/link', userAgent: null })
    } finally {
      console.warn = orig
    }
    assert.equal(messages.length, 1, 'second call within TTL must be swallowed')
  })

  it('logs different paths independently (no cross-path dedup)', () => {
    const messages: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => messages.push(String(args[0]))
    try {
      logNotFound({ pathname: '/en/foo', referer: null, userAgent: null })
      logNotFound({ pathname: '/en/bar', referer: null, userAgent: null })
    } finally {
      console.warn = orig
    }
    assert.equal(messages.length, 2)
  })

  it('logs referer=direct when no referer is supplied', () => {
    const messages: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => messages.push(String(args[0]))
    try {
      logNotFound({ pathname: '/en/gone', referer: null, userAgent: null })
    } finally {
      console.warn = orig
    }
    assert.ok(messages[0].includes('"direct"'), `expected direct in: ${messages[0]}`)
  })

  it('handles malformed referer URL gracefully — logs with direct, no crash', () => {
    const messages: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => messages.push(String(args[0]))
    assert.doesNotThrow(() => {
      try {
        logNotFound({ pathname: '/en/bad-ref', referer: 'not-a-url', userAgent: null })
      } finally {
        console.warn = orig
      }
    })
    assert.equal(messages.length, 1)
    assert.ok(messages[0].includes('"direct"'))
  })

  it('truncates UA to 100 chars before logging', () => {
    const longUA = 'a'.repeat(200)
    const messages: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => messages.push(String(args[0]))
    try {
      logNotFound({ pathname: '/en/long-ua', referer: null, userAgent: longUA })
    } finally {
      console.warn = orig
    }
    // The logged ua value should be exactly 100 a's
    assert.ok(messages[0].includes('"' + 'a'.repeat(100) + '"'))
    assert.ok(!messages[0].includes('a'.repeat(101)))
  })
})
