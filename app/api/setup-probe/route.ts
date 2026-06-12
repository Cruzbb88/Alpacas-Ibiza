/**
 * /api/setup-probe — auth-gated probe endpoint for /admin/setup wizard.
 *
 * Query param: ?check=<name>
 * Returns: { ok: boolean, detail?: string, code?: string }
 *
 * Rate limited: 10 req / 60 s per IP to avoid burning vendor quotas.
 */

import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { fetchWithTimeout } from '@/lib/fetch'

export const dynamic = 'force-dynamic'

interface ProbeResult {
  ok: boolean
  detail?: string
  code?: string
}

function json(data: ProbeResult, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

// ── probe implementations ────────────────────────────────────────────────────

async function checkNextauthSecret(): Promise<ProbeResult> {
  const v = process.env.NEXTAUTH_SECRET
  if (!v || v.length < 32) {
    return { ok: false, code: 'TOO_SHORT', detail: `Need ≥32 chars; got ${v?.length ?? 0}` }
  }
  return { ok: true, detail: `Length ${v.length} chars — good` }
}

async function checkCronSecret(): Promise<ProbeResult> {
  const v = process.env.CRON_SECRET
  if (!v || v.length < 16) {
    return { ok: false, code: 'TOO_SHORT', detail: `Need ≥16 chars; got ${v?.length ?? 0}` }
  }
  return { ok: true, detail: `Length ${v.length} chars — good` }
}

async function checkResend(): Promise<ProbeResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { ok: false, code: 'UNCONFIGURED' }

  try {
    // Resend SDK exposes resend.apiKeys.list() in some versions; fall back to raw HTTP
    // to avoid version-sniffing at runtime.
    const res = await fetchWithTimeout('https://api.resend.com/api-keys', {
      headers: { Authorization: `Bearer ${key}` },
    }, 5000)

    if (res.status === 200) {
      return { ok: true, detail: 'Resend API key is valid' }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, code: 'INVALID_KEY', detail: `Resend returned ${res.status}` }
    }
    return { ok: false, code: `HTTP_${res.status}`, detail: `Unexpected status ${res.status}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { ok: false, code: 'TIMEOUT' }
    }
    return { ok: false, code: 'NETWORK_ERROR', detail: msg }
  }
}

async function checkStripe(): Promise<ProbeResult> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { ok: false, code: 'UNCONFIGURED' }

  try {
    const { importStripe } = await import('@/lib/integrations/stripe-sdk')
    const stripeFactory = await importStripe()
    if (!stripeFactory) return { ok: false, code: 'STRIPE_SDK_MISSING' }

    const stripe = stripeFactory(key, { apiVersion: '2024-06-20' })
    await stripe.balance.retrieve({}, { timeout: 3000 })
    return { ok: true, detail: 'Stripe API key is valid' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[setup-probe] Stripe probe error:', msg)
    if (msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('authentication')) {
      return { ok: false, code: 'AUTH_FAILED' }
    }
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { ok: false, code: 'TIMEOUT' }
    }
    return { ok: false, code: 'NETWORK_ERROR' }
  }
}

async function checkMollie(): Promise<ProbeResult> {
  const key = process.env.MOLLIE_API_KEY
  if (!key) return { ok: false, code: 'UNCONFIGURED' }

  try {
    // Use fetchWithTimeout (AbortController-based) to avoid leaking the HTTPS socket
    // on timeout. The previous Promise.race left the underlying request open.
    const res = await fetchWithTimeout('https://api.mollie.com/v2/profiles/me', {
      headers: { Authorization: `Bearer ${key}` },
    }, 3000)
    if (res.ok) return { ok: true, detail: 'Mollie API key is valid' }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, code: 'AUTH_FAILED', detail: `Mollie returned ${res.status}` }
    }
    return { ok: false, code: `HTTP_${res.status}`, detail: `Unexpected status ${res.status}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[setup-probe] Mollie probe error:', msg)
    if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid')) {
      return { ok: false, code: 'AUTH_FAILED' }
    }
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { ok: false, code: 'TIMEOUT' }
    }
    return { ok: false, code: 'NETWORK_ERROR', detail: msg }
  }
}

// ── route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  // Auth gate — admin session required
  const session = await getServerSession(auth)
  if (!session) {
    return json({ ok: false, code: 'UNAUTHORIZED' }, 401)
  }

  // Rate limit: 10 req / 60 s per IP
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `setup-probe:${ip}`, limit: 10, windowMs: 60_000 })
  if (!rl.allowed) {
    return json(
      { ok: false, code: 'RATE_LIMITED', detail: `Retry in ${Math.ceil(rl.resetMs / 1000)}s` },
      429
    )
  }

  const { searchParams } = new URL(request.url)
  const check = searchParams.get('check')

  switch (check) {
    case 'nextauth_secret': return json(await checkNextauthSecret())
    case 'cron_secret':     return json(await checkCronSecret())
    case 'resend':          return json(await checkResend())
    case 'stripe':          return json(await checkStripe())
    case 'mollie':          return json(await checkMollie())
    default:
      return json({ ok: false, code: 'UNKNOWN_CHECK', detail: `Unknown check: ${check}` }, 400)
  }
}
