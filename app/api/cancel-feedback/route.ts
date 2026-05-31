import { NextResponse } from 'next/server'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/cancel-feedback
 *
 * Receives an optional exit-survey response from donors who have cancelled
 * their Alpacas Ibiza adoption subscription. Data is owner-review-only —
 * nothing is sent by email; all signal lives in Vercel Function Logs.
 *
 * Body: { reason: 'price'|'forgot'|'unused'|'other', notes?: string, customerId?: string }
 *
 * - Returns 200 always (no oracle surface — caller can't tell if data was
 *   accepted or rate-limited).
 * - Rate limit: 5 req / 5 min per IP (generous — survey is post-cancel, not
 *   a form-submission vector, but still bounded against log-flood attacks).
 * - No email send. No DB write. Log only.
 */

const VALID_REASONS = ['price', 'forgot', 'unused', 'other'] as const
type Reason = typeof VALID_REASONS[number]

const GENERIC_OK = () => NextResponse.json({ ok: true }, { status: 200 })

export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('cancel-feedback', reqId)

  const ip = getClientIp(request)
  const rl = rateLimit({ key: `cancel-feedback:${ip}`, limit: 5, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    log.warn('IP rate limit hit', { ip, retryAfterSec: Math.ceil(rl.resetMs / 1000) })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  let body: { reason?: unknown; notes?: unknown; customerId?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    // Malformed body — still return 200 (no signal to caller).
    return attachRequestId(GENERIC_OK(), reqId)
  }

  const { reason, notes, customerId } = body

  // Validate reason — reject unknown values silently.
  if (!reason || !VALID_REASONS.includes(reason as Reason)) {
    log.warn('cancel-feedback: missing or invalid reason', { reason })
    return attachRequestId(GENERIC_OK(), reqId)
  }

  // Cap free-text length (log safety; no DB so only a log-flood concern).
  const safeNotes =
    typeof notes === 'string' ? notes.slice(0, 1000) : undefined

  const safeCustomerId =
    typeof customerId === 'string' ? customerId.slice(0, 64) : undefined

  log.info('cancel-feedback received', {
    reason,
    hasNotes: !!safeNotes,
    customerId: safeCustomerId ?? '(none)',
  })

  return attachRequestId(GENERIC_OK(), reqId)
}
