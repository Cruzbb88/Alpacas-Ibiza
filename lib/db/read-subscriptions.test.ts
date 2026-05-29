/**
 * Unit tests for the DB read helpers consumed by the admin analytics pages.
 *
 * Scope: pins the skip-on-no-DB contract. When DATABASE_URL is unset every
 * helper MUST return null and MUST NOT throw, so the admin subscriptions
 * dashboard falls back cleanly to the existing Mollie-iteration code path.
 *
 * Tests that require a live Postgres (real JOIN semantics, soft-delete
 * filtering, ordering) are deferred to an integration suite that spins up a
 * transient Postgres container. The build pipeline's `node --test` step runs
 * without a DB, and the skip-on-no-DB contract is the only invariant the unit
 * suite can prove on its own.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { listActiveSubscriptionsFromDb } from './read-subscriptions.ts'
import { __resetDbClientForTests } from './client.ts'

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL

describe('read-subscriptions — skip-on-no-DB contract', () => {
  before(() => {
    delete process.env.DATABASE_URL
    __resetDbClientForTests()
  })
  after(() => {
    if (ORIGINAL_DATABASE_URL === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = ORIGINAL_DATABASE_URL
    __resetDbClientForTests()
  })

  it('listActiveSubscriptionsFromDb returns null when DATABASE_URL is unset', async () => {
    const result = await listActiveSubscriptionsFromDb()
    assert.equal(result, null)
  })

  it('listActiveSubscriptionsFromDb does not throw when called repeatedly without a DB', async () => {
    // The admin page calls this on every request; repeated invocations must
    // remain a clean null no-op (no module-state leak that would throw on the
    // second call when DATABASE_URL is unset).
    const a = await listActiveSubscriptionsFromDb()
    const b = await listActiveSubscriptionsFromDb()
    assert.equal(a, null)
    assert.equal(b, null)
  })
})
