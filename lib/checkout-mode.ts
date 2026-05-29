/**
 * lib/checkout-mode.ts — single source of truth for the embedded vs hosted
 * checkout feature flag.
 *
 * Stage 1 of the embedded checkout migration (see docs/embedded-checkout-migration.md).
 *
 * Why a dedicated helper:
 *   - Multiple call sites need the same gate: the new /api/checkout/intent +
 *     /api/checkout/confirm routes (server-side gating to 404), the
 *     EmbeddedCheckout component (client-side dynamic-import gate), and
 *     app/[locale]/adopt/page.tsx (renders embedded UI vs hosted CTAs).
 *   - Inlining `process.env.CHECKOUT_MODE === 'embedded'` at every call site
 *     guarantees the comparison drifts the moment we add a third mode.
 *
 * Rules — DO NOT WEAKEN:
 *   1. Default to 'hosted'. The hosted-redirect flow is the proven path; the
 *      embedded flow is conversion-critical and gated on owner sign-off + A/B.
 *   2. Reject unknown values. A typo'd env var (`CHECKOUT_MODE=embed`) must
 *      collapse to 'hosted', NOT silently disable both paths.
 *   3. Pure read — no side effects, no caching. The env var is read at request
 *      time so a redeploy doesn't require a code change.
 */

export type CheckoutMode = 'hosted' | 'embedded'

/**
 * Read the active checkout mode from CHECKOUT_MODE. Returns 'hosted' for any
 * unset / unknown value.
 */
export function getCheckoutMode(): CheckoutMode {
  const raw = process.env.CHECKOUT_MODE
  if (raw === 'embedded') return 'embedded'
  return 'hosted'
}

/**
 * True when the embedded flow is live. Convenience wrapper to keep call sites
 * readable (`if (isEmbeddedCheckout()) ...`).
 */
export function isEmbeddedCheckout(): boolean {
  return getCheckoutMode() === 'embedded'
}
