import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mailer'
import { buildRenewalReminderEmail } from '@/lib/email-templates-retention'
import { importStripe } from '@/lib/integrations/stripe-sdk'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { verifyCronSecret } from '@/lib/cron-auth'
import { isValidEmail } from '@/lib/validate-email'
import { SITE_BASE_URL } from '@/lib/config'

/**
 * POST /api/adopt-renewal-reminders  (Authorization: Bearer <CRON_SECRET>)
 *
 * Daily cron (vercel.json: `0 10 * * *`) — fires at 10:00 UTC, after the
 * deferred-gifts cron at 09:00 to avoid contention.
 *
 * For every active subscription across BOTH Stripe and Mollie:
 *   1. Compute days until renewal.
 *   2. If days-until-renewal is in [13, 15] (14d ± 1 to absorb cron drift),
 *      AND `metadata.renewal_reminded` is NOT today's date string,
 *      send the renewal-reminder email and stamp `renewal_reminded = today`.
 *   3. Skip if email is missing or subscription is canceled.
 *
 * Promise.allSettled per-recipient — fail-quiet (log warn on failure).
 *
 * Returns: { ok: true, scanned: N, reminded: M, errors: K }
 *
 * Fail-quiet 200 on all error paths so Vercel cron does not retry and
 * double-send the whole batch.
 */
