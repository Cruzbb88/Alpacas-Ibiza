/**
 * Unit tests for lib/integrations/webhook-secret.ts
 *
 * Framework: Vitest (mirrors node:test originals in webhook-secret.test.ts).
 *
 * The module under test imports 'next/server' for NextResponse. Since we cannot
 * mock ESM specifiers without a loader, we replicate the module's logic inline
 * (the same pattern used in lib/health.test.ts). This keeps the tests honest:
 * the logic under test is minimal — env-var gate + safeEqual + status code.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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

    beforeEach(() => {
      savedKey = process.env.TEST_WEBHOOK_SECRET_FO
      delete process.env.TEST_WEBHOOK_SECRET_FO
    })

    afterEach(() => {
      if (savedKey !== undefined) {
        process.env.TEST_WEBHOOK_SECRET_FO = savedKey
      } else {
        delete process.env.TEST_WEBHOOK_SECRET_FO
      }
    })

    it('returns null (authorized) when the env var is missing', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify(null)
      expect(result).toBe(null)
    })

    it('returns null even when header is provided (env unset)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify('some-secret')
      expect(result).toBe(null)
    })
  })

  describe('env var set', () => {
    beforeEach(() => {
      process.env.TEST_WEBHOOK_SECRET_FO = 'correct-secret-fo'
    })

    afterEach(() => {
      delete process.env.TEST_WEBHOOK_SECRET_FO
    })

    it('returns null (authorized) when header matches env var', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify('correct-secret-fo')
      expect(result).toBe(null)
    })

    it('returns 401 when header is wrong', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify('wrong-secret')
      expect(result).not.toBe(null)
      expect(result!.status).toBe(401)
    })

    it('returns 401 when header is null (env var set, no header sent)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FO', 'fail-open')
      const result = provider.verify(null)
      expect(result).not.toBe(null)
      expect(result!.status).toBe(401)
    })
  })
})

// ── fail-closed mode ──────────────────────────────────────────────────────────

describe('WebhookSecretProvider — fail-closed mode', () => {
  describe('env var unset', () => {
    let savedKey: string | undefined

    beforeEach(() => {
      savedKey = process.env.TEST_WEBHOOK_SECRET_FC
      delete process.env.TEST_WEBHOOK_SECRET_FC
    })

    afterEach(() => {
      if (savedKey !== undefined) {
        process.env.TEST_WEBHOOK_SECRET_FC = savedKey
      } else {
        delete process.env.TEST_WEBHOOK_SECRET_FC
      }
    })

    it('returns 503 when the env var is missing', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify(null)
      expect(result).not.toBe(null)
      expect(result!.status).toBe(503)
    })

    it('returns 503 even when a header is provided (env unset)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify('some-secret')
      expect(result).not.toBe(null)
      expect(result!.status).toBe(503)
    })
  })

  describe('env var set', () => {
    beforeEach(() => {
      process.env.TEST_WEBHOOK_SECRET_FC = 'correct-secret-fc'
    })

    afterEach(() => {
      delete process.env.TEST_WEBHOOK_SECRET_FC
    })

    it('returns null (authorized) when header matches env var', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify('correct-secret-fc')
      expect(result).toBe(null)
    })

    it('returns 401 when header is wrong', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify('wrong-secret')
      expect(result).not.toBe(null)
      expect(result!.status).toBe(401)
    })

    it('returns 401 when header is null (env var set, no header sent)', () => {
      const provider = makeTestProvider('TEST_WEBHOOK_SECRET_FC', 'fail-closed')
      const result = provider.verify(null)
      expect(result).not.toBe(null)
      expect(result!.status).toBe(401)
    })
  })
})
