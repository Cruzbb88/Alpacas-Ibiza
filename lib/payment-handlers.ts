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
import { SITE_BASE_URL } from './config.ts'
import { recordFailure, resetFailures, type FailureSeverity } from './payment-failure-tracker.ts'
import { notifyOwnerOnEscalation } from './owner-notify.ts'

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
  metadata?: {
    tier?: 'monthly' | 'yearly' | string
    alpaca?: string
    /** Gift recipient fields — set when buyer purchased via the gift wizard. */
    gift_recipient_email?: string
    gift_recipient_name?: string
    gift_sender_name?: string
    gift_message?: string
    gift_send_date?: string
  } | null
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
  /**
   * When set, also send an owner-facing notification on successful checkout
   * so the owner knows they have a new adopter before checking the Stripe
   * dashboard. Unset → no owner email (silent, no log noise). Fail-quiet
   * mirrors the welcome path — owner-notification failure cannot trigger
   * Stripe webhook retry (would duplicate-send to the donor).
   */
  ownerEmail?: string
}

export interface CheckoutCompletedResult {
  /** Did we attempt + succeed at the welcome email send? */
  welcomeSent: boolean
  /** Did we attempt + succeed at scheduling the discount-codes email? */
  codesScheduled: boolean
  /**
   * Did we attempt + succeed at the owner-notification email?
   * - `null` = deps.ownerEmail was unset; nothing to send.
   * - `true` = sent successfully.
   * - `false` = attempted but threw (fail-quiet; result still returns 200-shape).
   */
  ownerNotified: boolean | null
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

  // Reset Stripe-side failure counter on a successful checkout. Even though
  // Stripe Smart Retries handles most card retries internally, an initial
  // success after a prior incident should still flush the tracker.
  if (typeof session.customer === 'string' && session.customer.length > 0) {
    resetFailures('stripe', session.customer)
  }

  if (!email) {
    return {
      welcomeSent: false,
      codesScheduled: false,
      ownerNotified: deps.ownerEmail ? false : null,
      reason: 'missing-email',
      meta,
    }
  }

