/**
 * mollie PaymentProvider adapter.
 *
 * Mollie is popular in NL/ES and supports SEPA Direct Debit natively —
 * a natural fit for alpacasibiza.com's European market. SEPA Direct Debit
 * for recurring Adopt-a-Paca subscriptions costs €0.25 flat per charge vs
 * Stripe's ~€1.75 per charge at €75/mo (see handoff doc for full maths).
 *
 * OWNER_INPUT_NEEDED: requires a Mollie merchant account.
 *   1. Create account at https://www.mollie.com (NL/ES company supported)
 *   2. Dashboard → Developers → API keys → copy live key (live_xxx) or test key (test_xxx)
 *   3. Dashboard → Payment methods → enable SEPA Direct Debit + Cards + iDEAL + Bancontact
 *   4. Set env vars:
 *        MOLLIE_API_KEY=live_xxx (or test_xxx for staging)
 *        MOLLIE_WEBHOOK_SECRET=<random 32+ char hex string>
 *
 * API model (different from Stripe — no Prices, uses Customers + Payments + Subscriptions):
 *   - Yearly (one-time €900): create a Payment with sequenceType=oneoff. Returns hosted checkout URL.
 *   - Monthly (€75/mo recurring):
 *       Step 1: Create Customer (email captured at checkout)
 *       Step 2: Create "first" Payment with sequenceType=first + customerId → mandate
 *       Step 3: Webhook fires on payment.paid → server creates Subscription
 *       Step 4: Mollie auto-charges on schedule, fires webhook for each renewal
 *
 * Webhook security (different from Stripe — no HMAC signature):
 *   Mollie webhooks POST `id=<payment_id>` (form-encoded, not JSON) with no signature.
 *   Verification = URL-path secret (rejects spoofed POSTs) + server-side payment
 *   fetch from Mollie API (status comes from authenticated API call, not webhook body).
 *
 * Failsafe — createCheckoutSession:
 *   Returns { unconfigured: true, fallbackUrl } if MOLLIE_API_KEY unset, SDK missing,
 *   or tier/amount lookup fails. Never throws on missing config.
 *
 * Failsafe — verifyWebhook:
 *   Returns { ok: false } if MOLLIE_API_KEY or MOLLIE_WEBHOOK_SECRET unset (fail-CLOSED).
 *   Mirrors app/api/fareharbor-webhook fail-closed pattern.
 *
 * Dynamic import guard: `@mollie/api-client` imported at runtime — not a required dep.
 * Build succeeds without the SDK; at runtime the try/catch returns { unconfigured: true }.
 * Owner installs via `pnpm add @mollie/api-client` as part of deploy step.
 *
 * Overload note — productId field:
 *   The shared CreateCheckoutOpts.productId is a Stripe Price ID for stripe-direct.
 *   For Mollie there is no equivalent; we overload productId to carry the tier
 *   string ('monthly' | 'yearly'). The Mollie adapter looks up the price from
 *   lib/config.ts ADOPT_PRICE_*_EUR constants (single source of truth, Rule 6).
 */

import type {
  PaymentProvider,
  CheckoutResult,
  WebhookResult,
  CreateCheckoutOpts,
} from './payment'
import {
  ADOPT_PRICE_MONTHLY_EUR,
  ADOPT_PRICE_YEARLY_EUR,
  SITE_BASE_URL,
} from '../config.ts'
import { makeRequestLogger } from '../request-id.ts'

const log = makeRequestLogger('payment-mollie', '')

const FALLBACK_MAILTO =
  'mailto:info@alpacasibiza.com?subject=Adopt%20an%20Alpaca%20enquiry'

type AdoptTier = 'monthly' | 'yearly'

function isAdoptTier(value: string | undefined): value is AdoptTier {
  return value === 'monthly' || value === 'yearly'
}

/**
 * Resolve the Mollie webhook URL (with URL-path secret) the server tells
 * Mollie to POST to. Exported so the route handler can reconstruct it for
 * subscription creation in the webhook (mandate→subscription dance).
 */
export function getMollieWebhookUrl(secret: string): string {
  return `${SITE_BASE_URL}/api/mollie-webhook?secret=${encodeURIComponent(secret)}`
}

/**
 * Real SDK type — imported as type-only so the runtime dynamic-import + missing-
 * package fallback still work. `@mollie/api-client` is now an `optionalDependency`
 * (per ADR 019 follow-up); CI installs it so tsc + eslint catch shape errors at
 * build time, but production deploys can still ship without it. Previous code
 * used `type MollieClient = any` which hid four CRITICAL SDK bugs (snake_case
 * `customers_subscriptions` vs camelCase `customerSubscriptions`, calling
 * non-existent `.list()` etc.) — see code-review findings 2026-05-28.
 */
import type { MollieClient } from '@mollie/api-client'

type MollieFactory = (opts: { apiKey: string }) => MollieClient

// sentinel: undefined = not yet attempted; null = attempted but module missing
let _mollieFactory: MollieFactory | null | undefined = undefined

