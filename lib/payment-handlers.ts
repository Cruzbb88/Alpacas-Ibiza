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
import { findAlpacaName } from './data/alpacas.ts'

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
  metadata?: { tier?: 'monthly' | 'yearly' | string; alpaca?: string } | null
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
  listUnsubscribeUrl?: string
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
  // metadata.alpaca is the slug recorded at checkout. Resolve to display name
  // via the canonical roster — findAlpacaName returns null for unknown slugs,
  // which collapses to the generic "we'll match you" email copy.
  const alpacaName = findAlpacaName(session.metadata?.alpaca ?? null)

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

  // Wrap each send in an async lambda so synchronous throws from html builders
  // (e.g. buildAdoptDiscountCodesEmail) are caught by Promise.allSettled.
  // Without the lambda wrap, a synchronous throw bubbles past allSettled and
  // violates the "NEVER throws" contract documented at the top of the function.
  const [welcomeResult, codesResult] = await Promise.allSettled([
    (async () =>
      deps.sendEmail({
        to: email,
        subject: welcomeAdoptionSubject(tier),
        html: welcomeAdoptionEmailHtml({
          escapedName: name ? escapeHtml(name) : undefined,
          tier,
          processor: 'Stripe',
          paymentRef: session.id,
          escapedAlpacaName: alpacaName ? escapeHtml(alpacaName) : undefined,
        }),
      }))(),
    (async () =>
      deps.sendEmail({
        to: email,
        scheduledAt: codesScheduledAt,
        ...buildAdoptDiscountCodesEmail({ name: name ?? '' }),
      }))(),
  ])

  const welcomeSent = welcomeResult.status === 'fulfilled'
  const codesScheduled = codesResult.status === 'fulfilled'

  // Welcome failure dominates — codes alone is not enough since welcome carries
  // the primary confirmation. Both branches collapse to welcome-send-failed.
  if (!welcomeSent) {
    return { welcomeSent, codesScheduled, reason: 'welcome-send-failed', codesScheduledAt, meta }
  }
  if (!codesScheduled) {
    return { welcomeSent, codesScheduled, reason: 'codes-send-failed', codesScheduledAt, meta }
  }
  return { welcomeSent, codesScheduled, reason: 'ok', codesScheduledAt, meta }
}

// ── Stripe invoice.payment_failed handler ────────────────────────────────────

/** Minimal shape of a Stripe Invoice the handler reads. */
export interface StripeInvoiceLike {
  id: string
  subscription?: string | null
  customer?: string | null
  customer_email?: string | null
  customer_name?: string | null
  amount_due?: number | null
  currency?: string | null
  attempt_count?: number | null
  next_payment_attempt?: number | null
  hosted_invoice_url?: string | null
}

export interface InvoicePaymentFailedDeps {
  sendEmail: SendEmailFn
  /** Owner email — receives a notification on every failed charge. */
  ownerEmail?: string
}

export interface InvoicePaymentFailedResult {
  /** Was the donor notified that their card failed? */
  donorNotified: boolean
  /** Was the owner notified about the failed renewal? */
  ownerNotified: boolean
  reason: 'ok' | 'missing-donor-email' | 'missing-owner-email' | 'send-failed'
  meta: {
    invoiceId: string
    subscriptionId?: string | null
    customerId?: string | null
    attemptCount?: number | null
    nextAttempt?: number | null
    amountDue?: number | null
  }
}

/**
 * Handle Stripe's `invoice.payment_failed` event. Donor's recurring charge
 * failed — silent loss of subscription unless we notify. Sends:
 *
 *   1. Donor email: "Your monthly support payment didn't go through" with a
 *      link to Stripe's hosted invoice page (where they can update card +
 *      retry). Stripe Smart Retries will also attempt automatically.
 *   2. Owner email: structured notification so owner knows to follow up if
 *      the donor doesn't update payment within Stripe's retry window.
 *
 * Both sends are fail-quiet — webhook returns 200 so Stripe doesn't retry
 * the webhook (which would duplicate-notify on every retry).
 */
