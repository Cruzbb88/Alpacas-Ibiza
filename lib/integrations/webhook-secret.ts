/**
 * WebhookSecretProvider — consolidates the two shared-secret verification patterns
 * that exist in the codebase:
 *
 *   fail-open   — mirrors requireOptionalWebhookSecret() in lib/route-helpers.ts
 *                 Used by reminder / review-request cron routes. If the env var is
 *                 unset, traffic is allowed through (returns null) with a prod warn.
 *
 *   fail-closed — mirrors the guard in app/api/fareharbor-webhook/route.ts:36-48.
 *                 Used by security-critical webhooks. If the env var is unset,
 *                 returns a 503 (refuse traffic rather than open the door).
 *
 * Both modes use safeEqual() (timing-attack safe, from lib/secrets.ts).
 *
 * Usage:
 *   import { makeWebhookSecretProvider } from '@/lib/integrations/webhook-secret'
 *   const guard = makeWebhookSecretProvider('FAREHARBOR_WEBHOOK_SECRET', 'fail-closed')
 *   const deny = guard.verify(request)
 *   if (deny) return deny           // caller returns the Response directly
 *   // ...authorized path continues
 *
 * NOTE: This file imports from 'next/server' (for NextResponse) so it must only
 * be used in server-only modules (route handlers, server actions, middleware).
 * Do NOT import in client components.
 */

import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/secrets'

// ── Types ─────────────────────────────────────────────────────────────────────

export type WebhookSecretMode = 'fail-open' | 'fail-closed'

export interface WebhookSecretProvider {
  readonly mode: WebhookSecretMode

  /**
   * Verify the incoming request's `x-webhook-secret` header against the
   * configured env var.
   *
   * Returns null if the request is authorized — caller continues normally.
   * Returns a Response (401 or 503) if authorization fails — caller should
   * return this Response directly without further processing.
   */
  verify(request: Request): Response | null
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Build a WebhookSecretProvider for a given env var name and failure mode.
 *
 * @param envVarName   The process.env key holding the shared secret.
 * @param mode         'fail-open'  — missing secret allows traffic through (with warn).
 *                     'fail-closed' — missing secret returns 503.
 *
 * Callers: reminder route (REMINDER_WEBHOOK_SECRET, fail-open),
 *          review-request route (REVIEW_REQUEST_WEBHOOK_SECRET, fail-open).
 */
export function makeWebhookSecretProvider(
  envVarName: string,
  mode: WebhookSecretMode,
): WebhookSecretProvider {
  return {
    mode,

    verify(request: Request): Response | null {
      const expected = process.env[envVarName]

      if (!expected) {
        if (mode === 'fail-closed') {
          // Security-critical: refuse traffic until the operator configures the secret.
          return NextResponse.json(
            { error: 'Webhook secret not configured' },
            { status: 503 },
          )
        }
        // fail-open: allow through, but warn in prod so misconfiguration is visible.
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            `[webhook-secret] ${envVarName} is not set — webhook secret check skipped.`,
          )
        }
        return null
      }

      const got = request.headers.get('x-webhook-secret')
      if (!safeEqual(got, expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return null
    },
  }
}
