import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { fetchWithTimeout } from './fetch.ts'

describe('fetchWithTimeout', () => {
  let originalFetch: typeof globalThis.fetch
  let originalClearTimeout: typeof globalThis.clearTimeout

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalClearTimeout = globalThis.clearTimeout
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.clearTimeout = originalClearTimeout
  })

  it('returns the response when fetch resolves within timeout', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 })
    globalThis.fetch = async () => mockResponse

    const result = await fetchWithTimeout('https://example.com', {}, 5000)
    assert.equal(result.status, 200)
  })

  it('aborts and throws when fetch takes longer than ms', async () => {
    // A fetch that never resolves — the AbortController will cancel it
    globalThis.fetch = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }
      })

    await assert.rejects(
      () => fetchWithTimeout('https://example.com', {}, 10),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.equal((err as DOMException).name, 'AbortError')
        return true
      }
    )
  })

  it('uses 5000ms as the default timeout', async () => {
    let capturedMs: number | undefined
    const originalSetTimeout = globalThis.setTimeout

    // Intercept setTimeout to capture the delay value
    // @ts-ignore — override for test purposes
    globalThis.setTimeout = (fn: () => void, ms: number) => {
      capturedMs = ms
      return originalSetTimeout(fn, ms)
    }

    const mockResponse = new Response('{}', { status: 200 })
    globalThis.fetch = async () => mockResponse

    try {
      await fetchWithTimeout('https://example.com')
    } finally {
      // @ts-ignore
      globalThis.setTimeout = originalSetTimeout
    }

    assert.equal(capturedMs, 5000)
  })

  it('propagates AbortError to the caller — does not swallow it', async () => {
    globalThis.fetch = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }
      })

    let thrown: unknown
    try {
      await fetchWithTimeout('https://example.com', {}, 10)
    } catch (err) {
      thrown = err
    }

    assert.ok(thrown instanceof Error, 'error should propagate')
    assert.equal((thrown as DOMException).name, 'AbortError')
  })

  it('clears the setTimeout even when fetch throws', async () => {
    const clearedIds: (number | NodeJS.Timeout)[] = []
    const realClearTimeout = globalThis.clearTimeout
    // @ts-ignore
    globalThis.clearTimeout = (id: number | NodeJS.Timeout) => {
      clearedIds.push(id)
      realClearTimeout(id)
    }

    globalThis.fetch = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }
      })

    try {
      await fetchWithTimeout('https://example.com', {}, 10)
    } catch {
      // expected
    } finally {
      // @ts-ignore
      globalThis.clearTimeout = realClearTimeout
    }

    assert.ok(clearedIds.length > 0, 'clearTimeout should be called in finally block')
  })

  it('clears the setTimeout on success path too', async () => {
    const clearedIds: (number | NodeJS.Timeout)[] = []
    const realClearTimeout = globalThis.clearTimeout
    // @ts-ignore
    globalThis.clearTimeout = (id: number | NodeJS.Timeout) => {
      clearedIds.push(id)
      realClearTimeout(id)
    }

    globalThis.fetch = async () => new Response('{}', { status: 200 })

    try {
      await fetchWithTimeout('https://example.com', {}, 5000)
    } finally {
      // @ts-ignore
      globalThis.clearTimeout = realClearTimeout
    }

    assert.ok(clearedIds.length > 0, 'clearTimeout should be called in finally block on success')
  })
})
