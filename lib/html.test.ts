import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { escapeHtml } from './html.ts'

describe('escapeHtml', () => {
  it('escapes < in a script tag', () => {
    assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;')
  })

  it('escapes & to &amp;', () => {
    assert.equal(escapeHtml('a & b'), 'a &amp; b')
  })

  it('escapes " to &quot;', () => {
    assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;')
  })

  it("escapes ' to &#39;", () => {
    assert.equal(escapeHtml("it's"), "it&#39;s")
  })

  it('escapes / to &#x2F;', () => {
    assert.equal(escapeHtml('a/b'), 'a&#x2F;b')
  })

  it('escapes > to &gt;', () => {
    assert.equal(escapeHtml('a > b'), 'a &gt; b')
  })

  it('returns empty string for null', () => {
    assert.equal(escapeHtml(null), '')
  })

  it('returns empty string for undefined', () => {
    assert.equal(escapeHtml(undefined), '')
  })

  it('coerces number to string and escapes', () => {
    // numbers have no escapable chars — just confirms String() conversion
    assert.equal(escapeHtml(42), '42')
  })

  it('coerces boolean to string', () => {
    assert.equal(escapeHtml(true), 'true')
    assert.equal(escapeHtml(false), 'false')
  })

  it('coerces object via String() — [object Object] has no escapable chars', () => {
    assert.equal(escapeHtml({}), '[object Object]')
  })

  it('double-escaping re-escapes the ampersand (intentional — call once only)', () => {
    // First call: 'a & b' → 'a &amp; b'
    // Second call: 'a &amp; b' → 'a &amp;amp; b' (& inside &amp; gets escaped again)
    const once = escapeHtml('a & b')
    const twice = escapeHtml(once)
    assert.equal(twice, 'a &amp;amp; b')
  })

  it('passes through plain text with no special chars', () => {
    assert.equal(escapeHtml('hello world'), 'hello world')
  })

  it('handles an empty string', () => {
    assert.equal(escapeHtml(''), '')
  })

  it('escapes all dangerous chars in one string', () => {
    assert.equal(
      escapeHtml('<a href="/x?a=1&b=\'2\'">link</a>'),
      '&lt;a href=&quot;&#x2F;x?a=1&amp;b=&#39;2&#39;&quot;&gt;link&lt;&#x2F;a&gt;'
    )
  })
})
