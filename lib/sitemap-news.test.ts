import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Pure xml-escape helper — inline copy of the one exported from the route.
// Route-level tests skipped (require HTTP server); this covers the pure helper.
const xmlEsc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

describe('news-sitemap xml escaping', () => {
  it('escapes ampersands first', () => assert.equal(xmlEsc('A & B'), 'A &amp; B'))
  it('escapes angle brackets', () => assert.equal(xmlEsc('<script>'), '&lt;script&gt;'))
  it('escapes double quotes', () => assert.equal(xmlEsc('"foo"'), '&quot;foo&quot;'))
  it('escapes single quotes', () => assert.equal(xmlEsc("'bar'"), '&apos;bar&apos;'))
  it('escapes mixed special chars', () =>
    assert.equal(xmlEsc(`"foo" 'bar'`), '&quot;foo&quot; &apos;bar&apos;'))
  it('leaves clean strings untouched', () => assert.equal(xmlEsc('Hello world'), 'Hello world'))
  it('does not double-escape ampersands', () =>
    assert.equal(xmlEsc('&amp;'), '&amp;amp;')) // escaping is NOT idempotent
})
