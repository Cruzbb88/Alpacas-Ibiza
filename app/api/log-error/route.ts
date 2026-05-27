/**
 * POST /api/log-error
 *
 * Receives client-side error boundary payloads and logs them to stdout so
 * Vercel Function Logs captures them automatically — zero new deps, zero cost.
 *
 * Shape: { digest, message, pathname, ts }
 *   digest   — Next.js server-side error correlation ID (may be null)
 *   message  — error.message trimmed to 200 chars (may be null)
 *   pathname — window.location.pathname at the time of the error
 *   ts       — client Date.now()
 *
 * Security:
 *   - No UA capture, no IP storage (only used for rate-limiting key then discarded)
 *   - Input validated and truncated before logging (no arbitrary injection into logs)
 *   - Rate-limited to 10 req / 60 s per IP via existing lib/rate-limit utility
 *   - Returns 204 with no body (no PII reflected back to client)
 */

import { rateLimit, getClientIp } from '@/lib/rate-limit'

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000 // 1 minute

interface LogErrorPayload {
  digest: string | null
  message: string | null
  pathname: string
  ts: number
}

function isValidPayload(body: unknown): body is LogErrorPayload {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  if (b.digest !== null && typeof b.digest !== 'string') return false
  if (b.message !== null && typeof b.message !== 'string') return false
  if (typeof b.pathname !== 'string') return false
  if (typeof b.ts !== 'number') return false
  return true
}

export async function POST(request: Request) {
  // Rate-limit by IP
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `log-error:${ip}`, limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS })
  if (!rl.allowed) {
    return new Response(null, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(null, { status: 400 })
  }

  if (!isValidPayload(body)) {
    return new Response(null, { status: 400 })
  }

  const payload = {
    digest: typeof body.digest === 'string' ? body.digest.slice(0, 64) : null,
    message: typeof body.message === 'string' ? body.message.slice(0, 200) : null,
    // Restrict pathname to printable ASCII, max 256 chars
    pathname: body.pathname.replace(/[^\x20-\x7E]/g, '').slice(0, 256),
    ts: body.ts,
  }

  // Vercel Function Logs captures console.error automatically
  console.error('[client-error]', JSON.stringify(payload))

  return new Response(null, { status: 204 })
}
