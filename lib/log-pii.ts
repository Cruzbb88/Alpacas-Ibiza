/**
 * Centralised PII masking helpers for log statements.
 *
 * Several routes had drifted into local copies of "first 4 chars + ellipsis"
 * patterns for emails and customer IDs (gdpr-request, billing-portal,
 * mollie-manage, newsletter/unsubscribe). Consolidating gives a single
 * surface to tune retention vs operability and prevents a future route from
 * inventing a weaker mask.
 *
 * Per GDPR Recital 26, pseudonymous identifiers (Mollie customer IDs,
 * Stripe customer IDs) are still personal data — masking them in logs lets
 * us audit operational behaviour without persisting full identifiers in
 * Vercel's log retention window (which may exceed our retention policy).
 *
 * Masking is one-way: there is no de-mask. If you need to correlate a
 * specific donor's events you must do it via the request-id (attachRequestId)
 * which is not PII.
 */

/**
 * Mask an email for logs. "alex@example.com" → "alex…example.com".
 * Keeps enough signal for ops ("which provider domain?", "is this the same
 * user as the last entry?") without writing the full address.
 *
 * Empty/undefined input returns a safe sentinel rather than throwing — log
 * sites should never crash because someone forgot a null-check.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '(no-email)'
  const at = email.indexOf('@')
  if (at < 0) return `${email.slice(0, 4)}…(malformed)`
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  // Keep first 4 of local part (or full if short), then ellipsis, then domain.
  const localKept = local.slice(0, Math.min(4, local.length))
  return `${localKept}…${domain}`
}

/**
 * Mask a payment-vendor customer ID. "cus_PQR1234XYZ56" → "cus_PQR1…XYZ56".
 * Keeps the vendor prefix (cus_ / cst_) and last 4 chars so two log entries
 * from the same customer collide on the visible suffix.
 *
 * For unknown formats falls back to first 4 + last 4 with ellipsis.
 */
export function maskCustomerId(id: string | null | undefined): string {
  if (!id) return '(no-customer-id)'
  if (id.length <= 8) return `${id.slice(0, 2)}…${id.slice(-2)}`
  // Detect vendor prefix (cus_, cst_, tr_, sub_, etc.) — keep through underscore + 4 chars.
  const underscoreIdx = id.indexOf('_')
  if (underscoreIdx > 0 && underscoreIdx <= 4) {
    const prefix = id.slice(0, underscoreIdx + 1) // "cus_"
    const front = id.slice(underscoreIdx + 1, underscoreIdx + 5) // next 4
    const tail = id.slice(-4)
    return `${prefix}${front}…${tail}`
  }
  return `${id.slice(0, 4)}…${id.slice(-4)}`
}