  if (!tier) {
    return {
      welcomeSent: false,
      codesScheduled: false,
      ownerNotified: deps.ownerEmail ? false : null,
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
  // Three independent sends — donor welcome + donor discount-codes + owner notify.
  // All fail-quiet. Owner notify only fires when ownerEmail is provided.
  // Gift fields from metadata — route welcome to recipient when present.
  const giftRecipientEmail = typeof session.metadata?.gift_recipient_email === 'string' && session.metadata.gift_recipient_email.length > 0
    ? session.metadata.gift_recipient_email
    : null
  const giftRecipientName = session.metadata?.gift_recipient_name ?? null
  const giftSenderName = session.metadata?.gift_sender_name ?? null
  const giftMessage = session.metadata?.gift_message ?? null
  const giftSendDate = session.metadata?.gift_send_date ?? null
  const isGiftPurchase = giftRecipientEmail !== null && giftMessage !== null

  const ownerSendPromise = deps.ownerEmail
    ? (async () =>
        deps.sendEmail({
          to: deps.ownerEmail,
          subject: buildOwnerAdoptionSubject(tier, alpacaName ?? null, isGiftPurchase),
          html: buildOwnerAdoptionNotificationHtml({
            tier,
            sessionId: session.id,
            donorEmail: email,
            donorName: name ?? null,
            alpacaName,
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
            gift: isGiftPurchase
              ? {
                  recipientEmail: giftRecipientEmail!,
                  recipientName: giftRecipientName,
                  senderName: giftSenderName,
                  sendDate: giftSendDate,
                }
              : null,
          }),
        }))()
    : Promise.resolve(null)

  // Determine scheduledAt for the welcome when buyer chose a future send date.
  // Falls back to immediate when sendDate is absent or not a future date.
  //
  // Buyer picks a date-only `yyyy-mm-dd`. `Date.parse('2026-12-25')` resolves to
  // 2026-12-25T00:00:00Z = midnight UTC. For European recipients that's
  // 01:00 CET in winter and 02:00 CEST in summer — the gift would land at
  // 1 AM the day of, not the morning of. We nudge to 10:00 UTC so the email
  // arrives 11:00 CET / 12:00 CEST — morning local time across the EU
  // recipient base regardless of DST.
  const welcomeScheduledAt = ((): string | undefined => {
    if (!giftSendDate) return undefined
    const sendMs = Date.parse(giftSendDate)
    const nowMs = (deps.now ?? Date.now)()
    if (isNaN(sendMs)) return undefined
    const morningLocalMs = sendMs + 10 * 60 * 60 * 1000
    return morningLocalMs > nowMs ? new Date(morningLocalMs).toISOString() : undefined
  })()

  const isGiftWelcome = isGiftPurchase

  const [welcomeResult, codesResult, ownerResult] = await Promise.allSettled([
    (async () =>
      deps.sendEmail({
        to: isGiftWelcome ? giftRecipientEmail! : email,
        subject: welcomeAdoptionSubject(tier, isGiftWelcome),
        html: welcomeAdoptionEmailHtml({
          escapedName: isGiftWelcome
            ? (giftRecipientName ? escapeHtml(giftRecipientName) : undefined)
            : (name ? escapeHtml(name) : undefined),
          tier,
          processor: 'Stripe',
          paymentRef: session.id,
          escapedAlpacaName: alpacaName ? escapeHtml(alpacaName) : undefined,
          ...(isGiftWelcome
            ? {
                gift: {
                  fromName: giftSenderName ? escapeHtml(giftSenderName) : escapeHtml(name ?? ''),
                  message: escapeHtml(giftMessage!),
                },
              }
            : {}),
        }),
        ...(welcomeScheduledAt ? { scheduledAt: welcomeScheduledAt } : {}),
      }))(),
    (async () =>
      deps.sendEmail({
        to: email,
        scheduledAt: codesScheduledAt,
        ...buildAdoptDiscountCodesEmail({ name: name ?? '' }),
      }))(),
    ownerSendPromise,
  ])

  const welcomeSent = welcomeResult.status === 'fulfilled'
  const codesScheduled = codesResult.status === 'fulfilled'
  const ownerNotified = deps.ownerEmail
    ? ownerResult.status === 'fulfilled'
    : null

  // Welcome failure dominates — codes alone is not enough since welcome carries
  // the primary confirmation. Both branches collapse to welcome-send-failed.
  if (!welcomeSent) {
    return { welcomeSent, codesScheduled, ownerNotified, reason: 'welcome-send-failed', codesScheduledAt, meta }
  }
  if (!codesScheduled) {
    return { welcomeSent, codesScheduled, ownerNotified, reason: 'codes-send-failed', codesScheduledAt, meta }
  }
  return { welcomeSent, codesScheduled, ownerNotified, reason: 'ok', codesScheduledAt, meta }
}

function buildOwnerAdoptionSubject(
  tier: 'monthly' | 'yearly',
  alpacaName: string | null,
  isGift: boolean,
): string {
  const tierLabel = tier === 'yearly' ? 'yearly €900' : 'monthly €75/mo'
  const prefix = isGift ? '[Adopt-a-Paca] 🎁 GIFT' : '[Adopt-a-Paca]'
  return alpacaName
    ? `${prefix} New ${tierLabel} adoption — ${alpacaName}`
    : `${prefix} New ${tierLabel} adoption`
}

function buildOwnerAdoptionNotificationHtml(input: {
  tier: 'monthly' | 'yearly'
  sessionId: string
  donorEmail: string
  donorName: string | null
  alpacaName: string | null
  amountTotal: number | null
  currency: string | null
  gift: {
    recipientEmail: string
    recipientName: string | null
    senderName: string | null
    sendDate: string | null
  } | null
}): string {
  const tierLine = input.tier === 'yearly' ? 'Yearly (€900 prepaid)' : 'Monthly (€75/month recurring)'
  const amount = formatStripeAmount(input.amountTotal, input.currency)
  const currency = (input.currency ?? 'eur').toUpperCase()
  const alpacaRow = input.alpacaName
    ? `<tr><td style="padding:6px 0"><strong>Adopted alpaca:</strong></td><td style="padding:6px 0">${escapeHtml(input.alpacaName)}</td></tr>`
    : `<tr><td style="padding:6px 0"><strong>Adopted alpaca:</strong></td><td style="padding:6px 0;color:#a44">Pick for me — match within a few days</td></tr>`
  const giftBlock = input.gift
    ? `
      <h3 style="color:#a04;margin-top:20px">🎁 This is a gift purchase</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0"><strong>Recipient name:</strong></td><td style="padding:6px 0">${escapeHtml(input.gift.recipientName ?? '—')}</td></tr>
        <tr><td style="padding:6px 0"><strong>Recipient email:</strong></td><td style="padding:6px 0">${escapeHtml(input.gift.recipientEmail)}</td></tr>
        <tr><td style="padding:6px 0"><strong>From (sender):</strong></td><td style="padding:6px 0">${escapeHtml(input.gift.senderName ?? input.donorName ?? '—')}</td></tr>
        <tr><td style="padding:6px 0"><strong>Welcome email scheduled:</strong></td><td style="padding:6px 0">${escapeHtml(input.gift.sendDate ?? 'today (immediate)')}</td></tr>
      </table>
      <p style="margin-top:8px;color:#666;font-size:13px">Welcome email is being sent to the recipient, NOT the buyer. Certificate + welcome pack should be addressed to the recipient name above.</p>
    `
    : ''
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <h2 style="color:#556B2F">🦙 New Adopt-a-Paca subscriber${input.gift ? ' (gift)' : ''}</h2>
      <p>Welcome the new adopter and queue up their certificate + welcome pack.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
        <tr><td style="padding:6px 0"><strong>Tier:</strong></td><td style="padding:6px 0">${escapeHtml(tierLine)}</td></tr>
        <tr><td style="padding:6px 0"><strong>Amount:</strong></td><td style="padding:6px 0">${escapeHtml(amount)} ${escapeHtml(currency)}</td></tr>
        ${alpacaRow}
        <tr><td style="padding:6px 0"><strong>${input.gift ? 'Buyer email:' : 'Donor email:'}</strong></td><td style="padding:6px 0">${escapeHtml(input.donorEmail)}</td></tr>
        <tr><td style="padding:6px 0"><strong>${input.gift ? 'Buyer name:' : 'Donor name:'}</strong></td><td style="padding:6px 0">${escapeHtml(input.donorName ?? '—')}</td></tr>
        <tr><td style="padding:6px 0"><strong>Stripe session:</strong></td><td style="padding:6px 0"><code>${escapeHtml(input.sessionId)}</code></td></tr>
      </table>
      ${giftBlock}
      <p style="margin-top:16px;color:#666;font-size:13px">${input.gift ? 'Recipient' : 'Donor'} has already received the welcome email${input.gift ? '' : ' and will get discount codes within ~5 minutes'}.</p>
    </div>
  `.trim()
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
  /** Escalation severity from the failure tracker. */
  severity: FailureSeverity | null
  /** Consecutive-failure count for this customer (1, 2, 3+). */
  failureCount: number
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

  // Track Stripe-side failures even though Stripe has Smart Retries — the
  // escalation ladder lets the owner see a donor's cumulative struggle
  // (Smart Retries can run for ~3 weeks before giving up; the owner deserves
  // earlier visibility into the second+ failure than waiting for cancellation).
  const trackKey = typeof invoice.customer === 'string' && invoice.customer.length > 0
    ? invoice.customer
    : `unknown:${invoice.id}`
  // attemptId = invoice.id (stable across Stripe Smart Retries on the same
  // invoice). Prevents the failure counter from inflating when Stripe re-
  // delivers the webhook for an existing invoice's next retry attempt.
  const { count: failureCount, severity } = recordFailure('stripe', trackKey, invoice.id)

  if (!donorEmail) {
    return { donorNotified: false, ownerNotified: false, severity, failureCount, reason: 'missing-donor-email', meta }
  }

  const donorHtml = buildDonorPaymentFailedHtml(invoice, failureCount)
  const ownerHtml = buildOwnerPaymentFailedHtml(invoice, severity, failureCount)

  const ownerSubject =
    severity === 'action-required'
      ? `[Adopt-a-Paca] ACTION REQUIRED — Stripe donor about to lapse (${failureCount} fails) — invoice ${invoice.id}`
      : severity === 'at-risk'
        ? `[Adopt-a-Paca] AT-RISK donor — 2nd Stripe fail — invoice ${invoice.id}`
        : `[Adopt-a-Paca] Payment failed — invoice ${invoice.id}`
  const donorSubject =
    severity === 'action-required'
      ? `Final reminder: please update your Adopt-a-Paca payment`
      : severity === 'at-risk'
        ? `Reminder: your Adopt-a-Paca payment failed again`
        : `Action needed: your Adopt-a-Paca payment didn't go through`

  const [donorResult, ownerResult] = await Promise.allSettled([
    deps.sendEmail({
      to: donorEmail,
      subject: donorSubject,
      html: donorHtml,
    }),
    deps.ownerEmail
      ? deps.sendEmail({
          to: deps.ownerEmail,
          subject: ownerSubject,
          html: ownerHtml,
        })
      : Promise.resolve({ id: null }),
  ])

  const donorNotified = donorResult.status === 'fulfilled'
  const ownerNotified = deps.ownerEmail ? ownerResult.status === 'fulfilled' : false

  if (severity === 'at-risk' || severity === 'action-required') {
    try {
      void notifyOwnerOnEscalation({
        vendor: 'stripe',
        customerId: typeof invoice.customer === 'string' && invoice.customer.length > 0
          ? invoice.customer
          : `unknown:${invoice.id}`,
        failureCount,
        severity,
        donorEmail: donorEmail ?? undefined,
        donorName: invoice.customer_name ?? undefined,
        paymentRef: invoice.id,
      })
    } catch {}
  }

  if (!deps.ownerEmail && !donorNotified) {
    return { donorNotified, ownerNotified, severity, failureCount, reason: 'send-failed', meta }
  }
  if (!deps.ownerEmail) {
    return { donorNotified, ownerNotified, severity, failureCount, reason: donorNotified ? 'ok' : 'send-failed', meta }
  }
  if (!donorNotified || !ownerNotified) {
    return { donorNotified, ownerNotified, severity, failureCount, reason: 'send-failed', meta }
  }
  return { donorNotified, ownerNotified, severity, failureCount, reason: 'ok', meta }
}

function buildDonorPaymentFailedHtml(invoice: StripeInvoiceLike, failureCount: number): string {
  const escapedName = invoice.customer_name ? escapeHtml(invoice.customer_name) : null
  const greeting = escapedName ? `Hi ${escapedName},` : 'Hi there,'
  const updateUrl = invoice.hosted_invoice_url
  const updateBlock = updateUrl
    ? `<p style="margin-top:16px"><a href="${escapeHtml(updateUrl)}" style="display:inline-block;background:#556B2F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Update payment method</a></p>`
    : `<p style="margin-top:16px">Please contact <a href="mailto:info@alpacasibiza.com">info@alpacasibiza.com</a> to update your payment method.</p>`
  const intro =
    failureCount >= 3
      ? `<p>This is the third time your monthly Adopt-a-Paca payment hasn't gone through. We'd love to keep your adoption running — please update your payment method so the next charge succeeds.</p>`
      : failureCount === 2
        ? `<p>Your monthly Adopt-a-Paca payment didn't go through again. The most common cause is an expired or replaced card; updating it usually fixes the issue immediately.</p>`
        : `<p>Your monthly Adopt-a-Paca payment didn't go through this time. This often happens when a card expires or the bank flags an automatic charge.</p>`
  const closing =
    failureCount >= 3
      ? `<p style="margin-top:16px;color:#a44;font-size:13px"><strong>If we can't collect within the next few days, your adoption will pause</strong> and we'll free up your alpaca's spot. Updating the card takes under a minute.</p>`
      : `<p style="margin-top:16px;color:#666;font-size:13px">If you don't update within a few days, your adoption will pause and we'll keep your alpaca's spot open while we get in touch.</p>`
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <p>${greeting}</p>
      ${intro}
      ${updateBlock}
      ${closing}
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

function buildOwnerPaymentFailedHtml(
  invoice: StripeInvoiceLike,
  severity: FailureSeverity,
  failureCount: number,
): string {
  const amount = formatStripeAmount(invoice.amount_due, invoice.currency)
  const currency = (invoice.currency ?? 'eur').toUpperCase()
  const banner =
    severity === 'action-required'
      ? `<p style="background:#fff3f3;border-left:4px solid #a44;padding:12px;margin:0 0 16px;color:#a44;font-size:14px"><strong>Action required.</strong> Failure #${failureCount} for this donor. Stripe Smart Retries is still attempting, but at this rate the subscription will cancel within Stripe's retry window. Personal follow-up advised.</p>`
      : severity === 'at-risk'
        ? `<p style="background:#fff8e1;border-left:4px solid #ffb300;padding:12px;margin:0 0 16px;color:#7a5500;font-size:14px"><strong>At-risk donor.</strong> Second consecutive Stripe fail. Donor was emailed an escalated reminder; consider WhatsApp follow-up if no response in 48h.</p>`
        : ''
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <h2 style="color:#a44">Adopt-a-Paca payment failed</h2>
      ${banner}
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0">Invoice:</td><td><code>${escapeHtml(invoice.id)}</code></td></tr>
        <tr><td style="padding:6px 0">Subscription:</td><td><code>${escapeHtml(invoice.subscription ?? '—')}</code></td></tr>
        <tr><td style="padding:6px 0">Customer:</td><td><code>${escapeHtml(invoice.customer ?? '—')}</code></td></tr>
        <tr><td style="padding:6px 0">Donor email:</td><td>${escapeHtml(invoice.customer_email ?? '—')}</td></tr>
        <tr><td style="padding:6px 0">Amount due:</td><td>${amount} ${escapeHtml(currency)}</td></tr>
        <tr><td style="padding:6px 0">Attempt #:</td><td>${invoice.attempt_count ?? '—'}</td></tr>
        <tr><td style="padding:6px 0">Consecutive fails:</td><td><strong>${failureCount}</strong></td></tr>
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
  /**
   * Set on `first` and `recurring` payments — the SEPA / card mandate that
   * authorised the charge. Used by the re-mandate flow to PATCH an existing
   * subscription onto a freshly-confirmed mandate.
   */
  mandateId?: string
  metadata?: {
    product?: string
    tier?: 'monthly' | 'yearly' | string
    tenantId?: string
    alpaca?: string
    /**
     * Set by the update-payment route to signal a re-mandate flow. Webhook
     * patches the existing subscription instead of treating this as a new
     * adoption.
     */
    action?: 'update-payment' | string
    /** Subscription ID to relink when action === 'update-payment'. */
    seedSubscriptionId?: string
    /** Gift recipient fields — set when buyer purchased via the gift wizard. */
    gift_recipient_email?: string
    gift_recipient_name?: string
    gift_sender_name?: string
    gift_message?: string
    /** ISO yyyy-mm-dd or absent (= send today). */
    gift_send_date?: string
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
  /**
   * When set, send an owner-facing notification on monthly-first + yearly-oneoff
   * (the flows that represent a NEW adopter). Mirrors handleStripeCheckoutCompleted
   * — owner needs immediate visibility on new revenue. Fail-quiet on send error;
   * webhook still returns 200 to avoid Mollie retry duplicating the donor email.
   */
  ownerEmail?: string
}

export interface MolliePaidResult {
  flow: 'monthly-first' | 'yearly-oneoff' | 'recurring-renewal' | 'unmatched'
  welcomeSent: boolean
  subscriptionCreated: boolean
  /**
   * Owner-notification tri-state. `null` when deps.ownerEmail was unset;
   * `true`/`false` reflects send success when it was set.
   */
  ownerNotified: boolean | null
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

  // Reset any prior failure count for this customer on ANY successful Mollie
  // payment.paid event — recurring renewal, first-of-mandate, or yearly one-off.
  // A new success means the donor is current again; future fails should start
  // fresh at severity='first'.
  if (payment.customerId) {
    resetFailures('mollie', payment.customerId)
  }

  // ── Monthly first-of-mandate: create sub + welcome (parallel) ────────────
  if (isAdopt && tier === 'monthly' && payment.sequenceType === 'first' && payment.customerId) {
    // Promise.allSettled (not Promise.all) so that if createSubscription throws
    // (the documented Mollie-retry trigger), fetchCustomer's still-in-flight
    // promise doesn't become an unhandled rejection. We then unwrap and
    // re-throw the createSubscription error to preserve the existing 500-
    // triggers-Mollie-retry contract.
    const [subResult, customerResult] = await Promise.allSettled([
      deps.createSubscription(payment),
      deps.fetchCustomer(payment.customerId),
    ])
    if (subResult.status === 'rejected') {
      throw subResult.reason
    }
    const customer = customerResult.status === 'fulfilled'
      ? customerResult.value
      : { email: null, name: null }

    if (!customer.email) {
      return {
        flow: 'monthly-first',
        welcomeSent: false,
        subscriptionCreated: true,
        ownerNotified: deps.ownerEmail ? false : null,
        reason: 'missing-email',
        meta: { paymentId: payment.id, tier, email: null },
      }
    }

    const [welcomeSent, ownerNotified] = await Promise.all([
      sendMollieWelcomeQuiet(deps.sendEmail, payment, 'monthly', customer.email, customer.name),
      sendMollieOwnerNotifyQuiet(deps.sendEmail, deps.ownerEmail, payment, 'monthly', customer.email, customer.name),
    ])
    return {
      flow: 'monthly-first',
      welcomeSent,
      subscriptionCreated: true,
      ownerNotified,
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
        ownerNotified: null,
        reason: 'unmatched',
        meta: { paymentId: payment.id, tier, email: payment.billingEmail ?? null },
      }
    }
    if (!payment.billingEmail) {
      return {
        flow: 'yearly-oneoff',
        welcomeSent: false,
        subscriptionCreated: false,
        ownerNotified: deps.ownerEmail ? false : null,
        reason: 'missing-email',
        meta: { paymentId: payment.id, tier, email: null },
      }
    }
    const [welcomeSent, ownerNotified] = await Promise.all([
      sendMollieWelcomeQuiet(deps.sendEmail, payment, 'yearly', payment.billingEmail, null),
      sendMollieOwnerNotifyQuiet(deps.sendEmail, deps.ownerEmail, payment, 'yearly', payment.billingEmail, null),
    ])
    return {
      flow: 'yearly-oneoff',
      welcomeSent,
      subscriptionCreated: false,
      ownerNotified,
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
      ownerNotified: null,
      reason: 'ok',
      meta: { paymentId: payment.id, tier },
    }
  }

  return {
    flow: 'unmatched',
    welcomeSent: false,
    subscriptionCreated: false,
    ownerNotified: null,
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
  nowMs?: number,
): Promise<boolean> {
  try {
    const alpacaName = findAlpacaName(payment.metadata?.alpaca ?? null)
    const meta = payment.metadata

    // Gift fields — route welcome to recipient when present.
    const giftRecipientEmail = typeof meta?.gift_recipient_email === 'string' && meta.gift_recipient_email.length > 0
      ? meta.gift_recipient_email
      : null
    const giftRecipientName = meta?.gift_recipient_name ?? null
    const giftSenderName = meta?.gift_sender_name ?? null
    const giftMessage = meta?.gift_message ?? null
    const giftSendDate = meta?.gift_send_date ?? null

    const isGiftWelcome = giftRecipientEmail !== null && giftMessage !== null

    // Scheduled send for future gift dates. See Stripe handler for the
    // morning-local-time UTC offset rationale (10:00 UTC = 11:00/12:00 CET/CEST).
    const welcomeScheduledAt = ((): string | undefined => {
      if (!giftSendDate) return undefined
      const sendMs = Date.parse(giftSendDate)
      const now = nowMs ?? Date.now()
      if (isNaN(sendMs)) return undefined
      const morningLocalMs = sendMs + 10 * 60 * 60 * 1000
      return morningLocalMs > now ? new Date(morningLocalMs).toISOString() : undefined
    })()

    await sendEmail({
      to: isGiftWelcome ? giftRecipientEmail! : email,
      subject: welcomeAdoptionSubject(tier, isGiftWelcome),
      html: welcomeAdoptionEmailHtml({
        escapedName: isGiftWelcome
          ? (giftRecipientName ? escapeHtml(giftRecipientName) : undefined)
          : (name ? escapeHtml(name) : undefined),
        tier,
        processor: 'Mollie',
        paymentRef: payment.id,
        escapedAlpacaName: alpacaName ? escapeHtml(alpacaName) : undefined,
        ...(isGiftWelcome
          ? {
              gift: {
                fromName: giftSenderName ? escapeHtml(giftSenderName) : escapeHtml(name ?? ''),
                message: escapeHtml(giftMessage!),
              },
            }
          : {}),
      }),
      listUnsubscribeUrl: `mailto:${process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'}?subject=unsubscribe`,
      ...(welcomeScheduledAt ? { scheduledAt: welcomeScheduledAt } : {}),
    })
    return true
  } catch {
    return false
  }
}

async function sendMollieOwnerNotifyQuiet(
  sendEmail: SendEmailFn,
  ownerEmail: string | undefined,
  payment: MolliePaymentLike,
  tier: 'monthly' | 'yearly',
  donorEmail: string,
  donorName: string | null,
): Promise<boolean | null> {
  if (!ownerEmail) return null
  try {
    const alpacaName = findAlpacaName(payment.metadata?.alpaca ?? null)
    const meta = payment.metadata
    const giftRecipientEmail = typeof meta?.gift_recipient_email === 'string' && meta.gift_recipient_email.length > 0
      ? meta.gift_recipient_email
      : null
    const giftRecipientName = meta?.gift_recipient_name ?? null
    const giftSenderName = meta?.gift_sender_name ?? null
    const giftMessage = meta?.gift_message ?? null
    const giftSendDate = meta?.gift_send_date ?? null
    const isGift = giftRecipientEmail !== null && giftMessage !== null

    const tierLabel = tier === 'yearly' ? 'yearly €900' : 'monthly €75/mo'
    const prefix = isGift ? '[Adopt-a-Paca] 🎁 GIFT' : '[Adopt-a-Paca]'
    const subject = alpacaName
      ? `${prefix} New ${tierLabel} adoption — ${alpacaName} (Mollie)`
      : `${prefix} New ${tierLabel} adoption (Mollie)`
    const alpacaRow = alpacaName
      ? `<tr><td style="padding:6px 0"><strong>Adopted alpaca:</strong></td><td style="padding:6px 0">${escapeHtml(alpacaName)}</td></tr>`
      : `<tr><td style="padding:6px 0"><strong>Adopted alpaca:</strong></td><td style="padding:6px 0;color:#a44">Pick for me — match within a few days</td></tr>`
    const giftBlock = isGift
      ? `
        <h3 style="color:#a04;margin-top:20px">🎁 This is a gift purchase</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0"><strong>Recipient name:</strong></td><td style="padding:6px 0">${escapeHtml(giftRecipientName ?? '—')}</td></tr>
          <tr><td style="padding:6px 0"><strong>Recipient email:</strong></td><td style="padding:6px 0">${escapeHtml(giftRecipientEmail!)}</td></tr>
          <tr><td style="padding:6px 0"><strong>From (sender):</strong></td><td style="padding:6px 0">${escapeHtml(giftSenderName ?? donorName ?? '—')}</td></tr>
          <tr><td style="padding:6px 0"><strong>Welcome email scheduled:</strong></td><td style="padding:6px 0">${escapeHtml(giftSendDate ?? 'today (immediate)')}</td></tr>
        </table>
        <p style="margin-top:8px;color:#666;font-size:13px">Welcome email is being sent to the recipient, NOT the buyer. Certificate + welcome pack should be addressed to the recipient name above.</p>
      `
      : ''
    await sendEmail({
      to: ownerEmail,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
          <h2 style="color:#556B2F">🦙 New Adopt-a-Paca subscriber${isGift ? ' (gift)' : ''} (Mollie)</h2>
          <p>Welcome the new adopter and queue up their certificate + welcome pack.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
            <tr><td style="padding:6px 0"><strong>Tier:</strong></td><td style="padding:6px 0">${escapeHtml(tier === 'yearly' ? 'Yearly (€900 prepaid)' : 'Monthly (€75/month recurring via SEPA)')}</td></tr>
            ${alpacaRow}
            <tr><td style="padding:6px 0"><strong>${isGift ? 'Buyer email:' : 'Donor email:'}</strong></td><td style="padding:6px 0">${escapeHtml(donorEmail)}</td></tr>
            <tr><td style="padding:6px 0"><strong>${isGift ? 'Buyer name:' : 'Donor name:'}</strong></td><td style="padding:6px 0">${escapeHtml(donorName ?? '—')}</td></tr>
            <tr><td style="padding:6px 0"><strong>Mollie payment:</strong></td><td style="padding:6px 0"><code>${escapeHtml(payment.id)}</code></td></tr>
          </table>
          ${giftBlock}
          <p style="margin-top:16px;color:#666;font-size:13px">${isGift ? 'Recipient' : 'Donor'} has already received the welcome email${isGift ? '' : '; discount-codes follow within 48h'}.</p>
        </div>
      `.trim(),
    })
    return true
  } catch {
    return false
  }
}

// ── Mollie payment.failed handler ────────────────────────────────────────────

export interface MollieFailedDeps {
  sendEmail: SendEmailFn
  fetchCustomer: FetchMollieCustomerFn
  /** When set, owner receives a structured notification per failed charge. */
  ownerEmail?: string
}

export interface MollieFailedResult {
  donorNotified: boolean
  ownerNotified: boolean | null
  /**
   * Escalation severity: 'first' (1st fail, normal), 'at-risk' (2nd consecutive),
   * 'action-required' (3+ consecutive). Drives the owner email subject/copy and
   * surfaces in the result so the webhook log shows it.
   */
  severity: FailureSeverity | null
  /** Consecutive-failure count for this customer (1, 2, 3+). */
  failureCount: number
  reason:
    | 'ok'
    | 'not-adoption'
    | 'missing-donor-email'
    | 'donor-send-failed'
    | 'send-failed'
  meta: {
    paymentId: string
    customerId?: string | null
    sequenceType?: string | null
    tier?: string | null
  }
}

/**
 * Handle Mollie's payment.failed event for Adopt-a-Paca recurring charges.
 *
 * SEPA mandates fail when an account closes or has insufficient funds. Mollie
 * does not auto-retry SEPA the way Stripe Smart Retries does — the owner
 * usually has to reach out to the donor with a payment-update link.
 *
 * Sends:
 *   1. Donor email: "Your monthly support payment didn't go through" with a
 *      link to the subscription-management endpoint to update payment.
 *   2. Owner email: structured notification (when ownerEmail provided).
 *
 * Fail-quiet on both sends. NEVER throws — webhook returns 200 so Mollie
 * does not duplicate-notify on its retry cadence.
 */
export async function handleMolliePaymentFailed(
  payment: MolliePaymentLike,
  deps: MollieFailedDeps,
): Promise<MollieFailedResult> {
  const meta = {
    paymentId: payment.id,
    customerId: payment.customerId ?? null,
    sequenceType: payment.sequenceType ?? null,
    tier: payment.metadata?.tier ?? null,
  }

  if (payment.metadata?.product !== 'adopt-a-paca') {
    return { donorNotified: false, ownerNotified: null, severity: null, failureCount: 0, reason: 'not-adoption', meta }
  }

  let donorEmail: string | null = null
  let donorName: string | null = null
  if (payment.customerId) {
    const c = await deps.fetchCustomer(payment.customerId)
    donorEmail = c.email
    donorName = c.name
  } else if (payment.billingEmail) {
    donorEmail = payment.billingEmail
  }

  // Record the failure FIRST so the resulting severity drives owner-email tone,
  // even when we can't reach the donor.
  //
  // When customerId is missing (rare), DO NOT fall back to a payment-id-keyed
  // counter — that key would never be reset on the donor's next success (which
  // uses customerId), creating an orphan counter that lingers until TTL purge.
  // Instead use an explicit `unknown:` namespace so it's clear in logs that
  // this counter cannot be tied to a recovery event.
  const trackKey = payment.customerId ?? `unknown:${payment.id}`
  // attemptId = payment.id is stable across webhook retries for the same event,
  // so recordFailure won't double-count if a Resend outage forces Mollie to
  // re-deliver the failed event.
  const { count: failureCount, severity } = recordFailure('mollie', trackKey, payment.id)

  if (!donorEmail) {
    // Donor unreachable but owner still benefits from the escalated context.
    let ownerNotified: boolean | null = null
    if (deps.ownerEmail) {
      try {
        await deps.sendEmail({
          to: deps.ownerEmail,
          subject: buildMollieOwnerFailedSubject(payment, severity, failureCount),
          html: buildMollieOwnerPaymentFailedHtml(payment, '(unknown — customer record missing)', null, severity, failureCount),
        })
        ownerNotified = true
      } catch {
        ownerNotified = false
      }
    }
    return {
      donorNotified: false,
      ownerNotified,
      severity,
      failureCount,
      reason: 'missing-donor-email',
      meta,
    }
  }

  const donorHtml = buildMollieDonorPaymentFailedHtml(payment, donorName, failureCount)
  const ownerHtml = buildMollieOwnerPaymentFailedHtml(payment, donorEmail, donorName, severity, failureCount)
  const ownerSubject = buildMollieOwnerFailedSubject(payment, severity, failureCount)

  const [donorResult, ownerResult] = await Promise.allSettled([
    deps.sendEmail({
      to: donorEmail,
      subject:
        severity === 'action-required'
          ? `Final reminder: please update your Adopt-a-Paca payment`
          : severity === 'at-risk'
            ? `Reminder: your Adopt-a-Paca payment failed again`
            : `Action needed: your Adopt-a-Paca payment didn't go through`,
      html: donorHtml,
    }),
    deps.ownerEmail
      ? deps.sendEmail({
          to: deps.ownerEmail,
          subject: ownerSubject,
          html: ownerHtml,
        })
      : Promise.resolve({ id: null }),
  ])

  const donorNotified = donorResult.status === 'fulfilled'
  const ownerNotified = deps.ownerEmail ? ownerResult.status === 'fulfilled' : null

  if (severity === 'at-risk' || severity === 'action-required') {
    try {
      void notifyOwnerOnEscalation({
        vendor: 'mollie',
        customerId: payment.customerId ?? `unknown:${payment.id}`,
        failureCount,
        severity,
        donorEmail: donorEmail ?? undefined,
        donorName: donorName ?? undefined,
        paymentRef: payment.id,
      })
    } catch {}
  }

  if (!donorNotified) return { donorNotified, ownerNotified, severity, failureCount, reason: 'donor-send-failed', meta }
  if (deps.ownerEmail && ownerNotified === false) {
    return { donorNotified, ownerNotified, severity, failureCount, reason: 'send-failed', meta }
  }
  return { donorNotified, ownerNotified, severity, failureCount, reason: 'ok', meta }
}

function buildMollieDonorPaymentFailedHtml(
  payment: MolliePaymentLike,
  donorName: string | null,
  failureCount: number,
): string {
  const greeting = donorName ? `Hi ${escapeHtml(donorName)},` : 'Hi there,'
  const updateUrl = `${SITE_BASE_URL}/en/adopt#manage`
  // Escalation copy mirrors the owner-facing severity. We don't surface the
  // raw count to the donor — just the warmth/urgency calibration.
  const intro =
    failureCount >= 3
      ? `<p>This is the third time your monthly Adopt-a-Paca payment hasn't gone through, so we wanted to reach out one more time before your adoption pauses.</p>`
      : failureCount === 2
        ? `<p>Your monthly Adopt-a-Paca SEPA payment didn't go through again. This usually means the bank's direct-debit mandate needs a refresh, or there's a temporary balance issue on the account.</p>`
        : `<p>Your monthly Adopt-a-Paca SEPA payment didn't go through this time. This usually means the bank flagged the direct-debit charge or your account balance was low at the moment we tried.</p>`
  const closing =
    failureCount >= 3
      ? `<p style="margin-top:16px;color:#a44;font-size:13px"><strong>If we don't hear from you in the next few days, your adoption will pause and we'll free up your alpaca's spot.</strong> Reply to this email or open the portal to keep things going.</p>`
      : `<p style="margin-top:16px;color:#666;font-size:13px">If we don't hear from you within a few days, your adoption will pause and we'll keep your alpaca's spot open while we get in touch.</p>`
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <p>${greeting}</p>
      ${intro}
      <p style="margin-top:16px">
        <a href="${escapeHtml(updateUrl)}" style="display:inline-block;background:#556B2F;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">Manage your adoption</a>
      </p>
      ${closing}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="color:#999;font-size:12px">Alpacas Ibiza · info@alpacasibiza.com</p>
    </div>
  `.trim()
}

function buildMollieOwnerFailedSubject(
  payment: MolliePaymentLike,
  severity: FailureSeverity,
  failureCount: number,
): string {
  const prefix =
    severity === 'action-required'
      ? `[Adopt-a-Paca] ACTION REQUIRED — donor about to lapse (${failureCount} fails)`
      : severity === 'at-risk'
        ? `[Adopt-a-Paca] AT-RISK donor — 2nd consecutive fail`
        : `[Adopt-a-Paca] SEPA payment failed`
  return `${prefix} — ${payment.id}`
}

function buildMollieOwnerPaymentFailedHtml(
  payment: MolliePaymentLike,
  donorEmail: string,
  donorName: string | null,
  severity: FailureSeverity,
  failureCount: number,
): string {
  const banner =
    severity === 'action-required'
      ? `<p style="background:#fff3f3;border-left:4px solid #a44;padding:12px;margin:0 0 16px;color:#a44;font-size:14px"><strong>Action required.</strong> This is failure #${failureCount} for this donor — Mollie has retried via its own cadence and they have not resolved it. A personal follow-up (WhatsApp / direct email) typically saves these.</p>`
      : severity === 'at-risk'
        ? `<p style="background:#fff8e1;border-left:4px solid #ffb300;padding:12px;margin:0 0 16px;color:#7a5500;font-size:14px"><strong>At-risk donor.</strong> Second consecutive failure. The escalated donor email has gone out; consider WhatsApp follow-up if no response in 48h.</p>`
        : ''
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
      <h2 style="color:#a44">Adopt-a-Paca SEPA payment failed (Mollie)</h2>
      ${banner}
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0">Payment:</td><td><code>${escapeHtml(payment.id)}</code></td></tr>
        <tr><td style="padding:6px 0">Customer:</td><td><code>${escapeHtml(payment.customerId ?? '—')}</code></td></tr>
        <tr><td style="padding:6px 0">Sequence type:</td><td>${escapeHtml(payment.sequenceType ?? '—')}</td></tr>
        <tr><td style="padding:6px 0">Donor email:</td><td>${escapeHtml(donorEmail)}</td></tr>
        <tr><td style="padding:6px 0">Donor name:</td><td>${escapeHtml(donorName ?? '—')}</td></tr>
        <tr><td style="padding:6px 0">Consecutive fails:</td><td><strong>${failureCount}</strong></td></tr>
      </table>
      <p style="margin-top:16px">Mollie does not auto-retry SEPA the way Stripe Smart Retries does. The donor was emailed a portal link to update their payment method.</p>
    </div>
  `.trim()
}

// ── Mollie subscription.canceled handler ─────────────────────────────────────

export interface MollieSubscriptionCanceledShape {
  id: string
  customerId?: string | null
  status?: string
  canceledAt?: string | null
  metadata?: {
    product?: string
    tier?: string
    seedPaymentId?: string
  } | null
}

export interface MollieSubscriptionCanceledDeps {
  sendEmail: SendEmailFn
  fetchCustomer: FetchMollieCustomerFn
  ownerEmail?: string
}

export interface MollieSubscriptionCanceledResult {
  ownerNotified: boolean
  reason: 'ok' | 'not-adoption' | 'missing-owner-email' | 'send-failed'
  meta: {
    subscriptionId: string
    customerId?: string | null
    tier?: string | null
    donorEmail?: string | null
  }
}

/**
 * Handle Mollie's subscription.canceled event for Adopt-a-Paca.
 *
 * Emits a single owner-only notification so the owner can decide whether
 * outreach makes sense. Mollie doesn't expose a structured cancel-reason field
 * the way Stripe does — owner must follow up to learn why.
 *
 * Fail-quiet on send; NEVER throws.
 */
export async function handleMollieSubscriptionCanceled(
  subscription: MollieSubscriptionCanceledShape,
  deps: MollieSubscriptionCanceledDeps,
): Promise<MollieSubscriptionCanceledResult> {
  const tier = subscription.metadata?.tier ?? null
  const meta = {
    subscriptionId: subscription.id,
    customerId: subscription.customerId ?? null,
    tier,
    donorEmail: null as string | null,
  }

  const product = subscription.metadata?.product
  if (product != null && product !== 'adopt-a-paca') {
    return { ownerNotified: false, reason: 'not-adoption', meta }
  }

  // Reset failure-tracker on cancel so a donor who later re-enrols starts
  // fresh at severity='first'. Without this, a cancelled-then-re-adopted
  // donor whose old subscription had 2 failures would be flagged 'at-risk'
  // on their very first new failure.
  if (subscription.customerId) {
    resetFailures('mollie', subscription.customerId)
  }

  if (!deps.ownerEmail) {
    return { ownerNotified: false, reason: 'missing-owner-email', meta }
  }

  let donorEmail: string | null = null
  if (subscription.customerId) {
    const c = await deps.fetchCustomer(subscription.customerId)
    donorEmail = c.email
  }
  meta.donorEmail = donorEmail

  try {
    await deps.sendEmail({
      to: deps.ownerEmail,
      subject: `[Adopt-a-Paca] Mollie subscription canceled — ${subscription.id}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#2d2d2d;padding:16px">
          <h2 style="color:#a44">Adopt-a-Paca subscription canceled (Mollie)</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0">Subscription:</td><td><code>${escapeHtml(subscription.id)}</code></td></tr>
            <tr><td style="padding:6px 0">Customer:</td><td><code>${escapeHtml(subscription.customerId ?? '—')}</code></td></tr>
            <tr><td style="padding:6px 0">Tier:</td><td>${escapeHtml(tier ?? '—')}</td></tr>
            <tr><td style="padding:6px 0">Donor email:</td><td>${escapeHtml(donorEmail ?? '—')}</td></tr>
          </table>
          <p style="margin-top:16px;color:#666;font-size:13px">Mollie doesn't surface a structured cancel reason — you'll need to follow up to learn why. The donor's adoption is now ended; no further SEPA charges will be made.</p>
        </div>
      `.trim(),
    })
    return { ownerNotified: true, reason: 'ok', meta }
  } catch {
    return { ownerNotified: false, reason: 'send-failed', meta }
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

  // Reset failure-tracker on cancel — see handleMollieSubscriptionCanceled
  // for the matching Mollie-side rationale.
  if (typeof subscription.customer === 'string' && subscription.customer.length > 0) {
    resetFailures('stripe', subscription.customer)
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
