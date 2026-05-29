/**
 * Shared subscription-fetch + token-verify pipeline for the donor portal
 * surfaces (legacy /api/mollie-manage/status HTML route + new React page at
 * /[locale]/my-adoption).
 *
 * Both consumers need to:
 *   1. Verify a status-scoped token
 *   2. Fetch the Mollie subscription
 *   3. Mint short-TTL action-scoped tokens (cancel / update-payment) so the
 *      donor can click through without re-verifying the email link
 *   4. Look up the linked alpaca's display data
 *   5. Read the latest quarterly farm-news content (donors see what was
 *      most recently sent to all adopters)
 *
 * Returning ONE shape from one function means a fix to the fetch logic (e.g.
 * cancelledAt date parsing) lands in both surfaces simultaneously.
 *
 * Read-only contract — never mutates Mollie state. Callers may render the
 * result however they like (HTML, React, JSON).
 */

import type { MollieClient } from '@mollie/api-client'
import { verifyMollieStatusToken, signMollieCancelToken, signMollieUpdatePaymentToken } from './mollie-manage-token.ts'
import { getFailureCount } from './payment-failure-tracker.ts'
import { findAlpacaName } from './data/alpacas.ts'
import { listQuarterlyContent } from './quarterly-content-store.ts'

export type DonorPortalResult =
  | { ok: false; reason: 'no-token' | 'expired' | 'sdk-missing' | 'fetch-failed'; message: string }
  | {
      ok: true
      customerId: string
      subscriptionId: string
      subscription: {
        id: string
        status: string
        amount: { value: string; currency: string } | null
        interval: string | null
        description: string | null
        nextPaymentDate: string | null
        createdAt: string | null
        canceledAt: string | null
        tier: string | null
        alpacaSlug: string | null
      }
      /** Resolved display name of the adopted alpaca, null when not picked. */
      alpacaDisplayName: string | null
      /** Consecutive Mollie payment failures for this customer (process-scoped). */
      failureCount: number
      /** Fresh 1h-TTL cancel-scoped token URL-encoded for href use. */
      cancelToken: string | null
      /** Fresh 1h-TTL update-payment-scoped token URL-encoded for href use. */
      updateToken: string | null
      /** True when the subscription is in a state the donor can still act on. */
      isLive: boolean
      /** Latest quarterly farm-news HTML the owner has composed, or null. */
      latestQuarter: { label: string; newsHtml: string; sentAt: string | null } | null
      /**
       * Recent Mollie payments for this customer, newest-first, capped at
       * MAX_PAYMENT_HISTORY (24 ≈ last 2 years of monthly charges).
       *
       * Fail-quiet: iteration errors return [] + console.warn — the portal
       * still renders the rest of the view-model. Empty array is also the
       * shape returned when the customer has no recorded payments yet
       * (first charge mid-flight); UI shows a friendly empty state.
       */
      paymentHistory: Array<{
        id: string
        amount: { value: string; currency: string }
        status: string
        paidAt: string | null
        method: string | null
      }>
    }

/** Internal Mollie SDK shape — narrowed to what we read. */
type MollieSubscription = {
  id: string
  status?: string
  amount?: { value: string; currency: string }
  interval?: string
  description?: string
  nextPaymentDate?: string
  createdAt?: string
  canceledAt?: string | Date
  metadata?: { tier?: string; alpaca?: string }
}

/** Narrow shape of the Mollie Payment resource we render. */
type MolliePaymentRow = {
  id: string
  status?: string
  amount?: { value: string; currency: string }
  paidAt?: string | Date | null
  method?: string | null
}

/**
 * Cap at 24 ≈ 2 years of monthly charges. Donors who want a longer ledger
 * are referred to support — keeps the portal lightweight and the table
 * scannable. See PaymentHistoryTable's "+ N earlier charges" affordance.
 */
const MAX_PAYMENT_HISTORY = 24

/**
 * Iterate Mollie payments for a customer, newest-first, fail-quiet.
 *
 * Never throws: the donor portal must still render the subscription + alpaca
 * even if payment history is unavailable. Mollie's iterate() yields
 * AsyncIterable<Payment>; we break after 24 to bound memory.
 *
 * NOTE: payment IDs are not logged on the success path. On error we log only
 * the error message + customerId (already part of the verified portal token —
 * not a new disclosure). If future logging needs payment IDs, route them
 * through a masking helper (see lib/log-pii.ts when introduced).
 */
