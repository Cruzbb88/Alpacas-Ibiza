/**
 * Unit tests for the DB read helpers consumed by the payment-events admin page
 * and the Replay route.
 *
 * Scope: pins the skip-on-no-DB contract. When DATABASE_URL is unset every
 * helper MUST return null and MUST NOT throw, so the admin events page renders
 * the activation banner and the Replay route returns 404 cleanly (instead of
 * 500).
 *
 * Tests that require a live Postgres (ordering, limit, payload round-trip) are
 * deferred to an integration suite — the build pipeline's `node --test` step
 * runs without a DB and the skip-on-no-DB contract is the only invariant the
 * unit suite can prove on its own. Same convention as
 * lib/db/read-subscriptions.test.ts and lib/db/upsert-from-webhook.test.ts.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { listRecentPaymentEvents, getPaymentEventById } from './read-events.ts'
import { __resetDbClientForTests } from './client.ts'

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL

describe('read-events — skip-on-no-DB contract', () => {
  before(() => {
    delete process.env.DATABASE_URL
    __resetDbClientForTests()
  })
  after(() => {
    if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL
    __resetDbClientForTests()
  })

  it('listRecentPaymentEvents returns null when DATABASE_URL is unset', async () => {
    const result = await listRecentPaymentEvents(100)
    assert.equal(result, null)
  })

  it('listRecentPaymentEvents does not throw on repeated calls without a DB', async () => {
    // The admin page calls this on every request; repeated invocations must
    // remain a clean null no-op (no module-state leak that would throw on the
    // second call when DATABASE_URL is unset).
    const a = await listRecentPaymentEvents(100)
    const b = await listRecentPaymentEvents(10)
    assert.equal(a, null)
    assert.equal(b, null)
  })

  it('getPaymentEventById returns null when DATABASE_URL is unset', async () => {
    const result = await getPaymentEventById('stripe_evt_anything')
    assert.equal(result, null)
  })

  it('getPaymentEventById does not throw on repeated calls without a DB', async () => {
    // The Replay route calls this once per click. A stale module-cached client
    // from a previous Lambda warm-up must not break a fresh call.
    const a = await getPaymentEventById('mollie_evt_x')
    const b = await getPaymentEventById('mollie_evt_y')
    assert.equal(a, null)
    assert.equal(b, null)
  })
})
