/**
 * Leaf module — ZERO imports. Holds the canonical Adopt-a-Paca mailto fallback.
 *
 * Why this exists as its own file: payment-vendor.ts imports the payment
 * provider implementations (payment-stripe-direct, payment-mollie), and
 * payment-stripe-direct in turn needs this fallback constant. Keeping the
 * constant inside payment-vendor created a circular import
 * (payment-vendor → payment-stripe-direct → payment-vendor) whose module-init
 * order is non-deterministic under Turbopack — it surfaced as
 * "ReferenceError: Cannot access 'ADOPT_FALLBACK_MAILTO' before initialization"
 * on the edge intent routes, failing the production build intermittently.
 * A dependency-free leaf both sides import from removes the cycle.
 *
 * Shown when no payment vendor is configured or when a vendor's
 * createCheckoutSession returns `unconfigured`.
 */
export const ADOPT_FALLBACK_MAILTO =
  'mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry'
