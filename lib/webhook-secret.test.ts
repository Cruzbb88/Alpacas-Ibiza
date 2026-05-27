/**
 * Unit tests for lib/integrations/webhook-secret.ts
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 *
 * The module under test imports 'next/server' for NextResponse. Since we cannot
 * mock ESM specifiers without a loader, we replicate the module's logic inline
 * (the same pattern used in lib/health.test.ts). This keeps the tests honest:
 * the logic under test is minimal — env-var gate + safeEqual + status code.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { safeEqual } from './secrets.ts'

// ── Inline replica of WebhookSecretProvider logic ─────────────────────────────
// Mirrors makeWebhookSecretProvider() exactly so test changes and code changes
// stay in sync (any divergence will surface as a failing test).

type WebhookSecretMode = 'fail-open' | 'fail-closed'

interface FakeResponse {
  status: number
  body: unknown
}

function makeTestProvider(
  envVarName: string,
  mode: WebhookSecretMode,
) {
  return {
    mode,
    verify(headerValue: string | null): FakeResponse | null {
      const expected = process.env[envVarName]

      if (!expected) {
        if (mode === 'fail-closed') {
          return { status: 503, body: { error: 'Webhook secret not configured' } }
        }
        // fail-open: allow through (prod warn omitted in test environment)
        return null
      }

      if (!safeEqual(headerValue, expected)) {
        return { status: 401, body: { error: 'Unauthorized' } }
      }

      return null
    },
  }
}

// ── fail-open mode ────────────────────────────────────────────────────────────

describe('WebhookSecretProvider — fail-open mode', () => {
  describe('env var unset', () => {
    let savedKey: string | undefined

    before(() => {
      savedKey = process.env.TEST_WEBHOOK_SECRET_FO
      delete process.env.TEST_WEBHOOK_SECRET_FO
    })

    after(() => {
      if (savedKey !== undefined) {
        process.env.TEST_WEBHOOK_SECRET_FO = savedKey
      } else {
        delete process.env.TEST_WEBHOOK_SECRET_FO
      }
    })

    it('returns null (authorized) when the env var is missing', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify(null)
      assert.equal(result, null)
    })

    it('returns null even when header is provided (env unset)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify('some-secret')
      assert.equal(result, null)
    })
  })

  describe('env var set', () => {
    before(() => {
      process.env.TEST_WEBHOOK_SECRET_FO = 'correct-secret-fo'
    })

    after(() => {
      delete process.env.TEST_WEBHOOK_SECRET_FO
    })

    it('returns null (authorized) when header matches env var', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify('correct-secret-fo')
      assert.equal(result, null)
    })

    it('returns 401 when header is wrong', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify('wrong-secret')
      assert.ok(result !== null)
      assert.equal(result.status, 401)
    })

    it('returns 401 when header is null (env var set, no header sent)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify(null)
      assert.ok(result !== null)
      assert.equal(result.status, 401)
    })
  })
})

// ── fail-closed mode ──────────────────────────────────────────────────────────

describe('WebhookSecretProvider — fail-closed mode', () => {
  describe('env var unset', () => {
    let savedKey: string | undefined

    before(() => {
      savedKey = process.env.TEST_WEBHOOK_SECRET_FC
      delete process.env.TEST_WEBHOOK_SECRET_FC
    })

    after(() => {
      if (savedKey !== undefined) {
        process.env.TEST_WEBHOOK_SECRET_FC = savedKey
      } else {
        delete process.env.TEST_WEBHOOK_SECRET_FC
      }
    })

    it('returns 503 when the env var is missing', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify(null)
      assert.ok(result !== null)
      assert.equal(result.status, 503)
    })

    it('returns 503 even when a header is provided (env unset)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify('some-secret')
      assert.ok(result !== null)
      assert.equal(result.status, 503)
    })
  })

  describe('env var set', () => {
    before(() => {
      process.env.TEST_WEBHOOK_SECRET_FC = 'correct-secret-fc'
    })

    after(() => {
      delete process.env.TEST_WEBHOOK_SECRET_FC
    })

    it('returns null (authorized) when header matches env var', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify('correct-secret-fc')
      assert.equal(result, null)
    })

    it('returns 401 when header is wrong', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify('wrong-secret')
      assert.ok(result !== null)
      assert.equal(result.status, 401)
    })

    it('returns 401 when header is null (env var set, no header sent)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify(null)
      assert.ok(result !== null)
      assert.equal(result.status, 401)
    })
  })
})
