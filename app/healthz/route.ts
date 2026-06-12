/**
 * /healthz — public uptime-monitor endpoint.
 *
 * No auth. No rate-limit. No DB queries.
 * Returns 200 as long as Node is running.
 *
 * Wire into UptimeRobot / BetterStack / similar as an HTTP monitor.
 * Expected response: { ok: true, ... }
 *
 * Extended mode: GET /healthz?detailed=1
 * Pings each configured external service (3s timeout each) and returns
 * per-service status. Intended for detailed uptime monitors.
 */
export const dynamic = 'force-dynamic'

import { fetchWithTimeout } from '@/lib/fetch'
import { isTier1Ready } from '@/lib/validate-env'
import { safeEqual } from '@/lib/secrets'

// ── check helpers ─────────────────────────────────────────────────────────────

interface ServiceCheck {
  configured: boolean
  ok: boolean
  latencyMs?: number
  code?: string
}

async function checkStripe(): Promise<ServiceCheck> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { configured: false, ok: false, code: 'UNCONFIGURED' }

  const start = Date.now()
  try {
    const { importStripe } = await import('@/lib/integrations/stripe-sdk')
    const stripeFactory = await importStripe()
    if (!stripeFactory) {
      return { configured: true, ok: false, code: 'STRIPE_SDK_MISSING', latencyMs: Date.now() - start }
    }

    const stripe = stripeFactory(key, { apiVersion: '2024-06-20' })
    await stripe.balance.retrieve({}, { timeout: 3000 })
    return { configured: true, ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - start
    if (msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('authentication')) {
      return { configured: true, ok: false, code: 'AUTH_FAILED', latencyMs }
    }
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { configured: true, ok: false, code: 'TIMEOUT', latencyMs }
    }
    return { configured: true, ok: false, code: 'NETWORK_ERROR', latencyMs }
  }
}

async function checkMollie(): Promise<ServiceCheck> {
  const key = process.env.MOLLIE_API_KEY
  if (!key) return { configured: false, ok: false, code: 'UNCONFIGURED' }

  const start = Date.now()
  try {
    // Use fetchWithTimeout (AbortController-based) to avoid leaking the HTTPS socket
    // on timeout. The previous Promise.race left the underlying request open.
    const res = await fetchWithTimeout('https://api.mollie.com/v2/profiles/me', {
      headers: { Authorization: `Bearer ${key}` },
    }, 3000)
    const latencyMs = Date.now() - start
    if (res.ok) return { configured: true, ok: true, latencyMs }
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, code: 'AUTH_FAILED', latencyMs }
    }
    return { configured: true, ok: false, code: `HTTP_${res.status}`, latencyMs }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - start
    if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid')) {
      return { configured: true, ok: false, code: 'AUTH_FAILED', latencyMs }
    }
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { configured: true, ok: false, code: 'TIMEOUT', latencyMs }
    }
    return { configured: true, ok: false, code: 'NETWORK_ERROR', latencyMs }
  }
}

async function checkResend(): Promise<ServiceCheck> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { configured: false, ok: false, code: 'UNCONFIGURED' }

  const start = Date.now()
  try {
    const res = await fetchWithTimeout('https://api.resend.com/api-keys', {
      headers: { Authorization: `Bearer ${key}` },
    }, 3000)

    const latencyMs = Date.now() - start
    if (res.status === 200) return { configured: true, ok: true, latencyMs }
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, code: 'AUTH_FAILED', latencyMs }
    }
    return { configured: true, ok: false, code: `HTTP_${res.status}`, latencyMs }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - start
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { configured: true, ok: false, code: 'TIMEOUT', latencyMs }
    }
    return { configured: true, ok: false, code: 'NETWORK_ERROR', latencyMs }
  }
}