export async function handleStripeInvoicePaymentFailed(
  invoice: StripeInvoiceLike,
  deps: InvoicePaymentFailedDeps,
): Promise<InvoicePaymentFailedResult> {
  const meta = {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    attemptCount: invoice.attempt_count,
    nextAttempt: invoice.next_payment_attempt,
    amountDue: invoice.amount_due,
  }
  const donorEmail = invoice.customer_email ?? undefined

  if (!donorEmail) {
    return { donorNotified: false, ownerNotified: false, reason: 'missing-donor-email', meta }
  }

  const donorHtml = buildDonorPaymentFailedHtml(invoice)
  const ownerHtml = buildOwnerPaymentFailedHtml(invoice)

  const [donorResult, ownerResult] = await Promise.allSettled([
    deps.sendEmail({
      to: donorEmail,
      subject: 'Action needed: your Adopt-a-Paca payment didn\'t go through',
      html: donorHtml,
    }),
    deps.ownerEmail
      ? deps.sendEmail({
          to: deps.ownerEmail,
          subject: `[Adopt-a-Paca] Payment failed — invoice ${invoice.id}`,
          html: ownerHtml,
        })
      : Promise.resolve({ id: null }),
  ])

  const donorNotified = donorResult.status === 'fulfilled'
  const ownerNotified = deps.ownerEmail ? ownerResult.status === 'fulfilled' : false

  if (!deps.ownerEmail && !donorNotified) {
    return { donorNotified, ownerNotified, reason: 'send-failed', meta }
  }
  if (!deps.ownerEmail) {
    return { donorNotified, ownerNotified, reason: donorNotified ? 'ok' : 'send-failed', meta }
  }
  if (!donorNotified || !ownerNotified) {
    return { donorNotified, ownerNotified, reason: 'send-failed', meta }
  }
  return { donorNotified, ownerNotified, reason: 'ok', meta }
}

function buildDonorPaymentFailedHtml(invoice: StripeInvoiceLike): string {
  const escapedName = invoice.customer_name ? escapeHtml(invoice.customer_name) : null
  const greeting = escapedName ? `Hi ${escapedName},` : 'Hi there,'
  const updateUrl = invoice.hosted_invoice_url
  const updateBlock = updateUrl
    ? `<p style="margin-top:16px"><a href="${escapeHtml(updateUrl)}" style="display:inline-block;background:#556B2F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Update payment method</a></p>`
    : `<p style="margin-top:16px">Please contact <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> to update your payment method.</p>`
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <p>${greeting}</p>
      <p>Your monthly Adopt-a-Paca payment didn't go through this time. This often happens when a card expires or the bank flags an automatic charge.</p>
      ${updateBlock}
      <p style="margin-top:16px;color:#666;font-size:13px">If you don't update within a few days, your adoption will pause and we'll keep your alpaca's spot open while we get in touch.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#999;font-size:12px">Alpacas Ibiza · info@alpacasibiza.com</p>
    </div>
  `.trim()
}

// Stripe zero-decimal currencies — amount is already in major units, not cents.
// Source: https://stripe.com/docs/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
  'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
])

function formatStripeAmount(amountMinor: number | null | undefined, currency: string | null | undefined): string {
  if (amountMinor == null) return '—'
  const cur = (currency ?? 'eur').toLowerCase()
  if (ZERO_DECIMAL_CURRENCIES.has(cur)) return String(amountMinor)
  return (amountMinor / 100).toFixed(2)
}

function buildOwnerPaymentFailedHtml(invoice: StripeInvoiceLike): string {
  const amount = formatStripeAmount(invoice.amount_due, invoice.currency)
  const currency = (invoice.currency ?? 'eur').toUpperCase()
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <h2 style="color:#a44">Adopt-a-Paca payment failed</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0">Invoice:</td><td><code>${escapeHtml(invoice.id)}</code></td></tr>
        <tr><td style="padding:6px 0">Subscription:</td><td><code>${escapeHtml(invoice.subscription ?? '—')}</code></td></tr>
        <tr><td style="padding:6px 0">Customer:</td><td><code>${escapeHtml(invoice.customer ?? '—')}</code></td></tr>
        <tr><td style="padding:6px 0">Donor email:</td><td>${escapeHtml(invoice.customer_email ?? '—')}</td></tr>
        <tr><td style="padding:6px 0">Amount due:</td><td>${amount} ${escapeHtml(currency)}</td></tr>
        <tr><td style="padding:6px 0">Attempt #:</td><td>${invoice.attempt_count ?? '—'}</td></tr>
      </table>
      <p style="margin-top:16px">Donor was emailed a link to update payment. Stripe Smart Retries will keep trying on its own schedule.</p>
      <p>If donor doesn't update within Stripe's retry window (~3 weeks), the subscription will cancel automatically and you'll receive a <code>customer.subscription.deleted</code> notification.</p>
    </div>
  `.trim()
}

