import { NextResponse } from 'next/server'
import type { MollieClient } from '@mollie/api-client'
import { safeEqual } from '@/lib/secrets'
import {
  getMollieClient,
  getMollieWebhookUrl,
  molliePaymentProvider,
} from '@/lib/integrations/payment-mollie'
import { ADOPT_PRICE_MONTHLY_EUR } from '@/lib/config'
import { sendEmail } from '@/lib/mailer'
import { requireEnvOrReturn503 } from '@/lib/route-helpers'
import {
  handleMolliePaymentPaid,
  handleMolliePaymentFailed,
  type MolliePaymentLike,
} from '@/lib/payment-handlers'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { isAlreadyProcessed, markProcessed } from '@/lib/webhook-idempotency'
import { resetFailures } from '@/lib/payment-failure-tracker'
import { recordVatFromPayment } from '@/lib/vat-recorder'
import {
  upsertCustomerFromMollie,
  upsertSubscriptionFromMollie,
  recordPaymentEvent,
} from '@/lib/db/upsert-from-webhook'
import { lookupReferrer } from '@/lib/referral-codes'

/**
 * POST /api/mollie-webhook?secret=<MOLLIE_WEBHOOK_SECRET>
 *
 * Mollie webhook receiver. Different security model from Stripe:
 *   - Mollie does NOT sign webhooks (no HMAC header).
 *   - Defence layer 1: URL-path secret matched constant-time (safeEqual).
 *   - Defence layer 2: payment ID re-fetched via authenticated Mollie API.
 *
 * SECURITY HARD RULE per ps-003-2026-05-27-payment-rails.md:
 *   This webhook handles OWN revenue ONLY (Adopt-a-Paca).
 *
 * Dispatch logic lives in lib/payment-handlers.ts (handleMolliePaymentPaid)
 * per ADR 016. Route is a thin shell: verify → call handler → log.
 */
