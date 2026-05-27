/**
 * Route-level helpers that depend on next/server.
 * Kept separate from lib/secrets.ts so the pure crypto helpers
 * remain importable in the Node test runner without Next.js.
 */

import { NextResponse } from 'next/server'
import { safeEqual } from '@/lib/secrets'

/**
 * Validate an optional shared-secret header. Fail-OPEN if the env var is unset
 * (assumed in dev/preview). Returns null if authorized, otherwise a NextResponse
 * the caller should return directly.
 *
 * NOTE: not for the FareHarbor webhook — that route is fail-CLOSED by design.
 */
export function requireOptionalWebhookSecret(request: Request): NextResponse | null {
    const expected = process.env.FAREHARBOR_WEBHOOK_SECRET
    if (!expected) return null
    const got = request.headers.get('x-webhook-secret')
    if (!safeEqual(got, expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
}

/**
 * Fail-CLOSED env-var gate. Returns null if the env var is set (request continues),
 * otherwise returns a 503 NextResponse the caller should `return` directly.
 *
 * Centralizes the "we need X to function, else 503" boilerplate that every
 * payment-related route was duplicating. Also normalises the error shape.
 *
 * Usage:
 *   const gate = requireEnvOrReturn503('STRIPE_SECRET_KEY', 'Payment system not configured')
 *   if (gate) return gate
 */
export function requireEnvOrReturn503(
    envKey: string,
    errorMessage: string,
    options?: { code?: string },
): NextResponse | null {
    if (process.env[envKey]) return null
    console.warn(
        `[${envKey}] unset — returning 503. Set this env var to activate the feature.`,
    )
    return NextResponse.json(
        { error: errorMessage, code: options?.code ?? `${envKey}_UNSET` },
        { status: 503 },
    )
}

const LOCALE_ALLOWLIST_DEFAULT = ['en', 'nl', 'es', 'de', 'it', 'fr'] as const

/**
 * Extract a locale slug from the `Referer` header, validated against an allowlist.
 * Used by payment-checkout routes to build locale-aware success/cancel URLs.
 * Defaults to 'en' when no match or value not in the allowlist (safe — never
 * lets attacker-controlled Referer inject arbitrary segments into our URLs).
 */
export function extractLocaleFromReferer(
    referer: string | null | undefined,
    allowlist: ReadonlyArray<string> = LOCALE_ALLOWLIST_DEFAULT,
): string {
    if (!referer) return 'en'
    const match = referer.match(/\/([a-z]{2})\//)?.[1]
    if (!match) return 'en'
    return (allowlist as ReadonlyArray<string>).includes(match) ? match : 'en'
}