async function fetchPaymentHistory(
  mollie: MollieClient,
  customerId: string,
): Promise<Array<{ id: string; amount: { value: string; currency: string }; status: string; paidAt: string | null; method: string | null }>> {
  try {
    // Mollie SDK exposes `customers.payments.iterate({ customerId })`.
    // Cast through unknown — the SDK's iterator generics don't expose
    // the per-call options cleanly, but the shape is documented and
    // covered by the SDK-shape rule in CLAUDE.md (we narrow what we read).
    const iter = (mollie as unknown as {
      customers: {
        payments: {
          iterate: (opts: { customerId: string }) => AsyncIterable<MolliePaymentRow>
        }
      }
    }).customers.payments.iterate({ customerId })

    const rows: MolliePaymentRow[] = []
    for await (const p of iter) {
      rows.push(p)
      if (rows.length >= MAX_PAYMENT_HISTORY) break
    }

    return rows
      .map((p) => {
        const paidAtIso =
          p.paidAt instanceof Date
            ? p.paidAt.toISOString()
            : typeof p.paidAt === 'string'
              ? p.paidAt
              : null
        return {
          id: p.id,
          amount: p.amount ?? { value: '0.00', currency: 'EUR' },
          status: p.status ?? 'unknown',
          paidAt: paidAtIso,
          method: p.method ?? null,
        }
      })
      .sort((a, b) => {
        // Newest first; rows without paidAt (pending/failed) sort to the top
        // so donors see live state above settled history.
        if (a.paidAt === null && b.paidAt === null) return 0
        if (a.paidAt === null) return -1
        if (b.paidAt === null) return 1
        return b.paidAt.localeCompare(a.paidAt)
      })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[donor-portal] payment history iterate failed for customer', customerId, message)
    return []
  }
}

/**
 * Verify a status-scoped token, fetch the subscription, and assemble the
 * portal view-model. Never throws — every failure mode returns a structured
 * `{ ok: false, reason }` so the caller can render the right error UI.
 *
 * Mints short-TTL (1h) action tokens because the donor is reading the portal
 * RIGHT NOW; if they're going to cancel or update payment they'll do it in
 * this session, not park the link in a tab for a week.
 */
export async function fetchDonorPortalData(
  rawToken: string | null,
  mollie: MollieClient | null,
): Promise<DonorPortalResult> {
  if (!rawToken) {
    return { ok: false, reason: 'no-token', message: 'This portal link is missing the token.' }
  }
  const payload = verifyMollieStatusToken(rawToken)
  if (!payload) {
    return { ok: false, reason: 'expired', message: 'This portal link has expired (status links are valid for 7 days).' }
  }
  if (!mollie) {
    return { ok: false, reason: 'sdk-missing', message: 'Payment system is starting up — please try again in a minute.' }
  }

  let sub: MollieSubscription
  try {
    const fetched = await mollie.customerSubscriptions.get(payload.subscriptionId, {
      customerId: payload.customerId,
    })
    sub = fetched as unknown as MollieSubscription
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, reason: 'fetch-failed', message }
  }

  const status = sub.status ?? 'unknown'
  const isLive = status === 'active' || status === 'pending' || status === 'suspended'
  const oneHourMs = 60 * 60 * 1000

  const canceledAtIso =
    sub.canceledAt instanceof Date
      ? sub.canceledAt.toISOString()
      : typeof sub.canceledAt === 'string'
        ? sub.canceledAt
        : null

  const alpacaSlug = sub.metadata?.alpaca ?? null
  const alpacaDisplayName = findAlpacaName(alpacaSlug)

  const failureCount = getFailureCount('mollie', payload.customerId)

  // Latest composed quarterly content — sorted newest first by the store.
  // Donors see the most recent farm update on their portal even if it
  // hasn't been emailed out yet (gives them a sneak preview).
  const allQuarters = listQuarterlyContent()
  const latest = allQuarters[0] ?? null
  const latestQuarter = latest
    ? { label: latest.quarter, newsHtml: latest.newsHtml, sentAt: latest.sentAt }
    : null

  // Payment history — fail-quiet. Skip the call entirely when customerId is
  // missing (token-payload corruption); empty array is a valid render state.
  const paymentHistory = payload.customerId
    ? await fetchPaymentHistory(mollie, payload.customerId)
    : []

  return {
    ok: true,
    customerId: payload.customerId,
    subscriptionId: payload.subscriptionId,
    subscription: {
      id: sub.id,
      status,
      amount: sub.amount ?? null,
      interval: sub.interval ?? null,
      description: sub.description ?? null,
      nextPaymentDate: sub.nextPaymentDate ?? null,
      createdAt: sub.createdAt ?? null,
      canceledAt: canceledAtIso,
      tier: sub.metadata?.tier ?? null,
      alpacaSlug,
    },
    alpacaDisplayName,
    failureCount,
    cancelToken: isLive
      ? encodeURIComponent(signMollieCancelToken(payload.customerId, payload.subscriptionId, oneHourMs))
      : null,
    updateToken: isLive
      ? encodeURIComponent(signMollieUpdatePaymentToken(payload.customerId, payload.subscriptionId, oneHourMs))
      : null,
    isLive,
    latestQuarter,
    paymentHistory,
  }
}
