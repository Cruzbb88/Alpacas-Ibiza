/**
 * Launch-readiness: Deploy state checks.
 * Fetches live URLs with a 5s timeout. No auth required.
 */

import { fetchWithTimeout } from '@/lib/fetch'
import type { CheckResult } from './check-env'

interface HealthzPayload {
  ok?: boolean
  [key: string]: unknown
}

async function checkHealthz(url: string): Promise<CheckResult> {
  const id = url.includes('www.') ? 'deploy_www' : 'deploy_apex'
  const label = url
  try {
    const res = await fetchWithTimeout(url, { cache: 'no-store' }, 5000)
    if (res.status === 404) {
      return {
        id,
        label,
        status: 'yellow',
        detail: '404 — redesign not yet deployed to this host',
        fixHint: 'Deploy to Vercel and add custom domain in Project → Settings → Domains',
      }
    }
    if (!res.ok) {
      return {
        id,
        label,
        status: 'red',
        detail: `HTTP ${res.status}`,
        fixHint: 'Check Vercel deployment logs',
      }
    }
    let payload: HealthzPayload = {}
    try {
      payload = (await res.json()) as HealthzPayload
    } catch {
      // non-JSON body
    }
    if (payload.ok === true) {
      return {
        id,
        label,
        status: 'green',
        detail: `200 OK — site is live and healthy`,
      }
    }
    return {
      id,
      label,
      status: 'yellow',
      detail: `200 but ok:true not found in JSON — may be wrong page`,
      fixHint: 'Check that /healthz returns { ok: true, ... }',
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      id,
      label,
      status: 'red',
      detail: `Connection error: ${msg.slice(0, 120)}`,
      fixHint: 'Verify the domain is live and pointing to Vercel',
    }
  }
}

export async function checkDeployState(): Promise<CheckResult[]> {
  const [apex, www] = await Promise.all([
    checkHealthz('https://alpacasibiza.com/healthz'),
    checkHealthz('https://www.alpacasibiza.com/healthz'),
  ])
  return [apex, www]
}