export async function importMollie(): Promise<MollieFactory | null> {
  // Local copy so TS narrows the union (module-level mutable widens otherwise).
  const cached = _mollieFactory
  if (cached !== undefined) return cached
  try {
    // Runtime import keeps the SDK optional: production deploys can omit
    // @mollie/api-client and the catch below returns null. The `type` import
    // up top means tsc still type-checks every call site against the real SDK.
    // ESM vs CJS interop: when bundlers / runtimes resolve the package the
    // factory can appear as the module itself (CJS) or under `.default` (ESM)
    // or as a named export. Probe all three; cast through `unknown` so the
    // type system doesn't pre-narrow `mod` and hide one of the branches.
    const modUnknown = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@mollie/api-client')) as unknown
    const m = modUnknown as { createMollieClient?: MollieFactory; default?: MollieFactory | { createMollieClient?: MollieFactory } } | MollieFactory
    let candidate: unknown
    if (typeof m === 'function') {
      candidate = m
    } else {
      candidate =
        m.createMollieClient ??
        (typeof m.default === 'function' ? m.default : m.default?.createMollieClient)
    }
    _mollieFactory = typeof candidate === 'function' ? (candidate as MollieFactory) : null
    return _mollieFactory ?? null
  } catch {
    _mollieFactory = null
    return null
  }
}

/** Reset the cache. @internal — for tests only. */
export function __resetMollieImportCache(): void {
  _mollieFactory = undefined
}

/**
 * Convenience: load the SDK + construct a client with the given API key.
 * Returns null if the SDK isn't installed. Lets callers skip the
 * factory-or-null boilerplate they'd otherwise repeat.
 */
export async function getMollieClient(apiKey: string): Promise<MollieClient | null> {
  const factory = await importMollie()
  if (!factory) return null
  return factory({ apiKey })
}

