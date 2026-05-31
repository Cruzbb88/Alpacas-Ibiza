/**
 * fetchWithRetry — thin fetch wrapper for client-side calls that may hit
 * transient network blips (e.g. the checkout intent endpoints).
 *
 * Retries on thrown network errors OR on 5xx responses. 4xx responses (e.g.
 * 400 Bad Request) are returned immediately — they are programmer errors, not
 * transient failures, and retrying would just burn quota.
 *
 * Usage:
 *   const res = await fetchWithRetry('/api/checkout/intent', { method: 'POST', ... })
 *   const res = await fetchWithRetry(url, init, { retries: 2, baseDelayMs: 200 })
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { retries?: number; baseDelayMs?: number },
): Promise<Response> {
  const max = opts?.retries ?? 2
  const base = opts?.baseDelayMs ?? 200
  for (let attempt = 0; attempt <= max; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.ok || res.status < 500) return res
      if (attempt === max) return res
    } catch (e) {
      if (attempt === max) throw e
    }
    await new Promise(r => setTimeout(r, base * Math.pow(2, attempt)))
  }
  throw new Error('unreachable')
}
