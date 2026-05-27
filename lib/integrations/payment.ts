/**
 * PaymentProvider interface — integrations abstraction layer for payment processing.
 *
 * Follows the same pattern as BookingProvider / EmailProvider in _types.ts.
 * Adapters live in payment-<kind>.ts alongside this file.
 *
 * **Failsafe contract:**
 *   `createCheckoutSession` — returns `{ unconfigured: true, fallbackUrl: 'mailto:...' }`
 *   when required env vars are missing. Caller MUST redirect to fallbackUrl.
 *   Never throws on missing config (fail-quiet).
 *
 *   `verifyWebhook` — returns `{ ok: false }` when STRIPE_WEBHOOK_SECRET is unset.
 *   Fail-CLOSED: mirrors app/api/fareharbor-webhook (CLAUDE.md failsafe map row 6).
 *   Security-critical — no silent pass-through on missing secret.
 *
 * Relationship to lib/payment-vendor.ts:
 *   payment-vendor.ts is the existing per-file adapter (standalone, env-driven).
 *   This file is the provider-layer interface used by getProviders(tenant).
 *   The adapters here delegate to the same env vars; no duplication of logic.
 */

// ── Kind union ─────────────────────────────────────────────────────────────────

/**
 * The set of supported payment adapter kinds.
 *
 * stripe-direct     — single-account Stripe Checkout (own revenue, e.g. Adopt-a-Paca)
 * stripe-connect    — Stripe Connect Express (tenant revenue — DEFER UNTIL TENANT #1 SIGNS)
 * mollie            — Mollie merchant account (NL/ES popular alternative)
 * fareharbor-passthrough — delegates to the tenant's FareHarbor booking URL
 * manual-mailto     — no payment processor; returns a mailto: fallback (default)
 */
export type PaymentProviderKind =
  | 'stripe-direct'
  | 'stripe-connect'
  | 'mollie'
  | 'fareharbor-passthrough'
  | 'manual-mailto'

// ── Checkout options ────────────────────────────────────────────────────────────

export interface CreateCheckoutOpts {
  /** Tenant slug (for multi-tenant routing). */
  tenantId: string
  /**
   * Platform-specific product/price ID.
   * For stripe-direct: Stripe Price ID (e.g. price_xxx).
   * For fareharbor-passthrough: FareHarbor item ID.
   * For mollie: Mollie product ID.
   * For manual-mailto / unconfigured: ignored.
   */
  productId?: string
  /** Where to send the user on success/cancel. */
  returnUrl: string
  /** Optional pre-fill for checkout forms. */
  customerEmail?: string
  /**
   * Stripe checkout mode. 'subscription' for recurring billing, 'payment' for one-time.
   * Defaults to 'payment' when omitted. Caller MUST pass 'subscription' for monthly Adopt-a-Paca.
   */
  mode?: 'subscription' | 'payment'
}

// ── Result types ───────────────────────────────────────────────────────────────

/** Checkout session created — redirect to url. */
export interface CheckoutUrlResult {
  url: string
}

/**
 * No payment processor configured.
 * Caller MUST redirect to fallbackUrl (a mailto: link or static contact page).
 */
export interface CheckoutUnconfiguredResult {
  unconfigured: true
  fallbackUrl: string
}

export type CheckoutResult = CheckoutUrlResult | CheckoutUnconfiguredResult

// ── Webhook result ──────────────────────────────────────────────────────────────

export interface WebhookResult {
  ok: boolean
  /** The parsed event object when ok=true. Absent when ok=false. */
  event?: unknown
}

// ── PaymentProvider interface ──────────────────────────────────────────────────

/**
 * Abstract payment-processing operations.
 *
 * **Failsafe contract — createCheckoutSession:**
 *   Returns `{ unconfigured: true, fallbackUrl }` when required env vars are missing.
 *   The fallbackUrl is always a valid mailto: or contact URL.
 *   Never throws on missing config. Throws only on Stripe/Mollie API errors.
 *
 * **Failsafe contract — verifyWebhook:**
 *   Returns `{ ok: false }` when the webhook secret is unset (fail-CLOSED).
 *   Security-critical: matches app/api/fareharbor-webhook fail-closed pattern.
 *   Callers should return 503 when ok=false.
 */
export interface PaymentProvider {
  readonly kind: PaymentProviderKind

  /**
   * Create a hosted checkout session and return the URL to redirect to,
   * or an unconfigured result with a mailto: fallback if the provider is
   * not yet set up for this tenant.
   */
  createCheckoutSession(opts: CreateCheckoutOpts): Promise<CheckoutResult>

  /**
   * Verify an inbound webhook signature.
   * Returns `{ ok: false }` if the secret is unset (fail-CLOSED).
   * Returns `{ ok: true, event }` on a valid signature.
   */
  verifyWebhook(rawBody: string, signature: string | null): Promise<WebhookResult>
}
