/**
 * adopt-checkout-state — pure helper for parsing ?checkout=… query params.
 *
 * Kept as a plain module (no React) so it can be tested with Node test runner
 * without JSDOM or Next.js mocks.
 */

export type CheckoutState = 'success' | 'cancelled' | 'idle'
export type AdoptTier = 'monthly' | 'yearly'

/**
 * Derive checkout state from a URLSearchParams-like object.
 * Returns 'success' | 'cancelled' | 'idle'.
 *
 * Failsafe: only 'success' and 'cancelled' are recognised — anything else
 * (missing param, unexpected value) is 'idle'.
 */
export function parseCheckoutState(
  params: { get(key: string): string | null },
): CheckoutState {
  const value = params.get('checkout')
  if (value === 'success') return 'success'
  if (value === 'cancelled') return 'cancelled'
  return 'idle'
}

/**
 * Infer the adoption tier from the ?tier= param.
 * Returns 'yearly' only when explicitly set to 'yearly'.
 * Any other value (missing, unknown) defaults to 'monthly' — never
 * penalises a donor for URL weirdness.
 */
export function inferTier(
  params: { get(key: string): string | null },
): AdoptTier {
  return params.get('tier') === 'yearly' ? 'yearly' : 'monthly'
}