export function molliePaymentProvider(opts?: {
  fallbackUrl?: string
}): PaymentProvider {
  const fallbackUrl = opts?.fallbackUrl ?? FALLBACK_MAILTO

  return {
    kind: 'mollie',

    async createCheckoutSession(
      checkoutOpts: CreateCheckoutOpts,
    ): Promise<CheckoutResult> {
      const apiKey = process.env.MOLLIE_API_KEY
      if (!apiKey) {
        log.warn('[mollie] MOLLIE_API_KEY unset — falling back to mailto.')
        return { unconfigured: true, fallbackUrl }
      }

      const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET
      if (!webhookSecret) {
        log.warn(
          '[mollie] MOLLIE_WEBHOOK_SECRET unset — falling back to mailto. Recurring subscriptions cannot be created without a verifiable webhook URL.',
        )
        return { unconfigured: true, fallbackUrl }
      }

      const tier = checkoutOpts.productId
      if (!isAdoptTier(tier)) {
        log.warn(
          `[mollie] productId must be 'monthly' or 'yearly' (received '${tier ?? 'undefined'}') — falling back to mailto.`,
        )
        return { unconfigured: true, fallbackUrl }
      }

      const factory = await importMollie()
      if (!factory) {
        log.error(
          '[mollie] @mollie/api-client not installed. Run: pnpm add @mollie/api-client  (owner-controlled deploy step).',
        )
        return { unconfigured: true, fallbackUrl }
      }

      const mollie: MollieClient = factory({ apiKey })

      const amount =
        tier === 'monthly' ? ADOPT_PRICE_MONTHLY_EUR : ADOPT_PRICE_YEARLY_EUR
      const description =
        tier === 'monthly'
          ? 'Adopt-a-Paca — monthly subscription'
          : 'Adopt-a-Paca — yearly support'

      try {
        // Yearly is a one-off Payment (no subscription needed).
        // Monthly is a "first" Payment that establishes a SEPA/card mandate;
        // the webhook handler then creates a Subscription on payment.paid.
        //
        // The SDK's Payment.create + Customer.create types are strict — we
        // build a loose object first, then cast to the SDK shape at call
        // time. Cast through `unknown` to make the boundary explicit.
        const paymentArgs: Record<string, unknown> = {
          amount: { value: amount.toFixed(2), currency: 'EUR' },
          description,
          redirectUrl: checkoutOpts.returnUrl,
          webhookUrl: getMollieWebhookUrl(webhookSecret),
          metadata: {
            product: 'adopt-a-paca',
            tier,
            tenantId: checkoutOpts.tenantId,
            ...(checkoutOpts.locale ? { locale: checkoutOpts.locale } : {}),
            ...(checkoutOpts.alpacaSlug ? { alpaca: checkoutOpts.alpacaSlug } : {}),
            // Referrer attribution — written here so the resulting
            // Subscription (created in the webhook on payment.paid via
            // metadata copy) carries it forward for the admin referrals
            // dashboard. The mollie-webhook handler is expected to forward
            // payment.metadata.referredBy onto the Subscription metadata.
            ...(checkoutOpts.referredBy ? { referredBy: checkoutOpts.referredBy } : {}),
            ...(checkoutOpts.gift
              ? {
                  gift_recipient_email: checkoutOpts.gift.recipientEmail,
                  gift_recipient_name: checkoutOpts.gift.recipientName,
                  gift_sender_name: checkoutOpts.gift.senderName,
                  gift_message: checkoutOpts.gift.message,
                  ...(checkoutOpts.gift.sendDate
                    ? { gift_send_date: checkoutOpts.gift.sendDate }
                    : {}),
                }
              : {}),
            // EU Directive 2011/83 Art 16(m) audit trail.
            waiver_accepted: checkoutOpts.waiverAccepted ? '1' : '0',
            ...(checkoutOpts.waiverAcceptedAt
              ? { waiver_accepted_at: checkoutOpts.waiverAcceptedAt }
              : {}),
          },
        }

        if (tier === 'monthly') {
          // Mandate-creating first payment — needs a Customer.
          const customerArgs = {
            email: checkoutOpts.customerEmail ?? undefined,
            metadata: { tenantId: checkoutOpts.tenantId, tier },
          } as unknown as Parameters<typeof mollie.customers.create>[0]
          const customer = await mollie.customers.create(customerArgs)
          paymentArgs.customerId = customer.id
          paymentArgs.sequenceType = 'first'
        } else {
          paymentArgs.sequenceType = 'oneoff'
          if (checkoutOpts.customerEmail) {
            // For one-off we don't need a Customer — billingEmail covers receipts.
            paymentArgs.billingEmail = checkoutOpts.customerEmail
          }
        }

        // mollie.payments.create has overload signatures returning either
        // Promise<Payment> or void (callback variant). The intersection is
        // unusable; cast through unknown to lock in the Promise overload.
        const payment = (await mollie.payments.create(
          paymentArgs as unknown as Parameters<typeof mollie.payments.create>[0],
        )) as unknown as {
          id: string
          getCheckoutUrl?: () => string | undefined
          _links?: { checkout?: { href?: string } }
        }
        const checkoutUrl: string | undefined =
          typeof payment.getCheckoutUrl === 'function'
            ? payment.getCheckoutUrl()
            : payment._links?.checkout?.href

        if (!checkoutUrl) {
          log.error(
            '[mollie] Payment created but no checkout URL returned',
            { id: payment.id },
          )
          return { unconfigured: true, fallbackUrl }
        }

        return { url: checkoutUrl }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.error('[mollie] Payment creation failed:', { message })
        return { unconfigured: true, fallbackUrl }
      }
    },

    /**
     * Verify an inbound Mollie webhook.
     *
     * Mollie's webhook security model is fundamentally different from Stripe's:
     *   - No HMAC signature header (the `signature` arg is unused).
     *   - Body is form-encoded `id=tr_xxx`, NOT JSON.
     *   - To verify, fetch the payment from Mollie's authenticated API and
     *     read its status from there (the webhook body could be spoofed but
     *     a payment ID for someone else's account will 404).
     *
     * This implementation:
     *   1. Reads payment ID from the raw body (caller must pass the body string).
     *   2. Fetches the payment via authenticated API.
     *   3. Returns { ok: true, event: { type, payment } } on success.
     *
     * URL-path secret check happens in the route handler BEFORE this method
     * is called (defence in depth — drop spoofed POSTs early without spending
     * a Mollie API call).
     */
    async verifyWebhook(
      rawBody: string,
      _signature: string | null,
    ): Promise<WebhookResult> {
      const apiKey = process.env.MOLLIE_API_KEY
      if (!apiKey) {
        log.error(
          '[mollie] MOLLIE_API_KEY unset — returning ok:false (fail-closed).',
        )
        return { ok: false }
      }
      if (!process.env.MOLLIE_WEBHOOK_SECRET) {
        log.error(
          '[mollie] MOLLIE_WEBHOOK_SECRET unset — returning ok:false (fail-closed).',
        )
        return { ok: false }
      }

      // Mollie body: `id=tr_xxx` (urlencoded). Be tolerant of either raw or pre-parsed.
      const params = new URLSearchParams(rawBody)
      const paymentId = params.get('id')
      if (!paymentId || !/^(tr|sub)_[A-Za-z0-9]+$/.test(paymentId)) {
        log.warn(
          `[mollie] Webhook rejected — invalid or missing id (got '${paymentId ?? 'null'}').`,
        )
        return { ok: false }
      }

      const factory = await importMollie()
      if (!factory) {
        log.error(
          '[mollie] @mollie/api-client not installed — cannot verify webhook.',
        )
        return { ok: false }
      }

      const mollie: MollieClient = factory({ apiKey })

      try {
        const payment = await mollie.payments.get(paymentId)
        return {
          ok: true,
          event: {
            type: `payment.${payment.status}`,
            payment,
          },
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        log.warn(
          `[mollie] Webhook payment fetch failed for ${paymentId}: ${message}`,
        )
        return { ok: false }
      }
    },
  }
}
