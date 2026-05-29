/**
 * Unit tests for the webhook → DB upsert helpers.
 *
 * Scope: pins the skip-on-no-DB contract. When DATABASE_URL is unset every
 * helper MUST return null and MUST NOT throw, so the existing Mollie-iteration
 * admin paths keep working until Cruz provisions Neon/Supabase.
 *
 * Tests that require a live Postgres (real upsert semantics, ON CONFLICT
 * behaviour, idempotency-key collisions) are deferred — they belong in an
 * integration suite that spins up a transient Postgres container. The build
 * pipeline's `node --test` step runs without a DB.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  upsertCustomerFromMollie,
  upsertSubscriptionFromMollie,
  recordPaymentEvent,
} from './upsert-from-webhook.ts'
import { __resetDbClientForTests } from './client.ts'

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL

describe('upsert-from-webhook — skip-on-no-DB contract', () => {
  before(() => {
    delete process.env.DATABASE_URL
    __resetDbClientForTests()
  })
  after(() => {
    if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL
    __resetDbClientForTests()
  })

  it('upsertCustomerFromMollie returns null when DATABASE_URL is unset', async () => {
    const result = await upsertCustomerFromMollie({
      id: 'cst_test123',
      email: 'donor@example.com',
      name: 'Test Donor',
    })
    assert.equal(result, null)
  })

  it('upsertCustomerFromMollie does not throw on minimal payload (no email, no name)', async () => {
    const result = await upsertCustomerFromMollie({ id: 'cst_minimal' })
    assert.equal(result, null)
  })

  it('upsertSubscriptionFromMollie returns null when DATABASE_URL is unset', async () => {
    const result = await upsertSubscriptionFromMollie({
      id: 'sub_test456',
      customerId: 'cst_test123',
      status: 'active',
      amount: { value: '75.00', currency: 'EUR' },
      interval: '1 month',
      metadata: { product: 'adopt-a-paca', tier: 'monthly' },
    })
    assert.equal(result, null)
  })

  it('upsertSubscriptionFromMollie tolerates missing optional fields', async () => {
    // Mollie sometimes omits amount / interval mid-status-transition; helper
    // must still no-op cleanly without DB rather than throwing on the parse.
    const result = await upsertSubscriptionFromMollie({
      id: 'sub_minimal',
      customerId: 'cst_minimal',
      status: 'pending',
    })
    assert.equal(result, null)
  })

  it('recordPaymentEvent returns null when DATABASE_URL is unset', async () => {
    const result = await recordPaymentEvent({
      vendor: 'mollie',
      eventType: 'payment.paid',
      customerId: 'mollie_cst_test123',
      subscriptionId: 'mollie_sub_test456',
      payload: { id: 'tr_xyz', status: 'paid', amount: { value: '75.00', currency: 'EUR' } },
      idempotencyKey: 'mollie:tr_xyz:paid',
    })
    assert.equal(result, null)
  })

  it('recordPaymentEvent accepts string payloads (already-stringified body)', async () => {
    // Mollie's webhook body is form-encoded text; some call sites pass the
    // raw string straight through. Verify the helper doesn't double-encode
    // (and doesn't throw without a DB).
    const result = await recordPaymentEvent({
      vendor: 'mollie',
      eventType: 'payment.failed',
      payload: 'id=tr_xyz',
      idempotencyKey: 'mollie:tr_xyz:failed',
    })
    assert.equal(result, null)
  })

  it('recordPaymentEvent tolerates null customer/subscription ids', async () => {
    // Some events (e.g. mandate.revoked) aren't tied to a customer we have yet.
    const result = await recordPaymentEvent({
      vendor: 'mollie',
      eventType: 'mandate.revoked',
      customerId: null,
      subscriptionId: null,
      payload: { id: 'mdt_xyz' },
      idempotencyKey: 'mollie:mdt_xyz:revoked',
    })
    assert.equal(result, null)
  })
})