export async function POST(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('mollie-webhook', reqId)

  const webhookSecretGate = requireEnvOrReturn503('MOLLIE_WEBHOOK_SECRET', 'Webhook secret not configured')
  if (webhookSecretGate) return attachRequestId(webhookSecretGate, reqId)
  const webhookSecret = process.env.MOLLIE_WEBHOOK_SECRET!

  const providedSecret = new URL(request.url).searchParams.get('secret')
  if (!safeEqual(providedSecret, webhookSecret)) {
    log.warn('URL secret mismatch — returning 401.')
    return attachRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), reqId)
  }

  const apiKeyGate = requireEnvOrReturn503('MOLLIE_API_KEY', 'Payment system not configured')
  if (apiKeyGate) return attachRequestId(apiKeyGate, reqId)
  const apiKey = process.env.MOLLIE_API_KEY!

  // Body is form-encoded `id=tr_xxx`, NOT JSON.
  const rawBody = await request.text()
  if (!rawBody) {
    return attachRequestId(NextResponse.json({ error: 'Empty body' }, { status: 400 }), reqId)
  }

  // Verify by fetching the payment from Mollie API.
  const provider = molliePaymentProvider()
  const verified = await provider.verifyWebhook(rawBody, null)
  if (!verified.ok || !verified.event) {
    return attachRequestId(NextResponse.json({ error: 'Invalid webhook' }, { status: 401 }), reqId)
  }

  const event = verified.event as { type: string; payment: MolliePaymentLike }
  const payment = event.payment
  log.info(
    `${event.type} id=${payment.id} status=${payment.status} sequenceType=${payment.sequenceType ?? 'n/a'}`,
  )

  // Idempotency key includes status so payment.failed and payment.paid for the
  // SAME payment.id (Mollie reuses ids when a SEPA payment fails then retries
  // and succeeds) are tracked as separate events. Previous code keyed on id
  // alone, which silently dropped the eventual payment.paid event when the
  // first failure had already marked the id.
  const dedupKey = `mollie:${payment.id}:${payment.status}`
  if (isAlreadyProcessed(dedupKey)) {
    log.info('event already processed — skipping', { dedupKey })
    return attachRequestId(
      NextResponse.json({ ok: true, idempotent: true }, { status: 200 }),
      reqId,
    )
  }

  // Construct one Mollie client for any post-verify SDK calls. Cached factory.
  const mollie = await getMollieClient(apiKey)

  // payment.failed → recoverable for SEPA; notify donor + owner via handler.
  //
  // CRITICAL fail-quiet contract: we ALWAYS markProcessed + return 200 here,
  // even when the donor / owner email failed to send. Returning 500 on a
  // Resend transient outage was the prior bug — Mollie would retry the
  // payment.failed event ~18h later and re-trigger the donor's "your payment
  // failed" email, hitting them twice for the same charge. That violates
  // the same-event-once contract. Missing one email beats double-sending.
  //
  // Resend outages are logged loudly so ops can see they happened, but the
  // event itself is considered "delivered" once we've understood it.
  if (payment.status === 'failed') {
    const failedResult = await handleMolliePaymentFailed(payment, {
      sendEmail,
      fetchCustomer: (customerId) => fetchMollieCustomer(customerId, mollie),
      ownerEmail: process.env.CONTACT_EMAIL,
    })
    const msg = `payment.failed handler reason=${failedResult.reason}`
    if (failedResult.reason === 'ok' || failedResult.reason === 'not-adoption') {
      log.info(msg, failedResult.meta)
    } else if (failedResult.reason === 'recovered-no-notify' || failedResult.reason === 'missing-donor-email') {
      // recovered-no-notify: late re-delivery after donor recovered — expected, not an error.
      // missing-donor-email: unreachable donor — log warn so it is visible without triggering error alerts.
      log.warn(msg, failedResult.meta)
    } else {
      // Resend / mailer transient failure — surface loudly via log.error so a Vercel log alert can
      // catch a sustained outage. Do NOT 500: would re-deliver donor/owner notification on retry.
      log.error(`${msg} (notification incomplete — accepting event to prevent retry-duplicate)`, failedResult.meta)
    }
    markProcessed(dedupKey)
    // DB mirror (fire-and-forget). Webhook response timing is load-bearing:
    // never await, never propagate the error. The .catch() ensures unhandled
    // promise rejections don't pollute the runtime — getDb()'s null return
    // makes this a literal no-op when DATABASE_URL is unset.
    void recordPaymentEvent({
      vendor: 'mollie',
      eventType: 'payment.failed',
      customerId: payment.customerId ? `mollie_${payment.customerId}` : null,
      payload: payment,
      idempotencyKey: dedupKey,
    }).catch((err) => log.error('db.recordPaymentEvent(failed) threw', { message: err instanceof Error ? err.message : String(err) }))
    return attachRequestId(NextResponse.json({ received: true }), reqId)
  }

  // Other non-paid terminal/transient states log-and-return.
  if (payment.status !== 'paid') {
    if (payment.status === 'expired' || payment.status === 'canceled') {
      log.warn(`Payment ${payment.id} ended in ${payment.status}; no follow-up action.`)
    } else {
      log.info(`Payment ${payment.id} status=${payment.status}; awaiting terminal state.`)
    }
    markProcessed(dedupKey)
    return attachRequestId(NextResponse.json({ received: true }), reqId)
  }

  // Re-mandate flow: a payment.paid with metadata.action='update-payment' and a
  // seedSubscriptionId means the donor just confirmed a new mandate via the
  // /api/mollie-manage/update-payment route. Patch the existing subscription
  // onto the new mandate so future auto-charges flow through it. Do this
  // BEFORE handleMolliePaymentPaid because that handler would otherwise treat
  // sequenceType='first' as a brand-new adoption and create a duplicate sub.
  if (
    payment.metadata?.action === 'update-payment' &&
    typeof payment.metadata?.seedSubscriptionId === 'string' &&
    payment.customerId
  ) {
    const seedSubId = payment.metadata.seedSubscriptionId
    const mandateId = typeof payment.mandateId === 'string' ? payment.mandateId : null
    // CRITICAL: a missing mandateId means we have NOTHING to patch the existing
    // subscription onto. Returning 500 forces Mollie to retry the webhook — by
    // the next delivery, mandateId may be populated (Mollie sometimes lags on
    // populating mandateId for cards / PayPal). NEVER markProcessed in this
    // branch: would silently lose the relink forever (the original donor flow
    // is "success" from their POV but the existing subscription is unchanged).
    if (!mandateId) {
      log.error(`update-payment: payment ${payment.id} has no mandateId; deferring (will retry on next Mollie delivery)`, { seedSubId })
      return attachRequestId(NextResponse.json({ error: 'mandateId missing, awaiting Mollie' }, { status: 500 }), reqId)
    }
    try {
      if (!mollie) throw new Error('mollie-sdk-missing')
      // Pre-check: if the seed subscription is canceled, the PATCH would 422.
      // Catching this here means we don't pin Mollie's 18h retry on a perma-422.
      let seedStatus: string | undefined
      try {
        const seedSub = await mollie.customerSubscriptions.get(seedSubId, { customerId: payment.customerId })
        seedStatus = (seedSub as unknown as { status?: string }).status
      } catch (probeErr) {
        log.warn(`update-payment: probe of ${seedSubId} failed (continuing)`, { message: probeErr instanceof Error ? probeErr.message : String(probeErr) })
      }
      if (seedStatus === 'canceled') {
        log.warn(`update-payment: seed subscription ${seedSubId} is canceled; refunding the verification payment and skipping relink`)
        // Refund the verification charge so donor isn't out the money for a sub
        // that no longer exists. Mollie payments support a refunds.create call.
        try {
          // Full refund of the verification charge. The dead `tier === 'yearly'`
          // ternary previously here both arms resolved to `undefined` (=
          // "refund full amount") — Mollie's SDK interprets omitting `amount`
          // as a full refund, which is the correct behaviour either way:
          // verification charges are small token amounts, refund 100%.
          // Peer review 2026-05-29 flagged this ambiguity; cleaning to make
          // the intent explicit.
          await (mollie as unknown as {
            payments: { refunds: { create: (args: unknown) => Promise<unknown> } }
          }).payments.refunds.create({
            paymentId: payment.id,
          })
        } catch (refundErr) {
          log.error(`update-payment: refund failed for canceled-sub case`, { message: refundErr instanceof Error ? refundErr.message : String(refundErr), paymentId: payment.id })
        }
        markProcessed(dedupKey)
        return attachRequestId(NextResponse.json({ received: true, flow: 'update-payment', skipped: 'canceled-sub' }), reqId)
      }
      await mollie.customerSubscriptions.update(seedSubId, {
        customerId: payment.customerId,
        mandateId,
      } as unknown as Parameters<typeof mollie.customerSubscriptions.update>[1])
      log.info(`update-payment: relinked subscription ${seedSubId} to mandate ${mandateId}`)
      // Reset the failure-tracker counter on successful re-mandate. Without
      // this, a donor who was at 'at-risk' (2 fails) before fixing their
      // mandate stays at 2; the next routine renewal would escalate to
      // 'action-required' on a single new failure.
      resetFailures('mollie', payment.customerId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.error(`update-payment: relink failed for subscription ${seedSubId}`, { message })
      // Do NOT markProcessed — let Mollie retry so the patch eventually applies.
      return attachRequestId(NextResponse.json({ error: 'Relink failed' }, { status: 500 }), reqId)
    }
    markProcessed(dedupKey)
    return attachRequestId(NextResponse.json({ received: true, flow: 'update-payment' }), reqId)
  }

  // Pre-fetch customer for the recurring path so we can pass donor email/name
  // to the dunning-recovery callback inside handleMolliePaymentPaid.
  // Only fetch on recurring — first/oneoff paths do their own fetchCustomer call
  // inside the handler. Fail-quiet: if customer lookup fails, onReset simply
  // skips the recovery email (donorEmailForRecovery is undefined).
  let recurringDonorEmail: string | undefined
  let recurringDonorName: string | null | undefined
  if (payment.sequenceType === 'recurring' && payment.customerId) {
    const c = await fetchMollieCustomer(payment.customerId, mollie)
    recurringDonorEmail = c.email ?? undefined
    recurringDonorName  = c.name
  }

  // Build referrerRewardDeps: wires the referral-reward email for
  // monthly-first and yearly-oneoff flows. Fail-quiet throughout.
  // stampMetadata: updates the new donor's Mollie subscription metadata with
  // referrer_reward_sent_at (idempotency stamp). We defer to post-payment
  // subscription lookup since the subscription ID is unavailable on the
  // payment shape for monthly-first at this point — stamp is best-effort.
  const mollieReferrerRewardDeps = {
    lookupReferrer: async (code: string) => {
      if (!mollie) return null
      try {
        return await lookupReferrer(code, mollie)
      } catch {
        return null
      }
    },
    alreadySent: !!payment.metadata?.referrer_reward_sent_at,
    stampMetadata: payment.customerId
      ? async () => {
          if (!mollie) return
          try {
            // Stamp the most recent active subscription for this customer.
            const subsPage = await mollie.customerSubscriptions.page({
              customerId: payment.customerId!,
              limit: 10,
            })
            for (const sub of subsPage) {
              if (sub.status === 'active' || sub.status === 'pending') {
                await mollie.customerSubscriptions.update(sub.id, {
                  customerId: payment.customerId!,
                  metadata: {
                    ...(sub.metadata ?? {}),
                    referrer_reward_sent_at: new Date().toISOString(),
                  },
                } as unknown as Parameters<typeof mollie.customerSubscriptions.update>[1])
                break
              }
            }
          } catch {
            // Fail-quiet — stamp failure is non-fatal
          }
        }
      : undefined,
  }

  try {
    const result = await handleMolliePaymentPaid(payment, {
      sendEmail,
      fetchCustomer: (customerId) => fetchMollieCustomer(customerId, mollie),
      createSubscription: (p) => createMonthlySubscription(p, mollie, webhookSecret),
      ownerEmail: process.env.CONTACT_EMAIL,
      recurringDonorEmail,
      recurringDonorName,
      referrerRewardDeps: mollieReferrerRewardDeps,
    })

    const level = result.reason === 'ok' ? 'log' : result.reason === 'missing-email' || result.reason === 'unmatched' ? 'warn' : 'error'
    const msg = `flow=${result.flow} reason=${result.reason}`
    if (level === 'warn') log.warn(msg, result.meta)
    else if (level === 'error') log.error(msg, result.meta)
    else log.info(msg, result.meta)
    // Record toward EU VAT-OSS threshold. Mollie payment.amount.value is the
    // major-unit EUR string (e.g. "75.00"); customerCountry comes from the
    // billingAddress block when set, else null → vat-recorder normalises to 'XX'.
    // Fire-and-forget — recordVatFromPayment never throws.
    //
    // EXCLUDE re-mandate verification charges (metadata.action === 'update-payment'):
    // those payments are intercepted earlier in this route and never reach here in
    // the normal case, but if seedSubscriptionId is missing the guard falls through
    // and they'd be counted as real VAT-relevant sales — they're not.
    if (payment.metadata?.action !== 'update-payment') {
      const billingCountry = (payment as unknown as {
        billingAddress?: { country?: string }
      }).billingAddress?.country
      recordVatFromPayment({
        amountEur: (payment as unknown as { amount?: { value?: string } }).amount?.value ?? '0',
        customerCountry: billingCountry,
        attemptId: payment.id,
        yearEpoch: Date.now(),
      })
    }
    // Mark processed only AFTER the handler completes. A handler that
    // returned an error reason (welcome-send-failed etc.) is still considered
    // "processed" — we don't want Mollie retries to re-send the welcome to
    // the donor. The handler's fail-quiet pattern already addresses send
    // failures; what we guard against here is throws + manual replays.
    markProcessed(dedupKey)

    // DB mirror (fire-and-forget). Three writes, sequenced so the FK chain is
    // satisfied when DATABASE_URL is set: customer → subscription → event.
    // All wrapped in try/catch (the helpers already log + return null on
    // error); we additionally .catch() on the void promise so an unexpected
    // throw never reaches the runtime's unhandledRejection handler.
    //
    // Webhook response timing is load-bearing: NEVER await. Mollie retries
    // on non-2xx and we want the 200 to land while the DB write is in flight.
    void (async () => {
      try {
        if (payment.customerId) {
          const customer = await fetchMollieCustomer(payment.customerId, mollie)
          await upsertCustomerFromMollie({
            id: payment.customerId,
            email: customer.email,
            name: customer.name,
          })

          // Subscription mirror: only meaningful when the paid event led to a
          // live Mollie subscription. monthly-first → handler just created it
          // (createMonthlySubscription); recurring-renewal → the sub already
          // exists. In both cases we can derive the sub id from the Mollie API
          // if we don't have it on the payment.
          //
          // The payment object only carries subscriptionId for recurring/
          // renewal charges. For monthly-first we don't get it here (the
          // create call happens inside the handler) — defer to a later cron
          // reconciliation or the renewal event to populate the sub mirror.
          const subId = (payment as unknown as { subscriptionId?: string | null }).subscriptionId
          if (subId && mollie) {
            try {
              const fullSub = await mollie.customerSubscriptions.get(subId, {
                customerId: payment.customerId,
              })
              const subLike = fullSub as unknown as {
                id: string
                status?: string
                amount?: { value: string; currency: string } | null
                interval?: string | null
                canceledAt?: string | Date | null
                metadata?: {
                  product?: string
                  tier?: 'monthly' | 'yearly'
                  alpacaSlug?: string
                  giftRecipientEmail?: string
                } | null
              }
              await upsertSubscriptionFromMollie({
                id: subLike.id,
                customerId: payment.customerId,
                status: subLike.status ?? 'unknown',
                amount: subLike.amount ?? null,
                interval: subLike.interval ?? null,
                canceledAt:
                  subLike.canceledAt instanceof Date
                    ? subLike.canceledAt.toISOString()
                    : (subLike.canceledAt ?? null),
                metadata: subLike.metadata ?? null,
              })
            } catch (subErr) {
              log.warn('db.upsertSubscriptionFromMollie probe failed', {
                message: subErr instanceof Error ? subErr.message : String(subErr),
              })
            }
          }
        }

        await recordPaymentEvent({
          vendor: 'mollie',
          eventType: 'payment.paid',
          customerId: payment.customerId ? `mollie_${payment.customerId}` : null,
          payload: payment,
          idempotencyKey: dedupKey,
        })
      } catch (dbErr) {
        log.error('db mirror (mollie payment.paid) threw', {
          message: dbErr instanceof Error ? dbErr.message : String(dbErr),
        })
      }
    })().catch(() => { /* swallowed — inner try/catch already logged */ })
  } catch (err) {
    // handleMolliePaymentPaid only throws when createSubscription throws.
    // Returning 500 triggers Mollie retry (exponential up to 18h) — desired
    // because without the subscription, donor won't auto-charge next month.
    // CRITICAL: do NOT markProcessed — the retry must be allowed through.
    const message = err instanceof Error ? err.message : String(err)
    log.error(`Subscription creation failed for payment ${payment.id}`, { message })
    return attachRequestId(NextResponse.json({ error: 'Processing failed' }, { status: 500 }), reqId)
  }

  return attachRequestId(NextResponse.json({ received: true }), reqId)
}