async function checkFareHarbor(): Promise<ServiceCheck> {
  const appKey = process.env.FAREHARBOR_APP_KEY
  const userKey = process.env.FAREHARBOR_USER_KEY
  if (!appKey || !userKey) return { configured: false, ok: false, code: 'UNCONFIGURED' }

  const shortname =
    process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME || 'alpacasibiza'
  const url = `https://fareharbor.com/api/external/v1/companies/${shortname}/?app-key=${appKey}&user-key=${userKey}`

  const start = Date.now()
  try {
    const res = await fetchWithTimeout(url, {}, 3000)

    const latencyMs = Date.now() - start
    if (res.status === 200) return { configured: true, ok: true, latencyMs }
    if (res.status === 401 || res.status === 403) {
      return { configured: true, ok: false, code: 'AUTH_FAILED', latencyMs }
    }
    return { configured: true, ok: false, code: `HTTP_${res.status}`, latencyMs }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - start
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { configured: true, ok: false, code: 'TIMEOUT', latencyMs }
    }
    return { configured: true, ok: false, code: 'NETWORK_ERROR', latencyMs }
  }
}

// ── route ─────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === '1'

  // Detailed mode discloses per-vendor configured/AUTH_FAILED/latency state which
  // can fingerprint internal config + key-validity to unauth callers. Gate it
  // behind the same CRON_SECRET shared with /api/launch-readiness. Constant-time
  // compare so timing cannot leak the secret. Unauth /healthz still works for
  // uptime monitors via the public summary mode (no detailed flag, or no token).
  const cronSecret = process.env.CRON_SECRET
  const providedToken = searchParams.get('token') ?? ''
  const detailedAuthed =
    detailed && cronSecret !== undefined && cronSecret.length > 0 && safeEqual(providedToken, cronSecret)

  const base = {
    ok: true,
    ts: new Date().toISOString(),
    build_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    env_tier1_ready: isTier1Ready(),
  }

  if (!detailed || !detailedAuthed) {
    return Response.json(base, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // ── detailed mode ──────────────────────────────────────────────────────────
  const AGGREGATE_TIMEOUT_MS = 7000
  let aggregateTimer: ReturnType<typeof setTimeout> | undefined
  const aggregateDeadline = new Promise<'__aggregate_timeout__'>((resolve) => {
    aggregateTimer = setTimeout(() => resolve('__aggregate_timeout__'), AGGREGATE_TIMEOUT_MS)
  })

  const checksPromise = Promise.allSettled([
    checkStripe(),
    checkMollie(),
    checkResend(),
    checkFareHarbor(),
  ])

  const raceResult = await Promise.race([checksPromise, aggregateDeadline])
  // Clear the deadline timer so it does not keep the event loop alive when
  // checksPromise resolves before the 7s timeout.
  clearTimeout(aggregateTimer)

  let stripeResult: PromiseSettledResult<ServiceCheck>
  let mollieResult: PromiseSettledResult<ServiceCheck>
  let resendResult: PromiseSettledResult<ServiceCheck>
  let fareHarborResult: PromiseSettledResult<ServiceCheck>

  const timeoutCheck: PromiseFulfilledResult<ServiceCheck> = {
    status: 'fulfilled',
    value: { configured: true, ok: false, code: 'AGGREGATE_TIMEOUT', latencyMs: AGGREGATE_TIMEOUT_MS },
  }

  if (raceResult === '__aggregate_timeout__') {
    stripeResult = timeoutCheck
    mollieResult = timeoutCheck
    resendResult = timeoutCheck
    fareHarborResult = timeoutCheck
  } else {
    ;[stripeResult, mollieResult, resendResult, fareHarborResult] = raceResult
  }

  function settle(result: PromiseSettledResult<ServiceCheck>): ServiceCheck {
    if (result.status === 'fulfilled') return result.value
    return { configured: true, ok: false, code: 'INTERNAL_ERROR' }
  }

  const stripe     = settle(stripeResult)
  const mollie     = settle(mollieResult)
  const resend     = settle(resendResult)
  const fareharbor = settle(fareHarborResult)

  // ok = true only if every configured service is healthy
  const allOk = [stripe, mollie, resend, fareharbor]
    .filter((c) => c.configured)
    .every((c) => c.ok)

  return Response.json(
    {
      ...base,
      ok: base.ok && allOk,
      checks: { stripe, mollie, resend, fareharbor },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
