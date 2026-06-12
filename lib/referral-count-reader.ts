/**
 * Read-only helper: count how many active Mollie subscriptions were referred
 * by a given donor (identified by their referral code stored in metadata).
 *
 * Design
 * ──────
 * - Pure read path — never mutates Mollie state.
 * - Fail-quiet: any error returns 0, never throws. The portal MUST not
 *   crash because of this optional count display.
 * - 5-minute in-process TTL cache per referralCode — the count is informational
 *   and bounded by Mollie list latency. Pattern follows subscription dashboard
 *   (app/admin/analytics/subscriptions/page.tsx — same globalThis approach).
 * - Iterates only active/pending/suspended subscriptions; skips canceled.
 *
 * Constraints
 * ───────────
 * - Does NOT import from payment-handlers.ts, email-templates.ts,
 *   payment-vendor.ts, webhook routes, or lib/db/** (parallel-Sonnet constraint).
 * - Additive export only — no existing exports modified.
 */

import type { MollieClient } from '@mollie/api-client'
import { createTtlValueStore } from './in-process-ttl-store'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** In-process TTL cache — process-scoped (ADR 001 tradeoff). Value-carrying
 *  shared store handles the TTL + globalThis-HMR survival (uft-002 unification). */
const referralCountCache = createTtlValueStore<number>({
  ttlMs: CACHE_TTL_MS,
  globalKey: '__referralCountCache',
})

/**
 * Count active Mollie subscriptions where `metadata.referredBy` matches
 * `referralCode`. Returns 0 on any error, network failure, or missing config.
 *
 * The referralCode is the 6-char HMAC-derived code from lib/referral-codes.ts.
 * It is stored in subscription metadata at checkout time under the key
 * `referredBy` (written by the checkout route when a `?ref=` param is present).
 */
export async function countReferredSubscriptions(
  referralCode: string,
  mollie: MollieClient | null,
): Promise<number> {
  if (!mollie || !referralCode) return 0

  const cached = referralCountCache.get(referralCode)
  if (cached !== undefined) return cached

  try {
    let count = 0
    // Iterate all customers and check their subscriptions.
    // Mollie has no global "list all subscriptions" endpoint, so we page
    // through customers and check each one. We bail early after scanning
    // the first 200 customers to bound latency (at €75/mo scale, 200
    // customers covers the entire realistic donor base for years).
    const CUSTOMER_CAP = 200
    const ACTIVE_STATES = new Set(['active', 'pending', 'suspended'])
    let scanned = 0
    for await (const customer of mollie.customers.iterate()) {
      if (scanned >= CUSTOMER_CAP) break
      scanned++
      try {
        for await (const sub of mollie.customerSubscriptions.iterate({
          customerId: customer.id,
        })) {
          if (!ACTIVE_STATES.has(sub.status ?? '')) continue
          const meta = sub.metadata as Record<string, string> | null | undefined
          if (meta?.referredBy === referralCode) count++
        }
      } catch {
        // One customer's subscription list failing should not abort the whole count.
        continue
      }
    }

    referralCountCache.set(referralCode, count)
    return count
  } catch (err) {
    console.warn(
      '[referral-count-reader] countReferredSubscriptions failed:',
      err instanceof Error ? err.message : String(err),
    )
    return 0
  }
}
