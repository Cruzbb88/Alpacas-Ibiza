const CANONICAL = 'https://alpacasibiza.com'

/**
 * Returns true when the current deployment is production.
 * Production heuristic: VERCEL_ENV === 'production' OR siteBase matches canonical.
 * Extracted from app/robots.ts so it's independently testable.
 */
export function isProductionEnv(siteBase: string, vercelEnv?: string): boolean {
  return vercelEnv === 'production' || siteBase === CANONICAL
}