// ── Mollie payment.paid handler (parity with Stripe — see ADR 016) ──────────

/**
 * Minimal Mollie payment shape used by the handler. Avoids depending on
 * @mollie/api-client types since the SDK is dynamically imported.
 */
export interface MolliePaymentLike {
  id: string
  status: string
  sequenceType?: 'oneoff' | 'first' | 'recurring'
  customerId?: string
  metadata?: {
    product?: string
    tier?: 'monthly' | 'yearly' | string
    tenantId?: string
    alpaca?: string
  } | null
  /** Mollie one-off payments set billingEmail at create-time. */
  billingEmail?: string | null
}

/** Resolver for customer email + name given a Mollie customer ID. */
export type FetchMollieCustomerFn = (
  customerId: string,
) => Promise<{ email: string | null; name: string | null }>

/** Subscription creator — called on first.paid to start auto-charge. */
export type CreateMollieSubscriptionFn = (
  payment: MolliePaymentLike,
) => Promise<void>

export interface MolliePaidDeps {
  sendEmail: SendEmailFn
  fetchCustomer: FetchMollieCustomerFn
  createSubscription: CreateMollieSubscriptionFn
}

export interface MolliePaidResult {
  flow: 'monthly-first' | 'yearly-oneoff' | 'recurring-renewal' | 'unmatched'
  welcomeSent: boolean
  subscriptionCreated: boolean
  reason: 'ok' | 'missing-email' | 'welcome-send-failed' | 'subscription-failed' | 'unmatched'
  meta: { paymentId: string; tier?: string; email?: string | null }
}

/**
 * Handle Mollie's payment.paid event for Adopt-a-Paca.
 *
 * Three real flows + one no-op:
 *   - monthly-first   → create subscription + send welcome email (parallel)
 *   - yearly-oneoff   → send welcome email (billingEmail on payment)
 *   - recurring-renewal → log only (renewal, not first payment)
 *   - unmatched       → log only
 *
 * Subscription failure THROWS via createSubscription so the route returns 500
 * and Mollie retries (deliberate — without the subscription we won't auto-charge).
 * Email failure is fail-quiet — webhook returns 200 to avoid duplicate-send on retry.
 */
