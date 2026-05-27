/**
 * Server-side tenant resolution.
 *
 * Server components and route handlers call `getTenant()` to retrieve the
 * Tenant config bound to the current request. Resolution order:
 *
 *   1. Explicit override via `host` arg (for tests / preview)
 *   2. `x-forwarded-host` header (Vercel-set)
 *   3. `host` header (standard)
 *   4. Fallback: default tenant (`alpacasibiza` for now)
 *
 * NOTE: Next.js App Router server components can read the request headers via
 * `headers()` from 'next/headers'. For pages that DON'T have access to
 * headers (e.g. metadata generation in a static build), the caller must pass
 * the host explicitly OR accept the default tenant.
 */

import { headers as nextHeaders } from 'next/headers'
import type { Tenant } from './_types'
import { alpacasibiza } from './alpacasibiza'
import { lookupByHost } from './registry'

const DEFAULT_TENANT: Tenant = alpacasibiza

/**
 * Async tenant resolver for server components (App Router only).
 * Reads `x-forwarded-host` or `host` from incoming request headers.
 */
export async function getTenant(): Promise<Tenant> {
  try {
    const h = await nextHeaders()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host) {
      const found = lookupByHost(host)
      if (found) return found
    }
  } catch {
    // headers() throws if called outside a request scope (e.g. during build).
    // Fall through to default.
  }
  return DEFAULT_TENANT
}

/**
 * Synchronous resolver for callers that already have the host string.
 * Useful in middleware (which is sync) and tests.
 */
export function getTenantByHost(host: string | null | undefined): Tenant {
  if (!host) return DEFAULT_TENANT
  return lookupByHost(host) ?? DEFAULT_TENANT
}

/**
 * Get the default tenant — for static-build paths where the request is unknown.
 */
export function getDefaultTenant(): Tenant {
  return DEFAULT_TENANT
}
