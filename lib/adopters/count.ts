/**
 * getActiveAdopterCount — shared helper for the adopt-count API route
 * and the adopt page (direct server-side call, no HTTP roundtrip).
 *
 * Returns the number of active subscriptions from the configured payment
 * vendor. On any error or missing configuration, returns 0 with a `source`
 * descriptor so callers can fail-quiet.
 *
 * Cache: module-level Map keyed by vendor name, 1-hour TTL.
 * Same in-memory pattern as lib/webhook-idempotency.ts — process-scoped,
 * acceptable for a public counter that degrades gracefully on cold starts.
 *
 * PAYMENT_VENDOR unset → { count: 0, source: 'unconfigured' }
 * PAYMENT_VENDOR=stripe, STRIPE_SECRET_KEY unset → { count: 0, source: 'unconfigured' }
 * PAYMENT_VENDOR=mollie, MOLLIE_API_KEY unset → { count: 0, source: 'unconfigured' }
 * Any SDK / network error → { count: 0, source: 'error' } + console.error
 */

import { makeRequestLogger } from '../request-id.ts'

const log = makeRequestLogger('adopter-count', '')

export interface AdopterCountResult {
  count: number
  /** 'stripe' | 'mollie' | 'unconfigured' | 'error' */
  source: string
}

// --- in-memory 1-hour cache -------------------------------------------
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

const globalForCache = globalThis as unknown as {
  __adopterCountCache?: Map<string, { value: AdopterCountResult; at: number }>
}
const _cache: Map<string, { value: AdopterCountResult; at: number }> =
  globalForCache.__adopterCountCache ?? new Map()
// Dev-mode: share across Next.js hot-reload cycles (same pattern as webhook-idempotency.ts)
if (process.env.NODE_ENV !== 'production') {
  globalForCache.__adopterCountCache = _cache
}

function getCached(key: string): AdopterCountResult | null {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    _cache.delete(key)
    return null
  }
  return entry.value
}

function setCached(key: string, value: AdopterCountResult): void {
  _cache.set(key, { value, at: Date.now() })
}

// --- vendor helpers ---------------------------------------------------

async function countStripe(): Promise<AdopterCountResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    log.warn('[adopter-count] STRIPE_SECRET_KEY unset — returning 0.')
    return { count: 0, source: 'unconfigured' }
  }

  // Dynamic import mirrors payment-stripe-direct.ts / stripe-sdk.ts pattern.
  const { importStripe } = await import('../integrations/stripe-sdk.ts')
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('[adopter-count] stripe SDK not installed.')
    return { count: 0, source: 'error' }
  }

  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // Paginate through all active subscriptions. Capped at 1000 to bound
  // latency and memory. Matches the Mollie path's 500-row cap style.
  let count = 0
  const MAX_COUNT = 1000
  for await (const _sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
    count++
    if (count >= MAX_COUNT) break
  }
  return { count, source: 'stripe' }
}

async function countMollie(): Promise<AdopterCountResult> {
  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) {
    log.warn('[adopter-count] MOLLIE_API_KEY unset — returning 0.')
    return { count: 0, source: 'unconfigured' }
  }

  const { getMollieClient } = await import('../integrations/payment-mollie.ts')
  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('[adopter-count] @mollie/api-client not installed.')
    return { count: 0, source: 'error' }
  }

  // Use the top-level subscriptions.iterate() — same approach as the admin
  // subscriptions page (app/admin/analytics/subscriptions/page.tsx). We only
  // count `active` (+ `pending`) ones. Cap at 500 rows to bound latency.
  type SubRaw = { status?: string }
  const iter = (mollie as unknown as {
    subscriptions: { iterate: () => AsyncIterable<SubRaw> }
  }).subscriptions.iterate()

  const CAP = 500
  let count = 0
  let i = 0
  for await (const raw of iter) {
    i++
    if (i > CAP) break
    const status = raw.status ?? ''
    if (status === 'active' || status === 'pending') count++
  }
  return { count, source: 'mollie' }
}

// --- public API -------------------------------------------------------

/**
 * Returns the number of active adopters for the configured payment vendor.
 * Result is cached 1 hour per process. Always resolves — never throws.
 *
 * @example
 * ```ts
 * const { count } = await getActiveAdopterCount()
 * ```
 */
export async function getActiveAdopterCount(): Promise<AdopterCountResult> {
  const vendor = process.env.PAYMENT_VENDOR ?? ''

  if (!vendor) {
    return { count: 0, source: 'unconfigured' }
  }

  const cacheKey = vendor
  const cached = getCached(cacheKey)
  if (cached) return cached

  let result: AdopterCountResult
  try {
    if (vendor === 'stripe') {
      result = await countStripe()
    } else if (vendor === 'mollie') {
      result = await countMollie()
    } else {
      // Unknown vendor (e.g. 'mailto', 'fareharbor-passthrough') — not an error,
      // just unconfigured for subscription counting.
      result = { count: 0, source: 'unconfigured' }
    }
  } catch (err) {
    log.error('[adopter-count] Unexpected error:', { err: String(err) })
    result = { count: 0, source: 'error' }
  }

  // Only cache successful/configured results; unconfigured and errors are
  // cheap re-checks and shouldn't be locked in for an hour.
  if (result.source === 'stripe' || result.source === 'mollie') {
    setCached(cacheKey, result)
  }

  return result
}

/** @internal — for tests only. */
export function __resetAdopterCountCache(): void {
  _cache.clear()
}
