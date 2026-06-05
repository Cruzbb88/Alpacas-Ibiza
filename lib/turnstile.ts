/**
 * Human-verification helpers — server-side-only.
 *
 * `verifyHumanToken` is the canonical entry point. It delegates to whichever
 * captcha provider is active (controlled by the `CAPTCHA_PROVIDER` env var:
 * 'turnstile' | 'recaptcha' | 'none'). Default is Turnstile (back-compat).
 *
 * `verifyTurnstile` is kept as a thin back-compat alias so the 6 existing
 * route call-sites need zero edits. When CAPTCHA_PROVIDER is swapped to
 * 'recaptcha', those routes automatically use reCAPTCHA — no route changes
 * required.
 *
 * Turnstile docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 * reCAPTCHA docs: https://developers.google.com/recaptcha/docs/v3#site_verify_response
 */

import { fetchWithTimeout } from '@/lib/fetch'

// ── Turnstile (internal implementation) ──────────────────────────────────────

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

interface TurnstileResult {
    success: boolean
    'error-codes'?: string[]
    action?: string
    hostname?: string
}

async function verifyViaTurnstile(
    token: string | undefined | null,
    remoteIp?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const secret = process.env.TURNSTILE_SECRET_KEY
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
        const res = await fetchWithTimeout(TURNSTILE_VERIFY_URL, { method: 'POST', body }, 5000)
        const data = (await res.json()) as TurnstileResult
        if (data.success) return { ok: true }
        return { ok: false, reason: (data['error-codes'] ?? ['unknown']).join(',') }
    } catch (err) {
        console.error('[turnstile] verify failed:', err)
        return process.env.NODE_ENV === 'production'
            ? { ok: false, reason: 'verify_network_error' }
            : { ok: true }
    }
}

// ── reCAPTCHA v3 (internal implementation) ───────────────────────────────────

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

interface RecaptchaV3Result {
    success: boolean
    score: number
    action: string
    challenge_ts: string
    hostname: string
    'error-codes'?: string[]
}

async function verifyViaRecaptcha(
    token: string | undefined | null,
    remoteIp?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const secret = process.env.RECAPTCHA_SECRET_KEY
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            console.warn(
                '[recaptcha] RECAPTCHA_SECRET_KEY unset — bot protection DISABLED. Set the env var to enable.'
            )
        }
        return { ok: true }
    }
    if (!token) return { ok: false, reason: 'missing_token' }

    const minScore = parseFloat(process.env.RECAPTCHA_MIN_SCORE ?? '0.5')

    const body = new URLSearchParams()
    body.set('secret', secret)
    body.set('response', token)
    if (remoteIp) body.set('remoteip', remoteIp)

    try {
        const res = await fetchWithTimeout(RECAPTCHA_VERIFY_URL, { method: 'POST', body }, 5000)
        const data = (await res.json()) as RecaptchaV3Result
        if (!data.success) {
            return { ok: false, reason: (data['error-codes'] ?? ['unknown']).join(',') }
        }
        if (data.score < minScore) {
            return { ok: false, reason: `score_too_low:${data.score}` }
        }
        return { ok: true }
    } catch (err) {
        console.error('[recaptcha] verify failed:', err)
        return process.env.NODE_ENV === 'production'
            ? { ok: false, reason: 'verify_network_error' }
            : { ok: true }
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Canonical human-verification entry point.
 *
 * Selects the active captcha provider from CAPTCHA_PROVIDER env var:
 *   'turnstile'  →  Cloudflare Turnstile (default, back-compat)
 *   'recaptcha'  →  Google reCAPTCHA v3
 *   'none'       →  fail-open (always ok: true)
 */
export async function verifyHumanToken(
    token: string | undefined | null,
    remoteIp?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    const provider = process.env.CAPTCHA_PROVIDER ?? 'turnstile'
    switch (provider) {
        case 'recaptcha':
            return verifyViaRecaptcha(token, remoteIp)
        case 'none':
            return { ok: true }
        case 'turnstile':
        default:
            return verifyViaTurnstile(token, remoteIp)
    }
}

/**
 * Back-compat alias. All 6 existing routes call this directly — they gain
 * provider-pluggability for free without any route edits.
 *
 * When CAPTCHA_PROVIDER=recaptcha, this delegates to reCAPTCHA v3.
 * When CAPTCHA_PROVIDER=turnstile (default) or unset, Cloudflare Turnstile
 * is used (identical to the old behaviour).
 */
export async function verifyTurnstile(
    token: string | undefined | null,
    remoteIp?: string | null,
): Promise<{ ok: true } | { ok: false; reason: string }> {
    return verifyHumanToken(token, remoteIp)
}
