/**
 * Tenant registry — maps hostnames to Tenant configs.
 *
 * Built once at module load; never mutated after that.
 * Safe for concurrent requests (read-only Map).
 *
 * To add a new tenant:
 *   1. Create lib/tenants/<slug>.ts  (satisfies Tenant)
 *   2. Import it here and call registerTenant(myTenant)
 */

import type { Tenant } from './_types.ts'
import { alpacasibiza } from './alpacasibiza.ts'
import { validateTenant } from './validate.ts'

// ── Internal registry ─────────────────────────────────────────────────────────

const _byHost = new Map<string, Tenant>()

function registerTenant(tenant: Tenant): void {
  // Validate at registration time — warns but never throws so server keeps running.
  // Matches the pattern of lib/validate-env.ts (operator sees the gap; site stays up).
  const result = validateTenant(tenant)
  if (!result.ok) {
    console.warn(
      `[tenant-registry] WARN tenant "${tenant.slug}": ${result.errors.join('; ')}`
    )
  }

  for (const host of tenant.hosts) {
    _byHost.set(host, tenant)
  }
}

// ── Register all known tenants ────────────────────────────────────────────────

registerTenant(alpacasibiza)

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Look up a tenant by the incoming request hostname.
 * Returns null if no tenant is registered for that host.
 * Strips port suffix if present (e.g. "localhost:3000" → no match).
 */
export function lookupByHost(host: string): Tenant | null {
  // Strip port (e.g. "alpacasibiza.com:443" → "alpacasibiza.com")
  const bare = host.split(':')[0]
  return _byHost.get(bare) ?? null
}

/**
 * Look up a tenant by slug.
 * O(n) — only for admin/diagnostic use, not hot path.
 */
export function lookupBySlug(slug: string): Tenant | null {
  for (const tenant of _byHost.values()) {
    if (tenant.slug === slug) return tenant
  }
  return null
}
