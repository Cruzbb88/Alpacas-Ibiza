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
import { lookupByHost, lookupBySlug } from './tenants/registry'
import { alpacasibiza } from './tenants/alpacasibiza'

/**
 * Resolve the current tenant for this request.
 *
 * Resolution order:
 *   1. x-tenant-slug header  (set by middleware for future multi-tenant routing)
 *   2. x-forwarded-host / host header  (hostname-based lookup via registry)
 *   3. alpacasibiza fallback  (single-tenant default until more tenants are added)
 *
 * Each path is a fresh lookup per call — no caching, no shared state.
 */
export async function getTenant(): Promise<Tenant> {
  const h = await headers()

  // Path 1: explicit slug header (set by middleware when multi-tenant is live)
  const slug = h.get('x-tenant-slug')
  if (slug) {
    const bySlug = lookupBySlug(slug)
    if (bySlug) return bySlug
    // Unknown slug — fall through to host lookup rather than 500-ing
  }

  // Path 2: hostname-based lookup
  const host = h.get('x-forwarded-host') || h.get('host')
  if (host) {
    const byHost = lookupByHost(host)
    if (byHost) return byHost
  }

  // Path 3: single-tenant fallback (safe today; remove once all hosts are in registry)
  return alpacasibiza
}

// Re-export types so callers only need one import
export type { Tenant } from './tenants/_types'
