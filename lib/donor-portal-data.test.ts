/**
 * Tests for fetchDonorPortalData — focused on the mandate-fetch behaviour
 * added to surface SEPA / card authorisation state in the donor portal
 * (parity with N26 / Klarna / Revolut subscription tabs).
 *
 * Scope: the function must never throw on a mandate list failure. When
 * `customerMandates.page()` rejects, the result still resolves to
 * `{ ok: true, ..., mandate: null }` so the page renders subscription +
 * alpaca + a "no mandate / couldn't load" hint rather than the global
 * error state.
 *
 * The fixture mocks ONLY the Mollie SDK shape this module touches —
 * `customerSubscriptions.get` (must resolve so we reach the mandate fetch)
 * + `customers.payments.iterate` (must yield empty) + `customerMandates.page`
 * (throws by default per test brief).
 *
 * NOTE: this file is intentionally a thin smoke-test stub. Broader
 * coverage (valid mandate / revoked mandate / IBAN masking) is left to
 * follow-up work — the immediate spec ask is "mandate is null when the
 * mock Mollie client throws on customerMandates.list".
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { MollieClient } from '@mollie/api-client'
import { fetchDonorPortalData } from './donor-portal-data.ts'
import { signMollieStatusToken } from './mollie-manage-token.ts'

// ── Test doubles ─────────────────────────────────────────────────────────────

/**
 * Minimal MollieClient stand-in. The donor-portal pipeline only reaches
 * for the three binders this module narrows internally, so we only need
 * to mock those. Cast back through `unknown` at the call site so we
 * don't have to implement the full SDK surface.
 */
function makeMockMollie(overrides?: {
  mandatesThrow?: boolean
  paymentsIterateEmpty?: boolean
}): MollieClient {
  const mandatesThrow = overrides?.mandatesThrow ?? true
  const paymentsIterateEmpty = overrides?.paymentsIterateEmpty ?? true

  const mock = {
    customerSubscriptions: {
      // Resolve with a minimal Subscription shape — the donor-portal narrows
      // to MollieSubscription internally, so missing fields are OK.
      get: async (_subId: string, _opts: { customerId: string }) => ({
        id: 'sub_test_abc',
        status: 'active',
        amount: { value: '75.00', currency: 'EUR' },
        interval: '1 month',
        description: 'Adopt-a-Paca — monthly',
        createdAt: '2026-01-01T00:00:00.000Z',
        metadata: { tier: 'monthly' },
      }),
    },
    customers: {
      payments: {
        iterate: (_opts: { customerId: string }): AsyncIterable<unknown> => ({
          [Symbol.asyncIterator]() {
            return {
              next: async () => {
                return paymentsIterateEmpty
                  ? { value: undefined, done: true as const }
                  : { value: undefined, done: true as const }
              },
            }
          },
        }),
      },
    },
    customerMandates: {
      // The whole point of this test: throw to assert fail-quiet behaviour.
      page: async (_opts: { customerId: string }) => {
        if (mandatesThrow) {
          throw new Error('test: mollie mandates list failed')
        }
        return []
      },
    },
  }
  return mock as unknown as MollieClient
}

// Ensure a signing key is available so signMollieStatusToken works in tests.
// NEXTAUTH_SECRET is the Tier-1 fallback per CLAUDE.md.
if (!process.env.NEXTAUTH_SECRET && !process.env.NEWSLETTER_SIGNING_KEY) {
  process.env.NEXTAUTH_SECRET = 'test-secret-not-for-production'
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('fetchDonorPortalData — mandate', () => {
  it('returns mandate: null when customerMandates.page() throws (fail-quiet)', async () => {
    const token = signMollieStatusToken('cst_test_xyz', 'sub_test_abc')
    const mollie = makeMockMollie({ mandatesThrow: true })

    const result = await fetchDonorPortalData(token, mollie)

    assert.equal(result.ok, true, 'should still succeed even when mandate fetch throws')
    if (result.ok) {
      assert.equal(
        result.mandate,
        null,
        'mandate must be null when the Mollie client throws on customerMandates list',
      )
      // Sanity check: the rest of the view-model is still populated so
      // the page renders subscription + actions rather than the global
      // error state.
      assert.equal(result.subscription.id, 'sub_test_abc')
      assert.equal(result.subscription.status, 'active')
    }
  })
})
