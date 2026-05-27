import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { trackEngagement } from './analytics-engagement.ts'

// Minimal window stub --------------------------------------------------------
type GtagCall = { command: string; eventName: string; params: Record<string, unknown> }

function makeGtag(): { calls: GtagCall[]; fn: (...args: unknown[]) => void } {
  const calls: GtagCall[] = []
  const fn = ((command: string, eventName: string, params: Record<string, unknown>) => {
    calls.push({ command, eventName, params })
  }) as (...args: unknown[]) => void
  return { calls, fn }
}

// `window` is declared in lib.dom; we cast to any to swap it for test stubs
// without redeclaring the global (which collides with the real DOM type).
const G = globalThis as unknown as { window: unknown }

beforeEach(() => {
  G.window = undefined
})

// ---------------------------------------------------------------------------

describe('trackEngagement.scrollDepth', () => {
  it('is a no-op when window is undefined', () => {
    G.window = undefined
    // Should not throw
    trackEngagement.scrollDepth(50, '/foo')
  })

  it('is a no-op when window.gtag is not a function', () => {
    G.window = { gtag: undefined }
    trackEngagement.scrollDepth(50, '/foo')
    // No call made — no error
  })

  it('calls gtag with correct event and params', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.scrollDepth(50, '/my-page')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].command, 'event')
    assert.equal(calls[0].eventName, 'scroll_depth')
    assert.equal(calls[0].params.percent, 50)
    assert.equal(calls[0].params.page_path, '/my-page')
  })

  it('fires each milestone independently', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    for (const pct of [25, 50, 75, 100] as const) {
      trackEngagement.scrollDepth(pct, '/blog')
    }
    assert.equal(calls.length, 4)
    assert.deepEqual(
      calls.map((c) => c.params.percent),
      [25, 50, 75, 100],
    )
  })
})

describe('trackEngagement.outboundLink', () => {
  it('is a no-op when window is undefined', () => {
    G.window = undefined
    trackEngagement.outboundLink('https://example.com')
  })

  it('is a no-op when window.gtag is not a function', () => {
    G.window = { gtag: 'not-a-function' }
    trackEngagement.outboundLink('https://example.com')
  })

  it('calls gtag with correct event and href', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.outboundLink('https://example.com', 'Example')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].command, 'event')
    assert.equal(calls[0].eventName, 'outbound_click')
    assert.equal(calls[0].params.link_url, 'https://example.com')
    assert.equal(calls[0].params.link_label, 'Example')
  })

  it('allows undefined label', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.outboundLink('https://example.com')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].params.link_label, undefined)
  })
})

describe('trackEngagement.fileDownload', () => {
  it('is a no-op when window is undefined', () => {
    G.window = undefined
    trackEngagement.fileDownload('/brochure.pdf', 'brochure.pdf')
  })

  it('is a no-op when window.gtag is not a function', () => {
    G.window = { gtag: null }
    trackEngagement.fileDownload('/brochure.pdf', 'brochure.pdf')
  })

  it('extracts pdf extension and calls gtag', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.fileDownload('/docs/x.pdf', 'x.pdf')
    assert.equal(calls.length, 1)
    assert.equal(calls[0].command, 'event')
    assert.equal(calls[0].eventName, 'file_download')
    assert.equal(calls[0].params.file_name, 'x.pdf')
    assert.equal(calls[0].params.file_extension, 'pdf')
    assert.equal(calls[0].params.link_url, '/docs/x.pdf')
  })

  it('extracts zip extension', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.fileDownload('/archive.zip', 'archive.zip')
    assert.equal(calls[0].params.file_extension, 'zip')
  })

  it('uses the whole filename as extension when there is no dot separator', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.fileDownload('/download', 'download')
    // 'download'.split('.').pop() === 'download' — no dot means full string is returned
    assert.equal(calls[0].params.file_extension, 'download')
  })

  it('lowercases the extension', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn }
    trackEngagement.fileDownload('/report.PDF', 'report.PDF')
    assert.equal(calls[0].params.file_extension, 'pdf')
  })
})
