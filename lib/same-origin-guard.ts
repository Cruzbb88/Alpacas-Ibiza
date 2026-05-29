/**
 * Same-origin POST guard. Returns a `null` pass or an htmlPage-shaped failure
 * marker the caller renders into the appropriate response shell.
 *
 * Centralised because three mollie-manage routes (cancel, status, update-payment)
 * each repeat the same Origin-header check. Drift between them is a
 * latent CSRF risk: if one route forgets to add the check while the others
 * stay strict, the unprotected route becomes the attacker's foothold.
 *
 * SECURITY NOTE — see CLAUDE.md "Mollie manage POST routes must check Origin
 * against SITE_BASE_URL". Any code touching a capability-token endpoint that
 * mutates state MUST gate POST through this helper.
 *
 * Why not also gate GET? Capability tokens are scoped (cancel / status /
 * update-payment) and the GET endpoints are deliberately side-effect-free
 * (they render confirmation forms only). The POSTs are where the mutations
 * happen, so that's where origin-pinning matters.
 */
import { SITE_BASE_URL } from './config.ts'

/**
 * Validate that this POST originated from our own site.
 *
 * @returns true when Origin header is present AND matches SITE_BASE_URL,
 *          false otherwise (missing OR mismatched).
 *
 * STRICT: a missing Origin header is REJECTED. Peer review 2026-05-29 flagged
 * the prior "allow-on-missing" behaviour as a token-replay bypass: an
 * attacker who scraped a capability token (forwarded email, log harvest)
 * could `curl -X POST` the cancel/update-payment endpoint with no Origin
 * header and the route would proceed. Modern browsers always include Origin
 * on cross-origin POSTs AND on same-origin POSTs from form submissions; the
 * only callers that omit it are non-browser clients (curl, postman, server-
 * to-server) — which legitimate donors never use for these flows.
 *
 * Same-origin GET-rendered forms inside the mollie-manage flow rely on the
 * browser auto-injecting Origin on POST. If a real-world same-origin browser
 * is ever found to elide Origin, downgrade to a Sec-Fetch-Site === 'same-origin'
 * fallback check — do NOT re-introduce the missing-Origin allow.
 */
export function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  return origin === SITE_BASE_URL
}
