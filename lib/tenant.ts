/**
 * Request-scoped tenant resolver.
 *
 * ⚠️  NEVER cache the result in module scope — that is a multi-tenant data leak.
 *     (sb-001-2026-05-27-multi-tenant.md: "module-level caching = data leak")
 *
 * Call getTenant() inside a Server Component, Route Handler, or Server Action.
 * It reads Next.js request headers on every invocation — zero module-scope state.
 */

import { headers } from 'next/headers'
import type { Tenant } from './tenants/_types'
import { lookupByHost } from './tenants/registry'
import { alpacasibiza } from './tenants/alpacasibiza'

/**
 * Resolve the current tenant for this request.
 *
 * Resolution order:
 *   1. x-forwarded-host / host header  (hostname-based lookup via registry)
 *   2. alpacasibiza fallback  (single-tenant default until more tenants are added)
 *
 * Each path is a fresh lookup per call — no caching, no shared state.
 *
 * ⚠️  Do NOT add an `x-tenant-slug` (or any client-supplied) header path here.
 *     Next.js request headers are attacker-controllable. Trusting a slug header
 *     = cross-tenant data leak. When middleware is introduced for multi-tenant
 *     routing, it must (a) strip any incoming x-tenant-* header from the
 *     request before forwarding, and (b) pass the resolved tenant via a
 *     mechanism that cannot be set from outside (e.g. a rewrite to a
 *     slug-scoped path, or a request-internal symbol). See PRACTICES.md.
 */
export async function getTenant(): Promise<Tenant> {
  const h = await headers()

  // Path 1: hostname-based lookup
  const host = h.get('x-forwarded-host') || h.get('host')
  if (host) {
    const byHost = lookupByHost(host)
    if (byHost) return byHost
  }

  // Path 2: single-tenant fallback (safe today; remove once all hosts are in registry)
  return alpacasibiza
}

// Re-export types so callers only need one import
export type { Tenant } from './tenants/_types'
