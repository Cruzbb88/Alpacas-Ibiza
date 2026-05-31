/**
 * getLatestAdopters — returns the most recent N adopters for the /adopt
 * adopters-wall component.
 *
 * Privacy: first name only. Full name is never exposed.
 * Capped at 8 rows (LATEST_CAP).
 *
 * Data sourced from:
 *   - Stripe: customer.name from `customer_details` on completed checkout sessions.
 *     metadata.alpaca carries the alpaca slug (optional — donor may not have picked one).
 *   - Mollie: payment.metadata.donorName (set at checkout creation); metadata.alpaca
 *     is the alpaca slug.
 *
 * Returns empty array when:
 *   - PAYMENT_VENDOR unset / unconfigured
 *   - SDK not installed (dynamic import fails)
 *   - Network / API error (fail-quiet)
 *
 * Same 1-hour in-memory cache + globalThis singleton pattern as lib/adopters/count.ts.
 * Never throws — always resolves.
 */

import { makeRequestLogger } from '../request-id.ts'
import { findAlpacaName } from '../data/alpacas.ts'

const log = makeRequestLogger('adopter-latest', '')

export const LATEST_CAP = 8

export interface LatestAdopter {
  /** First name only (privacy — full name is never stored or transmitted). */
  firstName: string
  /**
   * Display name of the adopted alpaca, resolved from the canonical roster.
   * null when the donor did not pick one, or when the stored slug is unknown.
   */
  alpacaName: string | null
}

export interface LatestAdoptersResult {
  latest: LatestAdopter[]
  /** 'stripe' | 'mollie' | 'unconfigured' | 'error' */
  source: string
}

// ── In-memory cache (1 hour, same pattern as count.ts) ────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000

const globalForCache = globalThis as unknown as {
  __adopterLatestCache?: Map<string, { value: LatestAdoptersResult; at: number }>
}
const _cache: Map<string, { value: LatestAdoptersResult; at: number }> =
  globalForCache.__adopterLatestCache ?? new Map()
if (process.env.NODE_ENV !== 'production') {
  globalForCache.__adopterLatestCache = _cache
}

function getCached(key: string): LatestAdoptersResult | null {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    _cache.delete(key)
    return null
  }
  return entry.value
}

function setCached(key: string, value: LatestAdoptersResult): void {
  _cache.set(key, { value, at: Date.now() })
}

// ── First-name extraction ─────────────────────────────────────────────────

/** Extracts the first word of a full name, trimmed. Returns null if blank. */
function toFirstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null
  const first = fullName.trim().split(/\s+/)[0]
  return first || null
}

// ── Stripe path ───────────────────────────────────────────────────────────

async function latestStripe(): Promise<LatestAdoptersResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return { latest: [], source: 'unconfigured' }
  }

  const { importStripe } = await import('../integrations/stripe-sdk.ts')
  const stripeFactory = await importStripe()
  if (!stripeFactory) {
    log.error('[adopter-latest] stripe SDK not installed.')
    return { latest: [], source: 'error' }
  }

  const stripe = stripeFactory(secretKey, { apiVersion: '2024-06-20' })

  // Fetch the most recent completed checkout sessions with adopt metadata.
  // Stripe sorts by created desc by default — most recent first.
  // We over-fetch (32) to account for sessions without a name, then cap at LATEST_CAP.

  interface SessionLike {
    customer_details?: { name?: string | null } | null
    metadata?: { alpaca?: string | null } | null
  }

  const sessions = await stripe.checkout.sessions.list({
    limit: 32,
    status: 'complete',
  }) as { data: SessionLike[] }

  const latest: LatestAdopter[] = []
  for (const session of sessions.data) {
    if (latest.length >= LATEST_CAP) break
    const firstName = toFirstName(session.customer_details?.name)
    if (!firstName) continue
    const alpacaSlug = session.metadata?.alpaca ?? null
    const alpacaName = alpacaSlug ? findAlpacaName(alpacaSlug) : null
    latest.push({ firstName, alpacaName })
  }

  return { latest, source: 'stripe' }
}

// ── Mollie path ───────────────────────────────────────────────────────────

async function latestMollie(): Promise<LatestAdoptersResult> {
  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) {
    return { latest: [], source: 'unconfigured' }
  }

  const { getMollieClient } = await import('../integrations/payment-mollie.ts')
  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    log.error('[adopter-latest] @mollie/api-client not installed.')
    return { latest: [], source: 'error' }
  }

  // Iterate recent paid payments. Mollie payments are sorted newest first.
  // metadata.donorName is set by lib/integrations/payment-mollie.ts at
  // checkout creation. metadata.alpaca is the alpaca slug.
  type MolliePaymentRaw = {
    status?: string
    metadata?: {
      donorName?: string | null
      alpaca?: string | null
    } | null
  }

  const iter = (mollie as unknown as {
    payments: { iterate: () => AsyncIterable<MolliePaymentRaw> }
  }).payments.iterate()

  const latest: LatestAdopter[] = []
  let scanned = 0
  const SCAN_CAP = 200 // bound the iteration; most recent paid ones will be early

  for await (const raw of iter) {
    scanned++
    if (scanned > SCAN_CAP) break
    if (latest.length >= LATEST_CAP) break
    if (raw.status !== 'paid') continue
    const firstName = toFirstName(raw.metadata?.donorName)
    if (!firstName) continue
    const alpacaSlug = raw.metadata?.alpaca ?? null
    const alpacaName = alpacaSlug ? findAlpacaName(alpacaSlug) : null
    latest.push({ firstName, alpacaName })
  }

  return { latest, source: 'mollie' }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Returns up to LATEST_CAP recent adopters (first name + alpaca name).
 * Always resolves — never throws. Empty array on unconfigured/error.
 */
export async function getLatestAdopters(): Promise<LatestAdoptersResult> {
  const vendor = process.env.PAYMENT_VENDOR ?? ''
  if (!vendor) {
    return { latest: [], source: 'unconfigured' }
  }

  const cacheKey = `latest:${vendor}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  let result: LatestAdoptersResult
  try {
    if (vendor === 'stripe') {
      result = await latestStripe()
    } else if (vendor === 'mollie') {
      result = await latestMollie()
    } else {
      result = { latest: [], source: 'unconfigured' }
    }
  } catch (err) {
    log.error('[adopter-latest] Unexpected error:', { err: String(err) })
    result = { latest: [], source: 'error' }
  }

  if (result.source === 'stripe' || result.source === 'mollie') {
    setCached(cacheKey, result)
  }

  return result
}

/** @internal — for tests only. */
export function __resetAdopterLatestCache(): void {
  _cache.clear()
}
