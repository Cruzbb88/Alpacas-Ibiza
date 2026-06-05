/**
 * In-memory sliding-window rate limiter. Process-scoped (lost on cold start —
 * acceptable for current traffic volume; upgrade to Redis/Vercel KV when
 * volume justifies, see ADR 001 for the same pattern around scheduled emails).
 *
 * Usage:
 *   const result = rateLimit({ key: ip, limit: 5, windowMs: 60_000 })
 *   if (!result.allowed) return 429 with Retry-After header
 */

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number // ms until window reset
}

// Map<key, timestamps[]> — push current ts, filter out anything older than windowMs,
// check length vs limit.
type RateLimitStore = Map<string, number[]>

// Singleton — global so it survives HMR in dev (same pattern as booking-schedule-store.ts)
const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore?: RateLimitStore
}

const store: RateLimitStore =
  globalForRateLimit.__rateLimitStore ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.__rateLimitStore = store
}

/** Extract the best-effort client IP from a Next.js Request. */
export function getClientIp(request: Request): string {
  // Vercel appends the real client IP as the RIGHTMOST value; [0] is client-forgeable, .at(-1) is infra-appended.
  // cf-connecting-ip still takes precedence (set by Cloudflare, not spoofable from origin).
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
    'unknown'
  )
}

// ---------------------------------------------------------------------------
// Per-email rate-limit store (parallel to IP store — do not merge)
//
// Email rate-limit policy: 3 subscribes per 24 h per address.
// Rationale: legitimate humans don't re-subscribe the same address; bot
// rotation across IPs still hits the same email and gets blocked.
// Hashed key: SHA-256 first 16 hex chars — protects email in memory dumps.
// ---------------------------------------------------------------------------
import { createHash } from 'crypto'

const globalForEmailStore = globalThis as unknown as {
  __emailRateLimitStore?: Map<string, number[]>
}
const _emailStore: Map<string, number[]> =
  globalForEmailStore.__emailRateLimitStore ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForEmailStore.__emailRateLimitStore = _emailStore
}

export interface EmailRateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

export function rateLimitByEmail(opts: {
  email: string
  limit?: number      // default 3
  windowMs?: number   // default 24 h
}): EmailRateLimitResult {
  const limit = opts.limit ?? 3
  const windowMs = opts.windowMs ?? 24 * 60 * 60 * 1000
  const normalized = opts.email.trim().toLowerCase()
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16)
  const key = `email:${hash}`
  const now = Date.now()
  const cutoff = now - windowMs

  const existing = (_emailStore.get(key) ?? []).filter((ts) => ts > cutoff)
  if (existing.length >= limit) {
    const oldest = existing[0]
    return { allowed: false, remaining: 0, resetMs: oldest + windowMs - now }
  }

  existing.push(now)
  _emailStore.set(key, existing)
  return {
    allowed: true,
    remaining: limit - existing.length,
    resetMs: windowMs,
  }
}

/** @internal — for tests only */
export function __resetEmailRateLimit() {
  _emailStore.clear()
}

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  // Get existing timestamps for this key, filtered to the current window
  const timestamps = (store.get(key) ?? []).filter((ts) => ts > windowStart)

  if (timestamps.length >= limit) {
    // Oldest timestamp in the window determines when the slot frees up
    const oldestInWindow = timestamps[0]
    const resetMs = oldestInWindow + windowMs - now
    return { allowed: false, remaining: 0, resetMs }
  }

  // Record this request
  timestamps.push(now)
  store.set(key, timestamps)

  return {
    allowed: true,
    remaining: limit - timestamps.length,
    resetMs: windowMs,
  }
}