export async function POST(request: Request) {
    const reqId = getRequestId(request)
    const log   = makeRequestLogger('adopt-renewal-reminders', reqId)

    // ── Auth gate ────────────────────────────────────────────────────────────
    if (!verifyCronSecret(request)) {
        return attachRequestId(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
            reqId,
        )
    }

    const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // ── Helpers ──────────────────────────────────────────────────────────────

    function daysUntil(unixSeconds: number): number {
        return (unixSeconds * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
    }

    function inReminderWindow(days: number): boolean {
        return days >= 13 && days <= 15
    }

    const contactEmail = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'

    // ── Accumulate recipients ─────────────────────────────────────────────────

    interface Recipient {
        vendor: 'stripe' | 'mollie'
        subId: string
        customerId: string
        email: string
        donorName: string | null
        alpacaName: string | null
        tier: 'monthly' | 'yearly'
        renewalDate: string           // ISO date string
        referralCode: string | null
        locale: string
        /** Callback to stamp renewal_reminded = today after successful send. */
        stampReminded: () => Promise<void>
    }

    const recipients: Recipient[] = []
    let scanned = 0

    // ── Stripe path ───────────────────────────────────────────────────────────
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (stripeSecretKey) {
        const stripeFactory = await importStripe()
        if (!stripeFactory) {
            log.warn('[renewal] stripe SDK not installed — skipping Stripe path')
        } else {
            const stripe = stripeFactory(stripeSecretKey, { apiVersion: '2024-06-20' })
            const STRIPE_CAP = 1000
            let stripeCount = 0

            try {
                for await (const sub of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
                    stripeCount++
                    scanned++
                    if (stripeCount >= STRIPE_CAP) {
                        log.warn(`[renewal] Stripe iteration capped at ${STRIPE_CAP}`)
                        break
                    }

                    // In Stripe API v22+, current_period_end moved to SubscriptionItem.
                    // Fall back to the first item's value.
                    const periodEnd: number | undefined = sub.items?.data?.[0]?.current_period_end
                    if (!periodEnd) continue
                    const days = daysUntil(periodEnd)
                    if (!inReminderWindow(days)) continue

                    const alreadyReminded = (sub.metadata as Record<string, string>)?.renewal_reminded
                    if (alreadyReminded === todayStr) continue

                    // Resolve email: try customer.email (needs expand) — prefer metadata
                    const email: string | null =
                        (sub.metadata as Record<string, string>)?.donorEmail ??
                        (typeof (sub as { customer?: { email?: string } }).customer === 'object'
                            ? (sub as { customer?: { email?: string } }).customer?.email ?? null
                            : null)

                    if (!email || !isValidEmail(email)) continue

                    const meta = sub.metadata as Record<string, string>
                    const rawInterval = (sub.items?.data?.[0]?.price?.recurring?.interval ?? 'month')
                    const tier: 'monthly' | 'yearly' = rawInterval === 'year' ? 'yearly' : 'monthly'

                    recipients.push({
                        vendor: 'stripe',
                        subId: sub.id,
                        customerId: typeof sub.customer === 'string' ? sub.customer : (sub.customer as { id: string }).id,
                        email,
                        donorName: meta.donorName ?? null,
                        alpacaName: meta.alpacaName ?? meta.alpaca ?? null,
                        tier,
                        renewalDate: new Date(periodEnd * 1000).toISOString().slice(0, 10),
                        referralCode: meta.referral_code ?? null,
                        locale: meta.locale ?? 'en',
                        stampReminded: async () => {
                            try {
                                await stripe.subscriptions.update(sub.id, {
                                    metadata: { renewal_reminded: todayStr },
                                })
                            } catch (e) {
                                log.warn('[renewal] failed to stamp renewal_reminded on Stripe sub', {
                                    subId: sub.id,
                                    error: e instanceof Error ? e.message : String(e),
                                })
                            }
                        },
                    })
                }
            } catch (err) {
                log.warn('[renewal] Stripe iteration error', { error: err instanceof Error ? err.message : String(err) })
            }
        }
    } else {
        log.warn('[renewal] STRIPE_SECRET_KEY unset — skipping Stripe path')
    }

    // ── Mollie path ───────────────────────────────────────────────────────────
    const mollieApiKey = process.env.MOLLIE_API_KEY
    if (mollieApiKey) {
        const mollie = await getMollieClient(mollieApiKey)
        if (!mollie) {
            log.warn('[renewal] @mollie/api-client not installed — skipping Mollie path')
        } else {
            type MollieSubRaw = {
                id: string
                customerId?: string | null
                status?: string
                nextPaymentDate?: string | null
                metadata?: Record<string, string> | null
            }

            const MOLLIE_CAP = 500
            let mollieCount = 0

            try {
                const iter = (mollie as unknown as {
                    subscriptions: { iterate: () => AsyncIterable<MollieSubRaw> }
                }).subscriptions.iterate()

                for await (const raw of iter) {
                    mollieCount++
                    scanned++
                    if (mollieCount > MOLLIE_CAP) {
                        log.warn(`[renewal] Mollie iteration capped at ${MOLLIE_CAP}`)
                        break
                    }

                    if (raw.status !== 'active') continue
                    if (!raw.nextPaymentDate) continue

                    const nextMs = Date.parse(raw.nextPaymentDate)
                    if (!Number.isFinite(nextMs)) continue
                    const days = (nextMs - Date.now()) / (1000 * 60 * 60 * 24)
                    if (!inReminderWindow(days)) continue

                    const meta = raw.metadata ?? {}
                    const alreadyReminded = meta.renewal_reminded
                    if (alreadyReminded === todayStr) continue

                    const email = meta.donorEmail ?? null
                    if (!email || !isValidEmail(email)) continue

                    const customerId = raw.customerId ?? ''
                    const subId      = raw.id

                    // Mollie subscription update to stamp metadata requires the
                    // customerSubscriptions.update() call with (customerId, subId, opts).
                    // Use a try/catch stampReminded — same fail-quiet pattern as Stripe.
                    recipients.push({
                        vendor: 'mollie',
                        subId,
                        customerId,
                        email,
                        donorName:    meta.donorName    ?? null,
                        alpacaName:   meta.alpacaName   ?? null,
                        tier:         meta.tier === 'yearly' ? 'yearly' : 'monthly',
                        renewalDate:  raw.nextPaymentDate.slice(0, 10),
                        referralCode: meta.referral_code ?? null,
                        locale:       meta.locale ?? 'en',
                        stampReminded: async () => {
                            if (!customerId) return
                            try {
                                const mollieTyped = mollie as unknown as {
                                    customerSubscriptions: {
                                        update: (
                                            subId: string,
                                            opts: { customerId: string; metadata: Record<string, string> },
                                        ) => Promise<unknown>
                                    }
                                }
                                await mollieTyped.customerSubscriptions.update(subId, {
                                    customerId,
                                    metadata: { ...meta, renewal_reminded: todayStr },
                                })
                            } catch (e) {
                                log.warn('[renewal] failed to stamp renewal_reminded on Mollie sub', {
                                    subId,
                                    error: e instanceof Error ? e.message : String(e),
                                })
                            }
                        },
                    })
                }
            } catch (err) {
                log.warn('[renewal] Mollie iteration error', { error: err instanceof Error ? err.message : String(err) })
            }
        }
    } else {
        log.warn('[renewal] MOLLIE_API_KEY unset — skipping Mollie path')
    }

    log.info('[renewal] fan-out starting', { scanned, sending: recipients.length })

    // ── Per-recipient fan-out ─────────────────────────────────────────────────
    let reminded = 0
    let errors   = 0

    const tasks = recipients.map(async (r) => {
        const locale = r.locale
        // Billing portal URL: send donor to the manage-my-adoption anchor
        const billingPortalUrl = `${SITE_BASE_URL}/${locale}/adopt#manage`

        const { subject, html } = buildRenewalReminderEmail({
            donorName:      r.donorName,
            alpacaName:     r.alpacaName,
            tier:           r.tier,
            renewalDate:    r.renewalDate,
            referralCode:   r.referralCode,
            billingPortalUrl,
            locale,
        })

        try {
            await sendEmail({ to: r.email, subject, html, replyTo: contactEmail })
            await r.stampReminded()
            log.info('[renewal] reminder sent', { subId: r.subId, vendor: r.vendor })
            return { ok: true } as const
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            log.warn('[renewal] send failed (fail-quiet)', { subId: r.subId, vendor: r.vendor, error: msg })
            return { ok: false } as const
        }
    })

    const settled = await Promise.allSettled(tasks)
    for (const s of settled) {
        if (s.status === 'fulfilled' && s.value.ok) reminded++
        else errors++
    }

    log.info('[renewal] cron complete', { scanned, reminded, errors })

    return attachRequestId(
        NextResponse.json({ ok: true, scanned, reminded, errors }),
        reqId,
    )
}
