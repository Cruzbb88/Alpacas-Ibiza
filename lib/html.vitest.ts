import { describe, it, expect } from 'vitest'
import { escapeHtml } from './html.ts'

describe('escapeHtml', () => {
  it('escapes < in a script tag', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;')
  })

  it('escapes & to &amp;', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes " to &quot;', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;')
  })

  it("escapes ' to &#39;", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s")
  })

  it('escapes / to &#x2F;', () => {
    expect(escapeHtml('a/b')).toBe('a&#x2F;b')
  })

  it('escapes > to &gt;', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('coerces number to string and escapes', () => {
    // numbers have no escapable chars — just confirms String() conversion
    expect(escapeHtml(42)).toBe('42')
  })

  it('coerces boolean to string', () => {
    expect(escapeHtml(true)).toBe('true')
    expect(escapeHtml(false)).toBe('false')
  })

  it('coerces object via String() — [object Object] has no escapable chars', () => {
    expect(escapeHtml({})).toBe('[object Object]')
  })

  it('double-escaping re-escapes the ampersand (intentional — call once only)', () => {
    // First call: 'a & b' → 'a &amp; b'
    // Second call: 'a &amp; b' → 'a &amp;amp; b' (& inside &amp; gets escaped again)
    const once = escapeHtml('a & b')
    const twice = escapeHtml(once)
    expect(twice).toBe('a &amp;amp; b')
  })

  it('passes through plain text with no special chars', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('handles an empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('escapes all dangerous chars in one string', () => {
    expect(
      escapeHtml('<a href="/x?a=1&b=\'2\'">link</a>')
    ).toBe('&lt;a href=&quot;&#x2F;x?a=1&amp;b=&#39;2&#39;&quot;&gt;link&lt;&#x2F;a&gt;')
  })
})
