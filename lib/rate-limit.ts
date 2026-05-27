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
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
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