// ── Mollie SDK adapters (route-local; depend on the live `mollie` client) ────
//
// The local `mollie` parameter is the real SDK type (imported via getMollieClient
// → import type { MollieClient } from '@mollie/api-client', hoisted to the top
// of this file). The previous `type MollieClient = any` hid the snake_case
// `customers_subscriptions` bug — the property is camelCase
// `customerSubscriptions` on the SDK.

async function fetchMollieCustomer(
  customerId: string,
  mollie: MollieClient | null,
): Promise<{ email: string | null; name: string | null }> {
  if (!mollie) return { email: null, name: null }
  try {
    const customer = await mollie.customers.get(customerId)
    return {
      email: typeof customer?.email === 'string' ? customer.email : null,
      name: typeof customer?.name === 'string' ? customer.name : null,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[mollie-webhook] Customer fetch failed for ${customerId}: ${msg}`)
    return { email: null, name: null }
  }
}

async function createMonthlySubscription(
  payment: MolliePaymentLike,
  mollie: MollieClient | null,
  webhookSecret: string,
): Promise<void> {
  if (!mollie) {
    console.error('[mollie-webhook] @mollie/api-client not installed — cannot create subscription. Run: pnpm add @mollie/api-client')
    throw new Error('mollie-sdk-missing — webhook will retry once SDK is installed')
  }
  if (!payment.customerId) {
    console.error('[mollie-webhook] Cannot create subscription — missing customerId.')
    return
  }
  const subscription = await mollie.customerSubscriptions.create({
    customerId: payment.customerId,
    amount: { value: ADOPT_PRICE_MONTHLY_EUR.toFixed(2), currency: 'EUR' },
    interval: '1 month',
    description: 'Adopt-a-Paca — monthly subscription',
    webhookUrl: getMollieWebhookUrl(webhookSecret),
    metadata: {
      product: 'adopt-a-paca',
      tier: 'monthly',
      tenantId: payment.metadata?.tenantId ?? 'alpacasibiza',
      seedPaymentId: payment.id,
    },
  })
  console.log(
    `[mollie-webhook] Created subscription id=${subscription.id} customer=${payment.customerId} amount=${ADOPT_PRICE_MONTHLY_EUR}/mo`,
  )
}
