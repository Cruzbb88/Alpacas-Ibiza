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
// Hashed key: FNV-1a 64-bit (hex) — protects email in memory dumps.
//
// NOTE: We use a pure-JS FNV-1a hash here (not Node `crypto`) so that this
// module is safe to import from edge-runtime routes (e.g. app/og/route.tsx).
// SHA-256 via Node `crypto` would inject a Node-only module into the edge
// bundle the moment any route imports `rateLimit` or `getClientIp`.
// FNV-1a is sufficient for memory-dump anonymisation — it is NOT used for
// any security-critical purpose (HMAC / signature / key-derivation).
// ---------------------------------------------------------------------------

const globalForEmailStore = globalThis as unknown as {
  __emailRateLimitStore?: Map<string, number[]>
}
const _emailStore: Map<string, number[]> =
  globalForEmailStore.__emailRateLimitStore ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForEmailStore.__emailRateLimitStore = _emailStore
}

/**
 * FNV-1a 64-bit hash of a UTF-8 string, returned as a 16-char hex string.
 * Pure JS — no Node `crypto` dependency — works in Node, edge, and browser.
 *
 * Collision resistance is adequate for in-memory rate-limit keying; it is
 * NOT suitable for security-critical uses (signatures, HMACs, etc.).
 */
function fnv1a64Hex(input: string): string {
  // FNV-1a 64-bit constants (split into two 32-bit halves to avoid BigInt)
  let hi = 0xcbf29ce4 >>> 0
  let lo = 0x84222325 >>> 0

  for (let i = 0; i < input.length; i++) {
    const byte = input.charCodeAt(i) & 0xff
    // XOR with byte
    lo = (lo ^ byte) >>> 0
    // Multiply by FNV prime 0x00000100000001B3
    // prime_hi = 0x00000100, prime_lo = 0x000001B3
    // (hi:lo) * prime = hi*prime_lo + lo*prime_hi + carry(lo*prime_lo) : lo*prime_lo (mod 2^64)
    // The carry from the low product (high 32 bits of lo*prime_lo) must be added to tmp_hi.
    // Math.imul returns only the low 32 bits; compute carry via unsigned right-shift trick.
    const lo_x_plo = Math.imul(lo, 0x000001B3)
    // carry = high 32 bits of (lo * prime_lo). Math.imul truncates so we need the upper half.
    // Use the identity: (a * b) >>> 0 gives low 32; high 32 = floor((a * b) / 2^32).
    // Since both operands are < 2^32, the product fits in a JS number (no precision loss up to 2^53).
    const carry = Math.floor(((lo >>> 0) * 0x1B3) / 0x100000000)
    const tmp_lo = lo_x_plo >>> 0
    const tmp_hi = (Math.imul(hi, 0x000001B3) + Math.imul(lo, 0x00000100) + carry) >>> 0
    lo = tmp_lo
    hi = tmp_hi
  }

  return (hi >>> 0).toString(16).padStart(8, '0') +
         (lo >>> 0).toString(16).padStart(8, '0')
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
  const hash = fnv1a64Hex(normalized)
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
