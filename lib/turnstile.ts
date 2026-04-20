/**
 * Cloudflare Turnstile token verification.
 * Server-side-only helper. Silently allows traffic when no secret is configured
 * so local dev / preview deploys keep working.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

import { fetchWithTimeout } from '@/lib/fetch'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileResult {
    success: boolean
    'error-codes'?: string[]
    action?: string
    hostname?: string
}

export async function verifyTurnstile(
    token: string | undefined | null,
    remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    // If no secret configured, treat as disabled (fail open). Logs a warning
    // in production so misconfiguration is visible.
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            console.warn(
                '[turnstile] TURNSTILE_SECRET_KEY unset — bot protection DISABLED. Set the env var to enable.'
            )
        }
        return { ok: true }
    }
    if (!token) return { ok: false, reason: 'missing_token' }

    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (remoteIp) body.set('remoteip', remoteIp)

    try {
        const res = await fetchWithTimeout(VERIFY_URL, { method: 'POST', body }, 5000)
        const data = (await res.json()) as TurnstileResult
        if (data.success) return { ok: true }
        return { ok: false, reason: (data['error-codes'] ?? ['unknown']).join(',') }
    } catch (err) {
        console.error('[turnstile] verify failed:', err)
        // Fail closed in prod, fail open in dev so local testing isn't blocked
        // by transient network issues to Cloudflare
        return process.env.NODE_ENV === 'production'
            ? { ok: false, reason: 'verify_network_error' }
            : { ok: true }
    }
}
