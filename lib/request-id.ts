/**
 * Request-ID helper — generates or extracts a stable ID per request for ops
 * correlation.
 *
 * Convention:
 *   - If the incoming request has `X-Request-ID` (matches `[a-zA-Z0-9-]{8,64}`), reuse it
 *   - Otherwise, generate a new ULID-like id: 12 base32 chars (random) prefixed with a timestamp segment
 *
 * IDs are NOT cryptographically secure — they're for log correlation only.
 * Same-ID collision risk: ~ 1 in 10^15 per second of traffic. Safe.
 */

const VALID = /^[a-zA-Z0-9-]{8,64}$/

function generateId(): string {
  const ts = Date.now().toString(36) // ~8 chars, sortable
  const rand = Math.random().toString(36).slice(2, 14).padEnd(12, '0')
  return `${ts}-${rand}`
}

export function getRequestId(request: Request): string {
  const provided = request.headers.get('x-request-id')
  if (provided && VALID.test(provided)) return provided
  return generateId()
}

export function attachRequestId(response: Response, id: string): Response {
  response.headers.set('X-Request-ID', id)
  return response
}

/**
 * Convenience logger that prefixes every line with the request ID + a route tag.
 * Logs go to stdout/stderr via console.* — captured by Vercel/Node runtime.
 */
export function makeRequestLogger(routeTag: string, id: string) {
  const prefix = `[${routeTag}] reqId=${id}`
  return {
    info: (msg: string, extra?: object) =>
      console.log(`${prefix} ${msg}`, extra ?? ''),
    warn: (msg: string, extra?: object) =>
      console.warn(`${prefix} ${msg}`, extra ?? ''),
    error: (msg: string, extra?: object) =>
      console.error(`${prefix} ${msg}`, extra ?? ''),
  }
}
