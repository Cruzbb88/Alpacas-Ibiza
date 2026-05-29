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
      /**
       * Current Mollie mandate for the donor — surfaces SEPA / card authorisation
       * state so donors learn about a revoked mandate BEFORE a charge fails
       * (parity with N26 / Klarna / Revolut). null when no mandate exists OR the
       * Mollie list call failed (fail-quiet — UI renders a "couldn't load" hint).
       * `bankAccount` masked to last 4 chars (PII).
       */
      mandate: {
        id: string
        status: string
        method: string | null
        signatureDate: string | null
        bankAccount: string | null
      } | null
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

/** Narrow shape of the Mollie Mandate resource we read. Matches SDK types
 *  but reduced to the fields we surface in the portal. `details` is a union
 *  of direct-debit / credit-card / paypal shapes — we read all three keys
 *  conditionally and let the absent ones fall through to null. */
type MollieMandateRow = {
  id: string
  status?: string
  method?: string | null
  signatureDate?: string | null
  details?: {
    consumerAccount?: string
    consumerName?: string
    cardLabel?: string | null
    cardNumber?: string
  } | null
}

/**
 * Fetch the donor's current Mollie mandate, fail-quiet.
 *
 * Returns the most-recent VALID mandate when one exists, otherwise the
 * most-recent mandate of any status (so revoked / pending state still
 * surfaces in the UI — that's the whole point: tell donors BEFORE the
 * next charge fails). Returns null when:
 *   - The customer has zero mandates on file
 *   - The Mollie API call throws (network, auth, SDK shape drift)
 *
 * NEVER throws. The donor portal must still render subscription + alpaca
 * even if mandate state is unavailable; the page renders a "couldn't load
 * mandate" hint when this returns null.
 *
 * Account masking: SEPA `consumerAccount` is a full IBAN — we expose ONLY
 * the last 4 characters (e.g. "1234"). Card numbers are already masked by
 * Mollie (e.g. "•••• 1234") and pass through as-is.
 */
async function fetchCurrentMandate(
  mollie: MollieClient,
  customerId: string,
): Promise<{ id: string; status: string; method: string | null; signatureDate: string | null; bankAccount: string | null } | null> {
  try {
    // SDK exposes `customerMandates.page({ customerId })` — newest-first,
    // paginated. We only need the first page (any donor with >250 mandates
    // is an edge case we don't need to optimise for; their newest is on
    // page 1 regardless). Cast through unknown so the dynamic-import +
    // missing-package fallback still compiles when @mollie/api-client is
    // absent (mirrors fetchPaymentHistory's pattern).
    const binder = (mollie as unknown as {
      customerMandates: {
        page: (opts: { customerId: string }) => Promise<MollieMandateRow[]>
      }
    }).customerMandates

    const page = await binder.page({ customerId })
    if (!Array.isArray(page) || page.length === 0) return null

    // Prefer the most-recent VALID mandate — that's the one Mollie will
    // actually charge against. Fall back to the most-recent overall (which
    // may be `pending` or `invalid`/`revoked`) so revoked state still
    // shows up in the UI rather than being silently hidden.
    const chosen = page.find((m) => m.status === 'valid') ?? page[0]
    if (!chosen) return null

    // Mask the bank account: IBAN → last 4 chars only. Mollie already
    // masks card numbers server-side (e.g. "•••• 1234"); we let those pass.
    let bankAccount: string | null = null
    const iban = chosen.details?.consumerAccount
    const cardMasked = chosen.details?.cardNumber
    if (typeof iban === 'string' && iban.length >= 4) {
      bankAccount = iban.slice(-4)
    } else if (typeof cardMasked === 'string' && cardMasked.length > 0) {
      bankAccount = cardMasked
    }

    return {
      id: chosen.id,
      status: chosen.status ?? 'unknown',
      method: chosen.method ?? null,
      signatureDate: chosen.signatureDate ?? null,
      bankAccount,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[donor-portal] customerMandates fetch failed for customer', customerId, message)
    return null
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

  // Mandate state — fail-quiet, null on no-mandate OR fetch error.
  // Surfaces SEPA / card authorisation state ahead of the next charge so
  // donors can re-mandate BEFORE a failure (parity with N26 / Klarna /
  // Revolut subscription tab).
  const mandate = payload.customerId
    ? await fetchCurrentMandate(mollie, payload.customerId)
    : null

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
    mandate,
    latestQuarter,
    paymentHistory,
  }
}