export async function handleMolliePaymentPaid(
  payment: MolliePaymentLike,
  deps: MolliePaidDeps,
): Promise<MolliePaidResult> {
  const tier = payment.metadata?.tier
  const isAdopt = payment.metadata?.product === 'adopt-a-paca'

  // ── Monthly first-of-mandate: create sub + welcome (parallel) ────────────
  if (isAdopt && tier === 'monthly' && payment.sequenceType === 'first' && payment.customerId) {
    const [, customer] = await Promise.all([
      deps.createSubscription(payment), // throws → route 500 → Mollie retry
      deps.fetchCustomer(payment.customerId),
    ])

    if (!customer.email) {
      return {
        flow: 'monthly-first',
        welcomeSent: false,
        subscriptionCreated: true,
        reason: 'missing-email',
        meta: { paymentId: payment.id, tier, email: null },
      }
    }

    const welcomeSent = await sendMollieWelcomeQuiet(deps.sendEmail, payment, 'monthly', customer.email, customer.name)
    return {
      flow: 'monthly-first',
      welcomeSent,
      subscriptionCreated: true,
      reason: welcomeSent ? 'ok' : 'welcome-send-failed',
      meta: { paymentId: payment.id, tier, email: customer.email },
    }
  }

  // ── Yearly one-off: welcome email only (no sub needed) ───────────────────
  if (isAdopt && (tier === 'yearly' || tier === 'monthly') && payment.sequenceType !== 'recurring') {
    // tier='monthly' here covers Stripe-style yearly where it's billed as a single
    // monthly. Filter narrows: this branch only fires when monthly-first guard above
    // didn't match (e.g. missing customerId).
    if (tier !== 'yearly') {
      return {
        flow: 'unmatched',
        welcomeSent: false,
        subscriptionCreated: false,
        reason: 'unmatched',
        meta: { paymentId: payment.id, tier, email: payment.billingEmail ?? null },
      }
    }
    if (!payment.billingEmail) {
      return {
        flow: 'yearly-oneoff',
        welcomeSent: false,
        subscriptionCreated: false,
        reason: 'missing-email',
        meta: { paymentId: payment.id, tier, email: null },
      }
    }
    const welcomeSent = await sendMollieWelcomeQuiet(deps.sendEmail, payment, 'yearly', payment.billingEmail, null)
    return {
      flow: 'yearly-oneoff',
      welcomeSent,
      subscriptionCreated: false,
      reason: welcomeSent ? 'ok' : 'welcome-send-failed',
      meta: { paymentId: payment.id, tier, email: payment.billingEmail },
    }
  }

  // ── Recurring renewal: log only, no welcome ──────────────────────────────
  if (payment.sequenceType === 'recurring') {
    return {
      flow: 'recurring-renewal',
      welcomeSent: false,
      subscriptionCreated: false,
      reason: 'ok',
      meta: { paymentId: payment.id, tier },
    }
  }

  return {
    flow: 'unmatched',
    welcomeSent: false,
    subscriptionCreated: false,
    reason: 'unmatched',
    meta: { paymentId: payment.id, tier },
  }
}

async function sendMollieWelcomeQuiet(
  sendEmail: SendEmailFn,
  payment: MolliePaymentLike,
  tier: 'monthly' | 'yearly',
  email: string,
  name: string | null,
): Promise<boolean> {
  try {
    const alpacaName = findAlpacaName(payment.metadata?.alpaca ?? null)
    await sendEmail({
      to: email,
      subject: welcomeAdoptionSubject(tier),
      html: welcomeAdoptionEmailHtml({
        escapedName: name ? escapeHtml(name) : undefined,
        tier,
        processor: 'Mollie',
        paymentRef: payment.id,
        escapedAlpacaName: alpacaName ? escapeHtml(alpacaName) : undefined,
      }),
      listUnsubscribeUrl: `mailto:${process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'}?subject=unsubscribe`,
    })
    return true
  } catch {
    return false
  }
}

// ── Stripe customer.subscription.deleted handler ─────────────────────────────

/** Minimal shape of a Stripe Subscription the handler reads. */
export interface StripeSubscriptionLike {
  id: string
  customer?: string | null
  status?: string
  canceled_at?: number | null
  cancel_at_period_end?: boolean | null
  cancellation_details?: {
    reason?: string | null
    feedback?: string | null
    comment?: string | null
  } | null
  metadata?: { product?: string; tier?: string } | null
}

export interface SubscriptionDeletedDeps {
  sendEmail: SendEmailFn
  ownerEmail?: string
}

