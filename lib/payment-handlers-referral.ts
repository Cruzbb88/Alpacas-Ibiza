/**
 * Per-adopter referral coupon generator — Stripe only.
 *
 * Creates a Stripe Coupon scoped to "first-time use, €5 off, 90-day expiry from
 * issue date." The coupon ID itself IS the referral code (ALPACA-<6 chars>).
 *
 * Friends type/click the code at /[locale]/adopt?referral=CODE; the checkout
 * route threads it through to Stripe `discounts: [{ coupon: code }]`.
 *
 * Mollie path: Mollie does not have a Coupon primitive. Mollie referrals
 * would require a separate code-table lookup — out of scope for v1.
 * Stripe-only referrals are fine for v1. Gap documented here.
 *
 * CALLER RESPONSIBILITY (ADR 016 pattern):
 * The caller (parallel AI's welcome handler OR renewal cron) must persist the
 * returned code into subscription metadata via:
 *   stripe.subscriptions.update(subscriptionId, {
 *     metadata: { ..., referral_code: code }
 *   })
 * This module does NOT do that — avoids cross-AI coupling.
 */

export interface CreateReferralOpts {
  donorEmail: string
  customerId: string   // Stripe customer ID
  subscriptionId: string
  expiryDays?: number  // default 90
}

export interface ReferralCreateResult {
  ok: boolean
  code?: string
  reason?: 'stripe-sdk-missing' | 'stripe-error' | 'unconfigured'
}

// Minimal Stripe coupon-create shape — only what we call.
interface StripeCouponCreateArgs {
  id: string
  amount_off: number
  currency: string
  duration: 'once'
  redeem_by?: number
  max_redemptions?: number
}

interface StripeCouponLike {
  id: string
}

export interface ReferralDeps {
  stripe: {
    coupons: {
      create: (args: StripeCouponCreateArgs) => Promise<StripeCouponLike>
    }
  } | null
  log: {
    info: (msg: string, meta?: object) => void
    warn: (msg: string, meta?: object) => void
  }
}

const REFERRAL_CODE_PREFIX = 'ALPACA-'
const REFERRAL_SUFFIX_LEN  = 6
const REFERRAL_AMOUNT_OFF  = 500  // €5.00 in cents
const DEFAULT_EXPIRY_DAYS  = 90

/**
 * Generate a short human-readable referral code: ALPACA-<6 uppercase chars>.
 * Uses crypto.randomUUID() and slices — avoids dictionary-word collisions.
 */
function generateReferralCode(): string {
  // crypto is available in Node 15+ and all modern edge runtimes.
  const raw = crypto.randomUUID().replace(/-/g, '').toUpperCase()
  return `${REFERRAL_CODE_PREFIX}${raw.slice(0, REFERRAL_SUFFIX_LEN)}`
}

/**
 * Create a Stripe Coupon for a donor.
 *
 * Fail-quiet on all Stripe errors — returns `{ok:false, reason}`.
 * The caller is responsible for persisting the code to subscription metadata.
 */
export async function createReferralCoupon(
  opts: CreateReferralOpts,
  deps: ReferralDeps,
): Promise<ReferralCreateResult> {
  if (!deps.stripe) {
    deps.log.warn('[referral] Stripe SDK not available — skipping referral coupon creation', {
      customerId: opts.customerId,
      subscriptionId: opts.subscriptionId,
    })
    return { ok: false, reason: 'stripe-sdk-missing' }
  }

  const expiryDays = opts.expiryDays ?? DEFAULT_EXPIRY_DAYS
  const redeemByUnix = Math.floor((Date.now() + expiryDays * 24 * 60 * 60 * 1000) / 1000)
  const code = generateReferralCode()

  try {
    const coupon = await deps.stripe.coupons.create({
      id: code,
      amount_off: REFERRAL_AMOUNT_OFF,
      currency: 'eur',
      duration: 'once',
      redeem_by: redeemByUnix,
      max_redemptions: 1,
    })

    deps.log.info('[referral] coupon created', {
      couponId: coupon.id,
      customerId: opts.customerId,
      subscriptionId: opts.subscriptionId,
      expiresAt: new Date(redeemByUnix * 1000).toISOString(),
    })

    return { ok: true, code: coupon.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    deps.log.warn('[referral] Stripe coupon creation failed (fail-quiet)', {
      error: message,
      customerId: opts.customerId,
      subscriptionId: opts.subscriptionId,
    })
    return { ok: false, reason: 'stripe-error' }
  }
}
