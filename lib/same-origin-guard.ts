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
 * @returns true when allowed (origin missing OR matches SITE_BASE_URL),
 *          false when the request must be rejected.
 *
 * Missing Origin header (some same-origin form posts in older browsers, or
 * curl) is allowed — strict-rejecting absent Origin would break the donor's
 * "click the form button" flow from the GET-rendered confirmation page when
 * a browser elides the header on same-origin navigations. The Origin check
 * defends against ATTACKER-ORIGINED forms, which always carry the attacker
 * domain in this header.
 */
export function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  return origin === SITE_BASE_URL
}
