/**
 * Cron Authorization: Bearer <CRON_SECRET> verifier.
 *
 * Vercel Cron auto-injects `Authorization: Bearer ${CRON_SECRET}` for every
 * cron-triggered request when CRON_SECRET is set in the project env. Our cron
 * routes (owner-digest, owner-mrr-digest) check this header before doing any
 * work; any other request is unauthorised.
 *
 * The Bearer-header pattern is preferred over `?secret=` query strings because
 * query strings get logged by edge proxies, analytics tools, and access logs —
 * a leaked CRON_SECRET would let anyone trigger the digests, spamming the
 * owner. Bearer tokens stay in the request headers and don't appear in URL logs.
 */
import { safeEqual } from './secrets.ts'

/**
 * Returns true when the request bears a valid CRON_SECRET. Constant-time
 * comparison; missing env or missing header → false (no log spam).
 */
export function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return false
  const bearer = authHeader.slice(7)
  return safeEqual(bearer, expected)
}