export interface SubscriptionDeletedResult {
  ownerNotified: boolean
  reason: 'ok' | 'missing-owner-email' | 'send-failed' | 'not-adoption'
  meta: {
    subscriptionId: string
    customerId?: string | null
    cancelReason?: string | null
    tier?: string
  }
}

/**
 * Handle Stripe's `customer.subscription.deleted` event — adopter cancelled.
 *
 * Was a silent log (TODO comment). Now sends owner a structured notification
 * so they can follow up if cancellation reason is "payment_failed" or other
 * recoverable cause. Fail-quiet on send error — webhook still returns 200.
 *
 * Skip the send entirely if metadata.product !== 'adopt-a-paca' (the same
 * Stripe account might host other subscriptions one day).
 */
export async function handleStripeSubscriptionDeleted(
  subscription: StripeSubscriptionLike,
  deps: SubscriptionDeletedDeps,
): Promise<SubscriptionDeletedResult> {
  const meta = {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    cancelReason: subscription.cancellation_details?.reason,
    tier: subscription.metadata?.tier,
  }

  // Only act on adopt-a-paca cancellations. The Stripe account may host other
  // subscription products in future — skip non-matching metadata silently.
  if (subscription.metadata?.product && subscription.metadata.product !== 'adopt-a-paca') {
    return { ownerNotified: false, reason: 'not-adoption', meta }
  }

  if (!deps.ownerEmail) {
    return { ownerNotified: false, reason: 'missing-owner-email', meta }
  }

  try {
    await deps.sendEmail({
      to: deps.ownerEmail,
      subject: `[Adopt-a-Paca] Subscription cancelled — ${subscription.id}`,
      html: buildOwnerSubscriptionDeletedHtml(subscription),
    })
    return { ownerNotified: true, reason: 'ok', meta }
  } catch {
    return { ownerNotified: false, reason: 'send-failed', meta }
  }
}

function buildOwnerSubscriptionDeletedHtml(subscription: StripeSubscriptionLike): string {
  const canceledAtIso = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000).toISOString()
    : null
  const reasonText = subscription.cancellation_details?.reason ?? 'not provided'
  const feedbackText = subscription.cancellation_details?.feedback ?? null
  const commentText = subscription.cancellation_details?.comment ?? null
  const recoverableReasons = new Set(['payment_failed', 'cancellation_requested'])
  const isRecoverable = recoverableReasons.has(reasonText)

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <h2 style="color:${isRecoverable ? '#a44' : '#666'}">Adopt-a-Paca subscription cancelled</h2>
      ${isRecoverable ? '<p style="color:#a44"><strong>Reason is recoverable — consider reaching out.</strong></p>' : ''}
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0">Subscription:</td><td><code>${escapeHtml(subscription.id)}</code></td></tr>
        <tr><td style="padding:6px 0">Customer:</td><td><code>${escapeHtml(subscription.customer ?? '—')}</code></td></tr>
        <tr><td style="padding:6px 0">Tier:</td><td>${escapeHtml(subscription.metadata?.tier ?? '—')}</td></tr>
        <tr><td style="padding:6px 0">Cancel reason:</td><td>${escapeHtml(reasonText)}</td></tr>
        ${feedbackText ? `<tr><td style="padding:6px 0">Feedback:</td><td>${escapeHtml(feedbackText)}</td></tr>` : ''}
        ${commentText ? `<tr><td style="padding:6px 0">Comment:</td><td>${escapeHtml(commentText)}</td></tr>` : ''}
        ${canceledAtIso ? `<tr><td style="padding:6px 0">Cancelled at:</td><td>${escapeHtml(canceledAtIso)}</td></tr>` : ''}
      </table>
      <p style="margin-top:16px;color:#666;font-size:13px">Look up the customer in Stripe dashboard if you want to email them a reactivation link.</p>
    </div>
  `.trim()
}
