/**
 * Shared cron-route runner.
 *
 * Centralises the boilerplate that every Vercel cron route repeats:
 *   1. Request-ID extraction + structured logger setup
 *   2. verifyCronSecret → 401 on mismatch
 *   3. Invoke caller-supplied runner; measure wall-clock duration
 *   4. Optional fire-and-forget heartbeat ping (2 s timeout, fail-quiet)
 *   5. JSON response with CronRunResult shape
 *   6. Top-level try/catch → 500 so Vercel cron retries on unexpected throws
 *
 * Each route's specific business logic (iterate subscribers, build emails,
 * idempotency stamps, etc.) lives entirely inside the runner callback — only
 * the auth / heartbeat / duration / logging boilerplate moves here.
 *
 * Usage:
 *   export async function GET(request: Request) {
 *     return runCron(request, {
 *       routeName: 'adopt-milestone-emails',
 *       heartbeatEnvKey: 'HEARTBEAT_ADOPT_MILESTONE_EMAILS_URL',
 *     }, async () => {
 *       // ... route-specific work ...
 *       return { ok: true, routeName: 'adopt-milestone-emails', durationMs: 0,
 *                successes: sent, failures: failed, skipped: 0 }
 *     })
 *   }
 *
 * Note: the runner populates the `durationMs` placeholder value — `runCron`
 * OVERWRITES it with the measured wall-clock value before responding.
 */

import { NextResponse } from 'next/server'
import { getRequestId, attachRequestId, makeRequestLogger } from './request-id.ts'
import { verifyCronSecret } from './cron-auth.ts'

// ── Public types ──────────────────────────────────────────────────────────────

export interface CronRunnerCtx {
    /** Route name used in log prefixes and (optionally) as the heartbeat key. */
    routeName: string
    /**
     * Env-var name holding the CRON_SECRET value.
     * Defaults to 'CRON_SECRET' (the only value used in practice — kept for
     * forward-compat so a future per-route secret is a 1-line change).
     */
    cronSecretEnv?: string
    /**
     * Env-var name whose value is the heartbeat URL (e.g. a Healthchecks.io
     * ping URL). When omitted or when the env value is empty/unset the
     * heartbeat step is skipped — no error is raised.
     */
    heartbeatEnvKey?: string
}

export interface CronRunResult<T = unknown> {
    ok: boolean
    routeName: string
    /** Wall-clock milliseconds for the runner invocation. Populated by runCron. */
    durationMs: number
    successes: number
    failures: number
    skipped: number
    /** Per-route specific payload — anything the route wants to include. */
    detail?: T
}

// ── Heartbeat (fire-and-forget) ───────────────────────────────────────────────

const HEARTBEAT_TIMEOUT_MS = 2000

function fireHeartbeat(envKey: string): void {
    const url = process.env[envKey]
    if (!url) return
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT_MS)
    fetch(url, { method: 'POST', signal: ctrl.signal })
        .finally(() => clearTimeout(t))
        .catch(() => {
            // Heartbeat is best-effort; never propagate into the cron response.
        })
}

// ── Core runner ───────────────────────────────────────────────────────────────

/**
 * Wraps a cron handler function with auth verification, duration measurement,
 * heartbeat ping, and structured error handling.
 *
 * Returns a `Response` suitable for returning directly from a Next.js route
 * handler (`export async function GET / POST`).
 */
export async function runCron<T>(
    request: Request,
    ctx: CronRunnerCtx,
    runner: () => Promise<CronRunResult<T>>,
): Promise<Response> {
    const reqId = getRequestId(request)
    const log = makeRequestLogger(`cron:${ctx.routeName}`, reqId)

    // ── Auth gate ─────────────────────────────────────────────────────────────
    if (!verifyCronSecret(request)) {
        log.warn('Unauthorized — missing or invalid CRON_SECRET')
        return attachRequestId(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            reqId,
        )
    }

    // ── Invoke runner with duration tracking ──────────────────────────────────
    const start = Date.now()
    let result: CronRunResult<T>
    try {
        result = await runner()
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error('Runner threw unexpectedly — returning 500 for Vercel cron retry', { message })
        // 5xx causes Vercel to retry the cron, which is the correct behaviour
        // when the runner hits an unexpected fatal error.
        return attachRequestId(
            NextResponse.json({ ok: false, error: message }, { status: 500 }),
            reqId,
        )
    }

    // Overwrite the placeholder durationMs with measured wall-clock.
    result.durationMs = Date.now() - start

    log.info('Run complete', {
        ok: result.ok,
        durationMs: result.durationMs,
        successes: result.successes,
        failures: result.failures,
        skipped: result.skipped,
    })

    // ── Heartbeat (fire-and-forget) ───────────────────────────────────────────
    if (ctx.heartbeatEnvKey) {
        fireHeartbeat(ctx.heartbeatEnvKey)
    }

    return attachRequestId(
        NextResponse.json(result),
        reqId,
    )
}
