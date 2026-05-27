/**
 * Pure event handlers for payment webhooks. Extracted from the HTTP route
 * handlers so they can be unit-tested without mocking Next.js Request objects.
 *
 * Pattern mirrors lib/webhook-router.ts (FareHarbor handlers) — pure functions
 * take `(event, deps)` and return a result object describing what happened.
 * The route handler is then a thin shell that:
 *   1. Verifies signature / secret
 *   2. Parses event
 *   3. Calls the handler
 *   4. Returns 200/500 based on the handler's result
 *
 * All handlers MUST be fail-quiet on email/notification errors — webhook
 * processors (Stripe, Mollie) retry on non-2xx responses, which would cause
 * duplicate-send disasters if a transient email failure bubbled up as a 500.
 */

import { welcomeAdoptionEmailHtml, welcomeAdoptionSubject, buildAdoptDiscountCodesEmail } from './email-templates.ts'
import { escapeHtml } from './html.ts'

// ── Stripe checkout.session.completed handler ────────────────────────────────

/**
 * Minimal shape of a Stripe Checkout Session we care about. Avoids depending on
 * the `stripe` SDK types since the SDK is dynamically imported and may not be
 * installed at build time.
 */
export interface StripeCheckoutSessionLike {
  id: string
  customer?: string | null
  subscription?: string | null
  amount_total?: number | null
  currency?: string | null
  metadata?: { tier?: 'monthly' | 'yearly' | string } | null
  customer_details?: {
    email?: string | null
    name?: string | null
  } | null
}

/** Email-sender shape — matches lib/mailer.ts sendEmail signature. */
export type SendEmailFn = (opts: {
  to?: string
  subject: string
  html: string
  scheduledAt?: string
  replyTo?: string
}) => Promise<{ id: string | null }>

export interface CheckoutCompletedDeps {
  sendEmail: SendEmailFn
  /** Override "now" for deterministic test assertions on scheduledAt. */
  now?: () => number
  /** Override 5-minute discount-codes delay. Defaults to 5 * 60 * 1000 ms. */
  discountCodesDelayMs?: number
}

export interface CheckoutCompletedResult {
  /** Did we attempt + succeed at the welcome email send? */
  welcomeSent: boolean
  /** Did we attempt + succeed at scheduling the discount-codes email? */
  codesScheduled: boolean
  /** When skipped or failed, what's the reason? */
  reason?:
    | 'missing-email'
    | 'invalid-tier'
    | 'welcome-send-failed'
    | 'codes-send-failed'
    | 'ok'
  /** ISO timestamp the discount-codes email was scheduled for, if any. */
  codesScheduledAt?: string
  /** Captured details for the caller to log. */
  meta: {
    sessionId: string
    tier?: string
    email?: string
  }
}

/**
 * Handle Stripe's `checkout.session.completed` event for Adopt-a-Paca.
 *
 * Steps:
 *   1. Skip silently (log warn) if `customer_details.email` missing.
 *   2. Skip silently if `metadata.tier` is not 'monthly' or 'yearly'.
 *   3. Send welcome email immediately. Fail-quiet: log + continue.
 *   4. Schedule discount-codes follow-up at now + 5min via Resend scheduledAt.
 *      Fail-quiet: welcome already sent; discount-codes failure must not retry.
 *
 * Returns a result describing what happened so the route can log + the tests
 * can assert. NEVER throws — webhook caller must always be able to return 200.
 */
export async function handleStripeCheckoutCompleted(
  session: StripeCheckoutSessionLike,
  deps: CheckoutCompletedDeps,
): Promise<CheckoutCompletedResult> {
  const tierRaw = session.metadata?.tier
  const tier: 'monthly' | 'yearly' | null =
    tierRaw === 'monthly' || tierRaw === 'yearly' ? tierRaw : null
  const email = session.customer_details?.email ?? undefined
  const name = session.customer_details?.name ?? undefined

  const meta = {
    sessionId: session.id,
    tier: tier ?? tierRaw ?? undefined,
    email: email ?? undefined,
  }

  if (!email) {
    return {
      welcomeSent: false,
      codesScheduled: false,
      reason: 'missing-email',
      meta,
    }
  }

  if (!tier) {
    return {
      welcomeSent: false,
      codesScheduled: false,
      reason: 'invalid-tier',
      meta,
    }
  }

  // Welcome + discount-codes are INDEPENDENT sends. Fire in parallel to halve
  // the webhook response latency (~200-400ms saved per /api/stripe-webhook hit).
  // Both are fail-quiet — webhook always returns 200 so Stripe doesn't retry,
  // which would duplicate-send to the donor.
  //
  // Defaults: discount-codes scheduled at now + 30s so it arrives while the
  // donor is still on the success page (was 5 min — too long; donor had
  // already navigated away). Override via deps.discountCodesDelayMs for tests
  // or staging.
  const delayMs = deps.discountCodesDelayMs ?? 5 * 60 * 1000
  const nowMs = (deps.now ?? Date.now)()
  const codesScheduledAt = new Date(nowMs + delayMs).toISOString()

  const [welcomeResult, codesResult] = await Promise.allSettled([
    deps.sendEmail({
      to: email,
      subject: welcomeAdoptionSubject(tier),
      html: welcomeAdoptionEmailHtml({
        escapedName: name ? escapeHtml(name) : undefined,
        tier,
        processor: 'Stripe',
        paymentRef: session.id,
      }),
    }),
    deps.sendEmail({
      to: email,
      scheduledAt: codesScheduledAt,
      ...buildAdoptDiscountCodesEmail({ name: name ?? '' }),
    }),
  ])

  const welcomeSent = welcomeResult.status === 'fulfilled'
  const codesScheduled = codesResult.status === 'fulfilled'

  if (!welcomeSent && !codesScheduled) {
    return { welcomeSent, codesScheduled, reason: 'welcome-send-failed', codesScheduledAt, meta }
  }
  if (!welcomeSent) {
    return { welcomeSent, codesScheduled, reason: 'welcome-send-failed', codesScheduledAt, meta }
  }
  if (!codesScheduled) {
    return { welcomeSent, codesScheduled, reason: 'codes-send-failed', codesScheduledAt, meta }
  }
  return { welcomeSent, codesScheduled, reason: 'ok', codesScheduledAt, meta }
}
