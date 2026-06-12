/**
 * POST /api/log-error
 *
 * Client-side error reporter sink. Accepts a small JSON payload with browser
 * + error info; logs server-side for ops correlation.
 *
 * Shape: { message, stack, pathname, type, digest? }
 *   message  — error.message (truncated to 500 chars)
 *   stack    — error.stack   (truncated to 2000 chars)
 *   pathname — window.location.pathname at time of error
 *   type     — 'error' | 'unhandledrejection' | 'react-error-boundary'
 *   digest   — Next.js error digest (optional, from error boundaries)
 *
 * Failsafe:
 *   - IP rate-limited (20 per hour per IP) — keeps a malicious client from
 *     spamming the log
 *   - Payload size capped at 4KB (strict input validation)
 *   - No DB write — just console.error so Vercel logs capture it
 *   - Always returns 204 No Content (don't leak rate-limit state to attackers)
 *
 * Also accepts the legacy shape { digest, message, pathname, ts } from
 * existing error.tsx boundaries (backwards-compatible).
 */

import { NextResponse } from 'next/server'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { appendClientError } from '@/lib/client-error-buffer'

const RATE_LIMIT = 20
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('log-error', reqId)

  const ip = getClientIp(request)

  const rateResult = rateLimit({ key: `log-error:${ip}`, limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS })
  if (!rateResult.allowed) {
    // Silent 204 — don't leak rate-limit state to attackers
    return attachRequestId(new NextResponse(null, { status: 204 }), reqId)
  }

  const raw = await request.text()
  if (raw.length > 4096) {
    log.warn('payload too large', { bytes: raw.length })
    return attachRequestId(new NextResponse(null, { status: 204 }), reqId)
  }

  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(raw)
  } catch {
    log.warn('invalid JSON payload')
    return attachRequestId(new NextResponse(null, { status: 204 }), reqId)
  }

  const message = typeof payload.message === 'string' ? payload.message.slice(0, 500) : 'unknown'
  const stack = typeof payload.stack === 'string' ? payload.stack.slice(0, 2000) : ''
  const path = typeof payload.pathname === 'string' ? payload.pathname.replace(/[^\x20-\x7E]/g, '').slice(0, 200) : ''
  const type = typeof payload.type === 'string' ? payload.type.slice(0, 50) : 'unknown'
  const digest = typeof payload.digest === 'string' ? payload.digest.slice(0, 64) : undefined
  const ua = (request.headers.get('user-agent') ?? '').slice(0, 100)

  log.error('client error', { message, stack, path, type, ...(digest !== undefined ? { digest } : {}), ua })

  // Append to in-process ring buffer for /admin/monitoring. The buffer module's
  // own try/catch guarantees no throw — no outer wrapper needed.
  appendClientError({ type, message, path, ...(digest !== undefined ? { digest } : {}), ip })

  return attachRequestId(new NextResponse(null, { status: 204 }), reqId)
}
